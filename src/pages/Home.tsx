import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Category, type Product } from "../api";
import {
  IconArrow,
  IconBuilding,
  IconCard,
  IconCheck,
  IconClock,
  IconGift,
  IconLeaf,
  IconLocker,
  IconMail,
  IconParcel,
  IconPhone,
  IconPin,
  IconQr,
  IconSearch,
  IconShield,
  IconSpark,
  IconTruck,
  IconWrap,
} from "../components/Icons";
import { ProductCard } from "../components/ProductCard";
import { Reveal } from "../components/Reveal";
import { cheapestPickup, czk, pickupFreeOver, shippingByKind } from "../format";
import { useStore } from "../store";
import { useSeo } from "../title";

export function Home() {
  const { settings, shipping } = useStore();
  const storeName = settings.store_name || "KAVKA";
  useSeo({
    title: `${storeName} — E-shop platforma | Živá ukázka k pronájmu i prodeji`,
    description:
      "Živá ukázka českého e-shopu KAVKA. Moderní e-shop jako SaaS na Cloudflare — Zásilkovna, Z-BOX, Balíkovna s živou mapou, QR platby, sklad, kupóny, admin. Pronájem nebo prodej na klíč.",
    image: "/hero.jpg",
  });
  const freeOver = pickupFreeOver(shipping);
  const zbox = shippingByKind(shipping, "pickup_zbox");
  const cheap = cheapestPickup(shipping);
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.all([
      api<Category[]>("/categories").then(setCats),
      api<{ items: Product[] }>("/products?featured=1&limit=8").then((r) => setItems(r.items)),
    ]).finally(() => setReady(true));
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "KAVKA — E-shop platforma",
    url: typeof window !== "undefined" ? window.location.origin : undefined,
    logo: "/favicon.svg",
    email: settings.store_email || "ahoj@kavka.shop",
    telephone: settings.store_phone || "+420777123456",
    description: "Česká e-shop platforma jako SaaS. Živá ukázka obchodu s keramikou a lnem, kterou si lze pronajmout nebo koupit.",
    address: {
      "@type": "PostalAddress",
      streetAddress: settings.store_address || "Korunní 42",
      addressLocality: "Praha",
      addressCountry: "CZ",
    },
  };

  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "KAVKA",
    applicationCategory: "ECommerceApplication",
    operatingSystem: "Cloudflare Pages, D1, R2",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "490",
      highPrice: "29900",
      priceCurrency: "CZK",
    },
    description: "Hotový český e-shop na Cloudflare. SaaS pronájem nebo jednorázový prodej s administrací, mapami dopravců a QR platbami.",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />

      {/* HERO — prezentace platformy + živá ukázka */}
      <section className="hero hero-saas">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="wrap hero-copy">
          <div className="saas-badge">
            <span className="saas-dot" /> ŽIVÁ UKÁZKA E-SHOPU · SAAS PLATFORMA KAVKA · CLOUDFARE STACK
          </div>
          <h1>
            Takto může
            <br />
            vypadat <em>váš</em>
            <br />
            nový e-shop.
          </h1>
          <p className="lead">
            Prohlížíte si <b>živou ukázku platformy KAVKA</b> — hotový český e-shop, který vám nasadíme s vaším logem, produkty a doménou. Stačí naplnit zbožím.
            <span style={{ display: "block", marginTop: 8, color: "var(--ink-soft)", fontSize: 15 }}>
              Zásilkovna a Balíkovna s živou mapou, QR platby, kupóny, sklad i admin. Běží jen na Cloudflare — rychle, levně, bez provizí.
            </span>
          </p>
          <div className="hero-actions">
            <a href="#nabidka" className="btn">
              Chci e-shop KAVKA <IconArrow size={16} />
            </a>
            <Link className="btn-line" to="/katalog">
              Projít ukázkový katalog
            </Link>
          </div>
          <div className="hero-pills">
            {zbox ? (
              <span>
                <IconLocker size={16} /> {zbox.name} od {czk(zbox.price)}
              </span>
            ) : cheap ? (
              <span>
                <IconLocker size={16} /> {cheap.name} od {czk(cheap.price)}
              </span>
            ) : (
              <span>
                <IconLocker size={16} /> Výdejní místa s mapou
              </span>
            )}
            <span>
              <IconPin size={16} /> živá mapa Packety
            </span>
            <span>
              <IconParcel size={16} /> Balíkovna ČP
            </span>
            <span>
              <IconQr size={16} /> QR platba SPD
            </span>
          </div>
          <div className="hero-trust-row">
            <span>
              <IconShield size={14} /> GDPR ready
            </span>
            <span>
              <IconTruck size={14} /> Z-BOX · Zásilkovna · Balíkovna
            </span>
            <span>
              <IconCard size={14} /> Dobírka i karta
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <img src="/hero.jpg" alt="Zátiší KAVKA — keramika, len a dřevo — ukázkový e-shop" />
          <div className="hero-chip glass-card">
            <IconSpark size={16} />
            <span>
              {freeOver ? `V ukázce: nad ${czk(freeOver)} výdejní místa zdarma` : "Demo: výdejní místo vyberete na živé mapě"}
            </span>
          </div>
          <div className="hero-demo-label">
            <span>UKÁZKOVÝ OBCHOD</span>
            <small>keramika · len · dřevo</small>
          </div>
        </div>
      </section>

      {/* Demo notice — jak vyzkoušet */}
      <section className="demo-notice-wrap">
        <div className="wrap">
          <div className="demo-notice glass-card">
            <div className="demo-notice-icon">
              <IconSearch size={20} />
            </div>
            <div className="demo-notice-text">
              <b>Jste v DEMO režimu — vše si můžete vyzkoušet nanečisto</b>
              <span>
                Vložte zboží do košíku, otevřete pokladnu, vyberte Z-BOX na živé mapě, dokončete objednávku. Nic se neodesílá, žádný e-mail nechodí. Chcete admin? Přihlaste se jako{" "}
                <code>admin@kavka.shop / KavkaAdmin123</code> nebo jako zákaznice <code>anna@example.com / Anna12345</code>.
              </span>
            </div>
            <Link to="/admin" className="btn-line btn-sm" style={{ whiteSpace: "nowrap" }}>
              Otevřít demo admin →
            </Link>
          </div>
        </div>
      </section>

      {/* Logos / social proof bar */}
      <section className="proof-bar">
        <div className="wrap">
          <div className="proof-bar-in">
            <span className="kicker" style={{ color: "var(--muted)" }}>
              Postaveno pro český trh
            </span>
            <div className="proof-logos">
              <span>Zásilkovna</span>
              <span>Z-BOX</span>
              <span>Balíkovna</span>
              <span>Česká pošta</span>
              <span>Cloudflare</span>
              <span>ARES</span>
              <span>SPD QR</span>
            </div>
          </div>
        </div>
      </section>

      {/* Proč KAVKA — SaaS výhody */}
      <section className="section saas-features" id="funkce">
        <div className="wrap">
          <Reveal>
            <div className="section-head" style={{ alignItems: "flex-start" }}>
              <div>
                <div className="kicker" style={{ color: "var(--accent)" }}>
                  Proč KAVKA pro váš byznys
                </div>
                <h2>
                  Hotový e-shop.
                  <br />
                  Bez měsíčních provizí a bez agentury.
                </h2>
                <p style={{ color: "var(--ink-soft)", maxWidth: 560, marginTop: 8 }}>
                  Nekupujete šablonu. Pronajímáte si <b>provozovaný e-shop na Cloudflare</b> — Pages + D1 + R2. My se staráme o běh, vy prodáváte. Nebo ho odkoupíte na klíč a běží na vašem účtu.
                </p>
              </div>
              <a href="#nabidka" className="btn-line desktop-only">
                Nezávazná konzultace zdarma <IconArrow size={16} />
              </a>
            </div>
          </Reveal>
          <div className="saas-grid">
            {[
              {
                icon: <IconTruck />,
                title: "Dopravci s živou mapou",
                text: "Z-BOX i Zásilkovna přes oficiální widget Packety, Balíkovna přes mapu České pošty. Zákazník vidí skutečná místa, ne statický seznam. Záložní mapa z vaší DB.",
              },
              {
                icon: <IconQr />,
                title: "Platby, které Češi čekají",
                text: "Bankovní převod s QR (SPD) zdarma, dobírka, karta při převzetí, hotově v prodejně. IBAN si nastavíte v adminu, QR se generuje automaticky.",
              },
              {
                icon: <IconLeaf />,
                title: "Sklad do kusu, bez překvapení",
                text: "Co je skladem, to prodáte. Objednávka rezervuje kusy, storno je vrátí. Nízký stav hlídá admin. Pohyby skladu s důvodem.",
              },
              {
                icon: <IconShield />,
                title: "Česká legislativa v základu",
                text: "Obchodní podmínky, GDPR, reklamace, 14 dní na vrácení — vzory jsou připravené a napojené na vaše IČO/DIČ, sídlo a fakturaci včetně ARES.",
              },
              {
                icon: <IconGift />,
                title: "Kupóny a věrnost hned",
                text: "Slevové kódy (KAVKA10, VITEJ150…), minimální košík, omezení počtu použití. Slevu počítá server, ne frontend.",
              },
              {
                icon: <IconBuilding />,
                title: "Admin v češtině, bez školení",
                text: "Produkty, kategorie, objednávky, zákazníci, doprava, platby, fotky do R2, IBAN, recenze ke schválení. Vše na /admin.",
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 60} className="reveal-cell">
                <article className="glass-card saas-card">
                  <IconWrap className="accent">{item.icon}</IconWrap>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="saas-stats">
              <div>
                <b>~0,08 s</b>
                <span>načtení na Cloudflare Edge</span>
              </div>
              <div>
                <b>0 %</b>
                <span>provize z tržby</span>
              </div>
              <div>
                <b>100 %</b>
                <span>v češtině + GDPR vzory</span>
              </div>
              <div>
                <b>24 h</b>
                <span>nasazení s vaším logem</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Kategorie — ukázkový katalog */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <div>
                <div className="kicker">Ukázkový katalog — naplňte svým zbožím</div>
                <h2>Místnosti domu — demo kategorie</h2>
                <p style={{ color: "var(--muted)", margin: "6px 0 0", fontSize: 14 }}>
                  Fiktivní produkty (keramika, len, dřevo) tu jsou jen pro ilustraci. V ostrém obchodě je nahradíte svými — s vlastními fotkami v R2, cenami a skladem.
                </p>
              </div>
              <Link className="text-link" to="/katalog">
                Celý ukázkový obchod <IconArrow size={16} />
              </Link>
            </div>
          </Reveal>
          <div className="cats">
            {!ready
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="cat-card">
                    <div className="skel" style={{ height: 140 }} />
                    <span>
                      <span className="skel" style={{ height: 18, width: 90, display: "block" }} />
                    </span>
                  </div>
                ))
              : cats.map((c, i) => (
                  <Reveal key={c.id} delay={(i % 5) * 60} className="reveal-cell">
                    <Link to={`/katalog/${c.slug}`} className="cat-card">
                      <img src={c.image || "/products/vaza.jpg"} alt={c.name} loading="lazy" />
                      <span>{c.name}</span>
                    </Link>
                  </Reveal>
                ))}
          </div>
        </div>
      </section>

      {/* Produkty — demo */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <div>
                <div className="kicker">Teď v ukázkovém ateliéru</div>
                <h2>Ukázkové produkty — zkuste košík i pokladnu</h2>
              </div>
              <Link className="text-link" to="/katalog">
                Všechny kousky <IconArrow size={16} />
              </Link>
            </div>
          </Reveal>
          <div className="grid-products">
            {!ready
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="pcard">
                    <div className="skel" style={{ aspectRatio: "1" }} />
                    <div className="pcard-body">
                      <div className="skel" style={{ height: 12, width: 72 }} />
                      <div className="skel" style={{ height: 22, width: "65%" }} />
                    </div>
                  </div>
                ))
              : items.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
          </div>
          <Reveal>
            <div className="demo-try">
              <span>
                Tip: V košíku zkuste kupón <code>KAVKA10</code> nebo <code>VITEJ150</code>, na pokladně přepněte dopravu a otevřete živou mapu.
              </span>
              <Link to="/kosik" className="text-link" style={{ whiteSpace: "nowrap" }}>
                Otevřít košík <IconArrow size={16} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Co je uvnitř — tech stack */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="saas-tech glass-card">
            <div className="saas-tech-copy">
              <div className="kicker">Technologie, které vám neutečou z účtu</div>
              <h2>Běží jen na Cloudflare.</h2>
              <p style={{ color: "var(--ink-soft)" }}>
                Žádný Vercel, Stripe ani Firebase navíc. Web + admin na <b>Pages</b>, data v <b>D1 (SQL)</b>, fotky v <b>R2</b>, přihlášení přes HTTP-only cookie. Doménu připojíte na jedno kliknutí, SSL je zdarma.
                Platíte Cloudflare (free až pár USD) + případný pronájem KAVKA. Žádná procenta z obratu.
              </p>
              <ul className="saas-checks">
                <li>
                  <IconCheck size={16} /> Rychlé jako statika, chytré jako aplikace
                </li>
                <li>
                  <IconCheck size={16} /> E-maily volitelně přes externí službu
                </li>
                <li>
                  <IconCheck size={16} /> Zálohy a provoz v EU, HTTPS/TLS, PBKDF2 hesla
                </li>
              </ul>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                <Link to="/o-nas" className="btn-line btn-sm">
                  Jak to funguje technicky
                </Link>
                <a href="#nabidka" className="btn btn-sm">
                  Chci konzultaci
                </a>
              </div>
            </div>
            <div className="saas-tech-visual">
              <div className="saas-stack-card">
                <div className="stack-row">
                  <b>Pages</b>
                  <span>web + /admin</span>
                </div>
                <div className="stack-row">
                  <b>D1</b>
                  <span>produkty, objednávky, kupóny</span>
                </div>
                <div className="stack-row">
                  <b>R2</b>
                  <span>fotky z administrace</span>
                </div>
                <div className="stack-row muted">
                  <b>Cookie + D1</b>
                  <span>přihlášení bez Auth0</span>
                </div>
                <div className="stack-badge">bez provize · bez vendor lock-in</div>
              </div>
              <div className="saas-mini-cards">
                <div>
                  <IconClock size={18} />
                  <b>Do 24h online</b>
                  <span>s vaší doménou a logem</span>
                </div>
                <div>
                  <IconShield size={18} />
                  <b>GDPR & vzory</b>
                  <span>OP, ochrana údajů, reklamace</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust — co zažije zákazník ukázky */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap trust">
          {[
            {
              icon: <IconPin />,
              title: "Živé mapy dopravců",
              text: "Zásilkovnu otevírá oficiální widget Packety, Balíkovnu mapa České pošty. Vidíte aktuální místa, ne jen náš seznam. Vyzkoušejte na pokladně.",
            },
            {
              icon: <IconLeaf />,
              title: "Skladem do kusu",
              text: "Co vidíte, to máme na polici — i v demu. Objednávka kus rezervuje, storno ho vrací. Žádné „do 21 dnů“.",
            },
            {
              icon: <IconGift />,
              title: "Kupóny z dílny",
              text: "V košíku zkuste KAVKA10 nebo VITEJ150. Slevu počítáme na serveru — v reálném obchodě se na ni můžete spolehnout.",
            },
            {
              icon: <IconShield />,
              title: "Váš účet, vaše data",
              text: "Běžíme na Cloudflare. Žádný marketplace, žádný pixel. Jen obchod, který vám neuteče z ruky — a vaše data zůstanou vaše.",
            },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 80} className="reveal-cell">
              <article className="glass-card">
                <IconWrap className="accent">{item.icon}</IconWrap>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Ceník — SaaS nabídka */}
      <section className="section pricing" id="nabidka">
        <div className="wrap">
          <Reveal>
            <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 32px" }}>
              <div className="kicker" style={{ color: "var(--accent)" }}>
                Jak si KAVKA pořídíte
              </div>
              <h2 style={{ fontSize: 38 }}>Pronájem jako SaaS nebo prodej na klíč</h2>
              <p style={{ color: "var(--ink-soft)" }}>
                Začněte pronájmem a kdykoli odkoupíte. Nebo jdeme rovnou na klíč s vaší doménou, produkty a zaučením. Vše v češtině, do 24 hodin online.
              </p>
            </div>
          </Reveal>
          <div className="pricing-grid">
            <div className="price-card">
              <div className="price-kicker">Nejčastější volba</div>
              <h3>SaaS pronájem</h3>
              <div className="price">
                <b>490 Kč</b>
                <span>/ měsíc bez DPH</span>
              </div>
              <p>Ideální pro start a test trhu. My provozujeme, vy prodáváte.</p>
              <ul>
                <li>
                  <IconCheck size={14} /> Hosting na vašem Cloudflare (návod)
                </li>
                <li>
                  <IconCheck size={14} /> Aktualizace zdarma, podpora e-mailem
                </li>
                <li>
                  <IconCheck size={14} /> Vaše doména, logo, barvy, produkty
                </li>
                <li>
                  <IconCheck size={14} /> Zásilkovna / Balíkovna / QR platby
                </li>
                <li>
                  <IconCheck size={14} /> Admin, sklad, objednávky, kupóny
                </li>
              </ul>
              <a href={`mailto:${settings.store_email || "ahoj@kavka.shop"}?subject=Poptávka%20KAVKA%20SaaS%20pronájem`} className="btn" style={{ width: "100%" }}>
                Poptat pronájem
              </a>
              <small>Bez závazku · výpověď měsíčně</small>
            </div>

            <div className="price-card featured">
              <div className="price-badge">Doporučujeme</div>
              <h3>Prodej na klíč</h3>
              <div className="price">
                <b>29 900 Kč</b>
                <span>jednorázově bez DPH</span>
              </div>
              <p>Váš kód, váš účet Cloudflare. Navždy bez měsíčního nájmu.</p>
              <ul>
                <li>
                  <IconCheck size={14} /> Vše ze SaaS + předání repozitáře
                </li>
                <li>
                  <IconCheck size={14} /> Nasazení na vaši doménu a D1/R2
                </li>
                <li>
                  <IconCheck size={14} /> Zaškolení + import vašich produktů
                </li>
                <li>
                  <IconCheck size={14} /> 3 měsíce podpory v ceně
                </li>
                <li>
                  <IconCheck size={14} /> Možnost dokoupit úpravy na míru
                </li>
              </ul>
              <a href={`mailto:${settings.store_email || "ahoj@kavka.shop"}?subject=Poptávka%20KAVKA%20prodej%20na%20klíč`} className="btn" style={{ width: "100%" }}>
                Poptat prodej
              </a>
              <small>Nejvýhodnější dlouhodobě</small>
            </div>

            <div className="price-card">
              <h3>White-label pro agentury</h3>
              <div className="price">
                <b>od 49 900 Kč</b>
                <span>+ volitelný SaaS</span>
              </div>
              <p>Prodávejte KAVKA svým klientům pod vlastní značkou.</p>
              <ul>
                <li>
                  <IconCheck size={14} /> Multi-tenant nebo 1 klient = 1 nasazení
                </li>
                <li>
                  <IconCheck size={14} /> Rebranding, barvy, šablony navíc
                </li>
                <li>
                  <IconCheck size={14} /> Dokumentace pro vaše vývojáře
                </li>
                <li>
                  <IconCheck size={14} /> Prioritní podpora
                </li>
              </ul>
              <a href={`mailto:${settings.store_email || "ahoj@kavka.shop"}?subject=Poptávka%20KAVKA%20white-label`} className="btn-line" style={{ width: "100%" }}>
                Probrat white-label
              </a>
              <small>Pro studia a freelancery</small>
            </div>
          </div>
          <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 13, marginTop: 16 }}>
            Ceny bez DPH. Cloudflare poplatky (D1, R2, Pages) platí zákazník dle ceníku Cloudflare — typicky 0–5 $ / měsíc při běžném provozu.
          </p>
        </div>
      </section>

      {/* FAQ / Kontakt */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="cta-final glass-card">
            <div>
              <h2>
                Chcete vidět <em>svůj</em> e-shop v KAVKA?
              </h2>
              <p>
                Pošlete nám logo, 2–3 fotky produktů a doménu. Do 24 hodin vám připravíme nezávazný klon — zdarma k prohlédnutí. Rozhodnete se až poté, zda chcete SaaS nebo koupi.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                <a href={`mailto:${settings.store_email || "ahoj@kavka.shop"}?subject=Nezávazná%20poptávka%20KAVKA&body=Dobrý%20den,%20mám%20zájem%20o%20KAVKA.%20Moje%20značka:%20%0AMoje%20doména:%20%0APočet%20produktů:%20`} className="btn">
                  <IconMail size={16} /> Napsat poptávku
                </a>
                <a href={`tel:${(settings.store_phone || "+420777123456").replace(/\s+/g, "")}`} className="btn-line">
                  <IconPhone size={16} /> Zavolat {settings.store_phone || "+420 777 123 456"}
                </a>
              </div>
              <div style={{ display: "flex", gap: 18, marginTop: 16, color: "var(--muted)", fontSize: 13, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <IconClock size={14} /> Odpovídáme do 24 h
                </span>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <IconShield size={14} /> Nezávazně a zdarma
                </span>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <IconSpark size={14} /> Ukázka na vaší doméně
                </span>
              </div>
            </div>
            <div className="cta-contacts">
              <div>
                <b>Co potřebujete k rozhodnutí?</b>
                <ul>
                  <li>Logo (SVG/PNG) a barvy značky</li>
                  <li>Seznam 3–5 produktů + fotky</li>
                  <li>Doménu (nebo použijeme *.pages.dev)</li>
                  <li>Vybraný způsob dopravy a platby</li>
                </ul>
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", background: "var(--bg)", padding: 14, borderRadius: 14, border: "1px solid var(--line)" }}>
                <b style={{ color: "var(--ink)" }}>Tip pro agentury:</b> Zeptejte se na white-label. Dodáme dokumentaci, abyste KAVKA prodávali pod svou značkou.
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
