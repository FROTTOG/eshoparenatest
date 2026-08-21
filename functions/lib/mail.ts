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

/**
 * Odkaz na obnovu zapomenutého hesla. Odkaz platí 60 minut a dá se použít
 * jen jednou (viz tabulka `password_resets`).
 */
export async function notifyPasswordReset(
  db: D1Database,
  to: string,
  name: string,
  resetUrl: string,
  env?: MailEnv
) {
  const s = await loadSettings(db);
  const store = s.store_name || "KAVKA";
  const html = wrapMail(
    store,
    "Obnova hesla",
    `<p>Dobrý den${name ? ` ${escapeHtml(name)}` : ""},</p>
     <p>někdo (snad vy) požádal o obnovu hesla k účtu <b>${escapeHtml(to)}</b>. Nové heslo si nastavíte tímto odkazem:</p>
     <p style="margin:22px 0">
       <a href="${escapeHtml(resetUrl)}" style="background:#24352c;color:#fffdf8;text-decoration:none;padding:12px 22px;border-radius:999px;display:inline-block">Nastavit nové heslo</a>
     </p>
     <p style="font-size:13px;color:#6d655b">Odkaz platí 60 minut a lze ho použít jen jednou. Pokud jste o obnovu nežádali, nemusíte nic dělat — heslo zůstává beze změny.</p>
     <p style="font-size:12px;color:#8a8177;word-break:break-all">${escapeHtml(resetUrl)}</p>`
  );
  return sendMail(db, { to, subject: `${store}: obnova hesla`, html, kind: "password_reset" }, env);
}

/** Dárkový poukaz zakoupený v e-shopu — kód a platnost pro obdarovaného. */
export async function notifyGiftVoucher(
  db: D1Database,
  voucher: {
    code: string;
    amount: number;
    to: string;
    recipient_name?: string;
    message?: string;
    valid_to?: string | null;
    order_number?: string;
  },
  env?: MailEnv
) {
  const s = await loadSettings(db);
  const store = s.store_name || "KAVKA";
  const origin = s.store_url || "";
  const shopUrl = origin ? `${origin}/katalog` : "/katalog";
  const html = wrapMail(
    store,
    `Dárkový poukaz na ${voucher.amount} Kč`,
    `<p>${voucher.recipient_name ? `Pro: <b>${escapeHtml(voucher.recipient_name)}</b>` : "Dobrý den,"}</p>
     ${voucher.message ? `<p style="font-style:italic;color:#4a453e">„${escapeHtml(voucher.message)}“</p>` : ""}
     <p>Tady je váš dárkový poukaz do e-shopu ${escapeHtml(store)}. Kód zadáte v košíku do políčka pro slevový kód.</p>
     <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0">
       <tr><td align="center" style="border:2px dashed #c4a574;border-radius:14px;padding:20px">
         <div style="font-size:12px;letter-spacing:.18em;color:#7a7268">HODNOTA POUKAZU</div>
         <div style="font-size:30px;font-weight:700;margin:4px 0 12px">${voucher.amount} Kč</div>
         <div style="font-size:12px;letter-spacing:.18em;color:#7a7268">KÓD</div>
         <div style="font-size:24px;letter-spacing:.14em;font-family:monospace">${escapeHtml(voucher.code)}</div>
       </td></tr>
     </table>
     ${voucher.valid_to ? `<p style="font-size:13px;color:#6d655b">Platnost do: <b>${escapeHtml(voucher.valid_to)}</b></p>` : ""}
     ${voucher.order_number ? `<p style="font-size:13px;color:#6d655b">Objednávka č. ${escapeHtml(voucher.order_number)}</p>` : ""}
     <p><a href="${escapeHtml(shopUrl)}">Vybrat zboží v e-shopu</a></p>`
  );
  return sendMail(
    db,
    { to: voucher.to, subject: `${store}: dárkový poukaz na ${voucher.amount} Kč`, html, kind: "gift_voucher", meta: voucher.code },
    env
  );
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
 * Připomínka opuštěného košíku. Fáze 1 odchází po `abandoned_stage1_hours`
 * (výchozí 2 h), fáze 2 po `abandoned_stage2_hours` (výchozí 24 h).
 * V e-mailu je i seznam zboží, které v košíku zůstalo.
 */
export async function notifyAbandonedCartStage(
  db: D1Database,
  to: string,
  stage: 1 | 2,
  env?: MailEnv,
  items: { name: string; quantity: number; price: number }[] = []
): Promise<void> {
  const s = await loadSettings(db);
  const store = s.store_name || "KAVKA";
  const origin = s.store_url || "";
  const coupon = s.exit_coupon || "STAY5";
  const cartUrl = origin ? `${origin}/kosik` : "/kosik";
  const list = items.length
    ? `<ul style="padding-left:18px;margin:12px 0">${items
        .map((i) => `<li>${escapeHtml(i.name)} — ${i.quantity}× za ${i.price * i.quantity} Kč</li>`)
        .join("")}</ul>`
    : "";
  const couponLine =
    stage === 1
      ? `<p>Kdybyste potřebovali postrčit: sleva <b>5 %</b> s kódem <b>${escapeHtml(coupon)}</b>.</p>`
      : `<p>Poslední připomenutí — sleva <b>5 %</b> s kódem <b>${escapeHtml(coupon)}</b> na vás pořád čeká.</p>`;
  const html = wrapMail(
    store,
    stage === 1 ? "Zapomněli jste košík" : "Váš košík na vás pořád čeká",
    `<p>Nechali jste u nás rozkoukané zboží — zatím vám ho držíme v košíku.</p>
     ${list}
     ${couponLine}
     <p><a href="${escapeHtml(cartUrl)}">Dokončit nákup</a></p>
     <p style="color:#7a7268;font-size:12px">Pokud jste už objednali, tento e-mail prosím ignorujte.</p>`
  );
  await sendMail(
    db,
    {
      to,
      subject: stage === 1 ? `${store}: zapomněli jste košík` : `${store}: košík na vás pořád čeká`,
      html,
      kind: "abandoned_cart",
      meta: `${coupon}|stage:${stage}`,
    },
    env
  );
}

/**
 * Projde košíky se známým e-mailem (zákazník ho zanechal v pokladně nebo
 * v opouštěcím pop-upu) a rozešle 1. / 2. připomínku podle stáří košíku.
 * Kdo mezitím objednal, e-mail nedostane. Volá se z cronu (viz README)
 * nebo ručně z administrace.
 */
export async function processAbandonedCarts(db: D1Database, env?: MailEnv): Promise<{ sent: number; checked: number }> {
  const s = await loadSettings(db);
  if (s.abandoned_enabled === "0") return { sent: 0, checked: 0 };
  const h1 = Math.max(0.25, Number(s.abandoned_stage1_hours || 2) || 2);
  const h2 = Math.max(h1 + 0.25, Number(s.abandoned_stage2_hours || 24) || 24);
  const rows =
    (
      await db
        .prepare(
          `SELECT c.id, c.email, c.updated_at, COALESCE(c.abandoned_stage, 0) AS abandoned_stage
           FROM carts c
           WHERE c.email != ''
             AND c.updated_at > datetime('now', '-7 days')
             AND EXISTS (SELECT 1 FROM cart_items ci WHERE ci.cart_id = c.id)
           ORDER BY c.updated_at ASC`
        )
        .all<{ id: string; email: string; updated_at: string; abandoned_stage: number }>()
    ).results || [];
  let sent = 0;
  for (const cart of rows) {
    const ageMs = Date.now() - new Date(cart.updated_at.replace(" ", "T") + "Z").getTime();
    const ageH = ageMs / 3_600_000;
    let stage: 1 | 2 | null = null;
    if (ageH >= h2) stage = 2;
    else if (ageH >= h1) stage = 1;
    if (!stage) continue;
    if ((cart.abandoned_stage || 0) >= stage) continue;

    // Zákazník mezitím objednal — připomínku neposíláme.
    const ordered = await db
      .prepare("SELECT 1 AS ok FROM orders WHERE email = ? AND created_at >= ? LIMIT 1")
      .bind(cart.email, cart.updated_at)
      .first();
    if (ordered) {
      await db.prepare("UPDATE carts SET abandoned_stage = 9 WHERE id = ?").bind(cart.id).run();
      continue;
    }

    const already = await db
      .prepare("SELECT COUNT(*) AS c FROM email_log WHERE kind = 'abandoned_cart' AND recipient = ? AND meta LIKE ? AND created_at > datetime('now', '-7 days')")
      .bind(cart.email, `%|stage:${stage}`)
      .first<{ c: number }>();
    if ((already?.c || 0) > 0) {
      await db.prepare("UPDATE carts SET abandoned_stage = ? WHERE id = ?").bind(stage, cart.id).run();
      continue;
    }

    const items =
      (
        await db
          .prepare(
            `SELECT p.name, ci.quantity, p.price FROM cart_items ci JOIN products p ON p.id = ci.product_id WHERE ci.cart_id = ?`
          )
          .bind(cart.id)
          .all<{ name: string; quantity: number; price: number }>()
      ).results || [];
    try {
      await notifyAbandonedCartStage(db, cart.email, stage, env, items);
      await db.prepare("UPDATE carts SET abandoned_stage = ? WHERE id = ?").bind(stage, cart.id).run();
      sent++;
    } catch (err) {
      console.error("abandoned stage mail:", err);
    }
  }
  return { sent, checked: rows.length };
}
