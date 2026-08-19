import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, type Product as P } from "../api";
import { IconArrow, IconCheck, IconClock, IconLeaf, IconShield } from "../components/Icons";
import { ProductCard } from "../components/ProductCard";
import { Price, Stars, Stock } from "../components/Ui";
import { dateCs } from "../format";
import { useStore } from "../store";
import { usePageTitle } from "../title";

export function ProductPage() {
  const { slug } = useParams();
  const { user, addToCart, toast } = useStore();
  const [p, setP] = useState<P | null>(null);
  const [related, setRelated] = useState<P[]>([]);
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [status, setStatus] = useState<"load" | "ok" | "404" | "err">("load");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({ rating: 5, title: "", comment: "" });

  usePageTitle(p ? `${p.name} — KAVKA` : "Produkt — KAVKA");

  const pics = useMemo(() => {
    const list = (p?.images?.length ? p.images : p?.image ? [p.image] : []).filter(Boolean);
    return list.length ? list : ["/products/hrnek.jpg"];
  }, [p]);

  async function load() {
    if (!slug) return;
    setStatus("load");
    setImg(0);
    setQty(1);
    setAdded(false);
    try {
      const product = await api<P>(`/products/${slug}`);
      setP(product);
      setStatus("ok");
      if (product.category_slug) {
        const r = await api<{ items: P[] }>(`/products?category=${encodeURIComponent(product.category_slug)}&limit=8`);
        setRelated(r.items.filter((x) => x.id !== product.id).slice(0, 4));
      } else {
        setRelated([]);
      }
    } catch (e) {
      setP(null);
      setRelated([]);
      setStatus(e instanceof ApiError && e.status === 404 ? "404" : "err");
    }
  }

  useEffect(() => {
    void load();
  }, [slug]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (pics.length < 2) return;
      if (e.key === "ArrowRight") setImg((i) => (i + 1) % pics.length);
      if (e.key === "ArrowLeft") setImg((i) => (i - 1 + pics.length) % pics.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pics.length]);

  async function buy() {
    if (!p || p.stock <= 0) return;
    setBusy(true);
    try {
      await addToCart(p.id, qty);
      setAdded(true);
      window.setTimeout(() => setAdded(false), 2200);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Nešlo vložit do košíku.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function review(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setOk("");
    try {
      const r = await api<{ approved: boolean }>("/reviews", {
        method: "POST",
        body: JSON.stringify({ product_id: p?.id, ...form }),
      });
      setOk(r.approved ? "Děkujeme, hodnocení je vidět." : "Děkujeme, čeká na schválení.");
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Nešlo uložit.");
    }
  }

  if (status === "load") {
    return (
      <div className="wrap">
        <div className="product">
          <div className="gallery">
            <div className="skel" style={{ aspectRatio: "1" }} />
          </div>
          <div>
            <div className="skel" style={{ height: 18, width: 140, marginBottom: 12 }} />
            <div className="skel" style={{ height: 42, width: "80%", marginBottom: 16 }} />
            <div className="skel" style={{ height: 24, width: 120, marginBottom: 20 }} />
            <div className="skel" style={{ height: 90, width: "100%" }} />
          </div>
        </div>
      </div>
    );
  }

  if (status === "404" || !p) {
    return (
      <div className="wrap empty">
        <h1 className="serif">{status === "404" ? "Tuhle věc už nemáme" : "Nepodařilo se načíst produkt"}</h1>
        <p>Zkuste katalog — třeba tam ještě sedí na polici.</p>
        <Link className="btn" to="/katalog">
          Do katalogu
        </Link>
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    image: pics,
    description: p.description,
    sku: p.sku,
    brand: { "@type": "Brand", name: "KAVKA" },
    ...(p.review_count
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: p.rating || 0,
            reviewCount: p.review_count,
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "CZK",
      price: p.price,
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: typeof window !== "undefined" ? window.location.href : undefined,
    },
  };

  return (
    <div className="wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="crumbs">
        <Link to="/">Domů</Link> / <Link to="/katalog">Katalog</Link>
        {p.category_slug && (
          <>
            {" / "}
            <Link to={`/katalog/${p.category_slug}`}>{p.category_name}</Link>
          </>
        )}
        {` / ${p.name}`}
      </div>
      <div className="product">
        <div className="gallery">
          <button
            type="button"
            className="gallery-main"
            onClick={() => setImg((i) => (i + 1) % pics.length)}
            aria-label="Zvětšit další fotografii"
          >
            <img src={pics[img]} alt={p.name} />
          </button>
          {pics.length > 1 && (
            <div className="gallery-thumbs">
              {pics.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  className={i === img ? "on" : ""}
                  onClick={() => setImg(i)}
                  aria-label={`Fotografie ${i + 1}`}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="product-info">
          <div className="cat" style={{ letterSpacing: "0.16em", textTransform: "uppercase", fontSize: 12, color: "var(--muted)" }}>
            {p.category_name} · {p.sku}
          </div>
          <h1>{p.name}</h1>
          <Stars value={p.rating} count={p.review_count || 0} />
          <div style={{ margin: "14px 0" }}>
            <Price price={p.price} compare={p.compare_price} />
          </div>
          <Stock n={p.stock} />
          <p className="desc">{p.description}</p>
          <div className="qty-row">
            <div className="qty">
              <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))} aria-label="Méně kusů">
                −
              </button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((n) => Math.min(Math.max(1, p.stock), n + 1))} aria-label="Více kusů">
                +
              </button>
            </div>
            <button className="btn" disabled={p.stock <= 0 || busy} onClick={() => void buy()}>
              {p.stock <= 0 ? "Vyprodáno" : busy ? "Vkládám…" : added ? "V košíku" : "Vložit do košíku"}
            </button>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            Hmotnost {p.weight} g · skladem {p.stock} ks
          </p>
          <ul className="product-facts">
            <li>
              <IconLeaf size={16} /> Skladem do kusu — objednávka rezervuje polici
            </li>
            <li>
              <IconClock size={16} /> Výdejní místa zdarma od 1 500 Kč · Z-BOX od 59 Kč
            </li>
            <li>
              <IconShield size={16} /> 14 dní na vrácení · záruka 24 měsíců
            </li>
          </ul>
        </div>
      </div>

      <div className="product-sticky">
        <span>
          <b>{p.name}</b>
          <Price price={p.price} compare={p.compare_price} />
        </span>
        <button className="btn" disabled={p.stock <= 0 || busy} onClick={() => void buy()}>
          {p.stock <= 0 ? "Vyprodáno" : added ? "V košíku" : "Do košíku"}
        </button>
      </div>

      {related.length > 0 && (
        <section className="section" style={{ paddingTop: 12 }}>
          <div className="section-head">
            <div>
              <div className="kicker">Ze stejné místnosti</div>
              <h2>Mohlo by se hodit</h2>
            </div>
            {p.category_slug && (
              <Link className="text-link" to={`/katalog/${p.category_slug}`}>
                Celá kategorie <IconArrow size={16} />
              </Link>
            )}
          </div>
          <div className="grid-products">
            {related.map((item, i) => (
              <ProductCard key={item.id} p={item} index={i} />
            ))}
          </div>
        </section>
      )}

      <section className="reviews">
        <h2>Hodnocení</h2>
        {(p.reviews || []).map((r) => (
          <article key={r.id} className="review">
            <Stars value={r.rating} />
            <strong style={{ marginLeft: 8 }}>{r.title || "Bez nadpisu"}</strong>
            <p style={{ margin: "8px 0 4px" }}>{r.comment}</p>
            <small style={{ color: "var(--muted)" }}>
              {r.user_name} · {dateCs(r.created_at)}
            </small>
          </article>
        ))}
        {!p.reviews?.length && <p className="empty">Zatím tu nikdo nic nenapsal.</p>}

        {user ? (
          <form className="form" onSubmit={review} style={{ marginTop: 20 }}>
            <h3 className="serif" style={{ margin: 0 }}>
              Napsat hodnocení
            </h3>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
              Hodnotit můžete jen zboží, které jste u nás opravdu koupili.
            </p>
            <label>
              Hvězdy
              <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Titulek
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label>
              Text
              <textarea rows={4} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
            </label>
            {err && <div className="err">{err}</div>}
            {ok && (
              <div className="ok">
                <IconCheck size={16} /> {ok}
              </div>
            )}
            <button className="btn-dark" type="submit">
              Odeslat
            </button>
          </form>
        ) : (
          <p>
            Pro hodnocení se <Link to="/prihlaseni">přihlaste</Link>.
          </p>
        )}
      </section>
    </div>
  );
}
