export type GaItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  item_category?: string;
};

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const CONSENT_KEY = "kavka_cookie_consent";

export function hasAnalyticsConsent(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const p = JSON.parse(raw) as { analytics?: boolean; marketing?: boolean };
    return !!(p.analytics || p.marketing);
  } catch {
    return false;
  }
}

export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
  if (typeof window.gtag === "function") {
    window.gtag("event", event, params);
  }
}

export function trackViewItem(item: GaItem, value: number) {
  track("view_item", { currency: "CZK", value, items: [item] });
}

export function trackAddToCart(item: GaItem, value: number) {
  track("add_to_cart", { currency: "CZK", value, items: [item] });
  if (typeof window.fbq === "function") {
    window.fbq("track", "AddToCart", { value, currency: "CZK", content_ids: [item.item_id], content_type: "product" });
  }
}

export function trackPurchase(order: {
  number: string;
  total: number;
  items: { sku: string; name: string; price: number; quantity: number }[];
}) {
  const items = order.items.map((i) => ({
    item_id: i.sku,
    item_name: i.name,
    price: i.price,
    quantity: i.quantity,
  }));
  track("purchase", { transaction_id: order.number, currency: "CZK", value: order.total, items });
  if (typeof window.fbq === "function") {
    window.fbq("track", "Purchase", { value: order.total, currency: "CZK" });
  }
}

function injectScript(src: string, id: string, attrs: Record<string, string> = {}) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = true;
  s.src = src;
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.appendChild(s);
}

export function bootTags(settings: Record<string, string>) {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;
  const gtm = (settings.gtm_id || "").trim();
  const ga4 = (settings.ga4_id || "").trim();
  const pixel = (settings.meta_pixel_id || "").trim();

  window.dataLayer = window.dataLayer || [];
  if (gtm && !document.getElementById("gtm-boot")) {
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    injectScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtm)}`, "gtm-boot");
    if (!document.getElementById("gtm-noscript")) {
      const ns = document.createElement("noscript");
      ns.id = "gtm-noscript";
      ns.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtm}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
      document.body.prepend(ns);
    }
  }
  if (ga4 && !document.getElementById("ga4-boot")) {
    injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4)}`, "ga4-boot");
    window.gtag = window.gtag || function gtag(...args: unknown[]) {
      window.dataLayer!.push(args as unknown as Record<string, unknown>);
    };
    window.gtag("js", new Date());
    window.gtag("config", ga4, { send_page_view: true });
  }
  if (pixel && !document.getElementById("meta-pixel")) {
    injectScript("https://connect.facebook.net/en_US/fbevents.js", "meta-pixel");
    window.setTimeout(() => {
      window.fbq?.("init", pixel);
      window.fbq?.("track", "PageView");
    }, 400);
  }
}
