/**
 * Kouřový test nových funkcí (2026):
 *  1) detail produktu — souhrn hodnocení, štítky, doporučené produkty,
 *  2) katalog — filtry podle štítků,
 *  3) můj účet — ikony, karty, dárkové poukazy,
 *  4) administrace — kupóny s automatickým smazáním, zákazníci, lišta a dlaždice, filtry.
 *
 * Spuštění: BASE_URL=http://127.0.0.1:3000 npx tsx scripts/smoke-features.tsx
 * (musí běžet `npm run pages:dev` nebo `wrangler pages dev dist`)
 */
import { JSDOM } from "jsdom";

const BASE = process.env.BASE_URL || "http://localhost:8788";
const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", { url: `${BASE}/` });

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
} as unknown as typeof IntersectionObserver;
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
globalThis.requestAnimationFrame = (cb: (t: number) => void) => setTimeout(() => cb(Date.now()), 0) as unknown as number;
globalThis.scrollTo = () => {};
globalThis.getComputedStyle = () => ({ getPropertyValue: () => "" }) as unknown as CSSStyleDeclaration;
globalThis.confirm = () => true;
const memStorage = () => ({
  _m: new Map<string, string>(),
  getItem(k: string) { return this._m.has(k) ? this._m.get(k) : null; },
  setItem(k: string, v: string) { this._m.set(k, v); },
  removeItem(k: string) { this._m.delete(k); },
  clear() { this._m.clear(); },
});
globalThis.sessionStorage = memStorage() as unknown as Storage;
setG("IntersectionObserver", globalThis.IntersectionObserver);
globalThis.localStorage = {
  _m: new Map<string, string>(),
  getItem(k: string) { return this._m.has(k) ? this._m.get(k) : null; },
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
  if (cookie) headers.set("cookie", cookie);
  return realFetch(u, { ...opts, headers });
}) as typeof fetch;
globalThis.fetch = dom.window.fetch;

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { MemoryRouter, Route, Routes } = await import("react-router-dom");
const { StoreProvider } = await import("../src/store");

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "✅" : "❌"} ${name}`);
  if (!cond) failures++;
}

function mount(jsx: React.ReactElement) {
  const el = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(el);
  const root = createRoot(el);
  root.render(jsx);
  return root;
}
const txt = () => dom.window.document.body.textContent || "";
const html = () => dom.window.document.body.innerHTML;
function reset(root: { unmount: () => void }) {
  root.unmount();
  dom.window.document.body.innerHTML = "";
}

/* ------------------------------------------------------------
   Příprava dat: štítek + doporučený produkt u prvního produktu
   ------------------------------------------------------------ */
const listRes = await realFetch(`${BASE}/api/admin/products`, { headers: { cookie } });
const products = (await listRes.json()) as { id: number; name: string; slug: string; sku: string; price: number }[];
const first = products[0];
const second = products[1];
await realFetch(`${BASE}/api/admin/products/${first.id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({
    name: first.name,
    slug: first.slug,
    sku: first.sku,
    price: first.price,
    active: 1,
    tags: "smoke-štítek,ruční práce",
    related_ids: [second.id],
  }),
});

/* ------------------------------------------------------------
   1) Detail produktu
   ------------------------------------------------------------ */
const { ProductPage } = await import("../src/pages/Product");
const root1 = mount(
  <StoreProvider>
    <MemoryRouter initialEntries={[`/produkt/${first.slug}`]}>
      <Routes>
        <Route path="/produkt/:slug" element={<ProductPage />} />
      </Routes>
    </MemoryRouter>
  </StoreProvider>
);
await wait(1800);
check("detail produktu: souhrn hodnocení", html().includes("rating-summary"));
check("detail produktu: pruhy hodnocení po hvězdách", html().includes("rating-bar-fill"));
check("detail produktu: nadpis Hodnocení zákazníků", txt().includes("Hodnocení zákazníků"));
check("detail produktu: štítky produktu", html().includes("product-tags") && txt().includes("smoke-štítek"));
check("detail produktu: doporučené produkty", txt().includes("Mohlo by se hodit") && txt().includes(second.name));
check("detail produktu: kompaktní mřížka doporučených", html().includes("grid-related"));
reset(root1);

/* ------------------------------------------------------------
   2) Katalog s filtry
   ------------------------------------------------------------ */
const { Catalog } = await import("../src/pages/Catalog");
const root2 = mount(
  <StoreProvider>
    <MemoryRouter initialEntries={["/katalog"]}>
      <Routes>
        <Route path="/katalog" element={<Catalog />} />
      </Routes>
    </MemoryRouter>
  </StoreProvider>
);
await wait(1600);
check("katalog: tlačítko filtrů", html().includes("tag-filters-toggle"));
check("katalog: nabídka štítků", txt().includes("smoke-štítek"));
reset(root2);

/* ------------------------------------------------------------
   3) Můj účet
   ------------------------------------------------------------ */
const { Account } = await import("../src/pages/Account");
const root3 = mount(
  <StoreProvider>
    <MemoryRouter initialEntries={["/ucet"]}>
      <Routes>
        <Route path="/ucet/*" element={<Account />} />
      </Routes>
    </MemoryRouter>
  </StoreProvider>
);
await wait(1500);
check("účet: hlavička s avatarem", html().includes("account-hero") && html().includes("account-avatar"));
check("účet: přehledové karty", html().includes("account-cards"));
check("účet: menu s ikonami", html().includes("account-nav") && html().includes("<svg"));
check("účet: sekce dárkových poukazů v menu", txt().includes("Dárkové poukazy"));
reset(root3);

/* ------------------------------------------------------------
   4) Administrace — kupóny a poukazy
   ------------------------------------------------------------ */
const { Admin } = await import("../src/pages/Admin");
const root4 = mount(
  <StoreProvider>
    <MemoryRouter initialEntries={["/admin/kupony"]}>
      <Routes>
        <Route path="/admin/*" element={<Admin />} />
      </Routes>
    </MemoryRouter>
  </StoreProvider>
);
await wait(1800);
check("admin: menu má ikony", html().includes("admin-nav-icon"));
check("admin: menu je rozdělené do skupin", txt().includes("Provoz") && txt().includes("Sortiment"));
check("kupóny: pole platnosti od/do", html().includes('type="datetime-local"'));
check("kupóny: volba automatického smazání", txt().includes("Po vypršení automaticky smazat"));
check("kupóny: záložka poukazů", txt().includes("Poukazy"));
check("kupóny: tlačítko uložit se stavem", html().includes("save-btn"));
reset(root4);

/* ------------------------------------------------------------
   5) Administrace — zákazníci
   ------------------------------------------------------------ */
const root5 = mount(
  <StoreProvider>
    <MemoryRouter initialEntries={["/admin/zakaznici"]}>
      <Routes>
        <Route path="/admin/*" element={<Admin />} />
      </Routes>
    </MemoryRouter>
  </StoreProvider>
);
await wait(1500);
check("zákazníci: tlačítko Upravit", txt().includes("Upravit"));
check("zákazníci: reset hesla", txt().includes("Reset hesla"));
check("zákazníci: nový zákazník", txt().includes("Nový zákazník"));
reset(root5);

/* ------------------------------------------------------------
   6) Administrace — lišta a dlaždice
   ------------------------------------------------------------ */
const root6 = mount(
  <StoreProvider>
    <MemoryRouter initialEntries={["/admin/lista-a-dlazdice"]}>
      <Routes>
        <Route path="/admin/*" element={<Admin />} />
      </Routes>
    </MemoryRouter>
  </StoreProvider>
);
await wait(1500);
check("lišta: přepínač zobrazení", txt().includes("Lištu zobrazovat"));
check("lišta: živý náhled", html().includes("announce-preview"));
check("dlaždice: přepínač zobrazení", txt().includes("Dlaždice zobrazovat"));
check("dlaždice: tlačítko přidat", txt().includes("Přidat dlaždici"));
reset(root6);

/* ------------------------------------------------------------
   7) Administrace — filtry a štítky
   ------------------------------------------------------------ */
const root7 = mount(
  <StoreProvider>
    <MemoryRouter initialEntries={["/admin/filtry"]}>
      <Routes>
        <Route path="/admin/*" element={<Admin />} />
      </Routes>
    </MemoryRouter>
  </StoreProvider>
);
await wait(1500);
check("filtry: výpis použitých štítků", txt().includes("Použité štítky"));
check("filtry: skupiny filtrů", txt().includes("Skupiny filtrů v katalogu"));
check("filtry: štítek ze seznamu", txt().includes("smoke-štítek"));
reset(root7);

/* ------------------------------------------------------------
   8) Administrace — carousel s náhledem
   ------------------------------------------------------------ */
const root8 = mount(
  <StoreProvider>
    <MemoryRouter initialEntries={["/admin/carousel"]}>
      <Routes>
        <Route path="/admin/*" element={<Admin />} />
      </Routes>
    </MemoryRouter>
  </StoreProvider>
);
await wait(1500);
check("carousel: tlačítko přidat slide", txt().includes("Přidat slide"));
check("carousel: tlačítko uložit se stavem", html().includes("save-btn"));
reset(root8);

/* ------------------------------------------------------------
   9) Hlavička — bez tlačítka „Nakoupit“, lišta z nastavení
   ------------------------------------------------------------ */
await realFetch(`${BASE}/api/admin/settings`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({ announce_items: JSON.stringify([{ text: "Smoke lišta *tučně*", to: "/katalog" }]) }),
});
const { Layout } = await import("../src/components/Layout");
const root9 = mount(
  <StoreProvider>
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Layout />} />
      </Routes>
    </MemoryRouter>
  </StoreProvider>
);
await wait(1500);
const headerHtml = dom.window.document.querySelector(".header")?.innerHTML || "";
check("hlavička: tlačítko „Nakoupit“ je pryč", !headerHtml.includes("Nakoupit"));
check("lišta: text z administrace", txt().includes("Smoke lišta"));
check("lišta: zvýraznění hvězdičkami", html().includes("<b>tučně</b>"));
reset(root9);
await realFetch(`${BASE}/api/admin/settings`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({ announce_items: "" }),
});

/* ------------------------------------------------------------
   Úklid: štítky u testovacího produktu vrátíme zpět
   ------------------------------------------------------------ */
await realFetch(`${BASE}/api/admin/products/${first.id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json", cookie },
  body: JSON.stringify({ name: first.name, slug: first.slug, sku: first.sku, price: first.price, active: 1, tags: "", related_ids: [] }),
});

console.log(failures ? `\n${failures} testů selhalo ❌` : "\nVšechny testy nových funkcí prošly ✅");
process.exit(failures ? 1 : 0);
