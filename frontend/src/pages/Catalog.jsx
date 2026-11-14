import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { SearchIcon } from "../components/Icons";
import { useStore } from "../context/StoreContext";
import { SUBCATS } from "../data/products";

const COLORS = [
  { v: "Merah", c: "#7a1f2c" },
  { v: "Hijau", c: "#8fa58a" },
  { v: "Putih", c: "#f4efe6" },
  { v: "Hitam", c: "#1d1b1b" },
  { v: "Biru", c: "#23345e" },
];
const TEMA = [
  { v: "Pernikahan", l: "Pernikahan" },
  { v: "Lamaran", l: "Lamaran" },
  { v: "Wisuda", l: "Wisuda" },
  { v: "Adat", l: "Acara Adat" },
];
const SIZES = ["S", "M", "L", "XL"];

const toggleIn = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

export default function Catalog() {
  const { products, categories, subcatsMap, loadingProducts, dbError } = useStore();
  const [params] = useSearchParams();
  const urlKat = params.get("kategori");

  const validCatIds = useMemo(
    () => (Array.isArray(categories) ? categories.map((c) => c.id) : ["wanita", "pria"]),
    [categories]
  );

  const [kategori, setKategori] = useState(
    urlKat && validCatIds.includes(urlKat) ? urlKat : "semua"
  );
  const [jenis, setJenis] = useState([]);
  const [ukuran, setUkuran] = useState([]);
  const [warna, setWarna] = useState([]);
  const [tema, setTema] = useState([]);
  const [available, setAvailable] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("populer");
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (urlKat && validCatIds.includes(urlKat)) setKategori(urlKat);
  }, [urlKat, validCatIds]);

  const activeSubcatsMap = subcatsMap && Object.keys(subcatsMap).length ? subcatsMap : SUBCATS;
  const jenisList = useMemo(() => {
    if (kategori === "semua") {
      return Array.from(new Set(Object.values(activeSubcatsMap).flat()));
    }
    return activeSubcatsMap[kategori] || [];
  }, [kategori, activeSubcatsMap]);

  useEffect(() => {
    setJenis((j) => j.filter((x) => jenisList.includes(x)));
  }, [kategori, jenisList]);

  const list = useMemo(() => {
    const qq = q.toLowerCase();
    const out = products.filter((p) =>
      (kategori === "semua" || p.cat === kategori) &&
      (!jenis.length || jenis.includes(p.sub)) &&
      (!ukuran.length || p.sizes.some((s) => ukuran.includes(s))) &&
      (!warna.length || warna.includes(p.color)) &&
      (!tema.length || p.tema.some((t) => tema.includes(t))) &&
      (!available || !p.booked) &&
      (!qq || (p.name + " " + p.sub).toLowerCase().includes(qq))
    );
    const sorters = {
      murah: (a, b) => a.price - b.price,
      mahal: (a, b) => b.price - a.price,
      nama: (a, b) => a.name.localeCompare(b.name),
      populer: (a, b) => a.id - b.id,
    };
    return out.sort(sorters[sort]);
  }, [products, kategori, jenis, ukuran, warna, tema, available, q, sort]);

  const resetAll = () => {
    setKategori("semua"); setJenis([]); setUkuran([]); setWarna([]); setTema([]); setAvailable(false); setQ("");
  };

  return (
    <div className={drawer ? "filters-open" : ""}>
      <section className="page-hero">
        <div className="container">
          <nav className="crumbs"><Link to="/">Beranda</Link> / <span>Katalog</span></nav>
          <h1>Katalog Busana</h1>
          <p>Temukan kebaya, beskap, basofi, dan jas yang pas untuk acara Anda.</p>
        </div>
      </section>

      <section className="container catalog">
        <aside className="filters">
          <div className="filters-head">
            <h4>Filter</h4>
            <button className="link-btn" onClick={resetAll}>Reset</button>
            <button className="icon-btn close-filter" aria-label="Tutup filter" onClick={() => setDrawer(false)}>✕</button>
          </div>

          <div className="f-group">
            <h5>Kategori</h5>
            <div className="seg" style={{ flexWrap: "wrap" }}>
              <button
                className={`seg-btn ${kategori === "semua" ? "active" : ""}`}
                onClick={() => setKategori("semua")}
              >
                Semua
              </button>
              {(categories || []).map((c) => (
                <button
                  key={c.id}
                  className={`seg-btn ${kategori === c.id ? "active" : ""}`}
                  onClick={() => setKategori(c.id)}
                >
                  {c.shortLabel || c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="f-group">
            <h5>Jenis Busana</h5>
            <div className="checks">
              {jenisList.map((j) => (
                <label key={j}><input type="checkbox" checked={jenis.includes(j)} onChange={() => setJenis(toggleIn(jenis, j))} /> {j}</label>
              ))}
            </div>
          </div>

          <div className="f-group">
            <h5>Ukuran</h5>
            <div className="size-chips">
              {SIZES.map((s) => (
                <button key={s} className={ukuran.includes(s) ? "on" : ""} aria-pressed={ukuran.includes(s)} onClick={() => setUkuran(toggleIn(ukuran, s))}>{s}</button>
              ))}
            </div>
          </div>

          <div className="f-group">
            <h5>Warna</h5>
            <div className="swatches">
              {COLORS.map((c) => (
                <button key={c.v} style={{ "--c": c.c }} title={c.v} aria-label={c.v} aria-pressed={warna.includes(c.v)}
                  className={warna.includes(c.v) ? "on" : ""} onClick={() => setWarna(toggleIn(warna, c.v))} />
              ))}
            </div>
          </div>

          <div className="f-group">
            <h5>Tema Acara</h5>
            <div className="checks">
              {TEMA.map((t) => (
                <label key={t.v}><input type="checkbox" checked={tema.includes(t.v)} onChange={() => setTema(toggleIn(tema, t.v))} /> {t.l}</label>
              ))}
            </div>
          </div>

          <div className="f-group">
            <label className="toggle"><input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} /> <span>Hanya yang tersedia</span></label>
          </div>
        </aside>

        <div className="catalog-main">
          <div className="toolbar">
            <div className="search">
              <SearchIcon />
              <input type="search" placeholder="Cari busana…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari busana" />
            </div>
            <div className="toolbar-right">
              <span className="count">{list.length} busana</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Urutkan">
                <option value="populer">Terpopuler</option>
                <option value="murah">Harga Terendah</option>
                <option value="mahal">Harga Tertinggi</option>
                <option value="nama">Nama A–Z</option>
              </select>
              <button className="btn btn-outline btn-sm filter-toggle" onClick={() => setDrawer(true)}>Filter</button>
            </div>
          </div>

          {dbError && <p className="hint warn" style={{ marginBottom: 16 }}>{dbError}</p>}

          {loadingProducts && !list.length ? (
            <div className="loading-box"><span className="spinner dark" /> Memuat katalog busana…</div>
          ) : list.length > 0 ? (
            <div className="product-grid cols-3">
              {list.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          ) : (
            <div className="empty">
              <div className="empty-icon">🔍</div>
              <h3>Busana tidak ditemukan</h3>
              <p>Coba ubah kata kunci atau reset filter.</p>
              <button className="btn btn-outline btn-sm" onClick={resetAll}>Reset Filter</button>
            </div>
          )}
        </div>
      </section>
      <div className="filter-backdrop" onClick={() => setDrawer(false)} />
    </div>
  );
}
