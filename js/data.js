// ===================== AYDATTIRE — Data & helper bersama =====================
// Data dummy produk (nanti diganti dari API / database)
const PRODUCTS = [
  { id: 1,  name: "Kebaya Beludru Marun",        cat: "wanita", sub: "Kebaya Modern",      img: "assets/img/hero.jpg",             price: 450000,  deposit: 300000, sizes: ["S", "M", "L"],       color: "Merah",  tema: ["Pernikahan", "Lamaran"], tag: "Terlaris" },
  { id: 2,  name: "Beskap Jawa Hitam",            cat: "pria",   sub: "Beskap Tradisional", img: "assets/img/beskap.jpg",           price: 350000,  deposit: 250000, sizes: ["M", "L", "XL"],      color: "Hitam",  tema: ["Pernikahan", "Adat"],    tag: "Baru" },
  { id: 3,  name: "Kebaya Kutubaru Sage",         cat: "wanita", sub: "Kutubaru",           img: "assets/img/kebaya-kutubaru.jpg",  price: 300000,  deposit: 200000, sizes: ["S", "M", "L", "XL"], color: "Hijau",  tema: ["Lamaran", "Adat"],       tag: "Tersedia" },
  { id: 4,  name: "Jas Navy Slim Fit",            cat: "pria",   sub: "Jas",                img: "assets/img/jas.jpg",              price: 275000,  deposit: 200000, sizes: ["M", "L", "XL"],      color: "Biru",   tema: ["Wisuda", "Pernikahan"],  tag: "Tersedia" },
  { id: 5,  name: "Kebaya Pengantin Brokat Putih",cat: "wanita", sub: "Pengantin",          img: "assets/img/kebaya-pengantin.jpg", price: 1250000, deposit: 500000, sizes: ["S", "M", "L"],       color: "Putih",  tema: ["Pernikahan"],            tag: "Premium" },
  { id: 6,  name: "Beskap Solo Velvet",           cat: "pria",   sub: "Basofi",             img: "assets/img/beskap.jpg",           price: 400000,  deposit: 300000, sizes: ["L", "XL"],           color: "Hitam",  tema: ["Adat", "Pernikahan"],    tag: "Penuh", booked: true },
  { id: 7,  name: "Kebaya Wisuda Hijau",          cat: "wanita", sub: "Wisuda",             img: "assets/img/kebaya-kutubaru.jpg",  price: 250000,  deposit: 200000, sizes: ["S", "M"],            color: "Hijau",  tema: ["Wisuda"],                tag: "Tersedia" },
  { id: 8,  name: "Jas Formal Klasik",            cat: "pria",   sub: "Jas",                img: "assets/img/jas.jpg",              price: 300000,  deposit: 200000, sizes: ["M", "L"],            color: "Biru",   tema: ["Wisuda", "Lamaran"],     tag: "Tersedia" },
  { id: 9,  name: "Kebaya Encim Bordir Marun",    cat: "wanita", sub: "Encim",              img: "assets/img/hero.jpg",             price: 325000,  deposit: 250000, sizes: ["M", "L", "XL"],      color: "Merah",  tema: ["Adat", "Lamaran"],       tag: "Tersedia" },
  { id: 10, name: "Kebaya Akad Lace Ivory",       cat: "wanita", sub: "Pengantin",          img: "assets/img/kebaya-pengantin.jpg", price: 950000,  deposit: 500000, sizes: ["S", "M"],            color: "Putih",  tema: ["Pernikahan"],            tag: "Tersedia" },
  { id: 11, name: "Beskap Landung Hitam Emas",    cat: "pria",   sub: "Beskap Tradisional", img: "assets/img/beskap.jpg",           price: 375000,  deposit: 250000, sizes: ["M", "L"],            color: "Hitam",  tema: ["Pernikahan", "Adat"],    tag: "Tersedia" },
  { id: 12, name: "Kebaya Modern Sage Brokat",    cat: "wanita", sub: "Kebaya Modern",      img: "assets/img/kebaya-kutubaru.jpg",  price: 350000,  deposit: 250000, sizes: ["S", "M", "L"],       color: "Hijau",  tema: ["Wisuda", "Lamaran"],     tag: "Tersedia" },
];

const SUBCATS = {
  wanita: ["Kebaya Modern", "Kutubaru", "Encim", "Wisuda", "Pengantin"],
  pria: ["Beskap Tradisional", "Basofi", "Jas"],
};

const rupiah = (n) => "Rp" + n.toLocaleString("id-ID");

const HEART_SVG = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.3h2C13.8 6.1 15.2 5 17.2 5c3.5 0 5.6 3.6 4.3 6.8C19.5 16.4 12 21 12 21z"/></svg>';

function productCard(p) {
  return `
    <article class="product">
      <div class="p-img">
        <img src="${p.img}" alt="${p.name}" loading="lazy" />
        <span class="p-tag ${p.booked ? "booked" : ""}">${p.tag}</span>
        <button class="p-fav" aria-label="Simpan ke favorit">${HEART_SVG}</button>
      </div>
      <div class="p-body">
        <div class="p-cat">${p.cat === "pria" ? "Pria" : "Wanita"} · ${p.sub}</div>
        <h3 class="p-name">${p.name}</h3>
        <div class="p-sizes">${p.sizes.map((s) => `<span>${s}</span>`).join("")}</div>
        <div class="p-foot">
          <div class="p-price"><strong>${rupiah(p.price)}</strong> <small>/ 3 hari</small></div>
          <div class="p-dep">Deposit<br>${rupiah(p.deposit)}</div>
        </div>
      </div>
    </article>`;
}

// Toggle favorit (berlaku di semua grid produk)
document.addEventListener("click", (e) => {
  const fav = e.target.closest(".p-fav");
  if (fav) fav.classList.toggle("on");
});
