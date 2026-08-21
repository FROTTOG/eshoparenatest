# KAVKA Ateliér — funkční demo e-shopu

Český e-shop ateliéru (keramika, len, dřevo). Běží **jen na Cloudflare**:

| Co | Kde to žije | K čemu |
|---|---|---|
| Web + administrace | **Cloudflare Pages** | stránky, košík, pokladna, admin |
| Data | **D1** (SQL) | zákazníci, produkty, objednávky, kupóny, výdejní místa |
| Fotky z administrace | **R2** (soubory) | nahrané obrázky produktů |
| Přihlášení | cookie + D1 | žádný Auth0, žádný Firebase |

Žádný Vercel, žádný Stripe, žádný cizí hosting. Výdejní místo na pokladně vybíráte v **oficiální mapě Packety (Zásilkovna / Z-BOX)** a **mapě České pošty (Balíkovna)**. Když se widget nenačte, zbývá záložní mapa z D1.

---

## Co umí

**Zákazník**

- katalog, hledání, kategorie, detail produktu
- registrace / přihlášení, profil, uložené adresy
- košík, kupóny (`KAVKA10`, `VITEJ150`, `LEN20`)
- **naposledy zhlédnuté produkty** — proužek historie prohlížení na detailu zboží (uloženo v localStorage)
- instalovatelnost jako aplikace — web manifest + apple-touch ikona (PWA-ready)
- pokladna i jako host
- doprava: **Z-BOX** a **Zásilkovna** (živý widget Packety), **Balíkovna** (iframe mapa České pošty), **na adresu**, **osobní odběr**
- platba: převod s **QR (SPD)**, **Apple Pay**, **Google Pay**, **karta online přes platební bránu Comgate** (Visa/Mastercard i Apple/Google Pay přes bránu — viz níže), dobírka, karta při převzetí, hotově v ateliéru
- **PWA**: instalace do mobilu, **offline režim** (service worker), **Web Push upozornění** hlídacího psa
- **dvoufázové ověření (2FA/TOTP)** pro administrátory, ochrana přihlášení proti hádání hesla (rate limiting)
- historie objednávek, sledování podle čísla + e-mailu
- hodnocení koupeného zboží — přehledný souhrn s průměrem a rozpadem po hvězdách
- **filtrování katalogu podle štítků** (skupiny filtrů si sestaví správce)
- **dárkové poukazy** — koupí se jako zboží, kód přijde e-mailem a je i v účtu
- **obnova zapomenutého hesla** odkazem v e-mailu

**Správce** (`/admin`)

- přehled tržeb, nové objednávky, nízký sklad
- produkty, kategorie, sklady a pohyby
- objednávky (stav + označení platby; storno vrací sklad)
- zákazníci (založení, úprava účtu i hesla, smazání), kupóny s časovou platností a automatickým úklidem,
  dárkové poukazy, schvalování hodnocení
- štítky produktů, skupiny filtrů katalogu a ručně vybrané doporučené produkty
- oznamovací lišta nad hlavičkou a dlaždice na úvodní stránce (obojí s živým náhledem)
- doprava, platby, výdejní místa na mapě
- **faktury** — vystavují se automaticky ke každé objednávce (číselná řada, VS, DPH, tisk/PDF)
- **exporty do účetnictví** — iDoklad (CSV), Fakturoid (CSV), POHODA (XML dataPack), objednávky a faktury v CSV
- nastavení obchodu a IBAN
- nahrání fotek do R2
- **tisk štítků** — Česká pošta (Podání online), PPL a DPD jedním klikem z objednávky
- **XML feedy** Heureka / Zboží.cz / Google Shopping + **OpenAI (ChatGPT Shopping) feed** (JSONL.GZ na `/openai-feed.jsonl.gz`)
- **GTM, GA4 a Meta Pixel** + e-commerce události `view_item`, `add_to_cart`, `purchase`
- **JSON-LD v prvotním HTML** (Organization, WebSite se SearchAction, Product + Offer se shippingDetails a **AggregateRating**, BreadcrumbList u produktu, kategorie i článku, CollectionPage, BlogPosting) — Google tak umí ukázat cenu, hvězdičky i dostupnost přímo ve výsledcích
- **vrstvená cache** veřejných API (Cloudflare Cache API + verze cache), **AVIF** varianty obrázků, `smart placement` Workeru u D1
- **CSP hlavička**, **zálohy D1 do R2** jedním klikem, údržba logů z administrace
- **e-mailové notifikace** (objednávka, stav, hlídací pes, opuštěný košík) přes Resend
- **hlídací pes** u vyprodaného zboží — e-mailem i přes **Web Push** do prohlížeče
- **opouštěcí pop-up** se slevou 5 % (`STAY5`) a **série opuštěného košíku** — e-mail po **2 h** a po **24 h** zákazníkovi, který zanechal e-mail v pokladně (hodiny jdou nastavit, kdo mezitím objednal, e-mail nedostane)
- **velkoobchodní režim (B2B)** — zákazník ve skupině „b2b“ vidí po přihlášení velkoobchodní ceny **bez DPH** (vlastní cena u produktu nebo plošná sleva)
- **magazín / blog** — psaní článků v administraci, výpis na `/magazin`, Article + BreadcrumbList v JSON-LD, články v sitemapě
- **hromadné úpravy produktů** — zaškrtávací políčka + změna ceny/skladu/kategorie/viditelnosti, **CSV import a export**
- **hromadný tisk** — označíte objednávky a jedním klikem otevřete jeden dokument se všemi fakturami i adresními štítky (Uložit jako PDF)
- **dynamické OG obrázky** — náhled sdíleného odkazu se vygeneruje s fotkou, názvem a cenou (`/og/produkt/<slug>.svg`)
- **upsell v košíku** (např. zápalky ke svíčce)
- **stránky** — drag & drop editor s **35+ bloky** (nadpisy, text, obrázky, tlačítka, citáty, FAQ, galerie, video, mapa, HTML **a nově**: hero sekce, živé produkty a kategorie z obchodu, ceníky, reference, tým, časová osa, záložky, odpočet, newsletter, tabulky, sociální sítě, soubory ke stažení…), přidávání/mazání stránek, **hledání v toolboxu**, **undo/redo (Ctrl+Z)**, klávesové zkratky (Ctrl+S, Delete)
- **vzhled každého bloku** — vnitřní okraje, pozadí, barvy, zaoblení, stín, max. šířka, kotvy (#odkazy), animace při scrollu, skrytí na mobilu
- **editace hlavní stránky a systémových stránek** — v editoru jde upravit i úvodní stránka (`/`), O ateliéru, doprava, obchodní podmínky, GDPR a reklamace; dokud nemají bloky, ukazuje se výchozí obsah, tlačítko „Vložit ukázkové bloky“ sestaví stránku na jedno kliknutí
- **SEO u každé stránky** — vlastní titulek, meta popisek, noindex, šířka obsahu, skrytí drobenky
- **navbar a logo** — úprava položek menu, pořadí, vlastní text a SVG loga

### Velkoobchod (B2B ceník)

1. V **Nastavení** nechte `b2b_enabled = 1` a nastavte plošnou slevu `b2b_discount` (např. `20`).
2. U produktu vyplňte **Velkoobchodní cenu bez DPH** (pole v detailu produktu) — má přednost před plošnou slevou.
   Hromadně ji dopočítáte v **Produkty → Hromadná úprava → Velkoobchodní sleva v %**.
3. V **Zákazníci** přepněte zákazníka na skupinu **Velkoobchod (B2B)**.

Po přihlášení vidí takový zákazník ceny **bez DPH** (s DPH je uvedená v druhém řádku), v košíku i pokladně má
rozpis DPH a účtuje se mu velkoobchodní cena. Faktura i objednávka běží beze změny — objednávka si navíc
pamatuje, že vznikla ve velkoobchodním režimu (`orders.customer_group`).

### Magazín (blog)

Administrace → **Magazín (blog)**. Článek má titulek, perex, HTML text, titulní fotku, štítky, datum vydání
a vlastní SEO titulek/popis. Publikované články najdete na `/magazin`, jednotlivé na `/magazin/<slug>`;
jsou v `sitemap.xml` a mají strukturovaná data `BlogPosting` + drobečkovou navigaci.

### Hromadné úpravy a CSV

V **Produkty** zaškrtnete řádky a v pruhu nahoře vyberete akci: změna ceny o %, o Kč nebo na pevnou hodnotu,
velkoobchodní cena, nastavení či naskladnění skladu, přesun do kategorie, skrytí/zobrazení, doporučené, smazání.
Vedle toho je **Export produktů do CSV** a **Import z CSV** (středník, UTF‑8 s BOM — otevře se v Excelu).
Řádky se párují podle `id`, `sku` nebo `slug`; stačí importovat jen sloupce, které chcete změnit
(např. `sku;price;stock`). Sklad se mění přes pohyby skladu, takže zůstává historie.

### Hromadný tisk faktur a štítků

V **Objednávkách** zaškrtnete objednávky a kliknete na **Tisk faktur + štítků** (nebo jen faktury / jen štítky).
Otevře se jeden dokument (`/api/admin/print?ids=…&what=both`), kde je každá faktura i štítek na vlastní stránce
a rovnou se nabídne tiskový dialog — vyberete tiskárnu nebo „Uložit jako PDF“. Chybějící faktury se cestou
vystaví, chybějící čísla zásilek dogenerují.

### Dynamické OG obrázky

Náhled odkazu na Facebooku, Instagramu nebo Twitteru/X se generuje na serveru z aktuálních dat:

- `/og/produkt/<slug>.svg` — fotka produktu, název, cena, hvězdičky a stav skladu,
- `/og/clanek/<slug>.svg` — titulek a perex článku,
- `/og/default.svg` — obecná varianta.

Middleware vkládá tento obrázek jako `og:image`; jako druhý `og:image` (a `twitter:image`) zůstává klasická
fotka produktu, aby měla každá síť co zobrazit. Vypnout se dá nastavením `og_dynamic = 0`.

### Hodnocení jen po nákupu

Formulář hodnocení se ukáže jen zákazníkovi, který má produkt v historii objednávek (párování podle účtu
i e-mailu objednávky, stornované objednávky se nepočítají). Ostatní vidí vysvětlení a odkaz na své objednávky.
Server tuto podmínku kontroluje znovu při ukládání hodnocení.

### Faktury a účetnictví

Faktura vzniká sama po dokončení objednávky (nebo až po zaplacení — podle nastavení). V administraci
najdete sekce **Faktury** a **Exporty**.

| Nastavení | Co dělá | Výchozí |
|---|---|---|
| `invoice_auto` | zapíná automatické vystavování faktur | `1` |
| `invoice_auto_on` | `order` = při objednávce, `paid` = až po zaplacení | `order` |
| `invoice_prefix` | předpona čísla faktury | `FV` |
| `invoice_pad` | počet číslic pořadového čísla (`FV20260001`) | `4` |
| `invoice_due_days` | splatnost ve dnech | `14` |
| `invoice_vat_payer` | plátce DPH (1/0) | `1` |
| `invoice_vat_rate` | sazba DPH v % | `21` |
| `invoice_currency` | měna faktur | `CZK` |

Ceny v e-shopu jsou včetně DPH, základ daně a DPH se dopočítávají zpět.
Zákazník si fakturu stáhne přímo v detailu objednávky (tlačítko *Faktura ke stažení*), správce v sekci Faktury.

**Kam který export patří**

| Export | Formát | Kam s tím |
|---|---|---|
| iDoklad | CSV (`;`, UTF-8 s BOM) | iDoklad → Faktury vydané → Import |
| Fakturoid | CSV s anglickými sloupci | Fakturoid → Faktury → Import |
| POHODA | XML dataPack (Stormware `version_2`) | POHODA → Soubor → Datová komunikace → XML import |
| Faktury / Objednávky | CSV | Excel, Google Sheets, účetní |

### Štítky produktů a filtry v katalogu

U každého produktu vyplníte **štítky** (např. `len`, `ruční práce`, `dárek do 1000`). V administraci
→ **Filtry a štítky** z nich pak sestavíte skupiny filtrů, které zákazník uvidí nad katalogem
(např. skupina „Materiál“ se štítky len / keramika / dřevo). Bez nastavených skupin katalog nabídne
prostě všechny použité štítky.

- štítky se dají hromadně přejmenovat i smazat napříč produkty,
- filtrovaný katalog má adresu `?tags=len,dřevo` (produkt stačí, když má alespoň jeden ze štítků),
- štítky jsou i ve sloupci `tags` při CSV importu/exportu produktů.

### Doporučené produkty („Mohlo by se hodit“)

V detailu produktu v administraci vyberete konkrétní zboží, které se má u produktu nabízet.
Když nic nevyberete, doplní se automaticky produkty ze stejné kategorie jako dřív.

### Dárkové poukazy, které si zákazník koupí sám

V administraci → **Kupóny a poukazy** → záložka *Poukazy*:

1. tlačítkem **Vytvořit produkt** založíte v katalogu „Dárkový poukaz 1 000 Kč“,
2. zákazník ho koupí jako běžné zboží — u košíku se samotnými poukazy se nabídne doprava **E-mailem** zdarma
   a políčka pro obdarovaného (e-mail, jméno, vzkaz),
3. jakmile je objednávka **zaplacená**, odejde e-mail s kódem; poukaz se objeví i v účtu zákazníka
   (sekce *Dárkové poukazy*) a v detailu objednávky,
4. kód funguje v košíku jako slevový kupón na jedno použití, výchozí platnost 12 měsíců (`gift_valid_months`).

Poukaz jde vystavit i ručně (např. jako omluvu) — vyplníte hodnotu a e-mail, kód odejde hned.
Tlačítko **Poslat znovu** e-mail zopakuje.

### Kupóny s časovou platností a automatickým úklidem

Kupón má **platnost od–do včetně času** (`datetime-local`). Se zapnutou volbou
**„Po vypršení automaticky smazat“** kupón po uplynutí platnosti sám zmizí z databáze — úklid se spustí
při otevření seznamu kupónů a při pokusu o uplatnění v košíku, takže není potřeba žádný cron.

### Obnova hesla e-mailem

Na přihlašovací stránce je odkaz **Zapomněli jste heslo?**. Zákazník dostane e-mail s jednorázovým odkazem
(platí 60 minut), po nastavení nového hesla se rovnou přihlásí a všechna stará přihlášení se zruší.
Správce může odkaz poslat i z administrace → **Zákazníci** → *Reset hesla*.

> Aby e-maily skutečně odešly, musí být nastavený Resend (`resend_api_key` + ověřená doména v `mail_from`).
> Bez něj se zpráva jen zaloguje do sekce **E-maily**.

### Správa zákaznických účtů

Administrace → **Zákazníci** umí účet **založit, upravit i smazat**: jméno, e-mail, telefon, heslo, role
(zákazník / správce) a cenová skupina (běžný / velkoobchod). Změna hesla odhlásí uživatele ze všech zařízení,
smazání účtu zachová jeho objednávky (jen se odpojí od účtu).

### Oznamovací lišta a dlaždice na úvodu

Administrace → **Lišta a dlaždice**:

- **oznamovací lišta** nad hlavičkou — libovolný počet zpráv, vlastní odkaz, barvy pozadí i textu,
  střídání zpráv po pěti vteřinách a možnost lištu úplně vypnout. Text v `*hvězdičkách*` se zvýrazní tučně.
- **dlaždice rychlých odkazů** na úvodní stránce — nadpis, popisek, odkaz, ikona a barva u každé dlaždice,
  řazení šipkami, volitelné doplnění o kategorie z katalogu, případně vypnutí celé sekce.

Obojí má v administraci živý náhled.

---

## Kdo systém KAVKA dodává

| | |
|---|---|
| Kontaktní osoba | **Jan Minařík** |
| Objednávky a web | **https://jmweb.cz** |
| Telefon | **776 677 399** |

Údaje jsou i v administraci (Nastavení → `vendor_person`, `vendor_web`, `vendor_phone`), takže si je při
white-label nasazení přepíšete na sebe.

### Platba kartou online (Comgate)

Výchozí pokladna zůstává bez karetní brány. Karta online se zapne takto:

1. Založte si účet u [Comgate](https://www.comgate.cz) (nebo jiné brány — kód je připravený na Comgate).
2. V administraci: **Nastavení** → vyplňte `comgate_merchant` (ID obchodníka) a `comgate_secret` (heslo pro background komunikaci). `comgate_test` nechte `1` do doby, než si vše otestujete.
3. Metoda **Online kartou** se tím aktivuje automaticky (přehled: **Platby**).
4. V portálu Comgate nastavte návratové URL na `https://VAŠE-ADRESA/api/payments/return` (paidUrl/cancelUrl/pendingUrl, podporují `${refId}`) a background URL na `https://VAŠE-ADRESA/api/payments/comgate`.
5. Pozor: vytváření platby server-to-server (`prepareOnly=true`) vyžaduje v portálu Comgate povolenou **IP adresu e-shopu**. Cloudflare Workers nemají statickou egress IP ve výchozím nastavení — povolte si je na účtu Cloudflare (Static outbound IPs) a ty pak zadejte v Comgate. E-shop s tím počítá: když se bránu nepodaří spustit, objednávka zůstane v „čeká na platbu“ a zákazník ji doplatí tlačítkem na stránce objednávky.
6. Výsledek platby se **nikdy nevěří návratové URL** — vždy se ověřuje přes status API Comgate (transId + secret). Objednávka se označí jako zaplacená, vystaví se faktura a odejde e-mail.

### Dvoufázové ověření (2FA)

Administrace → **Nastavení → Bezpečnost a provoz → Zapnout dvoufázové ověření**. Naskenujte QR kód
(Google Authenticator, 1Password…) a potvrďte kódem. Od té chvíle se po heslu zadává 6místný kód.
Klíčem `totp_required = 1` se 2FA stane pro administrátory povinným.

### Web Push a offline (PWA)

Web je instalovatelný (manifest + ikony) a má service worker s offline fallbackem. Na detailu
vyprodaného zboží (hlídací pes) si zákazník může zaškrtnout „Upozornit i v prohlížeči“ — po naskladnění
přijde push notifikace (VAPID klíče se vygenerují samy do nastavení). Push vyžaduje HTTPS.

### Cron úlohy

Kód obsahuje automatizace, které se spouští z cronu (Cloudflare Dashboard → Pages projekt →
Settings → Functions → Cron Triggers, např. každých 15 minut):

- `POST /api/admin/mail/abandoned` — připomínky opuštěného košíku (výchozí po 2 h a po 24 h, viz nastavení `abandoned_stage1_hours` / `abandoned_stage2_hours`); bez cronu ji spustíte ručně v administraci tlačítkem v sekci E-maily,
- `POST /api/admin/maintenance` — úklid logů pokusů o přihlášení a prázdných starých košíků.

Při nasazení přes `wrangler pages deploy` stačí odkomentovat sekci `[[triggers]]` ve `wrangler.toml`.

**Ukázkové účty** (vzniknou samy po prvním otevření webu)

| Role | E-mail | Heslo |
|---|---|---|
| Správce | `admin@kavka.shop` | `KavkaAdmin123` |
| Zákaznice | `anna@example.com` | `Anna12345` |

Hesla hned změňte v účtu / založte nového správce.

---

## Než začnete — co si založit

1. Účet na [https://dash.cloudflare.com](https://dash.cloudflare.com) (jde to i zdarma).
2. Účet na [GitHubu](https://github.com) a tento repositář (fork nebo push).
3. Asi 30 minut v klidu. Nemusíte umět programovat. Klikáte v prohlížeči.

Slovníček:

- **Pages** = Cloudflare vám z Gitu postaví web a vystaví ho na adresu `něco.pages.dev`.
- **D1** = databáze (tabulky, jako Excel, ale pro e-shop).
- **R2** = disk na fotky.
- **Binding / vazba** = „propojení“. Říkáte: „tahle databáze se v kódu jmenuje `DB`“.
- **Secret** = tajné heslo, které se neukládá do Gitu.

---

## Krok 1 — kód na GitHubu

1. Přihlaste se na GitHub.
2. Tento projekt musí být ve vašem repositáři (už je, pokud čtete tenhle README v `FROTTOG/eshoparenatest`).
3. Větev s finální verzí po sloučení je `main`. Do Cloudflare později vyberete právě `main`.

Když kód teprve nahráváte z počítače:

```bash
git add .
git commit -m "KAVKA e-shop"
git push origin main
```

---

## Krok 2 — databáze D1

1. V Cloudflare nahoře klikněte na **Workers & Pages** (někdy jen **Workers**).
2. Vlevo (nebo nahoře) otevřete **D1**.
3. **Create database**.
4. Název: `kavka-shop` (můžete jinak, pak ho pište stejně dál).
5. Umístění (location) nechte výchozí, ideálně EU, když nabízí výběr.
6. **Create**.

Až se databáze otevře, zkopírujte si **Database ID** — dlouhé číslo s pomlčkami. Vypadá podobně jako `a1b2c3d4-e5f6-7890-abcd-ef1234567890`.

### Volitelně: doplnit ID do projektu

V souboru `wrangler.toml` je teď zástupný údaj:

```toml
database_id = "00000000-0000-0000-0000-000000000000"
```

Nahraďte ho svým ID a commitněte. **Není to nutné**, pokud vazbu nastavíte v Pages (krok 5). Pro jistotu udělejte obojí.

Tabulky a ukázkové zboží se **vytvoří samy** při prvním načtení `/api/health`. Nemusíte nikam kopírovat SQL, pokud nechcete.

Kdo chce schéma nahrát ručně:

```bash
npx wrangler login
npx wrangler d1 migrations apply kavka-shop --remote
```

---

## Krok 3 — úložiště R2 na fotky

Bez R2 e-shop **funguje** (ukázkové fotky jsou v Gitu). R2 potřebujete, až budete v administraci nahrávat vlastní obrázky.

1. V Cloudflare: **R2**.
2. Pokud se zeptá na platební kartu — R2 má štědrý free tarif, karta se bere jako pojistka. Bez karty bucket někdy nejde založit.
3. **Create bucket**.
4. Název: `kavka-media`.
5. Location: EU, pokud jde vybrat.
6. **Create**.

Veřejný přístup **není potřeba**. Fotky servíruje náš web z adresy `/api/media/...`.

---

## Krok 4 — propojit GitHub s Pages

1. Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Povolte Cloudflare přístup k GitHubu (tlačítko Authorize).
3. Vyberte repositář `eshoparenatest` (nebo jak ho máte pojmenovaný).
4. Nastavení buildu vyplňte **přesně takto**:

| Pole | Hodnota |
|---|---|
| Production branch | `main` |
| Framework preset | **None** / None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(prázdné)* |

5. **Environment variables** (ještě před Save) přidejte:

| Typ | Název | Hodnota |
|---|---|---|
| Secret | `AUTH_SECRET` | dlouhé náhodné heslo, třeba z heselníku, ideálně 32+ znaků |
| Variable | `NODE_VERSION` | `22` |
| Variable | `STORE_NAME` | `KAVKA` |

Jak vyrobit `AUTH_SECRET`: v heslovém správci „vygenerovat heslo“, nebo na [https://www.random.org/strings/](https://www.random.org/strings/) 40 znaků. Bez toho jdou relace hádat. **Nikdy ho nedávejte do Gitu.**

6. **Save and Deploy**. První build může spadnout — ještě chybí vazby z kroku 5. To je v pořádku.

---

## Krok 5 — vazby D1 a R2 k webu (nevynechte)

1. Otevřete právě vytvořený Pages projekt.
2. **Settings** → **Functions** (někdy **Bindings**).
3. **D1 database bindings** → **Add binding**
   - Variable name: **`DB`** (přesně tak, velkými písmeny)
   - Database: `kavka-shop`
4. **R2 bucket bindings** → **Add binding**
   - Variable name: **`MEDIA`** (přesně tak)
   - Bucket: `kavka-media`
5. Uložte.
6. **Deployments** → u posledního buildu **Retry deployment** (nebo pushněte prázdný commit). Vazby se projeví až na novém nasazení.

Bez vazby `DB` web ukáže hlášku, že databáze není připojená. To není rozbitý kód — chybí propojení.

---

## Krok 6 — první otevření

1. V projektu Pages nahoře je adresa typu `https://kavka-shop.pages.dev`.
2. Otevřete nejdřív `https://VAŠE-ADRESA.pages.dev/api/health`.
   - Má přijít `{"ok":true,...}`.
   - První načtení trvá vteřinu navíc — zakládají se tabulky a ukázkové zboží.
3. Pak otevřete homepage.
4. Přihlaste se jako `admin@kavka.shop` / `KavkaAdmin123`.
5. Jděte na `/admin` → **Nastavení** a vyplňte **vlastní IBAN**, telefon, adresu.
6. **Změňte heslo správce** (Účet → nové heslo).

---

## Krok 7 — vlastní doména (volitelné)

1. Pages projekt → **Custom domains** → **Set up a domain**.
2. Pokud je doména u Cloudflare, stačí potvrdit.
3. Pokud je jinde, Cloudflare vám řekne, jaké **CNAME** máte u registrátora nastavit (obvykle `@` nebo `www` → `kavka-shop.pages.dev`).
4. Počkejte na zelené „Active“. SSL (zámeček) se vystaví samo.

---

## Denní práce v administraci

- **Produkty** — název, cena v celých Kč, sklad, fotka. Fotku buď vložte jako `/products/něco.jpg`, nebo nahrajte soubor (jde do R2).
- **Sklad** — tlačítka +1 / +5 / −1, vždy s důvodem. Objednávka kusy sama odečte, storno vrátí.
- **Objednávky** — stavy: Nová → Zaplacená → Zpracovává se → Odeslaná → Doručená. Platbu „Zaplacená“ klikněte, až uvidíte peníze na účtu.
- **Výdejní místa** — přidejte reálný Z-BOX / pobočku / Balíkovnu (název, adresa, GPS). Mapa na pokladně ukáže špendlík.
- **Kupóny a poukazy** — procenta nebo částka, minimum, limit použití, platnost od–do s časem a automatické smazání po vypršení. Druhá záložka spravuje dárkové poukazy.
- **Zákazníci** — založení, úprava (včetně hesla a role) i smazání účtu, odeslání odkazu na nové heslo.
- **Filtry a štítky** — štítky produktů a skupiny filtrů, které zákazník uvidí v katalogu.
- **Lišta a dlaždice** — oznamovací pruh nad hlavičkou a dlaždice rychlých odkazů na úvodu.
- **Hodnocení** — pokud v nastavení není `reviews_auto_approve = 1`, schvalujete ručně.

Každé uložení v administraci potvrdí zelené hlášení („Úprava uložena“) a tlačítko se na chvíli přepne
na **Uloženo ✓**, takže je hned vidět, že se změna propsala.

GPS souřadnice místa: otevřete [https://www.openstreetmap.org](https://www.openstreetmap.org), klikněte pravým na budovu, „Show address“ — nahoře v adrese jsou čísla `lat` a `lng`.

---

## Proč tu není živá Zásilkovna / karta online

Zadání bylo: **nic mimo Cloudflare**. Oficiální widget Zásilkovny a platební brána (Comgate, Stripe, GOPAY) volají cizí servery a chtějí smlouvy + API klíče.

Proto:

- místa Zásilkovny / Z-BOXu / Balíkovny **spravujete vy** (předpřipravený seznam měst ČR už v databázi je),
- karta „online“ tu není — je **převod s QR**, dobírka a platba při převzetí.

Až budete chtít živé API dopravce, je to další krok mimo tento projekt.

E-maily (potvrzení objednávky, změna stavu, hlídací pes, opuštěný košík) odesílá služba **Resend** (https://resend.com). Cloudflare sám e-maily posílat neumí.

**Nastavení Resend (3 kroky)**

1. Zaregistrujte se na Resend a **ověřte svou doménu** (Resend → Domains → přidejte DNS záznam u vašeho poskytovatele domény). Bez ověřené domény Resend e-maily neodešle.
2. Vytvořte **API klíč** (Resend → API Keys).
3. Klíč zadejte v administraci e-shopu v **Nastavení → `resend_api_key`** (nebo bezpečněji jako Cloudflare secret `RESEND_API_KEY` v Pages → Settings → Environment variables). Odesílatele `mail_from` nastavte na e-mail **z ověřené domény** (např. `info@vasadomena.cz`).

**Kontrola a test:** v administraci otevřete **E-maily** — uvidíte stav odesílání, ověřené domény v účtu Resend a tlačítko *Odeslat testovací e-mail*, které okamžitě ukáže případnou chybu (např. „doména není ověřená“ nebo „neplatný klíč“). Všechny pokusy se zapisují do přehledu i s chybou. Dokud není klíč nastavený, e-maily se pouze ukládají (status `logged`) a nic se neodesílá.

---

## Lokální vývoj (pro programátory)

```bash
npm install
cp .dev.vars.example .dev.vars
# do .dev.vars dejte AUTH_SECRET

# jednorázově založit lokální D1
npx wrangler d1 migrations apply kavka-shop --local

# náhled jako na Pages (doporučeno)
npm run pages:dev

# kouřové testy editoru stránek (potřebují běžící pages:dev)
npm run smoke
npm run smoke:admin
```

Čisté `npm run dev` spustí jen Vite. API (`/api`) potřebuje Wrangler (`npm run pages:dev`), jinak košík a přihlášení nepojedou.

---

## Struktura projektu

```
functions/api/[[path]].ts   ← vstup API na /api/*
functions/lib/              ← Hono, schéma, seed, trasy
src/                        ← React obchod + admin
public/products/            ← ukázkové fotky
migrations/                 ← volitelné SQL
wrangler.toml               ← název projektu a vazby
```

---

## Časté problémy

**„D1 databáze není připojená“**  
Chybí binding `DB`. Krok 5 + nové nasazení.

**„Úložiště R2 není připojené“**  
Chybí binding `MEDIA`, nebo nahráváte fotku bez R2. Ostatní jde používat.

**Prázdný obchod, žádný admin**  
Otevřete `/api/health` jednou a obnovte homepage. Seed běží při prvním API požadavku.

**Build na Pages spadne na Node**  
Přidejte env `NODE_VERSION=22`.

**Po přihlášení mě to hned odhlásí**  
Web musí běžet na HTTPS (Pages má). Zkontrolujte `AUTH_SECRET` — po jeho změně padnou všechny relace (to je správně).

**Mapa je prázdná**  
V administraci → Výdejní místa musí být aktivní řádky. Po seedu jich jsou desítky.

**QR platba nejde načíst v bance**  
V nastavení musí být **platný IBAN bez mezer**. Ukázkový `CZ65…` je cvičný účet z dokumentace, neposílejte na něj peníze.

**Chci smazat ukázková data**  
V D1 Console (Cloudflare → D1 → databáze → Console) můžete psát SQL, např. `DELETE FROM products;`. Pak v `settings` smažte klíč `seeded` a znovu načtěte `/api/health` — seed se spustí znovu jen když nejsou produkty.

---

## Bezpečnost (krátce)

- hesla jsou PBKDF2, ne otevřený text
- relace je HTTP-only cookie
- SQL jde přes parametry (ne slepování stringů)
- nahrávání do R2 jen pro správce, jen obrázky do 8 MB (soubor proudí přímo do R2, bez bufferu v Workeru)
- přihlášení je chráněné proti hádání hesla (max. 8 pokusů za 15 minut na e-mail i IP)
- volitelné **2FA (TOTP)** pro administrátory
- výsledek platby kartou se ověřuje server-to-server přes status API brány
- **CSP** hlavička na všech stránkách (povolené jen známé domény — Packeta, GTM/GA4, Meta, Google Fonts)
- `AUTH_SECRET` držte jako Secret, ne v `wrangler.toml`

---

## Licence a značky

Názvy Zásilkovna, Z-BOX, Packeta a Balíkovna označují služby dopravců. Widgety patří jim; pro ostrý provoz potřebujete vlastní smlouvu a API klíč Packety. Místa v seedu jsou záložní.

---

KAVKA. Věci s charakterem. A stack, který vám neuteče z účtu.
