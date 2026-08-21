/**
 * Hromadné úpravy produktů v administraci (bulk edit) + CSV import a export.
 *
 * Používá se ze stránky „Produkty“: zaškrtnete řádky, vyberete akci a jedním
 * klikem změníte cenu, sklad, kategorii nebo viditelnost u desítek produktů.
 * CSV je oddělené středníkem s BOM, aby se otevřelo v českém Excelu.
 */

import { normalizeTags } from "./features";

export type BulkAction =
  | "price_percent"
  | "price_set"
  | "price_add"
  | "b2b_percent"
  | "b2b_set"
  | "stock_set"
  | "stock_add"
  | "category"
  | "active"
  | "featured"
  | "delete";

export const CSV_COLUMNS = [
  "id",
  "sku",
  "name",
  "slug",
  "category_slug",
  "price",
  "price_b2b",
  "compare_price",
  "stock",
  "low_stock",
  "weight",
  "active",
  "featured",
  "image",
  "tags",
  "short_description",
  "description",
] as const;

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function productsCsv(rows: Record<string, unknown>[]): string {
  const head = CSV_COLUMNS.join(";");
  const body = rows.map((r) => CSV_COLUMNS.map((k) => csvCell(r[k])).join(";")).join("\n");
  return `\ufeff${head}\n${body}\n`;
}

/** Jednoduchý CSV parser (oddělovač ; nebo ,) se správným čtením uvozovek. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\ufeff/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLine = clean.split("\n")[0] || "";
  const delim = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

export type ImportResult = { created: number; updated: number; skipped: number; errors: string[] };

/**
 * Import produktů z CSV. Řádek se páruje podle `id`, jinak podle `sku`
 * a nakonec podle `slug`. Chybějící sloupce se u existujícího produktu
 * nemění — importovat jde tedy třeba jen `sku;price;stock`.
 */
export async function importProductsCsv(db: D1Database, text: string, adminId: number): Promise<ImportResult> {
  const rows = parseCsv(text);
  const out: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };
  if (rows.length < 2) {
    out.errors.push("CSV neobsahuje žádná data (chybí hlavička nebo řádky).");
    return out;
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const cats = (await db.prepare("SELECT id, slug FROM categories").all<{ id: number; slug: string }>()).results || [];
  const catBySlug = new Map(cats.map((c) => [c.slug.toLowerCase(), c.id]));

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const rec: Record<string, string> = {};
    header.forEach((h, idx) => (rec[h] = (cells[idx] ?? "").trim()));
    const id = Number(rec.id || 0);
    const sku = rec.sku || "";
    const slug = rec.slug || "";
    try {
      let existing: { id: number; stock: number } | null = null;
      if (id) existing = await db.prepare("SELECT id, stock FROM products WHERE id = ?").bind(id).first<{ id: number; stock: number }>();
      if (!existing && sku) existing = await db.prepare("SELECT id, stock FROM products WHERE sku = ?").bind(sku).first<{ id: number; stock: number }>();
      if (!existing && slug) existing = await db.prepare("SELECT id, stock FROM products WHERE slug = ?").bind(slug).first<{ id: number; stock: number }>();

      const catId = rec.category_slug ? (catBySlug.get(rec.category_slug.toLowerCase()) ?? null) : null;

      if (existing) {
        const sets: string[] = [];
        const binds: (string | number | null)[] = [];
        const put = (col: string, val: string | number | null) => {
          sets.push(`${col} = ?`);
          binds.push(val);
        };
        if (rec.name) put("name", rec.name);
        if (rec.slug) put("slug", rec.slug);
        if (rec.sku) put("sku", rec.sku);
        if (rec.price !== undefined && rec.price !== "") put("price", Math.max(0, Math.round(Number(rec.price) || 0)));
        if (rec.price_b2b !== undefined && rec.price_b2b !== "") put("price_b2b", Math.max(0, Math.round(Number(rec.price_b2b) || 0)));
        if (rec.compare_price !== undefined && rec.compare_price !== "")
          put("compare_price", Number(rec.compare_price) > 0 ? Math.round(Number(rec.compare_price)) : null);
        if (rec.low_stock !== undefined && rec.low_stock !== "") put("low_stock", Math.round(Number(rec.low_stock) || 0));
        if (rec.weight !== undefined && rec.weight !== "") put("weight", Math.round(Number(rec.weight) || 0));
        if (rec.active !== undefined && rec.active !== "") put("active", /^(1|ano|true|yes)$/i.test(rec.active) ? 1 : 0);
        if (rec.featured !== undefined && rec.featured !== "") put("featured", /^(1|ano|true|yes)$/i.test(rec.featured) ? 1 : 0);
        if (rec.image) put("image", rec.image);
        if (rec.tags !== undefined) put("tags", normalizeTags(rec.tags));
        if (rec.short_description) put("short_description", rec.short_description);
        if (rec.description) put("description", rec.description);
        if (catId != null) put("category_id", catId);
        if (sets.length) {
          sets.push("updated_at = datetime('now')");
          await db.prepare(`UPDATE products SET ${sets.join(", ")} WHERE id = ?`).bind(...binds, existing.id).run();
        }
        // Sklad měníme přes pohyb skladu, ať sedí historie.
        if (rec.stock !== undefined && rec.stock !== "") {
          const next = Math.max(0, Math.round(Number(rec.stock) || 0));
          const delta = next - existing.stock;
          if (delta !== 0) {
            await db.prepare("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?").bind(next, existing.id).run();
            await db
              .prepare("INSERT INTO stock_movements (product_id, delta, reason, admin_id) VALUES (?, ?, 'Import CSV', ?)")
              .bind(existing.id, delta, adminId)
              .run();
          }
        }
        out.updated++;
      } else {
        const name = rec.name;
        if (!name) {
          out.skipped++;
          out.errors.push(`Řádek ${i + 1}: chybí název, nelze založit nový produkt.`);
          continue;
        }
        const stock = Math.max(0, Math.round(Number(rec.stock) || 0));
        const res = await db
          .prepare(
            `INSERT INTO products (name, slug, sku, description, short_description, price, price_b2b, compare_price, stock, low_stock, category_id, image, weight, active, featured, tags)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            name,
            rec.slug || name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80),
            rec.sku || `KAV-${Date.now().toString(36).toUpperCase()}-${i}`,
            rec.description || "",
            rec.short_description || "",
            Math.max(0, Math.round(Number(rec.price) || 0)),
            Math.max(0, Math.round(Number(rec.price_b2b) || 0)),
            Number(rec.compare_price) > 0 ? Math.round(Number(rec.compare_price)) : null,
            stock,
            Math.round(Number(rec.low_stock) || 5),
            catId,
            rec.image || "",
            Math.round(Number(rec.weight) || 0),
            rec.active && !/^(1|ano|true|yes)$/i.test(rec.active) ? 0 : 1,
            /^(1|ano|true|yes)$/i.test(rec.featured || "") ? 1 : 0,
            normalizeTags(rec.tags || "")
          )
          .run();
        const newId = Number(res.meta.last_row_id);
        if (stock > 0) {
          await db
            .prepare("INSERT INTO stock_movements (product_id, delta, reason, admin_id) VALUES (?, ?, 'Import CSV', ?)")
            .bind(newId, stock, adminId)
            .run();
        }
        out.created++;
      }
    } catch (err) {
      out.skipped++;
      out.errors.push(`Řádek ${i + 1}: ${String(err).slice(0, 140)}`);
    }
  }
  return out;
}

/** Hromadná úprava vybraných produktů. Vrací počet dotčených řádků. */
export async function bulkEditProducts(
  db: D1Database,
  ids: number[],
  action: BulkAction,
  value: string | number,
  adminId: number
): Promise<{ changed: number }> {
  const clean = ids.filter((n) => Number.isFinite(n) && n > 0).slice(0, 500);
  if (!clean.length) return { changed: 0 };
  const list = clean.map(() => "?").join(",");
  const num = Number(value) || 0;
  let changed = 0;

  switch (action) {
    case "price_percent": {
      const r = await db
        .prepare(`UPDATE products SET price = MAX(0, CAST(ROUND(price * (100 + ?) / 100.0) AS INTEGER)), updated_at = datetime('now') WHERE id IN (${list})`)
        .bind(num, ...clean)
        .run();
      changed = r.meta.changes;
      break;
    }
    case "price_add": {
      const r = await db
        .prepare(`UPDATE products SET price = MAX(0, price + ?), updated_at = datetime('now') WHERE id IN (${list})`)
        .bind(Math.round(num), ...clean)
        .run();
      changed = r.meta.changes;
      break;
    }
    case "price_set": {
      const r = await db
        .prepare(`UPDATE products SET price = ?, updated_at = datetime('now') WHERE id IN (${list})`)
        .bind(Math.max(0, Math.round(num)), ...clean)
        .run();
      changed = r.meta.changes;
      break;
    }
    case "b2b_percent": {
      // Velkoobchodní cena bez DPH = maloobchodní cena mínus zadaná sleva.
      const r = await db
        .prepare(
          `UPDATE products SET price_b2b = MAX(0, CAST(ROUND(price * (100 - ?) / 100.0 / 1.21) AS INTEGER)), updated_at = datetime('now') WHERE id IN (${list})`
        )
        .bind(num, ...clean)
        .run();
      changed = r.meta.changes;
      break;
    }
    case "b2b_set": {
      const r = await db
        .prepare(`UPDATE products SET price_b2b = ?, updated_at = datetime('now') WHERE id IN (${list})`)
        .bind(Math.max(0, Math.round(num)), ...clean)
        .run();
      changed = r.meta.changes;
      break;
    }
    case "stock_set": {
      const rows = (await db.prepare(`SELECT id, stock FROM products WHERE id IN (${list})`).bind(...clean).all<{ id: number; stock: number }>()).results || [];
      const next = Math.max(0, Math.round(num));
      for (const row of rows) {
        const delta = next - row.stock;
        if (!delta) continue;
        await db.prepare("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?").bind(next, row.id).run();
        await db
          .prepare("INSERT INTO stock_movements (product_id, delta, reason, admin_id) VALUES (?, ?, 'Hromadná úprava', ?)")
          .bind(row.id, delta, adminId)
          .run();
        changed++;
      }
      break;
    }
    case "stock_add": {
      const delta = Math.round(num);
      if (!delta) break;
      const rows = (await db.prepare(`SELECT id, stock FROM products WHERE id IN (${list})`).bind(...clean).all<{ id: number; stock: number }>()).results || [];
      for (const row of rows) {
        const next = Math.max(0, row.stock + delta);
        await db.prepare("UPDATE products SET stock = ?, updated_at = datetime('now') WHERE id = ?").bind(next, row.id).run();
        await db
          .prepare("INSERT INTO stock_movements (product_id, delta, reason, admin_id) VALUES (?, ?, 'Hromadná úprava', ?)")
          .bind(row.id, next - row.stock, adminId)
          .run();
        changed++;
      }
      break;
    }
    case "category": {
      const catId = Math.round(num) || null;
      const r = await db
        .prepare(`UPDATE products SET category_id = ?, updated_at = datetime('now') WHERE id IN (${list})`)
        .bind(catId, ...clean)
        .run();
      changed = r.meta.changes;
      break;
    }
    case "active":
    case "featured": {
      const col = action === "active" ? "active" : "featured";
      const r = await db
        .prepare(`UPDATE products SET ${col} = ?, updated_at = datetime('now') WHERE id IN (${list})`)
        .bind(num ? 1 : 0, ...clean)
        .run();
      changed = r.meta.changes;
      break;
    }
    case "delete": {
      await db.prepare(`DELETE FROM product_images WHERE product_id IN (${list})`).bind(...clean).run();
      const r = await db.prepare(`DELETE FROM products WHERE id IN (${list})`).bind(...clean).run();
      changed = r.meta.changes;
      break;
    }
  }
  return { changed };
}
