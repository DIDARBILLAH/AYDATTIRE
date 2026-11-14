import { useMemo, useState } from "react";
import { useStore } from "../context/StoreContext";
import { addDays, buildSchedule, checkEventDate, fromISO, isBookedDate, toISO, todayISO } from "../utils/format";
import { ChevronLeft, ChevronRight } from "./Icons";

const DOW = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/**
 * Kalender interaktif sewa.
 * Klik 1 tanggal (hari acara) → otomatis menyorot rentang ambil/pakai/kembali + laundry.
 * Terintegrasi dengan jadwal terisi (bookedDatesByProduct) dari Supabase / StoreContext.
 */
export default function RentalCalendar({ productIds, type, value, onChange }) {
  const { bookedDatesByProduct, loadingOrders } = useStore();
  const initial = value ? fromISO(value) : new Date();
  const [view, setView] = useState({ y: initial.getFullYear(), m: initial.getMonth() });
  const [hover, setHover] = useState(null);
  const [msg, setMsg] = useState("");

  const today = todayISO();
  const nowMonth = new Date();
  const canPrev = view.y > nowMonth.getFullYear() || (view.y === nowMonth.getFullYear() && view.m > nowMonth.getMonth());

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const offset = (first.getDay() + 6) % 7; // mulai Senin
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(toISO(new Date(view.y, view.m, d)));
    return arr;
  }, [view]);

  const roleMap = useMemo(() => {
    const target = hover || value;
    const map = {};
    if (target) buildSchedule(type, target).forEach((s) => (map[s.date] = s.role));
    return map;
  }, [hover, value, type]);

  const shift = (n) => {
    setView((v) => {
      const d = new Date(v.y, v.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const pick = (iso) => {
    const res = checkEventDate(productIds, type, iso, bookedDatesByProduct);
    if (!res.ok) {
      setMsg(
        res.reason === "booked" ? "Rentang tanggal ini bentrok dengan jadwal sewa lain. Pilih tanggal lain."
        : res.reason === "sunday" ? "Pengambilan jatuh di hari Minggu (butik tutup). Pilih tanggal lain."
        : type === "luar_kota" ? "Sewa luar kota minimal dipesan 5 hari sebelum acara."
        : "Tanggal terlalu dekat. Pengambilan paling cepat besok."
      );
      return;
    }
    setMsg("");
    onChange(iso);
  };

  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const hoverValid = hover ? checkEventDate(productIds, type, hover, bookedDatesByProduct).ok : true;

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" className="icon-btn" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Bulan sebelumnya"><ChevronLeft /></button>
        <strong>
          {monthLabel}
          {loadingOrders && <small className="cal-sync"> · menyinkronkan jadwal…</small>}
        </strong>
        <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Bulan berikutnya"><ChevronRight /></button>
      </div>

      <div className="cal-grid" onMouseLeave={() => setHover(null)}>
        {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {cells.map((iso, i) => {
          if (!iso) return <div key={"e" + i} />;
          const past = iso <= today;
          const booked = !past && productIds.some((pid) => isBookedDate(pid, iso, bookedDatesByProduct));
          const role = roleMap[iso];
          const cls = [
            "cal-day",
            past && "past",
            booked && "booked",
            !past && !booked && "avail",
            role && `r-${role}`,
            role && hover && !hoverValid && "invalid",
            iso === value && "chosen",
          ].filter(Boolean).join(" ");
          return (
            <button
              type="button"
              key={iso}
              className={cls}
              disabled={past || booked}
              onMouseEnter={() => setHover(iso)}
              onFocus={() => setHover(iso)}
              onBlur={() => setHover(null)}
              onClick={() => pick(iso)}
              aria-label={fromISO(iso).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" }) + (booked ? " — sudah dibooking" : "")}
              aria-pressed={iso === value}
            >
              {fromISO(iso).getDate()}
            </button>
          );
        })}
      </div>

      {msg && <p className="hint warn cal-msg" role="alert">{msg}</p>}

      <div className="cal-legend">
        <span><i className="lg-avail" /> Tersedia</span>
        <span><i className="lg-booked" /> Dibooking / Maintenance</span>
        <span><i className="lg-ambil" /> {type === "luar_kota" ? "Diterima / Kirim balik" : "Ambil / Kembali"}</span>
        <span><i className="lg-pakai" /> Hari acara</span>
        <span><i className="lg-laundry" /> Laundry</span>
      </div>
    </div>
  );
}

export { addDays };
