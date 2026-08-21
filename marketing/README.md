# KAVKA — marketingový balíček

Hotové materiály pro nabídku e-shop systému KAVKA zákazníkům. Vizuální styl navazuje na funkční demo: krémový papír, terakota, lesní zelená, Fraunces a Outfit.

## Soubory k použití

| Soubor | Použití |
|---|---|
| `KAVKA-prodejni-brozura.pdf` | 10stránková A4 prodejní brožura v češtině; vhodná k odeslání e-mailem i tisku |
| `kavka-logo.svg` | hlavní plnobarevné vektorové logo na světlé pozadí |
| `kavka-logo-inverzni.svg` | vektorové logo na tmavé / zelené pozadí |
| `kavka-symbol.svg` | samostatný vektorový symbol pro ikonu, avatar nebo malý formát |

Viditelná písmena v SVG jsou převedená na křivky (`path`). Příjemce proto nemusí mít nainstalované použité fonty a logo lze otevřít ve Figmě, Illustratoru, Affinity Designeru nebo Inkscape.

## Obsah brožury

Brožura pokrývá hlavní funkce dema:

- zákaznický katalog, hledání, filtry, detail, oblíbené, košík, účet, reklamace, PWA a hlídací pes,
- pokladnu pro hosta i přihlášeného, ARES, dopravy, mapy výdejních míst a platební varianty,
- produkty, sklad, objednávky, zákazníky, kupóny, recenze, faktury, exporty a štítky v administraci,
- editor stránek s 35+ bloky, systémové stránky, menu, SVG logo, carousel, vzhled a SEO,
- automatizace, opuštěný košík, e-maily, Web Push, GTM, GA4 a Meta Pixel,
- feedy Heureka, Zboží.cz, Google Shopping a OpenAI Shopping,
- Cloudflare Pages/Workers, D1, R2, cache, AVIF/WebP, 2FA, CSP, zálohy a údržbu,
- transparentní rozlišení mezi funkčním demem a konfigurací potřebnou pro produkční spuštění.

## Základní vizuální pravidla

### Barvy

- inkoust: `#1C1915`
- krémové pozadí: `#F3EEE4`
- světlá karta: `#FFFDF8`
- terakota: `#B54A2C`
- lesní zelená: `#24352C`
- zlatý detail: `#C4A574`

### Logo

- Na světlém pozadí používejte `kavka-logo.svg`, na tmavém `kavka-logo-inverzni.svg`.
- Kolem loga ponechte volný prostor alespoň ve velikosti poloviny výšky symbolu.
- Doporučená minimální šířka plného loga je 45 mm v tisku nebo 180 px na obrazovce.
- Logo nedeformujte, nenaklánějte, nepřebarvujte mimo uvedenou paletu a neměňte poměr symbolu a wordmarku.

## Aktualizace zdrojů

Generátory jsou v `source/`. Používají fonty Fraunces a Outfit pod licencí SIL Open Font License; licenční texty jsou u fontů.

```bash
python -m venv .venv-docs
.venv-docs/bin/pip install reportlab==4.2.5 fonttools==4.55.3
.venv-docs/bin/python marketing/source/generate_logo.py
.venv-docs/bin/python marketing/source/generate_brochure.py
```

Před zveřejněním vždy zkontrolujte kontaktní údaje, aktivní integrace a rozsah konkrétní nabídky. Přehled funkcí v brožuře odpovídá funkčnímu demu v srpnu 2026.
