import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { BANKS, RENTAL_TYPES } from "../data/products";
import { fmtDate, fromISO, rupiah, todayISO } from "../utils/format";
import { CopyBtn, FakeQR, PAYMENT_METHODS, VA_PREFIX } from "./Payment";

const STATUS = {
  pending:   { label: "Menunggu Pembayaran", cls: "pending" },
  paid:      { label: "Terkonfirmasi",       cls: "paid" },
  active:    { label: "Sedang Disewa",       cls: "paid" },
  returned:  { label: "Dikembalikan",        cls: "paid" },
  completed: { label: "Selesai",             cls: "paid" },
  expired:   { label: "Kedaluwarsa",         cls: "off" },
  cancelled: { label: "Dibatalkan",          cls: "off" },
};

const COUP_COURIERS = ["JNE", "J&T Express", "SiCepat", "AnterAja", "Pos Indonesia", "Paxels"];

const DEPOSIT_STEPS = [
  { key: "holding",    label: "Ditahan Butik",        desc: "Selama masa sewa berlangsung" },
  { key: "inspecting", label: "Inspeksi Barang",      desc: "Pengecekan kondisi kain & payet" },
  { key: "refunded",   label: "Deposit Dikembalikan", desc: "Cair ke rekening 1x24 jam" },
];

const daysUntil = (iso) => Math.round((fromISO(iso) - fromISO(todayISO())) / 86400000);

export default function Orders() {
  const {
    state,
    updateOrder,
    uploadFile,
    uploadBalanceProof,
    loadingOrders,
    dbError,
    refreshOrders,
    isSupabaseConfigured,
  } = useStore();

  const [openId, setOpenId] = useState(null);
  const [resiForm, setResiForm] = useState({}); // { [orderId]: { courier, number, file } }
  const [resiErr, setResiErr] = useState({});
  const [savingId, setSavingId] = useState(null);

  // State opsi pelunasan per order (sama dengan opsi pembayaran: QRIS, VA, Transfer)
  const [balanceMethod, setBalanceMethod] = useState({}); // { [orderId]: "qris" | "va" | "transfer" }
  const [balanceBank, setBalanceBank] = useState({}); // { [orderId]: "BCA" | "BNI" | "MANDIRI" | "BRI" }
  const [balanceFiles, setBalanceFiles] = useState({}); // { [orderId]: File | null }
  const [balanceUploadingId, setBalanceUploadingId] = useState(null);
  const [balanceErr, setBalanceErr] = useState({});
  const [balanceNotice, setBalanceNotice] = useState({});
  const [reuploadMode, setReuploadMode] = useState({});
  const [previewModal, setPreviewModal] = useState(null); // { orderId, url, amount, paidAt, payMethod }

  // Pesanan "pending" yang lewat batas waktu ditampilkan sebagai kedaluwarsa
  const orders = state.orders.map((o) =>
    o.status === "pending" && Date.now() > o.expiresAt ? { ...o, status: "expired" } : o
  );

  const toggleDetail = (id) => setOpenId((cur) => (cur === id ? null : id));

  const setField = (orderId, key, val) => {
    setResiForm((prev) => ({
      ...prev,
      [orderId]: {
        courier: prev[orderId]?.courier || "JNE",
        number: prev[orderId]?.number || "",
        file: prev[orderId]?.file || null,
        [key]: val,
      },
    }));
    setResiErr((prev) => ({ ...prev, [orderId]: "" }));
  };

  const handleBalanceFileChange = (orderId, file) => {
    if (file) {
      if (!/^image\/|pdf$/.test(file.type)) {
        setBalanceErr((prev) => ({ ...prev, [orderId]: "Format bukti harus gambar (JPG/PNG) atau PDF." }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setBalanceErr((prev) => ({ ...prev, [orderId]: "Ukuran file maksimal 5 MB." }));
        return;
      }
    }
    setBalanceFiles((prev) => ({ ...prev, [orderId]: file || null }));
    setBalanceErr((prev) => ({ ...prev, [orderId]: "" }));
    setBalanceNotice((prev) => ({ ...prev, [orderId]: "" }));
  };

  const handleConfirmBalancePayment = async (order) => {
    const curMethod = balanceMethod[order.id] || "qris";
    const curBank = balanceBank[order.id] || "BCA";
    const bankInfo = BANKS.find((b) => b.code === curBank) || BANKS[0];
    const file = balanceFiles[order.id] || null;

    if (!file) {
      setBalanceErr((prev) => ({
        ...prev,
        [order.id]: "Silakan pilih atau unggah foto bukti transfer terlebih dahulu.",
      }));
      return;
    }

    setBalanceUploadingId(order.id);
    setBalanceErr((prev) => ({ ...prev, [order.id]: "" }));
    setBalanceNotice((prev) => ({ ...prev, [order.id]: "" }));

    const payMethodName =
      curMethod === "qris"
        ? "QRIS"
        : curMethod === "va"
        ? `Virtual Account ${bankInfo.name}`
        : `Transfer ${bankInfo.name}`;

    try {
      await uploadBalanceProof(order.id, file, payMethodName);
      setBalanceFiles((prev) => ({ ...prev, [order.id]: null }));
      setReuploadMode((prev) => ({ ...prev, [order.id]: false }));
      setBalanceNotice((prev) => ({
        ...prev,
        [order.id]: `Pelunasan via ${payMethodName} berhasil dikonfirmasi dan sedang menunggu verifikasi admin.`,
      }));
    } catch (err) {
      setBalanceErr((prev) => ({
        ...prev,
        [order.id]: err.message || "Gagal mengonfirmasi pelunasan.",
      }));
    } finally {
      setBalanceUploadingId(null);
    }
  };

  const submitResi = async (e, order) => {
    e.preventDefault();
    const cur = resiForm[order.id] || { courier: "JNE", number: "", file: null };
    const clean = cur.number.trim().toUpperCase();
    if (clean.length < 6) {
      setResiErr((prev) => ({ ...prev, [order.id]: "Nomor resi minimal 6 karakter." }));
      return;
    }
    setSavingId(order.id);
    setResiErr((prev) => ({ ...prev, [order.id]: "" }));
    try {
      let proofUrl = null;
      if (cur.file) {
        const up = await uploadFile(cur.file, "resi", order.id);
        proofUrl = up.url;
      }
      await updateOrder(order.id, {
        returnShipment: {
          courier: cur.courier,
          number: clean,
          proofUrl,
          proofName: cur.file?.name || null,
          submittedAt: Date.now(),
        },
        depositStatus: order.depositStatus === "refunded" ? "refunded" : "inspecting",
      });
    } catch (err) {
      setResiErr((prev) => ({ ...prev, [order.id]: err.message || "Gagal menyimpan resi." }));
    } finally {
      setSavingId(null);
    }
  };

  const simulateDepositStep = async (order, nextStep) => {
    setSavingId(order.id);
    try {
      await updateOrder(order.id, { depositStatus: nextStep });
    } catch (err) {
      setResiErr((prev) => ({ ...prev, [order.id]: err.message || "Gagal mengubah status deposit." }));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <nav className="crumbs"><Link to="/">Beranda</Link> / <span>Pesanan Saya</span></nav>
          <div className="section-head split" style={{ marginBottom: 0 }}>
            <div>
              <h1>Pesanan Saya</h1>
              <p>Pantau status pembayaran, pelunasan DP, jadwal ambil / kembali, upload resi pengembalian, serta pencairan deposit.</p>
            </div>
            {isSupabaseConfigured && (
              <button type="button" className="btn btn-outline btn-sm" onClick={refreshOrders} disabled={loadingOrders}>
                {loadingOrders ? "Menyinkronkan…" : "Muat Ulang"}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="container flow-page">
        {dbError && <p className="hint warn" style={{ marginBottom: 18 }}>{dbError}</p>}

        {loadingOrders && !orders.length ? (
          <div className="loading-box"><span className="spinner dark" /> Memuat riwayat pesanan…</div>
        ) : !orders.length ? (
          <div className="empty">
            <div className="empty-icon">🧾</div>
            <h3>Belum ada pesanan</h3>
            <p>Pesanan yang Anda buat akan muncul di sini.</p>
            <Link to="/katalog" className="btn btn-primary btn-sm">Mulai Sewa</Link>
          </div>
        ) : (
          <ul className="order-list">
            {orders.map((o) => {
              const st = STATUS[o.status] || STATUS.pending;
              const first = o.schedule[0];
              const retDay = o.schedule.find((s) => s.role === "kembali") || o.schedule[o.schedule.length - 1];
              const d = daysUntil(first.date);
              const t = RENTAL_TYPES[o.type];
              const isPaid = ["paid", "active", "returned", "completed"].includes(o.status);
              const isDpOrder = o.payment === "dp";
              const isLuar = o.type === "luar_kota";
              const hasDeposit = o.security === "deposit";
              const depStatus = o.depositStatus || "holding";
              const depIdx = DEPOSIT_STEPS.findIndex((s) => s.key === depStatus);
              const isOpen = openId === o.id;
              const isSaving = savingId === o.id;
              const isUploadingBalance = balanceUploadingId === o.id;

              // Parameter pelunasan per order
              const curMethod = balanceMethod[o.id] || "qris";
              const curBank = balanceBank[o.id] || "BCA";
              const curFile = balanceFiles[o.id] || null;
              const bankInfo = BANKS.find((item) => item.code === curBank) || BANKS[0];
              const cleanWa = String(o?.customer?.wa || "08123456789").replace(/\D/g, "");
              const vaNumber = VA_PREFIX[curBank] + cleanWa.slice(-8).padStart(8, "0");
              const hasBalanceSubmitted = Boolean(o.balanceProofUrl || o.balancePaidAt);
              const showBalanceForm = (!hasBalanceSubmitted || reuploadMode[o.id]) && !o.balanceVerified;

              const rf = resiForm[o.id] || {
                courier: o.returnShipment?.courier || "JNE",
                number: o.returnShipment?.number || "",
                file: null,
              };

              return (
                <li key={o.id} className={`order-card-wrap ${isOpen ? "open" : ""}`}>
                  <div className="order-card">
                    <div className="oc-imgs">
                      {o.items.slice(0, 3).map((it) => <img key={it.productId} src={it.img} alt={it.name} />)}
                    </div>
                    <div className="oc-body">
                      <div className="oc-top">
                        <span className="mono order-no">{o.id}</span>
                        <span className={`status-badge ${st.cls}`}>{st.label}</span>
                        <span className={`badge ${isLuar ? "badge-gold" : ""}`}>{t.label}</span>
                        {isDpOrder && isPaid && (
                          o.balanceVerified ? (
                            <span className="mini-pill ok">✓ Pembayaran Lunas Terverifikasi</span>
                          ) : hasBalanceSubmitted ? (
                            <span className="mini-pill warn">
                              Pelunasan Terkirim {o.balancePayMethod ? `(${o.balancePayMethod})` : ""} — Menunggu Verifikasi Admin
                            </span>
                          ) : (
                            <span className="mini-pill info">DP Terverifikasi · Menunggu Pelunasan</span>
                          )
                        )}
                      </div>
                      <h4>{o.items.map((i) => `${i.name} (${i.size})`).join(", ")}</h4>
                      {o.items.some((i) => i.customSize?.isCustom) && (
                        <ul className="oc-custom-list">
                          {o.items.filter((i) => i.customSize?.isCustom).map((i) => (
                            <li key={i.productId}>
                              <strong>Permak {i.name}:</strong> LD {i.customSize.ld} · Panjang {i.customSize.panjang} · Pinggang {i.customSize.pinggang}
                              {i.customSize.note && <em> — “{i.customSize.note}”</em>}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="muted-dark">
                        Acara {fmtDate(o.eventDate)} · {o.payment === "dp" ? "DP 50%" : "Lunas"} · Jaminan {hasDeposit ? `Deposit ${rupiah(o.totals.deposit)}` : "KTP Fisik"}
                      </p>
                      {isPaid && d >= 0 && (
                        <p className="oc-count">
                          {d === 0 ? `${first.label} hari ini!` : `${d} hari lagi menuju ${first.label.toLowerCase()} (${fmtDate(first.date)})`}
                        </p>
                      )}
                      {isPaid && (isLuar || hasDeposit) && (
                        <div className="oc-tags">
                          {isLuar && (
                            <span className={`mini-pill ${o.returnShipment ? "ok" : "warn"}`}>
                              {o.returnShipment ? `Resi Balik: ${o.returnShipment.courier} · ${o.returnShipment.number}` : "Resi balik belum diupload"}
                            </span>
                          )}
                          {hasDeposit && (
                            <span className={`mini-pill ${depStatus === "refunded" ? "ok" : "info"}`}>
                              Deposit: {DEPOSIT_STEPS[depIdx]?.label}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="oc-right">
                      <strong>{rupiah(o.totals.grandTotal)}</strong>
                      <div className="oc-actions">
                        {o.status === "pending" && <Link to={`/pembayaran/${o.id}`} className="btn btn-primary btn-sm">Bayar Sekarang</Link>}
                        {isPaid && (
                          <>
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => toggleDetail(o.id)}>
                              {isOpen ? "Tutup Detail" : isLuar || hasDeposit ? "Kelola & Deposit" : "Detail Jadwal"}
                            </button>
                            <Link to={`/pesanan/${o.id}/selesai`} className="btn btn-outline btn-sm">Invoice</Link>
                          </>
                        )}
                        {(o.status === "expired" || o.status === "cancelled") && o.items[0] && (
                          <Link to={`/produk/${o.items[0].productId}`} className="btn btn-outline btn-sm">Pesan Ulang</Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Blok Khusus Pelunasan untuk Pesanan Skema DP yang Sudah Terkonfirmasi */}
                  {isDpOrder && isPaid && (
                    <div className="oc-balance-section">
                      {o.balanceVerified ? (
                        <div className="oc-balance-status verified">
                          <div className="oc-balance-status-info">
                            <span className="status-badge paid">
                              ✓ Pembayaran Lunas Terverifikasi
                            </span>
                            <p>
                              Seluruh tagihan sewa termasuk sisa pelunasan sebesar{" "}
                              <strong>{rupiah(o.totals?.payLater || 0)}</strong> telah lunas dan diverifikasi oleh Admin AYDATTIRE.
                              {o.balancePayMethod && (
                                <> · Metode Pelunasan: <strong>{o.balancePayMethod}</strong></>
                              )}
                            </p>
                          </div>
                          {o.balanceProofUrl && (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() =>
                                setPreviewModal({
                                  orderId: o.id,
                                  url: o.balanceProofUrl,
                                  amount: o.totals?.payLater || 0,
                                  paidAt: o.balancePaidAt,
                                  payMethod: o.balancePayMethod,
                                  verified: true,
                                })
                              }
                            >
                              Pratinjau Bukti Pelunasan
                            </button>
                          )}
                        </div>
                      ) : hasBalanceSubmitted && !reuploadMode[o.id] ? (
                        <div className="oc-balance-status pending-verify">
                          <div className="oc-balance-status-info">
                            <span className="status-badge pending">
                              Pelunasan Terkirim — Menunggu Verifikasi Admin
                            </span>
                            <p>
                              Pelunasan sebesar <strong>{rupiah(o.totals?.payLater || 0)}</strong> telah dikonfirmasi
                              {o.balancePayMethod && <> via <strong>{o.balancePayMethod}</strong></>}
                              {o.balancePaidAt && (
                                <>
                                  {" "}pada{" "}
                                  <strong>
                                    {new Date(o.balancePaidAt).toLocaleString("id-ID", {
                                      dateStyle: "medium",
                                      timeStyle: "short",
                                    })}
                                  </strong>
                                </>
                              )}
                              . Tim admin sedang memverifikasi pembayaran Anda.
                            </p>
                          </div>
                          <div className="oc-balance-status-actions">
                            {o.balanceProofUrl && (
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={() =>
                                  setPreviewModal({
                                    orderId: o.id,
                                    url: o.balanceProofUrl,
                                    amount: o.totals?.payLater || 0,
                                    paidAt: o.balancePaidAt,
                                    payMethod: o.balancePayMethod,
                                    verified: false,
                                  })
                                }
                              >
                                Pratinjau Bukti
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setReuploadMode((prev) => ({ ...prev, [o.id]: true }))}
                            >
                              Ubah Metode / Ganti Bukti
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {showBalanceForm && (
                        <div className="oc-balance-box">
                          <div className="oc-balance-head">
                            <div>
                              <span className="eyebrow" style={{ marginBottom: 4 }}>
                                Tagihan Tahap 2 (Skema DP 50%)
                              </span>
                              <h5>Pelunasan Sisa Sewa: <span className="text-maroon">{rupiah(o.totals?.payLater || 0)}</span></h5>
                              <p className="muted-dark">
                                DP awal sebesar <strong>{rupiah(o.totals?.payNow || 0)}</strong> telah terverifikasi. Silakan selesaikan sisa pelunasan sebelum pengambilan/pengiriman busana pada <strong>{fmtDate(first.date)}</strong>.
                              </p>
                            </div>
                          </div>

                          {/* Kotak Nominal dengan Tombol Salin (Sama dengan Halaman Pembayaran) */}
                          <div className="amount-box" style={{ margin: "4px 0 16px" }}>
                            <div>
                              <span>Total sisa pelunasan (DP 50%)</span>
                              <strong>{rupiah(o.totals?.payLater || 0)}</strong>
                            </div>
                            <CopyBtn text={o.totals?.payLater || 0} label="Salin nominal" />
                          </div>

                          {/* Tab Pilihan Metode (Sama dengan Halaman Pembayaran: QRIS, VA, Transfer Manual) */}
                          <h3 className="pay-title" style={{ fontSize: "1.1rem", marginBottom: 10 }}>Pilih Metode Pelunasan</h3>
                          <div className="method-tabs" role="tablist">
                            {PAYMENT_METHODS.map((m) => (
                              <button
                                key={m.key}
                                type="button"
                                role="tab"
                                aria-selected={curMethod === m.key}
                                className={`method ${curMethod === m.key ? "on" : ""}`}
                                onClick={() => {
                                  setBalanceMethod((prev) => ({ ...prev, [o.id]: m.key }));
                                  setBalanceErr((prev) => ({ ...prev, [o.id]: "" }));
                                }}
                              >
                                <strong>{m.label}</strong>
                                <small>{m.desc}</small>
                              </button>
                            ))}
                          </div>

                          {/* 1. Metode QRIS */}
                          {curMethod === "qris" && (
                            <div className="pay-body qris-body">
                              <div className="qr-wrap">
                                <div className="qr-brand">QRIS · AYDATTIRE PELUNASAN</div>
                                <FakeQR seed={`${o.id}-pelunasan`} />
                                <small>NMID: ID1026{o.id.slice(-4)}</small>
                              </div>
                              <div style={{ display: "grid", gap: 14 }}>
                                <ol className="pay-steps">
                                  <li>Buka aplikasi e-wallet (GoPay, OVO, DANA, ShopeePay) atau m-banking.</li>
                                  <li>Pilih menu <strong>Scan / Bayar QRIS</strong>.</li>
                                  <li>Arahkan kamera ke kode QR di samping.</li>
                                  <li>Pastikan nominal pelunasan tepat <strong>{rupiah(o.totals?.payLater || 0)}</strong>, lalu konfirmasi pembayaran.</li>
                                </ol>

                                <label className={`upload ${curFile ? "has" : ""}`}>
                                  <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => handleBalanceFileChange(o.id, e.target.files?.[0] || null)}
                                  />
                                  {curFile ? (
                                    <>
                                      <span className="upload-ic">📄</span>
                                      <span><strong>{curFile.name}</strong><small>Klik untuk ganti file</small></span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="upload-ic">⬆</span>
                                      <span><strong>Upload Bukti Transfer / Screenshot QRIS *</strong><small>Wajib · JPG, PNG, atau PDF · maks. 5 MB</small></span>
                                    </>
                                  )}
                                </label>
                              </div>
                            </div>
                          )}

                          {/* 2. Metode Virtual Account & Transfer Manual */}
                          {(curMethod === "va" || curMethod === "transfer") && (
                            <div className="pay-body">
                              <div className="bank-row">
                                {BANKS.map((b) => (
                                  <button
                                    key={b.code}
                                    type="button"
                                    className={`bank ${curBank === b.code ? "on" : ""}`}
                                    onClick={() => setBalanceBank((prev) => ({ ...prev, [o.id]: b.code }))}
                                  >
                                    {b.name}
                                  </button>
                                ))}
                              </div>

                              {curMethod === "va" ? (
                                <>
                                  <div className="acc-box">
                                    <span>Nomor Virtual Account Pelunasan {bankInfo.name}</span>
                                    <strong className="mono">{vaNumber.replace(/(\d{4})(?=\d)/g, "$1 ")}</strong>
                                    <CopyBtn text={vaNumber} />
                                  </div>
                                  <ol className="pay-steps">
                                    <li>Buka m-banking / ATM {bankInfo.name}, pilih <strong>Transfer → Virtual Account</strong>.</li>
                                    <li>Masukkan nomor VA di atas.</li>
                                    <li>Periksa nama <strong>AYDATTIRE – {o.customer?.name} (Pelunasan)</strong> dan nominal tepat <strong>{rupiah(o.totals?.payLater || 0)}</strong>, lalu konfirmasi.</li>
                                  </ol>
                                  <label className={`upload ${curFile ? "has" : ""}`}>
                                    <input
                                      type="file"
                                      accept="image/*,application/pdf"
                                      onChange={(e) => handleBalanceFileChange(o.id, e.target.files?.[0] || null)}
                                    />
                                    {curFile ? (
                                      <>
                                        <span className="upload-ic">📄</span>
                                        <span><strong>{curFile.name}</strong><small>Klik untuk ganti file</small></span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="upload-ic">⬆</span>
                                        <span><strong>Upload Bukti Transfer / Screenshot VA *</strong><small>Wajib · JPG, PNG, atau PDF · maks. 5 MB</small></span>
                                      </>
                                    )}
                                  </label>
                                </>
                              ) : (
                                <>
                                  <div className="acc-box">
                                    <span>Rekening {bankInfo.name} a.n. {bankInfo.holder}</span>
                                    <strong className="mono">{bankInfo.account}</strong>
                                    <CopyBtn text={bankInfo.account} />
                                  </div>
                                  <p className="hint">
                                    Transfer tepat <strong>{rupiah(o.totals?.payLater || 0)}</strong> dan cantumkan berita <strong>{o.id}-PELUNASAN</strong>.
                                  </p>
                                  <label className={`upload ${curFile ? "has" : ""}`}>
                                    <input
                                      type="file"
                                      accept="image/*,application/pdf"
                                      onChange={(e) => handleBalanceFileChange(o.id, e.target.files?.[0] || null)}
                                    />
                                    {curFile ? (
                                      <>
                                        <span className="upload-ic">📄</span>
                                        <span><strong>{curFile.name}</strong><small>Klik untuk ganti file</small></span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="upload-ic">⬆</span>
                                        <span><strong>Upload Bukti Transfer Pelunasan *</strong><small>Wajib · JPG, PNG, atau PDF · maks. 5 MB</small></span>
                                      </>
                                    )}
                                  </label>
                                </>
                              )}
                            </div>
                          )}

                          {balanceErr[o.id] && <p className="form-error" role="alert">{balanceErr[o.id]}</p>}
                          {balanceNotice[o.id] && (
                            <p className="hint" style={{ color: "var(--green)", borderColor: "var(--green)" }}>
                              {balanceNotice[o.id]}
                            </p>
                          )}

                          {!curFile && (
                            <p className="hint warn" style={{ margin: "10px 0 6px", fontSize: "0.82rem" }}>
                              Silakan pilih atau unggah foto bukti transfer terlebih dahulu.
                            </p>
                          )}

                          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 8 }}>
                            {reuploadMode[o.id] && (
                              <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                disabled={isUploadingBalance}
                                onClick={() => setReuploadMode((prev) => ({ ...prev, [o.id]: false }))}
                              >
                                Batal Ubah
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={isUploadingBalance || !curFile}
                              onClick={() => handleConfirmBalancePayment(o)}
                            >
                              {isUploadingBalance
                                ? "Memproses Pelunasan…"
                                : "Kirim Bukti Pelunasan"}
                            </button>
                          </div>
                          <p className="sum-note center" style={{ margin: "8px 0 0" }}>
                            Mode demo: pembayaran pelunasan disimulasikan sesuai pilihan metode pembayaran Anda.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {isPaid && isOpen && (
                    <div className="oc-drawer">
                      <div className="oc-drawer-grid">
                        {/* Kolom 1: Pengiriman & Resi Pengembalian (Luar Kota) atau Info Ambil (Dalam Kota) */}
                        <div className="oc-box">
                          <h5>{isLuar ? "Ekspedisi & Resi Pengembalian" : "Jadwal Pengambilan & Pengembalian"}</h5>
                          {isLuar ? (
                            <>
                              <div className="oc-box-sub" style={{ marginBottom: 12 }}>
                                {o.outboundShipment?.number ? (
                                  <div>
                                    <span>Resi kirim dari butik:</span>{" "}
                                    <strong className="mono">
                                      {o.outboundShipment.courier} • {o.outboundShipment.number}
                                    </strong>
                                    {o.outboundShipment.proofUrl && (
                                      <div style={{ marginTop: 4 }}>
                                        <button
                                          type="button"
                                          className="btn btn-outline btn-xs"
                                          onClick={() =>
                                            setPreviewModal({
                                              orderId: o.id,
                                              title: `Struk Resi Pengiriman Butik (${o.outboundShipment.courier})`,
                                              url: o.outboundShipment.proofUrl,
                                              desc: `Nomor Resi: ${o.outboundShipment.number} • Ekspedisi: ${o.outboundShipment.courier}`,
                                            })
                                          }
                                        >
                                          <span className="material-symbols-rounded" style={{ fontSize: 14 }}>
                                            receipt
                                          </span>
                                          <span>Lihat Foto Struk Resi Pengiriman</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ color: "var(--muted)" }}>
                                    <em>Menunggu input resi pengiriman dari admin butik</em>
                                  </div>
                                )}
                                <div style={{ marginTop: 4 }}>
                                  Batas kirim balik ke butik: <strong>{fmtDate(retDay.date)}</strong>
                                </div>
                              </div>
                              {o.returnShipment ? (
                                <div className="resi-done">
                                  <div>
                                    <span>Resi Pengembalian Terkirim</span>
                                    <strong className="mono">{o.returnShipment.courier} — {o.returnShipment.number}</strong>
                                    <small>
                                      Diunggah {new Date(o.returnShipment.submittedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                                      {o.returnShipment.proofUrl && (
                                        <> · <a href={o.returnShipment.proofUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--maroon)", textDecoration: "underline" }}>Lihat Foto Resi</a></>
                                      )}
                                    </small>
                                  </div>
                                  <button
                                    type="button"
                                    className="link-btn"
                                    disabled={isSaving}
                                    onClick={() => updateOrder(o.id, { returnShipment: null })}
                                  >
                                    Ubah
                                  </button>
                                </div>
                              ) : (
                                <form className="resi-form" onSubmit={(e) => submitResi(e, o)} noValidate>
                                  <div className="resi-inputs">
                                    <select
                                      aria-label="Pilih ekspedisi"
                                      value={rf.courier}
                                      onChange={(e) => setField(o.id, "courier", e.target.value)}
                                    >
                                      {COUP_COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <input
                                      type="text"
                                      placeholder="Masukkan nomor resi balik…"
                                      value={rf.number}
                                      onChange={(e) => setField(o.id, "number", e.target.value)}
                                    />
                                    <button type="submit" className="btn btn-primary btn-sm" disabled={isSaving}>
                                      {isSaving ? "Menyimpan…" : "Simpan Resi"}
                                    </button>
                                  </div>
                                  <label className="resi-file">
                                    <input
                                      type="file"
                                      accept="image/*,application/pdf"
                                      onChange={(e) => setField(o.id, "file", e.target.files?.[0] || null)}
                                    />
                                    <span>{rf.file ? `📎 ${rf.file.name}` : "📎 Lampirkan foto struk resi (opsional)"}</span>
                                  </label>
                                  {resiErr[o.id] && <small className="field-err">{resiErr[o.id]}</small>}
                                </form>
                              )}
                            </>
                          ) : (
                            <ul className="scheme-list">
                              <li><strong>Ambil di Butik:</strong> {fmtDate(first.date)} (10.00 – 17.00 WIB)</li>
                              <li><strong>Hari Acara:</strong> {fmtDate(o.eventDate)}</li>
                              <li><strong>Batas Kembali:</strong> {fmtDate(retDay.date)} (Maks. 18.00 WIB)</li>
                              {o.totals.payLater > 0 && (
                                <li>
                                  <strong>Status Sisa Pelunasan ({rupiah(o.totals.payLater)}):</strong>{" "}
                                  {o.balanceVerified
                                    ? "Lunas Terverifikasi ✓"
                                    : hasBalanceSubmitted
                                    ? `Bukti Terkirim via ${o.balancePayMethod || "Transfer"} (Menunggu Verifikasi Admin)`
                                    : "Belum Dilunasi"}
                                </li>
                              )}
                            </ul>
                          )}
                        </div>

                        {/* Kolom 2: Status Jaminan & Pelacak Refund Deposit */}
                        <div className="oc-box">
                          <h5>Status Jaminan &amp; Pengembalian Deposit</h5>
                          {hasDeposit ? (
                            <>
                              <p className="oc-box-sub">
                                Nominal Deposit: <strong>{rupiah(o.totals.deposit)}</strong>
                                {o.refund && <> · Rekening tujuan: <strong>{o.refund.bank} {o.refund.number}</strong> a.n. {o.refund.holder}</>}
                              </p>
                              <ol className="dep-tracker">
                                {DEPOSIT_STEPS.map((step, idx) => {
                                  const stateCls = idx < depIdx ? "done" : idx === depIdx ? "active" : "";
                                  return (
                                    <li key={step.key} className={stateCls}>
                                      <span className="dep-dot">{idx < depIdx ? "✓" : idx + 1}</span>
                                      <div>
                                        <strong>{step.label}</strong>
                                        <small>{step.desc}</small>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ol>
                              <div className="dep-demo-bar">
                                <span>Simulasi status (demo):</span>
                                {DEPOSIT_STEPS.map((step) => (
                                  <button
                                    key={step.key}
                                    type="button"
                                    disabled={isSaving}
                                    className={`dep-chip ${depStatus === step.key ? "on" : ""}`}
                                    onClick={() => simulateDepositStep(o, step.key)}
                                  >
                                    {step.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div className="ktp-note">
                              <strong>Jaminan KTP Fisik</strong>
                              <p>Anda memilih jaminan KTP asli saat pengambilan di butik. KTP langsung diserahkan kembali kepada Anda saat busana dikembalikan.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Modal Pratinjau Foto Bukti Pelunasan (Pelanggan) */}
      {previewModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewModal(null)}
        >
          <div className="modal admin-proof-modal" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <div>
                <h3>{previewModal.title || "Bukti Pelunasan Sisa Sewa"}</h3>
                <small className="mono">{previewModal.orderId}</small>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPreviewModal(null)}
                aria-label="Tutup pratinjau"
              >
                ✕
              </button>
            </div>

            {previewModal.desc ? (
              <p className="muted-dark" style={{ marginBottom: 10 }}>
                {previewModal.desc}
              </p>
            ) : previewModal.amount !== undefined ? (
              <p className="muted-dark" style={{ marginBottom: 10 }}>
                Nominal: <strong>{rupiah(previewModal.amount || 0)}</strong> · Metode:{" "}
                <strong>{previewModal.payMethod || "Transfer"}</strong> · Status:{" "}
                <strong>
                  {previewModal.verified
                    ? "Pembayaran Lunas Terverifikasi"
                    : "Menunggu Verifikasi Admin"}
                </strong>
              </p>
            ) : null}

            <div className="proof-preview-box">
              {previewModal.url ? (
                <img src={previewModal.url} alt={`Bukti pelunasan ${previewModal.orderId}`} />
              ) : (
                <div className="empty" style={{ padding: "28px 20px" }}>
                  <div className="empty-icon">✓</div>
                  <h4>Dikonfirmasi via {previewModal.payMethod || "Metode Digital"}</h4>
                  <p>Tidak ada lampiran gambar, pembayaran diverifikasi oleh admin.</p>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: 14 }}>
              {previewModal.url && (
                <a
                  href={previewModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  Buka Ukuran Penuh
                </a>
              )}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setPreviewModal(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
