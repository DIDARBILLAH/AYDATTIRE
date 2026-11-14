import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { BANKS, RENTAL_TYPES } from "../data/products";
import { fmtDateLong, rupiah } from "../utils/format";
import Stepper from "../components/Stepper";
import { CopyIcon } from "../components/Icons";

export const PAYMENT_METHODS = [
  { key: "qris", label: "QRIS", desc: "GoPay, OVO, DANA, ShopeePay, m-banking" },
  { key: "va", label: "Virtual Account", desc: "Dicek otomatis" },
  { key: "transfer", label: "Transfer Manual", desc: "Upload bukti transfer" },
];

export const VA_PREFIX = { BCA: "39012", BNI: "8808", MANDIRI: "89508", BRI: "26215" };

// Pola QR dekoratif (simulasi — belum terhubung payment gateway)
export function FakeQR({ seed }) {
  const N = 25;
  const cells = useMemo(() => {
    let h = 0;
    for (const c of seed) h = (h * 131 + c.charCodeAt(0)) >>> 0;
    const rnd = () => ((h = (h * 1103515245 + 12345) >>> 0) / 4294967296);
    const out = [];
    const finder = (x, y) => [[0, 0], [N - 7, 0], [0, N - 7]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!finder(x, y) && rnd() > 0.52) out.push([x, y]);
    return out;
  }, [seed]);
  const Finder = ({ x, y }) => (
    <g>
      <rect x={x} y={y} width="7" height="7" fill="#2a1f1d" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="#2a1f1d" />
    </g>
  );
  return (
    <svg viewBox={`-2 -2 ${N + 4} ${N + 4}`} className="qr" role="img" aria-label="Kode QRIS">
      <rect x="-2" y="-2" width={N + 4} height={N + 4} fill="#fff" />
      {cells.map(([x, y]) => <rect key={x + "-" + y} x={x} y={y} width="1" height="1" fill="#2a1f1d" />)}
      <Finder x={0} y={0} /><Finder x={N - 7} y={0} /><Finder x={0} y={N - 7} />
    </svg>
  );
}

function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, target - now);
  return { left, mm: String(Math.floor(left / 60000)).padStart(2, "0"), ss: String(Math.floor((left % 60000) / 1000)).padStart(2, "0") };
}

export function CopyBtn({ text, label = "Salin" }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="copy-btn" onClick={() => {
      navigator.clipboard?.writeText(String(text).replace(/\s/g, ""));
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    }}>
      <CopyIcon /> {ok ? "Tersalin" : label}
    </button>
  );
}

export default function Payment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { getOrder, updateOrder, uploadFile, loadingOrders } = useStore();
  const order = getOrder(orderId);

  const [method, setMethod] = useState("qris");
  const [bank, setBank] = useState("BCA");
  const [proof, setProof] = useState(null); // { file, name, url, isImg }
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { left, mm, ss } = useCountdown(order?.expiresAt || 0);

  // Tandai kedaluwarsa bila waktu habis
  useEffect(() => {
    if (order && order.status === "pending" && left === 0) {
      updateOrder(order.id, { status: "expired" }).catch(() => {});
    }
  }, [left, order, updateOrder]);

  useEffect(() => () => { if (proof?.url) URL.revokeObjectURL(proof.url); }, [proof]);

  if (!order && loadingOrders) {
    return (
      <section className="container flow-page">
        <div className="loading-box"><span className="spinner dark" /> Memuat detail pembayaran…</div>
      </section>
    );
  }
  if (!order) return <Navigate to="/pesanan" replace />;
  if (order.status === "paid") return <Navigate to={`/pesanan/${order.id}/selesai`} replace />;

  const t = RENTAL_TYPES[order.type];
  const amount = order.totals.payNow;
  const bankInfo = BANKS.find((b) => b.code === bank);
  const vaNumber = VA_PREFIX[bank] + order.customer.wa.replace(/\D/g, "").slice(-8).padStart(8, "0");

  if (order.status === "expired" || order.status === "cancelled") {
    return (
      <section className="container flow-page">
        <div className="panel result-card">
          <div className="result-icon fail">!</div>
          <h2>{order.status === "expired" ? "Waktu pembayaran habis" : "Pesanan dibatalkan"}</h2>
          <p className="muted-dark">Pesanan <strong>{order.id}</strong> tidak dilanjutkan dan tanggal {fmtDateLong(order.eventDate)} sudah dilepas kembali.</p>
          <div className="result-actions">
            <Link to={`/produk/${order.items[0].productId}`} className="btn btn-primary">Pesan Ulang</Link>
            <Link to="/katalog" className="btn btn-outline">Ke Katalog</Link>
          </div>
        </div>
      </section>
    );
  }

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/|pdf$/.test(file.type)) return setError("Format bukti harus gambar (JPG/PNG) atau PDF.");
    if (file.size > 5 * 1024 * 1024) return setError("Ukuran file maksimal 5 MB.");
    setError("");
    setProof({ file, name: file.name, url: URL.createObjectURL(file), isImg: file.type.startsWith("image/") });
  };

  const confirmPaid = async () => {
    if (!proof?.file) {
      setError("Silakan pilih atau unggah foto bukti transfer terlebih dahulu.");
      return;
    }
    setError("");
    setVerifying(true);
    try {
      let proofUrl = null;
      if (proof?.file) {
        const uploaded = await uploadFile(proof.file, "proofs", order.id);
        proofUrl = uploaded.url;
      }
      await updateOrder(order.id, {
        status: "paid",
        paidAt: Date.now(),
        payMethod:
          method === "qris"
            ? "QRIS"
            : method === "va"
            ? `Virtual Account ${bankInfo.name}`
            : `Transfer ${bankInfo.name}`,
        proofName: proof?.name || null,
        proofUrl,
      });
      navigate(`/pesanan/${order.id}/selesai`, { replace: true });
    } catch (err) {
      setError(err.message || "Gagal memverifikasi pembayaran. Silakan coba lagi.");
      setVerifying(false);
    }
  };

  return (
    <>
      <section className="page-hero slim">
        <div className="container">
          <nav className="crumbs"><Link to="/">Beranda</Link> / <span>Pembayaran</span></nav>
          <h1>Pembayaran</h1>
          <Stepper current={2} />
        </div>
      </section>

      <section className="container flow-page flow-grid">
        <div className="flow-main">
          <div className={`timer-bar ${left < 5 * 60000 ? "urgent" : ""}`} role="timer" aria-live="off">
            <div>
              <strong>Selesaikan pembayaran dalam</strong>
              <small>Tanggal acara ditahan sementara untuk Anda.</small>
            </div>
            <span className="timer">{mm}:{ss}</span>
          </div>

          <div className="panel">
            <div className="amount-box">
              <div>
                <span>Total dibayar sekarang {order.payment === "dp" ? "(DP 50%)" : "(Lunas)"}</span>
                <strong>{rupiah(amount)}</strong>
              </div>
              <CopyBtn text={amount} label="Salin nominal" />
            </div>

            <h3 className="pay-title">Pilih Metode</h3>
            <div className="method-tabs" role="tablist">
              {PAYMENT_METHODS.map((m) => (
                <button key={m.key} role="tab" aria-selected={method === m.key} className={`method ${method === m.key ? "on" : ""}`}
                  onClick={() => { setMethod(m.key); setError(""); }}>
                  <strong>{m.label}</strong><small>{m.desc}</small>
                </button>
              ))}
            </div>

            {method === "qris" && (
              <div className="pay-body qris-body">
                <div className="qr-wrap">
                  <div className="qr-brand">QRIS · AYDATTIRE</div>
                  <FakeQR seed={order.id} />
                  <small>NMID: ID1026{order.id.slice(-4)}</small>
                </div>
                <ol className="pay-steps">
                  <li>Buka aplikasi e-wallet atau m-banking.</li>
                  <li>Pilih menu <strong>Scan / Bayar QRIS</strong>.</li>
                  <li>Arahkan kamera ke kode QR di samping.</li>
                  <li>Pastikan nominal <strong>{rupiah(amount)}</strong>, lalu konfirmasi.</li>
                </ol>
              </div>
            )}

            {(method === "va" || method === "transfer") && (
              <div className="pay-body">
                <div className="bank-row">
                  {BANKS.map((b) => (
                    <button key={b.code} className={`bank ${bank === b.code ? "on" : ""}`} aria-pressed={bank === b.code} onClick={() => setBank(b.code)}>{b.name}</button>
                  ))}
                </div>

                {method === "va" ? (
                  <>
                    <div className="acc-box">
                      <span>Nomor Virtual Account {bankInfo.name}</span>
                      <strong className="mono">{vaNumber.replace(/(\d{4})(?=\d)/g, "$1 ")}</strong>
                      <CopyBtn text={vaNumber} />
                    </div>
                    <ol className="pay-steps">
                      <li>Buka m-banking / ATM {bankInfo.name}, pilih <strong>Transfer → Virtual Account</strong>.</li>
                      <li>Masukkan nomor VA di atas.</li>
                      <li>Periksa nama <strong>AYDATTIRE – {order.customer.name}</strong> dan nominal, lalu konfirmasi.</li>
                    </ol>
                  </>
                ) : (
                  <>
                    <div className="acc-box">
                      <span>Rekening {bankInfo.name} a.n. {bankInfo.holder}</span>
                      <strong className="mono">{bankInfo.account}</strong>
                      <CopyBtn text={bankInfo.account} />
                    </div>
                    <p className="hint">Transfer tepat <strong>{rupiah(amount)}</strong> dan cantumkan berita <strong>{order.id}</strong>.</p>
                  </>
                )}
              </div>
            )}

            {/* Unggah Bukti Pembayaran Wajib untuk Semua Metode */}
            <div className="proof-upload-section" style={{ marginTop: 20 }}>
              <label className={`upload ${proof ? "has" : ""}`}>
                <input type="file" accept="image/*,application/pdf" onChange={onFile} />
                {proof ? (
                  <>
                    {proof.isImg ? <img src={proof.url} alt="Pratinjau bukti transfer" /> : <span className="upload-ic">📄</span>}
                    <span><strong>{proof.name}</strong><small>Klik untuk ganti file</small></span>
                  </>
                ) : (
                  <>
                    <span className="upload-ic">⬆</span>
                    <span><strong>Upload Bukti Transfer / Pembayaran *</strong><small>Wajib melampirkan screenshot atau foto struk · JPG, PNG, atau PDF · maks. 5 MB</small></span>
                  </>
                )}
              </label>
              {!proof && (
                <p className="hint warn" style={{ marginTop: 6, fontSize: "0.82rem" }}>
                  Silakan pilih atau unggah foto bukti transfer terlebih dahulu.
                </p>
              )}
            </div>

            {error && <p className="form-error" role="alert" style={{ marginTop: 10 }}>{error}</p>}
            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 12 }}
              onClick={confirmPaid}
              disabled={verifying || !proof?.file}
            >
              {verifying ? (
                <>
                  <span className="spinner" /> Memverifikasi pembayaran…
                </>
              ) : order.payment === "dp" ? (
                "Konfirmasi Pembayaran DP"
              ) : (
                "Konfirmasi Pembayaran (Lunas)"
              )}
            </button>
            <p className="sum-note center">Mode demo: pembayaran disimulasikan, tidak ada transaksi sungguhan.</p>
          </div>
        </div>

        <aside className="flow-aside">
          <div className="panel summary">
            <div className="panel-head"><h3>Pesanan</h3><span className="mono order-no">{order.id}</span></div>
            <ul className="sum-items">
              {order.items.map((it) => (
                <li key={it.productId}>
                  <img src={it.img} alt="" />
                  <div><strong>{it.name}</strong><small>Ukuran {it.size}</small></div>
                  <span>{rupiah(it.price)}</span>
                </li>
              ))}
            </ul>
            <dl className="sum-rows">
              <div><dt>Metode sewa</dt><dd>{t.label}</dd></div>
              <div><dt>Hari acara</dt><dd>{fmtDateLong(order.eventDate)}</dd></div>
              <div><dt>Jaminan</dt><dd>{order.security === "ktp" ? "KTP Asli" : "Deposit"}</dd></div>
              <div className="sum-total"><dt>Total</dt><dd>{rupiah(order.totals.grandTotal)}</dd></div>
              <div className="sum-now"><dt>Bayar sekarang</dt><dd>{rupiah(amount)}</dd></div>
              {order.totals.payLater > 0 && <div className="sum-later"><dt>Sisa nanti</dt><dd>{rupiah(order.totals.payLater)}</dd></div>}
            </dl>
            <button className="link-btn danger" onClick={() => setConfirmCancel(true)}>Batalkan pesanan</button>
          </div>
        </aside>
      </section>

      {confirmCancel && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="cTitle">
          <div className="modal">
            <h3 id="cTitle">Batalkan pesanan?</h3>
            <p>Tanggal yang sedang ditahan akan dilepas dan bisa dipesan orang lain.</p>
            <div className="modal-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setConfirmCancel(false)}>Kembali</button>
              <button className="btn btn-primary btn-sm" onClick={async () => {
                try {
                  await updateOrder(order.id, { status: "cancelled" });
                } catch {
                  // abaikan error jika offline
                }
                setConfirmCancel(false);
              }}>Ya, Batalkan</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
