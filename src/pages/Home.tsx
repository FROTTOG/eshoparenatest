import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Category, type Product } from "../api";
import { ProductCard } from "../components/ProductCard";
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
          <div className="section-head">
            <h2>Místnosti domu</h2>
            <Link to="/katalog">Celý obchod →</Link>
          </div>
          <div className="cats">
            {cats.map((c) => (
              <Link key={c.id} to={`/katalog/${c.slug}`} className="cat-card">
                <img src={c.image || "/products/vaza.jpg"} alt="" />
                <span>{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head">
            <h2>Teď v ateliéru</h2>
          </div>
          <div className="grid-products">
            {items.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap trust">
          <article>
            <div className="kicker" style={{ color: "var(--accent)" }}>01</div>
            <h3>Z-BOX i Balíkovna</h3>
            <p>Na pokladně otevřete mapu Česka a kliknete na konkrétní box nebo pobočku.</p>
          </article>
          <article>
            <div className="kicker" style={{ color: "var(--accent)" }}>02</div>
            <h3>Sklad do kusu</h3>
            <p>Co vidíte, to máme. Objednávka rezervuje kusy, storno je vrací.</p>
          </article>
          <article>
            <div className="kicker" style={{ color: "var(--accent)" }}>03</div>
            <h3>Kupóny</h3>
            <p>Zkuste KAVKA10 nebo VITEJ150. Počítáme je až na serveru, ne v prohlížeči.</p>
          </article>
          <article>
            <div className="kicker" style={{ color: "var(--accent)" }}>04</div>
            <h3>Jen Cloudflare</h3>
            <p>Žádný cizí hosting. Pages, D1 databáze, R2 fotky. Váš účet, vaše data.</p>
          </article>
        </div>
      </section>
    </>
  );
}
