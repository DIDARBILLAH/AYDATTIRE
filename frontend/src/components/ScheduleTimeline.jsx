import { buildSchedule, fmtDate } from "../utils/format";

// Ringkasan jadwal sewa (Ambil → Pakai → Kembali → Laundry)
export default function ScheduleTimeline({ type, eventDate, compact = false }) {
  const sched = buildSchedule(type, eventDate).filter((s) => !compact || s.role !== "range");
  if (!sched.length) return null;
  return (
    <ol className={`sched-tl ${compact ? "compact" : ""}`}>
      {sched.map((s) => (
        <li key={s.date} className={`st-${s.role}`}>
          <span className="st-label">{s.label}</span>
          <strong>{fmtDate(s.date, { weekday: "short", day: "numeric", month: "short" })}</strong>
          <small>{s.note}</small>
        </li>
      ))}
    </ol>
  );
}
