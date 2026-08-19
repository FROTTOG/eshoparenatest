import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, type Product as P } from "../api";
import { Price, Stars, Stock } from "../components/Ui";
import { dateCs } from "../format";
import { useStore } from "../store";

export function ProductPage() {
  const { slug } = useParams();
  const { user, addToCart, toast } = useStore();
  const [p, setP] = useState<P | null>(null);
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({ rating: 5, title: "", comment: "" });

  async function load() {
    if (!slug) return;
    setP(await api<P>(`/products/${slug}`));
  }

  useEffect(() => {
    void load();
  }, [slug]);

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

  if (!p) return <div className="wrap empty">Načítám…</div>;

  return (
    <div className="wrap">
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
          <img src={p.images?.[0] || p.image} alt={p.name} />
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
              <button type="button" onClick={() => setQty((n) => Math.max(1, n - 1))}>
                −
              </button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((n) => n + 1)}>
                +
              </button>
            </div>
            <button
              className="btn"
              disabled={p.stock <= 0}
              onClick={() => void addToCart(p.id, qty).catch((e) => toast(e.message, "err"))}
            >
              Vložit do košíku
            </button>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>Hmotnost {p.weight} g · skladem {p.stock} ks</p>
        </div>
      </div>

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
            {ok && <div className="ok">{ok}</div>}
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
