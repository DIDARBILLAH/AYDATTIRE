import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import CountUp from "../components/CountUp";
import { useStore } from "../context/StoreContext";
import { REVIEWS, FITTING_SESSIONS } from "../data/products";

const Stars = ({ n }) => (
  <div className="stars" aria-label={`${n} dari 5 bintang`}>
    {"★".repeat(n)}<span className="off">{"★".repeat(5 - n)}</span>
  </div>
);

export default function Home() {
  const { products, loadingProducts } = useStore();
  const popular = products.filter((p) => !p.booked).slice(0, 4);

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-text">
            <span className="eyebrow">Koleksi Busana Tradisional &amp; Modern</span>
            <h1>Tampil Anggun di <em>Setiap Momen</em> Berharga</h1>
            <p className="lead">Sewa kebaya, beskap, basofi, dan jas pilihan untuk pernikahan, wisuda, hingga acara keluarga. Jadwal ambil &amp; kembali diatur otomatis.</p>
            <div className="hero-cta">
              <Link to="/katalog" className="btn btn-primary">Jelajahi Katalog</Link>
              <Link to="/fitting" className="btn btn-outline">Booking Fitting</Link>
            </div>
            <div className="hero-stats">
              <div><CountUp to={500} suffix="+" /><span>Koleksi Busana</span></div>
              <div><CountUp to={2000} suffix="+" /><span>Klien Puas</span></div>
              <div><CountUp to={4.9} decimals={1} suffix="★" /><span>Rating Ulasan</span></div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-img-wrap">
              <img src="/assets/img/hero.jpg" alt="Model mengenakan kebaya beludru marun dengan bordir emas" />
            </div>
            <div className="floating-card fc-top">
              <span className="dot dot-green" />
              <div><strong>Tersedia</strong><small>Kebaya Beludru Marun</small></div>
            </div>
            <div className="floating-card fc-bottom">
              <div className="fc-icon">✦</div>
              <div><strong>Bebas Laundry</strong><small>Dry clean sudah termasuk</small></div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ KATEGORI ============ */}
      <section className="section">
        <div className="container">
          <div className="section-head center">
            <span className="eyebrow">Kategori</span>
            <h2>Busana untuk Pria &amp; Wanita</h2>
          </div>
          <div className="cat-grid">
            <Link to="/katalog?kategori=wanita" className="cat-card">
              <img src="/assets/img/kebaya-kutubaru.jpg" alt="Koleksi wanita" />
              <div className="cat-overlay">
                <span className="cat-label">Wanita</span>
                <h3>Kebaya</h3>
                <div className="chips">{["Modern", "Kutubaru", "Encim", "Wisuda", "Pengantin"].map((c) => <span key={c}>{c}</span>)}</div>
              </div>
            </Link>
            <Link to="/katalog?kategori=pria" className="cat-card">
              <img src="/assets/img/beskap.jpg" alt="Koleksi pria" />
              <div className="cat-overlay">
                <span className="cat-label">Pria</span>
                <h3>Beskap &amp; Jas</h3>
                <div className="chips">{["Beskap Tradisional", "Basofi", "Jas"].map((c) => <span key={c}>{c}</span>)}</div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ============ KOLEKSI POPULER ============ */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-head split">
            <div>
              <span className="eyebrow">Koleksi Populer</span>
              <h2>Paling Banyak Disewa</h2>
            </div>
            <Link to="/katalog" className="link-more">Lihat semua katalog →</Link>
          </div>
          {loadingProducts && !popular.length ? (
            <div className="loading-box"><span className="spinner dark" /> Memuat koleksi populer…</div>
          ) : (
            <div className="product-grid">
              {popular.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* ============ FITTING ============ */}
      <section className="section fitting">
        <div className="container fitting-cta">
          <div>
            <span className="eyebrow light">Sesi Fitting</span>
            <h2>Coba Dulu, Baru Sewa</h2>
            <p>Buat janji temu di butik untuk mencoba hingga <strong>3 busana</strong> sekaligus. Gratis &amp; kuota per sesi dibatasi agar Anda nyaman.</p>
            <Link to="/fitting" className="btn btn-gold">Booking Sesi Fitting</Link>
          </div>
          <ul className="fit-sessions">
            {FITTING_SESSIONS.map((s) => <li key={s.id}><span>{s.label}</span><strong>{s.time}</strong></li>)}
          </ul>
        </div>
      </section>

      {/* ============ TESTIMONI ============ */}
      <section className="section">
        <div className="container">
          <div className="review-head">
            <div>
              <span className="eyebrow">Ulasan Pelanggan</span>
              <h2>Kata Mereka tentang AYDATTIRE</h2>
            </div>
            <div className="rating-summary">
              <CountUp to={4.9} decimals={1} />
              <div>
                <div className="stars">★★★★★</div>
                <small>dari <CountUp as="b" to={1250} suffix="+" /> ulasan</small>
              </div>
            </div>
          </div>
          <div className="testi-grid">
            {REVIEWS.map((r) => (
              <figure className="testi" key={r.name}>
                <Stars n={r.rating} />
                <blockquote>“{r.text}”</blockquote>
                <div className="testi-product">Menyewa: <strong>{r.product}</strong></div>
                <figcaption>
                  <span className="avatar">{r.name[0]}</span>
                  <div><strong>{r.name}</strong><small>{r.event}</small></div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
