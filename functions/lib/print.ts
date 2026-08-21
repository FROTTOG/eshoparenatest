/**
 * Hromadný tisk (batch print).
 *
 * Označíte v administraci třeba 20 zaplacených objednávek a jedním klikem
 * dostanete jeden dokument se všemi fakturami a přepravními štítky — každý
 * na vlastní stránce. Dokument se sám otevře v tiskovém dialogu, kde ho
 * uložíte jako jedno PDF (Uložit jako PDF) nebo rovnou vytisknete.
 */

import { ensureInvoiceForOrder, invoiceHtml, loadSettings, type InvoiceRow } from "./invoices";
import { CARRIERS, labelHtml, makeTracking, trackingUrl, type CarrierCode } from "./shipping";

export type PrintWhat = "invoices" | "labels" | "both";

function pick(html: string, tag: "style" | "body"): string {
  const re = tag === "style" ? /<style>([\s\S]*?)<\/style>/i : /<body[^>]*>([\s\S]*?)<\/body>/i;
  const m = html.match(re);
  return m ? m[1] : "";
}

function stripNoPrint(body: string): string {
  return body.replace(/<[^>]*class="noprint"[\s\S]*?<\/(?:p|div)>/gi, "");
}

function scope(css: string, className: string): string {
  // Jednoduché „zapouzdření“: každý selektor dostane prefix .sekce.
  return css
    .split("}")
    .map((chunk) => {
      const idx = chunk.indexOf("{");
      if (idx < 0) return "";
      const sel = chunk.slice(0, idx).trim();
      const rules = chunk.slice(idx + 1);
      if (!sel) return "";
      if (sel.startsWith("@")) return `${sel}{${rules}}`;
      const scoped = sel
        .split(",")
        .map((s) => {
          const t = s.trim();
          if (!t) return "";
          if (/^(body|html)$/i.test(t)) return `.${className}`;
          return `.${className} ${t}`;
        })
        .filter(Boolean)
        .join(", ");
      return `${scoped}{${rules}}`;
    })
    .filter(Boolean)
    .join("\n");
}

type OrderRow = {
  id: number;
  number: string;
  name: string;
  email: string;
  phone: string;
  shipping_recipient?: string;
  shipping_code: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  total: number;
  pickup_snapshot?: string;
  tracking_number?: string;
  tracking_carrier?: string;
};

function carrierForOrder(o: OrderRow): CarrierCode {
  const code = (o.tracking_carrier || o.shipping_code || "").toLowerCase();
  const found = CARRIERS.find((c) => code.includes(c.code));
  return (found?.code || "ceska_posta") as CarrierCode;
}

/**
 * Sestaví jeden tiskový dokument pro vybrané objednávky.
 * Faktury, které ještě neexistují, se cestou vystaví (stejně jako při
 * ručním vystavení z detailu objednávky).
 */
export async function batchPrintHtml(
  db: D1Database,
  orderIds: number[],
  what: PrintWhat
): Promise<{ html: string; invoices: number; labels: number }> {
  const ids = orderIds.filter((n) => Number.isFinite(n) && n > 0).slice(0, 100);
  const s = await loadSettings(db);
  const sections: string[] = [];
  const styles = new Map<string, string>();
  let invoiceCount = 0;
  let labelCount = 0;

  for (const id of ids) {
    const order = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(id).first<OrderRow>();
    if (!order) continue;

    if (what === "invoices" || what === "both") {
      let inv = await db.prepare("SELECT * FROM invoices WHERE order_id = ? AND status != 'cancelled'").bind(id).first<InvoiceRow>();
      if (!inv) {
        try {
          await ensureInvoiceForOrder(db, id, s);
          inv = await db.prepare("SELECT * FROM invoices WHERE order_id = ? AND status != 'cancelled'").bind(id).first<InvoiceRow>();
        } catch (err) {
          console.error("batch invoice error:", err);
        }
      }
      if (inv) {
        const html = invoiceHtml(inv, s);
        if (!styles.has("invoice")) styles.set("invoice", scope(pick(html, "style"), "print-invoice"));
        sections.push(`<section class="sheet print-invoice">${stripNoPrint(pick(html, "body"))}</section>`);
        invoiceCount++;
      }
    }

    if (what === "labels" || what === "both") {
      const carrier = carrierForOrder(order);
      const items =
        (
          await db
            .prepare("SELECT name, sku, quantity, price FROM order_items WHERE order_id = ?")
            .bind(id)
            .all<{ name: string; sku: string; quantity: number; price: number }>()
        ).results || [];
      let pickup: { name: string; address: string; city: string; zip: string } | null = null;
      if (order.pickup_snapshot) {
        try {
          pickup = JSON.parse(order.pickup_snapshot);
        } catch {
          pickup = null;
        }
      }
      const tracking = order.tracking_number || makeTracking(carrier, id);
      if (!order.tracking_number) {
        await db
          .prepare("UPDATE orders SET tracking_number = ?, tracking_carrier = ?, tracking_url = ? WHERE id = ?")
          .bind(tracking, carrier, trackingUrl(carrier, tracking), id)
          .run();
      }
      const html = labelHtml(carrier, tracking, { ...order, items, pickup }, s);
      if (!styles.has("label")) styles.set("label", scope(pick(html, "style"), "print-label"));
      sections.push(`<section class="sheet print-label">${stripNoPrint(pick(html, "body"))}</section>`);
      labelCount++;
    }
  }

  const title = `Hromadný tisk — ${ids.length} objednávek`;
  const doc = `<!doctype html>
<html lang="cs"><head><meta charset="utf-8"/><title>${title}</title>
<style>
  @page { size: A4; margin: 10mm; }
  body { margin: 0; background: #f3eee4; font-family: "Helvetica Neue", Arial, sans-serif; }
  .bar { position: sticky; top: 0; display: flex; gap: 10px; align-items: center; padding: 12px 16px; background: #1c1915; color: #fff; }
  .bar button { font: inherit; padding: 8px 16px; border-radius: 999px; border: 0; background: #fffdf8; color: #1c1915; cursor: pointer; }
  .bar span { font-size: 13px; opacity: .8 }
  .sheet { background: #fff; margin: 12px auto; padding: 10mm; width: 210mm; box-sizing: border-box; box-shadow: 0 6px 24px rgba(0,0,0,.12); }
  .sheet + .sheet { page-break-before: always; }
  .print-label { min-height: 100mm; }
  .print-label .sheet { box-shadow: none; margin: 0; width: auto; }
  @media print {
    body { background: #fff; }
    .noprint, .bar { display: none !important; }
    .sheet { margin: 0; box-shadow: none; width: auto; padding: 0; }
  }
${[...styles.values()].join("\n")}
</style></head>
<body>
  <div class="bar noprint">
    <button onclick="window.print()">Vytisknout / uložit jako PDF</button>
    <span>${invoiceCount}× faktura · ${labelCount}× štítek — každý dokument na vlastní stránce.</span>
  </div>
  ${sections.join("\n") || '<p style="padding:24px">Pro vybrané objednávky není co tisknout.</p>'}
  <script>window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 400); });</script>
</body></html>`;

  return { html: doc, invoices: invoiceCount, labels: labelCount };
}
