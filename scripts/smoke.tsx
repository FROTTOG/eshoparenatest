/**
 * Kouřový test editoru stránek — renderuje SPA v jsdom a ověřuje:
 * 1) hlavní stránku řízenou editorem (bloky hero + produkty),
 * 2) systémovou stránku O ateliéru s bloky z editoru,
 * 3) výchozí obsah tam, kde editor nemá bloky.
 * Spuštění: npx tsx scripts/smoke.mts   (musí běžet `npm run pages:dev`)
 */
import { JSDOM } from "jsdom";

const BASE = process.env.BASE_URL || "http://localhost:8788";
const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", { url: `${BASE}/` });

const g = globalThis as unknown as Record<string, unknown>;
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
globalThis.requestAnimationFrame = (cb: (t: number) => void) => setTimeout(() => cb(Date.now()), 0) as unknown as number;
globalThis.scrollTo = () => {};
globalThis.getComputedStyle = () => ({ getPropertyValue: () => "" }) as unknown as CSSStyleDeclaration;
globalThis.localStorage = {
  _m: new Map(),
  getItem(k: string) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k: string, v: string) { this._m.set(k, v); },
  removeItem(k: string) { this._m.delete(k); },
  clear() { this._m.clear(); },
};
// fetch s relativními URL → lokální wrangler
const realFetch = globalThis.fetch;
(dom.window as unknown as { fetch: typeof fetch }).fetch = ((url: unknown, opts?: RequestInit) =>
  realFetch(String(url).startsWith("http") ? String(url) : `${BASE}${String(url)}`, opts)) as typeof fetch;
globalThis.fetch = dom.window.fetch;

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter } = await import("react-router-dom");
const { StoreProvider } = await import("../src/store");
const { Home } = await import("../src/pages/Home");

function mount(jsx: React.ReactElement) {
  const el = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(el);
  const root = createRoot(el);
  root.render(jsx);
  return root;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "✅" : "❌"} ${name}`);
  if (!cond) failures++;
}

// Příprava: do hlavní stránky vložíme bloky přes admin API (přihlášení admina).
const login = await realFetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@kavka.shop", password: "KavkaAdmin123" }),
});
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
const homeBlocks = JSON.stringify([
  { id: "t1", type: "hero", props: { title: "Ahoj světe", img: "/hero.webp", primary_label: "Katalog", primary_to: "/katalog" } },
  { id: "t2", type: "products", props: { title: "Doporučujeme", count: 4, cols: 4 } },
]);
await realFetch(`${BASE}/api/admin/pages/1`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({ title: "Hlavní stránka", slug: "home", blocks_json: homeBlocks, meta_title: "KAVKA – domov", meta_description: "Popis test", hide_crumbs: 1 }),
});

// 1) Hlavní stránka řízená editorem
const root1 = mount(
  <StoreProvider>
    <MemoryRouter initialEntries={["/"]}>
      <Home />
    </MemoryRouter>
  </StoreProvider>
);
await wait(1500);
const html1 = dom.window.document.body.innerHTML;
check("hlavní stránka obsahuje hero blok z editoru", html1.includes("pb-hero"));
check("hlavní stránka obsahuje titulku „Ahoj světe“", html1.includes("Ahoj světe"));
check("hlavní stránka obsahuje blok produktů", html1.includes("pb-products"));
check("titulek dokumentu přepsán podle stránky (meta_title)", dom.window.document.title.includes("KAVKA – domov"));
root1.unmount();
dom.window.document.body.innerHTML = "";

// 2) Statická stránka s bloky z editoru (o-nas)
// — nejdřív ověřme, že výchozí obsah funguje (bloky nemá)
const { About } = await import("../src/pages/Static");
const root2 = mount(
  <StoreProvider>
    <MemoryRouter initialEntries={["/o-nas"]}>
      <About />
    </MemoryRouter>
  </StoreProvider>
);
await wait(1200);
const html2 = dom.window.document.body.innerHTML;
check("O ateliéru bez bloků ukazuje výchozí obsah", html2.includes("KAVKA Ateliér") && html2.includes("Vinohrad"));
root2.unmount();
dom.window.document.body.innerHTML = "";

// 3) Nyní vložíme bloky do o-nas přes API a ověříme nahrazení obsahu
const blocks = JSON.stringify([
  { id: "o1", type: "heading", props: { text: "Náš příběh z editoru", level: 1 } },
  { id: "o2", type: "alert", props: { kind: "tip", title: "Tip", text: "Navštivte nás na Vinohradech." } },
]);
const put2 = await realFetch(`${BASE}/api/admin/pages/2`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({ title: "O ateliéru KAVKA", slug: "o-nas", blocks_json: blocks, meta_title: "O nás SEO" }),
});
check("PUT stránky o-nas s bloky prošel (200)", put2.status === 200);

const root3 = mount(
  <StoreProvider>
    <MemoryRouter initialEntries={["/o-nas"]}>
      <About />
    </MemoryRouter>
  </StoreProvider>
);
await wait(1500);
const html3 = dom.window.document.body.innerHTML;
check("O ateliéru s bloky ukazuje obsah editoru", html3.includes("Náš příběh z editoru"));
check("O ateliéru s bloky ukazuje upozornění", html3.includes("pb-alert"));
check("drobenka je přítomná", html3.includes("Domů"));
check("titulek podle meta_title", dom.window.document.title.includes("O nás SEO"));
root3.unmount();

// 4) Bloky vrátíme do prázdna (úklid), ať lokální DB zůstane čistá
await realFetch(`${BASE}/api/admin/pages/2`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({ title: "O ateliéru KAVKA", slug: "o-nas", blocks_json: "[]", meta_title: "" }),
});
await realFetch(`${BASE}/api/admin/pages/1`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({ title: "Hlavní stránka", slug: "home", blocks_json: "[]", meta_title: "", hide_crumbs: 0 }),
});

console.log(failures ? `\n${failures} testů selhalo ❌` : "\nVšechny testy prošly ✅");
process.exit(failures ? 1 : 0);
