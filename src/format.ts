export function czk(n: number): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(n);
}

export function dateCs(s: string): string {
  const d = new Date(s.includes("T") ? s : s.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function statusLabel(s: string): string {
  const map: Record<string, string> = {
    new: "Nová",
    paid: "Zaplacená",
    processing: "Zpracovává se",
    shipped: "Odeslaná",
    delivered: "Doručená",
    cancelled: "Stornovaná",
    pending: "Čeká na platbu",
    cod: "Na dobírku / při převzetí",
    failed: "Selhala",
    refunded: "Vrácená",
  };
  return map[s] || s;
}

export function pickupFreeOver(methods: { kind: string; free_over: number | null }[]): number | null {
  const vals = methods
    .filter((s) => s.kind.startsWith("pickup_") && s.free_over != null && s.free_over > 0)
    .map((s) => Number(s.free_over));
  return vals.length ? Math.min(...vals) : null;
}

export function cheapestPickup(methods: { kind: string; name: string; price: number }[]) {
  const pickup = methods.filter((s) => s.kind.startsWith("pickup_"));
  if (!pickup.length) return null;
  return pickup.reduce((a, b) => (a.price <= b.price ? a : b));
}

export function shippingByKind<T extends { kind: string }>(methods: T[], kind: string) {
  return methods.find((s) => s.kind === kind);
}

export function pointTypeLabel(t: string): string {
  if (t === "zbox") return "Z-BOX";
  if (t === "branch") return "Zásilkovna";
  if (t === "balikovna") return "Balíkovna";
  return t;
}

export function priceWithoutVat(priceIncVat: number, vatRate = 21): number {
  return Math.round(priceIncVat / (1 + vatRate / 100));
}

export function czkWithoutVat(n: number, vatRate = 21): string {
  return `${czk(priceWithoutVat(n, vatRate))} bez DPH`;
}

export function spayd(iban: string, amount: number, vs: string, msg: string): string {
  const acc = iban.replace(/\s+/g, "").toUpperCase();
  const am = amount.toFixed(2);
  const message = msg.replace(/[*\n]/g, " ").slice(0, 60);
  return `SPD*1.0*ACC:${acc}*AM:${am}*CC:CZK*X-VS:${vs.replace(/\D/g, "").slice(0, 10)}*MSG:${message}`;
}
