import { Link } from "react-router-dom";
import { IconLocker, IconParcel, IconPin, IconShop, IconTruck, IconWrap } from "../components/Icons";
import { useStore } from "../store";

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="wrap prose-page">
      <div className="crumbs">
        <Link to="/">Domů</Link> / {title}
      </div>
      <h1 className="serif">{title}</h1>
      <div className="desc">{children}</div>
    </div>
  );
}

export function About() {
  const { settings } = useStore();
  return (
    <Box title="O nás">
      <p>
        {settings.store_name || "KAVKA"} je malý obchod s věcmi, které mají váhu v ruce. Keramika, len, dřevo, vůně lesa.
        Nesnažíme se být marketplace. Sklad vedeme po kusech, fotky nahráváme do vlastního úložiště, data sedí u vás.
      </p>
      <p>
        Ateliér: {settings.store_address}
        <br />
        {settings.store_hours}
        <br />
        {settings.store_email} · {settings.store_phone}
      </p>
      <p>Zastavte se na Vinohrady, nebo si nechte balíček poslat. Kavka doletí.</p>
    </Box>
  );
}

export function ShippingInfo() {
  return (
    <Box title="Doprava a platba">
      <p>Na pokladně si vyberete způsob a u výdejen otevřete živou mapu dopravce — ne kreslenou náhradu.</p>
      <h3>Doprava</h3>
      <ul className="info-list">
        <li>
          <IconWrap>
            <IconLocker />
          </IconWrap>
          <span>
            <b>Zásilkovna Z-BOX</b> — oficiální mapa Packety. Nonstop výdej, od 59 Kč, nad 1 500 Kč zdarma.
          </span>
        </li>
        <li>
          <IconWrap>
            <IconPin />
          </IconWrap>
          <span>
            <b>Zásilkovna výdejní místo</b> — pobočka z widgetu Packety. Aktuální otevírací doba přímo od dopravce.
          </span>
        </li>
        <li>
          <IconWrap>
            <IconParcel />
          </IconWrap>
          <span>
            <b>Balíkovna</b> — živá mapa České pošty (pošta, trafika, box). Kliknete „Vyzvednout zde“ a místo se uloží k objednávce.
          </span>
        </li>
        <li>
          <IconWrap>
            <IconTruck />
          </IconWrap>
          <span>
            <b>Na adresu</b> — kurýr ke dveřím. Vyplníte ulici, město a PSČ.
          </span>
        </li>
        <li>
          <IconWrap>
            <IconShop />
          </IconWrap>
          <span>
            <b>Osobní odběr</b> — ateliér na Vinohradech, zítra od desíti.
          </span>
        </li>
      </ul>
      <h3>Platba</h3>
      <ul>
        <li>Bankovní převod s QR (SPD) — po odeslání objednávky, bez cizí brány.</li>
        <li>Dobírka (ne u Z-BOXu).</li>
        <li>Kartou při převzetí.</li>
        <li>Hotově v ateliéru.</li>
      </ul>
    </Box>
  );
}

export function Terms() {
  return (
    <Box title="Obchodní podmínky">
      <p>
        Tyto stránky jsou ukázkový e-shop. Prodávajícím je provozovatel nasazený na Cloudflare Pages. Odesláním objednávky
        vzniká kupní smlouva. Zboží zůstává v našem vlastnictví do zaplacení. Spotřebitel má právo odstoupit do 14 dnů od
        převzetí, pokud nejde o zboží vyrobené na zakázku.
      </p>
      <p>Reklamace řešíme podle občanského zákoníku. Napište na e-mail v patičce a přiložte číslo objednávky.</p>
    </Box>
  );
}

export function Privacy() {
  return (
    <Box title="Ochrana údajů">
      <p>
        Zpracováváme jméno, e-mail, telefon, adresu a historii objednávek proto, abychom objednávku splnili. Data leží v
        Cloudflare D1 ve vašem účtu. Hesla ukládáme jen jako PBKDF2 otisk. Relace je v HTTP-only cookie.
      </p>
      <p>
        Při výběru výdejního místa se načte oficiální mapa Packety nebo České pošty. Tyto služby běží na jejich serverech
        a mohou zpracovat polohu, pokud ji v mapě povolíte.
      </p>
      <p>Žádné Google Analytics, žádný Facebook pixel, žádný cizí platební skript.</p>
    </Box>
  );
}

export function Returns() {
  return (
    <Box title="Reklamace a vrácení">
      <p>
        Zboží pošlete zpět v původním stavu. Po kontrole vrátíme peníze stejným způsobem, jakým jste platili — u převodu
        na účet, ze kterého platba přišla. Správce ve stavu objednávky nastaví „Stornovaná“, sklad se vrátí automaticky.
      </p>
    </Box>
  );
}
