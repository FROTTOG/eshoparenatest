import type { App } from "./helpers";
import { loadSettings } from "./invoices";

type FeedProduct = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  short_description: string;
  price: number;
  compare_price: number | null;
  stock: number;
  image: string;
  weight: number;
  category_name: string | null;
  ean?: string | null;
};

function xmlEscape(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(s: string): string {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function absUrl(origin: string, path: string): string {
  if (!path) return origin;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function loadFeedProducts(db: D1Database): Promise<FeedProduct[]> {
  const rows = await db
    .prepare(
      `SELECT p.id, p.name, p.slug, p.sku, p.description, p.short_description, p.price, p.compare_price,
              p.stock, p.image, p.weight, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.active = 1
       ORDER BY p.id`
    )
    .all<FeedProduct>();
  return rows.results || [];
}

export function heurekaXml(origin: string, products: FeedProduct[], vatRate: number): string {
  const items = products
    .map((p) => {
      const desc = xmlEscape(stripHtml(p.description || p.short_description || p.name).slice(0, 4000));
      const delivery = p.stock > 0 ? "0" : "-1";
      return `  <SHOPITEM>
    <ITEM_ID>${xmlEscape(p.sku)}</ITEM_ID>
    <PRODUCTNAME>${xmlEscape(p.name)}</PRODUCTNAME>
    <PRODUCT>${xmlEscape(p.name)}</PRODUCT>
    <DESCRIPTION>${desc}</DESCRIPTION>
    <URL>${xmlEscape(`${origin}/produkt/${p.slug}`)}</URL>
    <IMGURL>${xmlEscape(absUrl(origin, p.image))}</IMGURL>
    <PRICE_VAT>${p.price}</PRICE_VAT>
    <VAT>${vatRate}</VAT>
    <MANUFACTURER>KAVKA</MANUFACTURER>
    <CATEGORYTEXT>${xmlEscape(p.category_name ? `KAVKA | ${p.category_name}` : "KAVKA")}</CATEGORYTEXT>
    <DELIVERY_DATE>${delivery}</DELIVERY_DATE>
    <ITEMGROUP_ID>${xmlEscape(p.sku)}</ITEMGROUP_ID>
    <PARAM>
      <PARAM_NAME>Hmotnost</PARAM_NAME>
      <VAL>${p.weight} g</VAL>
    </PARAM>
  </SHOPITEM>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>\n<SHOP>\n${items}\n</SHOP>\n`;
}

export function zboziXml(origin: string, products: FeedProduct[], vatRate: number): string {
  const items = products
    .map((p) => {
      const desc = xmlEscape(stripHtml(p.short_description || p.description || p.name).slice(0, 2000));
      return `  <SHOPITEM>
    <ITEM_ID>${xmlEscape(p.sku)}</ITEM_ID>
    <PRODUCTNAME>${xmlEscape(p.name)}</PRODUCTNAME>
    <DESCRIPTION>${desc}</DESCRIPTION>
    <URL>${xmlEscape(`${origin}/produkt/${p.slug}`)}</URL>
    <IMGURL>${xmlEscape(absUrl(origin, p.image))}</IMGURL>
    <PRICE_VAT>${p.price}</PRICE_VAT>
    <VAT>${vatRate}</VAT>
    <MANUFACTURER>KAVKA</MANUFACTURER>
    <CATEGORYTEXT>${xmlEscape(p.category_name || "Domácnost")}</CATEGORYTEXT>
    <DELIVERY_DATE>${p.stock > 0 ? "0" : "-1"}</DELIVERY_DATE>
    <MAX_CPC>1.5</MAX_CPC>
    <MAX_CPC_SEARCH>2</MAX_CPC_SEARCH>
  </SHOPITEM>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>\n<SHOP>\n${items}\n</SHOP>\n`;
}

export function googleXml(origin: string, storeName: string, products: FeedProduct[]): string {
  const items = products
    .map((p) => {
      const desc = xmlEscape(stripHtml(p.description || p.short_description || p.name).slice(0, 5000));
      const avail = p.stock > 0 ? "in_stock" : "out_of_stock";
      const extra = p.compare_price && p.compare_price > p.price ? `\n      <g:sale_price>${p.price} CZK</g:sale_price>` : "";
      const listPrice = p.compare_price && p.compare_price > p.price ? p.compare_price : p.price;
      return `    <item>
      <g:id>${xmlEscape(p.sku)}</g:id>
      <title>${xmlEscape(p.name)}</title>
      <description>${desc}</description>
      <link>${xmlEscape(`${origin}/produkt/${p.slug}`)}</link>
      <g:image_link>${xmlEscape(absUrl(origin, p.image))}</g:image_link>
      <g:availability>${avail}</g:availability>
      <g:price>${listPrice} CZK</g:price>${extra}
      <g:brand>KAVKA</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      <g:product_type>${xmlEscape(p.category_name || "Home")}</g:product_type>
      <g:google_product_category>546</g:google_product_category>
      <g:shipping>
        <g:country>CZ</g:country>
        <g:service>Standard</g:service>
        <g:price>59 CZK</g:price>
      </g:shipping>
    </item>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xmlEscape(storeName)} — Google Shopping</title>
    <link>${xmlEscape(origin)}</link>
    <description>Produktový feed pro Google Merchant Center</description>
${items}
  </channel>
</rss>
`;
}

function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900",
    },
  });
}

export function registerFeeds(app: App) {
  async function ctx(c: { env: { DB: D1Database }; req: { url: string } }) {
    const origin = new URL(c.req.url).origin;
    const s = await loadSettings(c.env.DB);
    const products = await loadFeedProducts(c.env.DB);
    const vat = Number(s.invoice_vat_rate || 21);
    return { origin, s, products, vat };
  }

  app.get("/feeds/heureka.xml", async (c) => {
    const { origin, products, vat } = await ctx(c);
    return xmlResponse(heurekaXml(origin, products, vat));
  });
  app.get("/feeds/zbozi.xml", async (c) => {
    const { origin, products, vat } = await ctx(c);
    return xmlResponse(zboziXml(origin, products, vat));
  });
  app.get("/feeds/google.xml", async (c) => {
    const { origin, s, products } = await ctx(c);
    return xmlResponse(googleXml(origin, s.store_name || "KAVKA", products));
  });
}

/**
 * OpenAI (ChatGPT Shopping) product feed — JSONL, jeden produkt na řádek.
 * Formát odpovídá specifikaci OpenAI Commerce (2026): id, title, description,
 * link, image_link, price ("123.00 CZK"), availability, brand, condition,
 * mpn, product_category. Dodává se přes SFTP po schválení v ChatGPT merchant
 * portálu — soubor zde slouží jako zdroj dat.
 */
export function openaiJsonl(origin: string, products: FeedProduct[], storeName: string): string {
  const lines = products.map((p) => {
    const row: Record<string, string | number | boolean> = {
      id: p.sku || `p${p.id}`,
      title: p.name,
      description: stripHtml(p.description || p.short_description || p.name).slice(0, 2000),
      link: `${origin}/produkt/${encodeURIComponent(p.slug)}`,
      image_link: absUrl(origin, p.image),
      price: `${(p.price).toFixed(2)} CZK`,
      availability: p.stock > 0 ? "in_stock" : "out_of_stock",
      brand: storeName,
      condition: "new",
      mpn: p.sku,
      product_category: p.category_name ? `Home & Garden > ${p.category_name}` : "Home & Garden",
      inventory_quantity: Math.max(0, p.stock),
      enable_search: true,
    };
    if (p.compare_price && p.compare_price > p.price) {
      row.sale_price = `${p.compare_price.toFixed(2)} CZK`;
    }
    if (p.weight) row.item_weight = `${p.weight} g`;
    return JSON.stringify(row);
  });
  return lines.join("\n") + (lines.length ? "\n" : "");
}

export async function buildFeed(kind: string, origin: string, db: D1Database): Promise<string> {
  const s = await loadSettings(db);
  const products = await loadFeedProducts(db);
  const vat = Number(s.invoice_vat_rate || 21);
  if (kind === "zbozi") return zboziXml(origin, products, vat);
  if (kind === "google") return googleXml(origin, s.store_name || "KAVKA", products);
  return heurekaXml(origin, products, vat);
}
