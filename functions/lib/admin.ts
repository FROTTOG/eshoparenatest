import type { App } from "./helpers";
import { requireAdmin, slugify } from "./helpers";
import { loadOrder } from "./public";

export function registerAdmin(app: App) {
  app.use("/admin/*", async (c, next) => {
    const err = await requireAdmin(c);
    if (err) return err;
    await next();
  });

  app.get("/admin/stats", async (c) => {
    const db = c.env.DB;
    const orders = await db
      .prepare(
        `SELECT
           COUNT(*) AS total_orders,
           COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0) AS revenue,
           COALESCE(SUM(CASE WHEN date(created_at) = date('now') AND status != 'cancelled' THEN total ELSE 0 END), 0) AS today_revenue,
           COALESCE(SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END), 0) AS today_orders,
           COALESCE(SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END), 0) AS new_orders,
           COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END), 0) AS unpaid
         FROM orders`
      )
      .first();
    const customers = await db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'customer'").first<{ c: number }>();
    const products = await db.prepare("SELECT COUNT(*) AS c FROM products").first<{ c: number }>();
    const low = await db.prepare("SELECT id, name, sku, stock, low_stock, image FROM products WHERE stock <= low_stock ORDER BY stock ASC LIMIT 12").all();
    const recent = await db.prepare("SELECT id, number, name, total, status, payment_status, created_at FROM orders ORDER BY id DESC LIMIT 8").all();
    const pendingReviews = await db.prepare("SELECT COUNT(*) AS c FROM reviews WHERE approved = 0").first<{ c: number }>();
    return c.json({
      ...orders,
      customers: customers?.c || 0,
      products: products?.c || 0,
      pending_reviews: pendingReviews?.c || 0,
      low_stock: low.results || [],
      recent_orders: recent.results || [],
    });
  });

  app.get("/admin/products", async (c) => {
    const q = (c.req.query("q") || "").trim();
    let sql = `SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id`;
    const binds: string[] = [];
    if (q) {
      sql += " WHERE p.name LIKE ? OR p.sku LIKE ? OR p.slug LIKE ?";
      const like = `%${q}%`;
      binds.push(like, like, like);
    }
    sql += " ORDER BY p.id DESC";
    const rows = await c.env.DB.prepare(sql).bind(...binds).all();
    return c.json(rows.results || []);
  });

  app.get("/admin/products/:id", async (c) => {
    const p = await c.env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(Number(c.req.param("id"))).first();
    if (!p) return c.json({ error: "Nenalezeno." }, 404);
    const images = (await c.env.DB.prepare("SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order, id").bind((p as { id: number }).id).all()).results || [];
    const moves = (await c.env.DB.prepare("SELECT * FROM stock_movements WHERE product_id = ? ORDER BY id DESC LIMIT 30").bind((p as { id: number }).id).all()).results || [];
    return c.json({ ...p, images, movements: moves });
  });

  app.post("/admin/products", async (c) => {
    const b = await c.req.json<Record<string, unknown>>();
    const name = String(b.name || "").trim();
    if (!name) return c.json({ error: "Zadejte název." }, 400);
    const slug = slugify(String(b.slug || name));
    const sku = String(b.sku || `KAV-${Date.now().toString(36).toUpperCase()}`);
    try {
      const res = await c.env.DB.prepare(
        `INSERT INTO products (name, slug, sku, description, short_description, price, compare_price, stock, low_stock, category_id, image, weight, active, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          name,
          slug,
          sku,
          String(b.description || ""),
          String(b.short_description || ""),
          Number(b.price || 0),
          b.compare_price ? Number(b.compare_price) : null,
          Number(b.stock || 0),
          Number(b.low_stock ?? 5),
          b.category_id ? Number(b.category_id) : null,
          String(b.image || ""),
          Number(b.weight || 0),
          b.active === false || b.active === 0 ? 0 : 1,
          b.featured ? 1 : 0
        )
        .run();
      const id = Number(res.meta.last_row_id);
      if (b.image) {
        await c.env.DB.prepare("INSERT INTO product_images (product_id, url, sort_order) VALUES (?, ?, 0)").bind(id, String(b.image)).run();
      }
      if (Number(b.stock || 0) !== 0) {
        await c.env.DB.prepare("INSERT INTO stock_movements (product_id, delta, reason, admin_id) VALUES (?, ?, 'Založení produktu', ?)").bind(
          id,
          Number(b.stock || 0),
          c.get("user")!.id
        ).run();
      }
      return c.json({ id });
    } catch (e) {
      return c.json({ error: "Slug nebo SKU už existuje.", detail: String(e) }, 409);
    }
  });

  app.put("/admin/products/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const b = await c.req.json<Record<string, unknown>>();
    const name = String(b.name || "").trim();
    const slug = slugify(String(b.slug || name));
    await c.env.DB.prepare(
      `UPDATE products SET name=?, slug=?, sku=?, description=?, short_description=?, price=?, compare_price=?,
       low_stock=?, category_id=?, image=?, weight=?, active=?, featured=?, updated_at=datetime('now') WHERE id=?`
    )
      .bind(
        name,
        slug,
        String(b.sku || ""),
        String(b.description || ""),
        String(b.short_description || ""),
        Number(b.price || 0),
        b.compare_price ? Number(b.compare_price) : null,
        Number(b.low_stock ?? 5),
        b.category_id ? Number(b.category_id) : null,
        String(b.image || ""),
        Number(b.weight || 0),
        b.active === false || b.active === 0 ? 0 : 1,
        b.featured ? 1 : 0,
        id
      )
      .run();
    return c.json({ ok: true });
  });

  app.delete("/admin/products/:id", async (c) => {
    const id = Number(c.req.param("id"));
    await c.env.DB.prepare("DELETE FROM product_images WHERE product_id = ?").bind(id).run();
    await c.env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
    return c.json({ ok: true });
  });

  app.post("/admin/products/:id/stock", async (c) => {
    const id = Number(c.req.param("id"));
    const b = await c.req.json<{ delta?: number; reason?: string; set?: number }>();
    const p = await c.env.DB.prepare("SELECT stock FROM products WHERE id = ?").bind(id).first<{ stock: number }>();
    if (!p) return c.json({ error: "Nenalezeno." }, 404);
    let delta = Number(b.delta || 0);
    if (b.set != null) delta = Number(b.set) - p.stock;
    if (!delta) return c.json({ error: "Žádná změna skladu." }, 400);
    const next = p.stock + delta;
    if (next < 0) return c.json({ error: "Sklad nemůže jít pod nulu." }, 400);
    await c.env.DB.prepare("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?").bind(next, id).run();
    await c.env.DB.prepare("INSERT INTO stock_movements (product_id, delta, reason, admin_id) VALUES (?, ?, ?, ?)").bind(
      id,
      delta,
      (b.reason || "Úprava skladu").trim(),
      c.get("user")!.id
    ).run();
    return c.json({ stock: next });
  });

  app.get("/admin/categories", async (c) => {
    const rows = await c.env.DB.prepare("SELECT * FROM categories ORDER BY sort_order, name").all();
    return c.json(rows.results || []);
  });

  app.post("/admin/categories", async (c) => {
    const b = await c.req.json<{ name?: string; slug?: string; description?: string; image?: string; sort_order?: number; active?: number }>();
    if (!b.name) return c.json({ error: "Zadejte název." }, 400);
    const slug = slugify(b.slug || b.name);
    const res = await c.env.DB.prepare(
      "INSERT INTO categories (name, slug, description, image, sort_order, active) VALUES (?, ?, ?, ?, ?, ?)"
    )
      .bind(b.name, slug, b.description || "", b.image || "", Number(b.sort_order || 0), b.active === 0 ? 0 : 1)
      .run();
    return c.json({ id: res.meta.last_row_id });
  });

  app.put("/admin/categories/:id", async (c) => {
    const b = await c.req.json<Record<string, unknown>>();
    await c.env.DB.prepare("UPDATE categories SET name=?, slug=?, description=?, image=?, sort_order=?, active=? WHERE id=?").bind(
      String(b.name || ""),
      slugify(String(b.slug || b.name || "")),
      String(b.description || ""),
      String(b.image || ""),
      Number(b.sort_order || 0),
      b.active === 0 || b.active === false ? 0 : 1,
      Number(c.req.param("id"))
    ).run();
    return c.json({ ok: true });
  });

  app.delete("/admin/categories/:id", async (c) => {
    await c.env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(Number(c.req.param("id"))).run();
    return c.json({ ok: true });
  });

  app.get("/admin/orders", async (c) => {
    const status = c.req.query("status") || "";
    const q = (c.req.query("q") || "").trim();
    let sql = "SELECT * FROM orders WHERE 1=1";
    const binds: string[] = [];
    if (status) {
      sql += " AND status = ?";
      binds.push(status);
    }
    if (q) {
      sql += " AND (number LIKE ? OR email LIKE ? OR name LIKE ?)";
      const like = `%${q}%`;
      binds.push(like, like, like);
    }
    sql += " ORDER BY id DESC LIMIT 200";
    const rows = await c.env.DB.prepare(sql).bind(...binds).all();
    return c.json(rows.results || []);
  });

  app.get("/admin/orders/:id", async (c) => {
    const order = await loadOrder(c.env.DB, Number(c.req.param("id")));
    if (!order) return c.json({ error: "Nenalezeno." }, 404);
    return c.json({ order });
  });

  app.patch("/admin/orders/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const b = await c.req.json<{ status?: string; payment_status?: string }>();
    const cur = await c.env.DB.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first<{
      id: number;
      status: string;
      number: string;
    }>();
    if (!cur) return c.json({ error: "Nenalezeno." }, 404);
    const nextStatus = b.status || cur.status;
    if (cur.status !== "cancelled" && nextStatus === "cancelled") {
      const items = (await c.env.DB.prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?").bind(id).all<{ product_id: number; quantity: number }>()).results || [];
      for (const it of items) {
        if (!it.product_id) continue;
        await c.env.DB.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").bind(it.quantity, it.product_id).run();
        await c.env.DB.prepare("INSERT INTO stock_movements (product_id, delta, reason, order_id, admin_id) VALUES (?, ?, ?, ?, ?)").bind(
          it.product_id,
          it.quantity,
          "Storno " + cur.number,
          id,
          c.get("user")!.id
        ).run();
      }
    }
    await c.env.DB.prepare("UPDATE orders SET status = ?, payment_status = COALESCE(?, payment_status), updated_at = datetime('now') WHERE id = ?").bind(
      nextStatus,
      b.payment_status ?? null,
      id
    ).run();
    return c.json({ order: await loadOrder(c.env.DB, id) });
  });

  app.get("/admin/coupons", async (c) => {
    const rows = await c.env.DB.prepare("SELECT * FROM coupons ORDER BY id DESC").all();
    return c.json(rows.results || []);
  });

  app.post("/admin/coupons", async (c) => {
    const b = await c.req.json<Record<string, unknown>>();
    const code = String(b.code || "").trim().toUpperCase();
    if (!code) return c.json({ error: "Zadejte kód." }, 400);
    try {
      const res = await c.env.DB.prepare(
        "INSERT INTO coupons (code, type, value, min_order, max_uses, used_count, valid_from, valid_to, active, description) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)"
      )
        .bind(
          code,
          b.type === "percent" ? "percent" : "fixed",
          Number(b.value || 0),
          Number(b.min_order || 0),
          b.max_uses ? Number(b.max_uses) : null,
          b.valid_from || null,
          b.valid_to || null,
          b.active === 0 || b.active === false ? 0 : 1,
          String(b.description || "")
        )
        .run();
      return c.json({ id: res.meta.last_row_id });
    } catch {
      return c.json({ error: "Tento kód už existuje." }, 409);
    }
  });

  app.put("/admin/coupons/:id", async (c) => {
    const b = await c.req.json<Record<string, unknown>>();
    await c.env.DB.prepare(
      "UPDATE coupons SET code=?, type=?, value=?, min_order=?, max_uses=?, valid_from=?, valid_to=?, active=?, description=? WHERE id=?"
    )
      .bind(
        String(b.code || "").trim().toUpperCase(),
        b.type === "percent" ? "percent" : "fixed",
        Number(b.value || 0),
        Number(b.min_order || 0),
        b.max_uses ? Number(b.max_uses) : null,
        b.valid_from || null,
        b.valid_to || null,
        b.active === 0 || b.active === false ? 0 : 1,
        String(b.description || ""),
        Number(c.req.param("id"))
      )
      .run();
    return c.json({ ok: true });
  });

  app.delete("/admin/coupons/:id", async (c) => {
    await c.env.DB.prepare("DELETE FROM coupons WHERE id = ?").bind(Number(c.req.param("id"))).run();
    return c.json({ ok: true });
  });

  app.get("/admin/reviews", async (c) => {
    const rows = await c.env.DB.prepare(
      `SELECT r.*, u.name AS user_name, u.email AS user_email, p.name AS product_name, p.slug AS product_slug
       FROM reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id
       ORDER BY r.approved ASC, r.id DESC`
    ).all();
    return c.json(rows.results || []);
  });

  app.patch("/admin/reviews/:id", async (c) => {
    const b = await c.req.json<{ approved?: number }>();
    await c.env.DB.prepare("UPDATE reviews SET approved = ? WHERE id = ?").bind(b.approved ? 1 : 0, Number(c.req.param("id"))).run();
    return c.json({ ok: true });
  });

  app.delete("/admin/reviews/:id", async (c) => {
    await c.env.DB.prepare("DELETE FROM reviews WHERE id = ?").bind(Number(c.req.param("id"))).run();
    return c.json({ ok: true });
  });

  app.get("/admin/customers", async (c) => {
    const rows = await c.env.DB.prepare(
      `SELECT u.id, u.email, u.name, u.phone, u.role, u.created_at,
              (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders,
              (SELECT COALESCE(SUM(total),0) FROM orders o WHERE o.user_id = u.id AND o.status != 'cancelled') AS spent
       FROM users u ORDER BY u.id DESC`
    ).all();
    return c.json(rows.results || []);
  });

  app.get("/admin/pickup-points", async (c) => {
    const rows = await c.env.DB.prepare("SELECT * FROM pickup_points ORDER BY city, name").all();
    return c.json(rows.results || []);
  });

  app.post("/admin/pickup-points", async (c) => {
    const b = await c.req.json<Record<string, unknown>>();
    const res = await c.env.DB.prepare(
      "INSERT INTO pickup_points (carrier, type, name, address, city, zip, lat, lng, opening_hours, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(
        String(b.carrier || "zasilkovna"),
        String(b.type || "branch"),
        String(b.name || ""),
        String(b.address || ""),
        String(b.city || ""),
        String(b.zip || ""),
        Number(b.lat || 0),
        Number(b.lng || 0),
        String(b.opening_hours || ""),
        b.active === 0 ? 0 : 1
      )
      .run();
    return c.json({ id: res.meta.last_row_id });
  });

  app.put("/admin/pickup-points/:id", async (c) => {
    const b = await c.req.json<Record<string, unknown>>();
    await c.env.DB.prepare(
      "UPDATE pickup_points SET carrier=?, type=?, name=?, address=?, city=?, zip=?, lat=?, lng=?, opening_hours=?, active=? WHERE id=?"
    )
      .bind(
        String(b.carrier || "zasilkovna"),
        String(b.type || "branch"),
        String(b.name || ""),
        String(b.address || ""),
        String(b.city || ""),
        String(b.zip || ""),
        Number(b.lat || 0),
        Number(b.lng || 0),
        String(b.opening_hours || ""),
        b.active === 0 || b.active === false ? 0 : 1,
        Number(c.req.param("id"))
      )
      .run();
    return c.json({ ok: true });
  });

  app.delete("/admin/pickup-points/:id", async (c) => {
    await c.env.DB.prepare("DELETE FROM pickup_points WHERE id = ?").bind(Number(c.req.param("id"))).run();
    return c.json({ ok: true });
  });

  app.get("/admin/shipping", async (c) => {
    const rows = await c.env.DB.prepare("SELECT * FROM shipping_methods ORDER BY sort_order").all();
    return c.json(rows.results || []);
  });

  app.put("/admin/shipping/:id", async (c) => {
    const b = await c.req.json<Record<string, unknown>>();
    await c.env.DB.prepare(
      "UPDATE shipping_methods SET name=?, description=?, price=?, free_over=?, kind=?, active=?, sort_order=?, eta=? WHERE id=?"
    )
      .bind(
        String(b.name || ""),
        String(b.description || ""),
        Number(b.price || 0),
        b.free_over == null || b.free_over === "" ? null : Number(b.free_over),
        String(b.kind || "address"),
        b.active === 0 || b.active === false ? 0 : 1,
        Number(b.sort_order || 0),
        String(b.eta || ""),
        Number(c.req.param("id"))
      )
      .run();
    return c.json({ ok: true });
  });

  app.get("/admin/payments", async (c) => {
    const rows = await c.env.DB.prepare("SELECT * FROM payment_methods ORDER BY sort_order").all();
    return c.json(rows.results || []);
  });

  app.put("/admin/payments/:id", async (c) => {
    const b = await c.req.json<Record<string, unknown>>();
    await c.env.DB.prepare(
      "UPDATE payment_methods SET name=?, description=?, fee=?, active=?, sort_order=?, allowed_shipping=? WHERE id=?"
    )
      .bind(
        String(b.name || ""),
        String(b.description || ""),
        Number(b.fee || 0),
        b.active === 0 || b.active === false ? 0 : 1,
        Number(b.sort_order || 0),
        String(b.allowed_shipping || "*"),
        Number(c.req.param("id"))
      )
      .run();
    return c.json({ ok: true });
  });

  app.get("/admin/settings", async (c) => {
    const rows = (await c.env.DB.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>()).results || [];
    return c.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  });

  app.put("/admin/settings", async (c) => {
    const b = await c.req.json<Record<string, string>>();
    const stmts = Object.entries(b)
      .filter(([k]) => k !== "seeded")
      .map(([k, v]) => c.env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind(k, String(v ?? "")));
    if (stmts.length) await c.env.DB.batch(stmts);
    return c.json({ ok: true });
  });

  app.get("/admin/stock", async (c) => {
    const rows = await c.env.DB.prepare(
      `SELECT p.id, p.name, p.sku, p.stock, p.low_stock, p.image, p.active,
              (SELECT created_at FROM stock_movements m WHERE m.product_id = p.id ORDER BY id DESC LIMIT 1) AS last_move
       FROM products p ORDER BY p.stock ASC, p.name`
    ).all();
    return c.json(rows.results || []);
  });

  app.post("/admin/upload", async (c) => {
    if (!c.env.MEDIA) return c.json({ error: "R2 bucket MEDIA není připojený. Viz README." }, 503);
    const form = await c.req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return c.json({ error: "Vyberte soubor." }, 400);
    if (file.size > 8 * 1024 * 1024) return c.json({ error: "Soubor je větší než 8 MB." }, 400);
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    if (!allowed.includes(file.type)) return c.json({ error: "Povolené jsou JPG, PNG, WEBP, GIF, AVIF." }, 400);
    const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const key = `uploads/${crypto.randomUUID()}.${ext}`;
    await c.env.MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
    return c.json({ key, url: `/api/media/${key}` });
  });
}
