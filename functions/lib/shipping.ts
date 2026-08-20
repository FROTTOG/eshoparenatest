import { loadSettings } from "./invoices";

export type CarrierCode = "ceska_posta" | "ppl" | "dpd";

export const CARRIERS: { code: CarrierCode; name: string; kind: string }[] = [
  { code: "ceska_posta", name: "Česká pošta — Podání online", kind: "posta" },
  { code: "ppl", name: "PPL", kind: "ppl" },
  { code: "dpd", name: "DPD", kind: "dpd" },
];

function pad(n: number, w: number) {
  return String(n).padStart(w, "0");
}

function digits(s: string): string {
  return String(s || "").replace(/\D/g, "");
}

export function makeTracking(carrier: CarrierCode, orderId: number): string {
  const seq = pad(orderId % 1000000, 8);
  if (carrier === "ppl") return `4095${seq}`;
  if (carrier === "dpd") return `1388${seq}${pad(orderId % 99, 2)}`;
  // Česká pošta — 23místné číslo RR…CZ stylizované jako Balík Na poštu / Do ruky
  return `DR${pad(orderId, 9)}CZ`;
}

export function trackingUrl(carrier: CarrierCode, tracking: string): string {
  if (carrier === "ppl") return `https://www.ppl.cz/vyhledat-zasilku?shipmentId=${encodeURIComponent(tracking)}`;
  if (carrier === "dpd") return `https://www.dpd.com/cz/cs/sledovani-zasilek/?parcelNumber=${encodeURIComponent(tracking)}`;
  return `https://www.postaonline.cz/trackandtrace/-/zasilka/cislo?parcelNumbers=${encodeURIComponent(tracking)}`;
}

function bars(code: string): string {
  const bits = Array.from(code).map((ch) => (ch.charCodeAt(0) % 2 === 0 ? "1" : "0")).join("");
  let html = "";
  for (let i = 0; i < code.length * 3; i++) {
    const w = 1 + ((code.charCodeAt(i % code.length) + i) % 3);
    const black = i % 2 === 0 || bits[i % bits.length] === "1";
    html += `<span style="display:inline-block;width:${w}px;height:48px;background:${black ? "#111" : "transparent"}"></span>`;
  }
  return html;
}

type OrderLike = {
  number: string;
  name: string;
  email: string;
  phone: string;
  shipping_recipient?: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  pickup?: { name: string; address: string; city: string; zip: string } | null;
  items: { name: string; sku: string; quantity: number; price: number }[];
  total: number;
  weight?: number;
};

export function labelHtml(
  carrier: CarrierCode,
  tracking: string,
  order: OrderLike,
  store: Record<string, string>
): string {
  const carrierName = CARRIERS.find((c) => c.code === carrier)?.name || carrier;
  const toName = order.pickup?.name || order.shipping_recipient || order.name;
  const toStreet = order.pickup?.address || order.street;
  const toCity = order.pickup?.city || order.city;
  const toZip = order.pickup?.zip || order.zip;
  const from = store.store_address || "Korunní 42, 120 00 Praha 2";
  const company = store.store_company || store.store_name || "KAVKA";
  const items = order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ");
  return `<!doctype html>
<html lang="cs"><head><meta charset="utf-8"/><title>Štítek ${tracking}</title>
<style>
  @page { size: 150mm 100mm; margin: 6mm; }
  body { font-family: "Helvetica Neue", Arial, sans-serif; color: #111; margin: 0; }
  .sheet { width: 138mm; min-height: 88mm; border: 2px solid #111; padding: 8mm; box-sizing: border-box; }
  .row { display: flex; justify-content: space-between; gap: 12px; }
  .who { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #555; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  .track { font-size: 22px; letter-spacing: .12em; font-weight: 800; }
  .bars { margin: 8px 0; height: 48px; overflow: hidden; white-space: nowrap; }
  .box { border: 1px solid #111; padding: 8px 10px; flex: 1; }
  .muted { color: #555; font-size: 12px; }
  @media print { .noprint { display: none } body { background: #fff } }
</style></head>
<body>
  <p class="noprint" style="padding:12px"><button onclick="window.print()">Tisknout štítek</button></p>
  <div class="sheet">
    <div class="row">
      <div>
        <div class="who">Odesílatel</div>
        <h1>${esc(company)}</h1>
        <div class="muted">${esc(from)}<br/>${esc(store.store_phone || "")} · ${esc(store.store_email || "")}</div>
      </div>
      <div style="text-align:right">
        <div class="who">${esc(carrierName)}</div>
        <div class="track">${esc(tracking)}</div>
        <div class="muted">Obj. ${esc(order.number)}</div>
      </div>
    </div>
    <div class="bars">${bars(tracking)}</div>
    <div class="row">
      <div class="box">
        <div class="who">Příjemce</div>
        <h1>${esc(toName)}</h1>
        <div>${esc(toStreet)}<br/>${esc(toZip)} ${esc(toCity)}<br/>${esc(order.country || "CZ")}</div>
        <div class="muted">${esc(order.phone)} · ${esc(order.email)}</div>
      </div>
      <div class="box" style="max-width:42%">
        <div class="who">Obsah</div>
        <div style="font-size:12px">${esc(items.slice(0, 220))}</div>
        <div class="muted" style="margin-top:8px">Hodnota ${order.total} Kč</div>
      </div>
    </div>
  </div>
</body></html>`;
}

function esc(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function tryLiveApi(
  carrier: CarrierCode,
  tracking: string,
  order: OrderLike,
  s: Record<string, string>
): Promise<{ ok: boolean; tracking: string; raw: string }> {
  try {
    if (carrier === "ppl" && s.ppl_api_key) {
      const res = await fetch(s.ppl_api_url || "https://api.dhl.com/parcel/de/shipping/v2/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${s.ppl_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference: order.number,
          consignee: { name: order.name, street: order.street, city: order.city, zip: order.zip, phone: order.phone },
        }),
        signal: AbortSignal.timeout(8000),
      });
      const raw = await res.text();
      return { ok: res.ok, tracking, raw: raw.slice(0, 4000) };
    }
    if (carrier === "dpd" && s.dpd_api_key) {
      const res = await fetch(s.dpd_api_url || "https://api.dpd.com/shipping/shipment", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${s.dpd_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference: order.number,
          recipient: { name: order.name, street: order.street, city: order.city, zipCode: digits(order.zip), phone: order.phone },
        }),
        signal: AbortSignal.timeout(8000),
      });
      const raw = await res.text();
      return { ok: res.ok, tracking, raw: raw.slice(0, 4000) };
    }
    if (carrier === "ceska_posta" && s.ceska_posta_api_key) {
      // Podání online — REST most, pokud je vyplněný endpoint (SOAP brána ČP)
      const res = await fetch(s.ceska_posta_api_url || "https://b2b.postaonline.cz/services/POLService/v1", {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          Authorization: `Basic ${s.ceska_posta_api_key}`,
        },
        body: `<?xml version="1.0"?><sendParcels><parcel id="${order.number}"><prefixParcelCode>DR</prefixParcelCode></parcel></sendParcels>`,
        signal: AbortSignal.timeout(8000),
      });
      const raw = await res.text();
      return { ok: res.ok, tracking, raw: raw.slice(0, 4000) };
    }
  } catch (e) {
    return { ok: false, tracking, raw: String(e) };
  }
  return { ok: true, tracking, raw: "local-label" };
}

export async function createShipment(
  db: D1Database,
  orderId: number,
  carrier: CarrierCode
): Promise<{
  id: number;
  tracking_number: string;
  tracking_url: string;
  carrier: CarrierCode;
  label_html: string;
  live: boolean;
} | null> {
  const row = await db.prepare("SELECT * FROM orders WHERE id = ?").bind(orderId).first<OrderLike & { id: number; pickup_snapshot?: string }>();
  if (!row) return null;
  const items =
    (await db.prepare("SELECT name, sku, quantity, price FROM order_items WHERE order_id = ?").bind(orderId).all<{ name: string; sku: string; quantity: number; price: number }>()).results || [];
  let pickup: OrderLike["pickup"] = null;
  if (row.pickup_snapshot) {
    try {
      pickup = JSON.parse(row.pickup_snapshot);
    } catch {
      pickup = null;
    }
  }
  const order: OrderLike & { id: number; number: string } = { ...row, items, pickup };
  const s = await loadSettings(db);
  const tracking = makeTracking(carrier, orderId);
  const live = await tryLiveApi(carrier, tracking, order, s);
  const html = labelHtml(carrier, live.tracking, order, s);
  const url = trackingUrl(carrier, live.tracking);
  const res = await db
    .prepare(
      `INSERT INTO shipments (order_id, carrier, tracking_number, tracking_url, status, label_html, api_response)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(orderId, carrier, live.tracking, url, live.ok ? "created" : "local", html, live.raw)
    .run();
  await db
    .prepare(
      "UPDATE orders SET tracking_number = ?, tracking_carrier = ?, tracking_url = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(live.tracking, carrier, url, orderId)
    .run();
  return {
    id: Number(res.meta.last_row_id),
    tracking_number: live.tracking,
    tracking_url: url,
    carrier,
    label_html: html,
    live: live.ok && live.raw !== "local-label",
  };
}
