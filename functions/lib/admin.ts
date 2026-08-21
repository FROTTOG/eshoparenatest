import type { App } from "./helpers";
import { requireAdmin, slugify } from "./helpers";
import { loadOrder } from "./public";
import { notifyBackInStock, notifyOrderStatus, processAbandonedCarts, resolveMailConfig, sendTestMail } from "./mail";
import { bumpCache } from "./cache";
import { pushToSubscriptions } from "./push";
import { generateTotpSecret, verifyPassword, verifyTotp } from "./crypto";
import { CARRIERS, createShipment, type CarrierCode } from "./shipping";
import {
  cancelInvoiceForOrder,
  ensureInvoiceForOrder,
  exportFakturoid,
  exportIdoklad,
  exportInvoicesCsv,
  exportOrdersCsv,
  exportPohoda,
  invoiceHtml,
  loadSettings,
  markInvoicePaid,
  withItems,
  type InvoiceRow,
} from "./invoices";

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
      await bumpCache(c.env.DB);
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
    await bumpCache(c.env.DB);
    return c.json({ ok: true });
  });

  app.delete("/admin/products/:id", async (c) => {
    const id = Number(c.req.param("id"));
    await c.env.DB.prepare("DELETE FROM product_images WHERE product_id = ?").bind(id).run();
    await c.env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
    await bumpCache(c.env.DB);
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
    if (p.stock <= 0 && next > 0) {
      try {
        const prod = await c.env.DB.prepare("SELECT id, name, slug FROM products WHERE id = ?").bind(id).first<{ id: number; name: string; slug: string }>();
        const waiting = (await c.env.DB.prepare("SELECT email FROM stock_alerts WHERE product_id = ? AND notified_at IS NULL").bind(id).all<{ email: string }>()).results || [];
        if (prod && waiting.length) {
          await notifyBackInStock(c.env.DB, prod, waiting.map((w) => w.email), c.env);
          await c.env.DB.prepare("UPDATE stock_alerts SET notified_at = datetime('now') WHERE product_id = ? AND notified_at IS NULL").bind(id).run();
          // Kromě e-mailu upozorníme i přes Web Push.
          const subs = (await c.env.DB.prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE product_id = ?").bind(id).all<{ endpoint: string; p256dh: string; auth: string }>()).results || [];
          if (subs.length) {
            const origin = (await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'store_url'").first<{ value: string }>())?.value || "";
            void pushToSubscriptions(
              c.env.DB,
              subs.map((s) => ({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } })),
              {
                title: `${prod.name} je znovu skladem`,
                body: "Produkt, který jste hlídali, je zpátky na polici.",
                url: `${origin || ""}/produkt/${prod.slug}`,
              }
            );
            await c.env.DB.prepare("DELETE FROM push_subscriptions WHERE product_id = ?").bind(id).run();
          }
        }
      } catch (err) {
        console.error("stock alert mail", err);
      }
    }
    await bumpCache(c.env.DB);
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
    await bumpCache(c.env.DB);
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
    await bumpCache(c.env.DB);
    return c.json({ ok: true });
  });

  app.delete("/admin/categories/:id", async (c) => {
    await c.env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(Number(c.req.param("id"))).run();
    await bumpCache(c.env.DB);
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

    // Automatické faktury reagují na změnu stavu objednávky.
    try {
      const s = await loadSettings(c.env.DB);
      if (nextStatus === "cancelled") {
        await cancelInvoiceForOrder(c.env.DB, id);
      } else if (s.invoice_auto !== "0") {
        const autoOn = s.invoice_auto_on || "order";
        if (autoOn === "order" || b.payment_status === "paid") {
          await ensureInvoiceForOrder(c.env.DB, id, s);
        }
        if (b.payment_status) await markInvoicePaid(c.env.DB, id, b.payment_status === "paid");
      }
    } catch (err) {
      console.error("Invoice sync error:", err);
    }

    await bumpCache(c.env.DB);
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
    await bumpCache(c.env.DB);
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
    await bumpCache(c.env.DB);
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
    await bumpCache(c.env.DB);
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
    // Zapnutá platební brána (comgate_merchant) aktivuje metodu „karta online“;
    // bez brány ji pokladna nikdy nenabízí.
    if (b.comgate_merchant != null) {
      await c.env.DB
        .prepare("UPDATE payment_methods SET active = ? WHERE code = 'card'")
        .bind(String(b.comgate_merchant || "").trim() ? 1 : 0)
        .run();
    }
    await bumpCache(c.env.DB);
    return c.json({ ok: true });
  });

  /* ============================================================
     E-maily — přehled odesílání, diagnostika Resend, test
     ============================================================ */

  app.get("/admin/emails", async (c) => {
    const rows = (
      await c.env.DB.prepare(
        "SELECT id, kind, recipient, subject, status, error, meta, created_at FROM email_log ORDER BY id DESC LIMIT 200"
      ).all()
    ).results || [];
    return c.json(rows);
  });

  app.get("/admin/stock-alerts", async (c) => {
    const rows = (
      await c.env.DB.prepare(
        `SELECT a.id, a.email, a.product_id, a.notified_at, a.created_at, COALESCE(p.name, '') AS product_name
         FROM stock_alerts a LEFT JOIN products p ON p.id = a.product_id
         ORDER BY a.id DESC LIMIT 200`
      ).all()
    ).results || [];
    return c.json(rows);
  });

  /**
   * Diagnostika odesílání e-mailů:
   *  - kde je klíč (nastavení / Cloudflare secret / nikde),
   *  - odesílatel,
   *  - ověřené domény v účtu Resend (volá Resend API daným klíčem).
   * Klíč samotný nikdy nevracíme.
   */
  app.get("/admin/mail/status", async (c) => {
    const settings = await loadSettings(c.env.DB);
    const { key, keySource, from, fromName } = resolveMailConfig(settings, c.env);
    let domains: { name: string; status: string }[] | null = null;
    let domainError: string | null = null;
    if (key) {
      try {
        const res = await fetch("https://api.resend.com/domains", {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (res.ok) {
          const body = (await res.json()) as { data?: { name: string; status: string }[]; domains?: { name: string; status: string }[] };
          domains = (body.data || body.domains || []).map((d) => ({ name: d.name, status: d.status }));
        } else {
          domainError = `Resend odpověděl HTTP ${res.status}`;
        }
      } catch (e) {
        domainError = String(e);
      }
    }
    const fromDomain = from.includes("@") ? from.split("@")[1].toLowerCase() : "";
    const fromVerified = domains ? domains.some((d) => d.name.toLowerCase() === fromDomain && d.status === "verified") : null;
    let hint: string | null = null;
    if (!key) {
      hint = "Není nastavený žádný Resend API klíč. Vyplňte ho v Nastavení e-shopu (resend_api_key) nebo přidejte Cloudflare secret RESEND_API_KEY. Bez klíče se e-maily jen ukládají do přehledu (status „logged“) a neodesílají.";
    } else if (domains && fromVerified === false) {
      hint = `Odesílatel je „${from}“, ale doména „${fromDomain}“ není v Resend ověřená (nebo tam vůbec není). Ověřte doménu v Resend (Domains) a podle ní upravte mail_from.`;
    } else if (domains && fromVerified === null) {
      hint = "Domény z účtu Resend se nepodařilo načíst, ověření odesílatele přeskočeno.";
    }
    return c.json({
      key_source: keySource,
      key_present: !!key,
      key_masked: key ? `re_…${key.slice(-4)}` : null,
      from,
      from_name: fromName,
      from_domain: fromDomain,
      from_verified: fromVerified,
      domains,
      domain_error: domainError,
      hint,
      webhook: settings.mail_webhook || "",
    });
  });

  /** Odeslání testovacího e-mailu — okamžitá zpětná vazba od Resendu. */
  app.post("/admin/mail/test", async (c) => {
    const b = (await c.req.json().catch(() => ({}))) as { to?: string };
    const to = (b.to || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return c.json({ error: "Zadejte platný e-mail pro test." }, 400);
    }
    const result = await sendTestMail(c.env.DB, to, c.env);
    return c.json(result);
  });

  app.get("/admin/stock", async (c) => {
    const rows = await c.env.DB.prepare(
      `SELECT p.id, p.name, p.sku, p.stock, p.low_stock, p.image, p.active,
              (SELECT created_at FROM stock_movements m WHERE m.product_id = p.id ORDER BY id DESC LIMIT 1) AS last_move
       FROM products p ORDER BY p.stock ASC, p.name`
    ).all();
    return c.json(rows.results || []);
  });

  /* ============================================================
     Faktury — automatické generování, přehled, tisk
     ============================================================ */

  app.get("/admin/invoices", async (c) => {
    const status = (c.req.query("status") || "").trim();
    const q = (c.req.query("q") || "").trim();
    const from = (c.req.query("from") || "").trim();
    const to = (c.req.query("to") || "").trim();
    let sql = "SELECT * FROM invoices WHERE 1=1";
    const binds: string[] = [];
    if (status) {
      sql += " AND status = ?";
      binds.push(status);
    }
    if (from) {
      sql += " AND issue_date >= ?";
      binds.push(from);
    }
    if (to) {
      sql += " AND issue_date <= ?";
      binds.push(to);
    }
    if (q) {
      sql += " AND (number LIKE ? OR order_number LIKE ? OR customer_name LIKE ? OR company_name LIKE ? OR customer_email LIKE ?)";
      const like = `%${q}%`;
      binds.push(like, like, like, like, like);
    }
    sql += " ORDER BY id DESC LIMIT 500";
    const rows = await c.env.DB.prepare(sql).bind(...binds).all<InvoiceRow>();
    const list = rows.results || [];
    const sum = list.reduce(
      (acc, r) => ({
        count: acc.count + 1,
        total: acc.total + Number(r.total || 0),
        unpaid: acc.unpaid + (r.status === "issued" ? Number(r.total || 0) : 0),
      }),
      { count: 0, total: 0, unpaid: 0 }
    );
    return c.json({ invoices: list, summary: sum });
  });

  app.get("/admin/invoices/:id", async (c) => {
    const inv = await c.env.DB.prepare("SELECT * FROM invoices WHERE id = ?").bind(Number(c.req.param("id"))).first<InvoiceRow>();
    if (!inv) return c.json({ error: "Faktura nenalezena." }, 404);
    return c.json({ invoice: inv });
  });

  app.get("/admin/invoices/:id/html", async (c) => {
    const inv = await c.env.DB.prepare("SELECT * FROM invoices WHERE id = ?").bind(Number(c.req.param("id"))).first<InvoiceRow>();
    if (!inv) return c.json({ error: "Faktura nenalezena." }, 404);
    const s = await loadSettings(c.env.DB);
    return c.html(invoiceHtml(inv, s));
  });

  app.patch("/admin/invoices/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const b = await c.req.json<{ status?: string }>();
    const status = b.status === "paid" ? "paid" : b.status === "cancelled" ? "cancelled" : "issued";
    await c.env.DB.prepare("UPDATE invoices SET status = ?, paid_at = ? WHERE id = ?")
      .bind(status, status === "paid" ? new Date().toISOString().slice(0, 10) : null, id)
      .run();
    const inv = await c.env.DB.prepare("SELECT * FROM invoices WHERE id = ?").bind(id).first<InvoiceRow>();
    if (inv && status === "paid") {
      await c.env.DB.prepare("UPDATE orders SET payment_status = 'paid', updated_at = datetime('now') WHERE id = ?").bind(inv.order_id).run();
    }
    return c.json({ invoice: inv });
  });

  app.delete("/admin/invoices/:id", async (c) => {
    await c.env.DB.prepare("DELETE FROM invoices WHERE id = ?").bind(Number(c.req.param("id"))).run();
    return c.json({ ok: true });
  });

  // Vystavit fakturu k jedné objednávce
  app.post("/admin/orders/:id/invoice", async (c) => {
    const inv = await ensureInvoiceForOrder(c.env.DB, Number(c.req.param("id")));
    if (!inv) return c.json({ error: "Objednávku se nepodařilo najít." }, 404);
    return c.json({ invoice: inv });
  });

  // Dogenerovat faktury ke všem objednávkám, které ji ještě nemají
  app.post("/admin/invoices/generate", async (c) => {
    type GenBody = { only_paid?: boolean; from?: string; to?: string };
    const b = await c.req.json<GenBody>().catch((): GenBody => ({}));
    let sql = "SELECT o.id FROM orders o LEFT JOIN invoices i ON i.order_id = o.id WHERE i.id IS NULL AND o.status != 'cancelled'";
    const binds: string[] = [];
    if (b.only_paid) sql += " AND o.payment_status = 'paid'";
    if (b.from) {
      sql += " AND date(o.created_at) >= ?";
      binds.push(b.from);
    }
    if (b.to) {
      sql += " AND date(o.created_at) <= ?";
      binds.push(b.to);
    }
    sql += " ORDER BY o.id ASC LIMIT 300";
    const rows = (await c.env.DB.prepare(sql).bind(...binds).all<{ id: number }>()).results || [];
    const s = await loadSettings(c.env.DB);
    let created = 0;
    for (const r of rows) {
      const inv = await ensureInvoiceForOrder(c.env.DB, r.id, s);
      if (inv) created++;
    }
    return c.json({ created, checked: rows.length });
  });

  /* ============================================================
     Účetní exporty — iDoklad, Fakturoid, POHODA
     ============================================================ */

  app.get("/admin/export/:target", async (c) => {
    const target = c.req.param("target");
    const from = (c.req.query("from") || "").trim();
    const to = (c.req.query("to") || "").trim();
    const status = (c.req.query("status") || "").trim();
    const onlyPaid = c.req.query("only_paid") === "1";
    const s = await loadSettings(c.env.DB);
    const stamp = new Date().toISOString().slice(0, 10);

    function file(body: string, name: string, mime: string) {
      return new Response(body, {
        headers: {
          "Content-Type": `${mime}; charset=utf-8`,
          "Content-Disposition": `attachment; filename="${name}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (target === "orders-csv") {
      let sql = "SELECT * FROM orders WHERE 1=1";
      const binds: string[] = [];
      if (from) {
        sql += " AND date(created_at) >= ?";
        binds.push(from);
      }
      if (to) {
        sql += " AND date(created_at) <= ?";
        binds.push(to);
      }
      if (status) {
        sql += " AND status = ?";
        binds.push(status);
      }
      sql += " ORDER BY id DESC LIMIT 5000";
      const rows = (await c.env.DB.prepare(sql).bind(...binds).all<Record<string, unknown>>()).results || [];
      return file(exportOrdersCsv(rows), `kavka-objednavky-${stamp}.csv`, "text/csv");
    }

    let sql = "SELECT * FROM invoices WHERE status != 'cancelled'";
    const binds: string[] = [];
    if (from) {
      sql += " AND issue_date >= ?";
      binds.push(from);
    }
    if (to) {
      sql += " AND issue_date <= ?";
      binds.push(to);
    }
    if (onlyPaid) sql += " AND status = 'paid'";
    sql += " ORDER BY id ASC LIMIT 5000";
    const invoices = withItems((await c.env.DB.prepare(sql).bind(...binds).all<InvoiceRow>()).results || []);

    if (!invoices.length) {
      return c.json({ error: "Ve zvoleném období nejsou žádné faktury. Vygenerujte je v sekci Faktury." }, 404);
    }

    switch (target) {
      case "idoklad":
        return file(exportIdoklad(invoices), `idoklad-faktury-${stamp}.csv`, "text/csv");
      case "fakturoid":
        return file(exportFakturoid(invoices), `fakturoid-faktury-${stamp}.csv`, "text/csv");
      case "pohoda":
        return file(exportPohoda(invoices, s), `pohoda-faktury-${stamp}.xml`, "application/xml");
      case "invoices-csv":
        return file(exportInvoicesCsv(invoices), `kavka-faktury-${stamp}.csv`, "text/csv");
      default:
        return c.json({ error: "Neznámý formát exportu." }, 400);
    }
  });

  // Více fotek u produktu
  app.post("/admin/products/:id/images", async (c) => {
    const pid = Number(c.req.param("id"));
    const b = await c.req.json<{ url?: string; urls?: string[] }>();
    const urls: string[] = [];
    if (b.url) urls.push(b.url);
    if (Array.isArray(b.urls)) urls.push(...b.urls);
    const clean = urls.map((u) => String(u).trim()).filter(Boolean);
    if (!clean.length) return c.json({ error: "Zadejte URL obrázku." }, 400);
    for (const url of clean) {
      const max = await c.env.DB.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM product_images WHERE product_id = ?").bind(pid).first<{ m: number }>();
      const next = (max?.m ?? -1) + 1;
      await c.env.DB.prepare("INSERT INTO product_images (product_id, url, sort_order) VALUES (?, ?, ?)").bind(pid, url, next).run();
      // aktualizuj hlavní obrázek pokud prázdný
      const prod = await c.env.DB.prepare("SELECT image FROM products WHERE id = ?").bind(pid).first<{ image: string }>();
      if (!prod?.image) await c.env.DB.prepare("UPDATE products SET image = ? WHERE id = ?").bind(url, pid).run();
    }
    return c.json({ ok: true });
  });

  app.delete("/admin/products/:id/images/:imgId", async (c) => {
    const pid = Number(c.req.param("id"));
    const imgId = Number(c.req.param("imgId"));
    await c.env.DB.prepare("DELETE FROM product_images WHERE id = ? AND product_id = ?").bind(imgId, pid).run();
    return c.json({ ok: true });
  });

  app.put("/admin/products/:id/images/reorder", async (c) => {
    const pid = Number(c.req.param("id"));
    const b = await c.req.json<{ order?: number[] }>();
    if (!Array.isArray(b.order)) return c.json({ error: "Neplatné pořadí." }, 400);
    for (let i = 0; i < b.order.length; i++) {
      await c.env.DB.prepare("UPDATE product_images SET sort_order = ? WHERE id = ? AND product_id = ?").bind(i, Number(b.order[i]), pid).run();
    }
    const first = await c.env.DB.prepare("SELECT url FROM product_images WHERE product_id = ? ORDER BY sort_order, id LIMIT 1").bind(pid).first<{ url: string }>();
    if (first) await c.env.DB.prepare("UPDATE products SET image = ? WHERE id = ?").bind(first.url, pid).run();
    return c.json({ ok: true });
  });

  // Reklamace správa
  app.get("/admin/claims", async (c) => {
    const status = (c.req.query("status") || "").trim();
    const q = (c.req.query("q") || "").trim();
    let sql = "SELECT c.*, u.name AS user_name, u.email AS user_email FROM claims c LEFT JOIN users u ON u.id = c.user_id WHERE 1=1";
    const binds: string[] = [];
    if (status) { sql += " AND c.status = ?"; binds.push(status); }
    if (q) { sql += " AND (c.order_number LIKE ? OR c.email LIKE ? OR c.reason LIKE ?)"; const like=`%${q}%`; binds.push(like, like, like); }
    sql += " ORDER BY c.id DESC LIMIT 300";
    const rows = await c.env.DB.prepare(sql).bind(...binds).all();
    return c.json(rows.results || []);
  });

  app.patch("/admin/claims/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const b = await c.req.json<{ status?: string; admin_note?: string }>();
    const allowed = ["new","processing","approved","rejected","closed"];
    const status = allowed.includes(String(b.status)) ? String(b.status) : "new";
    await c.env.DB.prepare("UPDATE claims SET status = ?, admin_note = COALESCE(?, admin_note), updated_at = datetime('now') WHERE id = ?").bind(status, b.admin_note ?? null, id).run();
    return c.json({ ok: true });
  });

  app.delete("/admin/claims/:id", async (c) => {
    await c.env.DB.prepare("DELETE FROM claims WHERE id = ?").bind(Number(c.req.param("id"))).run();
    return c.json({ ok: true });
  });

  /* ============================================================
     Stránky — drag & drop editor obsahu
     ============================================================ */

  function slugifyPage(s: string): string {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  app.get("/admin/pages", async (c) => {
    const rows = (await c.env.DB.prepare("SELECT * FROM pages ORDER BY nav_order, in_nav DESC, id DESC").all()).results || [];
    return c.json(rows);
  });

  app.get("/admin/pages/:id", async (c) => {
    const page = await c.env.DB.prepare("SELECT * FROM pages WHERE id = ?").bind(Number(c.req.param("id"))).first();
    if (!page) return c.json({ error: "Stránka nenalezena." }, 404);
    return c.json({ page });
  });

  app.post("/admin/pages", async (c) => {
    const b = await c.req.json<{ title?: string; slug?: string }>();
    const title = String(b.title || "").trim();
    if (!title) return c.json({ error: "Zadejte název stránky." }, 400);
    let slug = slugifyPage(b.slug || title);
    if (!slug) slug = "stranka-" + Date.now().toString(36);
    // unikátní slug — případně přidej příponu
    let candidate = slug;
    let n = 1;
    for (;;) {
      const exists = await c.env.DB.prepare("SELECT id FROM pages WHERE slug = ?").bind(candidate).first();
      if (!exists) break;
      candidate = `${slug}-${n++}`;
    }
    const res = await c.env.DB.prepare(
      "INSERT INTO pages (title, slug, blocks_json, in_nav, nav_label, nav_order, published, is_system) VALUES (?, ?, '[]', 0, '', 0, 1, 0)"
    ).bind(title, candidate).run();
    await bumpCache(c.env.DB);
    return c.json({ id: Number(res.meta.last_row_id), slug: candidate });
  });

  app.put("/admin/pages/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const b = await c.req.json<{
      title?: string;
      slug?: string;
      blocks_json?: string;
      in_nav?: number | boolean;
      nav_label?: string;
      nav_order?: number;
      published?: number | boolean;
      meta_title?: string;
      meta_description?: string;
      noindex?: number | boolean;
      hide_crumbs?: number | boolean;
      page_max_width?: string;
    }>();
    let slug = slugifyPage(b.slug || "");
    const cur = await c.env.DB.prepare("SELECT * FROM pages WHERE id = ?").bind(id).first<{
      title: string;
      slug: string;
      is_system: number;
      meta_title: string;
      meta_description: string;
      noindex: number;
      hide_crumbs: number;
      page_max_width: string;
    }>();
    if (!cur) return c.json({ error: "Stránka nenalezena." }, 404);
    // Systémové stránky (home, o-nas, …) mají pevnou adresu.
    if (cur.is_system) slug = cur.slug;
    else {
      if (!slug) slug = cur.slug;
      if (slug !== cur.slug) {
        const clash = await c.env.DB.prepare("SELECT id FROM pages WHERE slug = ? AND id != ?").bind(slug, id).first();
        if (clash) return c.json({ error: "Tato adresa už je použitá." }, 409);
      }
    }
    await c.env.DB.prepare(
      "UPDATE pages SET title=?, slug=?, blocks_json=?, in_nav=?, nav_label=?, nav_order=?, published=?, meta_title=?, meta_description=?, noindex=?, hide_crumbs=?, page_max_width=?, updated_at=datetime('now') WHERE id=?"
    ).bind(
      String(b.title ?? cur.title ?? ""),
      slug,
      String(b.blocks_json ?? "[]"),
      b.in_nav ? 1 : 0,
      String(b.nav_label ?? ""),
      Number(b.nav_order ?? 0),
      b.published === 0 || b.published === false ? 0 : 1,
      String(b.meta_title ?? cur.meta_title ?? ""),
      String(b.meta_description ?? cur.meta_description ?? ""),
      b.noindex == null ? Number(cur.noindex || 0) : b.noindex ? 1 : 0,
      b.hide_crumbs == null ? Number(cur.hide_crumbs || 0) : b.hide_crumbs ? 1 : 0,
      String(b.page_max_width ?? cur.page_max_width ?? ""),
      id
    ).run();
    await bumpCache(c.env.DB);
    return c.json({ ok: true });
  });

  app.patch("/admin/pages/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const b = await c.req.json<{ published?: number; in_nav?: number; nav_label?: string; nav_order?: number }>();
    const fields: string[] = [];
    const values: unknown[] = [];
    if (b.published != null) { fields.push("published=?"); values.push(b.published ? 1 : 0); }
    if (b.in_nav != null) { fields.push("in_nav=?"); values.push(b.in_nav ? 1 : 0); }
    if (b.nav_label != null) { fields.push("nav_label=?"); values.push(String(b.nav_label)); }
    if (b.nav_order != null) { fields.push("nav_order=?"); values.push(Number(b.nav_order)); }
    if (fields.length) {
      await c.env.DB.prepare(`UPDATE pages SET ${fields.join(", ")}, updated_at=datetime('now') WHERE id=?`).bind(...values, id).run();
    }
    await bumpCache(c.env.DB);
    return c.json({ ok: true });
  });

  app.delete("/admin/pages/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const p = await c.env.DB.prepare("SELECT is_system FROM pages WHERE id = ?").bind(id).first<{ is_system: number }>();
    if (p?.is_system) return c.json({ error: "Systémovou stránku nelze smazat." }, 400);
    await c.env.DB.prepare("DELETE FROM pages WHERE id = ?").bind(id).run();
    return c.json({ ok: true });
  });

  app.post("/admin/upload", async (c) => {
    if (!c.env.MEDIA) return c.json({ error: "R2 bucket MEDIA není připojený. Viz README." }, 503);
    const form = await c.req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return c.json({ error: "Vyberte soubor." }, 400);
    if (file.size > 8 * 1024 * 1024) return c.json({ error: "Soubor je větší než 8 MB." }, 400);
    const allowed: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/avif": "avif",
    };
    const ext = allowed[file.type];
    if (!ext) return c.json({ error: "Povolené jsou JPG, PNG, WEBP, GIF, AVIF." }, 400);
    // Soubor proudí přímo do R2 (bez načítání celého do paměti Workeru).
    const key = `uploads/${crypto.randomUUID()}.${ext}`;
    await c.env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type } });
    return c.json({ key, url: `/api/media/${key}` });
  });

  /* ============================================================
     Dvoufázové ověření (TOTP) pro administrátory
     ============================================================ */
  app.get("/admin/totp", async (c) => {
    const user = c.get("user")!;
    const row = await c.env.DB.prepare("SELECT totp_secret FROM users WHERE id = ?").bind(user.id).first<{ totp_secret: string }>();
    const required = (await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'totp_required'").first<{ value: string }>())?.value === "1";
    return c.json({ enabled: !!(row?.totp_secret), required });
  });

  // Příprava tajemství pro QR kód — nic se ještě neukládá.
  app.get("/admin/totp/setup", async (c) => {
    const user = c.get("user")!;
    const secret = generateTotpSecret();
    const otpauth = `otpauth://totp/${encodeURIComponent("KAVKA")}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent("KAVKA")}`;
    return c.json({ secret, otpauth });
  });

  app.post("/admin/totp/enable", async (c) => {
    const user = c.get("user")!;
    const b = await c.req.json<{ password?: string; code?: string; secret?: string }>();
    const row = await c.env.DB.prepare("SELECT password_hash, totp_secret FROM users WHERE id = ?").bind(user.id).first<{ password_hash: string; totp_secret: string }>();
    if (!row) return c.json({ error: "Uživatel nenalezen." }, 404);
    if (row.totp_secret) return c.json({ error: "Dvoufázové ověření už je zapnuté." }, 409);
    if (!(await verifyPassword(b.password || "", row.password_hash))) {
      return c.json({ error: "Nesprávné heslo." }, 401);
    }
    const secret = (b.secret || "").replace(/[^A-Za-z2-7]/g, "").toUpperCase();
    if (secret.length < 16) return c.json({ error: "Neplatné tajemství — obnovte QR kód." }, 400);
    if (!(await verifyTotp(secret, b.code || ""))) {
      return c.json({ error: "Ověřovací kód nesouhlasí — naskenujte QR kód a zadejte kód z aplikace." }, 400);
    }
    await c.env.DB.prepare("UPDATE users SET totp_secret = ? WHERE id = ?").bind(secret, user.id).run();
    return c.json({ ok: true });
  });

  app.post("/admin/totp/disable", async (c) => {
    const user = c.get("user")!;
    const b = await c.req.json<{ password?: string; code?: string }>();
    const row = await c.env.DB.prepare("SELECT password_hash, totp_secret FROM users WHERE id = ?").bind(user.id).first<{ password_hash: string; totp_secret: string }>();
    if (!row) return c.json({ error: "Uživatel nenalezen." }, 404);
    if (!row.totp_secret) return c.json({ ok: true });
    if (!(await verifyPassword(b.password || "", row.password_hash))) {
      return c.json({ error: "Nesprávné heslo." }, 401);
    }
    if (!(await verifyTotp(row.totp_secret, b.code || ""))) {
      return c.json({ error: "Ověřovací kód nesouhlasí." }, 400);
    }
    await c.env.DB.prepare("UPDATE users SET totp_secret = '' WHERE id = ?").bind(user.id).run();
    return c.json({ ok: true });
  });

  /* ============================================================
     Provoz: záloha D1, série opuštěného košíku
     ============================================================ */
  app.post("/admin/backup", async (c) => {
    const tables = [
      "users", "sessions", "addresses", "categories", "products", "product_images",
      "carts", "cart_items", "coupons", "coupon_redemptions", "shipping_methods",
      "payment_methods", "pickup_points", "orders", "order_items", "reviews",
      "stock_movements", "settings", "invoices", "claims", "stock_alerts",
      "product_upsells", "shipments", "email_log", "pages", "login_attempts",
      "push_subscriptions", "otp_challenges",
    ];
    const out: Record<string, unknown[]> = {};
    for (const t of tables) {
      try {
        const rows = (await c.env.DB.prepare(`SELECT * FROM ${t}`).all()).results || [];
        out[t] = rows;
      } catch {
        /* tabulka nemusí existovat */
      }
    }
    const dump = {
      exported_at: new Date().toISOString(),
      tables: out,
    };
    const text = JSON.stringify(dump);
    let r2Key = "";
    if (c.env.MEDIA) {
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      r2Key = `backups/kavka-${stamp}.json`;
      await c.env.MEDIA.put(r2Key, text, { httpMetadata: { contentType: "application/json" } });
    }
    return c.json({ ok: true, bytes: text.length, r2_key: r2Key || undefined });
  });

  // Ruční spuštění série opuštěného košíku (jinak běží z cronu — viz README).
  app.post("/admin/mail/abandoned", async (c) => {
    const r = await processAbandonedCarts(c.env.DB, c.env);
    return c.json({ ok: true, ...r });
  });

  // Ruční smazání starých záznamů pokusů o přihlášení (údržba).
  app.post("/admin/maintenance", async (c) => {
    const cleaned = await c.env.DB
      .prepare("DELETE FROM login_attempts WHERE created_at < datetime('now', '-1 day')")
      .run();
    const oldCarts = await c.env.DB
      .prepare("DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM carts WHERE updated_at < datetime('now', '-60 days'))")
      .run();
    return c.json({ ok: true, login_attempts_deleted: cleaned.meta.changes, old_cart_items_deleted: oldCarts.meta.changes });
  });
}
