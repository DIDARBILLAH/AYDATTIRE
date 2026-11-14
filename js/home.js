// ===================== AYDATTIRE — Beranda =====================

// Koleksi populer (4 item saja)
document.getElementById("popularGrid").innerHTML = PRODUCTS.filter((p) => !p.booked).slice(0, 4).map(productCard).join("");

// Testimoni pelanggan (data dummy, nanti dari database ulasan)
const REVIEWS = [
  { name: "Rina Ayu",      event: "Pernikahan · Dalam Kota", product: "Kebaya Pengantin Brokat Putih", rating: 5, text: "Kebaya pengantinnya cantik banget dan bersih. Jadwal ambil & kembali jelas, nggak perlu chat bolak-balik." },
  { name: "Dimas Pratama", event: "Lamaran · Luar Kota",     product: "Beskap Jawa Hitam",             rating: 5, text: "Sewa beskap dari luar kota, paket datang tepat waktu. Deposit balik keesokan harinya. Recommended!" },
  { name: "Salsabila",     event: "Wisuda · Dalam Kota",     product: "Kebaya Wisuda Hijau",           rating: 5, text: "Fitting-nya nyaman karena sesi dibatasi. Stafnya bantu pilih ukuran yang pas untuk wisuda." },
  { name: "Putri Larasati",event: "Lamaran · Dalam Kota",    product: "Kebaya Kutubaru Sage",          rating: 5, text: "Warnanya lembut, bahannya adem. Banyak yang tanya beli di mana, padahal sewa di AYDATTIRE." },
  { name: "Arif Nugroho",  event: "Wisuda · Dalam Kota",     product: "Jas Navy Slim Fit",             rating: 4, text: "Jasnya pas di badan dan wangi. Proses DP lalu pelunasan saat ambil juga praktis." },
  { name: "Maya & Bima",   event: "Pernikahan · Luar Kota",  product: "Kebaya Beludru Marun",          rating: 5, text: "Sewa couple untuk resepsi. Packing rapi, ada panduan pengembalian. Puas banget!" },
];

const stars = (n) => "★".repeat(n) + '<span class="off">' + "★".repeat(5 - n) + "</span>";

document.getElementById("reviewGrid").innerHTML = REVIEWS.map((r) => `
  <figure class="testi">
    <div class="stars">${stars(r.rating)}</div>
    <blockquote>“${r.text}”</blockquote>
    <div class="testi-product">Menyewa: <strong>${r.product}</strong></div>
    <figcaption>
      <span class="avatar">${r.name[0]}</span>
      <div><strong>${r.name}</strong><small>${r.event}</small></div>
    </figcaption>
  </figure>`).join("");
