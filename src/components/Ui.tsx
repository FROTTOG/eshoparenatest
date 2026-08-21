import { Link } from "react-router-dom";
import { useStore } from "../store";
import { czk, priceWithoutVat } from "../format";

const DEFAULT_SVG =
  '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#1c1915"/><path d="M14 42c8-2 12-11 14-20 1 7 4 14 12 18 3-8 8-14 16-16-6 8-8 16-7 24H18c-1-8-2-14-4-6z" fill="#f4efe6"/><circle cx="40" cy="22" r="2.2" fill="#b54a2c"/></svg>';

export function Logo() {
  const { settings } = useStore();
  const title = settings.logo_title || "KAVKA";
  const sub = settings.logo_subtext || "ateliér";
  const customSvg = settings.logo_svg;
  return (
    <Link to="/" className="logo" aria-label={`${title} — domů`}>
      {customSvg ? (
        <span className="logo-svg" dangerouslySetInnerHTML={{ __html: customSvg }} />
      ) : (
        <span className="logo-svg" dangerouslySetInnerHTML={{ __html: DEFAULT_SVG }} />
      )}
      <span>
        {title}
        <small>{sub}</small>
      </span>
    </Link>
  );
}

export function Stars({ value, count }: { value?: number | null; count?: number }) {
  const v = value || 0;
  const full = Math.round(v);
  return (
    <span className="stars" title={v ? `${v} / 5` : "Zatím bez hodnocení"} aria-label={v ? `Hodnocení ${v} z 5` : "Bez hodnocení"}>
      {"★★★★★".slice(0, full)}
      <span style={{ opacity: 0.25 }}>{"★★★★★".slice(full)}</span>
      {count != null && <span style={{ marginLeft: 8, color: "var(--muted)", letterSpacing: 0, fontSize: 13 }}>({count})</span>}
    </span>
  );
}

export function Stock({ n }: { n: number }) {
  if (n <= 0) return <span className="stock-out">Vyprodáno</span>;
  if (n <= 5) return <span className="stock-low">Poslední {n} ks</span>;
  return <span className="stock-ok">Skladem</span>;
}

/**
 * Cena produktu. Běžný zákazník vidí cenu s DPH (a v závorce bez DPH),
 * velkoobchodní zákazník (skupina B2B) vidí jako hlavní číslo cenu **bez DPH**
 * a k tomu doporučenou maloobchodní cenu, aby věděl, jaká je jeho marže.
 */
export function Price({
  price,
  compare,
  vatRate,
  retail,
}: {
  price: number;
  compare?: number | null;
  vatRate?: number;
  retail?: number | null;
}) {
  const { user } = useStore();
  const rate = vatRate ?? 21;
  const b2b = user?.customer_group === "b2b";
  const without = priceWithoutVat(price, rate);
  if (b2b) {
    return (
      <div className="price price-b2b">
        <span className="b2b-badge">Velkoobchod</span>
        {czk(without)} <small className="price-unit">bez DPH</small>
        <small className="price-sub">
          {czk(price)} s DPH
          {retail && retail > price ? ` · doporučená MOC ${czk(retail)}` : ""}
        </small>
      </div>
    );
  }
  return (
    <div className="price">
      {compare && compare > price ? <s>{czk(compare)}</s> : null}
      {czk(price)}{" "}
      <small style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
        ({czk(without)} bez DPH)
      </small>
    </div>
  );
}

export function Tag({ status }: { status: string }) {
  return <span className={`tag ${status}`}>{status}</span>;
}
