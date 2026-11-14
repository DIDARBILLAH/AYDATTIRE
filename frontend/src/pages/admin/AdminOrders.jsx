import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../../context/StoreContext";
import { RENTAL_TYPES } from "../../data/products";
import { fmtDate, fmtDateLong, rupiah, todayISO } from "../../utils/format";
import {
  buildOrderReportRows,
  exportToCSV,
  exportToExcel,
  exportToPDF,
  getOrderReceivedCash,
  getOrderRemainingBalance,
  getPaymentSubStatus,
} from "../../utils/exportReport";

const EXPORT_HEADERS = [
  { key: "no", label: "No" },
  { key: "id", label: "No. Order" },
  { key: "tanggalOrder", label: "Tgl Order" },
  { key: "namaPenyewa", label: "Nama Penyewa" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "tipeSewa", label: "Tipe Sewa" },
  { key: "tglAcara", label: "Tgl Acara" },
  { key: "itemBusana", label: "Item & Ukuran" },
  { key: "skemaBayar", label: "Skema" },
  { key: "grandTotal", label: "Total Tagihan", isCurrency: true },
  { key: "dibayarAwal", label: "Kas Masuk", isCurrency: true },
  { key: "statusPesanan", label: "Status Pesanan" },
  { key: "statusDeposit", label: "Status Deposit" },
];

const ORDER_STATUSES = [
  { key: "pending",   label: "Menunggu Pembayaran", cls: "pending", icon: "pending_actions" },
  { key: "paid",      label: "Terkonfirmasi",       cls: "paid",    icon: "check_circle" },
  { key: "active",    label: "Sedang Disewa",       cls: "paid",    icon: "check_circle" },
  { key: "returned",  label: "Dikembalikan",        cls: "paid",    icon: "check_circle" },
  { key: "completed", label: "Selesai",             cls: "paid",    icon: "check_circle" },
  { key: "cancelled", label: "Dibatalkan",          cls: "off",     icon: "cancel" },
  { key: "expired",   label: "Kedaluwarsa",         cls: "off",     icon: "cancel" },
];

const DEPOSIT_STATUSES = [
  { key: "holding",    label: "Ditahan Butik",        cls: "info" },
  { key: "inspecting", label: "Inspeksi Barang",      cls: "warn" },
  { key: "refunded",   label: "Deposit Dikembalikan", cls: "ok" },
  { key: "penalized",  label: "Dipotong Denda",       cls: "off" },
];

const OUTBOUND_COURIERS = ["JNE", "J&T", "SiCepat", "AnterAja", "Paxel"];

export default function AdminOrders() {
  const {
    state,
    updateOrder,
    verifyBalancePayment,
    updateOutboundShipment,
    refreshOrders,
    loadingOrders,
    dbError,
  } = useStore();
  const [params] = useSearchParams();
  const focusId = params.get("focus") || "";

  const [filterStatus, setFilterStatus] = useState("semua");
  const [search, setSearch] = useState(focusId);
  const [savingId, setSavingId] = useState(null);
  const [actionMsg, setActionMsg] = useState("");
  const [proofModal, setProofModal] = useState(null);
  const [proofImgError, setProofImgError] = useState(false);

  const [outboundForm, setOutboundForm] = useState({});
  const [outboundEditMode, setOutboundEditMode] = useState({});
  const [savingOutboundId, setSavingOutboundId] = useState(null);

  const openProofModal = (data) => {
    setProofImgError(false);
    setProofModal(data);
  };

  const closeProofModal = () => {
    setProofImgError(false);
    setProofModal(null);
  };

  const orders = useMemo(() => {
    const raw = Array.isArray(state?.orders) ? state.orders : [];
    return raw.map((o) =>
      o?.status === "pending" && Date.now() > (o?.expiresAt || 0)
        ? { ...o, status: "expired" }
        : o
    );
  }, [state?.orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filterStatus !== "semua" && o?.status !== filterStatus) return false;
      if (!q) return true;
      const hay = [
        o?.id,
        o?.customer?.name,
        o?.customer?.wa,
        o?.customer?.email,
        ...(o?.items || []).map((i) => i?.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [orders, filterStatus, search]);

  const notify = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 3000);
  };

  const handleStatusChange = async (order, nextStatus) => {
    // Validasi foto bukti transfer sebelum konfirmasi pembayaran
    if (nextStatus === "paid" && !order.proofUrl) {
      notify("Tidak dapat mengonfirmasi pembayaran karena pelanggan belum mengunggah foto bukti transfer.");
      return;
    }

    setSavingId(order.id);
    try {
      const patch = { status: nextStatus };
      if (nextStatus === "paid" && !order.paidAt) {
        patch.paidAt = Date.now();
      }
      if (
        nextStatus === "returned" &&
        order.security === "deposit" &&
        order.depositStatus === "holding"
      ) {
        patch.depositStatus = "inspecting";
      }
      await updateOrder(order.id, patch);
      const stLabel =
        ORDER_STATUSES.find((s) => s.key === nextStatus)?.label || nextStatus;
      notify(`Status pesanan ${order.id} diubah menjadi "${stLabel}".`);
    } catch (err) {
      notify(err.message || "Gagal memperbarui status pesanan.");
    } finally {
      setSavingId(null);
    }
  };

  const handleDepositChange = async (order, nextDepStatus) => {
    setSavingId(order.id);
    try {
      await updateOrder(order.id, { depositStatus: nextDepStatus });
      const depLabel =
        DEPOSIT_STATUSES.find((d) => d.key === nextDepStatus)?.label ||
        nextDepStatus;
      notify(`Status deposit pesanan ${order.id} diubah ke "${depLabel}".`);
    } catch (err) {
      notify(err.message || "Gagal memperbarui status deposit.");
    } finally {
      setSavingId(null);
    }
  };

  const handleVerifyBalance = async (orderId, method = null) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    const isCashOrWa =
      typeof method === "string" &&
      (method.toLowerCase().includes("tunai") || method.toLowerCase().includes("wa"));

    if (!isCashOrWa && !targetOrder?.balanceProofUrl) {
      notify("Tidak dapat mengonfirmasi pembayaran karena pelanggan belum mengunggah foto bukti transfer.");
      return;
    }

    setSavingId(orderId);
    try {
      await verifyBalancePayment(orderId, method);
      setProofModal((prev) =>
        prev && prev.orderId === orderId ? { ...prev, verified: true } : prev
      );
      notify(`Pelunasan pesanan ${orderId} telah diverifikasi (Lunas 100%).`);
    } catch (err) {
      notify(err.message || "Gagal memverifikasi pelunasan.");
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveOutboundResi = async (e, orderId) => {
    e.preventDefault();
    const cur = outboundForm[orderId] || {};
    const existing = orders.find((o) => o.id === orderId);
    const courier = cur.courier || existing?.outboundShipment?.courier || "JNE";
    const number = (cur.number ?? existing?.outboundShipment?.number ?? "").trim().toUpperCase();
    const proofFile = cur.file || null;

    if (!number) {
      notify("Silakan masukkan nomor resi pengiriman terlebih dahulu.");
      return;
    }

    setSavingOutboundId(orderId);
    try {
      await updateOutboundShipment(orderId, {
        courier,
        number,
        proofFile,
      });
      setOutboundEditMode((prev) => ({ ...prev, [orderId]: false }));
      notify(`Resi pengiriman ${courier} (${number}) berhasil disimpan.`);
    } catch (err) {
      notify(err.message || "Gagal menyimpan resi pengiriman.");
    } finally {
      setSavingOutboundId(null);
    }
  };

  const handleQuickExport = (format) => {
    const rows = buildOrderReportRows(filtered);
    const totalMasuk = filtered.reduce(
      (s, o) => s + getOrderReceivedCash(o),
      0
    );
    const summaryItems = [
      { label: "Total Pesanan", value: `${filtered.length} Order` },
      { label: "Total Kas Masuk", value: rupiah(totalMasuk) },
    ];
    const subtitle = `Status: ${filterStatus === "semua" ? "Semua Status" : filterStatus}`;
    const fname = `pesanan-aydattire-${todayISO()}`;

    if (format === "pdf") {
      exportToPDF({
        title: "Laporan Daftar Pesanan & Jaminan AYDATTIRE",
        subtitle,
        summaryItems,
        headers: EXPORT_HEADERS,
        rows,
      });
    } else if (format === "excel") {
      exportToExcel({
        title: "Laporan Daftar Pesanan & Jaminan AYDATTIRE",
        subtitle,
        summaryItems,
        headers: EXPORT_HEADERS,
        rows,
        filename: `${fname}.xls`,
      });
      notify("Daftar pesanan berhasil diekspor ke Excel (.xls)");
    } else if (format === "csv") {
      exportToCSV({
        headers: EXPORT_HEADERS,
        rows,
        filename: `${fname}.csv`,
      });
      notify("Daftar pesanan berhasil diekspor ke CSV (.csv)");
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">Manajemen Transaksi</span>
          <h1>Daftar Pesanan &amp; Jaminan</h1>
          <p className="muted-dark">
            Verifikasi bukti pembayaran, kelola jadwal keluar-masuk kebaya, dan perbarui status refund deposit klien.
          </p>
        </div>
        <div className="admin-head-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => handleQuickExport("pdf")}
          >
            <span className="material-symbols-rounded">picture_as_pdf</span>
            <span>Export PDF</span>
          </button>
          <button
            type="button"
            className="btn btn-gold btn-sm"
            onClick={() => handleQuickExport("excel")}
          >
            <span className="material-symbols-rounded">table_view</span>
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => handleQuickExport("csv")}
          >
            <span className="material-symbols-rounded">download</span>
            <span>CSV</span>
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={refreshOrders}
            disabled={loadingOrders}
          >
            <span className="material-symbols-rounded">sync</span>
            <span>{loadingOrders ? "Menyinkronkan…" : "Sinkronkan"}</span>
          </button>
        </div>
      </div>

      {dbError && (
        <p className="hint warn" style={{ marginBottom: 16 }}>
          {dbError}
        </p>
      )}

      {/* Filter Bar */}
      <div className="panel admin-toolbar">
        <div className="search" style={{ maxWidth: 360 }}>
          <span className="material-symbols-rounded">search</span>
          <input
            type="search"
            placeholder="Cari ID order, nama penyewa, WA, atau kebaya…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="admin-filter-pills">
          <button
            type="button"
            className={`dep-chip ${filterStatus === "semua" ? "on" : ""}`}
            onClick={() => setFilterStatus("semua")}
          >
            Semua ({orders.length})
          </button>
          {ORDER_STATUSES.map((st) => {
            const count = orders.filter((o) => o?.status === st.key).length;
            return (
              <button
                key={st.key}
                type="button"
                className={`dep-chip ${filterStatus === st.key ? "on" : ""}`}
                onClick={() => setFilterStatus(st.key)}
              >
                {st.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Daftar Kartu Pesanan Detail */}
      {loadingOrders && !filtered.length ? (
        <div className="loading-box">
          <span className="spinner dark" /> Memuat daftar pesanan…
        </div>
      ) : !filtered.length ? (
        <div className="empty">
          <div className="empty-icon">
            <span className="material-symbols-rounded" style={{ fontSize: 36 }}>
              receipt_long
            </span>
          </div>
          <h3>Tidak ada pesanan yang cocok</h3>
          <p>Ubah filter status atau kata kunci pencarian di atas.</p>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              setFilterStatus("semua");
              setSearch("");
            }}
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="admin-order-list">
          {filtered.map((o) => {
            const st =
              ORDER_STATUSES.find((s) => s.key === o?.status) || ORDER_STATUSES[0];
            const depSt =
              DEPOSIT_STATUSES.find(
                (d) => d.key === (o?.depositStatus || "holding")
              ) || DEPOSIT_STATUSES[0];
            const t = RENTAL_TYPES[o?.type];
            const isLuar = o?.type === "luar_kota";
            const hasDeposit = o?.security === "deposit";
            const isDpOrder = o?.payment === "dp";
            const dpSubStatus = getPaymentSubStatus(o);
            const kasMasukOrder = getOrderReceivedCash(o);
            const sisaTagihanOrder = getOrderRemainingBalance(o);
            const isSaving = savingId === o?.id;
            const isCancelledOrExpired = ["cancelled", "expired"].includes(o?.status);

            return (
              <article key={o.id} className="panel admin-order-card">
                <div className="aoc-head">
                  <div className="aoc-head-left">
                    <span className="mono order-no">{o.id}</span>
                    <span className={`status-badge ${st.cls} badge-with-icon`}>
                      <span className="material-symbols-rounded" style={{ fontSize: 15 }}>
                        {isCancelledOrExpired ? "cancel" : "check_circle"}
                      </span>
                      <span>{st.label}</span>
                    </span>
                    <span className={`badge ${isLuar ? "badge-gold" : ""}`}>
                      {t?.label || "Dalam Kota"} · {t?.days || 3} Hari
                    </span>
                    <span className="mini-pill info">
                      {isDpOrder ? "Skema: DP 50%" : "Skema: Bayar Lunas"}
                    </span>
                    {isDpOrder && (
                      <span className={`mini-pill ${dpSubStatus.cls}`}>
                        {dpSubStatus.label}
                      </span>
                    )}
                  </div>
                  <div className="aoc-head-right">
                    <small className="muted-dark">
                      Dibuat:{" "}
                      {new Date(o.createdAt || Date.now()).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </small>
                  </div>
                </div>

                <div className="aoc-grid">
                  {/* Kolom 1: Data Penyewa & Jaminan */}
                  <div className="aoc-col">
                    <h5>1. Data Penyewa &amp; Jaminan</h5>
                    <dl className="aoc-dl">
                      <div>
                        <dt>Nama</dt>
                        <dd>
                          <strong>{o.customer?.name || "-"}</strong>
                        </dd>
                      </div>
                      <div>
                        <dt>WhatsApp</dt>
                        <dd>
                          <a
                            href={`https://wa.me/${(o.customer?.wa || "")
                              .replace(/^0/, "62")
                              .replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-btn icon-inline"
                          >
                            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                              chat
                            </span>
                            <span>{o.customer?.wa || "-"}</span>
                          </a>
                        </dd>
                      </div>
                      {o.customer?.email && (
                        <div>
                          <dt>Email</dt>
                          <dd>{o.customer.email}</dd>
                        </div>
                      )}
                      {isLuar && (
                        <div>
                          <dt>Alamat Kirim</dt>
                          <dd>
                            {o.customer?.address}, {o.customer?.city} {o.customer?.zip}
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt>Jaminan</dt>
                        <dd>
                          {hasDeposit ? (
                            <strong>Deposit Uang ({rupiah(o.totals?.deposit || 0)})</strong>
                          ) : (
                            <strong>KTP Asli (Fisik saat ambil di butik)</strong>
                          )}
                        </dd>
                      </div>
                      {hasDeposit && o.refund && (
                        <div>
                          <dt>Rek. Refund</dt>
                          <dd className="mono">
                            {o.refund.bank} {o.refund.number} a.n. {o.refund.holder}
                          </dd>
                        </div>
                      )}
                      {o.customer?.note && (
                        <div>
                          <dt>Catatan</dt>
                          <dd>“{o.customer.note}”</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Kolom 2: Item Kebaya, Ukuran & Jadwal */}
                  <div className="aoc-col">
                    <h5>2. Item Busana &amp; Jadwal Sewa</h5>
                    <ul className="aoc-items">
                      {(o.items || []).map((it) => (
                        <li key={it.productId}>
                          <img src={it.img} alt={it.name} />
                          <div>
                            <strong>{it.name}</strong>
                            <small>
                              Ukuran {it.size} · {rupiah(it.price)}
                            </small>
                            {it.customSize?.isCustom && (
                              <div className="inv-custom-size" style={{ marginTop: 4 }}>
                                <span className="icon-inline">
                                  <span
                                    className="material-symbols-rounded"
                                    style={{ fontSize: 15 }}
                                  >
                                    straighten
                                  </span>
                                  <span>
                                    Permak: LD {it.customSize.ld} · Pjg {it.customSize.panjang} ·
                                    Pinggang {it.customSize.pinggang}
                                  </span>
                                </span>
                                {it.customSize.note && (
                                  <small>Catatan: {it.customSize.note}</small>
                                )}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>

                    <div className="aoc-dates">
                      <div>
                        <span>Ambil / Kirim:</span>{" "}
                        <strong>
                          {fmtDate(o.tglAmbil || o.schedule?.[0]?.date || o.eventDate)}
                        </strong>
                      </div>
                      <div>
                        <span>Hari Acara (H):</span>{" "}
                        <strong>{fmtDateLong(o.eventDate)}</strong>
                      </div>
                      <div>
                        <span>Batas Kembali:</span>{" "}
                        <strong>
                          {fmtDate(
                            o.tglKembali ||
                              o.schedule?.find((s) => s.role === "kembali")?.date ||
                              o.eventDate
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Selesai Laundry:</span>{" "}
                        <strong>
                          {fmtDate(
                            o.tglSelesaiLaundry ||
                              o.schedule?.find((s) => s.role === "laundry")?.date ||
                              o.eventDate
                          )}
                        </strong>
                      </div>
                    </div>

                    {/* Pengiriman Kurir & Resi Butik (Luar Kota) */}
                    {isLuar && (
                      <div
                        className="aoc-outbound-box"
                        style={{
                          marginTop: 12,
                          padding: "12px",
                          background: "var(--cream)",
                          border: "1px solid var(--line)",
                          borderRadius: 10,
                        }}
                      >
                        <h6
                          style={{
                            margin: "0 0 8px",
                            fontSize: "0.82rem",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            color: "var(--maroon-dark)",
                          }}
                        >
                          <span
                            className="material-symbols-rounded"
                            style={{ fontSize: 17 }}
                          >
                            local_shipping
                          </span>
                          <span>Pengiriman Kurir &amp; Resi Butik</span>
                        </h6>

                        {o.outboundShipment?.number && !outboundEditMode[o.id] ? (
                          <div
                            className="resi-done"
                            style={{
                              background: "#fff",
                              padding: "10px 12px",
                              borderRadius: 8,
                              border: "1px solid rgba(0,0,0,0.06)",
                            }}
                          >
                            <div>
                              <span
                                style={{
                                  fontSize: "0.78rem",
                                  color: "var(--muted)",
                                }}
                              >
                                Resi Pengiriman ke Pelanggan
                              </span>
                              <strong
                                className="mono"
                                style={{
                                  display: "block",
                                  fontSize: "0.92rem",
                                  color: "var(--maroon)",
                                }}
                              >
                                {o.outboundShipment.courier} —{" "}
                                {o.outboundShipment.number}
                              </strong>
                              {o.outboundShipment.shippedAt && (
                                <small
                                  style={{
                                    color: "var(--muted)",
                                    fontSize: "0.74rem",
                                  }}
                                >
                                  Diinput{" "}
                                  {new Date(
                                    o.outboundShipment.shippedAt
                                  ).toLocaleString("id-ID", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  })}
                                </small>
                              )}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                flexWrap: "wrap",
                                alignItems: "center",
                                marginTop: 6,
                              }}
                            >
                              {o.outboundShipment.proofUrl && (
                                <button
                                  type="button"
                                  className="btn btn-outline btn-xs"
                                  onClick={() =>
                                    openProofModal({
                                      orderId: o.id,
                                      title: `Foto Resi Pengiriman Butik (${o.outboundShipment.courier})`,
                                      url: o.outboundShipment.proofUrl,
                                      name: `resi-kirim-${o.outboundShipment.number}`,
                                    })
                                  }
                                >
                                  <span
                                    className="material-symbols-rounded"
                                    style={{ fontSize: 15 }}
                                  >
                                    receipt
                                  </span>
                                  <span>Lihat Foto Resi Kirim</span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-ghost btn-xs"
                                onClick={() => {
                                  setOutboundForm((prev) => ({
                                    ...prev,
                                    [o.id]: {
                                      courier:
                                        o.outboundShipment?.courier || "JNE",
                                      number: o.outboundShipment?.number || "",
                                      file: null,
                                    },
                                  }));
                                  setOutboundEditMode((prev) => ({
                                    ...prev,
                                    [o.id]: true,
                                  }));
                                }}
                              >
                                Ubah Resi
                              </button>
                            </div>
                          </div>
                        ) : (
                          <form
                            className="resi-form"
                            onSubmit={(e) => handleSaveOutboundResi(e, o.id)}
                            noValidate
                            style={{ display: "grid", gap: 8 }}
                          >
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "110px 1fr",
                                gap: 8,
                              }}
                            >
                              <select
                                aria-label="Pilih kurir pengiriman butik"
                                value={
                                  outboundForm[o.id]?.courier ||
                                  o.outboundShipment?.courier ||
                                  "JNE"
                                }
                                onChange={(e) =>
                                  setOutboundForm((prev) => ({
                                    ...prev,
                                    [o.id]: {
                                      ...(prev[o.id] || {}),
                                      courier: e.target.value,
                                    },
                                  }))
                                }
                                style={{
                                  padding: "6px 8px",
                                  fontSize: "0.82rem",
                                  borderRadius: 6,
                                  border: "1px solid var(--line)",
                                }}
                              >
                                {OUTBOUND_COURIERS.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Nomor resi pengiriman…"
                                value={
                                  outboundForm[o.id]?.number ??
                                  (o.outboundShipment?.number || "")
                                }
                                onChange={(e) =>
                                  setOutboundForm((prev) => ({
                                    ...prev,
                                    [o.id]: {
                                      ...(prev[o.id] || {}),
                                      number: e.target.value,
                                    },
                                  }))
                                }
                                style={{
                                  padding: "6px 10px",
                                  fontSize: "0.82rem",
                                  borderRadius: 6,
                                  border: "1px solid var(--line)",
                                }}
                              />
                            </div>
                            <label
                              className="resi-file"
                              style={{ fontSize: "0.78rem" }}
                            >
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) =>
                                  setOutboundForm((prev) => ({
                                    ...prev,
                                    [o.id]: {
                                      ...(prev[o.id] || {}),
                                      file: e.target.files?.[0] || null,
                                    },
                                  }))
                                }
                              />
                              <span>
                                {outboundForm[o.id]?.file
                                  ? `📎 ${outboundForm[o.id].file.name}`
                                  : o.outboundShipment?.proofUrl
                                  ? "📎 Ganti foto struk resi (opsional)"
                                  : "📎 Lampirkan foto struk resi butik"}
                              </span>
                            </label>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                justifyContent: "flex-end",
                              }}
                            >
                              {o.outboundShipment?.number && (
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-xs"
                                  onClick={() =>
                                    setOutboundEditMode((prev) => ({
                                      ...prev,
                                      [o.id]: false,
                                    }))
                                  }
                                >
                                  Batal
                                </button>
                              )}
                              <button
                                type="submit"
                                className="btn btn-primary btn-xs"
                                disabled={savingOutboundId === o.id}
                              >
                                {savingOutboundId === o.id
                                  ? "Menyimpan…"
                                  : "Simpan & Kirim Resi"}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}

                    {isLuar && o.returnShipment && (
                      <div className="resi-done" style={{ marginTop: 10 }}>
                        <div>
                          <span>Resi Pengembalian Klien</span>
                          <strong className="mono">
                            {o.returnShipment.courier} — {o.returnShipment.number}
                          </strong>
                        </div>
                        {o.returnShipment.proofUrl && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() =>
                              openProofModal({
                                orderId: o.id,
                                title: `Foto Resi Pengembalian (${o.returnShipment.courier})`,
                                url: o.returnShipment.proofUrl,
                                name:
                                  o.returnShipment.proofName || o.returnShipment.number,
                              })
                            }
                          >
                            <span className="material-symbols-rounded">receipt</span>
                            <span>Lihat Resi</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Kolom 3: Pembayaran, Bukti Transfer, & Kontrol Status */}
                  <div className="aoc-col">
                    <h5>3. Pembayaran &amp; Kontrol Status</h5>
                    <div className="aoc-pay-box">
                      <div>
                        <span>Total Tagihan:</span>
                        <strong>{rupiah(o.totals?.grandTotal || 0)}</strong>
                      </div>
                      <div>
                        <span>{isDpOrder ? "Dibayar Awal (DP):" : "Dibayar Awal:"}</span>
                        <strong style={{ color: "var(--green)" }}>
                          {rupiah(o.totals?.payNow || 0)}
                        </strong>
                      </div>
                      {isDpOrder && (
                        <>
                          <div>
                            <span>Tagihan Pelunasan:</span>
                            <strong
                              style={{
                                color: o.balanceVerified ? "var(--green)" : "var(--maroon)",
                              }}
                            >
                              {rupiah(o.totals?.payLater || 0)}{" "}
                              {o.balanceVerified ? "(Lunas ✓)" : ""}
                            </strong>
                          </div>
                          <div>
                            <span>Sisa Belum Lunas:</span>
                            <strong
                              style={{
                                color: sisaTagihanOrder > 0 ? "var(--maroon)" : "var(--green)",
                              }}
                            >
                              {rupiah(sisaTagihanOrder)}
                            </strong>
                          </div>
                          <div>
                            <span>Sub-Status DP:</span>
                            <span className={`mini-pill ${dpSubStatus.cls}`}>
                              {dpSubStatus.label}
                            </span>
                          </div>
                        </>
                      )}
                      <div>
                        <span>Total Kas Diterima:</span>
                        <strong style={{ color: "var(--maroon-dark)" }}>
                          {rupiah(kasMasukOrder)}
                        </strong>
                      </div>
                      <div>
                        <span>Metode Bayar {isDpOrder ? "DP:" : ":"}</span>
                        <strong>{o.payMethod || "Belum dipilih"}</strong>
                      </div>
                      {isDpOrder && (
                        <div>
                          <span>Metode Pelunasan:</span>
                          <strong>{o.balancePayMethod || (o.balanceVerified ? "Lunas" : "Belum dipilih")}</strong>
                        </div>
                      )}
                    </div>

                    {/* Tombol Lihat Bukti DP / Pembayaran & Bukti Pelunasan (Susunan Vertikal Penuh) */}
                    <div className="aoc-proof-buttons">
                      {/* Baris 1: Bukti Pembayaran DP / Pembayaran Utama */}
                      {o.proofUrl || o.proofName ? (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm aoc-btn-proof"
                          onClick={() =>
                            openProofModal({
                              orderId: o.id,
                              title: isDpOrder
                                ? "Bukti Pembayaran DP"
                                : "Bukti Pembayaran Penyewa",
                              url: o.proofUrl || "",
                              name: o.proofName || "bukti-transfer.jpg",
                              payMethod: o.payMethod,
                              amount: o.totals?.payNow,
                              isBalanceProof: false,
                            })
                          }
                        >
                          <span className="material-symbols-rounded">receipt</span>
                          <span>{isDpOrder ? "Lihat Bukti DP" : "Lihat Bukti Bayar"}</span>
                        </button>
                      ) : (
                        <div className="aoc-no-proof">
                          <span className="icon-inline">
                            <span
                              className="material-symbols-rounded"
                              style={{ fontSize: 16, color: "var(--muted)" }}
                            >
                              image_not_supported
                            </span>
                            <span>
                              Belum ada foto bukti {isDpOrder ? "DP" : "transfer"}
                              {o.payMethod ? ` (${o.payMethod})` : ""}
                            </span>
                          </span>
                        </div>
                      )}

                      {/* Baris 2: Bukti / Status Pelunasan untuk Pesanan DP */}
                      {isDpOrder && (
                        o.balanceVerified ? (
                          o.balanceProofUrl ? (
                            <button
                              type="button"
                              className="btn btn-outline btn-sm aoc-btn-proof"
                              onClick={() =>
                                openProofModal({
                                  orderId: o.id,
                                  title: "Bukti Transfer Pelunasan",
                                  url: o.balanceProofUrl || "",
                                  name: `pelunasan-${o.id}`,
                                  payMethod: o.balancePayMethod || "Transfer Pelunasan",
                                  amount: o.totals?.payLater,
                                  paidAt: o.balancePaidAt,
                                  isBalanceProof: true,
                                  verified: true,
                                })
                              }
                            >
                              <span className="material-symbols-rounded" style={{ color: "var(--green)" }}>
                                verified
                              </span>
                              <span>Lihat Bukti Pelunasan (Lunas ✓)</span>
                            </button>
                          ) : (
                            <div className="aoc-verified-badge">
                              <span className="material-symbols-rounded" style={{ fontSize: 16, color: "var(--green)" }}>
                                check_circle
                              </span>
                              <span>Pelunasan Terverifikasi (Tunai/WA)</span>
                            </div>
                          )
                        ) : (o.balanceProofUrl || o.balancePaidAt) ? (
                          <button
                            type="button"
                            className="btn btn-gold btn-sm aoc-btn-proof"
                            onClick={() =>
                              openProofModal({
                                orderId: o.id,
                                title: "Bukti Transfer Pelunasan",
                                url: o.balanceProofUrl || "",
                                name: `pelunasan-${o.id}`,
                                payMethod: o.balancePayMethod || "Transfer Pelunasan",
                                amount: o.totals?.payLater,
                                paidAt: o.balancePaidAt,
                                isBalanceProof: true,
                                verified: false,
                              })
                            }
                          >
                            <span className="material-symbols-rounded">receipt_long</span>
                            <span>
                              {o.balanceProofUrl
                                ? "Lihat Bukti Pelunasan"
                                : `Cek Pelunasan (${o.balancePayMethod || "Online"})`}
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm aoc-btn-proof"
                            disabled
                            title="Pelanggan belum mengonfirmasi pelunasan"
                          >
                            <span className="material-symbols-rounded">hourglass_empty</span>
                            <span>Pelunasan Belum Ada</span>
                          </button>
                        )
                      )}
                    </div>

                    {/* Aksi Verifikasi Pelunasan DP (Hanya tampil jika belum lunas) */}
                    {isDpOrder && !o.balanceVerified && (
                      <div className="aoc-balance-actions">
                        {o.balanceProofUrl && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm aoc-btn-full-action"
                            disabled={isSaving}
                            onClick={() => handleVerifyBalance(o.id)}
                          >
                            <span className="material-symbols-rounded">check_circle</span>
                            <span>
                              {isSaving ? "Memverifikasi…" : "Konfirmasi Pelunasan (Lunas 100%)"}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline btn-sm aoc-btn-full-action"
                          disabled={isSaving}
                          onClick={() =>
                            handleVerifyBalance(
                              o.id,
                              "Tunai di Butik / Konfirmasi WA"
                            )
                          }
                          title="Tandai pesanan lunas jika pelanggan membayar tunai saat fitting di butik atau konfirmasi via WhatsApp"
                        >
                          <span className="material-symbols-rounded">payments</span>
                          <span>Tandai Lunas (Tunai di Butik / Konfirmasi WA)</span>
                        </button>
                      </div>
                    )}

                    {/* Kontrol Ubah Status Pesanan */}
                    <div className="aoc-control">
                      <label htmlFor={`st-${o.id}`} className="icon-inline">
                        <span className="material-symbols-rounded" style={{ fontSize: 17 }}>
                          check_circle
                        </span>
                        <span>Ubah Status Pesanan (Real-time)</span>
                      </label>
                      <select
                        id={`st-${o.id}`}
                        value={o.status}
                        disabled={isSaving}
                        onChange={(e) => handleStatusChange(o, e.target.value)}
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Kontrol Status Pengembalian Deposit (Sinkron dengan Orders.jsx pengguna) */}
                    {hasDeposit && (
                      <div className="aoc-control" style={{ marginTop: 12 }}>
                        <label htmlFor={`dep-${o.id}`} className="icon-inline">
                          <span className="material-symbols-rounded" style={{ fontSize: 17 }}>
                            currency_exchange
                          </span>
                          <span>Status Refund Deposit</span>
                          <span
                            className={`mini-pill ${depSt.cls}`}
                            style={{ marginLeft: "auto" }}
                          >
                            {depSt.label}
                          </span>
                        </label>
                        <select
                          id={`dep-${o.id}`}
                          value={o.depositStatus || "holding"}
                          disabled={isSaving}
                          onChange={(e) => handleDepositChange(o, e.target.value)}
                        >
                          {DEPOSIT_STATUSES.map((d) => (
                            <option key={d.key} value={d.key}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Pratinjau Bukti Pembayaran / Resi */}
      {proofModal && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={closeProofModal}
        >
          <div
            className="modal admin-proof-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-head">
              <div>
                <h3>{proofModal.title}</h3>
                <small className="mono">{proofModal.orderId}</small>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={closeProofModal}
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            {proofModal.amount !== undefined && (
              <p className="muted-dark" style={{ marginBottom: 8 }}>
                Metode: <strong>{proofModal.payMethod || "Transfer Manual"}</strong> · Nominal:{" "}
                <strong>{rupiah(proofModal.amount)}</strong>
                {proofModal.isBalanceProof && (
                  <>
                    {" "}· Status:{" "}
                    <span className={`mini-pill ${proofModal.verified ? "ok" : "warn"}`}>
                      {proofModal.verified
                        ? "Lunas 100% Terverifikasi"
                        : "Pelunasan Diunggah — Perlu Cek"}
                    </span>
                  </>
                )}
              </p>
            )}

            <div className="proof-preview-box">
              {proofModal.url && !proofImgError ? (
                <img
                  src={proofModal.url}
                  alt={proofModal.name || "Bukti Transfer"}
                  onError={() => setProofImgError(true)}
                />
              ) : (
                <div className="empty" style={{ padding: "36px 20px" }}>
                  <div className="empty-icon">
                    <span
                      className="material-symbols-rounded"
                      style={{ fontSize: 40, color: "var(--maroon)" }}
                    >
                      broken_image
                    </span>
                  </div>
                  <h4 style={{ color: "var(--maroon-dark)", marginTop: 8 }}>
                    Gambar bukti transfer belum tersedia / gagal dimuat
                  </h4>
                  <p style={{ maxWidth: 440, margin: "8px auto 0", fontSize: "0.88rem" }}>
                    {proofModal.url
                      ? "Tautan gambar bukti pembayaran tidak dapat diakses atau berkas telah dipindahkan."
                      : proofModal.isBalanceProof
                      ? `Pelanggan mengonfirmasi pelunasan via ${proofModal.payMethod || "Metode Digital / Tunai"}. Anda dapat langsung memverifikasi pelunasan di bawah.`
                      : "Penyewa belum mengunggah gambar bukti transfer pembayaran."}
                  </p>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {proofModal.url && !proofImgError && (
                <a
                  href={proofModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                >
                  <span className="material-symbols-rounded">receipt</span>
                  <span>Buka Ukuran Penuh</span>
                </a>
              )}
              {proofModal.isBalanceProof && !proofModal.verified && (
                <>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm aoc-btn-full-action"
                    disabled={savingId === proofModal.orderId}
                    onClick={() => handleVerifyBalance(proofModal.orderId)}
                  >
                    <span className="material-symbols-rounded">check_circle</span>
                    <span>
                      {savingId === proofModal.orderId
                        ? "Memverifikasi…"
                        : "Konfirmasi & Verifikasi Pelunasan"}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm aoc-btn-full-action"
                    disabled={savingId === proofModal.orderId}
                    onClick={() =>
                      handleVerifyBalance(
                        proofModal.orderId,
                        "Tunai di Butik / Konfirmasi WA"
                      )
                    }
                    title="Tandai pesanan lunas jika pelanggan membayar tunai di butik atau konfirmasi via WhatsApp"
                  >
                    <span className="material-symbols-rounded">payments</span>
                    <span>Cek Pelunasan (Tunai di Butik / Konfirmasi WA)</span>
                  </button>
                </>
              )}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={closeProofModal}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {actionMsg && (
        <div className="toast" role="status">
          <span className="material-symbols-rounded">check_circle</span>
          <span>{actionMsg}</span>
        </div>
      )}
    </div>
  );
}
