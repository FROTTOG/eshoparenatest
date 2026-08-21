import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Category, type Product } from "../api";
import {
  IconArrow,
  IconGift,
  IconLeaf,
  IconLocker,
  IconPin,
  IconShield,
  IconTruck,
} from "../components/Icons";
import { ProductCard } from "../components/ProductCard";
import { czk, pickupFreeOver } from "../format";
import { optimizedImage } from "../image";
import { useStore } from "../store";
import { useSeo } from "../title";
import { renderBlock, useSystemPage } from "./blocks";

export function Home() {
  const { settings, shipping } = useStore();
  const storeName = settings.store_name || "KAVKA";
  const heroTitle = settings.hero_title || "Domov, který dýchá pomalu";
  const heroText = settings.hero_text || "Ručně točená kamenina z ateliéru, vypraný len z české dílny a doplňky z masivního dřeva s přirozenou kresbou.";
  const text = (key: string, fallback: string) => settings[key] || fallback;

  // Hlavní stránka upravená v editoru (systemová stránka „home“).
  // Dokud nemá bloky, zobrazuje se výchozí domovská stránka níže.
  const sys = useSystemPage("home");

  useSeo({
    title: sys
      ? sys.page.meta_title || sys.page.title
      : `${storeName} Ateliér — keramika, len a dřevo`,
    description: sys
      ? sys.page.meta_description || undefined
      : "Ručně točená keramika, praný len a dřevo z ateliéru KAVKA. Doprava Z-BOX, Zásilkovna i Balíkovna. QR platba, osobní odběr na Vinohradech.",
    image: "/hero.webp",
    noindex: !!sys?.page.noindex,
  });

  const freeOver = pickupFreeOver(shipping);
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [hero, setHero] = useState(0);

  const tiles = useMemo(
    () => [
      { icon: <IconGift size={21} />, cls: "accent", name: text("home_tile_1", "Dárkové poukazy"), sub: "Pro každou příležitost", to: "/katalog" },
      { icon: <IconLeaf size={21} />, cls: "forest", name: text("home_tile_2", "Z ateliéru"), sub: "Ruční výroba", to: "/o-nas" },
      { icon: <IconLocker size={21} />, cls: "gold", name: text("home_tile_3", "Výdejní místa"), sub: "Z-BOX, Zásilkovna", to: "/doprava-a-platba" },
      { icon: <IconTruck size={21} />, cls: "accent", name: text("home_tile_4", "Doprava zdarma"), sub: freeOver ? `od ${czk(freeOver)}` : "po celé ČR", to: "/doprava-a-platba" },
    ],
    // text() čte settings — závislost na settings kvůli případné změně
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [freeOver, settings]
  );

  const heroSlides = useMemo(() => {
    const slides: { kicker?: string; title: string; text: string; cta: string; to: string; image?: string; accent?: boolean }[] = [
      {
        kicker: text("home_badge", "ATELIÉR KAVKA"),
        title: heroTitle,
        text: heroText,
        cta: text("home_hero_primary_cta", "Procházet katalog"),
        to: "/katalog",
        image: "/hero.webp",
      },
    ];
    if (items[0]) {
      slides.push({
        kicker: "DOPORUČUJEME",
        title: items[0].name,
        text: items[0].category_name ? `Kolekce ${items[0].category_name} · ${czk(items[0].price)}` : czk(items[0].price),
        cta: "Zobrazit produkt",
        to: `/produkt/${items[0].slug}`,
        image: optimizedImage(items[0].image),
        accent: true,
      });
    }
    if (settings.exit_coupon) {
      slides.push({
        kicker: "SLEVA NA PRVNÍ NÁKUP",
        title: `10 % s kódem ${settings.exit_coupon}`,
        text: "Zadejte kód v košíku a my odečteme slevu z první objednávky.",
        cta: "Vybrat produkty",
        to: "/katalog",
        image: items[1] ? optimizedImage(items[1].image) : "/hero.webp",
      });
    }
    return slides;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, heroTitle, heroText, settings.exit_coupon]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const t = window.setInterval(() => setHero((h) => (h + 1) % heroSlides.length), 5000);
    return () => window.clearInterval(t);
  }, [heroSlides.length]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(false);
    void Promise.all([
      api<Category[]>("/categories", { signal: controller.signal }),
      api<{ items: Product[] }>("/products?featured=1&limit=8", { signal: controller.signal }),
    ])
      .then(([nextCats, nextItems]) => {
        if (controller.signal.aborted) return;
        setCats(nextCats);
        setItems(nextItems.items);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: settings.store_company || "KAVKA Ateliér s.r.o.",
        url: typeof window !== "undefined" ? window.location.origin : "",
        email: settings.store_email || "ahoj@kavka.shop",
        telephone: settings.store_phone || "+420 777 123 456",
        address: {
          "@type": "PostalAddress",
          streetAddress: settings.store_address || "Korunní 42",
          addressLocality: "Praha",
          postalCode: "120 00",
          addressCountry: "CZ",
        },
      },
      {
        "@type": "WebSite",
        name: `${storeName} Ateliér`,
        url: typeof window !== "undefined" ? window.location.origin : "",
        potentialAction: {
          "@type": "SearchAction",
          target: `${typeof window !== "undefined" ? window.location.origin : ""}/katalog?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  if (sys) {
    // Obsah hlavní stránky je řízen editorem (bloky stránky „home“).
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <div className="wrap pb-public-page pb-home-page">
          {sys.blocks.map((b) => (
            <Fragment key={b.id}>{renderBlock(b)}</Fragment>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="alza-home wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero carousel — vyhledávání je ve spodní liště (BottomNav) */}
      <section className="alza-hero" aria-roledescription="carousel">
        <div className="alza-hero-track" style={{ transform: `translateX(-${hero * 100}%)` }}>
          {heroSlides.map((s, i) => (
            <div key={i} className={`alza-hero-slide${s.accent ? " slide-accent" : ""}`}>
              <div className="alza-hero-copy">
                {s.kicker && <span className="kicker">{s.kicker}</span>}
                <h2>{s.title}</h2>
                <p>{s.text}</p>
                <Link to={s.to} className="alza-hero-cta">
                  {s.cta} <IconArrow size={15} />
                </Link>
              </div>
              {s.image && (
                <div className="alza-hero-img">
                  <img src={s.image} alt="" loading={i === 0 ? "eager" : "lazy"} decoding="async" />
                </div>
              )}
            </div>
          ))}
        </div>
        {heroSlides.length > 1 && (
          <>
            <button
              type="button"
              className="alza-hero-nav prev"
              aria-label="Předchozí"
              onClick={() => setHero((h) => (h - 1 + heroSlides.length) % heroSlides.length)}
            >
              ‹
            </button>
            <button
              type="button"
              className="alza-hero-nav next"
              aria-label="Další"
              onClick={() => setHero((h) => (h + 1) % heroSlides.length)}
            >
              ›
            </button>
            <div className="alza-hero-dots">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={i === hero ? "on" : ""}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setHero(i)}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Dlaždice zkratek */}
      <section className="alza-tiles" aria-label="Rychlé odkazy">
        {tiles.map((t) => (
          <Link key={t.name} to={t.to} className="alza-tile">
            <span className={`alza-tile-icon ${t.cls}`}>{t.icon}</span>
            <span>
              <b>{t.name}</b>
              <small>{t.sub}</small>
            </span>
          </Link>
        ))}
        {cats.slice(0, 4).map((c) => (
          <Link key={c.id} to={`/katalog/${c.slug}`} className="alza-tile">
            {c.image ? (
              <img className="alza-tile-img" src={optimizedImage(c.image)} alt="" loading="lazy" decoding="async" width={84} height={84} />
            ) : (
              <span className="alza-tile-icon forest">
                <IconPin size={20} />
              </span>
            )}
            <span>
              <b>{c.name}</b>
              <small>{c.description || "Kolekce z ateliéru"}</small>
            </span>
          </Link>
        ))}
      </section>

      {loadError && (
        <div className="load-error" role="alert" style={{ marginBottom: 18 }}>
          <div>
            <b>Produkty se teď nepodařilo načíst.</b>
            <span>Zkontrolujte připojení a zkuste to znovu.</span>
          </div>
          <button type="button" className="btn-line btn-sm" onClick={() => setReload((n) => n + 1)}>
            Načíst znovu
          </button>
        </div>
      )}

      {/* Doporučené produkty */}
      <section id="produkty">
        <div className="alza-section-head">
          <h2>{text("home_featured_title", "Doporučujeme")}</h2>
          <Link to="/katalog">
            Vše <IconArrow size={14} />
          </Link>
        </div>
        {loading ? (
          <div className="grid-products">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="pcard">
                <div className="skel" style={{ aspectRatio: "1" }} />
                <div className="pcard-body">
                  <div className="skel" style={{ height: 12, width: 80 }} />
                  <div className="skel" style={{ height: 22, width: "70%" }} />
                  <div className="skel" style={{ height: 18, width: 96 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid-products">
            {items.map((p, i) => (
              <ProductCard key={p.id} p={p} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* Důvěra */}
      <section className="alza-trust" aria-label="Proč nakoupit u nás">
        <article>
          <span className="alza-tile-icon">
            <IconLeaf size={20} />
          </span>
          <b>{text("home_trust_1_title", "Z ateliéru")}</b>
          <span>Ruční výroba, přírodní materiály</span>
        </article>
        <article>
          <span className="alza-tile-icon forest">
            <IconLocker size={20} />
          </span>
          <b>{text("home_trust_2_title", "Doprava po ČR")}</b>
          <span>{freeOver ? `Zdarma od ${czk(freeOver)}` : "Z-BOX, Zásilkovna, Balíkovna"}</span>
        </article>
        <article>
          <span className="alza-tile-icon gold">
            <IconShield size={20} />
          </span>
          <b>{text("home_trust_3_title", "14 dní na vrácení")}</b>
          <span>Záruka 24 měsíců</span>
        </article>
      </section>
    </div>
  );
}
