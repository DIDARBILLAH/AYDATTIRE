import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="section">
      <div className="container">
        <div className="empty">
          <div className="empty-icon">🧵</div>
          <h3>Halaman tidak ditemukan</h3>
          <p>Tautan mungkin salah atau halaman sudah dipindahkan.</p>
          <Link to="/" className="btn btn-primary btn-sm">Kembali ke Beranda</Link>
        </div>
      </div>
    </section>
  );
}
