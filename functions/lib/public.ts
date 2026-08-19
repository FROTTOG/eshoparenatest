import type { App } from "./helpers";
import {
  CART_DAYS,
  SESSION_DAYS,
  clearCookie,
  couponDiscount,
  ensureCart,
  getCoupon,
  isSecure,
  loadCart,
  mergeCarts,
  newCartId,
  setCookie,
  validEmail,
} from "./helpers";
import { hashPassword, orderNumber, randomId, verifyPassword } from "./crypto";

export function registerPublic(app: App) {
  app.get("/health", (c) => c.json({ ok: true, store: c.env.STORE_NAME || "KAVKA" }));

  app.get("/settings", async (c) => {
    const rows = (await c.env.DB.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>()).results || [];
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
      "hero_title",
      "hero_text",
      "packeta_api_key",
    ];
    const pub: Record<string, string> = {};
    for (const k of publicKeys) if (all[k] != null) pub[k] = all[k];
    return c.json(pub);
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

  app.get("/categories", async (c) => {
    const rows = await c.env.DB.prepare(
      "SELECT * FROM categories WHERE active = 1 ORDER BY sort_order, name"
    ).all();
    return c.json(rows.results || []);
  });

  app.get("/products", async (c) => {
    const q = (c.req.query("q") || "").trim();
    const category = c.req.query("category") || "";
    const sort = c.req.query("sort") || "featured";
    const featured = c.req.query("featured");
    const inStock = c.req.query("in_stock");
    const ids = (c.req.query("ids") || "")
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isFinite(n) && n > 0)
      .slice(0, 48);
    const page = Math.max(1, Number(c.req.query("page") || 1));
    const limit = Math.min(48, Math.max(1, Number(c.req.query("limit") || 24)));
    const offset = (page - 1) * limit;

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
    if (ids.length) {
      where += ` AND p.id IN (${ids.map(() => "?").join(",")})`;
      binds.push(...ids);
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

    return c.json({ items: rows.results || [], total: count?.c || 0, page, limit });
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
    return c.json({ ...p, images: images.map((i) => i.url), reviews, rating: (agg as { rating: number | null })?.rating, review_count: (agg as { review_count: number })?.review_count || 0 });
  });

  app.get("/shipping", async (c) => {
    const rows = await c.env.DB.prepare("SELECT * FROM shipping_methods WHERE active = 1 ORDER BY sort_order").all();
    return c.json(rows.results || []);
  });

  app.get("/payments", async (c) => {
    const rows = await c.env.DB.prepare("SELECT * FROM payment_methods WHERE active = 1 ORDER BY sort_order").all();
    return c.json(rows.results || []);
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
    return c.json({ user: { id: userId, email, name, phone, role: "customer" } });
  });

  app.post("/auth/login", async (c) => {
    const body = await c.req.json<{ email?: string; password?: string }>();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first<{
      id: number;
      email: string;
      password_hash: string;
      name: string;
      phone: string;
      role: "customer" | "admin";
    }>();
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return c.json({ error: "Nesprávný e-mail nebo heslo." }, 401);
    }
    const sid = randomId();
    const exp = Date.now() + SESSION_DAYS * 86400 * 1000;
    await c.env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").bind(sid, user.id, exp).run();
    const cartId = await mergeCarts(c.env.DB, c.get("cartId"), user.id);
    const secure = isSecure(c);
    c.header("Set-Cookie", setCookie("sid", sid, SESSION_DAYS, secure));
    c.header("Set-Cookie", setCookie("cid", cartId, CART_DAYS, secure), { append: true });
    return c.json({ user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role } });
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
    return c.json(await loadCart(c.env.DB, c.get("cartId")));
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
    return c.json(await loadCart(c.env.DB, cartId));
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
    return c.json(await loadCart(c.env.DB, cartId));
  });

  app.delete("/cart/items/:id", async (c) => {
    await c.env.DB.prepare("DELETE FROM cart_items WHERE id = ? AND cart_id = ?").bind(Number(c.req.param("id")), c.get("cartId")).run();
    return c.json(await loadCart(c.env.DB, c.get("cartId")));
  });

  app.post("/cart/coupon", async (c) => {
    const body = await c.req.json<{ code?: string }>();
    const code = (body.code || "").trim();
    const cart = await loadCart(c.env.DB, c.get("cartId"));
    const coupon = await getCoupon(c.env.DB, code);
    if (!coupon) return c.json({ error: "Kupón neexistuje." }, 404);
    const disc = couponDiscount(coupon, cart.subtotal);
    if (!disc.ok) return c.json({ error: disc.error }, 400);
    await ensureCart(c.env.DB, c.get("cartId"), c.get("user")?.id ?? null);
    await c.env.DB.prepare("UPDATE carts SET coupon_code = ? WHERE id = ?").bind(coupon.code, c.get("cartId")).run();
    return c.json(await loadCart(c.env.DB, c.get("cartId")));
  });

  app.delete("/cart/coupon", async (c) => {
    await c.env.DB.prepare("UPDATE carts SET coupon_code = NULL WHERE id = ?").bind(c.get("cartId")).run();
    return c.json(await loadCart(c.env.DB, c.get("cartId")));
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

    const cart = await loadCart(c.env.DB, c.get("cartId"));
    if (!cart.items.length) return c.json({ error: "Košík je prázdný." }, 400);

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
    const payStatus = payment.code === "transfer" ? "pending" : payment.code === "cod" || payment.code === "card_delivery" || payment.code === "cash_store" ? "cod" : "pending";

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
          agree_terms, agree_gdpr
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`
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
        (body.note || "").trim()
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
    }
    follow.push(c.env.DB.prepare("DELETE FROM cart_items WHERE cart_id = ?").bind(c.get("cartId")));
    follow.push(c.env.DB.prepare("UPDATE carts SET coupon_code = NULL WHERE id = ?").bind(c.get("cartId")));

    const batch = await c.env.DB.batch(follow);
    for (let i = 0; i < cart.items.length; i++) {
      const upd = batch[i * 3 + 1];
      if (upd.meta.changes === 0) {
        await c.env.DB.prepare("DELETE FROM order_items WHERE order_id = ?").bind(orderId).run();
        await c.env.DB.prepare("DELETE FROM orders WHERE id = ?").bind(orderId).run();
        return c.json({ error: "Sklad se mezitím změnil. Obnovte košík a zkuste to znovu." }, 409);
      }
    }

    const order = await loadOrder(c.env.DB, orderId);
    const secure = isSecure(c);
    c.header("Set-Cookie", setCookie("oid", number, 2, secure));
    return c.json({ order });
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
    return c.json({ order });
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
       WHERE oi.product_id = ? AND o.user_id = ? AND o.status != 'cancelled' LIMIT 1`
    )
      .bind(productId, user.id)
      .first();
    if (!bought) return c.json({ error: "Hodnotit můžete jen zboží, které jste u nás koupili." }, 403);
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

export async function loadOrder(db: D1Database, id: number) {
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
