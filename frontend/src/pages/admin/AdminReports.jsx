import { useMemo, useState } from "react";
import { useStore } from "../../context/StoreContext";
import { rupiah, todayISO } from "../../utils/format";
import {
  buildOrderReportRows,
  buildProductReportRows,
  exportToCSV,
  exportToExcel,
  exportToJSON,
  exportToPDF,
  getOrderReceivedCash,
  getOrderRemainingBalance,
  ORDER_STATUS_LABEL,
} from "../../utils/exportReport";

const ORDER_HEADERS = [
  { key: "no", label: "No" },
  { key: "id", label: "No. Order" },
  { key: "tanggalOrder", label: "Tgl Order" },
  { key: "namaPenyewa", label: "Nama Penyewa" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "tipeSewa", label: "Tipe Sewa" },
  { key: "tglAcara", label: "Tgl Acara" },
  { key: "itemBusana", label: "Item & Ukuran" },
  { key: "skemaBayar", label: "Skema & Status Pelunasan" },
  { key: "metodeBayar", label: "Metode Bayar" },
  { key: "subtotalSewa", label: "Nilai Sewa", isCurrency: true },
  { key: "depositNominal", label: "Deposit", isCurrency: true },
  { key: "grandTotal", label: "Total Tagihan", isCurrency: true },
  { key: "dibayarAwal", label: "Kas Masuk", isCurrency: true },
  { key: "sisaPelunasan", label: "Sisa Pelunasan", isCurrency: true },
  { key: "statusPesanan", label: "Status Pesanan" },
  { key: "statusDeposit", label: "Status Deposit" },
];

const DEPOSIT_HEADERS = [
  { key: "no", label: "No" },
  { key: "id", label: "No. Order" },
  { key: "namaPenyewa", label: "Nama Penyewa" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "tipeSewa", label: "Tipe Sewa" },
  { key: "tglKembali", label: "Batas Kembali" },
  { key: "jaminan", label: "Jenis Jaminan" },
  { key: "depositNominal", label: "Nominal Deposit", isCurrency: true },
  { key: "statusPesanan", label: "Status Sewa" },
  { key: "statusDeposit", label: "Status Refund Deposit" },
];

const PRODUCT_HEADERS = [
  { key: "no", label: "No" },
  { key: "id", label: "ID" },
  { key: "namaProduk", label: "Nama Koleksi" },
  { key: "kategori", label: "Kategori Utama" },
  { key: "subkategori", label: "Subkategori" },
  { key: "warna", label: "Warna" },
  { key: "ukuran", label: "Ukuran" },
  { key: "spesifikasi", label: "Spesifikasi Bawaan" },
  { key: "hargaSewa", label: "Harga Sewa / 3 Hari", isCurrency: true },
  { key: "deposit", label: "Deposit", isCurrency: true },
  { key: "labelTag", label: "Label" },
  { key: "ketersediaan", label: "Status Ketersediaan" },
];

export default function AdminReports() {
  const {
    state,
    products,
    categories,
    getCategoryLabel,
    adminUser,
    refreshOrders,
    refreshProducts,
  } = useStore();

  const [reportType, setReportType] = useState("orders"); // "orders" | "deposits" | "products"
  const [periodPreset, setPeriodPreset] = useState("all"); // "all" | "today" | "7d" | "month" | "custom"
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [rentalTypeFilter, setRentalTypeFilter] = useState("semua");
  const [catFilter, setCatFilter] = useState("semua");
  const [toastMsg, setToastMsg] = useState("");

  const notify = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3200);
  };

  const today = todayISO();

  const rawOrders = useMemo(() => {
    const arr = Array.isArray(state?.orders) ? state.orders : [];
    return arr.map((o) =>
      o?.status === "pending" && Date.now() > (o?.expiresAt || 0)
        ? { ...o, status: "expired" }
        : o
    );
  }, [state?.orders]);

  // Filter pesanan berdasarkan rentang tanggal, status, dan tipe sewa
  const filteredOrders = useMemo(() => {
    const now = new Date();
    return rawOrders.filter((o) => {
      if (statusFilter !== "semua" && o?.status !== statusFilter) return false;
      if (rentalTypeFilter !== "semua" && o?.type !== rentalTypeFilter) return false;
      if (reportType === "deposits" && o?.security !== "deposit") return false;

      if (periodPreset !== "all") {
        const createdDate = o?.createdAt
          ? new Date(o.createdAt).toISOString().slice(0, 10)
          : o?.eventDate || "";
        const targetDate = o?.eventDate || createdDate;

        if (periodPreset === "today") {
          if (createdDate !== today && targetDate !== today) return false;
        } else if (periodPreset === "7d") {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)
            .toISOString()
            .slice(0, 10);
          if (createdDate < sevenDaysAgo && targetDate < sevenDaysAgo) return false;
        } else if (periodPreset === "month") {
          const ym = today.slice(0, 7);
          if (!createdDate.startsWith(ym) && !targetDate.startsWith(ym)) return false;
        } else if (periodPreset === "custom") {
          if (dateFrom && targetDate < dateFrom && createdDate < dateFrom) return false;
          if (dateTo && targetDate > dateTo && createdDate > dateTo) return false;
        }
      }
      return true;
    });
  }, [rawOrders, statusFilter, rentalTypeFilter, reportType, periodPreset, dateFrom, dateTo, today]);

  // Filter produk untuk laporan inventaris
  const filteredProducts = useMemo(() => {
    const safe = Array.isArray(products) ? products : [];
    return safe.filter((p) => {
      if (catFilter !== "semua" && p?.cat !== catFilter) return false;
      return true;
    });
  }, [products, catFilter]);

  // Ringkasan Statistik Laporan
  const summaryStats = useMemo(() => {
    if (reportType === "products") {
      const total = filteredProducts.length;
      const available = filteredProducts.filter((p) => !p?.booked).length;
      const booked = total - available;
      const avgPrice = total
        ? Math.round(
            filteredProducts.reduce((s, p) => s + Number(p?.price || 0), 0) / total
          )
        : 0;
      return [
        { label: "Total Koleksi Busana", value: `${total} Item` },
        { label: "Siap Disewa (Tersedia)", value: `${available} Item` },
        { label: "Sedang Penuh / Disewa", value: `${booked} Item` },
        { label: "Rata-rata Harga Sewa", value: rupiah(avgPrice) },
      ];
    }

    const confirmed = filteredOrders.filter((o) =>
      ["paid", "active", "returned", "completed"].includes(o?.status)
    );
    const totalSewa = confirmed.reduce(
      (s, o) => s + Number(o?.totals?.subtotal || 0),
      0
    );
    const totalKasMasuk = confirmed.reduce(
      (s, o) => s + getOrderReceivedCash(o),
      0
    );
    const totalPiutang = confirmed.reduce(
      (s, o) => s + getOrderRemainingBalance(o),
      0
    );
    const totalDepositHeld = confirmed
      .filter((o) => o?.security === "deposit" && o?.depositStatus !== "refunded")
      .reduce((s, o) => s + Number(o?.totals?.deposit || 0), 0);

    if (reportType === "deposits") {
      const refundedCount = filteredOrders.filter(
        (o) => o?.depositStatus === "refunded"
      ).length;
      const holdingCount = filteredOrders.filter(
        (o) => o?.depositStatus !== "refunded"
      ).length;
      return [
        { label: "Total Pesanan Ber-Deposit", value: `${filteredOrders.length} Order` },
        { label: "Deposit Masih Ditahan", value: rupiah(totalDepositHeld) },
        { label: "Belum Dikembalikan", value: `${holdingCount} Order` },
        { label: "Sudah Di-Refund", value: `${refundedCount} Order` },
      ];
    }

    return [
      { label: "Total Transaksi", value: `${filteredOrders.length} Pesanan` },
      { label: "Nilai Sewa Terkonfirmasi", value: rupiah(totalSewa) },
      { label: "Total Kas Diterima", value: rupiah(totalKasMasuk) },
      { label: "Sisa Pelunasan / Piutang", value: rupiah(totalPiutang) },
    ];
  }, [reportType, filteredOrders, filteredProducts]);

  const activeHeaders =
    reportType === "products"
      ? PRODUCT_HEADERS
      : reportType === "deposits"
      ? DEPOSIT_HEADERS
      : ORDER_HEADERS;

  const activeRows = useMemo(() => {
    if (reportType === "products") {
      return buildProductReportRows(filteredProducts, getCategoryLabel);
    }
    return buildOrderReportRows(filteredOrders);
  }, [reportType, filteredProducts, filteredOrders, getCategoryLabel]);

  const reportMeta = useMemo(() => {
    const titles = {
      orders: "Laporan Transaksi & Pendapatan Sewa Kebaya",
      deposits: "Laporan Jaminan Deposit & Pengembalian Dana",
      products: "Laporan Inventaris & Katalog Busana AYDATTIRE",
    };
    const presetLabels = {
      all: "Semua Periode",
      today: `Hari Ini (${today})`,
      "7d": "7 Hari Terakhir",
      month: `Bulan Ini (${today.slice(0, 7)})`,
      custom: `Periode ${dateFrom || "..."} s/d ${dateTo || "..."}`,
    };
    return {
      title: titles[reportType] || titles.orders,
      subtitle:
        reportType === "products"
          ? `Kategori: ${catFilter === "semua" ? "Semua Kategori" : getCategoryLabel(catFilter)}`
          : `Periode: ${presetLabels[periodPreset]} · Status: ${
              statusFilter === "semua"
                ? "Semua Status"
                : ORDER_STATUS_LABEL[statusFilter] || statusFilter
            }`,
      filePrefix: `aydattire-${reportType}-${today}`,
    };
  }, [reportType, periodPreset, dateFrom, dateTo, statusFilter, catFilter, today, getCategoryLabel]);

  const handleExportPDF = () => {
    exportToPDF({
      title: reportMeta.title,
      subtitle: reportMeta.subtitle,
      summaryItems: summaryStats,
      headers: activeHeaders,
      rows: activeRows,
      adminEmail: adminUser?.email || "admin@aydattire.com",
    });
    notify("Jendela cetak PDF resmi telah dibuka.");
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: reportMeta.title,
      subtitle: reportMeta.subtitle,
      summaryItems: summaryStats,
      headers: activeHeaders,
      rows: activeRows,
      filename: `${reportMeta.filePrefix}.xls`,
    });
    notify(`File Excel (${reportMeta.filePrefix}.xls) berhasil diunduh.`);
  };

  const handleExportCSV = () => {
    exportToCSV({
      headers: activeHeaders,
      rows: activeRows,
      filename: `${reportMeta.filePrefix}.csv`,
    });
    notify(`File CSV (${reportMeta.filePrefix}.csv) berhasil diunduh.`);
  };

  const handleExportJSON = () => {
    exportToJSON({
      data: {
        title: reportMeta.title,
        subtitle: reportMeta.subtitle,
        exportedAt: new Date().toISOString(),
        summary: summaryStats,
        rows: activeRows,
      },
      filename: `${reportMeta.filePrefix}.json`,
    });
    notify(`File JSON (${reportMeta.filePrefix}.json) berhasil diunduh.`);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <span className="eyebrow">Pusat Laporan &amp; Ekspor Data</span>
          <h1>Laporan Operasional &amp; Keuangan</h1>
          <p className="muted-dark">
            Filter laporan transaksi, deposit, atau inventaris busana lalu ekspor ke PDF, Excel (.xls), CSV, atau JSON.
          </p>
        </div>
        <div className="admin-head-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              refreshOrders?.();
              refreshProducts?.();
              notify("Data laporan berhasil disinkronkan.");
            }}
          >
            <span className="material-symbols-rounded">sync</span>
            <span>Muat Ulang Data</span>
          </button>
        </div>
      </div>

      {/* Pilihan Jenis Laporan & Tombol Ekspor */}
      <div className="panel admin-report-bar">
        <div className="admin-report-tabs">
          {[
            { id: "orders", label: "Transaksi & Pendapatan", icon: "receipt_long" },
            { id: "deposits", label: "Jaminan & Refund Deposit", icon: "currency_exchange" },
            { id: "products", label: "Inventaris Katalog Kebaya", icon: "inventory_2" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`admin-report-tab ${reportType === tab.id ? "active" : ""}`}
              onClick={() => setReportType(tab.id)}
            >
              <span className="material-symbols-rounded">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="admin-export-group">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleExportPDF}
          >
            <span className="material-symbols-rounded">picture_as_pdf</span>
            <span>Export PDF</span>
          </button>
          <button
            type="button"
            className="btn btn-gold btn-sm"
            onClick={handleExportExcel}
          >
            <span className="material-symbols-rounded">table_view</span>
            <span>Export Excel (.xls)</span>
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleExportCSV}
          >
            <span className="material-symbols-rounded">download</span>
            <span>CSV</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handleExportJSON}
            title="Unduh cadangan data format JSON"
          >
            <span className="material-symbols-rounded">data_object</span>
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Filter Parameter Laporan */}
      <div className="panel admin-report-filters">
        {reportType === "products" ? (
          <div className="admin-filter-pills">
            <span className="icon-inline muted" style={{ fontSize: ".85rem" }}>
              <span className="material-symbols-rounded">filter_list</span>
              <span>Filter Kategori:</span>
            </span>
            <button
              type="button"
              className={`dep-chip ${catFilter === "semua" ? "on" : ""}`}
              onClick={() => setCatFilter("semua")}
            >
              Semua Kategori
            </button>
            {(categories || []).map((c) => (
              <button
                key={c.id}
                type="button"
                className={`dep-chip ${catFilter === c.id ? "on" : ""}`}
                onClick={() => setCatFilter(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="admin-report-filter-grid">
            <div className="form-group">
              <label>Periode Waktu</label>
              <select
                value={periodPreset}
                onChange={(e) => setPeriodPreset(e.target.value)}
              >
                <option value="all">Semua Waktu</option>
                <option value="today">Hari Ini ({today})</option>
                <option value="7d">7 Hari Terakhir</option>
                <option value="month">Bulan Ini</option>
                <option value="custom">Pilih Rentang Tanggal…</option>
              </select>
            </div>

            {periodPreset === "custom" && (
              <>
                <div className="form-group">
                  <label>Dari Tanggal</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Sampai Tanggal</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Status Pesanan</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="semua">Semua Status</option>
                {Object.entries(ORDER_STATUS_LABEL).map(([k, lbl]) => (
                  <option key={k} value={k}>
                    {lbl}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Tipe Layanan</label>
              <select
                value={rentalTypeFilter}
                onChange={(e) => setRentalTypeFilter(e.target.value)}
              >
                <option value="semua">Semua (Dalam &amp; Luar Kota)</option>
                <option value="dalam_kota">Dalam Kota (Ambil di Toko)</option>
                <option value="luar_kota">Luar Kota (Ekspedisi)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Kartu Ringkasan Eksekutif */}
      <div className="admin-stats-grid">
        {summaryStats.map((st, idx) => (
          <div key={idx} className="admin-stat-card">
            <div className="asc-top">
              <span className="asc-label">{st.label}</span>
              <span className={`asc-icon ${idx === 0 ? "maroon" : idx === 1 ? "gold" : idx === 2 ? "green" : "warn"}`}>
                <span className="material-symbols-rounded">
                  {idx === 0
                    ? "analytics"
                    : idx === 1
                    ? "payments"
                    : idx === 2
                    ? "account_balance_wallet"
                    : "Pending_actions".toLowerCase()}
                </span>
              </span>
            </div>
            <strong className="asc-value">{st.value}</strong>
            <small className="asc-sub">{reportMeta.subtitle}</small>
          </div>
        ))}
      </div>

      {/* Tabel Pratinjau Laporan */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>{reportMeta.title}</h3>
            <small className="muted">{reportMeta.subtitle} · Menampilkan {activeRows.length} baris data</small>
          </div>
          <span className="badge">{activeRows.length} Data</span>
        </div>

        {activeRows.length === 0 ? (
          <div className="empty" style={{ padding: "42px 20px" }}>
            <div className="empty-icon">
              <span className="material-symbols-rounded" style={{ fontSize: 36 }}>
                description
              </span>
            </div>
            <h4>Belum ada data untuk filter ini</h4>
            <p className="muted">Ubah filter periode atau status pesanan di atas.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {activeHeaders.map((h) => (
                    <th key={h.key} className={h.isCurrency ? "r" : ""}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeRows.map((row) => (
                  <tr key={row.id + "-" + row.no}>
                    {activeHeaders.map((h) => (
                      <td key={h.key} className={h.isCurrency ? "r" : ""}>
                        {h.isCurrency ? (
                          <strong>{rupiah(row[h.key])}</strong>
                        ) : h.key === "id" ? (
                          <span className="mono order-no">{row[h.key]}</span>
                        ) : (
                          row[h.key]
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toastMsg && (
        <div className="toast" role="status">
          <span className="material-symbols-rounded">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
