import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type Page } from "../api";
import { renderBlock, type Block } from "./blocks";
import { usePageTitle } from "../title";

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

  usePageTitle(page ? `${page.title} — KAVKA` : "Stránka — KAVKA");

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

  return (
    <div className="wrap pb-public-page">
      <div className="crumbs">
        <Link to="/">Domů</Link> / <span>{page.title}</span>
      </div>
      {!blocks.length && <p className="muted-note">Stránka zatím nemá žádný obsah.</p>}
      {blocks.map((b) => renderBlock(b))}
    </div>
  );
}
