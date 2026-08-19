import { Link } from "react-router-dom";
import type { Product } from "../api";
import { useStore } from "../store";
import { IconCart } from "./Icons";
import { Reveal } from "./Reveal";
import { Price, Stars, Stock } from "./Ui";
import { WishButton } from "./WishButton";

export function ProductCard({ p, index = 0 }: { p: Product; index?: number }) {
  const { addToCart, toast } = useStore();
  return (
    <Reveal delay={(index % 4) * 70} className="reveal-cell">
      <article className="pcard">
        <Link to={`/produkt/${p.slug}`} className="pcard-img">
          {p.compare_price && p.compare_price > p.price ? <span className="sale">Akce</span> : null}
          <WishButton p={p} />
          <img src={p.image || "/products/hrnek.jpg"} alt={p.name} loading="lazy" />
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
            onClick={() =>
              void addToCart(p.id).catch((e) => toast(e instanceof Error ? e.message : "Nešlo vložit.", "err"))
            }
          >
            <IconCart size={16} /> {p.stock <= 0 ? "Vyprodáno" : "Do košíku"}
          </button>
        </div>
      </article>
    </Reveal>
  );
}
