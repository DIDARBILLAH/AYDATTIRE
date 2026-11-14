// ===================== AYDATTIRE — Data dummy =====================
// Semua data masih statis (belum terhubung database / API).

export const PRODUCTS = [
  { id: 1,  name: "Kebaya Beludru Marun",         cat: "wanita", sub: "Kebaya Modern",      img: "/assets/img/hero.jpg",             price: 450000,  deposit: 300000, sizes: ["S", "M", "L"],       color: "Merah", tema: ["Pernikahan", "Lamaran"], tag: "Terlaris", bahan: "Beludru premium, bordir benang emas", ukuran: { LD: "88–96 cm", Panjang: "62 cm", Pinggang: "70–78 cm" } },
  { id: 2,  name: "Beskap Jawa Hitam",            cat: "pria",   sub: "Beskap Tradisional", img: "/assets/img/beskap.jpg",           price: 350000,  deposit: 250000, sizes: ["M", "L", "XL"],      color: "Hitam", tema: ["Pernikahan", "Adat"],    tag: "Baru",     bahan: "Wol campuran, kancing kuningan", ukuran: { LD: "96–110 cm", Panjang: "70 cm", Pinggang: "84–96 cm" }, aksesori: ["Blangkon", "Jarik", "Bros"] },
  { id: 3,  name: "Kebaya Kutubaru Sage",         cat: "wanita", sub: "Kutubaru",           img: "/assets/img/kebaya-kutubaru.jpg",  price: 300000,  deposit: 200000, sizes: ["S", "M", "L", "XL"], color: "Hijau", tema: ["Lamaran", "Adat"],       tag: "Tersedia", bahan: "Katun brokat, furing satin", ukuran: { LD: "86–100 cm", Panjang: "60 cm", Pinggang: "68–82 cm" } },
  { id: 4,  name: "Jas Navy Slim Fit",            cat: "pria",   sub: "Jas",                img: "/assets/img/jas.jpg",              price: 275000,  deposit: 200000, sizes: ["M", "L", "XL"],      color: "Biru",  tema: ["Wisuda", "Pernikahan"],  tag: "Tersedia", bahan: "Wool blend, slim fit", ukuran: { LD: "96–108 cm", Panjang: "72 cm", Pinggang: "82–94 cm" }, aksesori: ["Dasi", "Manset"] },
  { id: 5,  name: "Kebaya Pengantin Brokat Putih",cat: "wanita", sub: "Pengantin",          img: "/assets/img/kebaya-pengantin.jpg", price: 1250000, deposit: 500000, sizes: ["S", "M", "L"],       color: "Putih", tema: ["Pernikahan"],            tag: "Premium",  bahan: "Brokat Prancis, payet & mutiara", ukuran: { LD: "84–94 cm", Panjang: "Ekor 120 cm", Pinggang: "66–76 cm" }, aksesori: ["Veil", "Bros"] },
  { id: 6,  name: "Beskap Solo Velvet",           cat: "pria",   sub: "Basofi",             img: "/assets/img/beskap.jpg",           price: 400000,  deposit: 300000, sizes: ["L", "XL"],           color: "Hitam", tema: ["Adat", "Pernikahan"],    tag: "Penuh", booked: true, bahan: "Velvet, bordir emas", ukuran: { LD: "100–112 cm", Panjang: "72 cm", Pinggang: "88–100 cm" } },
  { id: 7,  name: "Kebaya Wisuda Hijau",          cat: "wanita", sub: "Wisuda",             img: "/assets/img/kebaya-kutubaru.jpg",  price: 250000,  deposit: 200000, sizes: ["S", "M"],            color: "Hijau", tema: ["Wisuda"],                tag: "Tersedia", bahan: "Brokat lembut, furing katun", ukuran: { LD: "84–92 cm", Panjang: "58 cm", Pinggang: "66–74 cm" } },
  { id: 8,  name: "Jas Formal Klasik",            cat: "pria",   sub: "Jas",                img: "/assets/img/jas.jpg",              price: 300000,  deposit: 200000, sizes: ["M", "L"],            color: "Biru",  tema: ["Wisuda", "Lamaran"],     tag: "Tersedia", bahan: "Wool, regular fit", ukuran: { LD: "98–106 cm", Panjang: "74 cm", Pinggang: "84–92 cm" } },
  { id: 9,  name: "Kebaya Encim Bordir Marun",    cat: "wanita", sub: "Encim",              img: "/assets/img/hero.jpg",             price: 325000,  deposit: 250000, sizes: ["M", "L", "XL"],      color: "Merah", tema: ["Adat", "Lamaran"],       tag: "Tersedia", bahan: "Voile, bordir tangan", ukuran: { LD: "90–104 cm", Panjang: "64 cm", Pinggang: "72–86 cm" } },
  { id: 10, name: "Kebaya Akad Lace Ivory",       cat: "wanita", sub: "Pengantin",          img: "/assets/img/kebaya-pengantin.jpg", price: 950000,  deposit: 500000, sizes: ["S", "M"],            color: "Putih", tema: ["Pernikahan"],            tag: "Tersedia", bahan: "Lace ivory, payet halus", ukuran: { LD: "84–92 cm", Panjang: "Ekor 90 cm", Pinggang: "66–74 cm" } },
  { id: 11, name: "Beskap Landung Hitam Emas",    cat: "pria",   sub: "Beskap Tradisional", img: "/assets/img/beskap.jpg",           price: 375000,  deposit: 250000, sizes: ["M", "L"],            color: "Hitam", tema: ["Pernikahan", "Adat"],    tag: "Tersedia", bahan: "Drill premium, list emas", ukuran: { LD: "96–106 cm", Panjang: "90 cm", Pinggang: "84–94 cm" } },
  { id: 12, name: "Kebaya Modern Sage Brokat",    cat: "wanita", sub: "Kebaya Modern",      img: "/assets/img/kebaya-kutubaru.jpg",  price: 350000,  deposit: 250000, sizes: ["S", "M", "L"],       color: "Hijau", tema: ["Wisuda", "Lamaran"],     tag: "Tersedia", bahan: "Brokat, kerah sabrina", ukuran: { LD: "84–96 cm", Panjang: "60 cm", Pinggang: "66–78 cm" } },
];

export const SUBCATS = {
  wanita: ["Kebaya Modern", "Kutubaru", "Encim", "Wisuda", "Pengantin"],
  pria: ["Beskap Tradisional", "Basofi", "Jas"],
};

export const REVIEWS = [
  { name: "Rina Ayu",       event: "Pernikahan · Dalam Kota", product: "Kebaya Pengantin Brokat Putih", rating: 5, text: "Kebaya pengantinnya cantik banget dan bersih. Jadwal ambil & kembali jelas, nggak perlu chat bolak-balik." },
  { name: "Dimas Pratama",  event: "Lamaran · Luar Kota",     product: "Beskap Jawa Hitam",             rating: 5, text: "Sewa beskap dari luar kota, paket datang tepat waktu. Deposit balik keesokan harinya. Recommended!" },
  { name: "Salsabila",      event: "Wisuda · Dalam Kota",     product: "Kebaya Wisuda Hijau",           rating: 5, text: "Fitting-nya nyaman karena sesi dibatasi. Stafnya bantu pilih ukuran yang pas untuk wisuda." },
  { name: "Putri Larasati", event: "Lamaran · Dalam Kota",    product: "Kebaya Kutubaru Sage",          rating: 5, text: "Warnanya lembut, bahannya adem. Banyak yang tanya beli di mana, padahal sewa di AYDATTIRE." },
  { name: "Arif Nugroho",   event: "Wisuda · Dalam Kota",     product: "Jas Navy Slim Fit",             rating: 4, text: "Jasnya pas di badan dan wangi. Proses DP lalu pelunasan saat ambil juga praktis." },
  { name: "Maya & Bima",    event: "Pernikahan · Luar Kota",  product: "Kebaya Beludru Marun",          rating: 5, text: "Sewa couple untuk resepsi. Packing rapi, ada panduan pengembalian. Puas banget!" },
];

export const FITTING_SESSIONS = [
  { id: 1, label: "Sesi 1", time: "10:00 – 12:00" },
  { id: 2, label: "Sesi 2", time: "13:00 – 15:00" },
  { id: 3, label: "Sesi 3", time: "15:30 – 17:30" },
];

// ---------- Aturan sewa (sesuai PRD) ----------
export const RENTAL_TYPES = {
  dalam_kota: { key: "dalam_kota", label: "Dalam Kota", short: "Ambil di Toko", days: 3, multiplier: 1,   shipping: 0 },
  luar_kota:  { key: "luar_kota",  label: "Luar Kota",  short: "Kirim Ekspedisi", days: 5, multiplier: 1.5, shipping: 60000 },
};

export const DP_RATE = 0.5;
export const PAYMENT_HOLD_MINUTES = 30;

export const BANKS = [
  { code: "BCA",     name: "BCA",          account: "123 456 7890",   holder: "AYDATTIRE" },
  { code: "BNI",     name: "BNI",          account: "0987 654 321",   holder: "AYDATTIRE" },
  { code: "MANDIRI", name: "Mandiri",      account: "1400 0123 4567", holder: "AYDATTIRE" },
  { code: "BRI",     name: "BRI",          account: "0021 0100 1234 567", holder: "AYDATTIRE" },
];

export const getProduct = (id) => PRODUCTS.find((p) => p.id === Number(id));

export const defaultCustomSize = (product) => ({
  isCustom: false,
  ld: product?.ukuran?.LD || "",
  panjang: product?.ukuran?.Panjang || "",
  pinggang: product?.ukuran?.Pinggang || "",
  note: "",
});

