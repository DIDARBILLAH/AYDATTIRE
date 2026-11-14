import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { BANKS, defaultCustomSize, DP_RATE, PAYMENT_HOLD_MINUTES, RENTAL_TYPES } from "../data/products";
import { buildSchedule, calcTotals, checkEventDate, fmtDateLong, itemRentalPrice, rupiah } from "../utils/format";
import Stepper from "../components/Stepper";
import ScheduleTimeline from "../components/ScheduleTimeline";

function genOrderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `AYD-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

const Option = ({ name, value, checked, onChange, title, desc, extra, disabled }) => (
  <label className={`opt ${checked ? "on" : ""} ${disabled ? "disabled" : ""}`}>
    <input type="radio" name={name} value={value} checked={checked} onChange={onChange} disabled={disabled} />
    <span className="opt-body">
      <strong>{title}</strong>
      <small>{desc}</small>
    </span>
    {extra && <span className="opt-extra">{extra}</span>}
  </label>
);

export default function Checkout() {
  const navigate = useNavigate();
  const { state, cartItems, bookedDatesByProduct, setItemCustomSize, createOrder, clearCart } = useStore();
  const sched = state.cart.schedule;
  const isLuar = sched?.type === "luar_kota";

  const [f, setF] = useState({
    name: "", wa: "", email: "",
    address: "", city: "", zip: "",
    security: isLuar ? "deposit" : "ktp",
    payment: "dp",
    refundBank: "BCA", refundNumber: "", refundHolder: "",
    note: "", agree: false,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  if (!cartItems.length || !sched) return <Navigate to="/keranjang" replace />;

  const security = isLuar ? "deposit" : f.security;
  const totals = calcTotals({ items: cartItems, type: sched.type, security, payment: f.payment });
  const dateOk = checkEventDate(cartItems.map((i) => i.product.id), sched.type, sched.eventDate, bookedDatesByProduct).ok;
  const t = RENTAL_TYPES[sched.type];

  const validate = () => {
    const e = {};
    if (!f.name.trim()) e.name = "Nama wajib diisi.";
    if (!/^(\+62|62|0)8\d{7,12}$/.test(f.wa.replace(/[\s-]/g, ""))) e.wa = "Nomor WhatsApp tidak valid.";
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Format email tidak valid.";
    if (isLuar) {
      if (!f.address.trim()) e.address = "Alamat pengiriman wajib diisi.";
      if (!f.city.trim()) e.city = "Kota wajib diisi.";
      if (!/^\d{5}$/.test(f.zip)) e.zip = "Kode pos 5 digit.";
    }
    if (security === "deposit") {
      if (!/^\d{6,16}$/.test(f.refundNumber.replace(/\s/g, ""))) e.refundNumber = "Nomor rekening 6–16 digit.";
      if (!f.refundHolder.trim()) e.refundHolder = "Nama pemilik rekening wajib diisi.";
    }
    if (!f.agree) e.agree = "Anda perlu menyetujui ketentuan sewa.";
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setSubmitErr("");
    if (Object.keys(e).length) {
      document.querySelector(`[name="${Object.keys(e)[0]}"]`)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const order = await createOrder({
        id: genOrderNumber(),
        customer: { name: f.name.trim(), wa: f.wa.trim(), email: f.email.trim(), address: f.address.trim(), city: f.city.trim(), zip: f.zip, note: f.note.trim() },
        type: sched.type,
        eventDate: sched.eventDate,
        schedule: buildSchedule(sched.type, sched.eventDate),
        items: cartItems.map(({ product: p, size, customSize }) => {
          const cs = { ...defaultCustomSize(p), ...(customSize || {}) };
          return {
            productId: p.id,
            name: p.name,
            img: p.img,
            sub: p.sub,
            size,
            ukuran: p.ukuran,
            customSize: cs,
            price: itemRentalPrice(p, sched.type),
            deposit: p.deposit,
          };
        }),
        security,
        payment: f.payment,
        totals,
        refund: security === "deposit" ? { bank: f.refundBank, number: f.refundNumber.replace(/\s/g, ""), holder: f.refundHolder.trim() } : null,
      });
      clearCart();
      navigate(`/pembayaran/${order.id}`, { replace: true });
    } catch (err) {
      setSubmitErr(err.message || "Gagal membuat pesanan. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  const err = (k) => errors[k] && <small className="field-err">{errors[k]}</small>;

  return (
    <>
      <section className="page-hero slim">
        <div className="container">
          <nav className="crumbs"><Link to="/">Beranda</Link> / <Link to="/keranjang">Keranjang</Link> / <span>Checkout</span></nav>
          <h1>Checkout</h1>
          <Stepper current={1} />
        </div>
      </section>

      <form className="container flow-page flow-grid" onSubmit={submit} noValidate>
        <div className="flow-main">
          {/* 1. Data penyewa */}
          <div className="panel">
            <div className="form-step"><span>1</span>Data Penyewa</div>
            <div className="fit-2col">
              <div className={`fit-row ${errors.name ? "has-err" : ""}`}>
                <label htmlFor="name">Nama Lengkap</label>
                <input id="name" name="name" placeholder="Sesuai KTP" value={f.name} onChange={set("name")} autoComplete="name" />
                {err("name")}
              </div>
              <div className={`fit-row ${errors.wa ? "has-err" : ""}`}>
                <label htmlFor="wa">No. WhatsApp</label>
                <input id="wa" name="wa" type="tel" placeholder="08xxxxxxxxxx" value={f.wa} onChange={set("wa")} autoComplete="tel" />
                {err("wa")}
              </div>
            </div>
            <div className={`fit-row ${errors.email ? "has-err" : ""}`}>
              <label htmlFor="email">Email <small>(opsional, untuk invoice)</small></label>
              <input id="email" name="email" type="email" placeholder="nama@email.com" value={f.email} onChange={set("email")} autoComplete="email" />
              {err("email")}
            </div>

            {isLuar && (
              <>
                <div className={`fit-row ${errors.address ? "has-err" : ""}`}>
                  <label htmlFor="address">Alamat Pengiriman</label>
                  <textarea id="address" name="address" rows={2} placeholder="Nama jalan, nomor rumah, RT/RW, kecamatan" value={f.address} onChange={set("address")} />
                  {err("address")}
                </div>
                <div className="fit-2col">
                  <div className={`fit-row ${errors.city ? "has-err" : ""}`}>
                    <label htmlFor="city">Kota / Kabupaten</label>
                    <input id="city" name="city" value={f.city} onChange={set("city")} />
                    {err("city")}
                  </div>
                  <div className={`fit-row ${errors.zip ? "has-err" : ""}`}>
                    <label htmlFor="zip">Kode Pos</label>
                    <input id="zip" name="zip" inputMode="numeric" maxLength={5} value={f.zip} onChange={set("zip")} />
                    {err("zip")}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 2. Jaminan */}
          <div className="panel">
            <div className="form-step"><span>2</span>Jaminan</div>
            <div className="opts">
              <Option name="security" value="ktp" checked={security === "ktp"} onChange={set("security")} disabled={isLuar}
                title="KTP Asli" desc="Diserahkan langsung saat pengambilan di butik." extra="Gratis" />
              <Option name="security" value="deposit" checked={security === "deposit"} onChange={set("security")}
                title="Deposit Uang" desc="Dikembalikan 1x24 jam setelah inspeksi busana." extra={rupiah(cartItems.reduce((s, i) => s + i.product.deposit, 0))} />
            </div>
            {isLuar && <p className="hint">Sewa luar kota wajib memakai deposit uang (KTP tidak diterima).</p>}

            {security === "deposit" && (
              <div className="refund-box">
                <h4>Rekening untuk pengembalian deposit</h4>
                <div className="fit-row">
                  <label htmlFor="refundBank">Bank</label>
                  <select id="refundBank" name="refundBank" value={f.refundBank} onChange={set("refundBank")}>
                    {[...BANKS.map((b) => b.name), "BSI", "CIMB Niaga", "Jago", "SeaBank"].map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="fit-2col">
                  <div className={`fit-row ${errors.refundNumber ? "has-err" : ""}`}>
                    <label htmlFor="refundNumber">No. Rekening</label>
                    <input id="refundNumber" name="refundNumber" inputMode="numeric" value={f.refundNumber} onChange={set("refundNumber")} />
                    {err("refundNumber")}
                  </div>
                  <div className={`fit-row ${errors.refundHolder ? "has-err" : ""}`}>
                    <label htmlFor="refundHolder">Atas Nama</label>
                    <input id="refundHolder" name="refundHolder" value={f.refundHolder} onChange={set("refundHolder")} />
                    {err("refundHolder")}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Pembayaran */}
          <div className="panel">
            <div className="form-step"><span>3</span>Nominal Pembayaran</div>
            <div className="opts">
              <Option name="payment" value="dp" checked={f.payment === "dp"} onChange={set("payment")}
                title={`DP ${DP_RATE * 100}%`}
                desc={isLuar ? "Pelunasan sebelum paket dikirim." : "Pelunasan saat pengambilan (H-1)."}
                extra={rupiah(Math.round(totals.subtotal * DP_RATE))} />
              <Option name="payment" value="full" checked={f.payment === "full"} onChange={set("payment")}
                title="Bayar Lunas" desc={security === "deposit" ? "100% biaya sewa + deposit sekarang." : "100% biaya sewa sekarang."}
                extra={rupiah(totals.subtotal + (security === "deposit" ? totals.deposit : 0))} />
            </div>
            <div className="fit-row" style={{ marginTop: 18 }}>
              <label htmlFor="note">Catatan untuk butik <small>(opsional)</small></label>
              <textarea id="note" name="note" rows={2} placeholder="Contoh: mohon tambah peniti / kait cadangan" value={f.note} onChange={set("note")} />
            </div>
            <label className={`agree ${errors.agree ? "has-err" : ""}`}>
              <input type="checkbox" name="agree" checked={f.agree} onChange={set("agree")} />
              <span>Saya menyetujui <Link to="/cara-sewa" target="_blank">ketentuan sewa</Link>, termasuk denda keterlambatan & kerusakan yang dipotong dari deposit.</span>
            </label>
            {err("agree")}
          </div>
        </div>

        {/* Ringkasan */}
        <aside className="flow-aside">
          <div className="panel summary">
            <h3>Ringkasan Pesanan</h3>
            <ul className="sum-items">
              {cartItems.map(({ product: p, size, customSize }) => {
                const cs = { ...defaultCustomSize(p), ...(customSize || {}) };
                return (
                  <li key={p.id} className="sum-item-card">
                    <div className="sum-item-top">
                      <img src={p.img} alt="" />
                      <div>
                        <strong>{p.name}</strong>
                        <small>Ukuran {size}</small>
                        <small className="sum-orig-size">
                          Bawaan: LD {p.ukuran.LD} · Pjg {p.ukuran.Panjang} · Pinggang {p.ukuran.Pinggang}
                        </small>
                      </div>
                      <span>{rupiah(itemRentalPrice(p, sched.type))}</span>
                    </div>

                    <div className="custom-size-wrap">
                      <label className="custom-size-toggle">
                        <input
                          type="checkbox"
                          checked={cs.isCustom}
                          onChange={(e) => setItemCustomSize(p.id, { isCustom: e.target.checked })}
                        />
                        <span>Sesuaikan Ukuran Badan (Permak Ringan)</span>
                      </label>

                      {cs.isCustom && (
                        <div className="custom-size-form">
                          <div className="custom-size-grid">
                            <div>
                              <label htmlFor={`ld-${p.id}`}>LD (cm)</label>
                              <input
                                id={`ld-${p.id}`}
                                type="text"
                                value={cs.ld}
                                placeholder={p.ukuran.LD}
                                onChange={(e) => setItemCustomSize(p.id, { ld: e.target.value })}
                              />
                            </div>
                            <div>
                              <label htmlFor={`pjg-${p.id}`}>Panjang (cm)</label>
                              <input
                                id={`pjg-${p.id}`}
                                type="text"
                                value={cs.panjang}
                                placeholder={p.ukuran.Panjang}
                                onChange={(e) => setItemCustomSize(p.id, { panjang: e.target.value })}
                              />
                            </div>
                            <div>
                              <label htmlFor={`pgg-${p.id}`}>Pinggang (cm)</label>
                              <input
                                id={`pgg-${p.id}`}
                                type="text"
                                value={cs.pinggang}
                                placeholder={p.ukuran.Pinggang}
                                onChange={(e) => setItemCustomSize(p.id, { pinggang: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="custom-size-note">
                            <label htmlFor={`cnote-${p.id}`}>Catatan Permak / Ukuran Tambahan</label>
                            <input
                              id={`cnote-${p.id}`}
                              type="text"
                              value={cs.note}
                              placeholder="Contoh: kecilkan pinggang 2 cm, pasang kancing kait tambahan"
                              onChange={(e) => setItemCustomSize(p.id, { note: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="sum-sched">
              <span className={`badge ${isLuar ? "badge-gold" : ""}`}>{t.label} · {t.days} hari</span>
              <ScheduleTimeline type={sched.type} eventDate={sched.eventDate} compact />
            </div>
            <dl className="sum-rows">
              <div><dt>Biaya sewa</dt><dd>{rupiah(totals.rental)}</dd></div>
              {totals.shipping > 0 && <div><dt>Ongkir ekspedisi</dt><dd>{rupiah(totals.shipping)}</dd></div>}
              {security === "deposit" && <div><dt>Deposit (dikembalikan)</dt><dd>{rupiah(totals.deposit)}</dd></div>}
              <div className="sum-total"><dt>Total</dt><dd>{rupiah(totals.grandTotal)}</dd></div>
              <div className="sum-now"><dt>Bayar sekarang</dt><dd>{rupiah(totals.payNow)}</dd></div>
              {totals.payLater > 0 && <div className="sum-later"><dt>Sisa {isLuar ? "sebelum dikirim" : "saat ambil"}</dt><dd>{rupiah(totals.payLater)}</dd></div>}
            </dl>
            {!dateOk && <p className="hint warn">Tanggal acara sudah tidak tersedia. <Link to="/keranjang">Ubah di keranjang</Link>.</p>}
            {submitErr && <p className="form-error" role="alert">{submitErr}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={!dateOk || submitting}>
              {submitting ? <><span className="spinner" /> Menyimpan Pesanan…</> : "Lanjut ke Pembayaran"}
            </button>
            <p className="sum-note">Tanggal {fmtDateLong(sched.eventDate)} akan ditahan {PAYMENT_HOLD_MINUTES} menit untuk pembayaran.</p>
          </div>
        </aside>
      </form>
    </>
  );
}
