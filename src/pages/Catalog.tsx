import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, type Category, type Product } from "../api";
import { ProductCard } from "../components/ProductCard";
import { usePageTitle } from "../title";

const PAGE_SIZE = 24;

export function Catalog() {
  const { slug } = useParams();
  const [sp, setSp] = useSearchParams();
  const q = sp.get("q") || "";
  const sort = sp.get("sort") || "featured";
  const inStock = sp.get("in_stock") === "1";
  const page = Math.max(1, Number(sp.get("page") || 1));
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const cat = cats.find((c) => c.slug === slug);
  usePageTitle(cat ? `${cat.name} — KAVKA` : q ? `Hledání: ${q} — KAVKA` : "Katalog — KAVKA");

  useEffect(() => {
    void api<Category[]>("/categories").then(setCats);
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams({ sort, limit: String(PAGE_SIZE), page: String(page) });
    if (q) qs.set("q", q);
    if (slug) qs.set("category", slug);
    if (inStock) qs.set("in_stock", "1");
    setLoading(true);
    void api<{ items: Product[]; total: number }>(`/products?${qs}`)
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
      })
      .finally(() => setLoading(false));
  }, [q, slug, sort, inStock, page]);

  function patch(next: Record<string, string | null>, resetPage = true) {
    const n = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(next)) {
      if (!v) n.delete(k);
      else n.set(k, v);
    }
    if (resetPage) n.delete("page");
    setSp(n);
  }

  function catHref(nextSlug?: string) {
    const n = new URLSearchParams();
    if (q) n.set("q", q);
    if (sort !== "featured") n.set("sort", sort);
    if (inStock) n.set("in_stock", "1");
    const qs = n.toString();
    const path = nextSlug ? `/katalog/${nextSlug}` : "/katalog";
    return qs ? `${path}?${qs}` : path;
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="wrap">
      <div className="crumbs">
        <Link to="/">Domů</Link> / <Link to="/katalog">Katalog</Link>
        {cat ? ` / ${cat.name}` : q ? ` / „${q}“` : ""}
      </div>
      <div className="toolbar">
        <div>
          <h1 className="serif catalog-title">{cat ? cat.name : q ? `Hledání: ${q}` : "Celý obchod"}</h1>
          <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>
            {loading
              ? "Načítám polici…"
              : cat?.description || (total === 1 ? "1 věc" : `${total} věcí, které mají váhu v ruce`)}
          </p>
        </div>
        <div className="toolbar-tools">
          <label className="chip stock-toggle">
            <input type="checkbox" checked={inStock} onChange={(e) => patch({ in_stock: e.target.checked ? "1" : null })} />
            Jen skladem
          </label>
          <select value={sort} onChange={(e) => patch({ sort: e.target.value })} aria-label="Řazení">
            <option value="featured">Doporučené</option>
            <option value="new">Nejnovější</option>
            <option value="price_asc">Cena vzestupně</option>
            <option value="price_desc">Cena sestupně</option>
            <option value="name">Název</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        <Link className={`chip ${!slug ? "on" : ""}`} to={catHref()}>
          Vše
        </Link>
        {cats.map((c) => (
          <Link key={c.id} className={`chip ${slug === c.slug ? "on" : ""}`} to={catHref(c.slug)}>
            {c.name}
          </Link>
        ))}
      </div>
      {loading ? (
        <div className="grid-products">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="pcard">
              <div className="skel" style={{ aspectRatio: "1" }} />
              <div className="pcard-body">
                <div className="skel" style={{ height: 12, width: 80 }} />
                <div className="skel" style={{ height: 22, width: "70%" }} />
                <div className="skel" style={{ height: 18, width: 96 }} />
              </div>
            </div>
          ))}
        </div>
      ) : items.length ? (
        <>
          <div className="grid-products">
            {items.map((p, i) => (
              <ProductCard key={p.id} p={p} index={i} />
            ))}
          </div>
          {pages > 1 && (
            <nav className="pager" aria-label="Stránkování katalogu">
              <button type="button" disabled={page <= 1} onClick={() => patch({ page: String(page - 1) }, false)}>
                ←
              </button>
              {Array.from({ length: pages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={page === i + 1 ? "on" : ""}
                  onClick={() => patch({ page: String(i + 1) }, false)}
                >
                  {i + 1}
                </button>
              ))}
              <button type="button" disabled={page >= pages} onClick={() => patch({ page: String(page + 1) }, false)}>
                →
              </button>
            </nav>
          )}
        </>
      ) : (
        <div className="empty">
          <h2 className="serif" style={{ color: "var(--ink)" }}>
            Nic jsme nenašli
          </h2>
          <p>Zkuste jiné slovo, jinou kategorii, nebo vypněte filtr skladu.</p>
          <Link className="btn" to="/katalog">
            Celý katalog
          </Link>
        </div>
      )}
    </div>
  );
}
