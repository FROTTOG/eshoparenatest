import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Product } from "../api";
import { ProductCard } from "../components/ProductCard";
import { useStore } from "../store";
import { usePageTitle } from "../title";

export function WishlistPage() {
  const { wishlist, toggleWish } = useStore();
  usePageTitle("Oblíbené — KAVKA", "Vaše uložené kousky z ateliéru KAVKA.");
  const [fresh, setFresh] = useState<Product[]>([]);

  useEffect(() => {
    if (!wishlist.length) {
      setFresh([]);
      return;
    }
    const ids = wishlist.map((w) => w.id).join(",");
    void api<{ items: Product[] }>(`/products?ids=${ids}&limit=48`).then((r) => setFresh(r.items));
  }, [wishlist]);

  const byId = new Map(fresh.map((p) => [p.id, p]));
  const items = wishlist.map((w) => byId.get(w.id) || (w as Product));

  if (!wishlist.length) {
    return (
      <div className="wrap empty">
        <h1 className="serif">Zatím tu nic nehřeje</h1>
        <p>Srdíčkem u produktu si odložíte kousky, ke kterým se chcete vrátit.</p>
        <Link className="btn" to="/katalog">
          Do katalogu
        </Link>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="crumbs">
        <Link to="/">Domů</Link> / Oblíbené
      </div>
      <div className="toolbar">
        <div>
          <h1 className="serif catalog-title">Oblíbené</h1>
          <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>
            {wishlist.length === 1 ? "1 uložená věc" : `${wishlist.length} uložených věcí`}
          </p>
        </div>
      </div>
      <div className="grid-products">
        {items.map((p, i) => (
          <div key={p.id} className="wish-cell">
            <ProductCard p={p} index={i} />
            <button type="button" className="linkish wish-remove" onClick={() => toggleWish(p)}>
              Odebrat
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
