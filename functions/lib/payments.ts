/**
 * Platební brána Comgate (https://payments.comgate.cz) — karta online,
 * Apple Pay a Google Pay přes bránu.
 *
 * Tok:
 *  1. `comgateCreate` — vytvoření platby server-to-server (prepareOnly=true).
 *     Odpověď obsahuje transId a redirect URL na platební stránku.
 *  2. Zákazník se po zaplacení vrátí na /api/payments/return (URL se
 *     konfigurují v portálu Comgate, podporují zástupné ${id} a ${refId}).
 *  3. O výsledku vždy rozhoduje `comgateStatus` (server-to-server ověření) —
 *     callback od brány jen spustí kontrolu, nikdy mu nevěříme naslepo.
 *
 * Poznámka k provozu: background vytváření platby (prepareOnly=true) vyžaduje
 * v portálu Comgate povolenou IP adresu e-shopu (Cloudflare Workers → statické
 * egress IP adresy, viz README). Bez nastavené brány zůstává metoda „karta
 * online“ neaktivní a pokladna se chová jako dosud.
 */

const COMGATE_URL = "https://payments.comgate.cz/v1.0";

export type ComgateSettings = {
  merchant?: string;
  secret?: string;
  test?: boolean;
};

export type CreateResult = {
  ok: boolean;
  error?: string;
  transId?: string;
  redirect?: string;
};

export type StatusResult = {
  ok: boolean;
  error?: string;
  state?: string; // PENDING | PAID | CANCELLED | AUTHORIZED
  paid: boolean;
};

export async function comgateCreate(
  settings: ComgateSettings,
  order: { number: string; email: string; total: number; name: string }
): Promise<CreateResult> {
  const merchant = String(settings.merchant || "").trim();
  if (!merchant) return { ok: false, error: "Platební brána není nastavená (chybí comgate_merchant)." };

  const params: Record<string, string> = {
    merchant,
    test: settings.test ? "true" : "false",
    country: "CZ",
    price: String(order.total * 100), // haléře
    curr: "CZK",
    label: `${order.number}`.slice(0, 16),
    refId: order.number,
    method: "CARD_ALL",
    email: order.email,
    name: order.name.slice(0, 48),
    prepareOnly: "true",
  };
  if (settings.secret) params.secret = settings.secret;

  try {
    const res = await fetch(`${COMGATE_URL}/create`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" },
      body: new URLSearchParams(params).toString(),
    });
    const text = await res.text();
    const data = new URLSearchParams(text);
    const code = data.get("code") || "";
    const message = data.get("message") || "";
    if (code !== "0") {
      return { ok: false, error: `Brána odmítla platbu: ${message || code}` };
    }
    const transId = data.get("transId") || "";
    const redirect = data.get("redirect") || "";
    if (!transId) return { ok: false, error: "Brána nevrátila identifikátor transakce." };
    return { ok: true, transId, redirect };
  } catch (e) {
    return { ok: false, error: `Spojení s platební bránou selhalo (${String(e).slice(0, 120)}).` };
  }
}

export async function comgateStatus(settings: ComgateSettings, transId: string): Promise<StatusResult> {
  const merchant = String(settings.merchant || "").trim();
  const secret = String(settings.secret || "").trim();
  if (!merchant || !secret) return { ok: false, error: "Platební brána není kompletně nastavená.", paid: false };

  try {
    const res = await fetch(`${COMGATE_URL}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" },
      body: new URLSearchParams({
        merchant,
        secret,
        transId,
        test: settings.test ? "true" : "false",
      }).toString(),
    });
    const text = await res.text();
    const data = new URLSearchParams(text);
    const code = data.get("code") || "";
    const message = data.get("message") || "";
    const state = (data.get("state") || "").toUpperCase();
    if (code !== "0") return { ok: false, error: `Brána nevrátila stav (${message || code}).`, paid: false };
    return { ok: true, state, paid: state === "PAID" };
  } catch {
    return { ok: false, error: "Spojení s platební bránou selhalo.", paid: false };
  }
}
