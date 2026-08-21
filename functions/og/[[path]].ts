/**
 * Dynamické OG obrázky pro sdílení na sociálních sítích.
 *
 *   /og/produkt/<slug>.svg  — fotka produktu, název, cena a stav skladu
 *   /og/clanek/<slug>.svg   — titulek článku z magazínu
 *   /og/default.svg         — obecná varianta pro ostatní stránky
 *
 * Obrázek se skládá na serveru z dat v D1 (žádná knihovna, žádný build),
 * takže je vždy aktuální — po změně ceny se změní i náhled odkazu.
 * Rozměr 1200 × 630 px je standard pro Facebook, Instagram i Twitter/X.
 */

type Env = {
  DB?: D1Database;
  STORE_NAME?: string;
};

const W = 1200;
const H = 630;

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Rozdělí text na řádky tak, aby se vešel do dané šířky (odhad podle znaků). */
function wrap(text: string, perLine: number, maxLines: number): string[] {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (!line.length) line = w;
    else if (line.length + 1 + w.length <= perLine) line += ` ${w}`;
    else {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, perLine - 1)}…`;
  }
  return lines;
}

function czk(n: number): string {
  return `${new Intl.NumberFormat("cs-CZ").format(Math.round(n))} Kč`;
}

function svg(body: string): Response {
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f3eee4"/>
      <stop offset="100%" stop-color="#e7dece"/>
    </linearGradient>
    <clipPath id="photo"><rect x="660" y="60" width="480" height="510" rx="28"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="14" height="${H}" fill="#b54a2c"/>
  ${body}
</svg>`;
  return new Response(doc, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Náhledy se cachují krátce, ať se po změně ceny obnoví.
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
}

function header(store: string, kicker: string): string {
  return `<text x="72" y="96" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="#1c1915" font-weight="700">${esc(store)}</text>
  <text x="72" y="132" font-family="Helvetica, Arial, sans-serif" font-size="18" letter-spacing="4" fill="#8a7f70">${esc(kicker.toUpperCase())}</text>`;
}

function footer(text: string): string {
  return `<text x="72" y="566" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#5c5348">${esc(text)}</text>`;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const store = context.env.STORE_NAME || "KAVKA";
  const path = url.pathname.replace(/^\/og\/?/, "").replace(/\.(svg|png|jpg)$/i, "");
  const [kind, ...rest] = path.split("/");
  const slug = decodeURIComponent(rest.join("/") || "");

  if (kind === "produkt" && slug && context.env.DB) {
    try {
      const p = await context.env.DB.prepare(
        `SELECT p.name, p.image, p.price, p.compare_price, p.stock, p.short_description, c.name AS category_name,
                (SELECT ROUND(AVG(rating),1) FROM reviews r WHERE r.product_id = p.id AND r.approved = 1) AS rating,
                (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.approved = 1) AS review_count
         FROM products p LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.slug = ? AND p.active = 1`
      )
        .bind(slug)
        .first<{
          name: string;
          image: string;
          price: number;
          compare_price: number | null;
          stock: number;
          short_description: string;
          category_name: string | null;
          rating: number | null;
          review_count: number;
        }>();
      if (p) {
        const img = p.image ? (p.image.startsWith("http") ? p.image : `${url.origin}${p.image}`) : "";
        const lines = wrap(p.name, 20, 3);
        const stars = p.rating ? "★".repeat(Math.round(p.rating)) + "☆".repeat(5 - Math.round(p.rating)) : "";
        return svg(`
  ${header(store, p.category_name || "Z ateliéru")}
  ${lines
    .map(
      (l, i) =>
        `<text x="72" y="${230 + i * 62}" font-family="Georgia, 'Times New Roman', serif" font-size="56" fill="#1c1915">${esc(l)}</text>`
    )
    .join("\n  ")}
  <text x="72" y="${250 + lines.length * 62}" font-family="Helvetica, Arial, sans-serif" font-size="58" font-weight="700" fill="#b54a2c">${esc(czk(p.price))}</text>
  ${
    p.compare_price && p.compare_price > p.price
      ? `<text x="${100 + String(czk(p.price)).length * 30}" y="${250 + lines.length * 62}" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#8a7f70" text-decoration="line-through">${esc(czk(p.compare_price))}</text>`
      : ""
  }
  <rect x="72" y="${285 + lines.length * 62}" width="${p.stock > 0 ? 210 : 230}" height="46" rx="23" fill="${p.stock > 0 ? "#24352c" : "#8a7f70"}"/>
  <text x="${p.stock > 0 ? 96 : 96}" y="${315 + lines.length * 62}" font-family="Helvetica, Arial, sans-serif" font-size="22" fill="#fffdf8">${p.stock > 0 ? `Skladem ${p.stock} ks` : "Momentálně vyprodáno"}</text>
  ${stars ? `<text x="72" y="${375 + lines.length * 62}" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#b54a2c">${stars} <tspan fill="#5c5348" font-size="20">${p.review_count}× hodnoceno</tspan></text>` : ""}
  ${footer("Doprava Zásilkovna · Z-BOX · Balíkovna — 14 dní na vrácení")}
  ${img ? `<image href="${esc(img)}" xlink:href="${esc(img)}" x="660" y="60" width="480" height="510" preserveAspectRatio="xMidYMid slice" clip-path="url(#photo)"/>` : ""}
  <rect x="660" y="60" width="480" height="510" rx="28" fill="none" stroke="#d8cdb9" stroke-width="2"/>`);
      }
    } catch {
      /* D1 nemusí být dostupná — spadneme na obecnou variantu */
    }
  }

  if (kind === "clanek" && slug && context.env.DB) {
    try {
      const post = await context.env.DB.prepare(
        "SELECT title, perex, cover, author, published_at FROM posts WHERE slug = ? AND published = 1"
      )
        .bind(slug)
        .first<{ title: string; perex: string; cover: string; author: string; published_at: string }>();
      if (post) {
        const img = post.cover ? (post.cover.startsWith("http") ? post.cover : `${url.origin}${post.cover}`) : "";
        const lines = wrap(post.title, img ? 22 : 34, 3);
        const perex = wrap(post.perex, img ? 30 : 52, 2);
        return svg(`
  ${header(store, "Magazín")}
  ${lines
    .map(
      (l, i) =>
        `<text x="72" y="${250 + i * 60}" font-family="Georgia, 'Times New Roman', serif" font-size="52" fill="#1c1915">${esc(l)}</text>`
    )
    .join("\n  ")}
  ${perex
    .map(
      (l, i) =>
        `<text x="72" y="${300 + lines.length * 60 + i * 34}" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#5c5348">${esc(l)}</text>`
    )
    .join("\n  ")}
  ${footer(post.author ? `${post.author} · ${String(post.published_at).slice(0, 10)}` : String(post.published_at).slice(0, 10))}
  ${img ? `<image href="${esc(img)}" xlink:href="${esc(img)}" x="660" y="60" width="480" height="510" preserveAspectRatio="xMidYMid slice" clip-path="url(#photo)"/>` : ""}`);
      }
    } catch {
      /* fallback níže */
    }
  }

  return svg(`
  ${header(store, "Ateliér")}
  <text x="72" y="290" font-family="Georgia, 'Times New Roman', serif" font-size="64" fill="#1c1915">Věci s charakterem</text>
  <text x="72" y="360" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#5c5348">Keramika, len a dřevo z malé dílny.</text>
  ${footer("Doprava Zásilkovna · Z-BOX · Balíkovna")}`);
};
