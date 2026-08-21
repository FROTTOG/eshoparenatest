import { Fragment, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { api, type Page } from "../api";
import { renderBlock, STATIC_PAGE_SLUGS, type Block } from "./blocks";
import { useSeo } from "../title";

export function DynamicPage() {
  const { slug } = useParams();
  const [page, setPage] = useState<Page | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setErr(false);
    setPage(null);
    void api<{ page: Page }>(`/pages/${slug}`)
      .then((r) => setPage(r.page))
      .catch(() => setErr(true));
  }, [slug]);

  useSeo({
    title: page ? page.meta_title || `${page.title} — KAVKA` : "Stránka — KAVKA",
    description: page?.meta_description || undefined,
    noindex: !!page?.noindex,
  });

  // Hlavní stránka a systémové stránky mají vlastní adresy.
  if (slug === "home") return <Navigate to="/" replace />;
  if (STATIC_PAGE_SLUGS.includes(slug || "")) return <Navigate to={`/${slug}`} replace />;

  if (err) {
    return (
      <div className="wrap empty">
        <h1 className="serif">404</h1>
        <p>Tuhle stránku nemáme. Možná vylétla s kavkou.</p>
        <Link className="btn" to="/katalog">Do katalogu</Link>
      </div>
    );
  }
  if (!page) return <div className="wrap empty">Načítám stránku…</div>;

  let blocks: Block[] = [];
  try {
    blocks = JSON.parse(page.blocks_json || "[]") as Block[];
  } catch {
    blocks = [];
  }

  const mw = page.page_max_width || "";
  return (
    <div
      className="wrap pb-public-page"
      style={mw ? { maxWidth: /^\d+$/.test(mw) ? `${mw}px` : mw } : undefined}
    >
      {!page.hide_crumbs && (
        <div className="crumbs">
          <Link to="/">Domů</Link> / <span>{page.title}</span>
        </div>
      )}
      {!blocks.length && <p className="muted-note">Stránka zatím nemá žádný obsah.</p>}
      {blocks.map((b) => (
        <Fragment key={b.id}>{renderBlock(b)}</Fragment>
      ))}
    </div>
  );
}
