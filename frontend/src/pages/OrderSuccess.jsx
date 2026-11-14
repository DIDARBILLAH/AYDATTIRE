import { Link, Navigate, useParams } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { RENTAL_TYPES } from "../data/products";
import { fmtDateLong, rupiah } from "../utils/format";
import Stepper from "../components/Stepper";
import ScheduleTimeline from "../components/ScheduleTimeline";

function nextSteps(o) {
  const luar = o.type === "luar_kota";
  const s = [];
  s.push("Konfirmasi pesanan & invoice dikirim ke WhatsApp " + o.customer.wa + ".");
  if (luar) {
    if (o.totals.payLater > 0) s.push(`Lunasi sisa ${rupiah(o.totals.payLater)} sebelum paket dikirim. Link pelunasan dikirim via WhatsApp.`);
    s.push(`Paket tiba sekitar ${fmtDateLong(o.schedule[0].date)}. Nomor resi muncul di halaman Pesanan Saya.`);
    s.push(`Kirim balik paket paling lambat ${fmtDateLong(o.schedule.find((x) => x.role === "kembali").date)} dan upload resinya.`);
  } else {
    s.push(`Ambil busana di butik pada ${fmtDateLong(o.schedule[0].date)}, pukul 10.00 – 17.00 WIB.`);
    if (o.totals.payLater > 0) s.push(`Siapkan pelunasan ${rupiah(o.totals.payLater)} saat pengambilan${o.security === "deposit" ? " (sudah termasuk deposit)" : ""}.`);
    if (o.security === "ktp") s.push("Bawa KTP asli sebagai jaminan saat pengambilan.");
    s.push(`Kembalikan busana paling lambat ${fmtDateLong(o.schedule.find((x) => x.role === "kembali").date)} pukul 18.00 WIB.`);
  }
  if (o.security === "deposit") s.push(`Deposit ${rupiah(o.totals.deposit)} dikembalikan ke ${o.refund.bank} ${o.refund.number} dalam 1x24 jam setelah inspeksi.`);
  return s;
}

export default function OrderSuccess() {
  const { orderId } = useParams();
  const { getOrder, loadingOrders } = useStore();
  const o = getOrder(orderId);

  if (!o && loadingOrders) {
    return (
      <section className="container flow-page">
        <div className="loading-box"><span className="spinner dark" /> Memuat invoice pesanan…</div>
      </section>
    );
  }
  if (!o) return <Navigate to="/pesanan" replace />;
  if (o.status !== "paid") return <Navigate to={`/pembayaran/${o.id}`} replace />;

  const t = RENTAL_TYPES[o.type];
  const paidAt = new Date(o.paidAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <section className="page-hero slim no-print">
        <div className="container">
          <Stepper current={3} />
        </div>
      </section>

      <section className="container flow-page success-page">
        <div className="panel result-card">
          <div className="result-icon ok" aria-hidden="true">✓</div>
          <span className="eyebrow">{o.payment === "dp" ? "DP Diterima" : "Pembayaran Lunas"}</span>
          <h2>Terima kasih, {o.customer.name.split(" ")[0]}!</h2>
          <p className="muted-dark">Tanggal sewa Anda resmi terkunci. Simpan nomor pesanan di bawah.</p>
          <div className="ticket-code">{o.id}</div>
        </div>

        <div className="invoice panel">
          <div className="inv-head">
            <div>
              <div className="logo">AYDAT<span>TIRE</span></div>
              <small className="muted-dark">Invoice sewa busana</small>
            </div>
            <div className="inv-meta">
              <span className="status-badge paid">{o.payment === "dp" ? "DP Terverifikasi" : "Lunas"}</span>
              <small>{paidAt} · {o.payMethod}</small>
            </div>
          </div>

          <div className="inv-grid">
            <div>
              <h4 className="pd-label">Penyewa</h4>
              <p><strong>{o.customer.name}</strong><br />{o.customer.wa}{o.customer.email && <><br />{o.customer.email}</>}</p>
              {o.type === "luar_kota" && <p className="muted-dark">{o.customer.address}, {o.customer.city} {o.customer.zip}</p>}
            </div>
            <div>
              <h4 className="pd-label">Sewa</h4>
              <p><strong>{t.label}</strong> · {t.days} hari<br />Acara {fmtDateLong(o.eventDate)}<br />Jaminan: {o.security === "ktp" ? "KTP Asli" : "Deposit uang"}</p>
            </div>
          </div>

          <h4 className="pd-label">Jadwal</h4>
          <ScheduleTimeline type={o.type} eventDate={o.eventDate} compact />

          <table className="inv-table">
            <thead><tr><th>Busana</th><th>Ukuran</th><th className="r">Harga</th></tr></thead>
            <tbody>
              {o.items.map((it) => (
                <tr key={it.productId}>
                  <td>
                    <strong>{it.name}</strong>
                    {it.customSize?.isCustom && (
                      <div className="inv-custom-size">
                        <span>Permak Ukuran: LD {it.customSize.ld} · Panjang {it.customSize.panjang} · Pinggang {it.customSize.pinggang}</span>
                        {it.customSize.note && <small>Catatan: {it.customSize.note}</small>}
                      </div>
                    )}
                  </td>
                  <td>{it.size}</td>
                  <td className="r">{rupiah(it.price)}</td>
                </tr>
              ))}
              {o.totals.shipping > 0 && <tr><td colSpan={2}>Ongkir ekspedisi</td><td className="r">{rupiah(o.totals.shipping)}</td></tr>}
              {o.security === "deposit" && <tr><td colSpan={2}>Deposit jaminan (dikembalikan)</td><td className="r">{rupiah(o.totals.deposit)}</td></tr>}
            </tbody>
            <tfoot>
              <tr><td colSpan={2}>Total</td><td className="r">{rupiah(o.totals.grandTotal)}</td></tr>
              <tr className="paid-row"><td colSpan={2}>Sudah dibayar</td><td className="r">{rupiah(o.totals.payNow)}</td></tr>
              <tr className="due-row"><td colSpan={2}>Sisa tagihan</td><td className="r">{rupiah(o.totals.payLater)}</td></tr>
            </tfoot>
          </table>
        </div>

        <div className="panel">
          <h3>Langkah Selanjutnya</h3>
          <ol className="next-steps">{nextSteps(o).map((s, i) => <li key={i}>{s}</li>)}</ol>
        </div>

        <div className="result-actions no-print">
          <button className="btn btn-outline" onClick={() => window.print()}>Cetak / Simpan Invoice</button>
          <Link to="/pesanan" className="btn btn-primary">Lihat Pesanan Saya</Link>
          <Link to="/" className="btn btn-outline">Kembali ke Beranda</Link>
        </div>
      </section>
    </>
  );
}
