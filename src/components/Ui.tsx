import { Link } from "react-router-dom";
import { czk } from "../format";

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="KAVKA Ateliér — domů">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="#1c1915" />
        <path d="M14 42c8-2 12-11 14-20 1 7 4 14 12 18 3-8 8-14 16-16-6 8-8 16-7 24H18c-1-8-2-14-4-6z" fill="#f4efe6" />
        <circle cx="40" cy="22" r="2.2" fill="#b54a2c" />
      </svg>
      <span>
        KAVKA
        <small>ateliér</small>
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

export function Price({ price, compare }: { price: number; compare?: number | null }) {
  return (
    <div className="price">
      {compare && compare > price ? <s>{czk(compare)}</s> : null}
      {czk(price)}
    </div>
  );
}

export function Tag({ status }: { status: string }) {
  return <span className={`tag ${status}`}>{status}</span>;
}
