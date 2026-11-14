// ===================== AYDATTIRE — Layout bersama (header & footer) =====================
// Setiap halaman cukup menaruh <div id="site-header"></div> dan <div id="site-footer"></div>
// serta <body data-page="beranda|katalog|cara-sewa|kontak">.

const NAV = [
  { key: "beranda",   label: "Beranda",   href: "index.html" },
  { key: "katalog",   label: "Katalog",   href: "katalog.html" },
  { key: "fitting",   label: "Fitting",   href: "fitting.html" },
  { key: "cara-sewa", label: "Cara Sewa", href: "cara-sewa.html" },
  { key: "kontak",    label: "Kontak",    href: "kontak.html" },
];

(function renderLayout() {
  const page = document.body.dataset.page;

  const header = document.getElementById("site-header");
  if (header) {
    header.outerHTML = `
    <header class="navbar" id="navbar">
      <div class="container nav-inner">
        <a href="index.html" class="logo">AYDAT<span>TIRE</span></a>
        <nav class="nav-links" id="navLinks">
          ${NAV.map((n) => `<a href="${n.href}" data-key="${n.key}" class="${n.key === page ? "active" : ""}">${n.label}</a>`).join("")}
        </nav>
        <div class="nav-actions">
          <a href="katalog.html" class="icon-btn" aria-label="Cari">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          </a>
          <button class="icon-btn" aria-label="Favorit">
            <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.3 5 6.8 5c2 0 3.4 1.1 4.2 2.3h2C13.8 6.1 15.2 5 17.2 5c3.5 0 5.6 3.6 4.3 6.8C19.5 16.4 12 21 12 21z"/></svg>
          </button>
          <a href="#" class="btn btn-primary btn-sm">Masuk</a>
          <button class="icon-btn menu-toggle" id="menuToggle" aria-label="Menu">
            <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          </button>
        </div>
      </div>
    </header>`;
  }

  const footer = document.getElementById("site-footer");
  if (footer) {
    footer.outerHTML = `
    <footer class="footer">
      <div class="container footer-grid">
        <div>
          <a href="index.html" class="logo light">AYDAT<span>TIRE</span></a>
          <p class="muted">Penyewaan kebaya, beskap, basofi, dan jas untuk setiap momen spesial Anda.</p>
        </div>
        <div>
          <h5>Katalog</h5>
          <a href="katalog.html?kategori=wanita">Kebaya Wanita</a>
          <a href="katalog.html?kategori=pria">Beskap &amp; Jas Pria</a>
          <a href="katalog.html">Semua Koleksi</a>
        </div>
        <div>
          <h5>Layanan</h5>
          <a href="fitting.html">Booking Fitting</a>
          <a href="cara-sewa.html">Cara Sewa</a>
          <a href="cara-sewa.html#jaminan">Kebijakan Deposit</a>
        </div>
        <div>
          <h5>Kontak</h5>
          <p class="muted">Senin – Sabtu · 10.00 – 18.00 WIB</p>
          <p class="muted">WhatsApp: 0812-0000-0000</p>
          <p class="muted">Instagram: @aydattire</p>
        </div>
      </div>
      <div class="container footer-bottom">
        <small>© 2026 AYDATTIRE. Semua hak dilindungi.</small>
      </div>
    </footer>
    <a href="https://wa.me/6281200000000" target="_blank" rel="noopener" class="wa-float" aria-label="Chat WhatsApp">
      <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.2-.7-2.7-1.1-4.4-3.8-4.5-4-.1-.2-1.1-1.4-1.1-2.7 0-1.3.7-1.9.9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.6-.1 1.2z"/></svg>
    </a>`;
  }

  // Navbar behaviour
  const navbar = document.getElementById("navbar");
  const navLinks = document.getElementById("navLinks");
  if (!navbar) return;

  window.addEventListener("scroll", () => navbar.classList.toggle("scrolled", window.scrollY > 10));
  document.getElementById("menuToggle").addEventListener("click", () => navLinks.classList.toggle("open"));
  navLinks.addEventListener("click", (e) => { if (e.target.tagName === "A") navLinks.classList.remove("open"); });

})();

// ===================== Animasi hitung angka =====================
// Pakai: <strong data-count="2000" data-suffix="+" data-decimals="0">0</strong>
// Angka dianimasikan dari 0 ke nilai target saat elemen terlihat di layar.
(function countUp() {
  const els = document.querySelectorAll("[data-count]");
  if (!els.length) return;

  const format = (n, dec) => n.toLocaleString("id-ID", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function animate(el) {
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || "0", 10);
    const suffix = el.dataset.suffix || "";
    const prefix = el.dataset.prefix || "";
    const duration = parseInt(el.dataset.duration || "1800", 10);

    if (reduceMotion) { el.textContent = prefix + format(target, dec) + suffix; return; }

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      el.textContent = prefix + format(target * easeOut(t), dec) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { animate(en.target); io.unobserve(en.target); }
    });
  }, { threshold: 0.4 });

  els.forEach((el) => io.observe(el));
})();
