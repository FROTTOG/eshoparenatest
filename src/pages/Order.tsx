import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, type Order, type Settings } from "../api";
import { PayQr } from "../components/PayQr";
import { czk, dateCs, statusLabel } from "../format";
import { useStore } from "../store";

export function OrderPage() {
  const { number } = useParams();
  const { settings } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!number) return;
    setErr("");
    void api<{ order: Order }>(`/orders/${number}`)
      .then((r) => setOrder(r.order))
      .catch((e) => setErr(e instanceof ApiError ? e.message : "Nepodařilo se načíst."));
  }, [number]);

  if (err) {
    return (
      <div className="wrap empty">
        <p>{err}</p>
        <Link to="/sledovani">Vyhledat podle e-mailu</Link>
      </div>
    );
  }
  if (!order) return <div className="wrap empty">Načítám objednávku…</div>;

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="crumbs">
        <Link to="/">Domů</Link> / <Link to="/ucet/objednavky">Objednávky</Link> / {order.number}
      </div>
      <h1 className="serif">Objednávka {order.number}</h1>
      <p>
        <span className={`tag ${order.status}`}>{statusLabel(order.status)}</span>{" "}
        <span className="tag">{statusLabel(order.payment_status)}</span>
        <span style={{ marginLeft: 10, color: "var(--muted)" }}>{dateCs(order.created_at)}</span>
      </p>

      {order.payment_code === "transfer" && order.payment_status === "pending" && (
        <div className="form" style={{ margin: "18px 0" }}>
          <h3 className="serif" style={{ margin: 0 }}>
            Zaplatit převodem
          </h3>
          <PayQr amount={order.total} vs={order.number} message={`KAVKA ${order.number}`} settings={settings as Settings} />
        </div>
      )}

      <div className="two">
        <div>
          {order.items.map((it) => (
            <div className="line-item" key={it.id}>
              <div />
              <div>
                <strong>{it.name}</strong>
                <div style={{ color: "var(--muted)" }}>
                  {it.sku} · {it.quantity} × {czk(it.price)}
                </div>
              </div>
              <div>{czk(it.price * it.quantity)}</div>
            </div>
          ))}
        </div>
        <aside className="summary">
          <div>
            <b>Doprava</b>
            <p>
              {order.shipping_name}
              <br />
              {order.pickup ? (
                <>
                  {order.pickup.name}
                  <br />
                  {order.pickup.address}, {order.pickup.zip} {order.pickup.city}
                </>
              ) : (
                <>
                  {order.street}
                  <br />
                  {order.zip} {order.city}
                </>
              )}
            </p>
          </div>
          <div>
            <b>Platba</b>
            <p>{order.payment_name}</p>
          </div>
          <dl>
            <div>
              <span>Zboží</span>
              <span>{czk(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div>
                <span>Sleva {order.coupon_code}</span>
                <span>−{czk(order.discount)}</span>
              </div>
            )}
            <div>
              <span>Doprava</span>
              <span>{czk(order.shipping_price)}</span>
            </div>
            {order.payment_fee > 0 && (
              <div>
                <span>Poplatek</span>
                <span>{czk(order.payment_fee)}</span>
              </div>
            )}
            <div>
              <strong>Celkem</strong>
              <strong>{czk(order.total)}</strong>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

export function Track() {
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState("");

  async function go(e: FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const r = await api<{ order: Order }>("/orders/lookup", { method: "POST", body: JSON.stringify({ number, email }) });
      setOrder(r.order);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Nenalezeno.");
    }
  }

  return (
    <div className="auth-wrap">
      <h1>Sledování objednávky</h1>
      <p>Zadejte číslo z potvrzení a e-mail, který jste vyplnili u pokladny.</p>
      <form className="form" onSubmit={go}>
        <label>
          Číslo (KAV-…)
          <input value={number} onChange={(e) => setNumber(e.target.value)} required />
        </label>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {err && <div className="err">{err}</div>}
        <button className="btn-dark">Najít</button>
      </form>
      {order && (
        <p>
          Našli jsme <Link to={`/objednavka/${order.number}`}>{order.number}</Link> — {statusLabel(order.status)}, {czk(order.total)}.
        </p>
      )}
    </div>
  );
}
