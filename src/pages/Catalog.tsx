import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, ApiError, type Category, type Product, type TagCount } from "../api";
import { IconFilter } from "../components/Icons";
import { readFilterGroups } from "../settings";
import { ProductCard } from "../components/ProductCard";
import { useStore } from "../store";
import { usePageTitle } from "../title";

const PAGE_SIZE = 24;

export function Catalog() {
  const { slug } = useParams();
  const { user, settings } = useStore();
  const [sp, setSp] = useSearchParams();
  const q = sp.get("q") || "";
  const sort = sp.get("sort") || "featured";
  const inStock = sp.get("in_stock") === "1";
  const priceMin = sp.get("price_min") || "";
  const priceMax = sp.get("price_max") || "";
  const activeTags = (sp.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean);
  const page = Math.max(1, Number(sp.get("page") || 1));
  const [pmin, setPmin] = useState(priceMin);
  const [pmax, setPmax] = useState(priceMax);
  const [allTags, setAllTags] = useState<TagCount[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const cat = cats.find((c) => c.slug === slug);
  // Canonical bez filtrů a stránkování — filtrované kombinace URL tak neředí
  // crawl budget a indexaci (facetová navigace).
  const canonical = `${window.location.origin}${slug ? `/katalog/${slug}` : "/katalog"}`;
  usePageTitle(cat ? `${cat.name} — KAVKA` : q ? `Hledání: ${q} — KAVKA` : "Katalog — KAVKA", undefined, canonical);

  useEffect(() => {
    const controller = new AbortController();
    void api<Category[]>("/categories", { signal: controller.signal })
      .then(setCats)
      .catch(() => undefined);
    void api<TagCount[]>("/tags", { signal: controller.signal })
      .then(setAllTags)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const qs = new URLSearchParams({ sort, limit: String(PAGE_SIZE), page: String(page) });
    if (q) qs.set("q", q);
    if (slug) qs.set("category", slug);
    if (inStock) qs.set("in_stock", "1");
    if (priceMin) qs.set("price_min", priceMin);
    if (priceMax) qs.set("price_max", priceMax);
    if (activeTags.length) qs.set("tags", activeTags.join(","));
    setLoading(true);
    setError("");
    void api<{ items: Product[]; total: number }>(`/products?${qs}`, { signal: controller.signal })
      .then((r) => {
        if (controller.signal.aborted) return;
        setItems(r.items);
        setTotal(r.total);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setError(e instanceof ApiError ? e.message : "Katalog se nepodařilo načíst.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [q, slug, sort, inStock, priceMin, priceMax, activeTags.join(","), page, reload]);

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
    if (priceMin) n.set("price_min", priceMin);
    if (priceMax) n.set("price_max", priceMax);
    if (activeTags.length) n.set("tags", activeTags.join(","));
    const qs = n.toString();
    const path = nextSlug ? `/katalog/${nextSlug}` : "/katalog";
    return qs ? `${path}?${qs}` : path;
  }

  function applyPrice(e: FormEvent) {
    e.preventDefault();
    const min = String(Math.max(0, Number(pmin) || 0)) || "";
    const max = String(Math.max(0, Number(pmax) || 0)) || "";
    if (min && max && Number(min) > Number(max)) {
      patch({ price_min: max || null, price_max: min || null });
    } else {
      patch({ price_min: min || null, price_max: max || null });
    }
  }

  function clearPrice() {
    setPmin("");
    setPmax("");
    patch({ price_min: null, price_max: null });
  }

  /** Přepne štítek ve filtru (víc štítků = zboží s alespoň jedním z nich). */
  function toggleTag(tag: string) {
    const key = tag.toLowerCase();
    const next = activeTags.some((t) => t.toLowerCase() === key)
      ? activeTags.filter((t) => t.toLowerCase() !== key)
      : [...activeTags, tag];
    patch({ tags: next.length ? next.join(",") : null });
  }

  function clearFilters() {
    setPmin("");
    setPmax("");
    patch({ tags: null, price_min: null, price_max: null, in_stock: null });
  }

  const tagActive = (tag: string) => activeTags.some((t) => t.toLowerCase() === tag.toLowerCase());
  // Skupiny filtrů nastavené v administraci; jinak prostě všechny štítky.
  const groups = readFilterGroups(settings);
  const knownTags = new Set(allTags.map((t) => t.tag.toLowerCase()));
  const filterGroups = groups.length
    ? groups.map((g) => ({ title: g.title, tags: g.tags.filter((t) => knownTags.has(t.toLowerCase())) })).filter((g) => g.tags.length)
    : allTags.length
      ? [{ title: "Štítky", tags: allTags.slice(0, 18).map((t) => t.tag) }]
      : [];
  const activeCount = activeTags.length + (priceMin ? 1 : 0) + (priceMax ? 1 : 0) + (inStock ? 1 : 0);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const breadcrumbs = [
    { name: "Domů", url: `${origin}/` },
    { name: "Katalog", url: `${origin}/katalog` },
    ...(cat ? [{ name: cat.name, url: `${origin}/katalog/${cat.slug}` }] : []),
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: b.url,
    })),
  };

  return (
    <div className="wrap shop-catalog">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="crumbs">
        <Link to="/">Domů</Link> / <Link to="/katalog">Katalog</Link>
        {cat ? ` / ${cat.name}` : q ? ` / „${q}“` : ""}
      </div>
      {user?.customer_group === "b2b" && (
        <p className="b2b-banner" style={{ marginTop: 8 }}>
          <b>Velkoobchodní ceník</b>
          <span>{settings.b2b_note || "Ceny vidíte bez DPH, cena s DPH je v druhém řádku."}</span>
        </p>
      )}
      <div className="toolbar">
        <div>
          <h1 className="serif catalog-title">{cat ? cat.name : q ? `Hledání: ${q}` : "Katalog"}</h1>
          <p style={{ color: "var(--muted)", margin: "6px 0 0", maxWidth: 560 }}>
            {loading
              ? "Načítám polici…"
              : cat?.description
                ? cat.description
                : total === 1
                  ? "1 věc na polici"
                  : `${total} věcí z ateliéru`}
          </p>
        </div>
        <div className="toolbar-tools">
          <label className="chip stock-toggle">
            <input type="checkbox" checked={inStock} onChange={(e) => patch({ in_stock: e.target.checked ? "1" : null })} />
            <span className="stock-toggle-label">Jen skladem</span>
          </label>
          <div className="select-wrap">
            <select value={sort} onChange={(e) => patch({ sort: e.target.value })} aria-label="Řazení">
              <option value="featured">Doporučené</option>
              <option value="new">Nejnovější</option>
              <option value="price_asc">Cena vzestupně</option>
              <option value="price_desc">Cena sestupně</option>
              <option value="name">Název</option>
            </select>
          </div>
        </div>
      </div>

      <div className="catalog-filters">
        <div className="cat-chips">
          <Link className={`chip ${!slug ? "on" : ""}`} to={catHref()}>
            Vše
          </Link>
          {cats.map((c) => (
            <Link key={c.id} className={`chip ${slug === c.slug ? "on" : ""}`} to={catHref(c.slug)}>
              {c.name}
            </Link>
          ))}
        </div>

        <form className="price-filter" onSubmit={applyPrice}>
          <span className="price-filter-title">Cena</span>
          <input
            type="number"
            min={0}
            step={10}
            inputMode="numeric"
            placeholder="od"
            aria-label="Cena od"
            value={pmin}
            onChange={(e) => setPmin(e.target.value)}
          />
          <span className="price-filter-sep">–</span>
          <input
            type="number"
            min={0}
            step={10}
            inputMode="numeric"
            placeholder="do"
            aria-label="Cena do"
            value={pmax}
            onChange={(e) => setPmax(e.target.value)}
          />
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Kč</span>
          <button type="submit" className="btn-line btn-sm">
            Filtrovat
          </button>
          {(priceMin || priceMax) && (
            <button type="button" className="price-clear" onClick={clearPrice} aria-label="Zrušit filtr ceny">
              ✕
            </button>
          )}
        </form>

        {/* Filtry podle štítků — skupiny se nastavují v administraci */}
        {filterGroups.length > 0 && (
          <div className={`tag-filters${filtersOpen ? " open" : ""}`}>
            <button type="button" className="tag-filters-toggle" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen}>
              <IconFilter size={16} />
              Filtry
              {activeCount > 0 && <span className="tag-filters-badge">{activeCount}</span>}
              <span className="tag-filters-caret" aria-hidden="true">
                {filtersOpen ? "▲" : "▼"}
              </span>
            </button>
            <div className="tag-filters-panel">
              {filterGroups.map((g) => (
                <div key={g.title} className="tag-filter-group">
                  <span className="tag-filter-title">{g.title}</span>
                  <div className="tag-filter-chips">
                    {g.tags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`chip tag-chip${tagActive(t) ? " on" : ""}`}
                        onClick={() => toggleTag(t)}
                        aria-pressed={tagActive(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {activeCount > 0 && (
                <button type="button" className="linkish tag-filters-clear" onClick={clearFilters}>
                  Zrušit všechny filtry
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Přehled aktivních filtrů */}
      {activeTags.length > 0 && (
        <div className="active-filters" aria-label="Aktivní filtry">
          {activeTags.map((t) => (
            <button key={t} type="button" className="active-filter" onClick={() => toggleTag(t)}>
              {t} <span aria-hidden="true">✕</span>
            </button>
          ))}
          <button type="button" className="linkish" onClick={clearFilters}>
            Zrušit vše
          </button>
        </div>
      )}
      {error ? (
        <div className="empty" role="alert">
          <h2 className="serif" style={{ color: "var(--ink)" }}>Katalog si dává pauzu</h2>
          <p>{error}</p>
          <button type="button" className="btn" onClick={() => setReload((n) => n + 1)}>
            Zkusit znovu
          </button>
        </div>
      ) : loading ? (
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
