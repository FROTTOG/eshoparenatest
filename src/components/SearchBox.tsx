import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, type Product } from "../api";
import { czk } from "../format";
import { IconSearch } from "./Icons";

export function SearchBox({
  variant = "header",
  onDone,
}: {
  variant?: "header" | "overlay" | "mobile";
  onDone?: () => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const timer = useRef(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [loc.pathname, loc.search]);

  useEffect(() => {
    function hide(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", hide);
    return () => document.removeEventListener("mousedown", hide);
  }, []);

  function onChange(v: string) {
    setQ(v);
    window.clearTimeout(timer.current);
    if (v.trim().length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }
    timer.current = window.setTimeout(() => {
      void api<{ items: Product[] }>(`/products?q=${encodeURIComponent(v.trim())}&limit=6`).then((r) => {
        setHits(r.items);
        setOpen(true);
      });
    }, 220) as unknown as number;
  }

  function search(e: FormEvent) {
    e.preventDefault();
    nav(`/katalog?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
    onDone?.();
  }

  return (
    <div className={`search-wrap ${variant}`} ref={box}>
      <form className={variant === "overlay" ? "search-overlay-form glass-card" : "search-form"} onSubmit={search}>
        <IconSearch size={16} />
        <input
          value={q}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          placeholder={variant === "overlay" ? "Hrnek, deka, vůně…" : variant === "mobile" ? "Hledat v ateliéru…" : "Hledat…"}
          aria-label="Hledat"
          aria-autocomplete="list"
          autoComplete="off"
          autoFocus={variant === "overlay"}
        />
        {variant === "overlay" && (
          <button className="btn" type="submit">
            Hledat
          </button>
        )}
      </form>
      {open && (
        <div className="search-suggest glass-card" role="listbox">
          {hits.length ? (
            hits.map((p) => (
              <Link
                key={p.id}
                to={`/produkt/${p.slug}`}
                className="search-hit"
                onClick={() => {
                  setOpen(false);
                  onDone?.();
                }}
              >
                <img src={p.image || "/products/hrnek.jpg"} alt="" />
                <span>
                  <b>{p.name}</b>
                  <small>
                    {p.category_name || "KAVKA"} · {czk(p.price)}
                  </small>
                </span>
              </Link>
            ))
          ) : (
            <div className="search-hit muted">Nic jsme nenašli. Zkuste celé slovo.</div>
          )}
          {q.trim() && (
            <button
              type="button"
              className="search-hit all"
              onClick={() => {
                nav(`/katalog?q=${encodeURIComponent(q.trim())}`);
                setOpen(false);
                onDone?.();
              }}
            >
              Hledat „{q.trim()}“ v katalogu
            </button>
          )}
        </div>
      )}
    </div>
  );
}
