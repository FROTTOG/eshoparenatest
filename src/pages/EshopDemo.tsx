import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Category, type Product } from "../api";
import {
  IconArrow,
  IconCart,
  IconCheck,
  IconGift,
  IconLocker,
  IconParcel,
  IconPin,
  IconQr,
  IconSearch,
  IconSpark,
  IconTruck,
  IconUser,
} from "../components/Icons";
import { ProductCard } from "../components/ProductCard";
import { Reveal } from "../components/Reveal";
import { cheapestPickup, czk, pickupFreeOver, shippingByKind } from "../format";
import { useStore } from "../store";
import { useSeo } from "../title";

export function EshopDemo() {
  const { settings, shipping } = useStore();
  const storeName = settings.store_name || "KAVKA";

  useSeo({
    title: `Živá ukázka e-shopu — Ateliér ${storeName} | Keramika, len & dřevo`,
    description:
      "Samostatná živá ukázka e-shopu KAVKA. Vyzkoušejte si nákupní proces, košík, výběr Z-BOXu na živé mapě, slevové kupóny i QR platbu.",
    image: "/hero.jpg",
  });

  const freeOver = pickupFreeOver(shipping);
  const zbox = shippingByKind(shipping, "pickup_zbox");
  const cheap = cheapestPickup(shipping);
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      api<Category[]>("/categories").then(setCats),
      api<{ items: Product[] }>("/products?featured=1&limit=8").then((r) => setItems(r.items)),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Top Demo Context Banner */}
      <div className="demo-notice-bar wrap">
        <div className="demo-notice-card">
          <div className="demo-notice-tag">
            <IconSpark size={16} /> ŽIVÁ UKÁZKA OBCHODU
          </div>
          <p className="demo-notice-desc">
            Prohlížíte si <b>ukázkový e-shop Ateliér KAVKA</b>. Zde si můžete bez obav vyzkoušet celý nákup — vložit zboží do košíku, zvolit Z-BOX na mapě, použít slevový kupón <code>KAVKA10</code> a vyzkoušet QR platbu.
          </p>
          <div className="demo-notice-actions">
            <Link to="/" className="btn-line btn-sm">
              ← Prezentace KAVKA
            </Link>
            <Link to="/admin" className="btn btn-sm">
              Otevřít Admin →
            </Link>
          </div>
        </div>
      </div>

      {/* Demo E-shop Hero Banner */}
      <section className="demo-hero wrap">
        <div className="demo-hero-inner glass-card">
          <div className="demo-hero-content">
            <div className="saas-badge">
              <span className="saas-dot" /> ATELIÉR KAVKA · UKÁZKOVÝ SORTIMENT
            </div>
            <h1 className="serif">
              Domov, který
              <br />
              dýchá <em>pomalu.</em>
            </h1>
            <p className="lead">
              Ručně točená kamenina z ateliéru, vypraný len z české dílny a doplňky z masivního dřeva s přirozenou kresbou.
            </p>
            <div className="demo-hero-btns">
              <Link to="/katalog" className="btn">
                Procházet celý katalog <IconArrow size={16} />
              </Link>
              <a href="#produkty" className="btn-line">
                Zobrazit nejprodávanější
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
              <span>
                <IconPin size={16} /> Mapa Z-BOX & Zásilkovny
              </span>
              <span>
                <IconQr size={16} /> QR Platba SPD
              </span>
            </div>
          </div>
          <div className="demo-hero-img-wrap">
            <img src="/hero.jpg" alt="Ateliér KAVKA — ukázkový sortiment keramiky a lnu" className="demo-hero-img" />
            <div className="demo-hero-badge glass-card">
              <IconGift size={18} />
              <div>
                <b>Kupón na slevu 10 %</b>
                <span>V košíku vyzkoušejte kód <code>KAVKA10</code></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="section wrap">
        <Reveal>
          <div className="section-head">
            <div>
              <div className="kicker" style={{ color: "var(--accent)" }}>
                Sortiment v ukázce
              </div>
              <h2>Kategorie zboží</h2>
            </div>
            <Link to="/katalog" className="btn-line">
              Všechny kategorie →
            </Link>
          </div>
        </Reveal>
        <div className="demo-cats-grid">
          {cats.map((c) => (
            <Link key={c.id} to={`/katalog/${c.slug}`} className="demo-cat-card glass-card">
              <div className="demo-cat-img-wrap">
                <img src={c.image || "/products/hrnek.jpg"} alt={c.name} loading="lazy" />
              </div>
              <div className="demo-cat-info">
                <h3>{c.name}</h3>
                <p>{c.description || "Ukázková kolekce produktů"}</p>
                <span className="demo-cat-link">Procházet kategorii →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products Showcase */}
      <section className="section wrap" id="produkty">
        <Reveal>
          <div className="section-head">
            <div>
              <div className="kicker" style={{ color: "var(--accent)" }}>
                Vybrané kousky
              </div>
              <h2>Doporučujeme vyzkoušet</h2>
              <p style={{ color: "var(--ink-soft)", margin: "4px 0 0" }}>
                Klikněte na jakýkoliv produkt, vložte do košíku a otestujte pokladnu.
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

      {/* Interactive Walkthrough / Demo Features */}
      <section className="section wrap">
        <div className="demo-guide-card glass-card">
          <div className="demo-guide-header">
            <span className="kicker" style={{ color: "var(--accent)" }}>
              Návod pro vyzkoušení
            </span>
            <h2 className="serif">Jak si otestovat e-shop KAVKA v 5 krokách</h2>
          </div>
          <div className="demo-guide-grid">
            <div className="demo-guide-step">
              <div className="demo-step-num">1</div>
              <h4>Vyberte produkt</h4>
              <p>Přidejte například <b>Keramický hrnek Hlína</b> nebo <b>Lněné povlečení</b> do košíku.</p>
            </div>
            <div className="demo-guide-step">
              <div className="demo-step-num">2</div>
              <h4>Aplikujte slevu</h4>
              <p>V košíku zadejte kupón <code>KAVKA10</code> (sleva 10 %) nebo <code>VITEJ150</code>.</p>
            </div>
            <div className="demo-guide-step">
              <div className="demo-step-num">3</div>
              <h4>Mapa Z-BOX / Balíkovny</h4>
              <p>V pokladně otevřete živou mapu Packety nebo České pošty a vyberte výdejní místo.</p>
            </div>
            <div className="demo-guide-step">
              <div className="demo-step-num">4</div>
              <h4>QR Platba (SPD)</h4>
              <p>Dokončete objednávku. Na děkovné stránce se okamžitě vygeneruje platný QR kód.</p>
            </div>
            <div className="demo-guide-step">
              <div className="demo-step-num">5</div>
              <h4>Kontrola v Adminu</h4>
              <p>Otevřete <Link to="/admin" style={{ color: "var(--accent)", fontWeight: 600 }}>/admin</Link> s heslem <code>KavkaAdmin123</code> a uvidíte novou objednávku!</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA section back to Platform Presentation */}
      <section className="section wrap" style={{ paddingTop: 0 }}>
        <div className="cta-final glass-card">
          <div>
            <h2>Líbí se vám tato ukázka e-shopu?</h2>
            <p>
              Tento kompletní e-shop KAVKA vám dodáme s vaším logem, vašimi barvami, vaším sortimentem a vaší doménou do 24 hodin.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
              <Link to="/" className="btn">
                Zobrazit prezentaci & Ceník KAVKA →
              </Link>
              <Link to="/admin" className="btn-line">
                Vyzkoušet demo administraci
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
