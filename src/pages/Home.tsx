import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Category, type Product } from "../api";
import { IconArrow, IconGift, IconLeaf, IconLocker, IconParcel, IconPin, IconShield, IconSpark, IconWrap } from "../components/Icons";
import { ProductCard } from "../components/ProductCard";
import { Reveal } from "../components/Reveal";
import { useStore } from "../store";

export function Home() {
  const { settings } = useStore();
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    void api<Category[]>("/categories").then(setCats);
    void api<{ items: Product[] }>("/products?featured=1&limit=8").then((r) => setItems(r.items));
  }, []);

  return (
    <>
      <section className="hero">
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="wrap hero-copy">
          <div className="kicker">{settings.store_name || "KAVKA"} · ateliér Praha</div>
          <h1>{settings.hero_title || "Domov, který dýchá pomalu"}</h1>
          <p className="lead">
            {settings.hero_text ||
              "Keramika z ateliéru, len z dílny, dřevo s kresbou. Posíláme po celé ČR — Z-BOX, Zásilkovna, Balíkovna i na adresu."}
          </p>
          <div className="hero-actions">
            <Link className="btn" to="/katalog">
              Do katalogu <IconArrow size={16} />
            </Link>
            <Link className="btn-line" to="/doprava-a-platba">
              Doprava a mapy
            </Link>
          </div>
          <div className="hero-pills">
            <span>
              <IconLocker size={16} /> Z-BOX od 59 Kč
            </span>
            <span>
              <IconPin size={16} /> živá mapa Packety
            </span>
            <span>
              <IconParcel size={16} /> Balíkovna
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <img src="/hero.jpg" alt="Zátiší KAVKA — keramika, len a dřevo" />
          <div className="hero-chip glass-card">
            <IconSpark size={16} />
            <span>Nad 1 500 Kč posíláme výdejní místa zdarma</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <div>
                <div className="kicker">Pokoj po pokoji</div>
                <h2>Místnosti domu</h2>
              </div>
              <Link className="text-link" to="/katalog">
                Celý obchod <IconArrow size={16} />
              </Link>
            </div>
          </Reveal>
          <div className="cats">
            {cats.map((c, i) => (
              <Reveal key={c.id} delay={(i % 5) * 60} className="reveal-cell">
                <Link to={`/katalog/${c.slug}`} className="cat-card">
                  <img src={c.image || "/products/vaza.jpg"} alt="" loading="lazy" />
                  <span>{c.name}</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <div>
                <div className="kicker">Právě teď</div>
                <h2>Teď v ateliéru</h2>
              </div>
            </div>
          </Reveal>
          <div className="grid-products">
            {items.map((p, i) => (
              <ProductCard key={p.id} p={p} index={i} />
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap trust">
          {[
            {
              icon: <IconPin />,
              title: "Živé mapy dopravců",
              text: "Zásilkovnu otevírá oficiální widget Packety, Balíkovnu mapa České pošty. Vidíte aktuální místa, ne jen náš seznam.",
            },
            {
              icon: <IconLeaf />,
              title: "Skladem do kusu",
              text: "Co vidíte, to máme na polici. Objednávka kus rezervuje, storno ho vrací. Žádné „do 21 dnů“.",
            },
            {
              icon: <IconGift />,
              title: "Kupóny z dílny",
              text: "Zkuste KAVKA10 nebo VITEJ150. Slevu počítáme na serveru — v košíku se na ni můžete spolehnout.",
            },
            {
              icon: <IconShield />,
              title: "Váš účet, vaše data",
              text: "Běžíme na Cloudflare. Žádný cizí marketplace, žádný pixel. Jen obchod, který vám neuteče z ruky.",
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
    </>
  );
}
