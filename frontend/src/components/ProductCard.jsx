import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { rupiah } from "../utils/format";
import { HeartIcon } from "./Icons";

export default function ProductCard({ p }) {
  const { isFav, toggleFav } = useStore();
  const fav = isFav(p.id);

  return (
    <article className="product">
      <Link to={`/produk/${p.id}`} className="p-link" aria-label={p.name}>
        <div className="p-img">
          <img src={p.img} alt={p.name} loading="lazy" />
          <span className={`p-tag ${p.booked ? "booked" : ""}`}>{p.tag}</span>
        </div>
        <div className="p-body">
          <div className="p-cat">{p.cat === "pria" ? "Pria" : "Wanita"} · {p.sub}</div>
          <h3 className="p-name">{p.name}</h3>
          <div className="p-sizes">{p.sizes.map((s) => <span key={s}>{s}</span>)}</div>
          <div className="p-foot">
            <div className="p-price"><strong>{rupiah(p.price)}</strong> <small>/ 3 hari</small></div>
            <div className="p-dep">Deposit<br />{rupiah(p.deposit)}</div>
          </div>
        </div>
      </Link>
      <button
        className={`p-fav ${fav ? "on" : ""}`}
        aria-label={fav ? "Hapus dari favorit" : "Simpan ke favorit"}
        aria-pressed={fav}
        onClick={() => toggleFav(p.id)}
      >
        <HeartIcon />
      </button>
    </article>
  );
}
