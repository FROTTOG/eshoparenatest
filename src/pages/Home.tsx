import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Category, type Product } from "../api";
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
        <div className="wrap hero-copy">
          <div className="kicker">{settings.store_name || "KAVKA"} · Česko</div>
          <h1>{settings.hero_title || "Domov, který dýchá pomalu"}</h1>
          <p className="lead">
            {settings.hero_text ||
              "Keramika z ateliéru, len z dílny, dřevo s kresbou. Posíláme po celé ČR — Z-BOX, Zásilkovna, Balíkovna i na adresu."}
          </p>
          <div className="hero-actions">
            <Link className="btn" to="/katalog">
              Do katalogu
            </Link>
            <Link className="btn-line" to="/doprava-a-platba">
              Doprava a mapa
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <img src="/hero.jpg" alt="Zátiší KAVKA" />
          <div className="hero-chip">Doprava Z-BOX od 59 Kč · nad 1 500 Kč zdarma</div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <h2>Místnosti domu</h2>
              <Link to="/katalog">Celý obchod →</Link>
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
              <h2>Teď v ateliéru</h2>
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
            ["01", "Z-BOX i Balíkovna", "Na pokladně otevřete mapu Česka a kliknete na konkrétní box nebo pobočku."],
            ["02", "Sklad do kusu", "Co vidíte, to máme. Objednávka rezervuje kusy, storno je vrací."],
            ["03", "Kupóny", "Zkuste KAVKA10 nebo VITEJ150. Počítáme je až na serveru, ne v prohlížeči."],
            ["04", "Jen Cloudflare", "Žádný cizí hosting. Pages, D1 databáze, R2 fotky. Váš účet, vaše data."],
          ].map(([num, title, text], i) => (
            <Reveal key={num} delay={i * 80} className="reveal-cell">
              <article>
                <div className="kicker" style={{ color: "var(--accent)" }}>{num}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
