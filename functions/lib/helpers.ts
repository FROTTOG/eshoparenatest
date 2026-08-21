import { Hono } from "hono";
import type { Bindings, Variables, AppUser } from "./types";
import { randomId } from "./crypto";

export type App = Hono<{ Bindings: Bindings; Variables: Variables }>;

export const SESSION_DAYS = 21;
export const CART_DAYS = 30;

export function isSecure(c: { req: { url: string } }): boolean {
  return new URL(c.req.url).protocol === "https:";
}

export function setCookie(name: string, value: string, days: number, secure: boolean): string {
  const max = days * 86400;
  return `${name}=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${max}${secure ? "; Secure" : ""}`;
}

export function clearCookie(name: string, secure: boolean): string {
  return `${name}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const parts = header.split(";");
  for (const p of parts) {
    const [k, ...rest] = p.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function validEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export type CouponRow = {
  id: number;
  code: string;
  type: string;
  value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_to: string | null;
  active: number;
  /** Kupón použijí jen přihlášení zákazníci. */
  requires_login: number;
  /** Kupón smí každý zákazník použít jen jednou. */
  single_use: number;
};

export function couponDiscount(
  coupon: CouponRow | null,
  subtotal: number,
  opts: { user_id?: number | null; used_by_user?: number } = {}
): { ok: boolean; discount: number; error?: string } {
  if (!coupon) return { ok: true, discount: 0 };
  if (!coupon.active) return { ok: false, discount: 0, error: "Kupón už není aktivní." };
  const now = new Date().toISOString().slice(0, 10);
  if (coupon.valid_from && now < coupon.valid_from) return { ok: false, discount: 0, error: "Kupón ještě nezačal platit." };
  if (coupon.valid_to && now > coupon.valid_to) return { ok: false, discount: 0, error: "Kupón vypršel." };
  if (coupon.requires_login && !opts.user_id) {
    return { ok: false, discount: 0, error: "Kupón je jen pro registrované zákazníky. Přihlaste se." };
  }
  if (coupon.single_use && (opts.used_by_user || 0) > 0) {
    return { ok: false, discount: 0, error: "Tuto slevu už jste využili — platí jen jednou." };
  }
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) return { ok: false, discount: 0, error: "Kupón už byl vyčerpán." };
  if (subtotal < coupon.min_order) {
    return { ok: false, discount: 0, error: `Kupón platí od ${coupon.min_order} Kč.` };
  }
  let d = coupon.type === "percent" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  if (d > subtotal) d = subtotal;
  return { ok: true, discount: d };
}

export async function getCoupon(db: D1Database, code: string | null | undefined): Promise<CouponRow | null> {
  if (!code) return null;
  return db.prepare("SELECT * FROM coupons WHERE code = ?").bind(code.trim()).first<CouponRow>();
}

/**
 * Stejné jako couponDiscount, ale pro kupóny s omezením „jednou na zákazníka“
 * zjistí počet už použití daného uživatele z tabulky coupon_redemptions.
 */
export async function loadCouponDiscount(
  db: D1Database,
  coupon: CouponRow | null,
  subtotal: number,
  userId: number | null | undefined
): Promise<{ ok: boolean; discount: number; error?: string }> {
  let usedByUser = 0;
  if (coupon?.single_use && userId) {
    const r = await db
      .prepare("SELECT COUNT(*) AS c FROM coupon_redemptions WHERE coupon_code = ? AND user_id = ?")
      .bind(coupon.code, userId)
      .first<{ c: number }>();
    usedByUser = r?.c || 0;
  }
  return couponDiscount(coupon, subtotal, { user_id: userId ?? undefined, used_by_user: usedByUser });
}

export type CartItemRow = {
  id: number;
  product_id: number;
  quantity: number;
  name: string;
  slug: string;
  price: number;
  image: string;
  stock: number;
  sku: string;
};

export async function loadCart(db: D1Database, cartId: string) {
  const cart = await db.prepare("SELECT * FROM carts WHERE id = ?").bind(cartId).first<{
    id: string;
    user_id: number | null;
    coupon_code: string | null;
  }>();
  const items =
    (
      await db
        .prepare(
          `SELECT ci.id, ci.product_id, ci.quantity, p.name, p.slug, p.price, p.image, p.stock, p.sku
           FROM cart_items ci JOIN products p ON p.id = ci.product_id
           WHERE ci.cart_id = ?`
        )
        .bind(cartId)
        .all<CartItemRow>()
    ).results || [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const coupon = await getCoupon(db, cart?.coupon_code);
  const disc = await loadCouponDiscount(db, coupon, subtotal, cart?.user_id);
  return {
    id: cartId,
    items,
    subtotal,
    coupon: disc.ok && coupon ? { code: coupon.code, description: (coupon as CouponRow & { description?: string }).description, type: coupon.type, value: coupon.value } : null,
    coupon_error: cart?.coupon_code && !disc.ok ? disc.error : null,
    discount: disc.ok ? disc.discount : 0,
    count: items.reduce((s, i) => s + i.quantity, 0),
  };
}

export async function ensureCart(db: D1Database, cartId: string, userId: number | null) {
  await db
    .prepare("INSERT OR IGNORE INTO carts (id, user_id, updated_at) VALUES (?, ?, datetime('now'))")
    .bind(cartId, userId)
    .run();
  if (userId) {
    await db.prepare("UPDATE carts SET user_id = ?, updated_at = datetime('now') WHERE id = ?").bind(userId, cartId).run();
  }
}

export async function mergeCarts(db: D1Database, guestId: string, userId: number) {
  const existing = await db.prepare("SELECT id FROM carts WHERE user_id = ? AND id != ?").bind(userId, guestId).first<{ id: string }>();
  if (!existing) {
    await db.prepare("UPDATE carts SET user_id = ? WHERE id = ?").bind(userId, guestId).run();
    return guestId;
  }
  const items = (await db.prepare("SELECT product_id, quantity FROM cart_items WHERE cart_id = ?").bind(guestId).all<{ product_id: number; quantity: number }>()).results || [];
  for (const it of items) {
    await db
      .prepare(
        `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)
         ON CONFLICT(cart_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity`
      )
      .bind(existing.id, it.product_id, it.quantity)
      .run();
  }
  await db.prepare("DELETE FROM cart_items WHERE cart_id = ?").bind(guestId).run();
  await db.prepare("DELETE FROM carts WHERE id = ?").bind(guestId).run();
  return existing.id;
}

export async function userBySession(db: D1Database, sid: string | null): Promise<AppUser | null> {
  if (!sid) return null;
  const row = await db
    .prepare(
      `SELECT u.id, u.email, u.name, u.phone, u.role, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`
    )
    .bind(sid)
    .first<AppUser & { expires_at: number }>();
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    await db.prepare("DELETE FROM sessions WHERE id = ?").bind(sid).run();
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, phone: row.phone, role: row.role };
}

export function newCartId(): string {
  return randomId();
}

export async function requireUser(c: { get: (k: "user") => AppUser | null }) {
  const u = c.get("user");
  if (!u) return jsonError("Nejste přihlášeni.", 401);
  return null;
}

export async function requireAdmin(c: { get: (k: "user") => AppUser | null }) {
  const u = c.get("user");
  if (!u) return jsonError("Nejste přihlášeni.", 401);
  if (u.role !== "admin") return jsonError("Nemáte oprávnění správce.", 403);
  return null;
}
