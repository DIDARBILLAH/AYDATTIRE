import { Link } from "react-router-dom";
import { useStore } from "../../context/StoreContext";
import { RENTAL_TYPES } from "../../data/products";
import { fmtDate, rupiah, todayISO } from "../../utils/format";

const STATUS_BADGE = {
  pending: { label: "Menunggu Verifikasi", cls: "pending" },
  paid: { label: "Terkonfirmasi", cls: "paid" },
  active: { label: "Sedang Disewa", cls: "paid" },
  returned: { label: "Dikembalikan", cls: "paid" },
  completed: { label: "Selesai", cls: "paid" },
  expired: { label: "Kedaluwarsa", cls: "off" },
  cancelled: { label: "Dibatalkan", cls: "off" },
};

export default function AdminDashboard() {
  const {
    state,
    products,
    refreshOrders,
    refreshProducts,
    loadingOrders,
    loadingProducts,
  } = useStore();

  const today = todayISO();
  const safeProducts = Array.isArray(products) ? products : [];
  const rawOrders = Array.isArray(state?.orders) ? state.orders : [];

  const orders = rawOrders.map((o) =>
    o?.status === "pending" && Date.now() > (o?.expiresAt || 0)
      ? { ...o, status: "expired" }
      : o,
  );

  // 1. Total Pendapatan (dari pesanan terkonfirmasi/aktif/dikembalikan/selesai)
  const confirmedOrders = orders.filter((o) =>
    ["paid", "active", "returned", "completed"].includes(o?.status),
  );
  const totalRevenue = confirmedOrders.reduce((sum, o) => {
    const rev =
      o?.status === "completed"
        ? Number(o?.totals?.subtotal || o?.totals?.grandTotal || 0)
        : Number(o?.totals?.payNow || 0);
    return sum + rev;
  }, 0);

  // 2. Pesanan Aktif (Terkonfirmasi, Sedang Disewa, atau Dikembalikan dalam proses inspeksi)
  const activeOrdersCount = orders.filter((o) =>
    ["paid", "active", "returned"].includes(o?.status),
  ).length;

  // 3. Pesanan Menunggu Verifikasi Pembayaran (atau baru unggah bukti transfer)
  const pendingVerificationCount = orders.filter(
    (o) =>
      o?.status === "pending" ||
      (o?.status === "paid" && o?.proofUrl && !o?.verifiedByAdmin),
  ).length;

  // 4. Total Katalog Kebaya & Ketersediaan
  const totalProducts = safeProducts.length;
  const availableProducts = safeProducts.filter((p) => !p?.booked).length;

  // Jadwal Operasional Hari Ini & Deposit Tertahan
  const pickupToday = confirmedOrders.filter((o) => o?.tglAmbil === today);
  const returnToday = confirmedOrders.filter((o) => o?.tglKembali === today);
  const holdingDeposits = confirmedOrders.filter(
    (o) => o?.security === "deposit" && o?.depositStatus !== "refunded",
  );

  const recentOrders = orders.slice(0, 6);

  const handleRefreshAll = () => {
    refreshProducts?.();
    refreshOrders?.();
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">Dashboard Ringkasan</span>
          <h1>Overview Operasional</h1>
          <p className="muted-dark">
            Ringkasan pendapatan, pesanan aktif, verifikasi pembayaran, dan
            inventaris busana.
          </p>
        </div>
        <div className="admin-head-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleRefreshAll}
            disabled={loadingOrders || loadingProducts}
          >
            <span className="material-symbols-rounded">sync</span>
            <span>
              {loadingOrders || loadingProducts
                ? "Menyinkronkan…"
                : "Muat Ulang Data"}
            </span>
          </button>
          <Link to="/admin/produk" className="btn btn-primary btn-sm">
            <span className="material-symbols-rounded">add_circle</span>
            <span>Tambah Kebaya</span>
          </Link>
        </div>
      </div>

      {/* 4 Kartu Statistik Utama */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="asc-top">
            <span className="asc-label">Total Pendapatan Masuk</span>
            <span className="asc-icon gold">
              <span className="material-symbols-rounded">payments</span>
            </span>
          </div>
          <strong className="asc-value">{rupiah(totalRevenue)}</strong>
          <small className="asc-sub">
            {confirmedOrders.length} transaksi terkonfirmasi
          </small>
        </div>

        <div className="admin-stat-card">
          <div className="asc-top">
            <span className="asc-label">Pesanan Aktif (Sedang Disewa)</span>
            <span className="asc-icon maroon">
              <span className="material-symbols-rounded">shopping_bag</span>
            </span>
          </div>
          <strong className="asc-value">{activeOrdersCount}</strong>
          <small className="asc-sub">Jadwal sewa berjalan / terkunci</small>
        </div>

        <div className="admin-stat-card">
          <div className="asc-top">
            <span className="asc-label">Menunggu Verifikasi Bayar</span>
            <span className="asc-icon warn">
              <span className="material-symbols-rounded">pending_actions</span>
            </span>
          </div>
          <strong className="asc-value">{pendingVerificationCount}</strong>
          <small className="asc-sub">
            <Link to="/admin/pesanan" className="link-btn">
              Cek &amp; verifikasi pesanan →
            </Link>
          </small>
        </div>

        <div className="admin-stat-card">
          <div className="asc-top">
            <span className="asc-label">Total Katalog Kebaya</span>
            <span className="asc-icon green">
              <span className="material-symbols-rounded">inventory_2</span>
            </span>
          </div>
          <strong className="asc-value">{totalProducts}</strong>
          <small className="asc-sub">
            {availableProducts} tersedia ·{" "}
            {Math.max(0, totalProducts - availableProducts)} penuh
          </small>
        </div>
      </div>

      {/* Ringkasan Operasional Harian & Deposit */}
      <div className="admin-ops-grid">
        <div className="panel">
          <div className="panel-head">
            <h3>Jadwal Operasional &amp; Deposit</h3>
            <span className="badge">{fmtDate(today)}</span>
          </div>
          <div className="admin-ops-cards">
            <div className="ops-box">
              <div className="ops-head">
                <span className="material-symbols-rounded ops-icon">
                  local_shipping
                </span>
                <span className="ops-count">{pickupToday.length}</span>
              </div>
              <strong>Wajib Disiapkan / Ambil Hari Ini</strong>
              <small>
                {pickupToday.length
                  ? pickupToday
                      .map((o) => o?.customer?.name)
                      .filter(Boolean)
                      .join(", ")
                  : "Tidak ada jadwal ambil hari ini"}
              </small>
            </div>
            <div className="ops-box">
              <div className="ops-head">
                <span className="material-symbols-rounded ops-icon">
                  assignment_return
                </span>
                <span className="ops-count">{returnToday.length}</span>
              </div>
              <strong>Wajib Kembali Hari Ini</strong>
              <small>
                {returnToday.length
                  ? returnToday
                      .map((o) => o?.customer?.name)
                      .filter(Boolean)
                      .join(", ")
                  : "Tidak ada jadwal kembali hari ini"}
              </small>
            </div>
            <div className="ops-box warn">
              <div className="ops-head">
                <span className="material-symbols-rounded ops-icon">
                  account_balance_wallet
                </span>
                <span className="ops-count">{holdingDeposits.length}</span>
              </div>
              <strong>Deposit Aktif Belum Di-Refund</strong>
              <small>
                Total tertahan:{" "}
                {rupiah(
                  holdingDeposits.reduce(
                    (s, o) => s + Number(o?.totals?.deposit || 0),
                    0,
                  ),
                )}
              </small>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h3>Aksi Cepat Admin</h3>
          </div>
          <div className="admin-quick-links">
            <Link to="/admin/pesanan" className="qlink-card">
              <div className="qlink-left">
                <span className="asc-icon maroon">
                  <span className="material-symbols-rounded">receipt_long</span>
                </span>
                <div>
                  <strong>Kelola &amp; Verifikasi Pesanan</strong>
                  <small>
                    Lihat bukti transfer, ubah status sewa, &amp; proses refund
                    deposit
                  </small>
                </div>
              </div>
              <span className="material-symbols-rounded">arrow_forward</span>
            </Link>
            <Link to="/admin/produk" className="qlink-card">
              <div className="qlink-left">
                <span className="asc-icon gold">
                  <span className="material-symbols-rounded">checkroom</span>
                </span>
                <div>
                  <strong>Kelola Katalog Kebaya</strong>
                  <small>
                    Tambah koleksi baru, edit harga/ukuran, atau blokir stok
                  </small>
                </div>
              </div>
              <span className="material-symbols-rounded">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabel Pesanan Terbaru */}
      <div className="panel">
        <div className="panel-head">
          <h3>Pesanan Terbaru</h3>
          <Link to="/admin/pesanan" className="link-more">
            Lihat semua pesanan →
          </Link>
        </div>

        {!recentOrders.length ? (
          <div className="empty" style={{ padding: "42px 20px" }}>
            <p>Belum ada transaksi pesanan yang masuk.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>No. Order</th>
                  <th>Penyewa</th>
                  <th>Item Busana</th>
                  <th>Tgl Acara</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th className="r">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => {
                  const st = STATUS_BADGE[o?.status] || STATUS_BADGE.pending;
                  const t = RENTAL_TYPES[o?.type];
                  return (
                    <tr key={o?.id}>
                      <td>
                        <span className="mono order-no">{o?.id}</span>
                      </td>
                      <td>
                        <strong>{o?.customer?.name || "-"}</strong>
                        <small className="block-muted">
                          {o?.customer?.wa || "-"}
                        </small>
                      </td>
                      <td>
                        {(o?.items || [])
                          .map((i) => `${i?.name} (${i?.size})`)
                          .join(", ") || "-"}
                        <small className="block-muted">
                          {t?.label || "Dalam Kota"} ·{" "}
                          {o?.payment === "dp" ? "DP 50%" : "Lunas"}
                        </small>
                      </td>
                      <td>{o?.eventDate ? fmtDate(o.eventDate) : "-"}</td>
                      <td>
                        <strong>{rupiah(o?.totals?.grandTotal || 0)}</strong>
                      </td>
                      <td>
                        <span className={`status-badge ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="r">
                        <Link
                          to={`/admin/pesanan?focus=${o?.id}`}
                          className="btn btn-outline btn-sm"
                        >
                          Kelola
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
