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

export function pointTypeLabel(t: string): string {
  if (t === "zbox") return "Z-BOX";
  if (t === "branch") return "Zásilkovna";
  if (t === "balikovna") return "Balíkovna";
  return t;
}

export function spayd(iban: string, amount: number, vs: string, msg: string): string {
  const acc = iban.replace(/\s+/g, "").toUpperCase();
  const am = amount.toFixed(2);
  const message = msg.replace(/[*\n]/g, " ").slice(0, 60);
  return `SPD*1.0*ACC:${acc}*AM:${am}*CC:CZK*X-VS:${vs.replace(/\D/g, "").slice(0, 10)}*MSG:${message}`;
}
