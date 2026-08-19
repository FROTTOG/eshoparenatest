import type { Bindings } from "./lib/types";

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
  ];
  const urls = staticPaths.map((p) => `  <url><loc>${origin}${p}</loc><changefreq>weekly</changefreq></url>`);

  if (context.env.DB) {
    try {
      const products =
        (
          await context.env.DB.prepare("SELECT slug FROM products WHERE active = 1 ORDER BY id DESC LIMIT 2000").all<{
            slug: string;
          }>()
        ).results || [];
      const cats =
        (
          await context.env.DB.prepare("SELECT slug FROM categories WHERE active = 1 ORDER BY sort_order").all<{
            slug: string;
          }>()
        ).results || [];
      for (const c of cats) urls.push(`  <url><loc>${origin}/katalog/${c.slug}</loc><changefreq>weekly</changefreq></url>`);
      for (const p of products) urls.push(`  <url><loc>${origin}/produkt/${p.slug}</loc><changefreq>weekly</changefreq></url>`);
    } catch {
      /* bez D1 vrátíme aspoň statické stránky */
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=1800",
    },
  });
};
