import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { RENTAL_TYPES } from "../data/products";
import { calcTotals, checkEventDate, fmtDateLong, itemRentalPrice, rupiah } from "../utils/format";
import Stepper from "../components/Stepper";
import RentalCalendar from "../components/RentalCalendar";
import ScheduleTimeline from "../components/ScheduleTimeline";
import { TrashIcon } from "../components/Icons";

export default function Cart() {
  const navigate = useNavigate();
  const { state, cartItems, bookedDatesByProduct, removeFromCart, setItemSize, setCartSchedule } = useStore();
  const sched = state.cart.schedule;
  const [editDate, setEditDate] = useState(false);

  if (!cartItems.length) {
    return (
      <>
        <section className="page-hero">
          <div className="container">
            <nav className="crumbs"><Link to="/">Beranda</Link> / <span>Keranjang</span></nav>
            <h1>Keranjang Sewa</h1>
          </div>
        </section>
        <section className="container flow-page">
          <div className="empty">
            <div className="empty-icon">👗</div>
            <h3>Keranjang masih kosong</h3>
            <p>Pilih busana dan tanggal acara dari katalog untuk mulai menyewa.</p>
            <Link to="/katalog" className="btn btn-primary btn-sm">Jelajahi Katalog</Link>
          </div>
        </section>
      </>
    );
  }

  const ids = cartItems.map((i) => i.product.id);
  const valid = checkEventDate(ids, sched.type, sched.eventDate, bookedDatesByProduct);
  const totals = calcTotals({ items: cartItems, type: sched.type, security: "ktp", payment: "full" });
  const t = RENTAL_TYPES[sched.type];

  return (
    <>
      <section className="page-hero slim">
        <div className="container">
          <nav className="crumbs"><Link to="/">Beranda</Link> / <span>Keranjang</span></nav>
          <h1>Keranjang Sewa</h1>
          <Stepper current={0} />
        </div>
      </section>

      <section className="container flow-page flow-grid">
        <div className="flow-main">
          <div className="panel">
            <div className="panel-head">
              <h3>Jadwal Sewa</h3>
              <button className="link-btn" onClick={() => setEditDate((v) => !v)}>{editDate ? "Tutup" : "Ubah tanggal"}</button>
            </div>
            <p className="panel-sub">
              <span className={`badge ${sched.type === "luar_kota" ? "badge-gold" : ""}`}>{t.label} · {t.days} hari</span>
              &nbsp; Hari acara <strong>{fmtDateLong(sched.eventDate)}</strong>
            </p>
            {!valid.ok && (
              <p className="hint warn" role="alert">Tanggal ini sudah tidak tersedia untuk semua busana di keranjang. Silakan ubah tanggal.</p>
            )}
            {editDate ? (
              <div className="seg type-seg">
                {Object.values(RENTAL_TYPES).map((rt) => (
                  <button key={rt.key} className={`seg-btn ${sched.type === rt.key ? "active" : ""}`}
                    onClick={() => setCartSchedule({ ...sched, type: rt.key })}>{rt.label}</button>
                ))}
              </div>
            ) : null}
            {editDate && (
              <RentalCalendar productIds={ids} type={sched.type} value={sched.eventDate}
                onChange={(d) => { setCartSchedule({ ...sched, eventDate: d }); setEditDate(false); }} />
            )}
            <ScheduleTimeline type={sched.type} eventDate={sched.eventDate} compact />
          </div>

          <div className="panel">
            <div className="panel-head"><h3>Busana ({cartItems.length})</h3><Link to="/katalog" className="link-btn">+ Tambah busana</Link></div>
            <ul className="cart-list">
              {cartItems.map(({ product: p, size }) => (
                <li key={p.id} className="cart-item">
                  <Link to={`/produk/${p.id}`}><img src={p.img} alt="" /></Link>
                  <div className="ci-body">
                    <div className="p-cat">{p.sub}</div>
                    <Link to={`/produk/${p.id}`} className="ci-name">{p.name}</Link>
                    <div className="ci-meta">
                      <label>Ukuran
                        <select value={size} onChange={(e) => setItemSize(p.id, e.target.value)}>
                          {p.sizes.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </label>
                      <span>Deposit {rupiah(p.deposit)}</span>
                    </div>
                    <div className="ci-specs">
                      Spesifikasi bawaan: LD {p.ukuran.LD} · Panjang {p.ukuran.Panjang} · Pinggang {p.ukuran.Pinggang}
                    </div>
                  </div>
                  <div className="ci-right">
                    <strong>{rupiah(itemRentalPrice(p, sched.type))}</strong>
                    <button className="icon-btn" aria-label={`Hapus ${p.name}`} onClick={() => removeFromCart(p.id)}><TrashIcon /></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="flow-aside">
          <div className="panel summary">
            <h3>Ringkasan</h3>
            <dl className="sum-rows">
              <div><dt>Biaya sewa ({cartItems.length} busana)</dt><dd>{rupiah(totals.rental)}</dd></div>
              {totals.shipping > 0 && <div><dt>Ongkir ekspedisi</dt><dd>{rupiah(totals.shipping)}</dd></div>}
              <div className="sum-total"><dt>Subtotal</dt><dd>{rupiah(totals.subtotal)}</dd></div>
            </dl>
            <p className="sum-note">Jaminan (KTP / deposit) dan opsi DP dipilih di langkah berikutnya.</p>
            <button className="btn btn-primary btn-block" disabled={!valid.ok} onClick={() => navigate("/checkout")}>
              Lanjut ke Checkout
            </button>
          </div>
        </aside>
      </section>
    </>
  );
}
