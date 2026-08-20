import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, type Order, type Settings } from "../api";
import { PayQr } from "../components/PayQr";
import { czk, dateCs, statusLabel } from "../format";
import { useStore } from "../store";
import { usePageTitle } from "../title";

export function OrderPage() {
  usePageTitle("Objednávka — KAVKA");
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

      <p>
        <a className="btn-line btn-sm" href={`/api/orders/${order.number}/invoice`} target="_blank" rel="noreferrer">
          Faktura ke stažení (PDF / tisk)
        </a>
      </p>

      {order.payment_code === "transfer" && order.payment_status === "pending" && order.total > 0 && (
        <div className="form" style={{ margin: "18px 0" }}>
          <h3 className="serif" style={{ margin: 0 }}>
            Zaplatit převodem
          </h3>
          <PayQr amount={order.total} vs={order.number} message={`KAVKA ${order.number}`} settings={settings as Settings} />
        </div>
      )}

      <div className="two">
        <div>
          <h2 className="serif" style={{ marginTop: 0 }}>
            Položky v objednávce
          </h2>
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

          <div className="order-details-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
            <div className="glass-card" style={{ padding: 16, borderRadius: 16, border: "1px solid var(--line)" }}>
              <b style={{ display: "block", marginBottom: 6 }}>Fakturační údaje</b>
              <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>
                {order.is_company ? (
                  <>
                    <b style={{ color: "var(--ink)" }}>{order.company_name}</b>
                    <br />
                    IČO: {order.ico} {order.dic ? `· DIČ: ${order.dic}` : ""}
                    <br />
                    Kontaktní osoba: {order.billing_name || order.name}
                  </>
                ) : (
                  <b>{order.billing_name || order.name}</b>
                )}
                <br />
                {order.billing_street || order.street}
                <br />
                {order.billing_zip || order.zip} {order.billing_city || order.city}
                <br />
                {order.billing_country || order.country || "CZ"}
              </div>
            </div>

            <div className="glass-card" style={{ padding: 16, borderRadius: 16, border: "1px solid var(--line)" }}>
              <b style={{ display: "block", marginBottom: 6 }}>Doručení a kontakt</b>
              <div style={{ fontSize: 14, color: "var(--ink-soft)" }}>
                <b>{order.shipping_name}</b>
                <br />
                {order.pickup ? (
                  <>
                    {order.pickup.name}
                    <br />
                    {order.pickup.address}, {order.pickup.zip} {order.pickup.city}
                  </>
                ) : (
                  <>
                    {order.shipping_recipient ? (
                      <>
                        {order.shipping_recipient}
                        <br />
                      </>
                    ) : null}
                    {order.street}
                    <br />
                    {order.zip} {order.city}
                  </>
                )}
                <br />
                <span style={{ color: "var(--muted)" }}>
                  {order.email} · {order.phone}
                </span>
              </div>
            </div>
          </div>
        </div>
        <aside className="summary">
          <div>
            <b>Doprava</b>
            <p>
              {order.shipping_name}
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
          <p style={{ fontSize: 11, color: "var(--muted)", margin: "10px 0 0" }}>
            {settings.store_vat_note || "Všechny ceny jsou konečné včetně DPH."}
          </p>
        </aside>
      </div>
    </div>
  );
}

export function Track() {
  usePageTitle("Sledování zásilky — KAVKA");
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
      <h1>Kde je balíček</h1>
      <p>Číslo z potvrzení a e-mail, který jste vyplnili u pokladny. Nic jiného nepotřebujeme.</p>
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
