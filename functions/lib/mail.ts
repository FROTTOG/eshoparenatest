import { loadSettings } from "./invoices";

export type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  kind?: string;
  meta?: string;
};

/**
 * Volitelné prostředí pro odesílání e-mailů.
 * Klíč i odesílatele lze nastavit dvěma způsoby:
 *  1. v databázi (Nastavení → resend_api_key / mail_from), nebo
 *  2. jako Cloudflare secret / proměnnou (RESEND_API_KEY / MAIL_FROM) —
 *     to je vhodné hlavně pro klíč, aby neležel v D1.
 * Prioritu má hodnota z databáze.
 */
export type MailEnv = {
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
};

export type MailStatus = {
  ok: boolean;
  status: string; // sent | logged | failed | skipped
  error?: string;
  hint?: string;
  usedKeySource?: "settings" | "env" | "none";
  from?: string;
};

function escapeHtml(s: string): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Název odesílatele zbavíme znaků, které Resend odmítá v "Name <email>". */
function safeFromName(name: string): string {
  return String(name || "")
    .replace(/[<>()",;:]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
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

/**
 * Srozumitelná nápověda (česky) podle odpovědi Resendu.
 * Časté příčiny nefunkčního odesílání:
 *  - 401: klíč neexistuje / je špatně zkopírovaný,
 *  - 403 / 422 s „domain“: odesílatel není z ověřené domény,
 *  - 429: překročený limit,
 *  - „not verified“: doména zatím neprošla ověřením v Resend.
 */
export function resendHint(status: number, bodyText: string, from: string): string {
  const t = (bodyText || "").toLowerCase();
  const snippet = (bodyText || "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (status === 401 || (status === 403 && t.includes("key"))) {
    return "Resend hlásí neplatný API klíč. Zkontrolujte, že je klíč zkopírovaný celý (bez mezer a koncových znaků) a že ho máte uložený v Nastavení e-shopu (nebo jako Cloudflare secret RESEND_API_KEY).";
  }
  if (status === 403 || status === 422 || status === 404) {
    if (t.includes("domain") || t.includes("from")) {
      return `Resend odmítl odesílatele „${from}“. Doména za @ musí být v účtu Resend OVĚŘENÁ (Resend → Domains → pošlete jim DNS záznam). Dokud není ověřená, Resend e-maily neodešle.`;
    }
    if (t.includes("not verified") || t.includes("unverified")) {
      return "Resend hlásí, že doména odesílatele není ověřená. Ověřte ji v Resend (Domains) a nastavte mail_from na ověřenou doménu.";
    }
  }
  if (status === 429) {
    return "Resend hlásí překročený limit odesílání (429). Počkejte chvíli a zkuste to znovu, nebo zvyšte limit v účtu Resend.";
  }
  if (status >= 500) {
    return "Resend má dočasnou chybu (5xx). Zkuste odeslání za chvíli znovu.";
  }
  const msg = snippet ? ` — ${snippet}` : "";
  return `Resend odpověděl chybou HTTP ${status}${msg}`;
}

/** Vrátí klíč a odesílatele podle priority databáze → prostředí. */
export function resolveMailConfig(
  s: Record<string, string>,
  env?: MailEnv
): { key: string; keySource: "settings" | "env" | "none"; from: string; fromName: string } {
  const fromDb = String(s.resend_api_key || "").trim();
  const fromEnv = String(env?.RESEND_API_KEY || "").trim();
  const key = fromDb || fromEnv;
  const keySource: "settings" | "env" | "none" = fromDb ? "settings" : fromEnv ? "env" : "none";
  const from = String(s.mail_from || s.store_email || env?.MAIL_FROM || "ahoj@kavka.shop").trim();
  const fromName = safeFromName(s.store_name || "KAVKA");
  return { key, keySource, from, fromName };
}

export async function sendMail(
  db: D1Database,
  payload: MailPayload,
  env?: MailEnv
): Promise<MailStatus> {
  const s = await loadSettings(db);
  const { key, keySource, from, fromName } = resolveMailConfig(s, env);
  const webhook = String(s.mail_webhook || "").trim();
  let status = "queued";
  let error: string | null = null;
  let hint: string | undefined;

  try {
    if (key) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
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
        error = `${res.status}: ${t.slice(0, 500)}`;
        hint = resendHint(res.status, t, from);
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
      if (!res.ok) {
        error = `webhook ${res.status}`;
        hint = "Záložní webhook odpověděl chybou — zkontrolujte adresu webhooku.";
      }
    } else {
      status = "logged";
      hint = "Není nastavený Resend API klíč (ani v nastavení e-shopu, ani jako Cloudflare secret RESEND_API_KEY). E-mail se pouze uložil do přehledu — nic se neodeslalo.";
    }
  } catch (e) {
    status = "failed";
    error = String(e);
    hint = "Spojení se službou Resend selhalo. Zkontrolujte, že je z e-shopu dostupný internet (fetch na api.resend.com).";
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

  return { ok: status === "sent" || status === "logged", status, error: error || undefined, hint, usedKeySource: keySource, from };
}

/** Testovací e-mail — pomáhá zjistit, proč odesílání nefunguje. */
export async function sendTestMail(db: D1Database, to: string, env?: MailEnv): Promise<MailStatus> {
  const s = await loadSettings(db);
  const store = s.store_name || "KAVKA";
  const now = new Date().toLocaleString("cs-CZ");
  const html = wrapMail(
    store,
    "Testovací e-mail",
    `<p>Dobrý den,</p>
     <p>toto je zkušební e-mail z e-shopu <b>${escapeHtml(store)}</b>. Pokud ho vidíte, e-mailové odesílání funguje správně.</p>
     <p>Odesláno: <b>${escapeHtml(now)}</b></p>`
  );
  return sendMail(
    db,
    { to, subject: `${store}: testovací e-mail (${now})`, html, kind: "test", meta: "manual" },
    env
  );
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
  },
  env?: MailEnv
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
  await sendMail(
    db,
    {
      to: order.email,
      subject: `${store}: objednávka ${order.number}`,
      html,
      kind: "order_created",
      meta: order.number,
    },
    env
  );
  const admin = s.store_email;
  if (admin && admin.toLowerCase() !== order.email.toLowerCase()) {
    await sendMail(
      db,
      {
        to: admin,
        subject: `${store}: nová objednávka ${order.number} (${order.total} Kč)`,
        html,
        kind: "order_admin",
        meta: order.number,
      },
      env
    );
  }
}

export async function notifyOrderStatus(
  db: D1Database,
  order: { number: string; email: string; name: string; status: string; tracking_number?: string | null; tracking_url?: string | null },
  env?: MailEnv
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
  await sendMail(
    db,
    {
      to: order.email,
      subject: `${store}: ${order.number} — ${label}`,
      html,
      kind: "order_status",
      meta: `${order.number}:${order.status}`,
    },
    env
  );
}

export async function notifyBackInStock(
  db: D1Database,
  product: { id: number; name: string; slug: string },
  emails: string[],
  env?: MailEnv
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
    await sendMail(
      db,
      {
        to,
        subject: `${store}: ${product.name} je znovu skladem`,
        html,
        kind: "back_in_stock",
        meta: String(product.id),
      },
      env
    );
  }
}

export async function notifyAbandonedCart(
  db: D1Database,
  to: string,
  coupon: string,
  env?: MailEnv
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
  await sendMail(
    db,
    { to, subject: `${store}: 5 % na dokončení nákupu`, html, kind: "abandoned_cart", meta: `${coupon}|stage:1` },
    env
  );
}

/**
 * 2. a 3. e-mail série opuštěného košíku (24 h a 72 h po opuštění).
 * Posílá je plánovaná úloha (cron) nebo ručně administrátor.
 */
export async function notifyAbandonedCartStage(
  db: D1Database,
  to: string,
  stage: 2 | 3,
  env?: MailEnv
): Promise<void> {
  const s = await loadSettings(db);
  const store = s.store_name || "KAVKA";
  const origin = s.store_url || "";
  const coupon = s.exit_coupon || "STAY5";
  const cartUrl = origin ? `${origin}/kosik` : "/kosik";
  const couponLine = stage === 2
    ? `<p>Sleva <b>5 %</b> s kódem <b>${escapeHtml(coupon)}</b> na vás stále čeká.</p>`
    : `<p>Poslední šance: sleva <b>5 %</b> s kódem <b>${escapeHtml(coupon)}</b> platí už jen dnes.</p>`;
  const html = wrapMail(
    store,
    stage === 2 ? "Váš košík na vás počká ještě chvíli" : "Košík vám za chvíli uteče",
    `<p>Všimli jsme si, že jste u nás nechali rozkoukané zboží — zatím vám ho držíme v košíku.</p>
     ${couponLine}
     <p><a href="${escapeHtml(cartUrl)}">Dokončit nákup</a></p>
     <p style="color:#7a7268;font-size:12px">Pokud jste už objednali, tento e-mail prosím ignorujte.</p>`
  );
  await sendMail(
    db,
    {
      to,
      subject: stage === 2 ? `${store}: košík na vás čeká` : `${store}: poslední šance na nákup`,
      html,
      kind: "abandoned_cart",
      meta: `${coupon}|stage:${stage}`,
    },
    env
  );
}

/**
 * Projde nevyřízené košíky se známým e-mailem a odešle 2./3. e-mail série
 * podle stáří košíku. Volá se z cronu (viz README) nebo z administrace.
 */
export async function processAbandonedCarts(db: D1Database, env?: MailEnv): Promise<{ sent: number }> {
  const rows =
    (
      await db
        .prepare(
          `SELECT c.id, c.email, c.updated_at
           FROM carts c
           WHERE c.email != ''
             AND c.updated_at > datetime('now', '-5 days')
             AND EXISTS (SELECT 1 FROM cart_items ci WHERE ci.cart_id = c.id)
           ORDER BY c.updated_at ASC`
        )
        .all<{ id: string; email: string; updated_at: string }>()
    ).results || [];
  let sent = 0;
  for (const cart of rows) {
    const ageMs = Date.now() - new Date(cart.updated_at.replace(" ", "T") + "Z").getTime();
    const ageH = ageMs / 3_600_000;
    let stage: 2 | 3 | null = null;
    if (ageH >= 72) stage = 3;
    else if (ageH >= 24) stage = 2;
    if (!stage) continue;
    const already = await db
      .prepare("SELECT COUNT(*) AS c FROM email_log WHERE kind = 'abandoned_cart' AND recipient = ? AND meta LIKE ?")
      .bind(cart.email, `%|stage:${stage}`)
      .first<{ c: number }>();
    if ((already?.c || 0) > 0) continue;
    try {
      await notifyAbandonedCartStage(db, cart.email, stage, env);
      sent++;
    } catch (err) {
      console.error("abandoned stage mail:", err);
    }
  }
  return { sent };
}
