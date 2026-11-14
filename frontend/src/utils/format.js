// ===================== Helper format & logika tanggal sewa =====================
import { RENTAL_TYPES, DP_RATE } from "../data/products";

export const rupiah = (n) => "Rp" + Math.round(n).toLocaleString("id-ID");

// ---------- Tanggal (selalu pakai waktu lokal, format YYYY-MM-DD) ----------
export const toISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
export const fromISO = (s) => new Date(s + "T00:00:00");
export const addDays = (iso, n) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const todayISO = () => toISO(new Date());

export const fmtDate = (iso, opts = { weekday: "short", day: "numeric", month: "short", year: "numeric" }) =>
  fromISO(iso).toLocaleDateString("id-ID", opts);
export const fmtDateLong = (iso) =>
  fmtDate(iso, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// ---------- Jadwal sewa otomatis (Date Range Locking) ----------
// Dalam kota: H-1 ambil, H pakai, H+1 kembali, H+2 laundry.
// Luar kota : H-2 diterima, H-1 transit/cadangan, H acara, H+1 cadangan, H+2 kirim balik, H+3 laundry.
export function buildSchedule(type, eventDate) {
  if (!eventDate) return [];
  if (type === "luar_kota") {
    return [
      { date: addDays(eventDate, -2), role: "ambil",   label: "Diterima",    note: "Paket tiba (estimasi resi)" },
      { date: addDays(eventDate, -1), role: "range",   label: "Persiapan",   note: "Coba & siapkan busana" },
      { date: eventDate,              role: "pakai",   label: "Hari Acara",  note: "Hari pemakaian" },
      { date: addDays(eventDate, 1),  role: "range",   label: "Cadangan",    note: "Kemas busana" },
      { date: addDays(eventDate, 2),  role: "kembali", label: "Kirim Balik", note: "Batas upload resi balik" },
      { date: addDays(eventDate, 3),  role: "laundry", label: "Laundry",     note: "Dry clean & inspeksi" },
    ];
  }
  return [
    { date: addDays(eventDate, -1), role: "ambil",   label: "Pengambilan",  note: "10.00 – 17.00 WIB" },
    { date: eventDate,              role: "pakai",   label: "Hari Acara",   note: "Hari pemakaian" },
    { date: addDays(eventDate, 1),  role: "kembali", label: "Pengembalian", note: "Maks. 18.00 WIB" },
    { date: addDays(eventDate, 2),  role: "laundry", label: "Laundry",      note: "Dry clean & inspeksi" },
  ];
}

// Simulasi tanggal yang sudah dibooking per produk + pengecekan jadwal nyata dari database/orders
export function isBookedDate(productId, iso, bookedMap = null) {
  if (bookedMap && bookedMap[productId]?.has(iso)) return true;
  let h = productId * 7919;
  for (const c of iso) h = (h * 31 + c.charCodeAt(0)) % 100003;
  // kira-kira 1 dari 9 hari terisi, dibuat berkelompok 2 hari
  const d = fromISO(iso);
  const block = Math.floor((d.getTime() / 86400000 + productId) / 2);
  return (block * 2654435761 + productId * 97) % 9 === 0 || h % 41 === 0;
}

// Cek apakah tanggal acara bisa dipilih untuk produk & jenis sewa tertentu
export function checkEventDate(productIds, type, eventDate, bookedMap = null) {
  const sched = buildSchedule(type, eventDate);
  const first = sched[0].date;
  const minStart = addDays(todayISO(), type === "luar_kota" ? 3 : 1);
  if (first < minStart) return { ok: false, reason: "past" };
  if (type === "dalam_kota" && fromISO(first).getDay() === 0) return { ok: false, reason: "sunday" };
  const conflict = sched.some((s) => productIds.some((pid) => isBookedDate(pid, s.date, bookedMap)));
  if (conflict) return { ok: false, reason: "booked" };
  return { ok: true };
}

// ---------- Harga ----------
export function itemRentalPrice(product, type) {
  const t = RENTAL_TYPES[type];
  return Math.round((product.price * t.multiplier) / 1000) * 1000;
}

export function calcTotals({ items, type, security, payment }) {
  const rental = items.reduce((s, it) => s + itemRentalPrice(it.product, type), 0);
  const shipping = RENTAL_TYPES[type].shipping;
  const deposit = security === "deposit" ? items.reduce((s, it) => s + it.product.deposit, 0) : 0;
  const subtotal = rental + shipping;
  const payNow = payment === "dp" ? Math.round(subtotal * DP_RATE) : subtotal + deposit;
  const payLater = payment === "dp" ? subtotal - payNow + deposit : 0;
  return { rental, shipping, deposit, subtotal, grandTotal: subtotal + deposit, payNow, payLater };
}

export const genCode = (prefix, len = 6) =>
  prefix + "-" + Math.random().toString(36).slice(2, 2 + len).toUpperCase().padEnd(len, "0");
