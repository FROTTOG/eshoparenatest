import type { Bindings } from "./lib/types";

const xmlEscape = (s: string) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const onRequest: PagesFunction<Bindings> = async (context) => {
  const origin = new URL(context.request.url).origin;
  const staticPaths = [
    "/",
    "/katalog",
    "/o-nas",
    "/doprava-a-platba",
    "/obchodni-podminky",
    "/ochrana-udaju",
    "/reklamace",
    "/sledovani",
    "/magazin",
  ];
  const urls = staticPaths.map((p) => `  <url><loc>${origin}${p}</loc><changefreq>weekly</changefreq><priority>${p === "/" ? "1.0" : "0.6"}</priority></url>`);

  if (context.env.DB) {
    try {
      const products =
        (
          await context.env.DB.prepare(
            "SELECT slug, image, updated_at FROM products WHERE active = 1 ORDER BY id DESC LIMIT 2000"
          ).all<{
            slug: string;
            image: string;
            updated_at: string;
          }>()
        ).results || [];
      const cats =
        (
          await context.env.DB.prepare("SELECT slug FROM categories WHERE active = 1 ORDER BY sort_order").all<{
            slug: string;
          }>()
        ).results || [];
      const pages =
        (
          await context.env.DB.prepare(
            "SELECT slug, updated_at FROM pages WHERE published = 1 AND slug NOT IN ('home','o-nas','doprava-a-platba','obchodni-podminky','ochrana-udaju','reklamace')"
          ).all<{ slug: string; updated_at: string }>()
        ).results || [];

      const lastmod = (d: string) =>
        d ? `\n    <lastmod>${xmlEscape(String(d).replace(" ", "T").slice(0, 19))}+00:00</lastmod>` : "";

      for (const c of cats) {
        urls.push(`  <url><loc>${origin}/katalog/${encodeURIComponent(c.slug)}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
      }
      for (const p of products) {
        const image = p.image
          ? `\n    <image:image><image:loc>${origin}${p.image.startsWith("/") ? p.image : `/${p.image}`}</image:loc></image:image>`
          : "";
        urls.push(
          `  <url><loc>${origin}/produkt/${encodeURIComponent(p.slug)}</loc><changefreq>weekly</changefreq><priority>0.8</priority>${image}${lastmod(p.updated_at)}</url>`
        );
      }
      const posts =
        (
          await context.env.DB.prepare(
            "SELECT slug, cover, updated_at FROM posts WHERE published = 1 ORDER BY published_at DESC LIMIT 1000"
          ).all<{ slug: string; cover: string; updated_at: string }>()
        ).results || [];
      for (const post of posts) {
        const cover = post.cover
          ? `\n    <image:image><image:loc>${origin}${post.cover.startsWith("/") ? post.cover : `/${post.cover}`}</image:loc></image:image>`
          : "";
        urls.push(
          `  <url><loc>${origin}/magazin/${encodeURIComponent(post.slug)}</loc><changefreq>monthly</changefreq><priority>0.6</priority>${cover}${lastmod(post.updated_at)}</url>`
        );
      }
      for (const pg of pages) {
        urls.push(`  <url><loc>${origin}/stranka/${encodeURIComponent(pg.slug)}</loc><changefreq>monthly</changefreq><priority>0.5</priority>${lastmod(pg.updated_at)}</url>`);
      }
    } catch {
      /* bez D1 vrátíme aspoň statické stránky */
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=1800, stale-while-revalidate=3600",
    },
  });
};
