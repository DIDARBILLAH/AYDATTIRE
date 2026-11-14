import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FITTING_SESSIONS, PRODUCTS } from "../data/products";
import { addDays, fmtDateLong, fromISO, genCode, todayISO } from "../utils/format";

const QUOTA_PER_SESSION = 4;
const MAX_ITEMS = 3;

// Simulasi jumlah booking per tanggal & sesi (nanti diambil dari server)
function bookedCount(dateStr, sessionId) {
  let h = 0;
  for (const c of dateStr + sessionId) h = (h * 31 + c.charCodeAt(0)) % 997;
  return h % (QUOTA_PER_SESSION + 1);
}

export default function Fitting() {
  const [params] = useSearchParams();
  const pre = Number(params.get("item"));
  const options = PRODUCTS.filter((p) => !p.booked);

  const [date, setDate] = useState("");
  const [session, setSession] = useState(null);
  const [items, setItems] = useState(options.some((p) => p.id === pre) ? [pre] : []);
  const [name, setName] = useState("");
  const [wa, setWa] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState(null);

  const isSunday = date && fromISO(date).getDay() === 0;
  const sessions = useMemo(
    () => FITTING_SESSIONS.map((s) => ({ ...s, left: date ? QUOTA_PER_SESSION - bookedCount(date, s.id) : 0 })),
    [date]
  );

  const toggleItem = (id) => {
    setError("");
    setItems((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : arr.length < MAX_ITEMS ? [...arr, id] : arr));
  };

  const submit = (e) => {
    e.preventDefault();
    if (!date) return setError("Silakan pilih tanggal fitting.");
    if (isSunday) return setError("Butik tutup di hari Minggu.");
    if (!session) return setError("Silakan pilih sesi fitting.");
    if (!name.trim()) return setError("Nama wajib diisi.");
    if (!/^(\+62|62|0)8\d{7,12}$/.test(wa.replace(/[\s-]/g, ""))) return setError("Nomor WhatsApp tidak valid.");
    setError("");
    setTicket({
      code: genCode("FIT", 5),
      name: name.trim(),
      date,
      session,
      items: PRODUCTS.filter((p) => items.includes(p.id)).map((p) => p.name),
    });
  };

  const reset = () => {
    setDate(""); setSession(null); setItems([]); setName(""); setWa(""); setNote(""); setTicket(null);
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <nav className="crumbs"><Link to="/">Beranda</Link> / <span>Fitting</span></nav>
          <h1>Booking Sesi Fitting</h1>
          <p>Coba langsung busana pilihan Anda di butik sebelum menyewa. Gratis, maksimal 3 busana per sesi.</p>
        </div>
      </section>

      <section className="container fit-page">
        <aside className="fit-aside">
          <div className="info-card">
            <h4 className="aside-title">Jadwal Sesi</h4>
            <ul className="sched">
              {FITTING_SESSIONS.map((s) => <li key={s.id}><span>{s.label}</span><strong>{s.time}</strong></li>)}
            </ul>
            <small className="muted-dark">Buka Senin – Sabtu (WIB). Minggu tutup.</small>
          </div>
          <div className="info-card">
            <h4 className="aside-title">Sebelum Datang</h4>
            <ul className="scheme-list">
              <li>Datang 10 menit sebelum sesi dimulai.</li>
              <li>Tunjukkan kode konfirmasi <strong>FIT-xxxxx</strong> ke staf.</li>
              <li>Pakai pakaian dalam yang nyaman (manset/tanktop).</li>
              <li>Bawa aksesori atau sepatu yang akan dipakai, jika ada.</li>
            </ul>
          </div>
          <div className="info-card note-card">
            <strong>Fitting tidak mengunci tanggal sewa.</strong>
            <p>Untuk mengamankan busana di tanggal acara, lanjutkan reservasi dari <Link to="/katalog">katalog</Link>.</p>
          </div>
        </aside>

        <div className="fit-card">
          {!ticket ? (
            <form onSubmit={submit} noValidate>
              <div className="form-step"><span>1</span>Pilih Jadwal</div>
              <div className="fit-row">
                <label htmlFor="fitDate">Tanggal Fitting</label>
                <input type="date" id="fitDate" min={addDays(todayISO(), 1)} value={date} onChange={(e) => { setDate(e.target.value); setSession(null); }} />
              </div>
              <div className="fit-row">
                <label>Pilih Sesi</label>
                <div className="sessions">
                  {!date && <p className="hint">Pilih tanggal terlebih dahulu.</p>}
                  {isSunday && <p className="hint warn">Butik tutup di hari Minggu. Silakan pilih tanggal lain.</p>}
                  {date && !isSunday && sessions.map((s) => {
                    const full = s.left <= 0;
                    return (
                      <button type="button" key={s.id} disabled={full} onClick={() => setSession(s)}
                        className={`session ${full ? "full" : ""} ${session?.id === s.id ? "selected" : ""}`}>
                        <span>{s.label}</span>
                        <strong>{s.time}</strong>
                        <small className={`quota ${full ? "none" : s.left <= 2 ? "low" : "ok"}`}>
                          {full ? "Penuh" : s.left <= 2 ? `Sisa ${s.left} slot` : "Tersedia"}
                        </small>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-step"><span>2</span>Data Diri</div>
              <div className="fit-2col">
                <div className="fit-row">
                  <label htmlFor="fitName">Nama</label>
                  <input id="fitName" placeholder="Nama lengkap" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="fit-row">
                  <label htmlFor="fitWa">No. WhatsApp</label>
                  <input id="fitWa" type="tel" placeholder="08xxxxxxxxxx" value={wa} onChange={(e) => setWa(e.target.value)} />
                </div>
              </div>

              <div className="form-step"><span>3</span>Busana yang Ingin Dicoba</div>
              <div className="fit-row">
                <label>Pilih maksimal 3 <small>({items.length}/{MAX_ITEMS} dipilih)</small></label>
                <div className="pick-list">
                  {options.map((p) => {
                    const on = items.includes(p.id);
                    return (
                      <button type="button" key={p.id} className={`pick ${on ? "on" : ""}`} aria-pressed={on}
                        disabled={!on && items.length >= MAX_ITEMS} onClick={() => toggleItem(p.id)}>
                        <img src={p.img} alt="" /><span>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="fit-row">
                <label htmlFor="fitNote">Catatan <small>(opsional)</small></label>
                <textarea id="fitNote" rows={3} placeholder="Contoh: lingkar dada 92 cm, untuk acara lamaran" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>

              {error && <p className="form-error" role="alert">{error}</p>}
              <button type="submit" className="btn btn-primary btn-block">Konfirmasi Janji Temu</button>
            </form>
          ) : (
            <div className="fit-ticket">
              <div className="ticket-check">✓</div>
              <h3>Janji Temu Terkonfirmasi</h3>
              <p className="ticket-sub">Tunjukkan kode ini saat datang ke butik.</p>
              <div className="ticket-code">{ticket.code}</div>
              <dl className="ticket-detail">
                <div><dt>Nama</dt><dd>{ticket.name}</dd></div>
                <div><dt>Tanggal</dt><dd>{fmtDateLong(ticket.date)}</dd></div>
                <div><dt>Sesi</dt><dd>{ticket.session.label} · {ticket.session.time} WIB</dd></div>
                <div><dt>Busana</dt><dd>{ticket.items.length ? ticket.items.join(", ") : "Belum dipilih (konsultasi di butik)"}</dd></div>
              </dl>
              <button type="button" className="btn btn-outline btn-block" onClick={reset}>Buat Janji Lain</button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
