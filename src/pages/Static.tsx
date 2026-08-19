import { Link } from "react-router-dom";
import { useStore } from "../store";

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="wrap" style={{ maxWidth: 760, padding: "28px 20px 80px" }}>
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
        Nesnažíme se být marketplace. Sklad vedeme po kusech, fotky nahráváme do vlastního R2, data sedí v D1.
      </p>
      <p>
        Ateliér: {settings.store_address}
        <br />
        {settings.store_hours}
        <br />
        {settings.store_email} · {settings.store_phone}
      </p>
    </Box>
  );
}

export function ShippingInfo() {
  return (
    <Box title="Doprava a platba">
      <h3>Doprava</h3>
      <ul>
        <li>
          <b>Zásilkovna Z-BOX</b> — na pokladně otevřete mapu a vyberete konkrétní box. Nonstop výdej.
        </li>
        <li>
          <b>Zásilkovna výdejní místo</b> — pobočka, opět výběr na mapě.
        </li>
        <li>
          <b>Balíkovna</b> — pošta, trafika, box. Místa spravujeme v administraci (nevoláme živé API dopravce — vše běží u vás na Cloudflare).
        </li>
        <li>
          <b>Na adresu</b> — kurýr ke dveřím.
        </li>
        <li>
          <b>Osobní odběr</b> — Vinohrady, ateliér.
        </li>
      </ul>
      <h3>Platba</h3>
      <ul>
        <li>Bankovní převod s QR (SPD) — bez Stripe, bez PayPalu, jen váš účet.</li>
        <li>Dobírka (ne u Z-BOXu).</li>
        <li>Kartou při převzetí.</li>
        <li>Hotově při osobním odběru.</li>
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
      <p>Reklamace řešíme podle občanského zákoníku. Napište na e-mail uvedený v patičce a přiložte číslo objednávky.</p>
    </Box>
  );
}

export function Privacy() {
  return (
    <Box title="Ochrana údajů">
      <p>
        Zpracováváme jméno, e-mail, telefon, adresu a historii objednávek proto, abychom objednávku splnili. Data leží v
        Cloudflare D1 ve vašem účtu. Hesla ukládáme jen jako PBKDF2 otisk. Relace je v HTTP-only cookie. Fotky produktů
        mohou být v R2.
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
