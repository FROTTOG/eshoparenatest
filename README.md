# KAVKA — e-shop na Cloudflare Pages

Hotový český e-shop. Běží **jen na Cloudflare**:

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
- pokladna i jako host
- doprava: **Z-BOX** a **Zásilkovna** (živý widget Packety), **Balíkovna** (iframe mapa České pošty), **na adresu**, **osobní odběr**
- platba: převod s **QR (SPD)**, dobírka, karta při převzetí, hotově v ateliéru
- historie objednávek, sledování podle čísla + e-mailu
- hodnocení koupeného zboží

**Správce** (`/admin`)

- přehled tržeb, nové objednávky, nízký sklad
- produkty, kategorie, sklady a pohyby
- objednávky (stav + označení platby; storno vrací sklad)
- zákazníci, kupóny, schvalování hodnocení
- doprava, platby, výdejní místa na mapě
- **faktury** — vystavují se automaticky ke každé objednávce (číselná řada, VS, DPH, tisk/PDF)
- **exporty do účetnictví** — iDoklad (CSV), Fakturoid (CSV), POHODA (XML dataPack), objednávky a faktury v CSV
- nastavení obchodu a IBAN
- nahrání fotek do R2

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

---

## Kdo systém KAVKA dodává

| | |
|---|---|
| Kontaktní osoba | **Jan Minařík** |
| Objednávky a web | **https://jmweb.cz** |
| Telefon | **776 677 399** |

Údaje jsou i v administraci (Nastavení → `vendor_person`, `vendor_web`, `vendor_phone`), takže si je při
white-label nasazení přepíšete na sebe.

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
- **Kupóny** — procenta nebo částka, minimum, limit použití.
- **Hodnocení** — pokud v nastavení není `reviews_auto_approve = 1`, schvalujete ručně.

GPS souřadnice místa: otevřete [https://www.openstreetmap.org](https://www.openstreetmap.org), klikněte pravým na budovu, „Show address“ — nahoře v adrese jsou čísla `lat` a `lng`.

---

## Proč tu není živá Zásilkovna / karta online

Zadání bylo: **nic mimo Cloudflare**. Oficiální widget Zásilkovny a platební brána (Comgate, Stripe, GOPAY) volají cizí servery a chtějí smlouvy + API klíče.

Proto:

- místa Zásilkovny / Z-BOXu / Balíkovny **spravujete vy** (předpřipravený seznam měst ČR už v databázi je),
- karta „online“ tu není — je **převod s QR**, dobírka a platba při převzetí.

Až budete chtít živé API dopravce, je to další krok mimo tento projekt.

E-maily (potvrzení objednávky) Cloudflare sám **neumí odesílat** bez cizí služby. Zákazník vidí potvrzení na webu a může si objednávku dohledat v **Sledování**.

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
- nahrávání do R2 jen pro správce, jen obrázky do 8 MB
- `AUTH_SECRET` držte jako Secret, ne v `wrangler.toml`

---

## Licence a značky

Názvy Zásilkovna, Z-BOX, Packeta a Balíkovna označují služby dopravců. Widgety patří jim; pro ostrý provoz potřebujete vlastní smlouvu a API klíč Packety. Místa v seedu jsou záložní.

---

KAVKA. Věci s charakterem. A stack, který vám neuteče z účtu.
