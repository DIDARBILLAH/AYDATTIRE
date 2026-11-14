import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { getProduct, PRODUCTS, RENTAL_TYPES } from "../data/products";
import { fmtDateLong, itemRentalPrice, rupiah } from "../utils/format";
import RentalCalendar from "../components/RentalCalendar";
import ScheduleTimeline from "../components/ScheduleTimeline";
import ProductCard from "../components/ProductCard";
import { HeartIcon } from "../components/Icons";
import NotFound from "./NotFound";

// Variasi "sudut foto" (sementara memakai 1 foto dengan crop berbeda)
const ANGLES = [
  { label: "Depan", pos: "center 20%", zoom: 1 },
  { label: "Detail atas", pos: "center 10%", zoom: 1.6 },
  { label: "Detail bawah", pos: "center 80%", zoom: 1.5 },
  { label: "Samping", pos: "30% 30%", zoom: 1.25 },
];

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, products, getProductById, addToCart, isFav, toggleFav } = useStore();
  const p = getProductById(id);
  const cartSched = state.cart.schedule;

  const [angle, setAngle] = useState(0);
  const [size, setSize] = useState("");
  const [type, setType] = useState(cartSched?.type || "dalam_kota");
  const [eventDate, setEventDate] = useState(cartSched?.eventDate || "");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null); // "cart" | "now"
  const [toast, setToast] = useState("");

  if (!p) return <NotFound />;

  const t = RENTAL_TYPES[type];
  const price = itemRentalPrice(p, type);
  const related = products.filter((x) => x.cat === p.cat && x.id !== p.id && !x.booked).slice(0, 4);

  const changeType = (k) => {
    setType(k);
    setEventDate("");
    setError("");
  };

  const validate = () => {
    if (p.booked) return "Busana ini sedang penuh dipesan.";
    if (!size) return "Pilih ukuran terlebih dahulu.";
    if (!eventDate) return "Pilih tanggal acara di kalender.";
    return "";
  };

  const conflictsWithCart = () =>
    state.cart.items.length > 0 &&
    state.cart.items.some((i) => i.productId !== p.id) &&
    (cartSched.type !== type || cartSched.eventDate !== eventDate);

  const commit = (mode) => {
    addToCart(p.id, size, { type, eventDate });
    setConfirm(null);
    if (mode === "now") navigate("/checkout");
    else {
      setToast(`${p.name} ditambahkan ke keranjang.`);
      setTimeout(() => setToast(""), 3500);
    }
  };

  const handle = (mode) => {
    const err = validate();
    setError(err);
    if (err) return;
    if (conflictsWithCart()) return setConfirm(mode);
    commit(mode);
  };

  const fav = isFav(p.id);

  return (
    <>
      <section className="container pd-crumbs">
        <nav className="crumbs">
          <Link to="/">Beranda</Link> / <Link to="/katalog">Katalog</Link> / <span>{p.name}</span>
        </nav>
      </section>

      <section className="container pd">
        {/* ===== Galeri ===== */}
        <div className="pd-gallery">
          <div className="pd-main">
            <img src={p.img} alt={`${p.name} — ${ANGLES[angle].label}`}
              style={{ objectPosition: ANGLES[angle].pos, transform: `scale(${ANGLES[angle].zoom})` }} />
            <span className={`p-tag ${p.booked ? "booked" : ""}`}>{p.tag}</span>
            <button className={`p-fav ${fav ? "on" : ""}`} aria-pressed={fav} aria-label="Favorit" onClick={() => toggleFav(p.id)}><HeartIcon /></button>
          </div>
          <div className="pd-thumbs">
            {ANGLES.map((a, i) => (
              <button key={a.label} className={i === angle ? "on" : ""} onClick={() => setAngle(i)} aria-label={a.label}>
                <img src={p.img} alt="" style={{ objectPosition: a.pos, transform: `scale(${a.zoom})` }} />
              </button>
            ))}
          </div>
        </div>

        {/* ===== Info & pemesanan ===== */}
        <div className="pd-info">
          <div className="p-cat">{p.cat === "pria" ? "Pria" : "Wanita"} · {p.sub}</div>
          <h1 className="pd-title">{p.name}</h1>
          <div className="pd-price">
            <strong>{rupiah(price)}</strong>
            <span>/ {t.days} hari · {t.label}</span>
          </div>
          <p className="pd-dep">Deposit jaminan {rupiah(p.deposit)} <small>(dikembalikan setelah inspeksi)</small></p>

          <dl className="pd-specs">
            <div className="pd-specs-full"><dt>Bahan</dt><dd>{p.bahan}</dd></div>
            <div><dt>Lingkar Dada (LD)</dt><dd>{p.ukuran.LD}</dd></div>
            <div><dt>Panjang Baju</dt><dd>{p.ukuran.Panjang}</dd></div>
            <div><dt>Lingkar Pinggang</dt><dd>{p.ukuran.Pinggang}</dd></div>
            {p.aksesori && <div><dt>Termasuk</dt><dd>{p.aksesori.join(", ")}</dd></div>}
          </dl>

          {p.booked ? (
            <div className="pd-block">
              <p className="hint warn">Busana ini sedang penuh dipesan untuk beberapa minggu ke depan. Coba lihat koleksi serupa di bawah atau hubungi kami.</p>
            </div>
          ) : (
            <>
              <div className="pd-block">
                <h4 className="pd-label">1. Ukuran</h4>
                <div className="size-chips">
                  {p.sizes.map((s) => (
                    <button key={s} className={size === s ? "on" : ""} aria-pressed={size === s} onClick={() => { setSize(s); setError(""); }}>{s}</button>
                  ))}
                </div>
                <Link to={`/fitting?item=${p.id}`} className="pd-fitlink">Ragu ukuran? Booking fitting gratis →</Link>
              </div>

              <div className="pd-block">
                <h4 className="pd-label">2. Metode Sewa</h4>
                <div className="type-cards">
                  {Object.values(RENTAL_TYPES).map((rt) => (
                    <button key={rt.key} className={`type-card ${type === rt.key ? "on" : ""}`} aria-pressed={type === rt.key} onClick={() => changeType(rt.key)}>
                      <strong>{rt.label}</strong>
                      <span>{rt.short} · {rt.days} hari</span>
                      <small>{rupiah(itemRentalPrice(p, rt.key))}{rt.shipping ? ` + ongkir ${rupiah(rt.shipping)}` : ""}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pd-block">
                <h4 className="pd-label">3. Tanggal Acara <small>— klik 1 tanggal, jadwal terisi otomatis</small></h4>
                <RentalCalendar productIds={[p.id]} type={type} value={eventDate} onChange={(d) => { setEventDate(d); setError(""); }} />
                {eventDate && (
                  <div className="pd-sched">
                    <p className="pd-sched-title">Hari acara: <strong>{fmtDateLong(eventDate)}</strong></p>
                    <ScheduleTimeline type={type} eventDate={eventDate} compact />
                  </div>
                )}
              </div>

              {error && <p className="form-error" role="alert">{error}</p>}

              <div className="pd-actions">
                <button className="btn btn-primary" onClick={() => handle("now")}>Sewa Sekarang</button>
                <button className="btn btn-outline" onClick={() => handle("cart")}>+ Keranjang</button>
              </div>
            </>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <div className="section-head split">
              <div><span className="eyebrow">Koleksi Serupa</span><h2>Mungkin Anda Suka</h2></div>
              <Link to={`/katalog?kategori=${p.cat}`} className="link-more">Lihat semua →</Link>
            </div>
            <div className="product-grid">{related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
          </div>
        </section>
      )}

      {/* Modal: jadwal berbeda dengan isi keranjang */}
      {confirm && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="mTitle">
          <div className="modal">
            <h3 id="mTitle">Ganti jadwal keranjang?</h3>
            <p>
              Keranjang Anda berisi busana untuk <strong>{RENTAL_TYPES[cartSched.type].label}</strong>, acara{" "}
              <strong>{fmtDateLong(cartSched.eventDate)}</strong>. Satu pesanan hanya bisa memakai satu jadwal.
            </p>
            <p className="muted-dark">Lanjut akan mengosongkan keranjang lama dan memakai jadwal baru.</p>
            <div className="modal-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setConfirm(null)}>Batal</button>
              <button className="btn btn-primary btn-sm" onClick={() => commit(confirm)}>Ganti &amp; Lanjutkan</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <span>✓ {toast}</span>
          <Link to="/keranjang">Lihat keranjang</Link>
        </div>
      )}
    </>
  );
}
