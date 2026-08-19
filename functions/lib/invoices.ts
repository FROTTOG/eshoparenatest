/**
 * Faktury a účetní exporty (iDoklad / Fakturoid / POHODA).
 *
 * - Faktura se generuje automaticky (podle nastavení při objednávce nebo po zaplacení).
 * - Ceny v e-shopu jsou uvedené včetně DPH, základ a DPH tedy dopočítáváme zpět.
 */

export type InvoiceItem = {
  name: string;
  sku: string;
  quantity: number;
  unit: string;
  unit_price: number; // s DPH
  total: number; // s DPH
  vat_rate: number;
  kind: "product" | "shipping" | "payment" | "discount";
};

export type InvoiceRow = {
  id: number;
  number: string;
  order_id: number;
  order_number: string;
  variable_symbol: string;
  issue_date: string;
  taxable_date: string;
  due_date: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_street: string;
  customer_city: string;
  customer_zip: string;
  customer_country: string;
  company_name: string;
  ico: string;
  dic: string;
  currency: string;
  vat_rate: number;
  vat_payer: number;
  subtotal: number; // základ bez DPH
  vat_amount: number;
  total: number; // s DPH
  payment_code: string;
  payment_name: string;
  status: string; // issued | paid | cancelled
  paid_at: string | null;
  note: string;
  items_json: string;
  created_at: string;
};

export const INVOICES_SQL = `CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL,
  order_number TEXT NOT NULL DEFAULT '',
  variable_symbol TEXT NOT NULL DEFAULT '',
  issue_date TEXT NOT NULL,
  taxable_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  customer_street TEXT NOT NULL DEFAULT '',
  customer_city TEXT NOT NULL DEFAULT '',
  customer_zip TEXT NOT NULL DEFAULT '',
  customer_country TEXT NOT NULL DEFAULT 'CZ',
  company_name TEXT NOT NULL DEFAULT '',
  ico TEXT NOT NULL DEFAULT '',
  dic TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'CZK',
  vat_rate INTEGER NOT NULL DEFAULT 21,
  vat_payer INTEGER NOT NULL DEFAULT 1,
  subtotal INTEGER NOT NULL DEFAULT 0,
  vat_amount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  payment_code TEXT NOT NULL DEFAULT '',
  payment_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'issued',
  paid_at TEXT,
  note TEXT NOT NULL DEFAULT '',
  items_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export const INVOICES_INDEX_SQL = [
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id)",
  "CREATE INDEX IF NOT EXISTS idx_invoices_issue ON invoices(issue_date)",
];

export async function loadSettings(db: D1Database): Promise<Record<string, string>> {
  const rows = (await db.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>()).results || [];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function digitsOnly(s: string, max = 10): string {
  const d = (s || "").replace(/\D+/g, "");
  return d.slice(-max);
}

/** Další číslo faktury v řadě, např. 2026 0001 s volitelnou předponou. */
export async function nextInvoiceNumber(db: D1Database, settings: Record<string, string>): Promise<string> {
  const prefix = (settings.invoice_prefix || "").trim();
  const year = new Date().getUTCFullYear();
  const pad = Math.min(Math.max(Number(settings.invoice_pad || 4), 3), 8);
  const like = `${prefix}${year}%`;
  const rows =
    (await db.prepare("SELECT number FROM invoices WHERE number LIKE ? ORDER BY id DESC LIMIT 200").bind(like).all<{ number: string }>()).results || [];
  let max = Number(settings.invoice_start || 0);
  for (const r of rows) {
    const tail = r.number.slice((prefix + String(year)).length);
    const n = Number(tail.replace(/\D+/g, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${year}${String(max + 1).padStart(pad, "0")}`;
}

type OrderLike = Record<string, unknown>;

function num(v: unknown): number {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

export function buildInvoiceItems(order: OrderLike, items: OrderLike[], vatRate: number): InvoiceItem[] {
  const out: InvoiceItem[] = items.map((it) => ({
    name: str(it.name),
    sku: str(it.sku),
    quantity: num(it.quantity),
    unit: "ks",
    unit_price: num(it.price),
    total: num(it.price) * num(it.quantity),
    vat_rate: vatRate,
    kind: "product" as const,
  }));
  if (num(order.discount) > 0) {
    out.push({
      name: `Sleva${order.coupon_code ? ` (kupón ${str(order.coupon_code)})` : ""}`,
      sku: "SLEVA",
      quantity: 1,
      unit: "ks",
      unit_price: -num(order.discount),
      total: -num(order.discount),
      vat_rate: vatRate,
      kind: "discount",
    });
  }
  if (num(order.shipping_price) > 0) {
    out.push({
      name: `Doprava — ${str(order.shipping_name)}`,
      sku: "DOPRAVA",
      quantity: 1,
      unit: "ks",
      unit_price: num(order.shipping_price),
      total: num(order.shipping_price),
      vat_rate: vatRate,
      kind: "shipping",
    });
  }
  if (num(order.payment_fee) > 0) {
    out.push({
      name: `Platba — ${str(order.payment_name)}`,
      sku: "PLATBA",
      quantity: 1,
      unit: "ks",
      unit_price: num(order.payment_fee),
      total: num(order.payment_fee),
      vat_rate: vatRate,
      kind: "payment",
    });
  }
  return out;
}

export function splitVat(totalWithVat: number, vatRate: number, vatPayer: boolean): { base: number; vat: number } {
  if (!vatPayer || vatRate <= 0) return { base: totalWithVat, vat: 0 };
  const base = Math.round((totalWithVat / (1 + vatRate / 100)) * 100) / 100;
  const vat = Math.round((totalWithVat - base) * 100) / 100;
  return { base: Math.round(base), vat: Math.round(vat) };
}

/**
 * Vytvoří fakturu k objednávce, pokud ještě neexistuje.
 * Vrací fakturu (novou i existující), nebo null když objednávka neexistuje.
 */
export async function ensureInvoiceForOrder(
  db: D1Database,
  orderId: number,
  settings?: Record<string, string>
): Promise<InvoiceRow | null> {
  const existing = await db.prepare("SELECT * FROM invoices WHERE order_id = ?").bind(orderId).first<InvoiceRow>();
  if (existing) return existing;

  const order = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first<OrderLike>();
  if (!order) return null;
  const s = settings || (await loadSettings(db));
  const items = (await db.prepare("SELECT * FROM order_items WHERE order_id = ?").bind(orderId).all<OrderLike>()).results || [];

  const vatPayer = s.invoice_vat_payer !== "0";
  const vatRate = vatPayer ? Number(s.invoice_vat_rate || 21) : 0;
  const issue = today();
  const dueDays = Number(s.invoice_due_days || 14);
  const invItems = buildInvoiceItems(order, items, vatRate);
  const total = num(order.total);
  const { base, vat } = splitVat(total, vatRate, vatPayer);
  const number = await nextInvoiceNumber(db, s);
  const vs = digitsOnly(str(order.number)) || String(orderId).padStart(6, "0");
  const paid = str(order.payment_status) === "paid";

  const street = str(order.billing_street) || str(order.street);
  const city = str(order.billing_city) || str(order.city);
  const zip = str(order.billing_zip) || str(order.zip);
  const country = str(order.billing_country) || str(order.country) || "CZ";

  try {
    await db
      .prepare(
        `INSERT INTO invoices (
           number, order_id, order_number, variable_symbol, issue_date, taxable_date, due_date,
           customer_name, customer_email, customer_phone, customer_street, customer_city, customer_zip, customer_country,
           company_name, ico, dic, currency, vat_rate, vat_payer, subtotal, vat_amount, total,
           payment_code, payment_name, status, paid_at, note, items_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        number,
        orderId,
        str(order.number),
        vs,
        issue,
        issue,
        addDays(issue, dueDays),
        str(order.billing_name) || str(order.name),
        str(order.email),
        str(order.phone),
        street,
        city,
        zip,
        country,
        str(order.company_name),
        str(order.ico),
        str(order.dic),
        s.invoice_currency || "CZK",
        vatRate,
        vatPayer ? 1 : 0,
        base,
        vat,
        total,
        str(order.payment_code),
        str(order.payment_name),
        paid ? "paid" : "issued",
        paid ? issue : null,
        `Fakturujeme vám objednávku ${str(order.number)}.`,
        JSON.stringify(invItems)
      )
      .run();
  } catch {
    /* souběžné vytvoření — načteme existující */
  }
  return await db.prepare("SELECT * FROM invoices WHERE order_id = ?").bind(orderId).first<InvoiceRow>();
}

export async function markInvoicePaid(db: D1Database, orderId: number, paid: boolean) {
  await db
    .prepare("UPDATE invoices SET status = ?, paid_at = ? WHERE order_id = ? AND status != 'cancelled'")
    .bind(paid ? "paid" : "issued", paid ? today() : null, orderId)
    .run();
}

export async function cancelInvoiceForOrder(db: D1Database, orderId: number) {
  await db.prepare("UPDATE invoices SET status = 'cancelled' WHERE order_id = ?").bind(orderId).run();
}

/* ============================================================
   Tisková podoba faktury (HTML → uživatel si dá Tisk / Uložit do PDF)
   ============================================================ */

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n: number, currency = "CZK"): string {
  return `${new Intl.NumberFormat("cs-CZ").format(Math.round(n))} ${currency === "CZK" ? "Kč" : currency}`;
}

function dateCz(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

export function invoiceHtml(inv: InvoiceRow, s: Record<string, string>): string {
  const items: InvoiceItem[] = (() => {
    try {
      return JSON.parse(inv.items_json) as InvoiceItem[];
    } catch {
      return [];
    }
  })();
  const rows = items
    .map((it) => {
      const line = splitVat(it.total, it.vat_rate, !!inv.vat_payer);
      return `<tr>
        <td>${esc(it.name)}<div class="sku">${esc(it.sku)}</div></td>
        <td class="r">${it.quantity} ${esc(it.unit)}</td>
        <td class="r">${money(it.unit_price, inv.currency)}</td>
        <td class="r">${inv.vat_payer ? `${it.vat_rate} %` : "—"}</td>
        <td class="r">${money(line.base, inv.currency)}</td>
        <td class="r">${money(it.total, inv.currency)}</td>
      </tr>`;
    })
    .join("");

  const statusLabel = inv.status === "paid" ? "ZAPLACENO" : inv.status === "cancelled" ? "STORNO" : "K ÚHRADĚ";

  return `<!doctype html>
<html lang="cs"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Faktura ${esc(inv.number)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#1c1915;margin:0;padding:32px;background:#f6f3ee}
  .sheet{max-width:800px;margin:0 auto;background:#fff;padding:40px;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.07)}
  h1{font-size:26px;margin:0 0 2px}
  .muted{color:#7c7367;font-size:13px}
  .top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:2px solid #1c1915;padding-bottom:18px;margin-bottom:22px}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
  .box h3{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#7c7367;margin:0 0 8px}
  .box p{margin:0;line-height:1.6;font-size:14px}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:14px}
  th{text-align:left;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#7c7367;border-bottom:1px solid #e3ddd3;padding:8px 6px}
  td{padding:10px 6px;border-bottom:1px solid #f0ebe3;vertical-align:top}
  td.r,th.r{text-align:right}
  .sku{font-size:11px;color:#9a9188}
  .totals{margin-top:18px;margin-left:auto;width:min(340px,100%)}
  .totals div{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}
  .totals .grand{border-top:2px solid #1c1915;margin-top:6px;padding-top:10px;font-size:19px;font-weight:700}
  .stamp{border:2px solid #2f5d43;color:#2f5d43;border-radius:10px;padding:8px 14px;font-weight:800;letter-spacing:.1em;font-size:13px}
  .stamp.due{border-color:#b4552d;color:#b4552d}
  .foot{margin-top:28px;font-size:12px;color:#7c7367;line-height:1.7;border-top:1px solid #e3ddd3;padding-top:14px}
  .noprint{margin:0 auto 18px;max-width:800px;display:flex;gap:10px}
  button,a.btn{background:#b4552d;color:#fff;border:0;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none}
  @media print{body{background:#fff;padding:0}.sheet{box-shadow:none;padding:0;border-radius:0}.noprint{display:none}}
</style></head>
<body>
<div class="noprint"><button onclick="window.print()">Vytisknout / uložit do PDF</button></div>
<div class="sheet">
  <div class="top">
    <div>
      <h1>Faktura — daňový doklad</h1>
      <div class="muted">č. ${esc(inv.number)} · objednávka ${esc(inv.order_number)}</div>
    </div>
    <div class="stamp ${inv.status === "paid" ? "" : "due"}">${statusLabel}</div>
  </div>

  <div class="parties">
    <div class="box">
      <h3>Dodavatel</h3>
      <p><b>${esc(s.store_company || s.store_name || "KAVKA")}</b><br/>
      ${esc(s.store_address || "")}<br/>
      IČO: ${esc(s.store_ico || "")}${s.store_dic ? ` · DIČ: ${esc(s.store_dic)}` : ""}<br/>
      ${esc(s.store_email || "")} · ${esc(s.store_phone || "")}<br/>
      ${esc(s.store_registry || "")}</p>
    </div>
    <div class="box">
      <h3>Odběratel</h3>
      <p><b>${esc(inv.company_name || inv.customer_name)}</b><br/>
      ${inv.company_name ? `${esc(inv.customer_name)}<br/>` : ""}
      ${esc(inv.customer_street)}<br/>
      ${esc(inv.customer_zip)} ${esc(inv.customer_city)}, ${esc(inv.customer_country)}<br/>
      ${inv.ico ? `IČO: ${esc(inv.ico)}<br/>` : ""}${inv.dic ? `DIČ: ${esc(inv.dic)}<br/>` : ""}
      ${esc(inv.customer_email)}</p>
    </div>
  </div>

  <div class="parties">
    <div class="box">
      <h3>Platební údaje</h3>
      <p>Variabilní symbol: <b>${esc(inv.variable_symbol)}</b><br/>
      Číslo účtu: ${esc(s.bank_account || "")}<br/>
      IBAN: ${esc(s.iban || "")}<br/>
      Způsob platby: ${esc(inv.payment_name)}</p>
    </div>
    <div class="box">
      <h3>Termíny</h3>
      <p>Datum vystavení: <b>${dateCz(inv.issue_date)}</b><br/>
      Datum zdanitelného plnění: ${dateCz(inv.taxable_date)}<br/>
      Datum splatnosti: <b>${dateCz(inv.due_date)}</b></p>
    </div>
  </div>

  <table>
    <thead><tr><th>Položka</th><th class="r">Množství</th><th class="r">Cena/ks s DPH</th><th class="r">DPH</th><th class="r">Bez DPH</th><th class="r">Celkem</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span>Základ daně</span><span>${money(inv.subtotal, inv.currency)}</span></div>
    <div><span>DPH ${inv.vat_payer ? `${inv.vat_rate} %` : "— neplátce"}</span><span>${money(inv.vat_amount, inv.currency)}</span></div>
    <div class="grand"><span>Celkem k úhradě</span><span>${money(inv.total, inv.currency)}</span></div>
  </div>

  <div class="foot">
    ${esc(inv.note)}<br/>
    ${inv.vat_payer ? esc(s.store_vat_note || "") : "Dodavatel není plátcem DPH."}<br/>
    Vystaveno systémem KAVKA · ${esc(s.vendor_web || "https://jmweb.cz")}
  </div>
</div>
</body></html>`;
}

/* ============================================================
   Exporty do účetních systémů
   ============================================================ */

export type ExportRow = InvoiceRow & { items: InvoiceItem[] };

export function withItems(rows: InvoiceRow[]): ExportRow[] {
  return rows.map((r) => {
    let items: InvoiceItem[] = [];
    try {
      items = JSON.parse(r.items_json) as InvoiceItem[];
    } catch {
      items = [];
    }
    return { ...r, items };
  });
}

function csv(rows: (string | number)[][], sep = ";"): string {
  const body = rows
    .map((r) =>
      r
        .map((cell) => {
          const v = String(cell ?? "");
          return /["\n;,]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(sep)
    )
    .join("\r\n");
  return "\uFEFF" + body + "\r\n";
}

function dec(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

/** iDoklad — CSV faktur vydaných (jeden řádek = jedna položka faktury). */
export function exportIdoklad(rows: ExportRow[]): string {
  const head = [
    "Číslo dokladu",
    "Variabilní symbol",
    "Datum vystavení",
    "Datum zdanitelného plnění",
    "Datum splatnosti",
    "Odběratel",
    "IČO",
    "DIČ",
    "Ulice",
    "Město",
    "PSČ",
    "Země",
    "E-mail",
    "Telefon",
    "Název položky",
    "Množství",
    "Jednotka",
    "Cena za jednotku bez DPH",
    "Sazba DPH",
    "Celkem bez DPH",
    "Celkem DPH",
    "Celkem s DPH",
    "Měna",
    "Způsob úhrady",
    "Uhrazeno",
    "Poznámka",
  ];
  const out: (string | number)[][] = [head];
  for (const inv of rows) {
    for (const it of inv.items) {
      const line = splitVat(it.total, it.vat_rate, !!inv.vat_payer);
      const unitBase = it.quantity ? line.base / it.quantity : line.base;
      out.push([
        inv.number,
        inv.variable_symbol,
        inv.issue_date,
        inv.taxable_date,
        inv.due_date,
        inv.company_name || inv.customer_name,
        inv.ico,
        inv.dic,
        inv.customer_street,
        inv.customer_city,
        inv.customer_zip,
        inv.customer_country,
        inv.customer_email,
        inv.customer_phone,
        it.name,
        it.quantity,
        it.unit,
        dec(unitBase),
        inv.vat_payer ? it.vat_rate : 0,
        dec(line.base),
        dec(line.vat),
        dec(it.total),
        inv.currency,
        inv.payment_name,
        inv.status === "paid" ? "ano" : "ne",
        `Objednávka ${inv.order_number}`,
      ]);
    }
  }
  return csv(out);
}

/** Fakturoid — CSV s anglickými názvy sloupců (jeden řádek = jedna položka). */
export function exportFakturoid(rows: ExportRow[]): string {
  const head = [
    "number",
    "variable_symbol",
    "issued_on",
    "taxable_fulfillment_due",
    "due_on",
    "client_name",
    "client_registration_no",
    "client_vat_no",
    "client_street",
    "client_city",
    "client_zip",
    "client_country",
    "client_email",
    "client_phone",
    "currency",
    "vat_price_mode",
    "line_name",
    "line_quantity",
    "line_unit_name",
    "line_unit_price",
    "line_vat_rate",
    "order_number",
    "paid_on",
    "note",
  ];
  const out: (string | number)[][] = [head];
  for (const inv of rows) {
    for (const it of inv.items) {
      out.push([
        inv.number,
        inv.variable_symbol,
        inv.issue_date,
        inv.taxable_date,
        inv.due_date,
        inv.company_name || inv.customer_name,
        inv.ico,
        inv.dic,
        inv.customer_street,
        inv.customer_city,
        inv.customer_zip,
        inv.customer_country || "CZ",
        inv.customer_email,
        inv.customer_phone,
        inv.currency,
        "including_vat",
        it.name,
        it.quantity,
        it.unit,
        dec(it.unit_price),
        inv.vat_payer ? it.vat_rate : 0,
        inv.order_number,
        inv.status === "paid" ? inv.paid_at || inv.issue_date : "",
        `Objednávka ${inv.order_number} — ${inv.payment_name}`,
      ]);
    }
  }
  return csv(out);
}

function vatCode(rate: number, vatPayer: boolean): string {
  if (!vatPayer || rate <= 0) return "none";
  if (rate >= 20) return "high";
  return "low";
}

/** POHODA — XML dataPack s vydanými fakturami (Stormware schema version_2). */
export function exportPohoda(rows: ExportRow[], s: Record<string, string>): string {
  const ico = s.store_ico || "";
  const items = rows
    .map((inv, idx) => {
      const detail = inv.items
        .map(
          (it) => `        <inv:invoiceItem>
          <inv:text>${esc(it.name)}</inv:text>
          <inv:quantity>${it.quantity}</inv:quantity>
          <inv:unit>${esc(it.unit)}</inv:unit>
          <inv:coefficient>1.0</inv:coefficient>
          <inv:payVAT>true</inv:payVAT>
          <inv:rateVAT>${vatCode(it.vat_rate, !!inv.vat_payer)}</inv:rateVAT>
          <inv:homeCurrency>
            <typ:unitPrice>${dec(it.unit_price)}</typ:unitPrice>
          </inv:homeCurrency>
          <inv:code>${esc(it.sku)}</inv:code>
        </inv:invoiceItem>`
        )
        .join("\n");
      return `  <dat:dataPackItem version="2.0" id="FA${esc(inv.number)}-${idx + 1}">
    <inv:invoice version="2.0">
      <inv:invoiceHeader>
        <inv:invoiceType>issuedInvoice</inv:invoiceType>
        <inv:number>
          <typ:numberRequested>${esc(inv.number)}</typ:numberRequested>
        </inv:number>
        <inv:symVar>${esc(inv.variable_symbol)}</inv:symVar>
        <inv:date>${esc(inv.issue_date)}</inv:date>
        <inv:dateTax>${esc(inv.taxable_date)}</inv:dateTax>
        <inv:dateAccounting>${esc(inv.issue_date)}</inv:dateAccounting>
        <inv:dateDue>${esc(inv.due_date)}</inv:dateDue>
        <inv:text>Objednávka ${esc(inv.order_number)}</inv:text>
        <inv:partnerIdentity>
          <typ:address>
            <typ:company>${esc(inv.company_name || inv.customer_name)}</typ:company>
            <typ:name>${esc(inv.customer_name)}</typ:name>
            <typ:street>${esc(inv.customer_street)}</typ:street>
            <typ:city>${esc(inv.customer_city)}</typ:city>
            <typ:zip>${esc(inv.customer_zip)}</typ:zip>
            <typ:country><typ:ids>${esc(inv.customer_country || "CZ")}</typ:ids></typ:country>
            <typ:ico>${esc(inv.ico)}</typ:ico>
            <typ:dic>${esc(inv.dic)}</typ:dic>
            <typ:email>${esc(inv.customer_email)}</typ:email>
            <typ:mobilPhone>${esc(inv.customer_phone)}</typ:mobilPhone>
          </typ:address>
        </inv:partnerIdentity>
        <inv:paymentType>
          <typ:paymentType>${inv.payment_code === "cod" ? "delivery" : inv.payment_code === "cash_store" ? "cash" : "draft"}</typ:paymentType>
        </inv:paymentType>
        <inv:account>
          <typ:accountNo>${esc((s.bank_account || "").split("/")[0] || "")}</typ:accountNo>
          <typ:bankCode>${esc((s.bank_account || "").split("/")[1] || "")}</typ:bankCode>
        </inv:account>
      </inv:invoiceHeader>
      <inv:invoiceDetail>
${detail}
      </inv:invoiceDetail>
      <inv:invoiceSummary>
        <inv:roundingDocument>none</inv:roundingDocument>
        <inv:homeCurrency>
          <typ:priceNone>${inv.vat_payer ? "0.00" : dec(inv.total)}</typ:priceNone>
          <typ:priceHigh>${inv.vat_payer ? dec(inv.subtotal) : "0.00"}</typ:priceHigh>
          <typ:priceHighVAT>${inv.vat_payer ? dec(inv.vat_amount) : "0.00"}</typ:priceHighVAT>
          <typ:priceHighSum>${inv.vat_payer ? dec(inv.total) : "0.00"}</typ:priceHighSum>
          <typ:round><typ:priceRound>0.00</typ:priceRound></typ:round>
        </inv:homeCurrency>
      </inv:invoiceSummary>
    </inv:invoice>
  </dat:dataPackItem>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<dat:dataPack version="2.0" id="KAVKA-EXPORT" ico="${esc(ico)}" application="KAVKA e-shop" note="Export vydaných faktur"
  xmlns:dat="http://www.stormware.cz/schema/version_2/data.xsd"
  xmlns:inv="http://www.stormware.cz/schema/version_2/invoice.xsd"
  xmlns:typ="http://www.stormware.cz/schema/version_2/type.xsd">
${items}
</dat:dataPack>
`;
}

/** Univerzální CSV faktur (jeden řádek = jedna faktura) — pro Excel a ostatní systémy. */
export function exportInvoicesCsv(rows: ExportRow[]): string {
  const head = [
    "Číslo faktury",
    "Objednávka",
    "VS",
    "Vystaveno",
    "Splatnost",
    "Zákazník",
    "Firma",
    "IČO",
    "DIČ",
    "E-mail",
    "Ulice",
    "Město",
    "PSČ",
    "Základ bez DPH",
    "DPH",
    "Celkem s DPH",
    "Měna",
    "Platba",
    "Stav",
    "Zaplaceno dne",
  ];
  const out: (string | number)[][] = [head];
  for (const inv of rows) {
    out.push([
      inv.number,
      inv.order_number,
      inv.variable_symbol,
      inv.issue_date,
      inv.due_date,
      inv.customer_name,
      inv.company_name,
      inv.ico,
      inv.dic,
      inv.customer_email,
      inv.customer_street,
      inv.customer_city,
      inv.customer_zip,
      dec(inv.subtotal),
      dec(inv.vat_amount),
      dec(inv.total),
      inv.currency,
      inv.payment_name,
      inv.status === "paid" ? "zaplaceno" : inv.status === "cancelled" ? "storno" : "vystaveno",
      inv.paid_at || "",
    ]);
  }
  return csv(out);
}

/** CSV objednávek (nezávisle na fakturách). */
export function exportOrdersCsv(orders: Record<string, unknown>[]): string {
  const head = [
    "Číslo objednávky",
    "Vytvořeno",
    "Zákazník",
    "E-mail",
    "Telefon",
    "Firma",
    "IČO",
    "DIČ",
    "Ulice",
    "Město",
    "PSČ",
    "Doprava",
    "Cena dopravy",
    "Platba",
    "Poplatek",
    "Mezisoučet",
    "Sleva",
    "Celkem",
    "Stav",
    "Platba stav",
  ];
  const out: (string | number)[][] = [head];
  for (const o of orders) {
    out.push([
      str(o.number),
      str(o.created_at),
      str(o.name),
      str(o.email),
      str(o.phone),
      str(o.company_name),
      str(o.ico),
      str(o.dic),
      str(o.billing_street) || str(o.street),
      str(o.billing_city) || str(o.city),
      str(o.billing_zip) || str(o.zip),
      str(o.shipping_name),
      num(o.shipping_price),
      str(o.payment_name),
      num(o.payment_fee),
      num(o.subtotal),
      num(o.discount),
      num(o.total),
      str(o.status),
      str(o.payment_status),
    ]);
  }
  return csv(out);
}
