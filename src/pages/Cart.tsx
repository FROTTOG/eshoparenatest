import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, type Cart as C } from "../api";
import { czk } from "../format";
import { useStore } from "../store";

export function CartPage() {
  const { cart, setCart, toast } = useStore();
  const [code, setCode] = useState("");

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
        <h1 className="serif">Košík je prázdný</h1>
        <p>Dejte si do něj něco s kresbou dřeva nebo glazurou.</p>
        <Link className="btn" to="/katalog">
          Do katalogu
        </Link>
      </div>
    );
  }

  return (
    <div className="wrap two">
      <div>
        <h1 className="serif">Košík</h1>
        {cart.items.map((it) => (
          <div className="line-item" key={it.id}>
            <Link to={`/produkt/${it.slug}`}>
              <img src={it.image} alt="" />
            </Link>
            <div>
              <Link to={`/produkt/${it.slug}`}>
                <strong>{it.name}</strong>
              </Link>
              <div style={{ color: "var(--muted)", fontSize: 13 }}>{it.sku}</div>
              <div className="qty" style={{ marginTop: 8 }}>
                <button onClick={() => void qty(it.id, it.quantity - 1)}>−</button>
                <span>{it.quantity}</span>
                <button onClick={() => void qty(it.id, it.quantity + 1)}>+</button>
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
      </div>
      <aside className="summary">
        <h2 className="serif" style={{ marginTop: 0 }}>
          Součet
        </h2>
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
            <strong>{czk(cart.subtotal - cart.discount)}</strong>
          </div>
        </dl>
        <form onSubmit={coupon} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Kupón"
            style={{ flex: 1, border: "1px solid var(--line)", borderRadius: 999, padding: "10px 12px" }}
          />
          <button className="btn-line" type="submit">
            Použít
          </button>
        </form>
        {cart.coupon && (
          <p style={{ fontSize: 13 }}>
            Použitý kupón <b>{cart.coupon.code}</b>{" "}
            <button
              className="linkish"
              onClick={() => void api<C>("/cart/coupon", { method: "DELETE" }).then(setCart)}
            >
              odebrat
            </button>
          </p>
        )}
        {cart.coupon_error && <p className="err">{cart.coupon_error}</p>}
        <Link className="btn" to="/pokladna" style={{ display: "block", textAlign: "center" }}>
          K pokladně
        </Link>
      </aside>
    </div>
  );
}
