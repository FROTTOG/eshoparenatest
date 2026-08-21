import type { App } from "./helpers";
import {
  CART_DAYS,
  SESSION_DAYS,
  clearCookie,
  ensureCart,
  getCoupon,
  isSecure,
  loadCart,
  loadCouponDiscount,
  mergeCarts,
  newCartId,
  setCookie,
  validEmail,
} from "./helpers";
import { hashPassword, orderNumber, randomId, verifyPassword, verifyTotp } from "./crypto";
import { ensureInvoiceForOrder, invoiceHtml, loadSettings, markInvoicePaid } from "./invoices";
import { registerFeeds } from "./feeds";
import { notifyAbandonedCart, notifyOrderCreated, notifyOrderStatus, notifyPasswordReset } from "./mail";
import {
  createVouchersForOrder,
  listTags,
  loadRelatedProducts,
  loadUserVouchers,
  parseTags,
  purgeExpiredCoupons,
  sendVouchersForOrder,
} from "./features";
import { cachedJson, bumpCache } from "./cache";
import { comgateCreate, comgateStatus, type ComgateSettings } from "./payments";
import { pushToSubscriptions } from "./push";
import { applyPricing, applyPricingAll, effectivePrice, netPrice, priceContext, type PriceCtx } from "./pricing";

const LOGIN_MAX_FAILS = 8;

async function loadPublicSettings(db: D1Database): Promise<Record<string, string>> {
  const rows = (await db.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>()).results || [];
  const all = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const publicKeys = [
      "store_name",
      "store_company",
      "store_ico",
      "store_dic",
      "store_vat_note",
      "store_registry",
      "store_tagline",
      "store_email",
      "store_phone",
      "store_address",
      "store_return_address",
      "store_hours",
      "iban",
      "bank_name",
      "bank_account",
      "invoice_vat_rate",
      "hero_title",
      "hero_text",
      "home_badge",
      "home_hero_primary_cta",
      "home_hero_secondary_cta",
      "home_coupon_title",
      "home_coupon_text",
      "home_categories_title",
      "home_category_fallback",
      "home_category_cta",
      "home_featured_kicker",
      "home_featured_title",
      "home_featured_text",
      "home_featured_cta",
      "home_trust_1_title",
      "home_trust_1_text",
      "home_trust_2_title",
      "home_trust_2_text",
      "home_trust_3_title",
      "home_trust_3_text",
      "home_cta_title",
      "home_cta_subtitle",
      "home_cta_primary",
      "home_cta_secondary",
      "packeta_api_key",
      "vendor_person",
      "vendor_web",
      "vendor_phone",
      "navbar_items",
      "logo_title",
      "logo_subtext",
      "logo_svg",
      "gtm_id",
      "ga4_id",
      "meta_pixel_id",
      "wallet_merchant_name",
      "apple_pay_merchant_id",
      "google_pay_merchant_id",
      "exit_coupon",
      "comgate_merchant",
      "totp_required",
      "vapid_public_key",
      "theme_bg",
      "theme_bg_deep",
      "theme_card",
      "theme_ink",
      "theme_accent",
      "theme_forest",
      "theme_radius",
      "theme_shadow",
      "theme_btn_anim",
      "blog_enabled",
      "blog_title",
      "blog_perex",
      "b2b_enabled",
      "b2b_note",
      "b2b_discount",
      // Úvodní carousel — slidy z administrace (dřív se veřejně neposílaly,
      // takže se úpravy carouselu na webu vůbec neprojevily).
      "hero_slides",
      // Oznamovací lišta nad hlavičkou
      "announce_enabled",
      "announce_items",
      "announce_bg",
      "announce_fg",
      "announce_rotate",
      // Dlaždice rychlých odkazů na úvodní stránce
      "home_tiles_enabled",
      "home_tiles_show_categories",
      "home_tiles_items",
      "home_tiles_title",
      // Filtry katalogu nad štítky produktů
      "catalog_filters",
      // Dárkové poukazy
      "gift_enabled",
      "gift_valid_months",
    ];
    const pub: Record<string, string> = {};
    for (const k of publicKeys) if (all[k] != null) pub[k] = all[k];
    // Indikátor, že je brána nastavená — pokladna podle toho nabídne kartu online.
    pub.comgate_enabled = all.comgate_merchant ? "1" : "0";
    return pub;
}

export function registerPublic(app: App) {
  registerFeeds(app);
  app.get("/health", (c) => c.json({ ok: true, store: c.env.STORE_NAME || "KAVKA" }));

  app.get("/settings", async (c) => {
    return cachedJson(c.env.DB, c.req.url, "/api/settings", 30, () => loadPublicSettings(c.env.DB));
  });

  app.get("/ares", async (c) => {
    const rawIco = (c.req.query("ico") || "").replace(/\s+/g, "");
    if (!/^\d{8}$/.test(rawIco)) {
      return c.json({ error: "Zadejte platné 8místné IČO." }, 400);
    }
    try {
      const res = await fetch(
        `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${rawIco}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(4500),
        }
      );
      if (!res.ok) {
        if (res.status === 404) {
          return c.json({ error: "Subjekt s tímto IČO nebyl v registru ARES nalezen." }, 404);
        }
        return c.json({ error: "Registr ARES vrátil chybu." }, 502);
      }
      const data = (await res.json()) as {
        obchodniJmeno?: string;
        ico?: string;
        dic?: string;
        sidlo?: {
          nazevUlice?: string;
          cisloDomovni?: number;
          cisloOrientacni?: number | string;
          cisloOrientacniPismeno?: string;
          nazevObce?: string;
          psc?: number | string;
          nazevCastiObce?: string;
        };
      };
      const sidlo = data.sidlo || {};
      let street = sidlo.nazevUlice || sidlo.nazevCastiObce || sidlo.nazevObce || "";
      if (sidlo.cisloDomovni) {
        if (sidlo.cisloOrientacni) {
          street += ` ${sidlo.cisloDomovni}/${sidlo.cisloOrientacni}${sidlo.cisloOrientacniPismeno || ""}`;
        } else {
          street += ` ${sidlo.cisloDomovni}`;
        }
      }
      const city = sidlo.nazevObce || "";
      let zip = String(sidlo.psc || "").replace(/\s+/g, "");
      if (zip.length === 5) zip = `${zip.slice(0, 3)} ${zip.slice(3)}`;

      return c.json({
        ok: true,
        ico: data.ico || rawIco,
        company_name: data.obchodniJmeno || "",
        dic: data.dic || "",
        street: street.trim(),
        city: city.trim(),
        zip: zip.trim(),
      });
    } catch {
      return c.json({ error: "Nepodařilo se spojit s registrem ARES. Můžete údaje vyplnit ručně." }, 500);
    }
  });

  // Seznam zveřejněných stránek z editoru (pro dynamický navbar)
  app.get("/pages", async (c) => {
    return cachedJson(c.env.DB, c.req.url, "/api/pages", 60, async () => {
      const rows = (await c.env.DB.prepare("SELECT id, title, slug, in_nav, nav_label, nav_order FROM pages WHERE published = 1 ORDER BY nav_order, id").all()).results || [];
      return rows;
    });
  });

  // Veřejná stránka z editoru (drag & drop builder)
  app.get("/pages/:slug", async (c) => {
    const slug = (c.req.param("slug") || "").toLowerCase();
    const page = await c.env.DB.prepare("SELECT * FROM pages WHERE slug = ? AND published = 1").bind(slug).first();
    if (!page) return c.json({ error: "Stránka nenalezena." }, 404);
    return c.json({ page });
  });

  /* ---------------------------------------------------------------
     Magazín (blog) — články pro organickou návštěvnost z vyhledávačů
     --------------------------------------------------------------- */
  app.get("/posts", async (c) => {
    const tag = (c.req.query("tag") || "").trim();
    const limit = Math.min(48, Math.max(1, Number(c.req.query("limit") || 12)));
    const page = Math.max(1, Number(c.req.query("page") || 1));
    return cachedJson(c.env.DB, c.req.url, "/api/posts", 60, async () => {
      const where = tag ? "WHERE published = 1 AND tags LIKE ?" : "WHERE published = 1";
      const binds: (string | number)[] = tag ? [`%${tag}%`] : [];
      const count = await c.env.DB.prepare(`SELECT COUNT(*) AS c FROM posts ${where}`)
        .bind(...binds)
        .first<{ c: number }>();
      const rows = (
        await c.env.DB.prepare(
          `SELECT id, title, slug, perex, cover, author, tags, published_at
           FROM posts ${where} ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?`
        )
          .bind(...binds, limit, (page - 1) * limit)
          .all()
      ).results || [];
      return { items: rows, total: count?.c || 0, page, limit };
    });
  });

  app.get("/posts/:slug", async (c) => {
    const slug = (c.req.param("slug") || "").toLowerCase();
    const post = await c.env.DB.prepare("SELECT * FROM posts WHERE slug = ? AND published = 1").bind(slug).first();
    if (!post) return c.json({ error: "Článek nenalezen." }, 404);
    const related =
      (
        await c.env.DB.prepare(
          "SELECT id, title, slug, perex, cover, published_at FROM posts WHERE published = 1 AND id != ? ORDER BY published_at DESC LIMIT 3"
        )
          .bind((post as { id: number }).id)
          .all()
      ).results || [];
    return c.json({ post, related });
  });

  app.get("/categories", async (c) => {
    return cachedJson(c.env.DB, c.req.url, "/api/categories", 120, async () => {
      const rows = await c.env.DB.prepare(
        "SELECT * FROM categories WHERE active = 1 ORDER BY sort_order, name"
      ).all();
      return rows.results || [];
    });
  });

  app.get("/products", async (c) => {
    const q = (c.req.query("q") || "").trim();
    const category = c.req.query("category") || "";
    const sort = c.req.query("sort") || "featured";
    const featured = c.req.query("featured");
    const inStock = c.req.query("in_stock");
    // Štítky: `tags=len,ruční` → produkt musí mít alespoň jeden ze štítků.
    const tags = (c.req.query("tags") || c.req.query("tag") || "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12);
    const priceMin = Math.max(0, Number(c.req.query("price_min") || 0));
    const priceMax = Math.max(0, Number(c.req.query("price_max") || 0));
    const ids = (c.req.query("ids") || "")
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isFinite(n) && n > 0)
      .slice(0, 48);
    const page = Math.max(1, Number(c.req.query("page") || 1));
    const limit = Math.min(48, Math.max(1, Number(c.req.query("limit") || 24)));
    const offset = (page - 1) * limit;

    const ctx = await priceContext(c.env.DB, c.get("user"));
    // Cache je společná pro všechny — velkoobchodní ceny dopočítáme až nad
    // výsledkem z cache, aby se B2B ceník nikdy neuložil do veřejné cache.
    const cacheKey = c.req.url;
    const listed = await cachedJson(c.env.DB, cacheKey, "/api/products", 45, async () => {
      let where = "WHERE p.active = 1";
      const binds: (string | number)[] = [];
      if (q) {
        where += " AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)";
        const like = `%${q}%`;
        binds.push(like, like, like);
      }
      if (category) {
        where += " AND c.slug = ?";
        binds.push(category);
      }
      if (featured === "1") where += " AND p.featured = 1";
      if (inStock === "1") where += " AND p.stock > 0";
      if (priceMin > 0) {
        where += " AND p.price >= ?";
        binds.push(priceMin);
      }
      if (priceMax > 0) {
        where += " AND p.price <= ?";
        binds.push(priceMax);
      }
      if (ids.length) {
        where += ` AND p.id IN (${ids.map(() => "?").join(",")})`;
        binds.push(...ids);
      }
      if (tags.length) {
        // Štítky jsou uložené jako „a,b,c“ — hledáme celé slovo mezi čárkami.
        where += ` AND (${tags.map(() => "(',' || LOWER(REPLACE(p.tags, ', ', ',')) || ',') LIKE ?").join(" OR ")})`;
        binds.push(...tags.map((t) => `%,${t},%`));
      }

      let order = "p.featured DESC, p.id DESC";
      if (sort === "price_asc") order = "p.price ASC";
      if (sort === "price_desc") order = "p.price DESC";
      if (sort === "name") order = "p.name COLLATE NOCASE ASC";
      if (sort === "new") order = "p.id DESC";

      const count = await c.env.DB.prepare(
        `SELECT COUNT(*) AS c FROM products p LEFT JOIN categories c ON c.id = p.category_id ${where}`
      )
        .bind(...binds)
        .first<{ c: number }>();

      const rows = await c.env.DB.prepare(
        `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
                (SELECT ROUND(AVG(rating), 1) FROM reviews r WHERE r.product_id = p.id AND r.approved = 1) AS rating,
                (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.approved = 1) AS review_count
         FROM products p
         LEFT JOIN categories c ON c.id = p.category_id
         ${where}
         ORDER BY ${order}
         LIMIT ? OFFSET ?`
      )
        .bind(...binds, limit, offset)
        .all();

      return { items: rows.results || [], total: count?.c || 0, page, limit };
    });
    if (!ctx.b2b) return listed;
    const data = (await listed.json()) as { items: Record<string, unknown>[]; total: number; page: number; limit: number };
    return c.json({
      ...data,
      items: applyPricingAll(data.items as { price: number }[], ctx),
      b2b: true,
      vat_rate: ctx.vatRate,
    });
  });

  app.get("/products/:slug", async (c) => {
    const slug = c.req.param("slug");
    const p = await c.env.DB.prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.slug = ? AND p.active = 1`
    )
      .bind(slug)
      .first();
    if (!p) return c.json({ error: "Produkt nenalezen." }, 404);
    const images = (await c.env.DB.prepare("SELECT url FROM product_images WHERE product_id = ? ORDER BY sort_order, id").bind((p as { id: number }).id).all<{ url: string }>()).results || [];
    const reviews =
      (
        await c.env.DB.prepare(
          `SELECT r.id, r.rating, r.title, r.comment, r.created_at, u.name AS user_name
           FROM reviews r JOIN users u ON u.id = r.user_id
           WHERE r.product_id = ? AND r.approved = 1
           ORDER BY r.id DESC`
        )
          .bind((p as { id: number }).id)
          .all()
      ).results || [];
    const agg = await c.env.DB.prepare(
      "SELECT ROUND(AVG(rating),1) AS rating, COUNT(*) AS review_count FROM reviews WHERE product_id = ? AND approved = 1"
    )
      .bind((p as { id: number }).id)
      .first();
    // Rozpad hodnocení po hvězdách — pro přehledný graf na detailu produktu.
    const breakdownRows =
      (
        await c.env.DB.prepare(
          "SELECT rating, COUNT(*) AS c FROM reviews WHERE product_id = ? AND approved = 1 GROUP BY rating"
        )
          .bind((p as { id: number }).id)
          .all<{ rating: number; c: number }>()
      ).results || [];
    const breakdown: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    for (const r of breakdownRows) breakdown[String(r.rating)] = r.c;
    // Hodnotit může jen zákazník, který produkt má v historii objednávek.
    const user = c.get("user");
    let canReview = false;
    let hasReview = false;
    if (user) {
      const bought = await c.env.DB.prepare(
        `SELECT 1 AS ok FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE oi.product_id = ? AND (o.user_id = ? OR o.email = ?) AND o.status != 'cancelled' LIMIT 1`
      )
        .bind((p as { id: number }).id, user.id, user.email)
        .first();
      canReview = !!bought;
      const mine = await c.env.DB.prepare("SELECT 1 AS ok FROM reviews WHERE product_id = ? AND user_id = ?")
        .bind((p as { id: number }).id, user.id)
        .first();
      hasReview = !!mine;
    }
    const ctx = await priceContext(c.env.DB, user);
    const priced = applyPricing(p as { price: number; price_b2b?: number }, ctx);
    // Ručně vybrané doporučené produkty („mohlo by se hodit“) mají přednost
    // před automatickým výběrem ze stejné kategorie.
    let related: Record<string, unknown>[] = [];
    try {
      related = (await loadRelatedProducts(c.env.DB, (p as { id: number }).id, 4)) as Record<string, unknown>[];
      if (ctx.b2b) related = applyPricingAll(related as unknown as { price: number }[], ctx) as unknown as Record<string, unknown>[];
    } catch {
      related = [];
    }
    return c.json({
      ...priced,
      images: images.map((i) => i.url),
      tags: parseTags((p as { tags?: string }).tags),
      related,
      reviews,
      rating: (agg as { rating: number | null })?.rating,
      review_count: (agg as { review_count: number })?.review_count || 0,
      rating_breakdown: breakdown,
      can_review: canReview,
      has_review: hasReview,
      b2b: ctx.b2b,
      vat_rate: ctx.vatRate,
    });
  });

  /** Štítky použité u aktivních produktů — pro filtry v katalogu. */
  app.get("/tags", async (c) => {
    return cachedJson(c.env.DB, c.req.url, "/api/tags", 120, () => listTags(c.env.DB));
  });

  app.get("/shipping", async (c) => {
    return cachedJson(c.env.DB, c.req.url, "/api/shipping", 120, async () => {
      const rows = await c.env.DB.prepare("SELECT * FROM shipping_methods WHERE active = 1 ORDER BY sort_order").all();
      return rows.results || [];
    });
  });

  app.get("/payments", async (c) => {
    return cachedJson(c.env.DB, c.req.url, "/api/payments", 120, async () => {
      // „Karta online“ se nabízí jen při nastavené bráně (comgate_merchant).
      const rows = await c.env.DB.prepare("SELECT * FROM payment_methods WHERE active = 1 ORDER BY sort_order").all();
      const settings = await loadPublicSettings(c.env.DB);
      const all = (rows.results || []) as { code: string }[];
      if (!settings.comgate_enabled) {
        return all.filter((p) => p.code !== "card");
      }
      return all;
    });
  });

  app.get("/pickup-points", async (c) => {
    const q = (c.req.query("q") || "").trim();
    const type = c.req.query("type") || "";
    const city = (c.req.query("city") || "").trim();
    const lat = Number(c.req.query("lat") || 0);
    const lng = Number(c.req.query("lng") || 0);
    let sql = "SELECT * FROM pickup_points WHERE active = 1";
    const binds: (string | number)[] = [];
    if (type) {
      sql += " AND type = ?";
      binds.push(type);
    }
    if (city) {
      sql += " AND city LIKE ?";
      binds.push(`%${city}%`);
    }
    if (q) {
      sql += " AND (name LIKE ? OR city LIKE ? OR address LIKE ? OR zip LIKE ?)";
      const like = `%${q}%`;
      binds.push(like, like, like, like);
    }
    sql += " ORDER BY city, name LIMIT 300";
    const rows = (await c.env.DB.prepare(sql).bind(...binds).all()).results || [];
    if (lat && lng) {
      const withD = (rows as { lat: number; lng: number }[]).map((p) => ({
        ...p,
        distance: haversine(lat, lng, p.lat, p.lng),
      }));
      withD.sort((a, b) => a.distance - b.distance);
      return c.json(withD);
    }
    return c.json(rows);
  });

  app.post("/auth/register", async (c) => {
    const body = await c.req.json<{ email?: string; password?: string; name?: string; phone?: string }>();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const name = (body.name || "").trim();
    const phone = (body.phone || "").trim();
    if (!validEmail(email)) return c.json({ error: "Zadejte platný e-mail." }, 400);
    if (password.length < 8) return c.json({ error: "Heslo musí mít alespoň 8 znaků." }, 400);
    if (name.length < 2) return c.json({ error: "Zadejte jméno." }, 400);
    const exists = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (exists) return c.json({ error: "Tento e-mail už je registrovaný." }, 409);
    const hash = await hashPassword(password);
    const res = await c.env.DB.prepare("INSERT INTO users (email, password_hash, name, phone, role) VALUES (?, ?, ?, ?, 'customer')").bind(email, hash, name, phone).run();
    const userId = Number(res.meta.last_row_id);
    const sid = randomId();
    const exp = Date.now() + SESSION_DAYS * 86400 * 1000;
    await c.env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").bind(sid, userId, exp).run();
    const cartId = await mergeCarts(c.env.DB, c.get("cartId"), userId);
    const secure = isSecure(c);
    c.header("Set-Cookie", setCookie("sid", sid, SESSION_DAYS, secure));
    c.header("Set-Cookie", setCookie("cid", cartId, CART_DAYS, secure), { append: true });
    return c.json({ user: { id: userId, email, name, phone, role: "customer", customer_group: "retail" } });
  });

  app.post("/auth/login", async (c) => {
    const body = await c.req.json<{ email?: string; password?: string }>();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const ip = c.req.header("cf-connecting-ip") || "unknown";

    // Brute-force ochrana: max. 8 neúspěšných pokusů za 15 minut (na e-mail i IP).
    // created_at je ve formátu datetime('now') — porovnáváme v SQL, ne v JS.
    const emailFails = await c.env.DB
      .prepare("SELECT COUNT(*) AS c FROM login_attempts WHERE key = ? AND created_at > datetime('now', '-15 minutes')")
      .bind(`email:${email}`)
      .first<{ c: number }>();
    const ipFails = await c.env.DB
      .prepare("SELECT COUNT(*) AS c FROM login_attempts WHERE key = ? AND created_at > datetime('now', '-15 minutes')")
      .bind(`ip:${ip}`)
      .first<{ c: number }>();
    if ((emailFails?.c || 0) >= LOGIN_MAX_FAILS || (ipFails?.c || 0) >= LOGIN_MAX_FAILS) {
      return c.json({ error: "Příliš mnoho pokusů o přihlášení. Zkuste to znovu za 15 minut." }, 429);
    }

    const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<{
      id: number;
      email: string;
      password_hash: string;
      name: string;
      phone: string;
      role: "customer" | "admin";
      totp_secret: string;
    }>();
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      await c.env.DB.prepare("INSERT INTO login_attempts (key) VALUES (?)").bind(`email:${email}`).run();
      await c.env.DB.prepare("INSERT INTO login_attempts (key) VALUES (?)").bind(`ip:${ip}`).run();
      return c.json({ error: "Nesprávný e-mail nebo heslo." }, 401);
    }

    // Dvoufázové ověření (TOTP) — pokud má uživatel nastavený tajný klíč.
    const totpRequired = user.role === "admin" && user.totp_secret;
    if (totpRequired) {
      const challenge = randomId();
      await c.env.DB
        .prepare("INSERT INTO otp_challenges (id, user_id, expires_at) VALUES (?, ?, ?)")
        .bind(challenge, user.id, Date.now() + 5 * 60_000)
        .run();
      return c.json({ need_otp: true, challenge, email: user.email });
    }

    const sid = randomId();
    const exp = Date.now() + SESSION_DAYS * 86400 * 1000;
    await c.env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").bind(sid, user.id, exp).run();
    const cartId = await mergeCarts(c.env.DB, c.get("cartId"), user.id);
    const secure = isSecure(c);
    c.header("Set-Cookie", setCookie("sid", sid, SESSION_DAYS, secure));
    c.header("Set-Cookie", setCookie("cid", cartId, CART_DAYS, secure), { append: true });
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        customer_group: (user as { customer_group?: string }).customer_group === "b2b" ? "b2b" : "retail",
      },
    });
  });

  // Druhý faktor přihlášení — ověření TOTP kódu z autentizační aplikace.
  app.post("/auth/otp", async (c) => {
    const body = await c.req.json<{ challenge?: string; code?: string }>();
    const challenge = (body.challenge || "").trim();
    const code = (body.code || "").trim();
    const row = await c.env.DB
      .prepare("SELECT * FROM otp_challenges WHERE id = ? AND expires_at > ?")
      .bind(challenge, Date.now())
      .first<{ id: string; user_id: number }>();
    if (!row) return c.json({ error: "Ověření vypršelo. Přihlaste se znovu." }, 400);
    const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(row.user_id).first<{
      id: number;
      email: string;
      name: string;
      phone: string;
      role: "customer" | "admin";
      totp_secret: string;
    }>();
    if (!user) return c.json({ error: "Uživatel nenalezen." }, 404);
    const ok = await verifyTotp(user.totp_secret, code);
    await c.env.DB.prepare("DELETE FROM otp_challenges WHERE id = ?").bind(challenge).run();
    if (!ok) return c.json({ error: "Ověřovací kód nesouhlasí. Zkuste to znovu." }, 401);
    const sid = randomId();
    const exp = Date.now() + SESSION_DAYS * 86400 * 1000;
    await c.env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").bind(sid, user.id, exp).run();
    const cartId = await mergeCarts(c.env.DB, c.get("cartId"), user.id);
    const secure = isSecure(c);
    c.header("Set-Cookie", setCookie("sid", sid, SESSION_DAYS, secure));
    c.header("Set-Cookie", setCookie("cid", cartId, CART_DAYS, secure), { append: true });
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        customer_group: (user as { customer_group?: string }).customer_group === "b2b" ? "b2b" : "retail",
      },
    });
  });

  /* ---------------------------------------------------------------
     Zapomenuté heslo — odkaz na obnovu e-mailem
     --------------------------------------------------------------- */

  /**
   * Požadavek na obnovu hesla. Odpověď je vždy stejná (i pro neexistující
   * e-mail), aby se nedalo zjišťovat, kdo má u nás účet.
   */
  app.post("/auth/forgot", async (c) => {
    const body = await c.req.json<{ email?: string }>();
    const email = (body.email || "").trim().toLowerCase();
    const ok = { ok: true, message: "Pokud u nás účet existuje, poslali jsme na něj odkaz pro nastavení nového hesla." };
    if (!validEmail(email)) return c.json({ error: "Zadejte platný e-mail." }, 400);

    // Ochrana proti zahlcení: max. 5 požadavků na e-mail za 15 minut.
    const fails = await c.env.DB
      .prepare("SELECT COUNT(*) AS c FROM login_attempts WHERE key = ? AND created_at > datetime('now', '-15 minutes')")
      .bind(`reset:${email}`)
      .first<{ c: number }>();
    if ((fails?.c || 0) >= 5) return c.json({ error: "Příliš mnoho požadavků. Zkuste to prosím za 15 minut." }, 429);
    await c.env.DB.prepare("INSERT INTO login_attempts (key) VALUES (?)").bind(`reset:${email}`).run();

    const user = await c.env.DB.prepare("SELECT id, email, name FROM users WHERE email = ?").bind(email).first<{
      id: number;
      email: string;
      name: string;
    }>();
    if (!user) return c.json(ok);

    const token = `${randomId()}${randomId()}`;
    const expires = Date.now() + 60 * 60 * 1000;
    await c.env.DB.prepare("UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0").bind(user.id).run();
    await c.env.DB
      .prepare("INSERT INTO password_resets (id, user_id, email, expires_at) VALUES (?, ?, ?, ?)")
      .bind(token, user.id, user.email, expires)
      .run();

    const origin = new URL(c.req.url).origin;
    const url = `${origin}/obnova-hesla?token=${encodeURIComponent(token)}`;
    try {
      await notifyPasswordReset(c.env.DB, user.email, user.name, url, c.env);
    } catch (err) {
      console.error("Password reset mail error:", err);
    }
    return c.json(ok);
  });

  /** Ověří platnost odkazu (aby formulář rovnou řekl, že odkaz vypršel). */
  app.get("/auth/reset", async (c) => {
    const token = (c.req.query("token") || "").trim();
    const row = await c.env.DB
      .prepare("SELECT email FROM password_resets WHERE id = ? AND used = 0 AND expires_at > ?")
      .bind(token, Date.now())
      .first<{ email: string }>();
    if (!row) return c.json({ error: "Odkaz je neplatný nebo mu vypršela platnost." }, 400);
    return c.json({ ok: true, email: row.email });
  });

  /** Nastaví nové heslo a rovnou zákazníka přihlásí. */
  app.post("/auth/reset", async (c) => {
    const body = await c.req.json<{ token?: string; password?: string }>();
    const token = (body.token || "").trim();
    const password = body.password || "";
    if (password.length < 8) return c.json({ error: "Heslo musí mít alespoň 8 znaků." }, 400);
    const row = await c.env.DB
      .prepare("SELECT * FROM password_resets WHERE id = ? AND used = 0 AND expires_at > ?")
      .bind(token, Date.now())
      .first<{ id: string; user_id: number; email: string }>();
    if (!row) return c.json({ error: "Odkaz je neplatný nebo mu vypršela platnost. Požádejte o nový." }, 400);

    const hash = await hashPassword(password);
    await c.env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(hash, row.user_id).run();
    await c.env.DB.prepare("UPDATE password_resets SET used = 1 WHERE id = ?").bind(row.id).run();
    // Bezpečnost: staré přihlášení jinde zneplatníme.
    await c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(row.user_id).run();
    await c.env.DB.prepare("DELETE FROM login_attempts WHERE key = ?").bind(`email:${row.email}`).run();

    const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(row.user_id).first<{
      id: number;
      email: string;
      name: string;
      phone: string;
      role: "customer" | "admin";
      totp_secret: string;
      customer_group?: string;
    }>();
    if (!user) return c.json({ error: "Účet nenalezen." }, 404);
    // Účet s dvoufázovým ověřením nepřihlašujeme rovnou — projde přes /prihlaseni.
    if (user.role === "admin" && user.totp_secret) {
      return c.json({ ok: true, need_login: true });
    }
    const sid = randomId();
    const exp = Date.now() + SESSION_DAYS * 86400 * 1000;
    await c.env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").bind(sid, user.id, exp).run();
    const cartId = await mergeCarts(c.env.DB, c.get("cartId"), user.id);
    const secure = isSecure(c);
    c.header("Set-Cookie", setCookie("sid", sid, SESSION_DAYS, secure));
    c.header("Set-Cookie", setCookie("cid", cartId, CART_DAYS, secure), { append: true });
    return c.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        customer_group: user.customer_group === "b2b" ? "b2b" : "retail",
      },
    });
  });

  app.post("/auth/logout", async (c) => {
    const sid = c.req.header("Cookie") ? undefined : undefined;
    void sid;
    const raw = c.req.header("Cookie") || "";
    const m = raw.match(/(?:^|;\s*)sid=([^;]+)/);
    if (m) await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(m[1]).run();
    const secure = isSecure(c);
    c.header("Set-Cookie", clearCookie("sid", secure));
    return c.json({ ok: true });
  });

  app.get("/auth/me", (c) => c.json({ user: c.get("user") }));

  app.get("/cart", async (c) => {
    await ensureCart(c.env.DB, c.get("cartId"), c.get("user")?.id ?? null);
    return c.json(await loadCart(c.env.DB, c.get("cartId"), await priceContext(c.env.DB, c.get("user"))));
  });

  app.post("/cart/items", async (c) => {
    const body = await c.req.json<{ product_id?: number; quantity?: number }>();
    const productId = Number(body.product_id);
    const qty = Math.max(1, Number(body.quantity || 1));
    const p = await c.env.DB.prepare("SELECT id, stock, active FROM products WHERE id = ?").bind(productId).first<{ id: number; stock: number; active: number }>();
    if (!p || !p.active) return c.json({ error: "Produkt není dostupný." }, 404);
    if (p.stock < 1) return c.json({ error: "Produkt je vyprodaný." }, 400);
    const cartId = c.get("cartId");
    await ensureCart(c.env.DB, cartId, c.get("user")?.id ?? null);
    const existing = await c.env.DB.prepare("SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?").bind(cartId, productId).first<{ id: number; quantity: number }>();
    const next = (existing?.quantity || 0) + qty;
    if (next > p.stock) return c.json({ error: `Na skladě je jen ${p.stock} ks.` }, 400);
    if (existing) {
      await c.env.DB.prepare("UPDATE cart_items SET quantity = ? WHERE id = ?").bind(next, existing.id).run();
    } else {
      await c.env.DB.prepare("INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)").bind(cartId, productId, qty).run();
    }
    return c.json(await loadCart(c.env.DB, cartId, await priceContext(c.env.DB, c.get("user"))));
  });

  app.patch("/cart/items/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json<{ quantity?: number }>();
    const qty = Math.max(0, Number(body.quantity || 0));
    const cartId = c.get("cartId");
    const item = await c.env.DB.prepare(
      `SELECT ci.id, ci.product_id, p.stock FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.id = ? AND ci.cart_id = ?`
    )
      .bind(id, cartId)
      .first<{ id: number; product_id: number; stock: number }>();
    if (!item) return c.json({ error: "Položka v košíku není." }, 404);
    if (qty === 0) {
      await c.env.DB.prepare("DELETE FROM cart_items WHERE id = ?").bind(id).run();
    } else {
      if (qty > item.stock) return c.json({ error: `Na skladě je jen ${item.stock} ks.` }, 400);
      await c.env.DB.prepare("UPDATE cart_items SET quantity = ? WHERE id = ?").bind(qty, id).run();
    }
    return c.json(await loadCart(c.env.DB, cartId, await priceContext(c.env.DB, c.get("user"))));
  });

  app.delete("/cart/items/:id", async (c) => {
    await c.env.DB.prepare("DELETE FROM cart_items WHERE id = ? AND cart_id = ?").bind(Number(c.req.param("id")), c.get("cartId")).run();
    return c.json(await loadCart(c.env.DB, c.get("cartId"), await priceContext(c.env.DB, c.get("user"))));
  });

  app.post("/cart/coupon", async (c) => {
    const body = await c.req.json<{ code?: string }>();
    const code = (body.code || "").trim();
    // Kupóny s nastaveným automatickým smazáním po vypršení uklidíme dřív,
    // než se je zákazník pokusí uplatnit.
    await purgeExpiredCoupons(c.env.DB);
    const cart = await loadCart(c.env.DB, c.get("cartId"), await priceContext(c.env.DB, c.get("user")));
    const coupon = await getCoupon(c.env.DB, code);
    if (!coupon) return c.json({ error: "Kupón neexistuje." }, 404);
    const disc = await loadCouponDiscount(c.env.DB, coupon, cart.subtotal, c.get("user")?.id ?? null);
    if (!disc.ok) return c.json({ error: disc.error }, 400);
    await ensureCart(c.env.DB, c.get("cartId"), c.get("user")?.id ?? null);
    await c.env.DB.prepare("UPDATE carts SET coupon_code = ? WHERE id = ?").bind(coupon.code, c.get("cartId")).run();
    return c.json(await loadCart(c.env.DB, c.get("cartId"), await priceContext(c.env.DB, c.get("user"))));
  });

  app.delete("/cart/coupon", async (c) => {
    await c.env.DB.prepare("UPDATE carts SET coupon_code = NULL WHERE id = ?").bind(c.get("cartId")).run();
    return c.json(await loadCart(c.env.DB, c.get("cartId"), await priceContext(c.env.DB, c.get("user"))));
  });

  app.get("/cart/upsells", async (c) => {
    const cart = await loadCart(c.env.DB, c.get("cartId"), await priceContext(c.env.DB, c.get("user")));
    const inCart = new Set(cart.items.map((i) => i.product_id));
    const ids = cart.items.map((i) => i.product_id);
    if (!ids.length) return c.json({ items: [] });
    const placeholders = ids.map(() => "?").join(",");
    const mapped =
      (
        await c.env.DB
          .prepare(
            `SELECT p.id, p.name, p.slug, p.sku, p.price, p.price_b2b, p.image, p.stock, p.short_description, u.product_id AS for_product
             FROM product_upsells u
             JOIN products p ON p.id = u.upsell_product_id
             WHERE u.product_id IN (${placeholders}) AND p.active = 1 AND p.stock > 0
             ORDER BY u.sort_order, p.price`
          )
          .bind(...ids)
          .all()
      ).results || [];
    const fallback =
      mapped.length
        ? []
        : (
            await c.env.DB
              .prepare(
                `SELECT p.id, p.name, p.slug, p.sku, p.price, p.price_b2b, p.image, p.stock, p.short_description, p.category_id AS for_product
                 FROM products p
                 WHERE p.active = 1 AND p.stock > 0 AND p.featured = 1
                 ORDER BY p.price ASC LIMIT 6`
              )
              .all()
          ).results || [];
    const seen = new Set<number>();
    const items = [...mapped, ...fallback].filter((p) => {
      const id = (p as { id: number }).id;
      if (inCart.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    const ctxUp = await priceContext(c.env.DB, c.get("user"));
    return c.json({ items: applyPricingAll(items.slice(0, 4) as { price: number }[], ctxUp) });
  });

  /**
   * Zapamatování e-mailu z pokladny — zákazník ho vyplní, ale nemusí nákup
   * dokončit. Na tenhle e-mail pak naváže série „opuštěný košík“ (2 h / 24 h).
   * Neposílá nic hned, jen si e-mail uloží ke košíku.
   */
  app.post("/cart/email", async (c) => {
    const body = await c.req.json<{ email?: string }>().catch(() => ({}) as { email?: string });
    const email = (body.email || c.get("user")?.email || "").trim().toLowerCase();
    if (!validEmail(email)) return c.json({ ok: false, skipped: true });
    const cartId = c.get("cartId");
    await ensureCart(c.env.DB, cartId, c.get("user")?.id ?? null);
    const has = await c.env.DB.prepare("SELECT 1 AS ok FROM cart_items WHERE cart_id = ? LIMIT 1").bind(cartId).first();
    if (!has) return c.json({ ok: true, skipped: true });
    await c.env.DB
      .prepare("UPDATE carts SET email = ?, abandoned_stage = 0, abandoned_at = datetime('now') WHERE id = ?")
      .bind(email, cartId)
      .run();
    return c.json({ ok: true });
  });

  app.post("/cart/abandon", async (c) => {
    const body = await c.req.json<{ email?: string }>();
    const email = (body.email || c.get("user")?.email || "").trim().toLowerCase();
    if (!validEmail(email)) return c.json({ error: "Zadejte platný e-mail." }, 400);
    const cart = await loadCart(c.env.DB, c.get("cartId"), await priceContext(c.env.DB, c.get("user")));
    if (!cart.items.length) return c.json({ ok: true, skipped: true });
    // E-mail si pamatujeme u košíku — série opuštěného košíku na něj naváže.
    await ensureCart(c.env.DB, c.get("cartId"), c.get("user")?.id ?? null);
    await c.env.DB.prepare("UPDATE carts SET email = ?, abandoned_stage = 1, abandoned_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").bind(email, c.get("cartId")).run();
    const s = await loadSettings(c.env.DB);
    const code = s.exit_coupon || "STAY5";
    try {
      await notifyAbandonedCart(c.env.DB, email, code, c.env);
    } catch (err) {
      console.error("abandon mail", err);
    }
    return c.json({ ok: true, coupon: code });
  });

  app.post("/stock-alerts", async (c) => {
    const body = await c.req.json<{ product_id?: number; email?: string }>();
    const email = (body.email || c.get("user")?.email || "").trim().toLowerCase();
    const productId = Number(body.product_id);
    if (!validEmail(email)) return c.json({ error: "Zadejte platný e-mail." }, 400);
    const p = await c.env.DB.prepare("SELECT id, stock, name FROM products WHERE id = ? AND active = 1").bind(productId).first<{ id: number; stock: number; name: string }>();
    if (!p) return c.json({ error: "Produkt nenalezen." }, 404);
    if (p.stock > 0) return c.json({ error: "Produkt je skladem — můžete ho rovnou koupit." }, 400);
    await c.env.DB
      .prepare("INSERT OR IGNORE INTO stock_alerts (product_id, email) VALUES (?, ?)")
      .bind(productId, email)
      .run();
    return c.json({ ok: true, message: `Až bude ${p.name} znovu skladem, napíšeme na ${email}.` });
  });

  // Web Push — upozornění „hlídací pes“ přímo do prohlížeče.
  app.post("/push/subscribe", async (c) => {
    const body = await c.req.json<{ product_id?: number; endpoint?: string; keys?: { p256dh?: string; auth?: string } }>();
    const endpoint = (body.endpoint || "").trim();
    if (!endpoint || !endpoint.startsWith("https://")) return c.json({ error: "Neplatná subscription." }, 400);
    await c.env.DB
      .prepare(
        `INSERT INTO push_subscriptions (product_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET product_id = excluded.product_id, p256dh = excluded.p256dh, auth = excluded.auth`
      )
      .bind(Number(body.product_id) || 0, endpoint, body.keys?.p256dh || "", body.keys?.auth || "")
      .run();
    return c.json({ ok: true });
  });

  app.post("/push/unsubscribe", async (c) => {
    const body = await c.req.json<{ endpoint?: string }>();
    const endpoint = (body.endpoint || "").trim();
    if (endpoint) await c.env.DB.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(endpoint).run();
    return c.json({ ok: true });
  });

  app.post("/checkout", async (c) => {
    const body = await c.req.json<{
      email?: string;
      name?: string;
      phone?: string;
      billing_name?: string;
      billing_street?: string;
      billing_city?: string;
      billing_zip?: string;
      billing_country?: string;
      is_company?: boolean | number;
      company_name?: string;
      ico?: string;
      dic?: string;
      different_shipping?: boolean | number;
      shipping_recipient?: string;
      shipping_code?: string;
      payment_code?: string;
      street?: string;
      city?: string;
      zip?: string;
      country?: string;
      pickup_point_id?: number;
      pickup?: {
        external_id?: string;
        name?: string;
        address?: string;
        city?: string;
        zip?: string;
        lat?: number;
        lng?: number;
        opening_hours?: string;
        type?: string;
        carrier?: string;
        source?: string;
      };
      note?: string;
      agree_terms?: boolean | number;
      /** Dárkový poukaz — komu ho poslat (nepovinné, jinak jde na e-mail objednávky). */
      gift_recipient_email?: string;
      gift_recipient_name?: string;
      gift_message?: string;
    }>();

    const user = c.get("user");
    const email = (body.email || user?.email || "").trim().toLowerCase();
    const phone = (body.phone || user?.phone || "").trim();
    if (!validEmail(email)) return c.json({ error: "Zadejte platný e-mail." }, 400);
    if (phone.length < 6) return c.json({ error: "Zadejte telefonní číslo pro dopravce." }, 400);

    const isCompany = Boolean(body.is_company);
    const companyName = (body.company_name || "").trim();
    const ico = (body.ico || "").trim().replace(/\s+/g, "");
    const dic = (body.dic || "").trim().toUpperCase().replace(/\s+/g, "");

    const billingName = (body.billing_name || body.name || user?.name || "").trim();
    const billingStreet = (body.billing_street || body.street || "").trim();
    const billingCity = (body.billing_city || body.city || "").trim();
    const billingZip = (body.billing_zip || body.zip || "").trim();
    const billingCountry = (body.billing_country || "CZ").trim().toUpperCase();

    if (billingName.length < 2) return c.json({ error: "Zadejte jméno a příjmení pro fakturaci." }, 400);
    if (billingStreet.length < 3) return c.json({ error: "Zadejte fakturační ulici a číslo popisné." }, 400);
    if (billingCity.length < 2) return c.json({ error: "Zadejte fakturační město." }, 400);
    if (billingZip.length < 3) return c.json({ error: "Zadejte fakturační PSČ." }, 400);

    if (isCompany) {
      if (companyName.length < 2) return c.json({ error: "Při nákupu na firmu zadejte název společnosti." }, 400);
      if (ico.length < 4) return c.json({ error: "Při nákupu na firmu zadejte platné IČO." }, 400);
    }

    if (body.agree_terms === false) {
      return c.json({ error: "Pro odeslání objednávky musíte potvrdit souhlas s obchodními podmínkami." }, 400);
    }

    const cart = await loadCart(c.env.DB, c.get("cartId"), await priceContext(c.env.DB, c.get("user")));
    if (!cart.items.length) return c.json({ error: "Košík je prázdný." }, 400);

    // Sleva na první nákup (např. KAVKA10) patří jen přihlášeným zákazníkům.
    if (cart.coupon?.code) {
      const cpn = await getCoupon(c.env.DB, cart.coupon.code);
      if (cpn?.requires_login && !user) {
        return c.json({ error: "Slevu na první nákup využijí jen registrovaní zákazníci. Přihlaste se." }, 400);
      }
      if (cpn?.single_use && user) {
        const red = await c.env.DB
          .prepare("SELECT COUNT(*) AS c FROM coupon_redemptions WHERE coupon_code = ? AND user_id = ?")
          .bind(cpn.code, user.id)
          .first<{ c: number }>();
        if ((red?.c || 0) > 0) {
          return c.json({ error: "Slevu na první nákup už jste využili — platí jen jednou." }, 400);
        }
      }
    }

    for (const it of cart.items) {
      if (it.quantity > it.stock) return c.json({ error: `${it.name}: na skladě je jen ${it.stock} ks.` }, 400);
    }

    const shipping = await c.env.DB.prepare("SELECT * FROM shipping_methods WHERE code = ? AND active = 1").bind(body.shipping_code || "").first<{
      code: string;
      name: string;
      price: number;
      free_over: number | null;
      kind: string;
    }>();
    if (!shipping) return c.json({ error: "Vyberte způsob dopravy." }, 400);
    // Doručení e-mailem je jen pro košík se samotnými dárkovými poukazy.
    const digitalOnly = cart.items.length > 0 && cart.items.every((i) => Number((i as { is_gift_card?: number }).is_gift_card) === 1);
    if (shipping.kind === "digital" && !digitalOnly) {
      return c.json({ error: "Doručení e-mailem lze zvolit jen u objednávky se samotnými dárkovými poukazy." }, 400);
    }

    const payment = await c.env.DB.prepare("SELECT * FROM payment_methods WHERE code = ? AND active = 1").bind(body.payment_code || "").first<{
      code: string;
      name: string;
      fee: number;
      allowed_shipping: string;
    }>();
    if (!payment) return c.json({ error: "Vyberte způsob platby." }, 400);
    if (payment.allowed_shipping !== "*") {
      const allowed = payment.allowed_shipping.split(",").map((s) => s.trim());
      if (!allowed.includes(shipping.code)) {
        return c.json({ error: "Tato platba nejde zkombinovat s vybranou dopravou." }, 400);
      }
    }

    let pickupSnapshot = "";
    let pickupId: number | null = null;
    const differentShipping = Boolean(body.different_shipping);
    let shippingRecipient = (body.shipping_recipient || billingName).trim();
    let street = billingStreet;
    let city = billingCity;
    let zip = billingZip;
    let country = billingCountry;

    if (shipping.kind.startsWith("pickup_")) {
      const wantType = shipping.kind === "pickup_zbox" ? "zbox" : shipping.kind === "pickup_balikovna" ? "balikovna" : "branch";
      const point = await resolveCheckoutPickup(c.env.DB, wantType, body.pickup_point_id, body.pickup);
      if (!point) return c.json({ error: "Vyberte výdejní místo na mapě." }, 400);
      if (point.type !== wantType) return c.json({ error: "Toto místo neodpovídá vybrané dopravě." }, 400);
      pickupId = point.id;
      pickupSnapshot = JSON.stringify(point);
      shippingRecipient = billingName;
      street = point.address;
      city = point.city;
      zip = point.zip;
      country = "CZ";
    } else if (shipping.kind === "address") {
      if (differentShipping) {
        shippingRecipient = (body.shipping_recipient || "").trim();
        street = (body.street || "").trim();
        city = (body.city || "").trim();
        zip = (body.zip || "").trim();
        country = (body.country || "CZ").trim().toUpperCase();
        if (shippingRecipient.length < 2) return c.json({ error: "Vyplňte jméno příjemce pro doručení." }, 400);
        if (street.length < 3 || city.length < 2 || zip.length < 3) {
          return c.json({ error: "Vyplňte doručovací ulici, město a PSČ." }, 400);
        }
      } else {
        shippingRecipient = billingName;
        street = billingStreet;
        city = billingCity;
        zip = billingZip;
        country = billingCountry;
      }
    } else if (shipping.kind === "store") {
      const addr = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'store_address'").first<{ value: string }>();
      shippingRecipient = billingName;
      street = addr?.value || "Korunní 42";
      city = "Praha";
      zip = "12000";
      country = "CZ";
    }

    const afterDiscount = cart.subtotal - cart.discount;
    let shipPrice = shipping.price;
    if (shipping.free_over != null && afterDiscount >= shipping.free_over) shipPrice = 0;
    const total = afterDiscount + shipPrice + payment.fee;

    const number = orderNumber();
    // Při nulové částce (např. slevový poukaz na 100 %) není co platit —
    // objednávka je automaticky zaplacená a QR platba se nezobrazí.
    const walletPay = payment.code === "apple_pay" || payment.code === "google_pay";
    let payStatus = payment.code === "transfer" ? "pending" : payment.code === "cod" || payment.code === "card_delivery" || payment.code === "cash_store" ? "cod" : walletPay ? "paid" : "pending";
    if (total <= 0) payStatus = "paid";

    const stmts: D1PreparedStatement[] = [];
    stmts.push(
      c.env.DB.prepare(
        `INSERT INTO orders (
          number, user_id, email, name, phone,
          billing_name, billing_street, billing_city, billing_zip, billing_country,
          is_company, company_name, ico, dic,
          different_shipping, shipping_recipient,
          shipping_code, shipping_name, shipping_price,
          payment_code, payment_name, payment_fee, payment_status, status,
          street, city, zip, country, pickup_point_id, pickup_snapshot,
          subtotal, discount, coupon_code, total, note,
          agree_terms, agree_gdpr, customer_group
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`
      ).bind(
        number,
        user?.id ?? null,
        email,
        billingName,
        phone,
        billingName,
        billingStreet,
        billingCity,
        billingZip,
        billingCountry,
        isCompany ? 1 : 0,
        companyName,
        ico,
        dic,
        differentShipping ? 1 : 0,
        shippingRecipient,
        shipping.code,
        shipping.name,
        shipPrice,
        payment.code,
        payment.name,
        payment.fee,
        payStatus,
        street,
        city,
        zip,
        country,
        pickupId,
        pickupSnapshot,
        cart.subtotal,
        cart.discount,
        cart.coupon?.code ?? null,
        total,
        (body.note || "").trim(),
        user?.customer_group === "b2b" ? "b2b" : "retail"
      )
    );

    const insert = await stmts[0].run();
    const orderId = Number(insert.meta.last_row_id);

    const follow: D1PreparedStatement[] = [];
    for (const it of cart.items) {
      follow.push(
        c.env.DB.prepare("INSERT INTO order_items (order_id, product_id, name, sku, price, quantity) VALUES (?, ?, ?, ?, ?, ?)").bind(
          orderId,
          it.product_id,
          it.name,
          it.sku,
          it.price,
          it.quantity
        )
      );
      follow.push(
        c.env.DB.prepare("UPDATE products SET stock = stock - ?, updated_at = datetime('now') WHERE id = ? AND stock >= ?").bind(
          it.quantity,
          it.product_id,
          it.quantity
        )
      );
      follow.push(
        c.env.DB.prepare("INSERT INTO stock_movements (product_id, delta, reason, order_id) VALUES (?, ?, ?, ?)").bind(
          it.product_id,
          -it.quantity,
          "Objednávka " + number,
          orderId
        )
      );
    }
    if (cart.coupon?.code) {
      follow.push(
        c.env.DB.prepare(
          "UPDATE coupons SET used_count = used_count + 1 WHERE code = ? AND (max_uses IS NULL OR used_count < max_uses)"
        ).bind(cart.coupon.code)
      );
      // Zaznamenáme čerpání „slevy na první nákup“ na konkrétního zákazníka.
      if (user?.id) {
        follow.push(
          c.env.DB
            .prepare("INSERT INTO coupon_redemptions (coupon_code, user_id, order_id) VALUES (?, ?, ?)")
            .bind(cart.coupon.code, user.id, orderId)
        );
      }
    }
    follow.push(c.env.DB.prepare("DELETE FROM cart_items WHERE cart_id = ?").bind(c.get("cartId")));
    follow.push(c.env.DB.prepare("UPDATE carts SET coupon_code = NULL, email = ? WHERE id = ?").bind(email, c.get("cartId")));

    const batch = await c.env.DB.batch(follow);
    for (let i = 0; i < cart.items.length; i++) {
      const upd = batch[i * 3 + 1];
      if (upd.meta.changes === 0) {
        await c.env.DB.prepare("DELETE FROM order_items WHERE order_id = ?").bind(orderId).run();
        await c.env.DB.prepare("DELETE FROM orders WHERE id = ?").bind(orderId).run();
        return c.json({ error: "Sklad se mezitím změnil. Obnovte košík a zkuste to znovu." }, 409);
      }
    }

    // Automatická faktura (nastavení: invoice_auto / invoice_auto_on)
    try {
      const s = await loadSettings(c.env.DB);
      if (s.invoice_auto !== "0" && (s.invoice_auto_on || "order") === "order") {
        await ensureInvoiceForOrder(c.env.DB, orderId, s);
      }
    } catch (err) {
      console.error("Auto invoice error:", err);
    }

    const origin = new URL(c.req.url).origin;
    await c.env.DB.prepare("UPDATE settings SET value = ? WHERE key = 'store_url' AND (value IS NULL OR value = '')").bind(origin).run();

    // Dárkové poukazy — ke každé zakoupené položce typu „poukaz“ vznikne kód.
    // Zákazníkovi ho pošleme až po zaplacení (u dobírky až expedice ho pošle
    // administrace tlačítkem „Odeslat poukazy“).
    try {
      const created = await createVouchersForOrder(
        c.env.DB,
        { id: orderId, number, email, user_id: user?.id ?? null },
        {
          recipient_email: (body.gift_recipient_email || "").trim(),
          recipient_name: (body.gift_recipient_name || "").trim(),
          message: (body.gift_message || "").trim(),
        }
      );
      if (created && payment.code === "card") {
        /* poukaz odejde po potvrzení platby z brány */
      }
    } catch (err) {
      console.error("Gift voucher error:", err);
    }

    const order = await loadOrder(c.env.DB, orderId);
    try {
      if (order) {
        await notifyOrderCreated(c.env.DB, {
          number: String(order.number),
          email: String(order.email),
          name: String(order.name),
          total: Number(order.total),
          shipping_name: String(order.shipping_name),
          payment_name: String(order.payment_name),
          items: (order.items as { name: string; quantity: number; price: number }[]) || [],
        }, c.env);
      }
    } catch (err) {
      console.error("Order mail error:", err);
    }

    // Platba kartou online — vytvoříme relaci v platební bráně a zákazníka
    // přesměrujeme na její zabezpečenou stránku. Když se to nepovede, objednávka
    // zůstává platná (stav „čeká na platbu“) a dá se doplatit z detailu objednávky.
    let redirectUrl: string | undefined;
    if (payment.code === "card" && total > 0) {
      const s = await loadSettings(c.env.DB);
      const comgate: ComgateSettings = {
        merchant: s.comgate_merchant,
        secret: s.comgate_secret,
        test: s.comgate_test !== "0",
      };
      const created = await comgateCreate(comgate, {
        number,
        email,
        name: billingName,
        total,
      });
      if (created.ok && created.transId) {
        await c.env.DB
          .prepare("UPDATE orders SET gateway_trans_id = ?, gateway = 'comgate' WHERE id = ?")
          .bind(created.transId, orderId)
          .run();
        redirectUrl = created.redirect || `https://payments.comgate.cz/${created.transId}`;
      } else {
        console.error("comgate create failed:", created.error);
      }
    }

    const secure = isSecure(c);
    c.header("Set-Cookie", setCookie("oid", number, 2, secure));
    return c.json({ order, redirect_url: redirectUrl });
  });

  // Doplatek kartou z detailu objednávky (nebo nový pokus po neúspěšném startu brány).
  app.post("/orders/:id/pay", async (c) => {
    const key = c.req.param("id");
    const user = c.get("user");
    const oidCookie = (c.req.header("Cookie") || "").match(/(?:^|;\s*)oid=([^;]+)/)?.[1];
    let orderRow: { id: number; number: string; user_id: number | null; total: number; payment_code: string } | null = null;
    if (/^\d+$/.test(key)) {
      orderRow = await c.env.DB.prepare("SELECT id, number, user_id, total, payment_code FROM orders WHERE id = ?").bind(Number(key)).first();
    } else {
      orderRow = await c.env.DB.prepare("SELECT id, number, user_id, total, payment_code FROM orders WHERE number = ?").bind(key).first();
    }
    if (!orderRow) return c.json({ error: "Objednávka nenalezena." }, 404);
    const owns = user && orderRow.user_id === user.id;
    const guest = oidCookie && oidCookie === orderRow.number;
    const admin = user?.role === "admin";
    if (!owns && !guest && !admin) return c.json({ error: "Objednávka nenalezena." }, 404);
    if (orderRow.payment_code !== "card") return c.json({ error: "Tato objednávka se neplatí kartou." }, 400);
    if (orderRow.total <= 0) return c.json({ error: "Objednávka je zdarma." }, 400);

    const order = await loadOrder(c.env.DB, orderRow.id);
    const s = await loadSettings(c.env.DB);
    const comgate: ComgateSettings = {
      merchant: s.comgate_merchant,
      secret: s.comgate_secret,
      test: s.comgate_test !== "0",
    };
    const created = await comgateCreate(comgate, {
      number: String(order?.number || orderRow.number),
      email: String(order?.email || ""),
      name: String(order?.name || ""),
      total: Number(orderRow.total),
    });
    if (!created.ok) return c.json({ error: created.error || "Platební brána není dostupná." }, 502);
    if (created.transId) {
      await c.env.DB
        .prepare("UPDATE orders SET gateway_trans_id = ?, gateway = 'comgate' WHERE id = ?")
        .bind(created.transId, orderRow.id)
        .run();
    }
    return c.json({ redirect_url: created.redirect || `https://payments.comgate.cz/${created.transId}` });
  });

  // Návrat z platební brány (paidUrl/cancelUrl/pendingUrl v portálu Comgate).
  // Výsledek nikdy nevěříme URL parametrům — ověříme stav přes status API.
  app.get("/payments/return", async (c) => {
    const refId = c.req.query("refId") || c.req.query("refid") || "";
    const row = refId
      ? await c.env.DB.prepare("SELECT id, number, gateway_trans_id, payment_status FROM orders WHERE number = ?").bind(refId).first<{ id: number; number: string; gateway_trans_id: string; payment_status: string }>()
      : null;
    if (!row) return c.redirect("/sledovani");
    if (row.gateway_trans_id) {
      const s = await loadSettings(c.env.DB);
      const status = await comgateStatus({ merchant: s.comgate_merchant, secret: s.comgate_secret, test: s.comgate_test !== "0" }, row.gateway_trans_id);
      if (status.ok && status.paid && row.payment_status !== "paid") {
        await markOrderPaid(c.env.DB, row.id, "comgate", c.env);
      }
    }
    return c.redirect(`/objednavka/${row.number}`);
  });

  // Server-to-server oznámení výsledku od brány — jen spouští ověření přes status API.
  app.post("/payments/comgate", async (c) => {
    let body: URLSearchParams;
    try {
      body = new URLSearchParams(await c.req.text());
    } catch {
      return c.json({ error: "Neplatný požadavek." }, 400);
    }
    const refId = body.get("refId") || "";
    const transId = body.get("transId") || "";
    const row = await c.env.DB
      .prepare("SELECT id, gateway_trans_id, payment_status FROM orders WHERE number = ? AND gateway_trans_id = ?")
      .bind(refId, transId)
      .first<{ id: number; gateway_trans_id: string; payment_status: string }>();
    if (!row) return c.json({ error: "Objednávka nenalezena." }, 404);
    const s = await loadSettings(c.env.DB);
    const status = await comgateStatus({ merchant: s.comgate_merchant, secret: s.comgate_secret, test: s.comgate_test !== "0" }, row.gateway_trans_id);
    if (status.ok && status.paid && row.payment_status !== "paid") {
      await markOrderPaid(c.env.DB, row.id, "comgate", c.env);
    }
    return c.json({ ok: true });
  });

  app.get("/orders", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Nejste přihlášeni." }, 401);
    const rows = await c.env.DB.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC").bind(user.id).all();
    return c.json(rows.results || []);
  });

  app.get("/orders/:id", async (c) => {
    const key = c.req.param("id");
    const user = c.get("user");
    const oidCookie = (c.req.header("Cookie") || "").match(/(?:^|;\s*)oid=([^;]+)/)?.[1];
    let order: Record<string, unknown> | null = null;
    if (/^\d+$/.test(key)) {
      order = await loadOrder(c.env.DB, Number(key));
    } else {
      const row = await c.env.DB.prepare("SELECT id FROM orders WHERE number = ?").bind(key).first<{ id: number }>();
      if (row) order = await loadOrder(c.env.DB, row.id);
    }
    if (!order) return c.json({ error: "Objednávka nenalezena." }, 404);
    const owns = user && order.user_id === user.id;
    const guest = oidCookie && oidCookie === order.number;
    const admin = user?.role === "admin";
    if (!owns && !guest && !admin) return c.json({ error: "Objednávka nenalezena." }, 404);
    // Dárkové poukazy z objednávky — kód ukazujeme až po zaplacení (stav „sent“).
    let vouchers: Record<string, unknown>[] = [];
    try {
      const rows =
        (
          await c.env.DB.prepare(
            "SELECT id, code, amount, status, valid_to FROM gift_vouchers WHERE order_id = ? ORDER BY id"
          )
            .bind(Number(order.id))
            .all()
        ).results || [];
      vouchers = rows.map((r) => {
        const row = r as Record<string, unknown>;
        return { ...row, code: row.status === "sent" ? row.code : "" };
      });
    } catch {
      vouchers = [];
    }
    return c.json({ order: { ...order, vouchers } });
  });

  // Faktura k objednávce — pro zákazníka (HTML k tisku / uložení do PDF)
  app.get("/orders/:id/invoice", async (c) => {
    const key = c.req.param("id");
    const user = c.get("user");
    const oidCookie = (c.req.header("Cookie") || "").match(/(?:^|;\s*)oid=([^;]+)/)?.[1];
    let row: { id: number; number: string; user_id: number | null } | null = null;
    if (/^\d+$/.test(key)) {
      row = await c.env.DB.prepare("SELECT id, number, user_id FROM orders WHERE id = ?").bind(Number(key)).first();
    } else {
      row = await c.env.DB.prepare("SELECT id, number, user_id FROM orders WHERE number = ?").bind(key).first();
    }
    if (!row) return c.json({ error: "Objednávka nenalezena." }, 404);
    const owns = user && row.user_id === user.id;
    const guest = oidCookie && oidCookie === row.number;
    const admin = user?.role === "admin";
    if (!owns && !guest && !admin) return c.json({ error: "Objednávka nenalezena." }, 404);

    const s = await loadSettings(c.env.DB);
    const inv = await ensureInvoiceForOrder(c.env.DB, row.id, s);
    if (!inv) return c.json({ error: "Fakturu se nepodařilo připravit." }, 500);
    return c.html(invoiceHtml(inv, s));
  });

  app.post("/orders/lookup", async (c) => {
    const body = await c.req.json<{ number?: string; email?: string }>();
    const number = (body.number || "").trim().toUpperCase();
    const email = (body.email || "").trim().toLowerCase();
    const row = await c.env.DB.prepare("SELECT id FROM orders WHERE number = ? AND email = ?").bind(number, email).first<{ id: number }>();
    if (!row) return c.json({ error: "Objednávku jsme nenašli. Zkontrolujte číslo a e-mail." }, 404);
    const order = await loadOrder(c.env.DB, row.id);
    const secure = isSecure(c);
    c.header("Set-Cookie", setCookie("oid", number, 2, secure));
    return c.json({ order });
  });

  app.get("/account", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Nejste přihlášeni." }, 401);
    const addresses = (await c.env.DB.prepare("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id").bind(user.id).all()).results || [];
    return c.json({ user, addresses });
  });

  /** Dárkové poukazy zákazníka — kód se ukáže až po zaplacení objednávky. */
  app.get("/account/vouchers", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Nejste přihlášeni." }, 401);
    return c.json(await loadUserVouchers(c.env.DB, user.id, user.email));
  });

  app.patch("/account", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Nejste přihlášeni." }, 401);
    const body = await c.req.json<{ name?: string; phone?: string; password?: string }>();
    const name = (body.name || user.name).trim();
    const phone = (body.phone ?? user.phone).trim();
    if (name.length < 2) return c.json({ error: "Zadejte jméno." }, 400);
    if (body.password) {
      if (body.password.length < 8) return c.json({ error: "Heslo musí mít alespoň 8 znaků." }, 400);
      const hash = await hashPassword(body.password);
      await c.env.DB.prepare("UPDATE users SET name = ?, phone = ?, password_hash = ? WHERE id = ?").bind(name, phone, hash, user.id).run();
    } else {
      await c.env.DB.prepare("UPDATE users SET name = ?, phone = ? WHERE id = ?").bind(name, phone, user.id).run();
    }
    return c.json({ user: { ...user, name, phone } });
  });

  app.post("/account/addresses", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Nejste přihlášeni." }, 401);
    const b = await c.req.json<{ label?: string; name?: string; street?: string; city?: string; zip?: string; phone?: string; is_default?: boolean }>();
    if (!b.name || !b.street || !b.city || !b.zip) return c.json({ error: "Vyplňte adresu." }, 400);
    if (b.is_default) await c.env.DB.prepare("UPDATE addresses SET is_default = 0 WHERE user_id = ?").bind(user.id).run();
    await c.env.DB.prepare(
      "INSERT INTO addresses (user_id, label, name, street, city, zip, phone, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(user.id, b.label || "Domů", b.name, b.street, b.city, b.zip, b.phone || "", b.is_default ? 1 : 0)
      .run();
    const addresses = (await c.env.DB.prepare("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id").bind(user.id).all()).results || [];
    return c.json({ addresses });
  });

  app.delete("/account/addresses/:id", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Nejste přihlášeni." }, 401);
    await c.env.DB.prepare("DELETE FROM addresses WHERE id = ? AND user_id = ?").bind(Number(c.req.param("id")), user.id).run();
    const addresses = (await c.env.DB.prepare("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id").bind(user.id).all()).results || [];
    return c.json({ addresses });
  });

  app.post("/reviews", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Pro hodnocení se přihlaste." }, 401);
    const b = await c.req.json<{ product_id?: number; rating?: number; title?: string; comment?: string }>();
    const productId = Number(b.product_id);
    const rating = Number(b.rating);
    if (!productId || rating < 1 || rating > 5) return c.json({ error: "Zadejte hodnocení 1–5." }, 400);
    const bought = await c.env.DB.prepare(
      `SELECT 1 AS ok FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE oi.product_id = ? AND (o.user_id = ? OR o.email = ?) AND o.status != 'cancelled' LIMIT 1`
    )
      .bind(productId, user.id, user.email)
      .first();
    if (!bought)
      return c.json(
        { error: "Hodnotit můžete jen zboží, které máte v historii objednávek." },
        403
      );
    const auto = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'reviews_auto_approve'").first<{ value: string }>();
    const approved = auto?.value === "1" ? 1 : 0;
    try {
      await c.env.DB.prepare(
        "INSERT INTO reviews (product_id, user_id, rating, title, comment, approved) VALUES (?, ?, ?, ?, ?, ?)"
      )
        .bind(productId, user.id, rating, (b.title || "").trim(), (b.comment || "").trim(), approved)
        .run();
    } catch {
      return c.json({ error: "Tento produkt už jste hodnotili." }, 409);
    }
    return c.json({ ok: true, approved: !!approved });
  });

  // Reklamace pro přihlášené zákazníky
  app.post("/claims", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Pro reklamaci se přihlaste." }, 401);
    const b = await c.req.json<{ order_number?: string; order_id?: number; subject?: string; reason?: string; description?: string }>();
    const reason = (b.reason || "").trim();
    const description = (b.description || "").trim();
    const subject = (b.subject || "").trim();
    const orderNumber = (b.order_number || "").trim().toUpperCase();
    if (description.length < 10) return c.json({ error: "Popište důvod reklamace alespoň 10 znaky." }, 400);
    if (!reason) return c.json({ error: "Vyberte důvod reklamace." }, 400);
    let orderId: number | null = null;
    let orderNum = "";
    let email = user.email;
    if (orderNumber) {
      const row = await c.env.DB.prepare("SELECT id, number, email, user_id FROM orders WHERE number = ?").bind(orderNumber).first<{ id: number; number: string; email: string; user_id: number | null }>();
      if (!row) return c.json({ error: "Objednávka nenalezena." }, 404);
      if (row.user_id !== user.id && row.email.toLowerCase() !== user.email.toLowerCase() && user.role !== "admin") return c.json({ error: "Tato objednávka není vaše." }, 403);
      orderId = row.id;
      orderNum = row.number;
      email = row.email;
    } else if (b.order_id) {
      const row = await c.env.DB.prepare("SELECT id, number, email, user_id FROM orders WHERE id = ?").bind(Number(b.order_id)).first<{ id: number; number: string; email: string; user_id: number | null }>();
      if (row) { orderId = row.id; orderNum = row.number; email = row.email; }
    }
    await c.env.DB.prepare("INSERT INTO claims (user_id, order_id, order_number, email, subject, reason, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'new')").bind(user.id, orderId, orderNum, email, subject || reason, reason, description).run();
    return c.json({ ok: true });
  });

  app.get("/claims", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Nejste přihlášeni." }, 401);
    const rows = await c.env.DB.prepare("SELECT * FROM claims WHERE user_id = ? ORDER BY id DESC").bind(user.id).all();
    return c.json(rows.results || []);
  });

  app.get("/media/:key{.+}", async (c) => {
    if (!c.env.MEDIA) return c.json({ error: "Úložiště R2 není připojené." }, 503);
    const key = c.req.param("key");
    const obj = await c.env.MEDIA.get(key);
    if (!obj) return c.json({ error: "Soubor nenalezen." }, 404);
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("etag", obj.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return new Response(obj.body, { headers });
  });
}

export async function loadOrder(db: D1Database, id: number): Promise<Record<string, unknown> | null> {
  const order = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first();
  if (!order) return null;
  const items = (await db.prepare("SELECT * FROM order_items WHERE order_id = ?").bind(id).all()).results || [];
  let pickup = null;
  const snap = (order as { pickup_snapshot: string }).pickup_snapshot;
  if (snap) {
    try {
      pickup = JSON.parse(snap);
    } catch {
      pickup = null;
    }
  }
  return { ...order, items, pickup };
}

type PickupRow = {
  id: number;
  type: string;
  name: string;
  address: string;
  city: string;
  zip: string;
  carrier: string;
  opening_hours: string;
  lat?: number;
  lng?: number;
  external_id?: string;
  source?: string;
};

async function resolveCheckoutPickup(
  db: D1Database,
  wantType: string,
  pickupPointId?: number,
  incoming?: {
    external_id?: string;
    name?: string;
    address?: string;
    city?: string;
    zip?: string;
    lat?: number;
    lng?: number;
    opening_hours?: string;
    type?: string;
    carrier?: string;
    source?: string;
  }
): Promise<PickupRow | null> {
  const localId = Number(pickupPointId || 0);
  if (localId > 0) {
    const row = await db.prepare("SELECT * FROM pickup_points WHERE id = ? AND active = 1").bind(localId).first<PickupRow>();
    if (row) return row;
  }

  const name = (incoming?.name || "").trim();
  const address = (incoming?.address || "").trim();
  const city = (incoming?.city || "").trim();
  const zip = (incoming?.zip || "").trim();
  if (!name || (!address && !city && !zip)) return null;

  const carrier = incoming?.carrier || (wantType === "balikovna" ? "balikovna" : "zasilkovna");
  const type = incoming?.type || wantType;
  const hours = incoming?.opening_hours || "";
  const lat = Number(incoming?.lat || 0);
  const lng = Number(incoming?.lng || 0);
  const external = (incoming?.external_id || "").trim();

  if (external) {
    try {
      const byExt = await db
        .prepare("SELECT * FROM pickup_points WHERE external_id = ? AND type = ? LIMIT 1")
        .bind(external, wantType)
        .first<PickupRow>();
      if (byExt) return { ...byExt, source: incoming?.source };
    } catch {
      /* sloupec external_id nemusí existovat na starší D1 */
    }
  }

  const byName = await db
    .prepare("SELECT * FROM pickup_points WHERE type = ? AND name = ? AND zip = ? LIMIT 1")
    .bind(wantType, name, zip)
    .first<PickupRow>();
  if (byName) return { ...byName, source: incoming?.source };

  const snapshot: PickupRow = {
    id: 0,
    type,
    name,
    address: address || city,
    city,
    zip,
    carrier,
    opening_hours: hours,
    lat,
    lng,
    external_id: external,
    source: incoming?.source,
  };

  try {
    const res = await db
      .prepare(
        "INSERT INTO pickup_points (carrier, type, name, address, city, zip, lat, lng, opening_hours, active, external_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)"
      )
      .bind(carrier, type, name, snapshot.address, city, zip, lat, lng, hours, external)
      .run();
    snapshot.id = Number(res.meta.last_row_id);
    return snapshot;
  } catch {
    const res = await db
      .prepare(
        "INSERT INTO pickup_points (carrier, type, name, address, city, zip, lat, lng, opening_hours, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)"
      )
      .bind(carrier, type, name, snapshot.address, city, zip, lat, lng, hours)
      .run();
    snapshot.id = Number(res.meta.last_row_id);
    return snapshot;
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Po ověřené platbě kartou označí objednávku jako zaplacenou + faktura + e-mail. */
export async function markOrderPaid(
  db: D1Database,
  id: number,
  gateway: string,
  env?: { RESEND_API_KEY?: string; MAIL_FROM?: string }
): Promise<void> {
  await db
    .prepare(
      `UPDATE orders SET payment_status = 'paid',
        status = CASE WHEN status = 'new' THEN 'paid' ELSE status END,
        updated_at = datetime('now') WHERE id = ?`
    )
    .bind(id)
    .run();
  const s = await loadSettings(db);
  try {
    if (s.invoice_auto !== "0") {
      await ensureInvoiceForOrder(db, id, s);
      await markInvoicePaid(db, id, true);
    }
  } catch (err) {
    console.error("invoice after card payment:", err);
  }
  // Zaplaceno → dárkové poukazy z objednávky můžou odejít e-mailem.
  try {
    await sendVouchersForOrder(db, id, env);
  } catch (err) {
    console.error("vouchers after payment:", err);
  }
  try {
    const order = await loadOrder(db, id);
    if (order) {
      await notifyOrderStatus(
        db,
        { number: String(order.number), email: String(order.email), name: String(order.name), status: "paid" },
        env
      );
    }
  } catch (err) {
    console.error("paid status mail:", err);
  }
  void gateway;
}
