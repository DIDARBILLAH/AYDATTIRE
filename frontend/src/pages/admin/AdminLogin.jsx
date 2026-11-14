import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../../context/StoreContext";

export default function AdminLogin() {
  const { adminUser, adminLogin, isSupabaseConfigured } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/admin";

  const [email, setEmail] = useState("admin@aydattire.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (adminUser) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await adminLogin(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Gagal masuk. Periksa kembali email dan kata sandi Anda.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail("admin@aydattire.com");
    setPassword("admin123");
    setError("");
  };

  return (
    <section className="admin-login-page">
      <div className="admin-login-card panel">
        <div className="admin-login-head">
          <Link to="/" className="logo">AYDAT<span>TIRE</span></Link>
          <span className="eyebrow">Back-Office Portal</span>
          <h1>Masuk Admin</h1>
          <p className="muted-dark">
            Kelola katalog kebaya, verifikasi pembayaran, dan pantau pengembalian deposit.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="fit-row">
            <label htmlFor="adminEmail">Email Admin</label>
            <input
              id="adminEmail"
              type="email"
              placeholder="admin@aydattire.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="fit-row">
            <label htmlFor="adminPassword">Kata Sandi</label>
            <input
              id="adminPassword"
              type="password"
              placeholder="Masukkan kata sandi…"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <><span className="spinner" /> Memverifikasi…</> : "Masuk ke Dashboard"}
          </button>
        </form>

        <div className="admin-demo-hint">
          <div>
            <strong>Akun Admin Cepat (Demo / Pengujian)</strong>
            <small>
              {isSupabaseConfigured
                ? "Anda dapat masuk menggunakan akun Supabase Auth Anda atau menggunakan kredensial demo di bawah:"
                : "Supabase .env belum diisi. Gunakan akun demo berikut untuk masuk:"}
            </small>
            <div className="mono">Email: admin@aydattire.com · Sandi: admin123</div>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={fillDemo}>
            Isi Otomatis
          </button>
        </div>

        <div className="center" style={{ marginTop: 18 }}>
          <Link to="/" className="link-btn">← Kembali ke Beranda Penyewa</Link>
        </div>
      </div>
    </section>
  );
}
