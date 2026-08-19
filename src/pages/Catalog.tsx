import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, type Category, type Product } from "../api";
import { ProductCard } from "../components/ProductCard";

export function Catalog() {
  const { slug } = useParams();
  const [sp, setSp] = useSearchParams();
  const q = sp.get("q") || "";
  const sort = sp.get("sort") || "featured";
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    void api<Category[]>("/categories").then(setCats);
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams({ sort, limit: "24" });
    if (q) qs.set("q", q);
    if (slug) qs.set("category", slug);
    void api<{ items: Product[]; total: number }>(`/products?${qs}`).then((r) => {
      setItems(r.items);
      setTotal(r.total);
    });
  }, [q, slug, sort]);

  const cat = cats.find((c) => c.slug === slug);

  return (
    <div className="wrap">
      <div className="crumbs">
        <Link to="/">Domů</Link> / <Link to="/katalog">Katalog</Link>
        {cat ? ` / ${cat.name}` : q ? ` / „${q}“` : ""}
      </div>
      <div className="toolbar">
        <div>
          <h1 className="serif" style={{ margin: 0, fontSize: 40 }}>
            {cat ? cat.name : q ? `Hledání: ${q}` : "Celý obchod"}
          </h1>
          <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>
            {cat?.description || `${total} položek`}
          </p>
        </div>
        <select
          value={sort}
          onChange={(e) => {
            const next = new URLSearchParams(sp);
            next.set("sort", e.target.value);
            setSp(next);
          }}
        >
          <option value="featured">Doporučené</option>
          <option value="new">Nejnovější</option>
          <option value="price_asc">Cena vzestupně</option>
          <option value="price_desc">Cena sestupně</option>
          <option value="name">Název</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
        <Link className={`chip ${!slug ? "on" : ""}`} to={q ? `/katalog?q=${encodeURIComponent(q)}` : "/katalog"}>
          Vše
        </Link>
        {cats.map((c) => (
          <Link key={c.id} className={`chip ${slug === c.slug ? "on" : ""}`} to={`/katalog/${c.slug}${q ? `?q=${encodeURIComponent(q)}` : ""}`}>
            {c.name}
          </Link>
        ))}
      </div>
      {items.length ? (
        <div className="grid-products">
          {items.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <p className="empty">Nic jsme nenašli. Zkuste jiné slovo nebo kategorii.</p>
      )}
    </div>
  );
}
