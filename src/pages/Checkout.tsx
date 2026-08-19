import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError, type AresResult, type PaymentMethod, type PickupPoint, type ShippingMethod } from "../api";
import { PickupChooser } from "../components/CarrierMaps";
import {
  IconBox,
  IconBuilding,
  IconCard,
  IconCash,
  IconCheck,
  IconLocker,
  IconParcel,
  IconPin,
  IconQr,
  IconSearch,
  IconShield,
  IconShop,
  IconTruck,
  IconWrap,
} from "../components/Icons";
import { czk, pointTypeLabel } from "../format";
import { useStore } from "../store";
import { usePageTitle } from "../title";

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
  usePageTitle("Pokladna — KAVKA");
  const { user, cart, refresh, toast, settings } = useStore();
  const nav = useNavigate();
  const [shipping, setShipping] = useState<ShippingMethod[]>([]);
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [ship, setShip] = useState("");
  const [pay, setPay] = useState("");
  const [point, setPoint] = useState<PickupPoint | null>(null);
  const [map, setMap] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aresLoading, setAresLoading] = useState(false);
  const [addresses, setAddresses] = useState<{ id: number; label: string; name: string; street: string; city: string; zip: string; phone: string }[]>([]);

  const [form, setForm] = useState({
    email: user?.email || "",
    name: user?.name || "",
    phone: user?.phone || "",
    // Fakturační údaje (povinné)
    billing_name: user?.name || "",
    billing_street: "",
    billing_city: "",
    billing_zip: "",
    billing_country: "CZ",
    // Firemní nákup
    is_company: false,
    company_name: "",
    ico: "",
    dic: "",
    // Doručovací adresa
    different_shipping: false,
    shipping_recipient: "",
    shipping_street: "",
    shipping_city: "",
    shipping_zip: "",
    shipping_country: "CZ",
    // Souhlasy a poznámka
    note: "",
    agree_terms: false,
  });

  useEffect(() => {
    void api<ShippingMethod[]>("/shipping").then((rows) => {
      setShipping(rows);
      if (rows[0]) setShip(rows[0].code);
    });
    void api<PaymentMethod[]>("/payments").then(setPayments);
  }, []);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        email: user.email,
        name: f.name || user.name,
        billing_name: f.billing_name || user.name,
        phone: user.phone || f.phone,
      }));
      void api<{ addresses: typeof addresses }>("/account").then((r) => {
        const rows = r.addresses || [];
        setAddresses(rows);
        const def = rows[0];
        if (def) {
          setForm((f) => ({
            ...f,
            billing_name: f.billing_name || def.name,
            billing_street: f.billing_street || def.street,
            billing_city: f.billing_city || def.city,
            billing_zip: f.billing_zip || def.zip,
            phone: f.phone || def.phone || user.phone || "",
          }));
        }
      });
    }
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

  async function lookupAres() {
    const rawIco = form.ico.replace(/\s+/g, "");
    if (!/^\d{8}$/.test(rawIco)) {
      toast("Zadejte platné 8místné IČO pro vyhledání v ARES.", "err");
      return;
    }
    setAresLoading(true);
    try {
      const res = await api<AresResult>(`/ares?ico=${rawIco}`);
      if (res.ok) {
        setForm((f) => ({
          ...f,
          company_name: res.company_name || f.company_name,
          billing_street: res.street || f.billing_street,
          billing_city: res.city || f.billing_city,
          billing_zip: res.zip || f.billing_zip,
          dic: res.dic || f.dic,
        }));
        toast("Údaje firmy byly úspěšně načteny z registru ARES.");
      } else {
        toast(res.error || "Firma nebyla v ARES nalezena.", "err");
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Registr ARES není dostupný. Zadejte údaje ručně.", "err");
    } finally {
      setAresLoading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (!form.agree_terms) {
      toast("Pro dokončení nákupu musíte odsouhlasit obchodní podmínky a GDPR.", "err");
      return;
    }

    if (form.is_company) {
      if (!form.company_name.trim()) {
        toast("Při nákupu na firmu zadejte název společnosti.", "err");
        return;
      }
      if (!form.ico.trim()) {
        toast("Při nákupu na firmu zadejte platné IČO.", "err");
        return;
      }
    }

    const billingName = form.billing_name.trim() || form.name.trim();
    if (!billingName) {
      toast("Zadejte fakturační jméno a příjmení.", "err");
      return;
    }
    if (!form.billing_street.trim() || !form.billing_city.trim() || !form.billing_zip.trim()) {
      toast("Vyplňte kompletní povinnou fakturační adresu (ulici, město i PSČ).", "err");
      return;
    }

    if (pickupType && !point) {
      toast("Nejdřív vyberte výdejní místo na mapě.", "err");
      setMap(true);
      return;
    }

    if (selectedShip?.kind === "address" && form.different_shipping) {
      if (
        !form.shipping_recipient.trim() ||
        !form.shipping_street.trim() ||
        !form.shipping_city.trim() ||
        !form.shipping_zip.trim()
      ) {
        toast("Vyplňte kompletní doručovací adresu nebo zrušte volbu doručení na jinou adresu.", "err");
        return;
      }
    }

    setBusy(true);
    try {
      const r = await api<{ order: { number: string } }>("/checkout", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          name: billingName,
          phone: form.phone,
          billing_name: billingName,
          billing_street: form.billing_street,
          billing_city: form.billing_city,
          billing_zip: form.billing_zip,
          billing_country: form.billing_country,
          is_company: form.is_company,
          company_name: form.company_name,
          ico: form.ico,
          dic: form.dic,
          different_shipping: form.different_shipping,
          shipping_recipient: form.different_shipping ? form.shipping_recipient : billingName,
          street: form.different_shipping ? form.shipping_street : form.billing_street,
          city: form.different_shipping ? form.shipping_city : form.billing_city,
          zip: form.different_shipping ? form.shipping_zip : form.billing_zip,
          country: form.different_shipping ? form.shipping_country : form.billing_country,
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
          note: form.note,
          agree_terms: form.agree_terms,
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
        <h1 className="serif" style={{ marginTop: 4 }}>
          Pokladna
        </h1>

        {/* 1. KONTAKTNÍ ÚDAJE */}
        <div className="form glass-card" style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h3 className="serif" style={{ margin: 0 }}>
              1. Kontaktní údaje
            </h3>
            {!user && (
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                Máte účet? <Link to="/prihlaseni?next=/pokladna" className="linkish">Přihlaste se</Link>
              </span>
            )}
          </div>
          <div className="form-grid-2">
            <label>
              E-mail pro potvrzení <span className="req">*</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
                placeholder="např. jan.novak@email.cz"
              />
            </label>
            <label>
              Telefon pro dopravce <span className="req">*</span>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                autoComplete="tel"
                inputMode="tel"
                placeholder="+420 777 123 456"
              />
            </label>
          </div>
        </div>

        {/* 2. POVINNÁ FAKTURAČNÍ ADRESA A NÁKUP NA FIRMU */}
        <div className="form glass-card" style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <h3 className="serif" style={{ margin: 0 }}>
              2. Fakturační údaje <span className="req">*</span>
            </h3>
            <label className="checkbox-toggle" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
              <input
                type="checkbox"
                checked={form.is_company}
                onChange={(e) => setForm({ ...form, is_company: e.target.checked })}
              />
              <b>Nakoupit na firmu (IČO / DIČ)</b>
            </label>
          </div>

          {/* Firemní pole */}
          {form.is_company && (
            <div className="company-box glass-card" style={{ padding: 14, borderRadius: 14, background: "rgba(255,255,255,0.7)", border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, color: "var(--forest)" }}>
                <IconBuilding size={18} />
                <strong>Firemní údaje</strong>
              </div>
              <div className="form-grid-2">
                <label>
                  IČO <span className="req">*</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      required={form.is_company}
                      value={form.ico}
                      onChange={(e) => setForm({ ...form, ico: e.target.value })}
                      placeholder="8místné číslo (např. 19200456)"
                    />
                    <button
                      type="button"
                      className="btn-line"
                      style={{ padding: "0 14px", whiteSpace: "nowrap" }}
                      onClick={lookupAres}
                      disabled={aresLoading}
                      title="Automaticky načíst název firmy a sídlo z registru ARES"
                    >
                      {aresLoading ? "Načítám…" : <><IconSearch size={14} /> ARES</>}
                    </button>
                  </div>
                </label>
                <label>
                  DIČ <small style={{ color: "var(--muted)" }}>(volitelné)</small>
                  <input
                    value={form.dic}
                    onChange={(e) => setForm({ ...form, dic: e.target.value })}
                    placeholder="např. CZ19200456"
                  />
                </label>
              </div>
              <label style={{ marginTop: 8 }}>
                Název společnosti / Obchodní jméno <span className="req">*</span>
                <input
                  required={form.is_company}
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  placeholder="např. KAVKA Ateliér s.r.o."
                />
              </label>
            </div>
          )}

          {addresses.length > 0 && (
            <div className="saved-addresses">
              <span className="kicker">Uložené adresy</span>
              <div className="saved-address-row">
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="chip"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        billing_name: a.name,
                        billing_street: a.street,
                        billing_city: a.city,
                        billing_zip: a.zip,
                        phone: a.phone || f.phone,
                      }))
                    }
                  >
                    {a.label}: {a.street}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-grid-2">
            <label>
              {form.is_company ? "Kontaktní osoba (Jméno a příjmení)" : "Jméno a příjmení"} <span className="req">*</span>
              <input
                required
                value={form.billing_name}
                onChange={(e) => setForm({ ...form, billing_name: e.target.value, name: e.target.value })}
                autoComplete="name"
                placeholder="Jan Novák"
              />
            </label>
            <label>
              Fakturační země <span className="req">*</span>
              <select
                value={form.billing_country}
                onChange={(e) => setForm({ ...form, billing_country: e.target.value })}
              >
                <option value="CZ">Česká republika</option>
                <option value="SK">Slovensko</option>
              </select>
            </label>
          </div>

          <label>
            Ulice a číslo popisné / orientační <span className="req">*</span>
            <input
              required
              value={form.billing_street}
              onChange={(e) => setForm({ ...form, billing_street: e.target.value })}
              autoComplete="street-address"
              placeholder="Vinohradská 42/115"
            />
          </label>

          <div className="form-grid-2">
            <label>
              Město <span className="req">*</span>
              <input
                required
                value={form.billing_city}
                onChange={(e) => setForm({ ...form, billing_city: e.target.value })}
                autoComplete="address-level2"
                placeholder="Praha"
              />
            </label>
            <label>
              PSČ <span className="req">*</span>
              <input
                required
                value={form.billing_zip}
                onChange={(e) => setForm({ ...form, billing_zip: e.target.value })}
                autoComplete="postal-code"
                inputMode="numeric"
                placeholder="120 00"
              />
            </label>
          </div>
        </div>

        {/* 3. ZPŮSOB DOPRAVY */}
        <h3 className="serif">3. Kam to poslat</h3>
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

        {/* Výběr výdejního místa */}
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
              {point ? "Změnit výdejní místo na mapě" : pickupType === "balikovna" ? "Otevřít mapu Balíkovny" : "Otevřít mapu Zásilkovny"}
            </button>
          </div>
        )}

        {/* Doručení na adresu - volba jiné doručovací adresy */}
        {selectedShip?.kind === "address" && (
          <div className="form glass-card" style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <h3 className="serif" style={{ margin: 0 }}>
                Doručení kurýrem
              </h3>
              <label className="checkbox-toggle" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
                <input
                  type="checkbox"
                  checked={form.different_shipping}
                  onChange={(e) => setForm({ ...form, different_shipping: e.target.checked })}
                />
                <span>Doručit na jinou adresu než fakturační</span>
              </label>
            </div>

            {!form.different_shipping ? (
              <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.6)", borderRadius: 12, fontSize: 14, color: "var(--ink-soft)" }}>
                <IconCheck size={16} style={{ verticalAlign: "middle", marginRight: 6, color: "var(--ok)" }} />
                Zboží bude doručeno na fakturační adresu:{" "}
                <b>
                  {form.billing_street || "Ulice"}, {form.billing_zip || "PSČ"} {form.billing_city || "Město"}
                </b>
              </div>
            ) : (
              <div className="shipping-address-fields" style={{ display: "grid", gap: 12, marginTop: 8 }}>
                <div className="form-grid-2">
                  <label>
                    Jméno a příjmení příjemce <span className="req">*</span>
                    <input
                      required={form.different_shipping}
                      value={form.shipping_recipient}
                      onChange={(e) => setForm({ ...form, shipping_recipient: e.target.value })}
                      placeholder="Jméno příjemce balíčku"
                    />
                  </label>
                  <label>
                    Doručovací země <span className="req">*</span>
                    <select
                      value={form.shipping_country}
                      onChange={(e) => setForm({ ...form, shipping_country: e.target.value })}
                    >
                      <option value="CZ">Česká republika</option>
                      <option value="SK">Slovensko</option>
                    </select>
                  </label>
                </div>
                <label>
                  Doručovací ulice a č. p. <span className="req">*</span>
                  <input
                    required={form.different_shipping}
                    value={form.shipping_street}
                    onChange={(e) => setForm({ ...form, shipping_street: e.target.value })}
                    placeholder="Ulice a č.p. kam zásilku doručit"
                  />
                </label>
                <div className="form-grid-2">
                  <label>
                    Doručovací město <span className="req">*</span>
                    <input
                      required={form.different_shipping}
                      value={form.shipping_city}
                      onChange={(e) => setForm({ ...form, shipping_city: e.target.value })}
                      placeholder="Město"
                    />
                  </label>
                  <label>
                    Doručovací PSČ <span className="req">*</span>
                    <input
                      required={form.different_shipping}
                      value={form.shipping_zip}
                      onChange={(e) => setForm({ ...form, shipping_zip: e.target.value })}
                      placeholder="PSČ"
                      inputMode="numeric"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. ZPŮSOB PLATBY */}
        <h3 className="serif">4. Jak zaplatíte</h3>
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

        {/* 5. POZNÁMKA */}
        <label className="form glass-card" style={{ marginTop: 16 }}>
          Poznámka k objednávce
          <textarea
            rows={2}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Třeba kód od brány, patro, nebo „balíček jako dárek“."
          />
        </label>

        {/* 6. ZÁKONNÉ SOUHLASY A ODESLÁNÍ (Dle NOZ a GDPR) */}
        <div className="form glass-card legal-card" style={{ marginTop: 16 }}>
          <label className="legal-checkbox" style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 13 }}>
            <input
              type="checkbox"
              required
              checked={form.agree_terms}
              onChange={(e) => setForm({ ...form, agree_terms: e.target.checked })}
              style={{ marginTop: 3 }}
            />
            <span>
              Souhlasím s <Link to="/obchodni-podminky" target="_blank" className="linkish">obchodními podmínkami</Link> a beru na vědomí{" "}
              <Link to="/ochrana-udaju" target="_blank" className="linkish">zásady zpracování osobních údajů</Link> dle GDPR. <span className="req">*</span>
            </span>
          </label>

          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
            <IconShield size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Odesláním objednávky potvrzujete, že jste se seznámili s Obchodními podmínkami a Zásadami zpracování osobních údajů.
            Cena objednávky je konečná včetně všech daní a poplatků.
          </div>
        </div>

        {/* Hlavní tlačítko se zákonnou formulací závazku platby */}
        <button className="btn checkout-submit" disabled={busy} style={{ marginTop: 18, width: "100%", padding: "16px 24px", fontSize: 14 }} type="submit">
          {busy ? "Odesíláme objednávku…" : `Objednat s povinností platby · ${czk(total)}`}
        </button>
      </form>

      {/* Shrnutí objednávky v pravém sloupci */}
      <aside className="summary glass-card">
        <h2 className="serif" style={{ marginTop: 0 }}>
          Shrnutí nákupu
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
              <span>Sleva {cart.coupon?.code ? `(${cart.coupon.code})` : ""}</span>
              <span>−{czk(cart.discount)}</span>
            </div>
          )}
          <div>
            <span>Doprava ({selectedShip?.name || "Vyberte"})</span>
            <span>{shipPrice ? czk(shipPrice) : "zdarma"}</span>
          </div>
          {payFee > 0 && (
            <div>
              <span>Platba ({payments.find((p) => p.code === pay)?.name || ""})</span>
              <span>{czk(payFee)}</span>
            </div>
          )}
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: 6 }}>
            <strong>Celkem k úhradě</strong>
            <strong style={{ fontSize: 20, color: "var(--accent)" }}>{czk(total)}</strong>
          </div>
        </dl>
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "8px 0 0" }}>
          {settings.store_vat_note || "Všechny ceny jsou konečné včetně DPH."}
        </p>
      </aside>

      {/* Mobilní plovoucí lišta */}
      <div className="checkout-bar">
        <span>
          Celkem <b>{czk(total)}</b>
        </span>
        <button
          className="btn"
          disabled={busy}
          onClick={(e) => {
            const formEl = (e.currentTarget.closest(".checkout") as HTMLElement | null)?.querySelector("form");
            formEl?.requestSubmit();
          }}
        >
          {busy ? "Posíláme…" : "Objednat s povinností platby"}
        </button>
      </div>

      {/* Mapa pro výběr výdejního místa */}
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
