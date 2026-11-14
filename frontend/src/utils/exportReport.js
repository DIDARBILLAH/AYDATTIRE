import { RENTAL_TYPES } from "../data/products";
import { fmtDate, rupiah } from "./format";

export const ORDER_STATUS_LABEL = {
  pending: "Menunggu Pembayaran",
  paid: "Terkonfirmasi",
  active: "Sedang Disewa",
  returned: "Dikembalikan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

export const DEPOSIT_STATUS_LABEL = {
  holding: "Ditahan Butik",
  inspecting: "Inspeksi Barang",
  refunded: "Sudah Dikembalikan",
  penalized: "Dipotong Denda",
};

function escapeHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeCsvCell(val) {
  const str = String(val ?? "").replace(/\r?\n/g, " ");
  if (/[",;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Menghitung sub-status pembayaran khusus skema DP maupun Lunas
 */
export function getPaymentSubStatus(order) {
  if (!order) return { label: "-", cls: "info" };
  if (order.payment !== "dp") {
    if (["paid", "active", "returned", "completed"].includes(order.status)) {
      return { label: "Lunas 100%", cls: "ok" };
    }
    if (order.status === "pending") {
      return { label: "Menunggu Verifikasi Bayar", cls: "warn" };
    }
    return { label: ORDER_STATUS_LABEL[order.status] || "-", cls: "off" };
  }

  // Skema DP (payment === 'dp')
  if (order.balanceVerified === true) {
    return { label: "Lunas 100%", cls: "ok" };
  }
  if ((order.balanceProofUrl || order.balancePaidAt) && !order.balanceVerified) {
    return { label: "Pelunasan Diunggah — Perlu Cek", cls: "warn" };
  }
  if (order.status === "pending") {
    return { label: "DP Menunggu Verifikasi", cls: "warn" };
  }
  if (["paid", "active", "returned", "completed"].includes(order.status)) {
    return { label: "DP Terverifikasi — Menunggu Pelunasan", cls: "info" };
  }
  return { label: ORDER_STATUS_LABEL[order.status] || "-", cls: "off" };
}

/**
 * Menghitung total kas yang sudah diterima dari pesanan terkonfirmasi
 * (Termasuk totals.payLater jika pesanan DP sudah balanceVerified === true)
 */
export function getOrderReceivedCash(order) {
  if (!order) return 0;
  const isConfirmed = ["paid", "active", "returned", "completed"].includes(order.status);
  if (!isConfirmed) return 0;

  const payNow = Number(order?.totals?.payNow || 0);
  const payLater = Number(order?.totals?.payLater || 0);

  if (order.status === "completed") {
    return Number(order?.totals?.grandTotal || payNow + payLater);
  }
  if (order.payment === "dp" && order.balanceVerified === true) {
    return payNow + payLater;
  }
  return payNow;
}

/**
 * Menghitung sisa pelunasan yang masih harus dibayar oleh penyewa
 */
export function getOrderRemainingBalance(order) {
  if (!order) return 0;
  if (order.payment === "dp" && order.balanceVerified === true) return 0;
  if (order.status === "completed") return 0;
  return Number(order?.totals?.payLater || 0);
}

/**
 * Mengubah daftar pesanan menjadi baris laporan standar
 */
export function buildOrderReportRows(orders = []) {
  return orders.map((o, idx) => {
    const t = RENTAL_TYPES[o?.type] || { label: "Dalam Kota", days: 3 };
    const itemsText = (o?.items || [])
      .map((i) => {
        const permak = i?.customSize?.isCustom
          ? ` [Permak LD:${i.customSize.ld}, P:${i.customSize.panjang}, LP:${i.customSize.pinggang}]`
          : "";
        return `${i?.name || "Item"} (${i?.size || "-"})${permak}`;
      })
      .join("; ");

    const subPay = getPaymentSubStatus(o);
    const kasMasuk = ["paid", "active", "returned", "completed"].includes(o?.status)
      ? getOrderReceivedCash(o)
      : Number(o?.totals?.payNow || 0);
    const sisaTagihan = getOrderRemainingBalance(o);

    return {
      no: idx + 1,
      id: o?.id || "-",
      tanggalOrder: o?.createdAt
        ? new Date(o.createdAt).toLocaleDateString("id-ID")
        : "-",
      namaPenyewa: o?.customer?.name || "-",
      whatsapp: o?.customer?.wa || "-",
      email: o?.customer?.email || "-",
      tipeSewa: `${t.label} (${t.days} Hari)`,
      tglAmbil: o?.tglAmbil ? fmtDate(o.tglAmbil) : "-",
      tglAcara: o?.eventDate ? fmtDate(o.eventDate) : "-",
      tglKembali: o?.tglKembali ? fmtDate(o.tglKembali) : "-",
      itemBusana: itemsText || "-",
      skemaBayar:
        o?.payment === "dp"
          ? `DP 50% (${subPay.label})`
          : `Bayar Lunas (${subPay.label})`,
      statusPelunasan: subPay.label,
      metodeBayar:
        o?.payment === "dp" && o?.balancePayMethod
          ? `${o.payMethod || "DP"} | Pelunasan: ${o.balancePayMethod}`
          : o?.payMethod || "Belum dipilih",
      jaminan:
        o?.security === "deposit"
          ? `Deposit (${rupiah(o?.totals?.deposit || 0)})`
          : "KTP Fisik",
      subtotalSewa: Number(o?.totals?.subtotal || 0),
      depositNominal: Number(o?.totals?.deposit || 0),
      ongkir: Number(o?.totals?.shipping || 0),
      grandTotal: Number(o?.totals?.grandTotal || 0),
      dibayarAwal: kasMasuk,
      sisaPelunasan: sisaTagihan,
      statusPesanan: ORDER_STATUS_LABEL[o?.status] || o?.status || "-",
      statusDeposit:
        o?.security === "deposit"
          ? DEPOSIT_STATUS_LABEL[o?.depositStatus || "holding"] || "Ditahan Butik"
          : "Jaminan KTP",
    };
  });
}

/**
 * Mengubah daftar produk menjadi baris laporan inventaris katalog
 */
export function buildProductReportRows(products = [], getCategoryLabel) {
  return products.map((p, idx) => ({
    no: idx + 1,
    id: p?.id || idx + 1,
    namaProduk: p?.name || "-",
    kategori: getCategoryLabel ? getCategoryLabel(p?.cat) : p?.cat || "-",
    subkategori: p?.sub || "-",
    warna: p?.color || "-",
    ukuran: Array.isArray(p?.sizes) ? p.sizes.join(", ") : "-",
    spesifikasi: `LD ${p?.ukuran?.LD || "-"} | P ${p?.ukuran?.Panjang || "-"} | LP ${p?.ukuran?.Pinggang || "-"}`,
    hargaSewa: Number(p?.price || 0),
    deposit: Number(p?.deposit || 0),
    labelTag: p?.tag || "Tersedia",
    ketersediaan: p?.booked ? "Sedang Penuh / Disewa" : "Tersedia",
  }));
}

/**
 * 1. Export ke CSV (.csv) dengan UTF-8 BOM agar rapi di Excel & Google Sheets
 */
export function exportToCSV({ headers, rows, filename = "laporan-aydattire.csv" }) {
  const headerLine = headers.map((h) => escapeCsvCell(h.label)).join(",");
  const bodyLines = rows.map((row) =>
    headers.map((h) => escapeCsvCell(row[h.key])).join(",")
  );
  const csvContent = "\uFEFF" + [headerLine, ...bodyLines].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

/**
 * 2. Export ke Excel (.xls) dengan format HTML Table Spreadsheet & Ringkasan
 */
export function exportToExcel({
  title = "Laporan Operasional AYDATTIRE",
  subtitle = "",
  summaryItems = [],
  headers = [],
  rows = [],
  filename = "laporan-aydattire.xls",
}) {
  const nowStr = new Date().toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const summaryHtml = summaryItems.length
    ? `
      <table border="1" cellspacing="0" cellpadding="6" style="margin-bottom:16px; border-collapse:collapse; font-family:Arial,sans-serif; font-size:11pt;">
        <tr style="background:#f5ebe6; font-weight:bold; color:#4a121b;">
          ${summaryItems.map((s) => `<th>${escapeHtml(s.label)}</th>`).join("")}
        </tr>
        <tr>
          ${summaryItems
            .map(
              (s) =>
                `<td style="text-align:center; font-weight:bold;">${escapeHtml(s.value)}</td>`
            )
            .join("")}
        </tr>
      </table>
    `
    : "";

  const tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Laporan AYDATTIRE</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
    </head>
    <body style="font-family:Arial,sans-serif; font-size:10.5pt; color:#1f1617;">
      <h2 style="margin:0 0 4px; color:#4a121b;">AYDATTIRE — Butik Sewa Kebaya, Beskap &amp; Jas</h2>
      <h3 style="margin:0 0 4px; color:#6b1e2b;">${escapeHtml(title)}</h3>
      <p style="margin:0 0 12px; color:#6e625f; font-size:9.5pt;">
        ${escapeHtml(subtitle)} | Dicetak pada: ${escapeHtml(nowStr)}
      </p>
      ${summaryHtml}
      <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse; width:100%;">
        <thead>
          <tr style="background-color:#4a121b; color:#ffffff; font-weight:bold;">
            ${headers.map((h) => `<th>${escapeHtml(h.label)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row, i) => `
            <tr style="background-color:${i % 2 === 0 ? "#ffffff" : "#faf6f0"};">
              ${headers
                .map((h) => {
                  const raw = row[h.key];
                  const val = h.isCurrency ? rupiah(raw) : raw;
                  const align = h.isCurrency || h.align === "right" ? "right" : h.align || "left";
                  return `<td style="text-align:${align}; vertical-align:top;">${escapeHtml(val)}</td>`;
                })
                .join("")}
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(["\uFEFF", tableHtml], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  triggerDownload(blob, filename.endsWith(".xls") ? filename : `${filename}.xls`);
}

/**
 * 3. Export ke JSON (.json) untuk arsip/backup data
 */
export function exportToJSON({ data, filename = "laporan-aydattire.json" }) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".json") ? filename : `${filename}.json`);
}

/**
 * 4. Export / Cetak ke PDF (membuka jendela cetak kop surat resmi AYDATTIRE)
 */
export function exportToPDF({
  title = "Laporan Operasional & Keuangan",
  subtitle = "Semua Periode",
  summaryItems = [],
  headers = [],
  rows = [],
  adminEmail = "admin@aydattire.com",
}) {
  const nowStr = new Date().toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHtml(title)} — AYDATTIRE</title>
      <style>
        @page { size: A4 landscape; margin: 14mm; }
        * { box-sizing: border-box; }
        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1f1617;
          margin: 0;
          padding: 20px;
          background: #fff;
          font-size: 11px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #4a121b;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .brand {
          font-family: Georgia, serif;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 2px;
          color: #4a121b;
          margin: 0;
        }
        .brand span { color: #c89b5a; }
        .brand-sub {
          font-size: 10px;
          color: #6e625f;
          margin-top: 3px;
        }
        .report-meta {
          text-align: right;
        }
        .report-meta h2 {
          margin: 0 0 4px;
          font-size: 16px;
          color: #4a121b;
        }
        .report-meta p {
          margin: 0;
          font-size: 10px;
          color: #6e625f;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(${Math.min(summaryItems.length || 4, 4)}, 1fr);
          gap: 10px;
          margin-bottom: 16px;
        }
        .sum-card {
          border: 1px solid #e4dad1;
          background: #faf6f0;
          border-radius: 8px;
          padding: 10px 12px;
        }
        .sum-card span {
          display: block;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #6e625f;
          margin-bottom: 4px;
        }
        .sum-card strong {
          font-size: 15px;
          color: #4a121b;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 22px;
          font-size: 10px;
        }
        th, td {
          border: 1px solid #dfd5cc;
          padding: 6px 8px;
          text-align: left;
          vertical-align: top;
        }
        th {
          background: #4a121b;
          color: #fff;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 0.05em;
        }
        tr:nth-child(even) td {
          background: #fcfaf7;
        }
        .r { text-align: right; }
        .footer-sign {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 24px;
          page-break-inside: avoid;
        }
        .sign-box {
          text-align: center;
          min-width: 180px;
        }
        .sign-line {
          margin-top: 48px;
          border-top: 1px solid #4a121b;
          padding-top: 4px;
          font-weight: 600;
        }
        .no-print-bar {
          background: #4a121b;
          color: #fff;
          padding: 10px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .no-print-bar button {
          background: #c89b5a;
          color: #2b0b10;
          border: none;
          padding: 7px 14px;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
        }
        @media print {
          .no-print-bar { display: none !important; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <span>Pratinjau Dokumen PDF Resmi AYDATTIRE — Pilih <b>"Save as PDF" / "Simpan sebagai PDF"</b> pada dialog cetak.</span>
        <button onclick="window.print()">Cetak / Simpan PDF</button>
      </div>
      <div class="header">
        <div>
          <h1 class="brand">AYDAT<span>TIRE</span></h1>
          <div class="brand-sub">Butik Penyewaan Kebaya, Beskap, Basofi &amp; Jas Resmi · Laporan Back-Office</div>
        </div>
        <div class="report-meta">
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(subtitle)}</p>
          <p>Dicetak: ${escapeHtml(nowStr)}</p>
        </div>
      </div>

      ${
        summaryItems.length
          ? `<div class="summary-grid">
              ${summaryItems
                .map(
                  (s) => `
                <div class="sum-card">
                  <span>${escapeHtml(s.label)}</span>
                  <strong>${escapeHtml(s.value)}</strong>
                </div>
              `
                )
                .join("")}
            </div>`
          : ""
      }

      <table>
        <thead>
          <tr>
            ${headers
              .map(
                (h) =>
                  `<th class="${h.isCurrency || h.align === "right" ? "r" : ""}">${escapeHtml(
                    h.label
                  )}</th>`
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${
            rows.length === 0
              ? `<tr><td colspan="${headers.length}" style="text-align:center; padding:20px;">Tidak ada data pada periode ini.</td></tr>`
              : rows
                  .map(
                    (row) => `
              <tr>
                ${headers
                  .map((h) => {
                    const raw = row[h.key];
                    const val = h.isCurrency ? rupiah(raw) : raw;
                    const cls = h.isCurrency || h.align === "right" ? "r" : "";
                    return `<td class="${cls}">${escapeHtml(val)}</td>`;
                  })
                  .join("")}
              </tr>
            `
                  )
                  .join("")
          }
        </tbody>
      </table>

      <div class="footer-sign">
        <div style="font-size:9.5px; color:#6e625f;">
          Dokumen ini dihasilkan otomatis oleh Sistem Manajemen Butik AYDATTIRE.<br/>
          Total Baris Data: <b>${rows.length}</b>
        </div>
        <div class="sign-box">
          <div>Mengetahui, Admin Operasional</div>
          <div class="sign-line">${escapeHtml(adminEmail || "Admin AYDATTIRE")}</div>
        </div>
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 250);
        };
      </script>
    </body>
    </html>
  `;

  const win = window.open("", "_blank", "width=1120,height=800");
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  }
}
