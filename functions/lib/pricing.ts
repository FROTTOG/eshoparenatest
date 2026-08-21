/**
 * Velkoobchodní (B2B) ceník.
 *
 * Zákazník má ve sloupci `users.customer_group` hodnotu `retail` (běžný
 * zákazník) nebo `b2b` (velkoobchod). Produkt může mít vlastní velkoobchodní
 * cenu **bez DPH** (`products.price_b2b`). Když ji nemá, použije se plošná
 * sleva z nastavení (`b2b_discount`).
 *
 * Uvnitř e-shopu (košík, objednávky, faktury) se pořád počítá s cenou
 * **včetně DPH** — díky tomu se nemusí měnit pokladna ani fakturace.
 * Velkoobchodníkovi se ceny jen zobrazují bez DPH (viz `netPrice`).
 */

export type PriceCtx = {
  /** Přihlášený zákazník je ve skupině B2B a velkoobchod je zapnutý. */
  b2b: boolean;
  /** Sazba DPH v procentech (0 = neplátce). */
  vatRate: number;
  /** Plošná velkoobchodní sleva v procentech (fallback bez vlastní ceny). */
  discount: number;
};

export const RETAIL_CTX: PriceCtx = { b2b: false, vatRate: 21, discount: 0 };

export type PricedRow = { price: number; price_b2b?: number | null } & Record<string, unknown>;

/** Načte kontext cen pro daného uživatele (jeden dotaz do nastavení). */
export async function priceContext(
  db: D1Database,
  user: { id: number; role?: string; customer_group?: string } | null | undefined
): Promise<PriceCtx> {
  const rows =
    (
      await db
        .prepare("SELECT key, value FROM settings WHERE key IN ('b2b_enabled','b2b_discount','invoice_vat_rate','invoice_vat_payer')")
        .all<{ key: string; value: string }>()
    ).results || [];
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const vatRate = s.invoice_vat_payer === "0" ? 0 : Number(s.invoice_vat_rate || 21) || 0;
  const discount = Math.min(90, Math.max(0, Number(s.b2b_discount || 0) || 0));
  let b2b = false;
  if (s.b2b_enabled !== "0" && user?.id) {
    if (user.customer_group != null) {
      b2b = user.customer_group === "b2b";
    } else {
      const row = await db.prepare("SELECT customer_group FROM users WHERE id = ?").bind(user.id).first<{ customer_group: string }>();
      b2b = (row?.customer_group || "retail") === "b2b";
    }
  }
  return { b2b, vatRate, discount };
}

/** Cena včetně DPH, kterou má daný zákazník doopravdy zaplatit. */
export function effectivePrice(row: PricedRow, ctx: PriceCtx): number {
  const base = Number(row.price) || 0;
  if (!ctx.b2b) return base;
  const net = Number(row.price_b2b || 0);
  if (net > 0) return Math.round(net * (1 + ctx.vatRate / 100));
  if (ctx.discount > 0) return Math.round((base * (100 - ctx.discount)) / 100);
  return base;
}

/** Cena bez DPH — jen pro zobrazení ve velkoobchodním režimu. */
export function netPrice(gross: number, ctx: PriceCtx): number {
  if (ctx.vatRate <= 0) return Math.round(gross);
  return Math.round(gross / (1 + ctx.vatRate / 100));
}

/**
 * Doplní řádku produktu o velkoobchodní cenu. Vrací nový objekt, aby se dal
 * bezpečně použít i na data z cache.
 */
export function applyPricing<T extends PricedRow>(row: T, ctx: PriceCtx): T & { price_retail?: number; price_net?: number } {
  if (!ctx.b2b) return row;
  const price = effectivePrice(row, ctx);
  return {
    ...row,
    price,
    price_retail: Number(row.price) || 0,
    price_net: netPrice(price, ctx),
    compare_price: null,
  };
}

export function applyPricingAll<T extends PricedRow>(rows: T[], ctx: PriceCtx) {
  if (!ctx.b2b) return rows;
  return rows.map((r) => applyPricing(r, ctx));
}
