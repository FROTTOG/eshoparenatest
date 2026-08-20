import { loadSettings } from "./invoices";

export type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  kind?: string;
  meta?: string;
};

function escapeHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function wrapMail(store: string, title: string, body: string): string {
  return `<!doctype html>
<html lang="cs"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;background:#f3eee4;font-family:Georgia,serif;color:#1c1915">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3eee4;padding:24px 12px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fffdf8;border:1px solid #d7ccbc;border-radius:16px;overflow:hidden">
        <tr><td style="background:#24352c;color:#efe8dc;padding:18px 24px;letter-spacing:.18em;font-size:18px">${escapeHtml(store)}</td></tr>
        <tr><td style="padding:24px">
          <h1 style="font-size:22px;margin:0 0 12px">${escapeHtml(title)}</h1>
          ${body}
        </td></tr>
        <tr><td style="padding:14px 24px;color:#7a7268;font-size:12px;border-top:1px solid #d7ccbc">Tento e-mail posílá e-shop ${escapeHtml(store)}. Na zprávy prosím neodpovídejte, pokud není uvedeno jinak.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendMail(db: D1Database, payload: MailPayload): Promise<{ ok: boolean; error?: string }> {
  const s = await loadSettings(db);
  const from = s.mail_from || s.store_email || "ahoj@kavka.shop";
  const fromName = s.store_name || "KAVKA";
  let status = "queued";
  let error: string | null = null;

  const resendKey = s.resend_api_key || "";
  const webhook = s.mail_webhook || "";

  try {
    if (resendKey) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <${from}>`,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text || "",
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        status = "failed";
        error = t.slice(0, 500);
      } else {
        status = "sent";
      }
    } else if (webhook) {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: payload.to, subject: payload.subject, html: payload.html, kind: payload.kind }),
      });
      status = res.ok ? "sent" : "failed";
      if (!res.ok) error = `webhook ${res.status}`;
    } else {
      status = "logged";
    }
  } catch (e) {
    status = "failed";
    error = String(e);
  }

  try {
    await db
      .prepare(
        "INSERT INTO email_log (kind, recipient, subject, body_html, status, error, meta) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        payload.kind || "generic",
        payload.to,
        payload.subject,
        payload.html.slice(0, 20000),
        status,
        error,
        payload.meta || ""
      )
      .run();
  } catch (e) {
    console.error("email_log insert failed", e);
  }

  return { ok: status === "sent" || status === "logged", error: error || undefined };
}

export async function notifyOrderCreated(
  db: D1Database,
  order: {
    number: string;
    email: string;
    name: string;
    total: number;
    shipping_name: string;
    payment_name: string;
    items: { name: string; quantity: number; price: number }[];
  }
) {
  const s = await loadSettings(db);
  const store = s.store_name || "KAVKA";
  const origin = s.store_url || "";
  const rows = order.items
    .map((it) => `<tr><td>${escapeHtml(it.name)}</td><td>${it.quantity}×</td><td>${it.price * it.quantity} Kč</td></tr>`)
    .join("");
  const link = origin ? `${origin}/objednavka/${order.number}` : `/objednavka/${order.number}`;
  const html = wrapMail(
    store,
    `Objednávka ${order.number} je přijatá`,
    `<p>Dobrý den, ${escapeHtml(order.name)},</p>
     <p>děkujeme za nákup v ateliéru ${escapeHtml(store)}. Objednávku jsme přijali a ozveme se, až ji zabalíme.</p>
     <table width="100%" cellpadding="6" style="border-collapse:collapse;font-size:14px">${rows}</table>
     <p><b>Celkem ${order.total} Kč</b><br/>Doprava: ${escapeHtml(order.shipping_name)}<br/>Platba: ${escapeHtml(order.payment_name)}</p>
     <p><a href="${escapeHtml(link)}">Sledovat objednávku</a></p>`
  );
  await sendMail(db, {
    to: order.email,
    subject: `${store}: objednávka ${order.number}`,
    html,
    kind: "order_created",
    meta: order.number,
  });
  const admin = s.store_email;
  if (admin && admin.toLowerCase() !== order.email.toLowerCase()) {
    await sendMail(db, {
      to: admin,
      subject: `${store}: nová objednávka ${order.number} (${order.total} Kč)`,
      html,
      kind: "order_admin",
      meta: order.number,
    });
  }
}

export async function notifyOrderStatus(
  db: D1Database,
  order: { number: string; email: string; name: string; status: string; tracking_number?: string | null; tracking_url?: string | null }
) {
  const s = await loadSettings(db);
  const store = s.store_name || "KAVKA";
  const labels: Record<string, string> = {
    paid: "platba došla",
    processing: "balíme",
    shipped: "zásilka je na cestě",
    delivered: "zásilka je doručená",
    cancelled: "objednávka je stornovaná",
  };
  const label = labels[order.status] || order.status;
  const track = order.tracking_number
    ? `<p>Sledovací číslo: <b>${escapeHtml(order.tracking_number)}</b>${
        order.tracking_url ? `<br/><a href="${escapeHtml(order.tracking_url)}">Sledovat u dopravce</a>` : ""
      }</p>`
    : "";
  const html = wrapMail(
    store,
    `Objednávka ${order.number}: ${label}`,
    `<p>Dobrý den, ${escapeHtml(order.name)},</p>
     <p>stav vaší objednávky <b>${escapeHtml(order.number)}</b> je teď: <b>${escapeHtml(label)}</b>.</p>
     ${track}`
  );
  await sendMail(db, {
    to: order.email,
    subject: `${store}: ${order.number} — ${label}`,
    html,
    kind: "order_status",
    meta: `${order.number}:${order.status}`,
  });
}

export async function notifyBackInStock(
  db: D1Database,
  product: { id: number; name: string; slug: string },
  emails: string[]
) {
  const s = await loadSettings(db);
  const store = s.store_name || "KAVKA";
  const origin = s.store_url || "";
  const url = origin ? `${origin}/produkt/${product.slug}` : `/produkt/${product.slug}`;
  for (const to of emails) {
    const html = wrapMail(
      store,
      `${product.name} je znovu skladem`,
      `<p>Hlídali jste si ${escapeHtml(product.name)} — právě je znovu na polici.</p>
       <p><a href="${escapeHtml(url)}">Otevřít produkt</a></p>`
    );
    await sendMail(db, {
      to,
      subject: `${store}: ${product.name} je znovu skladem`,
      html,
      kind: "back_in_stock",
      meta: String(product.id),
    });
  }
}

export async function notifyAbandonedCart(
  db: D1Database,
  to: string,
  coupon: string
) {
  const s = await loadSettings(db);
  const store = s.store_name || "KAVKA";
  const origin = s.store_url || "";
  const html = wrapMail(
    store,
    "Košík na vás ještě čeká",
    `<p>Nechali jste v košíku zboží. Když nákup dokončíte, máte slevu <b>5 %</b> s kódem <b>${escapeHtml(coupon)}</b>.</p>
     <p><a href="${escapeHtml(origin ? `${origin}/kosik` : "/kosik")}">Vrátit se do košíku</a></p>`
  );
  await sendMail(db, { to, subject: `${store}: 5 % na dokončení nákupu`, html, kind: "abandoned_cart", meta: coupon });
}
