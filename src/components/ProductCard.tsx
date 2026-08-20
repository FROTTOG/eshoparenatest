import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Product } from "../api";
import { optimizedImage } from "../image";
import { useStore } from "../store";
import { trackAddToCart } from "../analytics";
import { IconCart, IconCheck } from "./Icons";
import { Reveal } from "./Reveal";
import { Price, Stars, Stock } from "./Ui";
import { WishButton } from "./WishButton";

export function ProductCard({ p, index = 0 }: { p: Product; index?: number }) {
  const { addToCart, toast, settings } = useStore();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const vatRate = Number(settings.invoice_vat_rate || 21);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function add() {
    if (busy || p.stock <= 0) return;
    setBusy(true);
    try {
      await addToCart(p.id);
      trackAddToCart({ item_id: p.sku, item_name: p.name, price: p.price, quantity: 1, item_category: p.category_name }, p.price);
      setAdded(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setAdded(false), 1800);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Nešlo vložit.", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Reveal delay={(index % 4) * 70} className="reveal-cell">
      <article className="pcard">
        <div className="pcard-media">
          <Link to={`/produkt/${p.slug}`} className="pcard-img" aria-label={`Detail produktu ${p.name}`}>
            {p.compare_price && p.compare_price > p.price ? <span className="sale">Akce</span> : null}
            <img
              src={optimizedImage(p.image)}
              alt={p.name}
              loading={index < 2 ? "eager" : "lazy"}
              decoding="async"
              width={640}
              height={640}
              fetchPriority={index === 0 ? "high" : "auto"}
            />
          </Link>
          <WishButton p={p} />
        </div>
        <div className="pcard-body">
          <div className="cat">{p.category_name || "KAVKA"}</div>
          <h3>
            <Link to={`/produkt/${p.slug}`}>{p.name}</Link>
          </h3>
          <Stars value={p.rating} count={p.review_count || 0} />
          <Price price={p.price} compare={p.compare_price} vatRate={vatRate} />
          <Stock n={p.stock} />
          <button
            className={`btn-line${added ? " btn-added" : ""}${busy ? " btn-busy" : ""}`}
            style={{ marginTop: "auto" }}
            disabled={p.stock <= 0 || busy}
            aria-live="polite"
            onClick={() => void add()}
          >
            {busy ? (
              <span className="btn-spinner" aria-hidden="true" />
            ) : added ? (
              <IconCheck size={16} />
            ) : (
              <IconCart size={16} />
            )}
            {p.stock <= 0 ? "Vyprodáno" : added ? "V košíku" : "Do košíku"}
          </button>
        </div>
      </article>
    </Reveal>
  );
}
