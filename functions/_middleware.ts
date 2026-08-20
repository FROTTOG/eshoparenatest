/**
 * SPA fallback + SEO tagy pro sdílení a crawlery.
 * /api/* necháváme na functions/api.
 */
type Env = {
  ASSETS: Fetcher;
  DB?: D1Database;
  STORE_NAME?: string;
};

const DEFAULT_DESC =
  "KAVKA Ateliér — keramika, len a dřevo. Doprava Zásilkovna, Z-BOX i Balíkovna s živou mapou.";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);
}

function abs(origin: string, path: string) {
  if (!path) return `${origin}/hero.jpg`;
  if (path.startsWith("http")) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function injectSeo(
  html: string,
  seo: { title: string; description: string; url: string; image: string; type?: string }
) {
  const tags = [
    `<title>${esc(seo.title)}</title>`,
    `<meta name="description" content="${esc(seo.description)}" />`,
    `<link rel="canonical" href="${esc(seo.url)}" />`,
    `<meta property="og:title" content="${esc(seo.title)}" />`,
    `<meta property="og:description" content="${esc(seo.description)}" />`,
    `<meta property="og:image" content="${esc(seo.image)}" />`,
    `<meta property="og:url" content="${esc(seo.url)}" />`,
    `<meta property="og:type" content="${esc(seo.type || "website")}" />`,
    `<meta property="og:locale" content="cs_CZ" />`,
    `<meta property="og:site_name" content="KAVKA Ateliér" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(seo.title)}" />`,
    `<meta name="twitter:description" content="${esc(seo.description)}" />`,
    `<meta name="twitter:image" content="${esc(seo.image)}" />`,
  ].join("\n    ");
  let out = html.replace(/<title>[\s\S]*?<\/title>/i, "");
  out = out.replace(/<meta\s+name=["']description["'][^>]*>/i, "");
  return out.replace("</head>", `    ${tags}\n  </head>`);
}

async function spaHtml(context: EventContext<Env, string, unknown>, url: URL) {
  let res = await context.next();
  if (res.status === 404) {
    res = await context.env.ASSETS.fetch(new URL("/index.html", url.origin));
  }
  return res;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  if (url.pathname.startsWith("/api/")) return context.next();
  if (url.pathname === "/sitemap.xml" || url.pathname === "/robots.txt") return context.next();

  const accept = context.request.headers.get("Accept") || "";
  const wantsHtml = accept.includes("text/html") || accept.includes("*/*");
  if (!wantsHtml || url.pathname.includes(".")) {
    return context.next();
  }

  const htmlRes = await spaHtml(context, url);
  const ctype = htmlRes.headers.get("content-type") || "";
  if (!ctype.includes("text/html")) return htmlRes;

  const html = await htmlRes.text();
  const origin = url.origin;
  let title = `${context.env.STORE_NAME || "KAVKA"} Ateliér — keramika, len a dřevo`;
  let description = DEFAULT_DESC;
  let image = `${origin}/hero.jpg`;
  let type = "website";

  const productMatch = url.pathname.match(/^\/produkt\/([^/]+)\/?$/);
  if (productMatch && context.env.DB) {
    try {
      const slug = decodeURIComponent(productMatch[1]);
      const p = await context.env.DB.prepare(
        "SELECT name, description, short_description, image FROM products WHERE slug = ? AND active = 1"
      )
        .bind(slug)
        .first<{ name: string; description: string; short_description: string; image: string }>();
      if (p) {
        title = `${p.name} — KAVKA`;
        description = (p.short_description || p.description || DEFAULT_DESC).slice(0, 240);
        image = abs(origin, p.image || "/hero.jpg");
        type = "product";
      }
    } catch {
      /* D1 nemusí být na preview */
    }
  } else if (url.pathname.startsWith("/katalog")) {
    title = "Katalog — KAVKA";
    description = "Keramika, len a dřevo z ateliéru. Celý obchod KAVKA.";
  } else if (url.pathname.startsWith("/o-nas")) {
    title = "O nás a kontakty — KAVKA";
  } else if (url.pathname.startsWith("/doprava-a-platba")) {
    title = "Doprava a platba — KAVKA";
  }

  const body = injectSeo(html, {
    title,
    description,
    url: `${origin}${url.pathname}`,
    image,
    type,
  });
  const headers = new Headers(htmlRes.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  return new Response(body, { status: htmlRes.status, headers });
};
