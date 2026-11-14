import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { BagIcon, MenuIcon, SearchIcon, WaIcon } from "./Icons";

const NAV = [
  { to: "/", label: "Beranda", end: true },
  { to: "/katalog", label: "Katalog" },
  { to: "/fitting", label: "Fitting" },
  { to: "/cara-sewa", label: "Cara Sewa" },
  { to: "/kontak", label: "Kontak" },
];

function Header() {
  const { cartCount, state } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
      <div className="container nav-inner">
        <Link to="/" className="logo">AYDAT<span>TIRE</span></Link>
        <nav className={`nav-links ${open ? "open" : ""}`}>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? "active" : "")}>
              {n.label}
            </NavLink>
          ))}
          <NavLink to="/pesanan" className={({ isActive }) => `nav-orders ${isActive ? "active" : ""}`}>
            Pesanan Saya{state.orders.length > 0 && <em className="nav-pill">{state.orders.length}</em>}
          </NavLink>
        </nav>
        <div className="nav-actions">
          <Link to="/katalog" className="icon-btn hide-sm" aria-label="Cari"><SearchIcon /></Link>
          <Link to="/keranjang" className="icon-btn cart-btn" aria-label={`Keranjang (${cartCount})`}>
            <BagIcon />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
          <Link to="/pesanan" className="btn btn-primary btn-sm hide-sm">Pesanan Saya</Link>
          <button className="icon-btn menu-toggle" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <MenuIcon />
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <>
      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <Link to="/" className="logo light">AYDAT<span>TIRE</span></Link>
            <p className="muted">Penyewaan kebaya, beskap, basofi, dan jas untuk setiap momen spesial Anda.</p>
          </div>
          <div>
            <h5>Katalog</h5>
            <Link to="/katalog?kategori=wanita">Kebaya Wanita</Link>
            <Link to="/katalog?kategori=pria">Beskap &amp; Jas Pria</Link>
            <Link to="/katalog">Semua Koleksi</Link>
          </div>
          <div>
            <h5>Layanan</h5>
            <Link to="/fitting">Booking Fitting</Link>
            <Link to="/cara-sewa">Cara Sewa</Link>
            <Link to="/pesanan">Pesanan Saya</Link>
          </div>
          <div>
            <h5>Kontak</h5>
            <p className="muted">Senin – Sabtu · 10.00 – 18.00 WIB</p>
            <p className="muted">WhatsApp: 0812-0000-0000</p>
            <p className="muted">Instagram: @aydattire</p>
          </div>
        </div>
        <div className="container footer-bottom">
          <small>© 2026 AYDATTIRE. Semua hak dilindungi.</small>
          <Link to="/admin" className="footer-admin-link">Portal Admin</Link>
        </div>
      </footer>
      <a href="https://wa.me/6281200000000" target="_blank" rel="noopener noreferrer" className="wa-float" aria-label="Chat WhatsApp">
        <WaIcon />
      </a>
    </>
  );
}

export default function Layout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
