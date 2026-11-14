import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useStore } from "../context/StoreContext";

const ADMIN_NAV = [
  { to: "/admin", label: "Ringkasan", icon: "dashboard", end: true },
  { to: "/admin/pesanan", label: "Manajemen Pesanan", icon: "receipt_long" },
  { to: "/admin/produk", label: "Katalog & Kategori", icon: "checkroom" },
  { to: "/admin/laporan", label: "Laporan & Ekspor", icon: "analytics" },
];

export default function AdminLayout() {
  const { adminUser, authLoading, adminLogout, state, isSupabaseConfigured } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="admin-auth-loading">
        <span className="spinner dark" /> Memeriksa sesi admin…
      </div>
    );
  }

  if (!adminUser) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  const rawOrders = Array.isArray(state?.orders) ? state.orders : [];
  const pendingCount = rawOrders.filter(
    (o) => o?.status === "pending" && (o?.expiresAt || 0) > Date.now()
  ).length;

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className={`admin-shell admin-layout ${sidebarOpen ? "sb-open" : ""}`}>
      {sidebarOpen && (
        <div
          className="admin-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        {/* Bagian Atas: Brand & Navigasi */}
        <div className="admin-sb-top">
          <div className="admin-brand">
            <div className="admin-brand-info">
              <Link to="/admin" className="logo light">
                AYDAT<span>TIRE</span>
              </Link>
              <div className="admin-brand-badge-wrap">
                <span className="admin-tag">
                  <span className="material-symbols-rounded">admin_panel_settings</span>
                  <span>Back-Office</span>
                </span>
                <span className="admin-env-pill">
                  {isSupabaseConfigured && adminUser?.mode === "supabase" ? "Supabase" : "Demo"}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="admin-sb-close"
              aria-label="Tutup menu admin"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>

          <div className="admin-nav-group">
            <span className="admin-nav-group-title">Menu Utama</span>
            <nav className="admin-nav" onClick={() => setSidebarOpen(false)}>
              {ADMIN_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `admin-nav-link ${isActive ? "active" : ""}`}
                >
                  <span className="material-symbols-rounded admin-nav-icon">{item.icon}</span>
                  <span className="admin-nav-label">{item.label}</span>
                  {item.to === "/admin/pesanan" && pendingCount > 0 && (
                    <span className="admin-badge">{pendingCount}</span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* Bagian Bawah: Profil Pengguna & Aksi Keluar */}
        <div className="admin-sb-foot">
          <div className="admin-user-card">
            <div className="admin-avatar">
              <span className="material-symbols-rounded">shield_person</span>
            </div>
            <div className="admin-user-meta">
              <div className="admin-user-header">
                <span className="admin-user-role">Administrator</span>
                <span className="admin-live-pulse" title="Sesi Aktif" />
              </div>
              <strong className="admin-user-email" title={adminUser?.email}>
                {adminUser?.email || "admin@aydattire.com"}
              </strong>
              <small className="admin-user-sub">
                {isSupabaseConfigured && adminUser?.mode === "supabase"
                  ? "Supabase Connected"
                  : "Mode Offline / Demo"}
              </small>
            </div>
          </div>

          <div className="admin-sb-actions">
            <Link to="/" className="admin-sb-btn btn-store" title="Buka Website Pelanggan">
              <span className="material-symbols-rounded">storefront</span>
              <span>Lihat Toko</span>
            </Link>
            <button
              type="button"
              className="admin-sb-btn btn-logout"
              onClick={handleLogout}
              title="Keluar dari sesi admin"
            >
              <span className="material-symbols-rounded">logout</span>
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-topbar">
          <button
            type="button"
            className="icon-btn admin-menu-btn"
            aria-label="Buka menu admin"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="material-symbols-rounded">menu</span>
          </button>
          <div className="admin-topbar-title">
            <span className="status-dot" />
            <strong>AYDATTIRE Admin</strong>
          </div>
          <div className="admin-topbar-right">
            <span className={`mini-pill ${isSupabaseConfigured ? "ok" : "info"}`}>
              {isSupabaseConfigured ? "Supabase Aktif" : "Mode Lokal"}
            </span>
            <Link to="/" className="btn btn-outline btn-xs">
              <span className="material-symbols-rounded">storefront</span> Toko
            </Link>
          </div>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
