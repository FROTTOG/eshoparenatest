import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Category, type Product } from "../api";
import {
  IconArrow,
  IconGift,
  IconLeaf,
  IconLocker,
  IconPin,
  IconQr,
  IconShield,
  IconTruck,
} from "../components/Icons";
import { ProductCard } from "../components/ProductCard";
import { Reveal } from "../components/Reveal";
import { cheapestPickup, czk, pickupFreeOver, shippingByKind } from "../format";
import { optimizedImage } from "../image";
import { useStore } from "../store";
import { useSeo } from "../title";

export function Home() {
  const { settings, shipping } = useStore();
  const storeName = settings.store_name || "KAVKA";
  const heroTitle = settings.hero_title || "Domov, který dýchá pomalu";
  const heroText =
    settings.hero_text ||
    "Ručně točená kamenina z ateliéru, vypraný len z české dílny a doplňky z masivního dřeva s přirozenou kresbou.";

  useSeo({
    title: `${storeName} Ateliér — keramika, len a dřevo`,
    description:
      "Ručně točená keramika, praný len a dřevo z ateliéru KAVKA. Doprava Z-BOX, Zásilkovna i Balíkovna. QR platba, osobní odběr na Vinohradech.",
    image: "/hero.webp",
  });

  const freeOver = pickupFreeOver(shipping);
  const zbox = shippingByKind(shipping, "pickup_zbox");
  const cheap = cheapestPickup(shipping);
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);

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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="demo-hero wrap">
        <div className="demo-hero-inner glass-card">
          <div className="demo-hero-content">
            <div className="saas-badge">
              <span className="saas-dot" /> ATELIÉR KAVKA · VINOHRADY
            </div>
            <h1 className="serif">
              {heroTitle.includes(",") ? (
                <>
                  {heroTitle.split(",")[0]},
                  <br />
                  <em>{heroTitle.split(",").slice(1).join(",").trim()}</em>
                </>
              ) : (
                heroTitle
              )}
            </h1>
            <p className="lead">{heroText}</p>
            <div className="demo-hero-btns">
              <Link to="/katalog" className="btn">
                Procházet katalog <IconArrow size={16} />
              </Link>
              <a href="#produkty" className="btn-line">
                Vybrané kousky
              </a>
            </div>
            <div className="hero-pills" style={{ marginTop: 24 }}>
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
              {freeOver ? (
                <span>
                  <IconTruck size={16} /> Doprava zdarma od {czk(freeOver)}
                </span>
              ) : (
                <span>
                  <IconPin size={16} /> Z-BOX, Zásilkovna, Balíkovna
                </span>
              )}
              <span>
                <IconQr size={16} /> QR platba SPD
              </span>
            </div>
          </div>
          <div className="demo-hero-img-wrap">
            <img
              src="/hero.webp"
              alt="Ateliér KAVKA — keramika, len a dřevo"
              className="demo-hero-img"
              width={960}
              height={720}
              fetchPriority="high"
              decoding="async"
            />
            <div className="demo-hero-badge glass-card">
              <IconGift size={18} />
              <div>
                <b>Sleva 10 % na první nákup</b>
                <span>
                  V košíku zadejte kód <code>KAVKA10</code>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {loadError && (
        <div className="wrap load-error glass-card" role="alert">
          <div>
            <b>Produkty se teď nepodařilo načíst.</b>
            <span>Zkontrolujte připojení a zkuste to znovu.</span>
          </div>
          <button type="button" className="btn-line btn-sm" onClick={() => setReload((n) => n + 1)}>
            Načíst znovu
          </button>
        </div>
      )}

      <section className="section wrap">
        <Reveal>
          <div className="section-head">
            <div>
              <div className="kicker" style={{ color: "var(--accent)" }}>
                Sortiment
              </div>
              <h2>Kategorie</h2>
            </div>
            <Link to="/katalog" className="btn-line">
              Celý obchod →
            </Link>
          </div>
        </Reveal>
        <div className="demo-cats-grid">
          {cats.map((c, i) => (
            <Reveal key={c.id} delay={(i % 5) * 60} className="reveal-cell">
              <Link to={`/katalog/${c.slug}`} className="demo-cat-card glass-card">
                <div className="demo-cat-img-wrap">
                  <img src={optimizedImage(c.image)} alt="" loading="lazy" decoding="async" width={480} height={360} />
                </div>
                <div className="demo-cat-info">
                  <h3>{c.name}</h3>
                  <p>{c.description || "Kolekce z ateliéru"}</p>
                  <span className="demo-cat-link">Procházet kategorii →</span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section wrap" id="produkty">
        <Reveal>
          <div className="section-head">
            <div>
              <div className="kicker" style={{ color: "var(--accent)" }}>
                Vybrané kousky
              </div>
              <h2>Doporučujeme</h2>
              <p style={{ color: "var(--ink-soft)", margin: "4px 0 0" }}>
                Ručně točená kamenina, praný len a dřevo s kresbou.
              </p>
            </div>
            <Link to="/katalog" className="btn-line">
              Zobrazit celý katalog →
            </Link>
          </div>
        </Reveal>

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

      <section className="section wrap">
        <div className="trust" style={{ margin: 0 }}>
          <Reveal delay={0}>
            <article>
              <IconLeaf />
              <h3>Z ateliéru</h3>
              <p>Keramika točená na kruhu, len z české dílny, dřevo olejované přírodním olejem.</p>
            </article>
          </Reveal>
          <Reveal delay={90}>
            <article>
              <IconLocker />
              <h3>Doprava po ČR</h3>
              <p>
                Z-BOX, Zásilkovna i Balíkovna s živou mapou
                {freeOver ? ` · zdarma od ${czk(freeOver)}` : ""}. Osobní odběr na Vinohradech.
              </p>
            </article>
          </Reveal>
          <Reveal delay={180}>
            <article>
              <IconShield />
              <h3>14 dní na vrácení</h3>
              <p>Zákonná záruka 24 měsíců. Reklamace vyřídíme do 30 dnů, nebo osobně v ateliéru.</p>
            </article>
          </Reveal>
        </div>
      </section>

      <section className="section wrap" style={{ paddingTop: 0 }}>
        <Reveal>
          <div className="cta-final">
            <div>
              <h2>
                Ateliér na Vinohradech.
                <br />
                <em>Otevřeno Po–Pá 10:00–18:00.</em>
              </h2>
              <p>
                {settings.store_address || "Korunní 42, 120 00 Praha 2"} · {settings.store_phone || "+420 777 123 456"}
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
                <Link to="/katalog" className="btn">
                  Nakoupit online
                </Link>
                <Link to="/o-nas" className="btn-line">
                  O ateliéru
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
