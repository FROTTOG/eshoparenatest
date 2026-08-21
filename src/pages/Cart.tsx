import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, type Cart as C, type Product } from "../api";
import { czk, pickupFreeOver } from "../format";
import { OptimizedImg } from "../components/OptimizedImg";
import { useStore } from "../store";
import { usePageTitle } from "../title";
import { trackAddToCart } from "../analytics";

export function CartPage() {
  const { cart, setCart, toast, shipping, addToCart } = useStore();
  const [code, setCode] = useState("");
  const [upsells, setUpsells] = useState<Product[]>([]);
  usePageTitle("Košík — KAVKA", "Váš nákupní košík v ateliéru KAVKA.");
  const freeOver = pickupFreeOver(shipping);

  const cartKey = cart?.items.map((i) => i.product_id).join(",") || "";
  useEffect(() => {
    if (!cartKey) {
      setUpsells([]);
      return;
    }
    void api<{ items: Product[] }>("/cart/upsells")
      .then((r) => setUpsells(r.items || []))
      .catch(() => setUpsells([]));
  }, [cartKey]);

  async function qty(id: number, quantity: number) {
    try {
      setCart(await api<C>(`/cart/items/${id}`, { method: "PATCH", body: JSON.stringify({ quantity }) }));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Chyba", "err");
    }
  }

  async function coupon(e: FormEvent) {
    e.preventDefault();
    try {
      setCart(await api<C>("/cart/coupon", { method: "POST", body: JSON.stringify({ code }) }));
      toast("Kupón je použitý.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Kupón nešel použít.", "err");
    }
  }

  if (!cart) return <div className="wrap empty">Načítám košík…</div>;
  if (!cart.items.length) {
    return (
      <div className="wrap empty">
        <h1 className="serif">Košík si odpočívá</h1>
        <p>Dejte do něj něco z katalogu — na pokladně vyberete Z-BOX, Zásilkovnu nebo Balíkovnu na živé mapě.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
          <Link className="btn" to="/katalog">
            Do katalogu
          </Link>
        </div>
      </div>
    );
  }

  const goods = cart.subtotal - cart.discount;
  const remain = freeOver != null ? Math.max(0, freeOver - goods) : 0;
  const shipPct = freeOver ? Math.min(100, Math.round((goods / freeOver) * 100)) : 100;

  return (
    <div className="wrap two">
      <div>
        <h1 className="serif">Košík</h1>
        {cart.items.map((it) => (
          <div className="line-item" key={it.id}>
            <Link to={`/produkt/${it.slug}`}>
              <OptimizedImg src={it.image} alt={it.name} loading="lazy" decoding="async" width={88} height={88} />
            </Link>
            <div>
              <Link to={`/produkt/${it.slug}`}>
                <strong>{it.name}</strong>
              </Link>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>{it.sku}</div>
              <div className="qty" style={{ marginTop: 8 }}>
                <button type="button" onClick={() => void qty(it.id, it.quantity - 1)} aria-label="Méně">
                  −
                </button>
                <span>{it.quantity}</span>
                <button type="button" onClick={() => void qty(it.id, it.quantity + 1)} aria-label="Více">
                  +
                </button>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div>{czk(it.price * it.quantity)}</div>
              <button className="linkish" onClick={() => void qty(it.id, 0)}>
                Odebrat
              </button>
            </div>
          </div>
        ))}
        {upsells.length > 0 && (
          <div className="upsell-box">
            <h2 className="serif" style={{ margin: "24px 0 8px", fontSize: 22 }}>
              Přidat jedním klikem
            </h2>
            <p className="muted-note" style={{ marginTop: 0 }}>
              Doporučené doplňky k zboží v košíku — třeba zápalky ke svíčce.
            </p>
            {upsells.map((u) => (
              <div className="upsell-row" key={u.id}>
                <OptimizedImg src={u.image} alt="" width={56} height={56} loading="lazy" decoding="async" />
                <div>
                  <Link to={`/produkt/${u.slug}`}>
                    <strong>{u.name}</strong>
                  </Link>
                  <div style={{ color: "var(--muted)", fontSize: 13 }}>{u.short_description || u.sku}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>{czk(u.price)}</div>
                  <button
                    type="button"
                    className="btn-sm btn"
                    onClick={async () => {
                      try {
                        await addToCart(u.id, 1);
                        trackAddToCart({ item_id: u.sku, item_name: u.name, price: u.price, quantity: 1 }, u.price);
                      } catch (err) {
                        toast(err instanceof ApiError ? err.message : "Nešlo přidat.", "err");
                      }
                    }}
                  >
                    Přidat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p style={{ marginTop: 18 }}>
          <Link className="text-link" to="/katalog">
            ← Pokračovat v nákupu
          </Link>
        </p>
      </div>
      <aside className="summary">
        <h2 className="serif" style={{ marginTop: 0 }}>
          Součet
        </h2>
        <div className="ship-meter">
          {remain > 0 ? (
            <>
              Do dopravy zdarma na výdejní místo zbývá <b>{czk(remain)}</b>
            </>
          ) : (
            <>Výdejní místo máte <b>zdarma</b></>
          )}
          <div className="ship-meter-bar" aria-hidden>
            <span style={{ width: `${shipPct}%` }} />
          </div>
        </div>
        <dl>
          <div>
            <span>Mezisoučet</span>
            <span>{czk(cart.subtotal)}</span>
          </div>
          {cart.discount > 0 && (
            <div>
              <span>Sleva {cart.coupon?.code}</span>
              <span>−{czk(cart.discount)}</span>
            </div>
          )}
          <div>
            <strong>Zboží</strong>
            <strong>{czk(goods)}</strong>
          </div>
        </dl>
        <form onSubmit={coupon} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Kupón"
            aria-label="Kód kupónu"
            style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 999, padding: "10px 12px" }}
          />
          <button className="btn-line" type="submit">
            Použít
          </button>
        </form>
        {cart.coupon && (
          <p style={{ fontSize: 13 }}>
            Použitý kupón <b>{cart.coupon.code}</b>{" "}
            <button className="linkish" onClick={() => void api<C>("/cart/coupon", { method: "DELETE" }).then(setCart)}>
              odebrat
            </button>
          </p>
        )}
        {cart.coupon_error && <p className="err">{cart.coupon_error}</p>}
        <Link className="btn" to="/pokladna" style={{ display: "block", textAlign: "center" }}>
          K pokladně
        </Link>
        <p className="muted-note">Zásilkovna i Balíkovna mají na pokladně živou mapu.</p>
      </aside>
    </div>
  );
}
