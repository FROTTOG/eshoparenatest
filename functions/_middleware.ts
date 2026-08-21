/**
 * SPA fallback + SEO tagy pro sdílení a crawlery + Content-Security-Policy.
 * /api/* necháváme na functions/api.
 *
 * CSP se přidává jen k HTML stránkám SPA (ne k API odpovědím, fakturám,
 * feedům apod.). Povolené cizí zdroje: widget Packety, GTM/GA4, Meta Pixel,
 * Google Fonts a rámce Balíkovny/Packety.
 */
type Env = {
  ASSETS: Fetcher;
  DB?: D1Database;
  STORE_NAME?: string;
};

const DEFAULT_DESC =
  "KAVKA Ateliér — keramika, len a dřevo. Doprava Zásilkovna, Z-BOX i Balíkovna s živou mapou.";

const CSP = [
  "default-src 'self'",
  "script-src 'self' https://widget.packeta.com https://www.googletagmanager.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://api.packeta.com https://widget.packeta.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://connect.facebook.net https://b2c.cpost.cz",
  "frame-src 'self' https://widget.packeta.com https://b2c.cpost.cz https://www.googletagmanager.com",
  "frame-ancestors 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);
}

const DEMO_IMAGES = new Set(["deka", "difuzer", "hrnek", "povleceni", "rucnik", "svicka", "tac", "taska", "vaza"]);

function abs(origin: string, path: string) {
  if (!path) return `${origin}/hero.webp`;
  if (path.startsWith("http")) return path;
  const match = path.match(/^\/products\/([a-z0-9-]+)\.jpg$/i);
  const optimized = match && DEMO_IMAGES.has(match[1].toLowerCase()) ? `/products/${match[1].toLowerCase()}.webp` : path;
  return `${origin}${optimized.startsWith("/") ? optimized : `/${optimized}`}`;
}

function injectSeo(
  html: string,
  seo: {
    title: string;
    description: string;
    url: string;
    image: string;
    imageFallback?: string;
    imageAlt?: string;
    type?: string;
    jsonLd?: string;
  }
) {
  const tags = [
    `<title>${esc(seo.title)}</title>`,
    `<meta name="description" content="${esc(seo.description)}" />`,
    `<link rel="canonical" href="${esc(seo.url)}" />`,
    `<meta property="og:title" content="${esc(seo.title)}" />`,
    `<meta property="og:description" content="${esc(seo.description)}" />`,
    `<meta property="og:image" content="${esc(seo.image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    ...(seo.imageAlt ? [`<meta property="og:image:alt" content="${esc(seo.imageAlt)}" />`] : []),
    ...(seo.imageFallback && seo.imageFallback !== seo.image
      ? [`<meta property="og:image" content="${esc(seo.imageFallback)}" />`]
      : []),
    `<meta property="og:url" content="${esc(seo.url)}" />`,
    `<meta property="og:type" content="${esc(seo.type || "website")}" />`,
    `<meta property="og:locale" content="cs_CZ" />`,
    `<meta property="og:site_name" content="KAVKA Ateliér" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(seo.title)}" />`,
    `<meta name="twitter:description" content="${esc(seo.description)}" />`,
    `<meta name="twitter:image" content="${esc(seo.imageFallback || seo.image)}" />`,
    ...(seo.jsonLd ? [`<script type="application/ld+json">${seo.jsonLd}</script>`] : []),
  ].join("\n    ");
  let out = html.replace(/<title>[\s\S]*?<\/title>/gi, "");
  out = out.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, "");
  out = out.replace(
    /<meta\b[^>]*(?:name|property)=["'](?:description|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi,
    ""
  );
  return out.replace("</head>", `    ${tags}\n  </head>`);
}

/** Entity graf: Organization + WebSite (SearchAction) — na všech stránkách. */
function safeJson(obj: unknown): string {
  // Zalomíme ostré závorky, aby se JSON nedal prolomit z HTML script tagu.
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}

function baseJsonLd(origin: string, storeName: string, email: string): string {
  return safeJson({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#org`,
        name: storeName,
        url: `${origin}/`,
        logo: `${origin}/favicon.svg`,
        email,
        areaServed: "CZ",
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: `${origin}/`,
        name: `${storeName} Ateliér`,
        inLanguage: "cs-CZ",
        publisher: { "@id": `${origin}/#org` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${origin}/katalog?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  });
}

/** Přepínač dynamických OG obrázků (nastavení og_dynamic, výchozí zapnuto). */
async function ogDynamic(db?: D1Database): Promise<boolean> {
  if (!db) return false;
  try {
    const row = await db.prepare("SELECT value FROM settings WHERE key = 'og_dynamic'").first<{ value: string }>();
    return (row?.value ?? "1") !== "0";
  } catch {
    return false;
  }
}

/** Drobečková navigace jako JSON-LD (BreadcrumbList). */
function crumbs(origin: string, items: [string, string][]): Record<string, unknown> {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${origin}${path}`,
    })),
  };
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
  // Dynamické OG obrázky obsluhuje functions/og/[[path]].ts
  if (url.pathname.startsWith("/og/")) return context.next();

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
  const storeName = context.env.STORE_NAME || "KAVKA";
  let title = `${storeName} Ateliér — keramika, len a dřevo`;
  let description = DEFAULT_DESC;
  let image = `${origin}/hero.webp`;
  let imageFallback = "";
  let imageAlt = "";
  let type = "website";
  let jsonLd = baseJsonLd(origin, storeName, "ahoj@kavka.shop");

  const productMatch = url.pathname.match(/^\/produkt\/([^/]+)\/?$/);
  if (productMatch && context.env.DB) {
    try {
      const slug = decodeURIComponent(productMatch[1]);
      const p = await context.env.DB.prepare(
        `SELECT p.name, p.description, p.short_description, p.image, p.price, p.sku, p.stock,
                c.name AS category_name, c.slug AS category_slug,
                (SELECT ROUND(AVG(rating), 1) FROM reviews r WHERE r.product_id = p.id AND r.approved = 1) AS rating,
                (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.approved = 1) AS review_count
         FROM products p LEFT JOIN categories c ON c.id = p.category_id
         WHERE p.slug = ? AND p.active = 1`
      )
        .bind(slug)
        .first<{
          name: string;
          description: string;
          short_description: string;
          image: string;
          price: number;
          sku: string;
          stock: number;
          category_name: string | null;
          category_slug: string | null;
          rating: number | null;
          review_count: number;
        }>();
      if (p) {
        title = `${p.name} — KAVKA`;
        description = (p.short_description || p.description || DEFAULT_DESC).slice(0, 240);
        imageFallback = abs(origin, p.image || "/hero.webp");
        // Dynamický náhledový obrázek s fotkou, názvem a cenou (lze vypnout
        // nastavením og_dynamic = 0 v administraci).
        image = (await ogDynamic(context.env.DB))
          ? `${origin}/og/produkt/${encodeURIComponent(slug)}.svg`
          : imageFallback;
        imageAlt = `${p.name} — ${p.price} Kč`;
        type = "product";
        // Product + Offer + BreadcrumbList v prvotním HTML — pro Google
        // (merchant listings) i AI vyhledávače, bez čekání na hydrataci.
        const productUrl = `${origin}/produkt/${encodeURIComponent(slug)}`;
        const graph = [
          {
            "@type": "Organization",
            "@id": `${origin}/#org`,
            name: storeName,
            url: `${origin}/`,
            logo: `${origin}/favicon.svg`,
          },
          {
            "@type": "WebSite",
            "@id": `${origin}/#website`,
            url: `${origin}/`,
            name: `${storeName} Ateliér`,
            publisher: { "@id": `${origin}/#org` },
          },
          {
            "@type": "Product",
            name: p.name,
            image: [image],
            description: (p.description || p.short_description || "").slice(0, 500),
            sku: p.sku,
            brand: { "@type": "Brand", name: storeName },
            ...(p.rating && p.review_count
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: p.rating,
                    reviewCount: p.review_count,
                    bestRating: 5,
                    worstRating: 1,
                  },
                }
              : {}),
            offers: {
              "@type": "Offer",
              url: productUrl,
              priceValidUntil: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
              priceCurrency: "CZK",
              price: p.price,
              availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              itemCondition: "https://schema.org/NewCondition",
              seller: { "@id": `${origin}/#org` },
              shippingDetails: {
                "@type": "OfferShippingDetails",
                shippingDestination: { "@type": "DefinedRegion", addressCountry: "CZ" },
                deliveryTime: {
                  "@type": "ShippingDeliveryTime",
                  handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
                  transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
                },
              },
            },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Domů", item: `${origin}/` },
              { "@type": "ListItem", position: 2, name: "Katalog", item: `${origin}/katalog` },
              ...(p.category_name && p.category_slug
                ? [{ "@type": "ListItem", position: 3, name: p.category_name, item: `${origin}/katalog/${encodeURIComponent(p.category_slug)}` }]
                : []),
              {
                "@type": "ListItem",
                position: p.category_name && p.category_slug ? 4 : 3,
                name: p.name,
                item: productUrl,
              },
            ],
          },
        ];
        jsonLd = safeJson({ "@context": "https://schema.org", "@graph": graph });
      }
    } catch {
      /* D1 nemusí být na preview */
    }
  } else if (url.pathname.match(/^\/magazin\/([^/]+)\/?$/) && context.env.DB) {
    // Detail článku magazínu — Article + BreadcrumbList do zdroje stránky.
    try {
      const postSlug = decodeURIComponent(url.pathname.match(/^\/magazin\/([^/]+)\/?$/)![1]);
      const post = await context.env.DB.prepare(
        `SELECT title, slug, perex, cover, author, tags, meta_title, meta_description, published_at, updated_at
         FROM posts WHERE slug = ? AND published = 1`
      )
        .bind(postSlug)
        .first<{
          title: string;
          slug: string;
          perex: string;
          cover: string;
          author: string;
          tags: string;
          meta_title: string;
          meta_description: string;
          published_at: string;
          updated_at: string;
        }>();
      if (post) {
        const postUrl = `${origin}/magazin/${encodeURIComponent(post.slug)}`;
        title = post.meta_title || `${post.title} — ${storeName} Magazín`;
        description = (post.meta_description || post.perex || DEFAULT_DESC).slice(0, 240);
        imageFallback = abs(origin, post.cover || "/hero.webp");
        image = (await ogDynamic(context.env.DB))
          ? `${origin}/og/clanek/${encodeURIComponent(post.slug)}.svg`
          : imageFallback;
        imageAlt = post.title;
        type = "article";
        jsonLd = safeJson({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${origin}/#org`,
              name: storeName,
              url: `${origin}/`,
              logo: `${origin}/favicon.svg`,
            },
            {
              "@type": "BlogPosting",
              headline: post.title.slice(0, 110),
              description: (post.perex || "").slice(0, 300),
              image: [imageFallback],
              datePublished: String(post.published_at || "").replace(" ", "T"),
              dateModified: String(post.updated_at || post.published_at || "").replace(" ", "T"),
              author: { "@type": post.author ? "Person" : "Organization", name: post.author || storeName },
              publisher: { "@id": `${origin}/#org` },
              mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
              inLanguage: "cs-CZ",
              ...(post.tags ? { keywords: post.tags } : {}),
            },
            crumbs(origin, [
              ["Domů", "/"],
              ["Magazín", "/magazin"],
              [post.title, `/magazin/${encodeURIComponent(post.slug)}`],
            ]),
          ],
        });
      }
    } catch {
      /* D1 nemusí být na preview */
    }
  } else if (url.pathname === "/magazin" || url.pathname === "/magazin/") {
    title = `Magazín — ${storeName}`;
    description = "Články z ateliéru: péče o keramiku, len i dřevo, novinky a návody.";
    jsonLd = safeJson({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Blog", name: `${storeName} Magazín`, url: `${origin}/magazin`, inLanguage: "cs-CZ" },
        crumbs(origin, [
          ["Domů", "/"],
          ["Magazín", "/magazin"],
        ]),
      ],
    });
  } else if (url.pathname.startsWith("/katalog")) {
    const catSlug = url.pathname.replace(/^\/katalog\/?/, "").replace(/\/$/, "");
    let catName = "";
    if (catSlug && context.env.DB) {
      try {
        const cat = await context.env.DB.prepare("SELECT name, description FROM categories WHERE slug = ? AND active = 1")
          .bind(decodeURIComponent(catSlug))
          .first<{ name: string; description: string }>();
        if (cat) {
          catName = cat.name;
          title = `${cat.name} — ${storeName}`;
          description = (cat.description || `Kategorie ${cat.name} z ateliéru ${storeName}.`).slice(0, 240);
        }
      } catch {
        /* bez databáze zůstane obecný katalog */
      }
    }
    if (!catName) {
      title = "Katalog — KAVKA";
      description = "Keramika, len a dřevo z ateliéru. Celý obchod KAVKA.";
    }
    jsonLd = safeJson({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "CollectionPage",
          name: catName || "Katalog",
          url: `${origin}${url.pathname}`,
          isPartOf: { "@id": `${origin}/#website` },
        },
        crumbs(
          origin,
          catName
            ? [
                ["Domů", "/"],
                ["Katalog", "/katalog"],
                [catName, `/katalog/${catSlug}`],
              ]
            : [
                ["Domů", "/"],
                ["Katalog", "/katalog"],
              ]
        ),
      ],
    });
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
    imageFallback,
    imageAlt,
    type,
    jsonLd,
  });
  const headers = new Headers(htmlRes.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  headers.set("content-security-policy", CSP);
  if (/^\/(?:admin|ucet|pokladna|kosik|prihlaseni|registrace)(?:\/|$)/.test(url.pathname)) {
    headers.set("x-robots-tag", "noindex, nofollow");
  }
  return new Response(body, { status: htmlRes.status, headers });
};
