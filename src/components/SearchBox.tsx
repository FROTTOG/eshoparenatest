import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, type Product } from "../api";
import { czk } from "../format";
import { optimizedImage } from "../image";
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
  const timer = useRef<number | undefined>(undefined);
  const request = useRef<AbortController | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [loc.pathname, loc.search]);

  useEffect(() => {
    return () => {
      window.clearTimeout(timer.current);
      request.current?.abort();
    };
  }, []);

  useEffect(() => {
    function hide(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", hide);
    return () => document.removeEventListener("mousedown", hide);
  }, []);

  function onChange(v: string) {
    const query = v.trim();
    setQ(v);
    window.clearTimeout(timer.current);
    request.current?.abort();

    if (query.length < 2) {
      setHits([]);
      setOpen(false);
      return;
    }

    timer.current = window.setTimeout(() => {
      const controller = new AbortController();
      request.current = controller;
      void api<{ items: Product[] }>(`/products?q=${encodeURIComponent(query)}&limit=6`, { signal: controller.signal })
        .then((r) => {
          if (controller.signal.aborted) return;
          setHits(r.items);
          setOpen(true);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setHits([]);
          setOpen(true);
        });
    }, 220);
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
                <img src={optimizedImage(p.image)} alt="" loading="lazy" decoding="async" width={44} height={44} />
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
