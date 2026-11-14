const STEPS = ["Keranjang", "Checkout", "Pembayaran", "Selesai"];

// Indikator langkah alur sewa
export default function Stepper({ current }) {
  return (
    <ol className="stepper" aria-label="Langkah pemesanan">
      {STEPS.map((s, i) => {
        const state = i < current ? "done" : i === current ? "now" : "";
        return (
          <li key={s} className={state} aria-current={i === current ? "step" : undefined}>
            <span className="stepper-dot">{i < current ? "✓" : i + 1}</span>
            <span className="stepper-label">{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
