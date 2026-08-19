import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError, type PaymentMethod, type PickupPoint, type ShippingMethod } from "../api";
import { PickupChooser } from "../components/CarrierMaps";
import { IconBox, IconCard, IconCash, IconLocker, IconParcel, IconPin, IconQr, IconShop, IconTruck, IconWrap } from "../components/Icons";
import { czk, pointTypeLabel } from "../format";
import { useStore } from "../store";

function shipIcon(kind: string) {
  if (kind === "pickup_zbox") return <IconLocker />;
  if (kind === "pickup_zasilkovna") return <IconPin />;
  if (kind === "pickup_balikovna") return <IconParcel />;
  if (kind === "store") return <IconShop />;
  return <IconTruck />;
}

function payIcon(code: string) {
  if (code === "transfer") return <IconQr />;
  if (code === "cod") return <IconBox />;
  if (code === "card_delivery") return <IconCard />;
  return <IconCash />;
}

export function Checkout() {
  const { user, cart, refresh, toast, settings } = useStore();
  const nav = useNavigate();
  const [shipping, setShipping] = useState<ShippingMethod[]>([]);
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [ship, setShip] = useState("");
  const [pay, setPay] = useState("");
  const [point, setPoint] = useState<PickupPoint | null>(null);
  const [map, setMap] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: user?.email || "",
    name: user?.name || "",
    phone: user?.phone || "",
    street: "",
    city: "",
    zip: "",
    note: "",
  });

  useEffect(() => {
    void api<ShippingMethod[]>("/shipping").then((rows) => {
      setShipping(rows);
      if (rows[0]) setShip(rows[0].code);
    });
    void api<PaymentMethod[]>("/payments").then(setPayments);
  }, []);

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, email: user.email, name: user.name, phone: user.phone || f.phone }));
  }, [user]);

  const selectedShip = shipping.find((s) => s.code === ship);
  const pickupType =
    selectedShip?.kind === "pickup_zbox"
      ? "zbox"
      : selectedShip?.kind === "pickup_balikovna"
        ? "balikovna"
        : selectedShip?.kind === "pickup_zasilkovna"
          ? "branch"
          : "";

  const allowedPay = useMemo(() => {
    return payments.filter((p) => p.allowed_shipping === "*" || p.allowed_shipping.split(",").map((x) => x.trim()).includes(ship));
  }, [payments, ship]);

  useEffect(() => {
    if (allowedPay.length && !allowedPay.some((p) => p.code === pay)) setPay(allowedPay[0].code);
  }, [allowedPay, pay]);

  const sub = cart ? cart.subtotal - cart.discount : 0;
  const shipPrice = selectedShip ? (selectedShip.free_over != null && sub >= selectedShip.free_over ? 0 : selectedShip.price) : 0;
  const payFee = allowedPay.find((p) => p.code === pay)?.fee || 0;
  const total = sub + shipPrice + payFee;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pickupType && !point) {
      toast("Nejdřív vyberte výdejní místo na mapě.", "err");
      setMap(true);
      return;
    }
    setBusy(true);
    try {
      const r = await api<{ order: { number: string } }>("/checkout", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          shipping_code: ship,
          payment_code: pay,
          pickup_point_id: point && point.id > 0 ? point.id : undefined,
          pickup: point
            ? {
                external_id: point.external_id,
                name: point.name,
                address: point.address,
                city: point.city,
                zip: point.zip,
                lat: point.lat,
                lng: point.lng,
                opening_hours: point.opening_hours,
                type: point.type,
                carrier: point.carrier,
                source: point.source,
              }
            : undefined,
        }),
      });
      await refresh();
      nav(`/objednavka/${r.order.number}`);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Objednávku nešlo odeslat.", "err");
    } finally {
      setBusy(false);
    }
  }

  if (!cart) return <div className="wrap empty">Chystáme pokladnu…</div>;
  if (!cart.items.length) {
    return (
      <div className="wrap empty">
        <p>Košík je prázdný — zatím tu nic nečeká.</p>
        <Link className="btn" to="/katalog">
          Zpět do obchodu
        </Link>
      </div>
    );
  }

  return (
    <div className="wrap two checkout">
      <form onSubmit={submit}>
        <p className="kicker">Krok poslední</p>
        <h1 className="serif">Pokladna</h1>
        <div className="form glass-card" style={{ marginBottom: 18 }}>
          <h3 className="serif" style={{ margin: 0 }}>
            Vaše údaje
          </h3>
          {!user && (
            <p style={{ margin: 0, fontSize: 14 }}>
              Už u nás máte účet? <Link to="/prihlaseni">Přihlaste se</Link> — nebo pokračujte jako host, nic se neztratí.
            </p>
          )}
          <label>
            E-mail
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
          </label>
          <label>
            Jméno a příjmení
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
          </label>
          <label>
            Telefon
            <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" inputMode="tel" />
          </label>
        </div>

        <h3 className="serif">Kam to poslat</h3>
        {shipping.map((s) => (
          <label key={s.code} className={`choice ${ship === s.code ? "active" : ""}`}>
            <input
              type="radio"
              name="ship"
              checked={ship === s.code}
              onChange={() => {
                setShip(s.code);
                setPoint(null);
              }}
              style={{ display: "none" }}
            />
            <IconWrap>{shipIcon(s.kind)}</IconWrap>
            <span>
              <b>{s.name}</b>
              <small>
                {s.description} · {s.eta}
                {s.free_over ? ` · zdarma od ${czk(s.free_over)}` : ""}
              </small>
            </span>
            <b>{s.free_over != null && sub >= s.free_over ? "zdarma" : czk(s.price)}</b>
          </label>
        ))}

        {pickupType && (
          <div className="form glass-card pickup-card" style={{ margin: "8px 0 18px" }}>
            {point ? (
              <div className="pickup-chosen">
                <IconWrap className="accent">{pickupType === "zbox" ? <IconLocker /> : pickupType === "balikovna" ? <IconParcel /> : <IconPin />}</IconWrap>
                <div>
                  <div className="kicker">{point.source === "packeta" ? "Mapa Packety" : point.source === "balikovna" ? "Mapa Balíkovny" : pointTypeLabel(point.type)}</div>
                  <b>{point.name}</b>
                  <div style={{ color: "var(--muted)" }}>
                    {point.address}, {point.zip} {point.city}
                    {point.opening_hours ? (
                      <>
                        <br />
                        {point.opening_hours}
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0 }}>Ještě nemáte vybrané místo. Otevřete živou mapu dopravce — uvidíte aktuální pobočky i boxy.</p>
            )}
            <button type="button" className="btn" onClick={() => setMap(true)}>
              {point ? "Změnit na mapě" : pickupType === "balikovna" ? "Otevřít mapu Balíkovny" : "Otevřít mapu Zásilkovny"}
            </button>
          </div>
        )}

        {selectedShip?.kind === "address" && (
          <div className="form glass-card" style={{ marginBottom: 18 }}>
            <h3 className="serif" style={{ margin: 0 }}>
              Doručovací adresa
            </h3>
            <label>
              Ulice a č. p.
              <input required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} autoComplete="street-address" />
            </label>
            <label>
              Město
              <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} autoComplete="address-level2" />
            </label>
            <label>
              PSČ
              <input required value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} autoComplete="postal-code" inputMode="numeric" />
            </label>
          </div>
        )}

        <h3 className="serif">Jak zaplatíte</h3>
        {allowedPay.map((p) => (
          <label key={p.code} className={`choice ${pay === p.code ? "active" : ""}`}>
            <input type="radio" name="pay" checked={pay === p.code} onChange={() => setPay(p.code)} style={{ display: "none" }} />
            <IconWrap>{payIcon(p.code)}</IconWrap>
            <span>
              <b>{p.name}</b>
              <small>{p.description}</small>
            </span>
            <b>{p.fee ? `+ ${czk(p.fee)}` : "zdarma"}</b>
          </label>
        ))}

        <label className="form glass-card" style={{ marginTop: 16 }}>
          Poznámka k objednávce
          <textarea rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Třeba kód od brány, nebo „balíček jako dárek“." />
        </label>

        <button className="btn checkout-submit" disabled={busy} style={{ marginTop: 18 }} type="submit">
          {busy ? "Posíláme objednávku…" : `Objednat za ${czk(total)}`}
        </button>
      </form>

      <aside className="summary glass-card">
        <h2 className="serif" style={{ marginTop: 0 }}>
          Shrnutí
        </h2>
        {cart.items.map((it) => (
          <div key={it.id} className="summary-line">
            <span>
              {it.name} × {it.quantity}
            </span>
            <span>{czk(it.price * it.quantity)}</span>
          </div>
        ))}
        <dl>
          <div>
            <span>Mezisoučet</span>
            <span>{czk(cart.subtotal)}</span>
          </div>
          {cart.discount > 0 && (
            <div>
              <span>Sleva</span>
              <span>−{czk(cart.discount)}</span>
            </div>
          )}
          <div>
            <span>Doprava</span>
            <span>{shipPrice ? czk(shipPrice) : "zdarma"}</span>
          </div>
          {payFee > 0 && (
            <div>
              <span>Platba</span>
              <span>{czk(payFee)}</span>
            </div>
          )}
          <div>
            <strong>Celkem</strong>
            <strong>{czk(total)}</strong>
          </div>
        </dl>
      </aside>

      <div className="checkout-bar">
        <span>
          Celkem <b>{czk(total)}</b>
        </span>
        <button className="btn" disabled={busy} form="" onClick={(e) => {
          const formEl = (e.currentTarget.closest(".checkout") as HTMLElement | null)?.querySelector("form");
          formEl?.requestSubmit();
        }}>
          {busy ? "Posíláme…" : "Objednat"}
        </button>
      </div>

      {map && pickupType && (
        <PickupChooser
          type={pickupType}
          selected={point}
          apiKey={settings.packeta_api_key}
          onSelect={(p) => {
            setPoint(p);
            setMap(false);
            toast("Místo je vybrané.");
          }}
          onClose={() => setMap(false)}
        />
      )}
    </div>
  );
}
