# KAVKA — možnosti vylepšení (rešerše webu, srpen 2026)

Rešerše nejlepších praxí pro e-commerce a stack Cloudflare Pages (React + Hono + D1 + R2).
Každé doporučení je porovnáno se skutečným stavem kódu v tomto repozitáři.

---

## TL;DR — kam sáhnout nejdřív

| # | Oblast | Dopad | Náročnost |
|---|---|---|---|
| 1 | **Online platba kartou / Apple Pay přes bránu** (Comgate, GOPAY, Stripe) | ★★★ (konverze) | střední |
| 2 | **Přístupnost WCAG 2.1 AA** — zákonná povinnost (EAA, zák. č. 424/2023 Sb.) | ★★★ (riziko pokuty) | střední |
| 3 | **Optimalizace pokladny** (počet polí, náklady vpředu, trust signály) | ★★★ (konverze) | nízká–střední |
| 4 | **React 19 + React Compiler + nový Vite/wrangler** | ★★ (INP, údržba) | střední |
| 5 | **SEO/AI search**: JSON-LD do HTML, doplnit pole schématu, konzistence feed↔web | ★★ (viditelnost) | nízká–střední |
| 6 | **PWA se service workerem** (instalace, offline) | ★ (retence) | střední |
| 7 | **Cachování + Smart Placement na Cloudflare, monitoring** | ★★ (rychlost, náklady) | nízká |

---

## 1. Platby — největší chybějící dílek

**Stav v projektu:** pokladna nabízí převod s QR (SPD), Apple Pay / Google Pay přes
`PaymentRequest` API (`WalletPay.tsx`), dobírku a hotovost. **Žádná skutečná platební brána** —
README to vysvětluje zadáním „nic mimo Cloudflare“. Apple/Google Pay bez brány fungují jen
v prohlížečích, které umí `PaymentRequest` (Safari), a neproběhne reálná autorizace platby.

**Data z českého trhu:**

- Platba kartou je nejpoužívanější metoda (43 % nakupujících), Apple Pay 9 %, Google Pay 8 %
  a podíl rychle roste; dobírka klesla z 14 % na 7 % [2](https://www.e15.cz/tematicke-specialy/special-trendy-v-ecommerce/zakaznici-ceskych-e-shopu-pouzivaji-stale-casteji-apple-pay-a-google-pay-1414289).
- U GoPay byla v roce 2024 už **každá pátá** online karetní platba přes Apple Pay [5](https://www.gopay.com/blog/apple-pay-vladne-online-platbam-kartou-mate-ho-na-svem-e-shopu/).
- V konkrétním českém e-shopu platí Apple/Google Pay 28 % zákazníků [3](https://blog.shoptet.cz/platebni-metody-a-platebni-brany-v-roce-2022/).

**Doporučení:**

1. **Přidejte platební bránu** (Comgate, GOPAY nebo Stripe — Comgate má nejpokročilejší integraci
   Apple/Google Pay přímo do košíku [2](https://www.e15.cz/tematicke-specialy/special-trendy-v-ecommerce/zakaznici-ceskych-e-shopu-pouzivaji-stale-casteji-apple-pay-a-google-pay-1414289)).
   Znamená to jeden externí HTTP endpoint z Workeru — architektura „Cloudflare-only“ zůstane zachovaná,
   jen se přidá volání brány.
2. **Express tlačítka (Apple Pay / Google Pay) nad ohybem stránky** na košíku i pokladně —
   Stripe uvádí až **2× vyšší konverzi** při umístění na začátku toku [2](https://growth-engines.com/insights/ecommerce/ecommerce-checkout-optimization).
3. **BNPL / odložené platby** (Skip Pay, Twisto, Klarna) pro mladší zákazníky a dražší zboží;
   e-shop dostává peníze hned, riziko nese poskytovatel [4](https://www.shopify.com/cz/blog/platebni-metody).
4. Zvážit **okamžitý bankovní převod** (Comgate/GoPay) — alternativa QR pro mobilní platby.

---

## 2. Přístupnost — povinnost od 28. 6. 2025 (EAA)

**Stav v projektu:** web používá sémantický HTML a má drobečky, ale chybí systematický audit
(labels formulářů, focus stavy, kontrast, skip-link, ovládání klávesnicí).

**Fakta:**

- **European Accessibility Act** → český zákon č. 424/2023 Sb. platí od 28. 6. 2025;
  e-shopy musí splňovat **WCAG 2.1 úroveň AA** [1](https://blog.poski.com/informace-pro-klienty/od-28-6-2025-bude-ucinny-novy-zakon-o-pristupnosti-co-to-znamena-pro-e-shopy/).
- Pokuta až **10 mil. Kč**; výjimku mají jen mikropodniky (<10 zaměstnanců a obrat <2 mil. EUR)
  [1](https://blog.poski.com/informace-pro-klienty/od-28-6-2025-bude-ucinny-novy-zakon-o-pristupnosti-co-to-znamena-pro-e-shopy/),
  [3](https://www.animato.cz/blog/eaa-2025).
- Požadavky: programově propojené labely formulářů, ovládání klávesnicí (Tab + viditelný focus),
  kontrast textu, čitelnost při 200% zvětšení, nesdělovat informace jen barvou, velké klikací prvky
  [2](https://www.peckadesign.cz/blog/eaa-pristupnost-2025),
  [4](https://www.kollertslavomir.cz/blog/eaa-zakon-o-pristupnosti-2025).
- Celý nákupní proces (výběr → platba) musí být přístupný, včetně pokladny
  [2](https://www.peckadesign.cz/blog/eaa-pristupnost-2025).

**Doporučení:**

1. Spustit audit: **Lighthouse + axe-core** (lze přidat do smoke testů jako `@axe-core/playwright`
   či jednoduchý skript), projít pokladnu, košík a admin.
2. Doplňky, které projekt z velké části postrádá:
   - viditelný **focus ring** a logické pořadí Tab,
   - **skip-link** „Přeskočit na obsah“,
   - `aria-label`/`aria-live` u toastů, modálních oken, výsledků vyhledávání,
   - kontrastní režim / kontrola barev v editoru stránek,
   - tap targety ≥ 44 px na mobilu (WCAG 2.5.5) [4](https://www.designstudiouiux.com/blog/ecommerce-checkout-ux-best-practices/).
3. Zapsat si povinnost do roadmapy: nové funkce (bloky, pokladna) rovnou „accessible by default“.

---

## 3. Pokladna a CRO — rychlé výhry s měřitelným efektem

**Stav v projektu:** pokladna funguje i bez registrace („jako host“), je zde opouštěcí pop-up
(`STAY5`), upsell v košíku a e-mail opuštěného košíku. Dobrý základ — teď jemné doladění.

**Co říkají data:**

- 26 % opuštění pokladny způsobuje **nucená registrace** → guest checkout musí být výchozí
  a viditelný, registrace nabídnutá až po nákupu [2](https://growth-engines.com/insights/ecommerce/ecommerce-checkout-optimization).
- Optimální počet polí: **7–8**; každé další pole snižuje dokončení o 4–6 %
  [2](https://growth-engines.com/insights/ecommerce/ecommerce-checkout-optimization).
  (V `Checkout.tsx` je ~21 formulářových prvků — dobrý kandidát na audit + sloučení polí.)
- Všechny náklady (doprava, platba) **před** krokem platby — 48 % opuštění kvůli překvapivým nákladům
  [4](https://www.designstudiouiux.com/blog/ecommerce-checkout-ux-best-practices/).
- Trust signály u platebních polí zvedají dokončení o **15–20 %** [1](https://shift8web.ca/ecommerce-web-design-best-practices-in-2026/).
- Každých ušetřených **0,1 s = +8,4 % konverzí** [4](https://www.designstudiouiux.com/blog/ecommerce-checkout-ux-best-practices/).
- Mobil tvoří ~70 % návštěv, ale konverze mobilu bývá **o 40–60 % nižší** než desktopu
  [3](https://growth-engines.com/insights/ecommerce/ecommerce-conversion-rate-optimization-15-proven-strategies-for-the-future).
- E-mailová série opuštěného košíku (3 e-maily) vrací **3,3–7,7 %** relací [4](https://www.designstudiouiux.com/blog/ecommerce-checkout-ux-best-practices/).

**Doporučení (seřazeno podle návratnosti):**

1. **Jednosloupcová pokladna s progress indikátorem** a sticky CTA na mobilu
   [5](https://www.fullsession.io/blog/ecommerce-ux/).
2. **Autocomplete adres** (`autocomplete` atributy na formulářích) — méně psaní na mobilu
   [5](https://www.fullsession.io/blog/ecommerce-ux/).
3. Validace polí **inline v reálném čase** (−22 % chyb, +31 % spokojenost)
   [4](https://www.designstudiouiux.com/blog/ecommerce-checkout-ux-best-practices/).
4. Trust signály u platebních metod + odkaz na reklamační řád u CTA.
5. **Progress bar dopravy zdarma** v košíku („ještě 250 Kč a máte dopravu zdarma“).
6. Pole pro slevový kupón **nezobrazovat vpředu** (nenabádat k opuštění toku kvůli hledání kódu)
   [4](https://www.designstudiouiux.com/blog/ecommerce-checkout-ux-best-practices/).
7. **One-click upsell po objednávce** (bez znovuzadávání karty) na potvrzovací stránce
   [2](https://growth-engines.com/insights/ecommerce/ecommerce-checkout-optimization).
8. Rozšířit e-mail opuštěného košíku na **sérii 3 e-mailů** (projekt zatím posílá jeden).
9. **Heatmapy / session replay** (FullSession, Hotjar) na 3 nejnavštěvovanější stránky
   [5](https://www.fullsession.io/blog/ecommerce-ux/).

---

## 4. Výkon — Core Web Vitals a Cloudflare

**Stav v projektu:** WebP varianty obrázků, preload hero obrázku, `fetchpriority="high"`,
code-splitting (react/qr/admin chunks), cachovací hlavičky, stale-while-revalidate u produktů.
Chybí: edge cachování HTML/API, smart placement, KV vrstva, monitoring.

**Doporučení:**

1. **React 19 + React Compiler.** Projekt je na Reactu 18.3; aktuální je 19.2.x.
   Compiler automaticky memoizuje a Meta reportuje **až 12 % rychlejší načtení a ~2,5× rychlejší
   interakce** na reálném obchodě [1](https://scrimba.com/articles/react-19-whats-new-for-developers/).
   INP je přitom **nejčastěji neúspěšná metrika CWV v roce 2026**
   [3](https://www.digitalapplied.com/blog/ecommerce-product-page-seo-2026-optimization-playbook).
   Compiler funguje i s Reactem 18 (s `react-compiler-runtime`) — lze nasadit postupně
   [1](https://scrimba.com/articles/react-19-whats-new-for-developers/).
2. **Aktualizace závislostí** (dnes vs. nejnovější):
   - react/react-dom `18.3 → 19.2.8`, vite `6.2 → 8.2`, `@vitejs/plugin-react` `4.3 → 6.1`,
   - wrangler `4.7 → 4.125`, hono `4.7 → 4.13`, typescript `5.8 → 5.9+` (na 7.x počkat, je čerstvý).
   - Verze **připnout přesně** (compiler se mění s patch verzemi — viz doporučení výše).
3. **Smart Placement** — `[placement] mode = "smart"` ve `wrangler.toml`; Worker poběží blíž D1,
   nižší latence dotazů [3](https://www.reddit.com/r/CloudFlare/comments/1q0h8cv/d1_hitting_5m_daily_limit_despite_30day_cache/).
4. **Vrstvená cache** Memory → KV → D1 pro drahé dotazy (katalog, home) — snižuje čtení D1 řádově
   [3](https://www.reddit.com/r/CloudFlare/comments/1q0h8cv/d1_hitting_5m_daily_limit_despite_30day_cache/).
   Cloudflare Cache API nově podporuje **cacheTag** — po změně produktu smazat jen tag
   `product-1234` místo celé cache [1](https://blog.blazingcdn.com/en-us/cloudflare-site-speed-optimization-workers-apo-image-resizing).
5. **Edge cachování veřejných API odpovědí** (`/api/products`, `/api/catalog`) přes Cache API
   s `stale-while-revalidate` — žádné cizí volání, vše zůstává na Cloudflare.
6. **Obrázky**: zvážit **AVIF** (Cloudflare Image Resizing umí automatický AVIF; úspora až
   o desítky % proti WebP) a **srcset** s více velikostmi pro mobile-first [1](https://blog.blazingcdn.com/en-us/cloudflare-site-speed-optimization-workers-apo-image-resizing),
   [3](https://www.digitalapplied.com/blog/ecommerce-product-page-seo-2026-optimization-playbook).
7. **Nahrávání fotek rovnou do R2** (presigned URL) místo proxy přes Worker — Worker má limit
   128 MB paměti a upload 8 MB fotky přes něj zbytečně zatěžuje CPU [4](https://ashutoshkumars1ngh.medium.com/how-cloudflare-workers-actually-work-74af53520040).
8. **D1 Sessions API** (bookmarks) pro read-after-write konzistenci u objednávek — D1 read repliky
   jsou asynchronní [5](https://web-alert.io/blog/cloudflare-workers-d1-r2-kv-monitoring-edge-guide).

---

## 5. SEO a AI vyhledávání 2026

**Stav v projektu:** výborný základ — JSON-LD `Product` + `Offer` + `AggregateRating` +
`BreadcrumbList` v `Product.tsx`, sitemap, robots.txt, XML feedy Heureka / Zboží.cz /
Google Shopping, SEO pole u stránek.

**Mezery a doporučení:**

1. **JSON-LD do prvotního HTML.** Google doporučuje schéma v initial HTML, ne vkládané
   JavaScriptem — data jako cena/dostupnost se rychle mění a JS injekce snižuje spolehlivost
   crawlerů [3](https://www.digitalapplied.com/blog/ecommerce-product-page-seo-2026-optimization-playbook).
   Prakticky: generovat JSON-LD na Workeru a vložit do HTML, nebo vykreslovat SSR/prerender.
2. **Rozšířit schéma Product** o doporučená pole: `sku`, `gtin` (pokud existuje),
   `MerchantReturnPolicy` + `shippingDetails` v Offer (eligibilita pro merchant listings),
   `review` entity [3](https://www.digitalapplied.com/blog/ecommerce-product-page-seo-2026-optimization-playbook).
3. **Konzistence schéma ↔ feed ↔ stránka.** AI nákupní agenti (ChatGPT shopping, Perplexity)
   křížově porovnávají data; rozpor v ceně/dostupnosti = vyřazení. Dnes se cena v JSON-LD generuje
   z DB při hydrataci, feedy z DB — stačí průběžně kontrolovat shodu [2](https://witscode.com/guides/d2c-ecommerce-seo).
4. **OpenAI Product Feed** pro ChatGPT shopping jako další feed vedle Heureky
   [2](https://witscode.com/guides/d2c-ecommerce-seo).
5. **Graf entit** — `Organization` (s `@id`), `WebSite` + `SearchAction`, `LocalBusiness` pro
   výdejní místo; propojení přes `@id` zlepšuje extrakci v AI vyhledávání (Bing Copilot, AI
   Overviews) [5](https://searchengineland.com/schema-markup-ai-search-no-hype-472339).
6. **Sitemap**: doplnit `lastmod` a obrázky (`image:image`), případně rozdělit na dílčí sitemapy
   (katalog/produkty/stránky) kvůli crawl budgetu.
7. **Filtry v katalogu** (`useSearchParams`) mohou tvořit crawl past — 40 % crawl budgetu; řešení:
   filtry přes JS bez URL parametrů, `rel=canonical` na základní URL, nebo `X-Robots-Tag:
   noindex, follow` pro filtrované kombinace [3](https://www.digitalapplied.com/blog/ecommerce-product-page-seo-2026-optimization-playbook).
8. **FAQ bloky na detailu produktu** — napájí People Also Ask i AI odpovědi
   [3](https://www.digitalapplied.com/blog/ecommerce-product-page-seo-2026-optimization-playbook).
9. **Heureka Ověřeno zákazníky** — zpětná vazba z reálných nákupů + hvězdičky ve výsledcích
   (projekt má vlastní hodnocení; Ověřeno zákazníky je důvěryhodnější pro CTR).

---

## 6. PWA — projekt je „ready“, ale bez service workeru

**Stav:** `manifest.webmanifest` + favicon existují, ale v `public/` **není service worker**
→ aplikace se nenainstaluje, nefunguje offline, neumí push notifikace.

**Doporučení:**

1. Service worker s cache-first strategií pro statické assety (js/css/obrázky) a offline
   fallback stránku.
2. Push notifikace: **hlídací pes** (naskladnění) a změny stavu objednávky — velká přidaná
   hodnota oproti e-mailu.
3. Badge/install prompt (s ohledem na UX — nenutit).

---

## 7. Provoz, monitoring a bezpečnost

1. **Cloudflare Analytics Engine / Tail Workers**: logovat každou trasu API (latence p50/p95,
   chybovost, pomalé D1 dotazy) + alerty — dnes projekt nemá žádné aplikační metriky
   [5](https://web-alert.io/blog/cloudflare-workers-d1-r2-kv-monitoring-edge-guide).
2. **Cron triggery**: předgenerování feedů a sitemapy do KV/R2 (dnes se generují na požadavek),
   warm-up cache po nasazení [3](https://www.reddit.com/r/CloudFlare/comments/1q0h8cv/d1_hitting_5m_daily_limit_despite_30day_cache/).
3. **Zálohování D1** (Cloudflare D1 export / snapshot do R2) — RPO dnes ~0.
4. Rate limiting / brute-force ochrana přihlášení (PBKDF2 je dobrý základ; chybí zpomalení
   pokusů o heslo a 2FA pro admina).
5. `Content-Security-Policy` — v `_headers` je nosniff, X-Frame-Options, COOP, ale **CSP chybí**
   (důležité, pokud se přidá platební brána a cizí skripty).

---

## 8. Navrhovaný plán

| Fáze | Úkoly | Týdny |
|---|---|---|
| **Quick wins** | audit přístupnosti + focus/skip-link/labels; inline validace + autocomplete v pokladně; trust signály; sitemap `lastmod`; canonicály filtrů; CSP; `[placement] smart` | 1–2 |
| **Konverzní balík** | platební brána (karta + Apple/Google Pay), express tlačítka nad ohybem, série e-mailů opuštěného košíku, progress bar dopravy zdarma | 2–4 |
| **Výkon** | React 19 + Compiler, update závislostí, Cache API + cacheTag, vrstva KV, AVIF/srcset, R2 presigned upload | 2–4 |
| **Viditelnost** | JSON-LD do HTML + rozšířená pole, OpenAI feed, graf entit (Organization/WebSite), Ověřeno zákazníky | 1–2 |
| **Retence** | service worker + offline, push notifikace hlídacího psa | 2–3 |

---

*Zdroje: viz odkazy v textu (Shift8 Web, Growth Engines, DesignStudio UI/UX, FullSession,
BlazingCDN, Cloudflare komunita/dokumentace, Scrimba, blog Poski.com, Peckadesign, Animato,
Kollert Slavomír, JTC Solutions, Digital Applied, Witscode, Search Engine Land, e15.cz, GoPay,
Shoptet, Shopify CZ, Živě.cz).*

---

## Doplněno v této iteraci (srpen 2026)

| Funkce | Kde to najdete | Poznámka |
|---|---|---|
| **Strukturovaná data (Schema.org) navíc** | `functions/_middleware.ts` | Product + Offer s `AggregateRating` a `priceValidUntil`, BreadcrumbList u produktu, kategorie i článku, `CollectionPage` u katalogu, `BlogPosting` u článku — vše už v prvotním HTML, takže Google zobrazí cenu, hvězdičky i dostupnost. |
| **Magazín / blog** | `/magazin`, administrace → Magazín | Tabulka `posts`, veřejné API `/api/posts`, admin CRUD, články v `sitemap.xml`. |
| **Velkoobchodní režim (B2B)** | Zákazníci → skupina, produkt → VO cena | `users.customer_group`, `products.price_b2b`, `functions/lib/pricing.ts`. Zákazník vidí ceny bez DPH, e-shop uvnitř dál počítá s cenou s DPH (fakturace beze změny). |
| **Opuštěné košíky po 2 h / 24 h** | `functions/lib/mail.ts`, pokladna | E-mail z pokladny se ukládá ke košíku (`POST /api/cart/email`), série se hlídá sloupcem `carts.abandoned_stage` a kdo mezitím objednal, e-mail nedostane. |
| **Hromadné úpravy + CSV** | Administrace → Produkty | `functions/lib/bulk.ts`: ceny, VO ceny, sklad, kategorie, viditelnost, mazání; export i import CSV (středník, BOM). |
| **Dynamické OG obrázky** | `/og/produkt/<slug>.svg` | `functions/og/[[path]].ts` skládá náhled z fotky, názvu, ceny a hvězdiček. Vypínač `og_dynamic`. |
| **Hromadný tisk faktur a štítků** | Administrace → Objednávky | `functions/lib/print.ts` → `/api/admin/print?ids=…&what=both`, jeden dokument, tiskový dialog → Uložit jako PDF. Doplněny i chybějící endpointy pro štítky jednotlivých objednávek. |
| **Hodnocení jen po nákupu** | Detail produktu | API vrací `can_review` / `has_review`, formulář se ukáže jen s ověřeným nákupem (server kontroluje znovu). |
| **Košík a pokladna — vzhled** | `src/styles.css` | Položky košíku jsou karty (dřív jen spodní linka a přetékající hover), v pokladně mají sekce jednotné rozestupy, popisky pod sebou a čísla zarovnaná doprava. |
