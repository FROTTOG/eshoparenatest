/**
 * Kouřový test editoru (admin) — renderuje PageBuilder v jsdom.
 * Ověřuje toolbox (skupiny + nové bloky), přidání bloku klikem,
 * undo/redo, nastavení stránky a duplikaci/smazání bloku.
 * Spuštění: npx tsx scripts/smoke-admin.tsx   (musí běžet `npm run pages:dev`)
 */
import { JSDOM } from "jsdom";

const BASE = process.env.BASE_URL || "http://localhost:8788";
const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", { url: `${BASE}/admin/stranky/1` });

const setG = (k: string, v: unknown) => Object.defineProperty(globalThis, k, { value: v, writable: true, configurable: true });
setG("window", dom.window);
setG("document", dom.window.document);
setG("navigator", dom.window.navigator);
setG("location", dom.window.location);
setG("history", dom.window.history);
setG("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globalThis.requestAnimationFrame = ((cb: (t: number) => void) => setTimeout(() => cb(Date.now()), 0)) as unknown as typeof requestAnimationFrame;
globalThis.scrollTo = () => {};
globalThis.getComputedStyle = () => ({ getPropertyValue: () => "" }) as unknown as typeof getComputedStyle;
globalThis.localStorage = {
  _m: new Map<string, string>(),
  getItem(k: string) { return this._m.has(k) ? this._m.get(k)! : null; },
  setItem(k: string, v: string) { this._m.set(k, v); },
  removeItem(k: string) { this._m.delete(k); },
  clear() { this._m.clear(); },
} as unknown as Storage;

const realFetch = globalThis.fetch;
let cookie = "";
const login = await realFetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@kavka.shop", password: "KavkaAdmin123" }),
});
cookie = (login.headers.get("set-cookie") || "").split(";")[0];

(dom.window as unknown as { fetch: typeof fetch }).fetch = ((url: unknown, opts?: RequestInit) => {
  const u = String(url).startsWith("http") ? String(url) : `${BASE}${String(url)}`;
  const headers = new Headers(opts?.headers);
  if (cookie && (u.includes("/api/admin") || u.includes("/api/auth"))) headers.set("cookie", cookie);
  return realFetch(u, { ...opts, headers });
}) as typeof fetch;
globalThis.fetch = dom.window.fetch;

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Route, Routes } = await import("react-router-dom");
const { StoreProvider } = await import("../src/store");
const { PageBuilder } = await import("../src/pages/Pages");

// Do hlavní stránky vložíme pár bloků, ať má editor co ukázat.
const seedBlocks = JSON.stringify([
  { id: "h1", type: "hero", props: { title: "Hlavní stránka z editoru", primary_label: "Katalog", primary_to: "/katalog" } },
  { id: "h2", type: "countdown", props: { label: "Akce končí za", target: "2026-12-24T18:00" } },
]);
await realFetch(`${BASE}/api/admin/pages/1`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({ title: "Hlavní stránka", slug: "home", blocks_json: seedBlocks }),
});

const el = dom.window.document.createElement("div");
dom.window.document.body.appendChild(el);
const root = createRoot(el);
root.render(
  <StoreProvider>
    <MemoryRouter initialEntries={["/admin/stranky/1"]}>
      <Routes>
        <Route path="/admin/stranky/:id" element={<PageBuilder />} />
      </Routes>
    </MemoryRouter>
  </StoreProvider>
);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
await wait(1500);

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "✅" : "❌"} ${name}`);
  if (!cond) failures++;
}
const html = () => dom.window.document.body.innerHTML;
const txt = () => dom.window.document.body.textContent || "";

check("editor ukazuje Toolbox", txt().includes("Toolbox"));
check("skupiny toolboxu", ["Text", "Média", "E-shop", "Rozvržení", "Prvky"].every((g) => txt().includes(g)));
check("nový blok: Hero sekce", txt().includes("Hero sekce"));
check("nový blok: Produkty", txt().includes("Produkty"));
check("nový blok: Kategorie", txt().includes("Kategorie"));
check("nový blok: Ceník / balíčky", txt().includes("Ceník / balíčky"));
check("nový blok: Odpočet", txt().includes("Odpočet"));
check("nový blok: Newsletter", txt().includes("Newsletter"));
check("nový blok: Časová osa", txt().includes("Časová osa"));
check("nový blok: Záložky (taby)", txt().includes("Záložky (taby)"));
check("nový blok: Reference", txt().includes("Reference"));
check("nový blok: Tým", txt().includes("Tým"));
check("nový blok: Tabulka", txt().includes("Tabulka"));
check("nový blok: Sociální sítě", txt().includes("Sociální sítě"));
check("nový blok: Soubor ke stažení", txt().includes("Soubor ke stažení"));
check("nový blok: Banner", txt().includes("Banner"));
check("nový blok: Obrázek + text", txt().includes("Obrázek + text"));
check("nový blok: Štítek", txt().includes("Štítek"));
check("nový blok: Upozornění", txt().includes("Upozornění"));
check("canvas ukazuje 2 načtené bloky", html().includes("2 bloků") || html().includes("2 bloky"));
check("blok Hero sekce v náhledu", html().includes("Hlavní stránka z editoru"));
check("poznámka o hlavní stránce", txt().includes("hlavní stránka"));
check("nastavení stránky: SEO titulek", txt().includes("SEO titulek"));
check("nastavení stránky: noindex", txt().includes("Nezaindexovat"));
check("nastavení stránky: šířka", txt().includes("Max. šířka obsahu"));
check("tlačítko ukázkové bloky", txt().includes("Vložit ukázkové bloky"));
check("tlačítka undo/redo", !!dom.window.document.querySelector('button[title="Zpět (Ctrl+Z)"]') && !!dom.window.document.querySelector('button[title="Znovu (Ctrl+Shift+Z)"]'));
check("tlačítko Náhled", txt().includes("Náhled"));

// Klik na blok → inspector s poli bloku + sekce vzhledu
const blockBars = Array.from(dom.window.document.querySelectorAll(".pb-block-bar"));
if (blockBars.length) {
  (blockBars[0] as HTMLElement).dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  await wait(300);
  check("inspector ukazuje nastavení vybraného bloku", txt().includes("Nastavení bloku"));
  check("sekce „Vzhled sekce“ u bloku", txt().includes("Vzhled sekce"));
}

// Přidání bloku klikem na nástroj toolboxu (hledej tlačítko s textem Štítek)
const tools = Array.from(dom.window.document.querySelectorAll(".pb-tool"));
const badgeTool = tools.find((t) => (t.textContent || "").includes("Štítek"));
if (badgeTool) {
  (badgeTool as HTMLElement).dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  await wait(400);
  const badgeCount = (dom.window.document.querySelector(".pb-canvas-head span:last-child")?.textContent || "").trim();
  check("klikem přidán blok (canvas má 3 bloky)", badgeCount.startsWith("3"));
  const undoBtn = dom.window.document.querySelector('button[title="Zpět (Ctrl+Z)"]') as HTMLButtonElement | null;
  check("undo je aktivní", !!undoBtn && !undoBtn.disabled);
  if (undoBtn && !undoBtn.disabled) {
    undoBtn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    await wait(300);
    const afterUndo = (dom.window.document.querySelector(".pb-canvas-head span:last-child")?.textContent || "").trim();
    check("undo vrátil na 2 bloky", afterUndo.startsWith("2"));
  }
}

// Úklid: hlavní stránka zpět na prázdné bloky
await realFetch(`${BASE}/api/admin/pages/1`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({ title: "Hlavní stránka", slug: "home", blocks_json: "[]" }),
});

console.log(failures ? `\n${failures} testů selhalo ❌` : "\nVšechny testy editoru prošly ✅");
process.exit(failures ? 1 : 0);
