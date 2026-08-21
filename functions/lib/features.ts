/**
 * Nové obchodní funkce nad rámec původního jádra:
 *
 *  - **štítky produktů** (`products.tags`) a filtry katalogu nad nimi,
 *  - **doporučené produkty** ručně vybrané v administraci (`product_related`),
 *  - **dárkové poukazy** — zákazník je koupí jako produkt a přijdou mu e-mailem,
 *  - **automatické mazání kupónů** po vypršení platnosti,
 *  - **obnova hesla** přes odkaz v e-mailu.
 *
 * Vše je psané tak, aby to fungovalo i nad starší databází — tabulky a sloupce
 * doplňuje `schema.ts` idempotentními příkazy při studeném startu.
 */

import { notifyGiftVoucher, type MailEnv } from "./mail";
import { loadSettings } from "./invoices";

/* ============================================================
   Štítky produktů
   ============================================================ */

/** Rozdělí uložený řetězec štítků na pole (bez prázdných hodnot). */
export function parseTags(raw: unknown): string[] {
  return String(raw || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Sjednotí zápis štítků — bez duplicit, max. 24, oříznuté na 40 znaků. */
export function normalizeTags(input: unknown): string {
  const list = Array.isArray(input) ? input.map((x) => String(x)) : parseTags(input);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const tag = raw.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= 24) break;
  }
  return out.join(",");
}

/** Všechny štítky použité u aktivních produktů + kolikrát se vyskytují. */
export async function listTags(db: D1Database): Promise<{ tag: string; count: number }[]> {
  const rows =
    (await db.prepare("SELECT tags FROM products WHERE active = 1 AND tags != ''").all<{ tags: string }>()).results || [];
  const map = new Map<string, { tag: string; count: number }>();
  for (const r of rows) {
    for (const tag of parseTags(r.tags)) {
      const key = tag.toLowerCase();
      const cur = map.get(key);
      if (cur) cur.count += 1;
      else map.set(key, { tag, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "cs"));
}

/* ============================================================
   Doporučené produkty („mohlo by se hodit“)
   ============================================================ */

export async function loadRelatedIds(db: D1Database, productId: number): Promise<number[]> {
  const rows =
    (
      await db
        .prepare("SELECT related_product_id FROM product_related WHERE product_id = ? ORDER BY sort_order, id")
        .bind(productId)
        .all<{ related_product_id: number }>()
    ).results || [];
  return rows.map((r) => r.related_product_id);
}

/** Přepíše seznam doporučených produktů (pořadí podle pole `ids`). */
export async function saveRelated(db: D1Database, productId: number, ids: number[]): Promise<void> {
  const clean = [...new Set(ids.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0 && n !== productId))].slice(0, 12);
  await db.prepare("DELETE FROM product_related WHERE product_id = ?").bind(productId).run();
  if (!clean.length) return;
  await db.batch(
    clean.map((id, i) =>
      db
        .prepare("INSERT OR IGNORE INTO product_related (product_id, related_product_id, sort_order) VALUES (?, ?, ?)")
        .bind(productId, id, i)
    )
  );
}

/** Doporučené produkty pro veřejný detail — jen aktivní, v uloženém pořadí. */
export async function loadRelatedProducts(db: D1Database, productId: number, limit = 4) {
  const rows =
    (
      await db
        .prepare(
          `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
                  (SELECT ROUND(AVG(rating), 1) FROM reviews r WHERE r.product_id = p.id AND r.approved = 1) AS rating,
                  (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.approved = 1) AS review_count,
                  pr.sort_order AS rel_order
           FROM product_related pr
           JOIN products p ON p.id = pr.related_product_id
           LEFT JOIN categories c ON c.id = p.category_id
           WHERE pr.product_id = ? AND p.active = 1
           ORDER BY pr.sort_order, pr.id
           LIMIT ?`
        )
        .bind(productId, limit)
        .all()
    ).results || [];
  return rows;
}

/* ============================================================
   Kupóny — automatické smazání po vypršení platnosti
   ============================================================ */

/**
 * Smaže kupóny, které mají zapnuté „po vypršení smazat“ a jejichž platnost
 * (`valid_to`, datum i čas) už uplynula. Volá se při výpisu kupónů
 * v administraci a při uplatnění kupónu v košíku, takže není potřeba cron.
 */
export async function purgeExpiredCoupons(db: D1Database): Promise<number> {
  try {
    const res = await db
      .prepare(
        `DELETE FROM coupons
         WHERE auto_delete = 1
           AND valid_to IS NOT NULL AND TRIM(valid_to) != ''
           AND datetime(REPLACE(valid_to, 'T', ' ')) < datetime('now')`
      )
      .run();
    return res.meta.changes || 0;
  } catch {
    return 0;
  }
}

/* ============================================================
   Dárkové poukazy
   ============================================================ */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function voucherCode(prefix = "DAREK"): string {
  let body = "";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (let i = 0; i < 10; i++) {
    body += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    if (i === 4) body += "-";
  }
  return `${prefix}-${body}`;
}

type VoucherRow = {
  id: number;
  code: string;
  amount: number;
  order_id: number | null;
  order_number: string;
  buyer_email: string;
  recipient_email: string;
  recipient_name: string;
  message: string;
  status: string;
  valid_to: string | null;
};

/**
 * Po vytvoření objednávky vygeneruje poukaz ke každé položce, která je
 * produktem typu „dárkový poukaz“. Poukaz zatím jen vznikne (stav `pending`);
 * kód se posílá až po zaplacení.
 */
export async function createVouchersForOrder(
  db: D1Database,
  order: { id: number; number: string; email: string; user_id?: number | null },
  extra?: { recipient_email?: string; recipient_name?: string; message?: string }
): Promise<number> {
  let created = 0;
  try {
    const items =
      (
        await db
          .prepare(
            `SELECT oi.price, oi.quantity, p.is_gift_card
             FROM order_items oi JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = ? AND p.is_gift_card = 1`
          )
          .bind(order.id)
          .all<{ price: number; quantity: number; is_gift_card: number }>()
      ).results || [];
    if (!items.length) return 0;

    const s = await loadSettings(db);
    const months = Math.max(1, Number(s.gift_valid_months || 12));
    for (const it of items) {
      for (let i = 0; i < Math.max(1, it.quantity); i++) {
        const code = voucherCode();
        // Poukaz je zároveň kupón na jedno použití — uplatní se v košíku.
        await db
          .prepare(
            `INSERT INTO coupons (code, type, value, min_order, max_uses, used_count, valid_to, active, description, requires_login, single_use, auto_delete)
             VALUES (?, 'fixed', ?, 0, 1, 0, datetime('now', ?), 1, ?, 0, 0, 0)`
          )
          .bind(code, it.price, `+${months} months`, `Dárkový poukaz z objednávky ${order.number}`)
          .run();
        await db
          .prepare(
            `INSERT INTO gift_vouchers (code, amount, order_id, order_number, user_id, buyer_email, recipient_email, recipient_name, message, status, valid_to)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now', ?))`
          )
          .bind(
            code,
            it.price,
            order.id,
            order.number,
            order.user_id ?? null,
            order.email,
            (extra?.recipient_email || "").trim(),
            (extra?.recipient_name || "").trim(),
            (extra?.message || "").trim(),
            `+${months} months`
          )
          .run();
        created++;
      }
    }
  } catch (err) {
    console.error("Gift voucher create error:", err);
  }
  return created;
}

/**
 * Odešle e-mailem všechny nevyřízené poukazy k objednávce. Volá se, jakmile
 * je objednávka zaplacená (ručně v administraci i z platební brány).
 */
export async function sendVouchersForOrder(db: D1Database, orderId: number, env?: MailEnv): Promise<number> {
  let sent = 0;
  try {
    const rows =
      (await db.prepare("SELECT * FROM gift_vouchers WHERE order_id = ? AND status != 'sent'").bind(orderId).all<VoucherRow>())
        .results || [];
    for (const v of rows) {
      const to = v.recipient_email || v.buyer_email;
      if (!to) continue;
      await notifyGiftVoucher(
        db,
        {
          code: v.code,
          amount: v.amount,
          to,
          recipient_name: v.recipient_name,
          message: v.message,
          valid_to: v.valid_to ? String(v.valid_to).slice(0, 10) : null,
          order_number: v.order_number,
        },
        env
      );
      await db.prepare("UPDATE gift_vouchers SET status = 'sent', sent_at = datetime('now') WHERE id = ?").bind(v.id).run();
      sent++;
    }
  } catch (err) {
    console.error("Gift voucher send error:", err);
  }
  return sent;
}

/** Poukazy patřící zákazníkovi (podle účtu i podle e-mailu objednávky). */
export async function loadUserVouchers(db: D1Database, userId: number, email: string) {
  const rows =
    (
      await db
        .prepare(
          `SELECT gv.id, gv.code, gv.amount, gv.order_number, gv.status, gv.valid_to, gv.created_at,
                  COALESCE(c.used_count, 0) AS used_count
           FROM gift_vouchers gv
           LEFT JOIN coupons c ON c.code = gv.code
           WHERE gv.user_id = ? OR gv.buyer_email = ?
           ORDER BY gv.id DESC`
        )
        .bind(userId, email)
        .all()
    ).results || [];
  // Kód ukazujeme jen u odeslaných (= zaplacených) poukazů.
  return rows.map((r) => {
    const row = r as Record<string, unknown>;
    return { ...row, code: row.status === "sent" ? row.code : "" };
  });
}
