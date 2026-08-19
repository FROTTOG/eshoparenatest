import { Link } from "react-router-dom";
import type { Product } from "../api";
import { useStore } from "../store";
import { Price, Stars, Stock } from "./Ui";

export function ProductCard({ p }: { p: Product }) {
  const { addToCart } = useStore();
  return (
    <article className="pcard">
      <Link to={`/produkt/${p.slug}`} className="pcard-img">
        {p.compare_price && p.compare_price > p.price ? <span className="sale">Akce</span> : null}
        <img src={p.image || "/products/hrnek.jpg"} alt={p.name} />
      </Link>
      <div className="pcard-body">
        <div className="cat">{p.category_name || "KAVKA"}</div>
        <h3>
          <Link to={`/produkt/${p.slug}`}>{p.name}</Link>
        </h3>
        <Stars value={p.rating} count={p.review_count || 0} />
        <Price price={p.price} compare={p.compare_price} />
        <Stock n={p.stock} />
        <button
          className="btn-line"
          style={{ marginTop: "auto" }}
          disabled={p.stock <= 0}
          onClick={() => void addToCart(p.id).catch((e) => alert(e.message))}
        >
          Do košíku
        </button>
      </div>
    </article>
  );
}
