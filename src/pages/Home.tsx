import { useState } from "react";
import { Link } from "react-router-dom";
import {
  IconAdmin,
  IconArrow,
  IconBuilding,
  IconCard,
  IconCheck,
  IconClock,
  IconGift,
  IconHeart,
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
  IconUser,
} from "../components/Icons";
import { Reveal } from "../components/Reveal";
import { useStore } from "../store";
import { vendorContact } from "../vendor";
import { useSeo } from "../title";

export function Home() {
  const { settings } = useStore();
  const vendor = vendorContact(settings);
  const storeName = settings.store_name || "KAVKA";

  useSeo({
    title: `${storeName} — Kompletní E-shopové Řešení na Cloudflare | Rychlé, Bez Provizí, Živé Mapy & QR`,
    description:
      "KAVKA je moderní česká e-shopová platforma na Cloudflare. Živé mapy Packety (Z-BOX) a České pošty (Balíkovna), automatické SPD QR platby, skladové hospodářství, slevové kupóny a administrace na míru. Pronájem jako SaaS i prodej na klíč.",
    image: "/hero.jpg",
  });

  const [activeTab, setActiveTab] = useState<"zasilkovna" | "qr" | "sklad" | "admin">("zasilkovna");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "KAVKA E-shop Platforma",
    applicationCategory: "ECommerceApplication",
    operatingSystem: "Cloudflare Pages, D1, R2",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "490",
      highPrice: "29900",
      priceCurrency: "CZK",
    },
    description:
      "Kompletní české e-shopové řešení na Cloudflare Pages. Živé mapy Zásilkovny a Balíkovny, SPD QR platby, administrace, ARES napojení, nulové provize.",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* HERO SECTION — PROMINENT ENLARGED KAVKA LOGO & PLATFORM PRESENTATION */}
      <section className="hero hero-saas landing-hero">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="wrap hero-copy">
          <div className="saas-badge">
            <span className="saas-dot" /> KOMPLETNÍ E-SHOPOVÉ ŘEŠENÍ BEZ MĚSÍČNÍCH PROVIZÍ
          </div>

          {/* ENLARGED BRANDING & LOGO DISPLAY */}
          <div className="landing-brand-showcase">
            <div className="enlarged-logo-wrap">
              <svg viewBox="0 0 64 64" className="enlarged-logo-icon" aria-hidden="true">
                <rect width="64" height="64" rx="16" fill="#1c1915" />
                <path d="M14 42c8-2 12-11 14-20 1 7 4 14 12 18 3-8 8-14 16-16-6 8-8 16-7 24H18c-1-8-2-14-4-6z" fill="#f4efe6" />
                <circle cx="40" cy="22" r="2.5" fill="#b54a2c" />
              </svg>
              <div className="enlarged-logo-text">
                <span className="brand-title">KAVKA</span>
                <span className="brand-subtitle">E-SHOP PLATFORMA</span>
              </div>
            </div>
          </div>

          <h1 className="hero-main-title">
            Bleskový e-shop.
            <br />
            Moderní design.
            <br />
            <em>Sto procent pod vaší kontrolou.</em>
          </h1>

          <p className="lead">
            KAVKA je <b>kompletní české e-shopové řešení</b> postavené na infrastruktuře Cloudflare. Získáte nádherný, bleskově rychlý obchod s živými mapami výdejních míst, QR platbami, skladem a administrací na míru — bez vysokých měsíčních poplatků a provizí.
          </p>

          <div className="hero-actions">
            <Link to="/ukazka" className="btn btn-hero-primary">
              <IconSpark size={18} /> Vyzkoušet demo e-shopu <IconArrow size={16} />
            </Link>
            <Link to="/admin" className="btn-line">
              <IconAdmin size={18} /> Otevřít demo admin
            </Link>
            <a href="#nabidka" className="btn-line">
              Ceník & balíčky
            </a>
          </div>

          <div className="hero-pills">
            <span>
              <IconLocker size={16} /> Packety (Z-BOX) s živou mapou
            </span>
            <span>
              <IconParcel size={16} /> Balíkovna ČP s mapou
            </span>
            <span>
              <IconQr size={16} /> SPD QR Platby
            </span>
            <span>
              <IconBuilding size={16} /> ARES auto-doplňování
            </span>
          </div>

          <div className="hero-trust-row">
            <span>
              <IconShield size={14} /> GDPR & Vzorové OP v základu
            </span>
            <span>
              <IconClock size={14} /> Nasazení na vaši doménu do 24h
            </span>
            <span>
              <IconCheck size={14} /> Nulové provize z prodejů
            </span>
          </div>
        </div>

        {/* HERO VISUAL / INTERACTIVE PREVIEW CARD */}
        <div className="hero-visual">
          <div className="hero-card-preview glass-card">
            <div className="hero-card-header">
              <div className="window-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <span className="window-title">kavka-shop.pages.dev</span>
            </div>
            <img src="/hero.jpg" alt="Prezentace e-shopového řešení KAVKA" className="hero-card-img" />
            <div className="hero-card-overlay">
              <div className="preview-chip glass-card">
                <IconSpark size={18} style={{ color: "var(--accent)" }} />
                <div>
                  <b>Živá ukázka e-shopu</b>
                  <span>Plně funkční nakupování, košík & pokladna</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <Link to="/ukazka" className="btn btn-sm" style={{ flex: 1, textAlign: "center" }}>
                  Otevřít ukázkový obchod →
                </Link>
                <Link to="/admin" className="btn-line btn-sm" style={{ flex: 1, textAlign: "center" }}>
                  Otevřít Admin →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEPARATED DEMO PROMO SECTION */}
      <section className="section wrap">
        <Reveal>
          <div className="demo-split-card glass-card">
            <div className="demo-split-text">
              <div className="saas-badge" style={{ background: "rgba(181, 74, 44, 0.12)", color: "var(--accent)" }}>
                <IconSpark size={14} /> DVĚ ČÁSTI PROJEKTU KAVKA
              </div>
              <h2 className="serif" style={{ fontSize: "clamp(24px, 4vw, 32px)", margin: "12px 0 8px" }}>
                Prezentace řešení &amp; samostatná ukázka obchodu
              </h2>
              <p style={{ color: "var(--ink-soft)", lineHeight: 1.6 }}>
                Pro maximální přehlednost jsme oddělili informace o <b>produktovém řešení KAVKA</b> od samotného <b>ukázkového obchodu (Ateliér KAVKA)</b>. Níže si můžete vybrat, kam pokračovat:
              </p>
            </div>
            <div className="demo-split-grid">
              <div className="demo-split-box highlighted">
                <div className="demo-split-icon">🛍️</div>
                <h3>1. Ukázkový e-shop (Storefront)</h3>
                <p>
                  Prohlédněte si, jak vypadá nákup z pohledu zákazníka — výběr v katalogu, vložení do košíku, uplatnění slevového kupónu <code>KAVKA10</code>, mapa Z-BOXu a generování QR kódu.
                </p>
                <Link to="/ukazka" className="btn" style={{ width: "100%", marginTop: 12 }}>
                  Vstoupit do ukázkového e-shopu →
                </Link>
              </div>

              <div className="demo-split-box">
                <div className="demo-split-icon">⚙️</div>
                <h3>2. Demo Administrace (Admin Panel)</h3>
                <p>
                  Vyzkoušejte si správu e-shopu jako majitel — přehledy tržeb, správa produktů, změna stavu objednávek, storno s vrácením skladu a správa R2 fotek.
                </p>
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 10px" }}>
                  Přihlášení: <code>admin@kavka.shop / KavkaAdmin123</code>
                </p>
                <Link to="/admin" className="btn-line" style={{ width: "100%" }}>
                  Otevřít administraci →
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* PROČ KAVKA — FEATURES & ADVANTAGES */}
      <section className="section saas-features" id="funkce">
        <div className="wrap">
          <Reveal>
            <div className="section-head" style={{ alignItems: "flex-start" }}>
              <div>
                <div className="kicker" style={{ color: "var(--accent)" }}>
                  Proč zvolit KAVKA pro váš e-shop
                </div>
                <h2>
                  Vše, co český e-shop potřebuje.
                  <br />
                  Bez složitého nastavování a drahých zásuvných modulů.
                </h2>
                <p style={{ color: "var(--ink-soft)", maxWidth: 620, marginTop: 8 }}>
                  KAVKA přináší hotové, produkčně prověřené řešení, které obsahuje všechny funkce vyžadované českými zákazníky i legislativou.
                </p>
              </div>
              <a href="#nabidka" className="btn-line desktop-only">
                Nezávazná konzultace <IconArrow size={16} />
              </a>
            </div>
          </Reveal>

          <div className="saas-grid">
            {[
              {
                icon: <IconTruck />,
                title: "Živé mapy Packety & Balíkovny",
                text: "Oficiální widget Packety pro Z-BOXy a Zásilkovnu, mapa České pošty pro Balíkovny. Pokud vypadne internet nebo API, systém má záložní mapu z vaší D1 databáze.",
              },
              {
                icon: <IconQr />,
                title: "České SPD QR platby",
                text: "Zákazník po objednání okamžitě vidí QR kód pro platbu mobilním bankovnictvím. IBAN si jednoduše nastavíte v adminu. Žádné poplatky platební bráně.",
              },
              {
                icon: <IconLeaf />,
                title: "Přesné skladové hospodářství",
                text: "Každá objednávka přesně rezervuje skladové kusy. Storno nebo úprava je ihned vrátí. Historie pohybů hlídá nízký stav a včas vás upozorní.",
              },
              {
                icon: <IconBuilding />,
                title: "ARES auto-doplňování & B2B",
                text: "Při nákupu na firmu stačí zadat IČO — název firmy, sídlo a DIČ se automaticky dotáhnou z českého registru ARES. Žádné překlepy.",
              },
              {
                icon: <IconGift />,
                title: "Kupóny & Slevové akce",
                text: "Procentuální slevy, fixní částky, minimální výše objednávky i časové omezení. Kódy se validují přímo na serveru pro 100% bezpečnost.",
              },
              {
                icon: <IconShield />,
                title: "GDPR & Česká legislativa",
                text: "Připravené vzorové Obchodní podmínky, zásady ochrany osobních údajů, reklamační řád a 14denní lhůta na vrácení zboží napojené na vaše údaje.",
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 60}>
                <article className="glass-card feature-box">
                  <div className="feature-icon">{item.icon}</div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* INTERACTIVE FEATURE TAB SHOWCASE */}
      <section className="section wrap">
        <div className="interactive-feature-card glass-card">
          <div className="section-head" style={{ marginBottom: 20 }}>
            <div>
              <div className="kicker" style={{ color: "var(--accent)" }}>
                Interaktivní ukázka klíčových modulů
              </div>
              <h2 className="serif">Podívejte se, jak KAVKA funguje v praxi</h2>
            </div>
          </div>

          <div className="feature-tabs">
            <button
              className={`tab-btn ${activeTab === "zasilkovna" ? "active" : ""}`}
              onClick={() => setActiveTab("zasilkovna")}
            >
              <IconLocker size={18} /> Živé mapy dopravců
            </button>
            <button className={`tab-btn ${activeTab === "qr" ? "active" : ""}`} onClick={() => setActiveTab("qr")}>
              <IconQr size={18} /> SPD QR Platby
            </button>
            <button className={`tab-btn ${activeTab === "sklad" ? "active" : ""}`} onClick={() => setActiveTab("sklad")}>
              <IconLeaf size={18} /> Sklad & Pohyby
            </button>
            <button className={`tab-btn ${activeTab === "admin" ? "active" : ""}`} onClick={() => setActiveTab("admin")}>
              <IconAdmin size={18} /> Administrace
            </button>
          </div>

          <div className="tab-content">
            {activeTab === "zasilkovna" && (
              <div className="tab-pane">
                <div className="tab-pane-text">
                  <h3>Integrovaný Z-BOX, Zásilkovna a Balíkovna</h3>
                  <p>
                    Zákazníci milují pohodlí výdejních boxů. KAVKA přímo v pokladně zobrazuje živou mapu Packety i Balíkovny České pošty. Zákazník si vybere svůj Z-BOX jedním kliknutím a vy v administraci vidíte kompletní kód a adresu pobočky.
                  </p>
                  <ul className="check-list">
                    <li><IconCheck size={16} /> Oficiální Zásilkovna / Packety widget</li>
                    <li><IconCheck size={16} /> Mapa Balíkovny České pošty</li>
                    <li><IconCheck size={16} /> Záložní mapa z vaší D1 databáze</li>
                  </ul>
                  <Link to="/ukazka" className="btn btn-sm" style={{ marginTop: 12 }}>
                    Vyzkoušet v košíku ukázky →
                  </Link>
                </div>
                <div className="tab-pane-img">
                  <div className="mock-map-card glass-card">
                    <div className="mock-map-header">📍 Výběr výdejního místa v košíku</div>
                    <div className="mock-map-body">
                      <div className="mock-pin active">📌 Z-BOX Praha 2 - Korunní (otevřeno 24/7)</div>
                      <div className="mock-pin">📍 AlzaBox / Balíkovna Vinohradská</div>
                      <div className="mock-pin">📍 Zásilkovna Pobočka Náměstí Míru</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "qr" && (
              <div className="tab-pane">
                <div className="tab-pane-text">
                  <h3>Automatické platby bankovním převodem s QR</h3>
                  <p>
                    Po odeslání objednávky KAVKA automaticky vygeneruje QR kód podle českého standardu SPD (Short Payment Descriptor). Zákazník kód naskenuje mobilní bankou a zaplatí bez přepisování čísla účtu a variabilního symbolu.
                  </p>
                  <ul className="check-list">
                    <li><IconCheck size={16} /> Okamžité vygenerování na děkovné stránce</li>
                    <li><IconCheck size={16} /> Automatické doplnění VS z čísla objednávky</li>
                    <li><IconCheck size={16} /> Nulové poplatky z transakce</li>
                  </ul>
                </div>
                <div className="tab-pane-img">
                  <div className="mock-qr-card glass-card">
                    <div style={{ textAlign: "center" }}>
                      <IconQr size={64} style={{ color: "var(--ink)" }} />
                      <div style={{ fontWeight: 700, marginTop: 8 }}>Platba Převodem s QR (SPD)</div>
                      <div style={{ fontSize: 13, color: "var(--muted)" }}>IBAN: CZ6508000000192000145399</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "sklad" && (
              <div className="tab-pane">
                <div className="tab-pane-text">
                  <h3>Reálný sklad s evidencí pohybů a upozorněním</h3>
                  <p>
                    Zapomeňte na situace, kdy prodáte zboží, které nemáte. KAVKA hlídá skladové zásoby do kusu. V administraci vidíte přesnou historii naskladnění, rezervací objednávkami i úprav stavu.
                  </p>
                  <ul className="check-list">
                    <li><IconCheck size={16} /> Automatické odečítání při objednávce</li>
                    <li><IconCheck size={16} /> Vrácení do skladu při stornu</li>
                    <li><IconCheck size={16} /> Upozornění na nízký sklad</li>
                  </ul>
                </div>
                <div className="tab-pane-img">
                  <div className="mock-stock-card glass-card">
                    <div className="stock-row"><span>Keramický hrnek Hlína</span> <b style={{ color: "var(--ok)" }}>24 ks skladem</b></div>
                    <div className="stock-row"><span>Lněné povlečení Písek</span> <b style={{ color: "var(--accent)" }}>Pouze 2 ks (Nízký sklad!)</b></div>
                    <div className="stock-row"><span>Dubový tác</span> <b>18 ks skladem</b></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "admin" && (
              <div className="tab-pane">
                <div className="tab-pane-text">
                  <h3>Přehledná a rychlá Administrace</h3>
                  <p>
                    Všechna data máte na jednom místě — přehledy tržeb, správa zákazníků, úprava objednávek, vytváření slevových kupónů i nahrávání fotografií produktů přímo do R2 úložiště.
                  </p>
                  <ul className="check-list">
                    <li><IconCheck size={16} /> Přehled denních tržeb a průměrné objednávky</li>
                    <li><IconCheck size={16} /> Změna stavu objednávek jedním klikem</li>
                    <li><IconCheck size={16} /> Nahrávání fotografií produktů do R2</li>
                  </ul>
                  <Link to="/admin" className="btn btn-sm" style={{ marginTop: 12 }}>
                    Otevřít demo administraci →
                  </Link>
                </div>
                <div className="tab-pane-img">
                  <div className="mock-admin-card glass-card">
                    <div style={{ padding: 12, borderBottom: "1px solid var(--line)", fontWeight: 700 }}>📊 Administrace KAVKA</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 12 }}>
                      <div className="stat-pill"><b>128 450 Kč</b><small>Tržby tento měsíc</small></div>
                      <div className="stat-pill"><b>34</b><small>Nové objednávky</small></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CLOUDFLARE ARCHITECTURE STACK SECTION */}
      <section className="section wrap">
        <Reveal>
          <div className="stack-overview-card glass-card">
            <div className="section-head">
              <div>
                <div className="kicker" style={{ color: "var(--accent)" }}>
                  Moderní Architektura
                </div>
                <h2>Běží 100% na Cloudflare Edge Stacku</h2>
                <p style={{ color: "var(--ink-soft)" }}>
                  Žádný těžkopádný WordPress, žádný drahý Shopify. Blesková rychlost načtení pod 50 ms odkudkoliv v ČR.
                </p>
              </div>
            </div>

            <div className="arch-grid">
              <div className="arch-box">
                <div className="arch-badge">Frontend & Web</div>
                <h4>Cloudflare Pages</h4>
                <p>Staticky kompilovaný React s ultra rychlým načítáním na Globální CDN Cloudflare.</p>
              </div>

              <div className="arch-box">
                <div className="arch-badge">Databáze</div>
                <h4>Cloudflare D1 (SQL)</h4>
                <p>Serverless SQL databáze na Edge pro okamžitý přístup k produktům, zákazníkům a objednávkám.</p>
              </div>

              <div className="arch-box">
                <div className="arch-badge">Fotografie & Média</div>
                <h4>Cloudflare R2 Storage</h4>
                <p>Bezpečné úložiště obrázků produktů bez vysokých poplatků za datové přenosy.</p>
              </div>

              <div className="arch-box">
                <div className="arch-badge">API Backend</div>
                <h4>Worker Functions (Hono)</h4>
                <p>Bleskové serverless API pro zpracování košíku, kupónů, heslování a administrace.</p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* PRICING & PACKAGES SECTION (`#nabidka`) */}
      <section className="section pricing" id="nabidka">
        <div className="wrap">
          <Reveal>
            <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 36px" }}>
              <div className="kicker" style={{ color: "var(--accent)" }}>
                Pořiďte si e-shop KAVKA
              </div>
              <h2 style={{ fontSize: 38 }}>SaaS pronájem nebo jednorázový prodej na klíč</h2>
              <p style={{ color: "var(--ink-soft)", lineHeight: 1.6 }}>
                Vyberte si model, který nejlépe vyhovuje vašim potřebám. Můžete začít flexibilním pronájmem nebo si e-shop odkoupit natrvalo na vlastní účet.
              </p>
            </div>
          </Reveal>

          <div className="pricing-grid">
            <div className="price-card">
              <div className="price-kicker">Flexibilní start</div>
              <h3>SaaS pronájem</h3>
              <div className="price">
                <b>490 Kč</b>
                <span>/ měsíc bez DPH</span>
              </div>
              <p>Ideální pro start nového projektu nebo otestování trhu. O provoz se staráme my.</p>
              <ul>
                <li>
                  <IconCheck size={14} /> Hosting na Cloudflare v ceně
                </li>
                <li>
                  <IconCheck size={14} /> Průběžné aktualizace & podpora
                </li>
                <li>
                  <IconCheck size={14} /> Vaše vlastní doména, logo a barvy
                </li>
                <li>
                  <IconCheck size={14} /> Zásilkovna / Balíkovna / QR platby
                </li>
                <li>
                  <IconCheck size={14} /> Administrace, sklad, kupóny
                </li>
              </ul>
              <a href={vendor.web} target="_blank" rel="noreferrer" className="btn" style={{ width: "100%" }}>
                Objednat pronájem na {vendor.webLabel}
              </a>
              <small>Bez dlouhodobých závazků · Výpověď měsíčně</small>
            </div>

            <div className="price-card featured">
              <div className="price-badge">Doporučujeme</div>
              <h3>Prodej na klíč</h3>
              <div className="price">
                <b>29 900 Kč</b>
                <span>jednorázově bez DPH</span>
              </div>
              <p>Kompletní odkup zdrojového kódu a nasazení na váš vlastní účet Cloudflare. Navždy bez nájmu.</p>
              <ul>
                <li>
                  <IconCheck size={14} /> Kompletní zdrojový kód do vašich rukou
                </li>
                <li>
                  <IconCheck size={14} /> Nasazení na vaši doménu a D1/R2 databázi
                </li>
                <li>
                  <IconCheck size={14} /> Import vašich produktů & zaučení
                </li>
                <li>
                  <IconCheck size={14} /> 3 měsíce technické podpory v ceně
                </li>
                <li>
                  <IconCheck size={14} /> Nulové měsíční poplatky za software
                </li>
              </ul>
              <a href={vendor.web} target="_blank" rel="noreferrer" className="btn" style={{ width: "100%" }}>
                Objednat na {vendor.webLabel}
              </a>
              <small>Nejvýhodnější varianta pro dlouhodobý byznys</small>
            </div>

            <div className="price-card">
              <h3>White-label pro agentury</h3>
              <div className="price">
                <b>od 49 900 Kč</b>
                <span>+ volitelná správa</span>
              </div>
              <p>Dodávejte e-shopy svým klientům pod vlastní značkou s plnou dokumentací.</p>
              <ul>
                <li>
                  <IconCheck size={14} /> Multi-tenant nebo nezávislé instance
                </li>
                <li>
                  <IconCheck size={14} /> Custom rebranding & vlastní šablony
                </li>
                <li>
                  <IconCheck size={14} /> Vývojářská dokumentace
                </li>
                <li>
                  <IconCheck size={14} /> Prioritní SLA podpora
                </li>
              </ul>
              <a href={vendor.web} target="_blank" rel="noreferrer" className="btn-line" style={{ width: "100%" }}>
                Probrat white-label
              </a>
              <small>Pro vývojová studia a freelancery</small>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="section wrap">
        <Reveal>
          <div className="faq-container glass-card">
            <div className="section-head" style={{ marginBottom: 24 }}>
              <div>
                <div className="kicker" style={{ color: "var(--accent)" }}>
                  Otázky a odpovědi
                </div>
                <h2 className="serif">Často kladené dotazy</h2>
              </div>
            </div>

            <div className="faq-list">
              {[
                {
                  q: "Jak dlouho trvá nasazení e-shopu KAVKA na naši doménu?",
                  a: "Při využití varianty na klíč trvá základní spuštění do 24 hodin od předání podkladů (doména, logo, základní produkty).",
                },
                {
                  q: "Potřebujeme k provozu drahý hosting nebo server?",
                  a: "Ne. Běžíme na infrastruktuře Cloudflare Pages, D1 a R2. Běžný provoz malých a středních e-shopů spadne do bezplatného limitu Cloudflare (0 Kč/měsíc).",
                },
                {
                  q: "Jak funguje výběr Z-BOXu a Balíkovny v košíku?",
                  a: "KAVKA má v pokladně přímo zabudované živé mapové widgety Packety a České pošty. Zákazník klikne na tlačítko a na mapě vybere své výdejní místo.",
                },
                {
                  q: "Mohu si vyzkoušet administraci ještě před koupí?",
                  a: "Ano! V naší živé ukázce stačí otevřít /admin a přihlásit se údaji admin@kavka.shop / KavkaAdmin123. Můžete si upravovat produkty, sklad i objednávky.",
                },
              ].map((faq, i) => (
                <div key={i} className={`faq-item ${openFaq === i ? "open" : ""}`} onClick={() => toggleFaq(i)}>
                  <div className="faq-question">
                    <h4>{faq.q}</h4>
                    <span className="faq-toggle">{openFaq === i ? "−" : "+"}</span>
                  </div>
                  {openFaq === i && <p className="faq-answer">{faq.a}</p>}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* FINAL CONTACT / CTA SECTION */}
      <section className="section wrap" style={{ paddingTop: 0 }}>
        <div className="cta-final glass-card">
          <div>
            <h2>
              Připraveni spustit <em>váš nový e-shop</em>?
            </h2>
            <p>
              Napište nám vaši představu, doménu a sortiment. Připravíme vám nezávazný náhled e-shopu KAVKA zdarma.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
              <a href={vendor.web} target="_blank" rel="noreferrer" className="btn">
                <IconMail size={16} /> Objednat na {vendor.webLabel}
              </a>
              <a href={vendor.phoneHref} className="btn-line">
                <IconPhone size={16} /> Zavolat {vendor.phone}
              </a>
            </div>
            <p style={{ marginTop: 14, fontSize: 14, color: "var(--ink-soft)" }}>
              Kontakt a objednání systému KAVKA: <b>{vendor.person}</b> ·{" "}
              <a href={vendor.web} target="_blank" rel="noreferrer">
                {vendor.webLabel}
              </a>{" "}
              · <a href={vendor.phoneHref}>{vendor.phone}</a>
            </p>
          </div>
          <div className="cta-contacts">
            <div>
              <b>Objednávka a kontakt</b>
              <ul>
                <li>{vendor.person}</li>
                <li>
                  <a href={vendor.web} target="_blank" rel="noreferrer">
                    {vendor.webLabel}
                  </a>
                </li>
                <li>
                  <a href={vendor.phoneHref}>{vendor.phone}</a>
                </li>
              </ul>
            </div>
            <div>
              <b>Proč KAVKA?</b>
              <ul>
                <li>Bleskové načítání na Cloudflare</li>
                <li>Nulové provize z obratu</li>
                <li>Živé mapy Z-BOX & Balíkovna</li>
                <li>České QR platby a ARES</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
