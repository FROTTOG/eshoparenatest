import { useState } from "react";
import { Link } from "react-router-dom";
import {
  IconBox,
  IconBuilding,
  IconCard,
  IconCash,
  IconCookie,
  IconFileText,
  IconLock,
  IconLocker,
  IconMail,
  IconParcel,
  IconPhone,
  IconPin,
  IconPrinter,
  IconQr,
  IconScale,
  IconShield,
  IconShop,
  IconTruck,
  IconWrap,
} from "../components/Icons";
import { openCookieSettings } from "../components/CookieBanner";
import { useStore } from "../store";

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="wrap prose-page">
      <div className="crumbs">
        <Link to="/">Domů</Link> / <span>{title}</span>
      </div>
      <h1 className="serif">{title}</h1>
      <div className="desc">{children}</div>
    </div>
  );
}

export function About() {
  const { settings } = useStore();
  const company = settings.store_company || settings.store_name || "KAVKA Ateliér s.r.o.";
  const ico = settings.store_ico || "19200456";
  const dic = settings.store_dic || "CZ19200456";
  const registry = settings.store_registry || "Zapsáno v obchodním rejstříku vedeném Městským soudem v Praze, oddíl C, vložka 384512";
  const address = settings.store_address || "Korunní 42, 120 00 Praha 2 - Vinohrady";
  const email = settings.store_email || "ahoj@kavka.shop";
  const phone = settings.store_phone || "+420 777 123 456";
  const bankAcc = settings.bank_account || "192000145399/0800";
  const iban = settings.iban || "CZ6508000000192000145399";
  const bankName = settings.bank_name || "Česká spořitelna, a.s.";

  return (
    <Box title="O nás a kontakty">
      <p className="lead" style={{ fontSize: 18, color: "var(--ink)" }}>
        {settings.store_name || "KAVKA"} je malý autorský obchod a ateliér s věcmi, které mají váhu v ruce.
        Keramika točená na kruhu, přírodní len, masivní dubové dřevo a lesní vůně.
      </p>

      <div className="legal-box glass-card" style={{ padding: 20, margin: "24px 0", borderRadius: 16, border: "1px solid var(--line)" }}>
        <h3 style={{ margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <IconBuilding size={20} /> Identifikační údaje provozovatele
        </h3>
        <table style={{ width: "100%", fontSize: 14 }}>
          <tbody>
            <tr>
              <td style={{ width: 180, color: "var(--muted)", padding: "6px 0" }}>Obchodní firma / Jméno:</td>
              <td style={{ fontWeight: 600, padding: "6px 0" }}>{company}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--muted)", padding: "6px 0" }}>Sídlo a ateliér:</td>
              <td style={{ padding: "6px 0" }}>{address}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--muted)", padding: "6px 0" }}>IČO:</td>
              <td style={{ padding: "6px 0" }}>{ico}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--muted)", padding: "6px 0" }}>DIČ:</td>
              <td style={{ padding: "6px 0" }}>{dic} ({settings.store_vat_note || "Plátce DPH"})</td>
            </tr>
            <tr>
              <td style={{ color: "var(--muted)", padding: "6px 0" }}>Zápis v evidenci:</td>
              <td style={{ padding: "6px 0" }}>{registry}</td>
            </tr>
            <tr>
              <td style={{ color: "var(--muted)", padding: "6px 0" }}>Bankovní spojení:</td>
              <td style={{ padding: "6px 0" }}>
                {bankAcc} ({bankName})
                <br />
                <small style={{ color: "var(--muted)" }}>IBAN: {iban}</small>
              </td>
            </tr>
            <tr>
              <td style={{ color: "var(--muted)", padding: "6px 0" }}>Otevírací doba:</td>
              <td style={{ padding: "6px 0" }}>{settings.store_hours || "Po–Pá 10:00–18:00"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Kontakty pro zákazníky</h3>
      <p style={{ display: "grid", gap: 8 }}>
        <span>
          <IconMail size={16} style={{ verticalAlign: "middle", marginRight: 8, color: "var(--accent)" }} />
          E-mail pro dotazy a objednávky: <a href={`mailto:${email}`} className="linkish"><b>{email}</b></a>
        </span>
        <span>
          <IconPhone size={16} style={{ verticalAlign: "middle", marginRight: 8, color: "var(--accent)" }} />
          Zákaznická linka: <a href={`tel:${phone.replace(/\s+/g, "")}`} className="linkish"><b>{phone}</b></a>
        </span>
      </p>

      <h3>Orgány dozoru a mimosoudní řešení sporů</h3>
      <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>
        Dozor nad dodržováním povinností podle zákona o ochraně spotřebitele vykonává <b>Česká obchodní inspekce (ČOI)</b>,
        Štěpánská 567/15, 120 00 Praha 2, internetová adresa: <a href="https://www.coi.cz" target="_blank" rel="noreferrer" className="linkish">www.coi.cz</a>.
        Dozor nad ochranou osobních údajů vykonává <b>Úřad pro ochranu osobních údajů (ÚOOÚ)</b>, Pplk. Sochora 27, 170 00 Praha 7, <a href="https://www.uoou.gov.cz" target="_blank" rel="noreferrer" className="linkish">www.uoou.gov.cz</a>.
        Živnostenskou kontrolu provádí příslušný Živnostenský úřad.
      </p>
    </Box>
  );
}

export function ShippingInfo() {
  return (
    <Box title="Doprava a platba">
      <p>
        Objednávky balíme do recyklovatelných materiálů a expedujeme každý pracovní den do 24 hodin.
        U výdejních míst máte k dispozici oficiální živou mapu dopravce.
      </p>

      <h3>Způsoby a ceník dopravy</h3>
      <ul className="info-list" style={{ margin: "18px 0" }}>
        <li>
          <IconWrap>
            <IconLocker />
          </IconWrap>
          <div>
            <b>Zásilkovna Z-BOX — 59 Kč (od 1 500 Kč ZDARMA)</b>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ink-soft)" }}>
              Samoobslužný box s nonstop výdejem. Otevření pomocí mobilní aplikace Packeta. Dodání do 1–2 pracovních dnů.
            </p>
          </div>
        </li>
        <li>
          <IconWrap>
            <IconPin />
          </IconWrap>
          <div>
            <b>Zásilkovna — Výdejní místo — 79 Kč (od 1 500 Kč ZDARMA)</b>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ink-soft)" }}>
              Kamenná pobočka Zásilkovny s osobní obsluhou. Výběr na živé mapě, dodání do 1–2 pracovních dnů.
            </p>
          </div>
        </li>
        <li>
          <IconWrap>
            <IconParcel />
          </IconWrap>
          <div>
            <b>Balíkovna (Česká pošta) — 65 Kč (od 1 500 Kč ZDARMA)</b>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ink-soft)" }}>
              Pošty, Balíkovna-boxy a partnerská místa (trafiky, obchody). Rychlý výdej na kód, dodání do 2–3 pracovních dnů.
            </p>
          </div>
        </li>
        <li>
          <IconWrap>
            <IconTruck />
          </IconWrap>
          <div>
            <b>Doručení kurýrem na adresu — 99 Kč (od 2 000 Kč ZDARMA)</b>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ink-soft)" }}>
              Doručení kurýrem přímo k vašim dveřím po celé ČR. Řidič vás před doručením kontaktuje SMS zprávou a telefonicky.
            </p>
          </div>
        </li>
        <li>
          <IconWrap>
            <IconShop />
          </IconWrap>
          <div>
            <b>Osobní odběr v ateliéru — ZDARMA</b>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ink-soft)" }}>
              Korunní 42, Praha 2 - Vinohrady. K vyzvednutí připraveno následující pracovní den od 10:00.
            </p>
          </div>
        </li>
      </ul>

      <h3>Způsoby platby</h3>
      <ul className="info-list" style={{ margin: "18px 0" }}>
        <li>
          <IconWrap>
            <IconQr />
          </IconWrap>
          <div>
            <b>Bankovní převod s QR kódem (SPD) — ZDARMA</b>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ink-soft)" }}>
              Okamžitá platba načtením standardního QR kódu ve vaší bankovní aplikaci nebo převodem na náš účet. Objednávku expedujeme ihned po připsání platby.
            </p>
          </div>
        </li>
        <li>
          <IconWrap>
            <IconBox />
          </IconWrap>
          <div>
            <b>Dobírka — 39 Kč</b>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ink-soft)" }}>
              Platba v hotovosti nebo platební kartou při převzetí zásilky od dopravce. (Nelze využít u Z-BOXů).
            </p>
          </div>
        </li>
        <li>
          <IconWrap>
            <IconCard />
          </IconWrap>
          <div>
            <b>Kartou při převzetí — ZDARMA</b>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ink-soft)" }}>
              Platba platební kartou přes terminál kurýra nebo na výdejním místě Zásilkovny/Balíkovny.
            </p>
          </div>
        </li>
        <li>
          <IconWrap>
            <IconCash />
          </IconWrap>
          <div>
            <b>Hotově nebo kartou v ateliéru — ZDARMA</b>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: "var(--ink-soft)" }}>
              Platba při osobním odběru v našem ateliéru na Vinohradech.
            </p>
          </div>
        </li>
      </ul>
    </Box>
  );
}

export function Terms() {
  const { settings } = useStore();
  const company = settings.store_company || settings.store_name || "KAVKA Ateliér s.r.o.";
  const ico = settings.store_ico || "19200456";
  const dic = settings.store_dic || "CZ19200456";
  const registry = settings.store_registry || "Zapsáno v obchodním rejstříku vedeném Městským soudem v Praze, oddíl C, vložka 384512";
  const address = settings.store_address || "Korunní 42, 120 00 Praha 2 - Vinohrady";
  const email = settings.store_email || "ahoj@kavka.shop";
  const phone = settings.store_phone || "+420 777 123 456";

  return (
    <Box title="Obchodní podmínky">
      <p style={{ fontSize: 14, color: "var(--muted)" }}>
        Všeobecné obchodní podmínky pro nákup v internetovém obchodě platné a účinné od 1. 1. 2024 v souladu se zákonem č. 89/2012 Sb., občanský zákoník, a zákonem č. 634/1992 Sb., o ochraně spotřebitele, v platném znění.
      </p>

      <h3>I. Úvodní ustanovení a identifikace prodávajícího</h3>
      <p>
        Tyto obchodní podmínky upravují vzájemná práva a povinnosti smluvních stran vzniklé v souvislosti nebo na základě kupní smlouvy uzavírané mezi prodávajícím a kupujícím prostřednictvím internetového obchodu.
      </p>
      <div className="legal-card glass-card" style={{ padding: 14, borderRadius: 12, fontSize: 14 }}>
        <strong>Prodávající a provozovatel internetového obchodu:</strong>
        <br />
        <b>{company}</b>
        <br />
        Sídlo: {address}
        <br />
        IČO: {ico} | DIČ: {dic} ({settings.store_vat_note || "Plátce DPH"})
        <br />
        Zápis v evidenci: {registry}
        <br />
        Kontaktní e-mail: <a href={`mailto:${email}`} className="linkish">{email}</a> | Telefon: {phone}
      </div>

      <h3>II. Vymezení pojmů</h3>
      <ul>
        <li>
          <b>Spotřebitel:</b> Každý člověk, který mimo rámec své podnikatelské činnosti nebo mimo rámec samostatného výkonu svého povolání uzavírá smlouvu s podnikatelem nebo s ním jinak jedná.
        </li>
        <li>
          <b>Podnikatel:</b> Osoba zapsaná v obchodním rejstříku, podnikající na základě živnostenského oprávnění nebo nakupující na IČO/DIČ pro účely svého podnikání.
        </li>
        <li>
          <b>Kupní smlouva:</b> Smlouva uzavřená mezi prodávajícím a kupujícím prostřednictvím internetového obchodu v českém jazyce.
        </li>
      </ul>

      <h3>III. Informace o zboží a cenách</h3>
      <p>
        Prezentace zboží umístěná v internetovém obchodě je informativního charakteru. Všechny ceny zboží jsou uváděny v českých korunách (Kč) jako konečné, včetně daně z přidané hodnoty (DPH) a veškerých souvisejících poplatků. Ceny zůstávají v platnosti po dobu, kdy jsou zobrazovány v internetovém obchodě. Náklady na dopravu a případné poplatky za způsob platby jsou zřetelně uvedeny v nákupním košíku před odesláním objednávky.
      </p>

      <h3>IV. Objednávka a uzavření kupní smlouvy</h3>
      <p>
        1. Kupující provádí objednávku vložením vybraného zboží do nákupního košíku, volbou způsobu dopravy a platby a vyplněním kontaktních a fakturačních údajů (případně doručovací adresy nebo údajů o firmě).
      </p>
      <p>
        2. Před odesláním objednávky má kupující možnost zkontrolovat a měnit veškeré zadané údaje a opravit případné chyby.
      </p>
      <p>
        3. V souladu s § 1826a odst. 2 občanského zákoníku kupující odesílá závaznou objednávku stisknutím tlačítka <b>„Objednat s povinností platby“</b>, čímž potvrzuje svou povinnost objednané zboží uhradit.
      </p>
      <p>
        4. Prodávající neprodleně po doručení objednávky potvrdí její přijetí elektronickou poštou na e-mailovou adresu uvedenou kupujícím. Tímto okamžikem vzniká kupní smlouva.
      </p>

      <h3>V. Platební podmínky a dodání zboží</h3>
      <p>
        Kupující může zvolit platbu bezhotovostním bankovním převodem s QR kódem dle standardu SPD, platbu na dobírku při převzetí, platbu kartou při doručení nebo platbu při osobním odběru v ateliéru.
      </p>
      <p>
        Zboží je dodáváno prostřednictvím služeb Zásilkovna (Z-BOX, výdejní místa), Balíkovna (Česká pošta), kurýrem na adresu kupujícího nebo osobním odběrem. Při převzetí zásilky je kupujícímu doporučeno zkontrolovat neporušenost obalu zásilky a v případě závad toto neprodleně oznámit dopravci.
      </p>

      <h3>VI. Odstoupení od kupní smlouvy spotřebitelem (do 14 dnů)</h3>
      <p>
        1. Spotřebitel má v souladu s § 1829 odst. 1 občanského zákoníku právo odstoupit od kupní smlouvy bez udání důvodu ve lhůtě <b>14 dnů</b> ode dne převzetí zboží.
      </p>
      <p>
        2. Pro odstoupení od kupní smlouvy může spotřebitel využít vzorový formulář pro odstoupení od smlouvy dostupný na stránce <Link to="/reklamace" className="linkish">Reklamace a vrácení</Link>, nebo zaslat jednoznačné prohlášení na e-mailovou adresu {email}.
      </p>
      <p>
        3. Spotřebitel zašle nebo předá zboží prodávajícímu bez zbytečného odkladu, nejpozději do 14 dnů od odstoupení, na adresu: <b>{settings.store_return_address || address}</b>. Náklady spojené s vrácením zboží nese spotřebitel.
      </p>
      <p>
        4. Prodávající vrátí spotřebiteli všechny peněžní prostředky včetně nákladů na nejlevnější nabízený způsob dodání zboží nejpozději do 14 dnů od odstoupení od smlouvy, a to stejným způsobem, jakým je přijal, nebo převodem na bankovní účet spotřebitele. Prodávající není povinen vrátit peníze dříve, než obdrží vrácené zboží nebo než spotřebitel prokáže, že zboží odeslal.
      </p>
      <p>
        5. Spotřebitel odpovídá za snížení hodnoty zboží, které vzniklo v důsledku nakládání s tímto zbožím jinak, než je nutné k seznámení se s jeho povahou, vlastnostmi a funkčností.
      </p>

      <h3>VII. Práva z vadného plnění a reklamace (Reklamační řád)</h3>
      <p>
        1. Prodávající odpovídá kupujícímu, že zboží při převzetí nemá vady a že odpovídá ujednanému popisu, jakosti a množství.
      </p>
      <p>
        2. Spotřebitel je oprávněn uplatnit právo z vady, která se vyskytne u spotřebního zboží v době <b>24 měsíců</b> od převzetí. Projeví-li se vada v průběhu jednoho roku od převzetí, má se za to, že zboží bylo vadné již při převzetí.
      </p>
      <p>
        3. V případě vady má spotřebitel právo požadovat odstranění vady (opravou nebo dodáním nové věci bez vady), přiměřenou slevu z kupní ceny, nebo od smlouvy odstoupit, pokud je vada podstatným porušením smlouvy.
      </p>
      <p>
        4. Reklamace včetně odstranění vady musí být vyřízena a spotřebitel o tom musí být informován nejpozději do <b>30 dnů</b> ode dne uplatnění reklamace, pokud se prodávající se spotřebitelem nedohodne na delší lhůtě.
      </p>

      <h3>VIII. Mimosoudní řešení spotřebitelských sporů (ADR)</h3>
      <p>
        K mimosoudnímu řešení spotřebitelských sporů z kupní smlouvy je příslušná <b>Česká obchodní inspekce</b>, se sídlem Štěpánská 567/15, 120 00 Praha 2, IČO: 000 20 869, internetová adresa: <a href="https://www.coi.cz" target="_blank" rel="noreferrer" className="linkish">https://www.coi.cz</a> nebo <a href="https://adr.coi.cz" target="_blank" rel="noreferrer" className="linkish">https://adr.coi.cz</a>. Spotřebitel může využít rovněž platformu pro řešení sporů on-line zřízenou Evropskou komisí na adrese <a href="http://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer" className="linkish">http://ec.europa.eu/consumers/odr</a>.
      </p>

      <h3>IX. Transparentnost a ověřování uživatelských recenzí</h3>
      <p>
        V souladu se směrnicí Omnibus a novelou zákona o ochraně spotřebitele prodávající informuje, že veškerá hodnocení a recenze produktů zobrazované v e-shopu pocházejí výhradně od ověřených kupujících, kteří dané zboží v internetovém obchodě skutečně zakoupili po přihlášení ke svému uživatelskému účtu.
      </p>

      <h3>X. Ochrana osobních údajů</h3>
      <p>
        Zpracování osobních údajů kupujícího se řídí Nařízením Evropského parlamentu a Rady (EU) 2016/679 (GDPR) a zákonem č. 110/2019 Sb., o zpracování osobních údajů. Podrobné informace jsou uvedeny v samostatném dokumentu <Link to="/ochrana-udaju" className="linkish">Zásady ochrany osobních údajů</Link>.
      </p>

      <h3>XI. Závěrečná ustanovení</h3>
      <p>
        Vztahy a případné spory, které vzniknou na základě smlouvy, budou řešeny výhradně podle práva České republiky a budou řešeny věcně a místně příslušnými soudy ČR. Kupní smlouva je archivována prodávajícím v elektronické podobě a není přístupná třetím osobám.
      </p>
    </Box>
  );
}

export function Privacy() {
  const { settings } = useStore();
  const company = settings.store_company || settings.store_name || "KAVKA Ateliér s.r.o.";
  const ico = settings.store_ico || "19200456";
  const dic = settings.store_dic || "CZ19200456";
  const address = settings.store_address || "Korunní 42, 120 00 Praha 2 - Vinohrady";
  const email = settings.store_email || "ahoj@kavka.shop";
  const phone = settings.store_phone || "+420 777 123 456";

  return (
    <Box title="Ochrana osobních údajů (GDPR)">
      <p style={{ fontSize: 14, color: "var(--muted)" }}>
        Informace o zpracování osobních údajů v souladu s Nařízením Evropského parlamentu a Rady (EU) 2016/679 o ochraně fyzických osob v souvislosti se zpracováním osobních údajů (GDPR) a zákonem č. 110/2019 Sb., o zpracování osobních údajů.
      </p>

      <h3>1. Správce osobních údajů</h3>
      <div className="legal-card glass-card" style={{ padding: 14, borderRadius: 12, fontSize: 14 }}>
        <strong>Správce:</strong> {company}
        <br />
        Sídlo: {address}
        <br />
        IČO: {ico} | DIČ: {dic}
        <br />
        E-mail: <a href={`mailto:${email}`} className="linkish">{email}</a> | Telefon: {phone}
      </div>

      <h3>2. Jaké osobní údaje zpracováváme</h3>
      <p>Zpracováváme pouze údaje, které nám sami poskytnete v souvislosti s nákupem nebo registrací:</p>
      <ul>
        <li><b>Identifikační údaje:</b> Jméno, příjmení, název firmy, IČO a DIČ (při nákupu na firmu).</li>
        <li><b>Kontaktní údaje:</b> E-mailová adresa, telefonní číslo, fakturační adresa a doručovací adresa.</li>
        <li><b>Údaje o objednávkách a platbách:</b> Objednané položky, zvolený způsob dopravy a platby, historie nákupů, číslo bankovního účtu pro vrácení platby.</li>
        <li><b>Síťové identifikátory:</b> IP adresa, HTTP-only session cookies a technické cookies nutné pro funkčnost košíku.</li>
      </ul>

      <h3>3. Právní základy a účely zpracování</h3>
      <table style={{ width: "100%", fontSize: 14, margin: "14px 0" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", width: "45%" }}>Účel zpracování</th>
            <th style={{ textAlign: "left" }}>Právní titul (čl. 6 GDPR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <b>Vyřízení objednávky a doručení zboží:</b> Uzavření a plnění kupní smlouvy, komunikace o stavu zásilky, vystavení daňového dokladu.
            </td>
            <td style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              Plnění smlouvy (čl. 6 odst. 1 písm. b)
            </td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <b>Plnění zákonných účetních a daňových povinností:</b> Vedení účetnictví, archivace faktur dle zákona o DPH a zákona o účetnictví.
            </td>
            <td style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              Plnění právní povinnosti (čl. 6 odst. 1 písm. c)
            </td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <b>Ochrana právních nároků a vymáhání pohledávek:</b> Řešení reklamací, obrana před právními spory a evidence objednávek.
            </td>
            <td style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              Oprávněný zájem správce (čl. 6 odst. 1 písm. f)
            </td>
          </tr>
          <tr>
            <td style={{ padding: "8px 0" }}>
              <b>Statistické a preferenční cookies:</b> Anonymní vyhodnocování návštěvnosti a zapamatování voleb.
            </td>
            <td style={{ padding: "8px 0" }}>
              Souhlas subjektu údajů (čl. 6 odst. 1 písm. a)
            </td>
          </tr>
        </tbody>
      </table>

      <h3>4. Doba uchování osobních údajů</h3>
      <p>
        Osobní údaje uchováváme po dobu nezbytnou k výkonu práv a povinností vyplývajících ze smluvního vztahu a po dobu záruční lhůty (2 roky). Daňové doklady a faktury uchováváme v souladu s § 35 zákona č. 235/2004 Sb., o dani z přidané hodnoty, po dobu <b>10 let</b> od konce zdaňovacího období, ve kterém se plnění uskutečnilo.
      </p>

      <h3>5. Příjemci osobních údajů a zpracovatelé</h3>
      <p>
        Vaše osobní údaje předáváme výhradně prověřeným smluvním partnerům, kteří se podílejí na vyřízení vaší objednávky:
      </p>
      <ul>
        <li><b>Dopravní společnosti:</b> Packeta s.r.o. (Zásilkovna), Česká pošta s.p. (Balíkovna) a smluvní kurýrní služby — za účelem doručení balíčku.</li>
        <li><b>Technologická infrastruktura:</b> Cloudflare, Inc. (zabezpečený cloudový hosting a databázový systém D1 na serverech v EU).</li>
        <li><b>Externí účetní a daňoví poradci:</b> Pro plnění zákonných daňových a účetních povinností.</li>
      </ul>
      <p>Osobní údaje nejsou předávány do třetích zemí mimo Evropskou unii bez odpovídajících záruk.</p>

      <h3>6. Vaše práva podle GDPR</h3>
      <p>Jako subjekt údajů máte podle obecného nařízení o ochraně osobních údajů tato práva:</p>
      <ul>
        <li><b>Právo na přístup k údajům:</b> Můžete požadovat informaci, jaké vaše údaje zpracováváme.</li>
        <li><b>Právo na opravu:</b> Máte právo na opravu nepřesných nebo neúplných údajů.</li>
        <li><b>Právo na výmaz (právo být zapomenut):</b> Můžete požádat o smazání údajů, pokud pominul důvod pro jejich zpracování a nebrání tomu zákonná archivační povinnost.</li>
        <li><b>Právo na omezení zpracování:</b> V případech stanovených v čl. 18 GDPR.</li>
        <li><b>Právo na přenositelnost údajů:</b> Získat své údaje ve strukturovaném, běžně používaném formátu.</li>
        <li><b>Právo vznést námitku:</b> Proti zpracování na základě oprávněného zájmu.</li>
        <li>
          <b>Právo podat stížnost:</b> Máte právo obrátit se na dozorový úřad: <b>Úřad pro ochranu osobních údajů (ÚOOÚ)</b>, Pplk. Sochora 27, 170 00 Praha 7, web: <a href="https://www.uoou.gov.cz" target="_blank" rel="noreferrer" className="linkish">www.uoou.gov.cz</a>.
        </li>
      </ul>

      <h3>7. Zabezpečení údajů</h3>
      <p>
        Veškerá komunikace s e-shopem je šifrována pomocí protokolu HTTPS/TLS. Uživatelská hesla nikdy neukládáme v otevřeném tvaru, ale výhradně jako bezpečný kryptografický otisk PBKDF2 s unikátní solí. Relace je chráněna pomocí HTTP-only a SameSite cookies.
      </p>

      <h3>8. Soubory cookies</h3>
      <p>
        E-shop využívá technické cookies nezbytné pro udržení obsahu nákupního košíku a přihlášení. Volitelné analytické a preferenční cookies můžete kdykoli spravovat nebo odvolat svůj souhlas.
      </p>
      <button type="button" className="btn-line" onClick={openCookieSettings} style={{ marginTop: 8 }}>
        <IconCookie size={16} /> Upravit nastavení cookies
      </button>
    </Box>
  );
}

export function Returns() {
  const { settings, toast } = useStore();
  const company = settings.store_company || settings.store_name || "KAVKA Ateliér s.r.o.";
  const returnAddress = settings.store_return_address || settings.store_address || "KAVKA Ateliér (reklamace a vrácení), Korunní 42, 120 00 Praha 2";
  const email = settings.store_email || "ahoj@kavka.shop";
  const phone = settings.store_phone || "+420 777 123 456";

  // Interaktivní formulář pro odstoupení od smlouvy
  const [wForm, setWForm] = useState({
    orderNumber: "",
    orderDate: "",
    deliveryDate: "",
    name: "",
    address: "",
    email: "",
    phone: "",
    bankAccount: "",
    items: "",
  });

  // Interaktivní reklamační formulář
  const [cForm, setCForm] = useState({
    orderNumber: "",
    name: "",
    contact: "",
    productName: "",
    defectDescription: "",
    preferredSolution: "repair",
    bankAccount: "",
  });

  function copyWithdrawalText() {
    const text = `OZNÁMENÍ O ODSTOUPENÍ OD KUPNÍ SMLOUVY
Adresát: ${company}, ${returnAddress}, e-mail: ${email}

Tímto oznamuji, že odstupuji od smlouvy o nákupu tohoto zboží:
Zboží: ${wForm.items || "[název a počet kusů]"}
Číslo objednávky: ${wForm.orderNumber || "[číslo objednávky]"}
Datum objednání: ${wForm.orderDate || "[datum]"}
Datum převzetí: ${wForm.deliveryDate || "[datum]"}

Jméno a příjmení spotřebitele: ${wForm.name || "[jméno a příjmení]"}
Adresa spotřebitele: ${wForm.address || "[adresa]"}
E-mail: ${wForm.email || "[e-mail]"}
Telefon: ${wForm.phone || "[telefon]"}

Peníze za zboží a nejlevnější dopravu prosím zašlete na bankovní účet: ${wForm.bankAccount || "[číslo účtu / kód banky]"}

Datum: ${new Date().toLocaleDateString("cs-CZ")}`;

    navigator.clipboard?.writeText(text);
    toast("Text formuláře byl zkopírován do schránky.");
  }

  function printWithdrawal() {
    window.print();
  }

  return (
    <Box title="Reklamace a vrácení zboží">
      <p>
        Záleží nám na tom, aby vám věci z našeho ateliéru dělaly radost. Pokud zboží nesplnilo vaše očekávání nebo se vyskytla vada, vše vyřešíme rychle a bez zbytečných průtahů.
      </p>

      {/* Rychlý přehled postupu */}
      <div className="trust" style={{ margin: "24px 0" }}>
        <article>
          <IconWrap className="accent"><IconScale /></IconWrap>
          <h3>14 dní na vrácení</h3>
          <p>Máte 14 kalendářních dnů od převzetí na vyzkoušení a vrácení zboží bez udání důvodu.</p>
        </article>
        <article>
          <IconWrap className="accent"><IconShield /></IconWrap>
          <h3>Záruka 24 měsíců</h3>
          <p>Zákonná záruka na vady zboží pro spotřebitele s vyřízením nejpozději do 30 dnů.</p>
        </article>
        <article>
          <IconWrap className="accent"><IconShop /></IconWrap>
          <h3>Ateliér na Vinohradech</h3>
          <p>Balíček můžete přinést i osobně do našeho ateliéru na Korunní 42 v Praze.</p>
        </article>
      </div>

      <div className="legal-box glass-card" style={{ padding: 18, borderRadius: 16, border: "1px solid var(--line)", margin: "20px 0" }}>
        <h3 style={{ margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 }}>
          <IconPin size={18} /> Adresa pro zaslání reklamovaného / vráceného zboží:
        </h3>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>
          {returnAddress}
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--muted)" }}>
          E-mail pro avízo o odeslání balíčku: <a href={`mailto:${email}`} className="linkish">{email}</a> · Tel: {phone}
        </p>
      </div>

      <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "36px 0" }} />

      {/* SEKCE 1: ODSTOUPENÍ OD SMLOUVY VE 14DNECH */}
      <h2>1. Vrácení zboží ve 14denní lhůtě (odstoupení od smlouvy)</h2>
      <p>
        Jako spotřebitel máte právo odstoupit od smlouvy do 14 dnů od převzetí zboží. Zboží zabalte do bezpečného obalu a zašlete na naši adresu výše nebo přineste osobně. Peníze vám vrátíme na bankovní účet do 14 dnů od obdržení vráceného zboží.
      </p>

      {/* Interaktivní formulář pro odstoupení */}
      <div className="form glass-card" style={{ margin: "20px 0", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <h3 className="serif" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <IconFileText size={20} /> Vzorový formulář pro odstoupení od smlouvy
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-line btn-sm" onClick={copyWithdrawalText}>
              Kopírovat text
            </button>
            <button type="button" className="btn-dark btn-sm" onClick={printWithdrawal}>
              <IconPrinter size={14} /> Vytisknout
            </button>
          </div>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 14px" }}>
          (dle nařízení vlády č. 363/2013 Sb. — formulář můžete vyplnit a vytisknout, nebo zkopírovat a poslat e-mailem)
        </p>

        <div className="form-grid-2">
          <label>
            Číslo objednávky (KAV-…)
            <input
              value={wForm.orderNumber}
              onChange={(e) => setWForm({ ...wForm, orderNumber: e.target.value })}
              placeholder="např. KAV-8492"
            />
          </label>
          <label>
            Číslo bankovního účtu pro vrácení peněz
            <input
              value={wForm.bankAccount}
              onChange={(e) => setWForm({ ...wForm, bankAccount: e.target.value })}
              placeholder="např. 123456789/0800"
            />
          </label>
        </div>

        <div className="form-grid-2">
          <label>
            Datum objednání
            <input
              type="date"
              value={wForm.orderDate}
              onChange={(e) => setWForm({ ...wForm, orderDate: e.target.value })}
            />
          </label>
          <label>
            Datum převzetí zboží
            <input
              type="date"
              value={wForm.deliveryDate}
              onChange={(e) => setWForm({ ...wForm, deliveryDate: e.target.value })}
            />
          </label>
        </div>

        <div className="form-grid-2">
          <label>
            Jméno a příjmení spotřebitele
            <input
              value={wForm.name}
              onChange={(e) => setWForm({ ...wForm, name: e.target.value })}
              placeholder="Jan Novák"
            />
          </label>
          <label>
            E-mail a telefon
            <input
              value={wForm.email}
              onChange={(e) => setWForm({ ...wForm, email: e.target.value })}
              placeholder="jan.novak@email.cz, +420 777 123 456"
            />
          </label>
        </div>

        <label>
          Adresa spotřebitele (ulice, město, PSČ)
          <input
            value={wForm.address}
            onChange={(e) => setWForm({ ...wForm, address: e.target.value })}
            placeholder="Ulice 12, 100 00 Město"
          />
        </label>

        <label>
          Vracené položky (název a počet kusů)
          <textarea
            rows={2}
            value={wForm.items}
            onChange={(e) => setWForm({ ...wForm, items: e.target.value })}
            placeholder="např. Keramický hrnek Hlína (1 ks), Vlněná deka Ovce (1 ks)"
          />
        </label>
      </div>

      <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "36px 0" }} />

      {/* SEKCE 2: REKLAMACE ZBOŽÍ */}
      <h2>2. Reklamace vady zboží (Reklamační řád)</h2>
      <p>
        Pokud se na zboží v průběhu 24 měsíců projeví výrobní nebo materiálová vada, máte právo zboží reklamovat.
        Reklamaci vyřídíme bez zbytečného odkladu, nejpozději do <b>30 kalendářních dnů</b>.
      </p>
      <ul>
        <li>Zboží bezpečně zabalte a přiložte popis vady a kontakt na vás.</li>
        <li>Zašlete balíček na adresu: <b>{returnAddress}</b>.</li>
        <li>O průběhu a výsledku reklamace vás budeme informovat e-mailem a SMS.</li>
      </ul>

      {/* Interaktivní reklamační protokol */}
      <div className="form glass-card" style={{ margin: "20px 0", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <h3 className="serif" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <IconShield size={20} /> Vzorový reklamační protokol
          </h3>
          <button type="button" className="btn-dark btn-sm" onClick={() => window.print()}>
            <IconPrinter size={14} /> Vytisknout protokol
          </button>
        </div>

        <div className="form-grid-2" style={{ marginTop: 12 }}>
          <label>
            Číslo objednávky / faktury
            <input
              value={cForm.orderNumber}
              onChange={(e) => setCForm({ ...cForm, orderNumber: e.target.value })}
              placeholder="např. KAV-8492"
            />
          </label>
          <label>
            Jméno a příjmení zákazníka
            <input
              value={cForm.name}
              onChange={(e) => setCForm({ ...cForm, name: e.target.value })}
              placeholder="Jan Novák"
            />
          </label>
        </div>

        <div className="form-grid-2">
          <label>
            Kontaktní e-mail a telefon
            <input
              value={cForm.contact}
              onChange={(e) => setCForm({ ...cForm, contact: e.target.value })}
              placeholder="jan@novak.cz, 777 123 456"
            />
          </label>
          <label>
            Reklamovaný produkt
            <input
              value={cForm.productName}
              onChange={(e) => setCForm({ ...cForm, productName: e.target.value })}
              placeholder="např. Dubový tác"
            />
          </label>
        </div>

        <label>
          Podrobný popis vady
          <textarea
            rows={3}
            value={cForm.defectDescription}
            onChange={(e) => setCForm({ ...cForm, defectDescription: e.target.value })}
            placeholder="Popište, jak se vada projevuje a kdy k ní došlo…"
          />
        </label>

        <div className="form-grid-2">
          <label>
            Požadovaný způsob vyřízení
            <select
              value={cForm.preferredSolution}
              onChange={(e) => setCForm({ ...cForm, preferredSolution: e.target.value })}
            >
              <option value="repair">Bezplatná oprava zboží</option>
              <option value="exchange">Výměna za nový bezvadný kus</option>
              <option value="discount">Přiměřená sleva z kupní ceny</option>
              <option value="refund">Odstoupení od smlouvy a vrácení peněz</option>
            </select>
          </label>
          <label>
            Číslo účtu pro případné vrácení peněz
            <input
              value={cForm.bankAccount}
              onChange={(e) => setCForm({ ...cForm, bankAccount: e.target.value })}
              placeholder="Číslo účtu / kód banky"
            />
          </label>
        </div>
      </div>
    </Box>
  );
}
