import { useEffect, useRef } from "react";

// Animasi hitung angka saat elemen terlihat di layar
export default function CountUp({ to, decimals = 0, suffix = "", prefix = "", duration = 1800, as: Tag = "strong" }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (n) => n.toLocaleString("id-ID", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = prefix + fmt(to) + suffix;
      return;
    }
    let raf;
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        el.textContent = prefix + fmt(to * (1 - Math.pow(1 - t, 3))) + suffix;
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, decimals, suffix, prefix, duration]);

  return <Tag ref={ref}>{prefix}0{suffix}</Tag>;
}
