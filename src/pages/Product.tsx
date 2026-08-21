import { FormEvent, TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, type Product as P } from "../api";
import { IconArrow, IconCart, IconCheck, IconClock, IconLeaf, IconShield } from "../components/Icons";
import { ProductCard } from "../components/ProductCard";
import { Price, Stars, Stock } from "../components/Ui";
import { WishButton } from "../components/WishButton";
import { czk, dateCs, pickupFreeOver, shippingByKind } from "../format";
import { optimizedImage } from "../image";
import { OptimizedImg } from "../components/OptimizedImg";
import { useStore } from "../store";
import { useSeo } from "../title";
import { trackAddToCart, trackViewItem } from "../analytics";

function validWatchEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

export function ProductPage() {
  const { slug } = useParams();
  const { user, addToCart, toast, shipping, recent, addRecent, settings } = useStore();
  const [p, setP] = useState<P | null>(null);
  const [alertEmail, setAlertEmail] = useState("");
  const [alertBusy, setAlertBusy] = useState(false);
  const [alertDone, setAlertDone] = useState("");
  const [pushWanted, setPushWanted] = useState(false);
  const [related, setRelated] = useState<P[]>([]);
  const [qty, setQty] = useState(1);
  const [img, setImg] = useState(0);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [status, setStatus] = useState<"load" | "ok" | "404" | "err">("load");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({ rating: 5, title: "", comment: "" });
  const [lightbox, setLightbox] = useState(false);
  const closeLightboxRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);
  const vatRate = Number(useStore().settings.invoice_vat_rate || 21);

  useSeo({
    title: p ? `${p.name} — KAVKA` : "Produkt — KAVKA",
    description: p?.short_description || p?.description || "Kousek z ateliéru KAVKA.",
    image: p ? optimizedImage(p.image || p.images?.[0]) : undefined,
    type: "product",
  });
  const freeOver = pickupFreeOver(shipping);
  const zbox = shippingByKind(shipping, "pickup_zbox");

  const pics = useMemo(() => {
    const list = (p?.images?.length ? p.images : p?.image ? [p.image] : []).filter(Boolean).map(optimizedImage);
    return list.length ? list : ["/products/hrnek.webp"];
  }, [p]);
  const picsRaw = useMemo(() => {
    const list = (p?.images?.length ? p.images : p?.image ? [p.image] : []).filter(Boolean);
    return list.length ? list : ["/products/hrnek.jpg"];
  }, [p]);

  async function load(signal?: AbortSignal) {
    if (!slug) return;
    setStatus("load");
    setImg(0);
    setQty(1);
    setAdded(false);
    try {
      const product = await api<P>(`/products/${slug}`, { signal });
      if (signal?.aborted) return;
      setP(product);
      addRecent(product);
      setStatus("ok");
      trackViewItem(
        { item_id: product.sku, item_name: product.name, price: product.price, item_category: product.category_name },
        product.price
      );
      if (product.category_slug) {
        const r = await api<{ items: P[] }>(`/products?category=${encodeURIComponent(product.category_slug)}&limit=8`, { signal });
        if (signal?.aborted) return;
        setRelated(r.items.filter((x) => x.id !== product.id).slice(0, 4));
      } else {
        setRelated([]);
      }
    } catch (e) {
      if (signal?.aborted) return;
      setP(null);
      setRelated([]);
      setStatus(e instanceof ApiError && e.status === 404 ? "404" : "err");
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (!lightbox) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const html = document.documentElement;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = html.style.overflow;
    document.body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    html.classList.add("lightbox-open");
    closeLightboxRef.current?.focus({ preventScroll: true });

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(false);
      if (pics.length < 2) return;
      if (e.key === "ArrowRight") setImg((i) => (i + 1) % pics.length);
      if (e.key === "ArrowLeft") setImg((i) => (i - 1 + pics.length) % pics.length);
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousBodyOverflow;
      html.style.overflow = previousHtmlOverflow;
      html.classList.remove("lightbox-open");
      previousFocus?.focus({ preventScroll: true });
    };
  }, [lightbox, pics.length]);

  const pushSupported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && !!settings.vapid_public_key;

  function vapidToUint8(base64: string): Uint8Array<ArrayBuffer> {
    const pad = "=".repeat((4 - (base64.length % 4)) % 4);
    const raw = atob(base64.replace(/-/g, "+").replace(/_/g, "/") + pad);
    const out = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  async function subscribePush(): Promise<string | null> {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidToUint8(settings.vapid_public_key || ""),
      });
      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      await api("/push/subscribe", { method: "POST", body: JSON.stringify({ product_id: p?.id, endpoint: json.endpoint, keys: json.keys }) });
      return json.endpoint || null;
    } catch {
      return null;
    }
  }

  async function watch() {
    if (!p || !validWatchEmail(alertEmail)) {
      toast("Zadejte platný e-mail pro upozornění.", "err");
      return;
    }
    setAlertBusy(true);
    try {
      if (pushWanted && pushSupported && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if (pushWanted && pushSupported && Notification.permission === "granted") {
        await subscribePush();
      }
      const r = await api<{ ok: boolean; message?: string }>("/stock-alerts", {
        method: "POST",
        body: JSON.stringify({ product_id: p.id, email: alertEmail }),
      });
      setAlertDone(r.message || "Hlídáme to za vás.");
      toast("Hlídací pes je nastavený.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Nepodařilo se nastavit hlídání.", "err");
    } finally {
      setAlertBusy(false);
    }
  }

  async function buy() {
    if (!p || p.stock <= 0) return;
    setBusy(true);
    try {
      await addToCart(p.id, qty);
      trackAddToCart(
        { item_id: p.sku, item_name: p.name, price: p.price, quantity: qty, item_category: p.category_name },
        p.price * qty
      );
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

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const productUrl = `${origin}/produkt/${p.slug}`;
  const breadcrumbs = [
    { name: "Domů", url: `${origin}/` },
    { name: "Katalog", url: `${origin}/katalog` },
    ...(p.category_slug
      ? [{ name: p.category_name || "Kategorie", url: `${origin}/katalog/${p.category_slug}` }]
      : []),
    { name: p.name, url: productUrl },
  ];
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
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
          url: productUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: b.name,
          item: b.url,
        })),
      },
    ],
  };

  const recentOthers = recent.filter((x) => x.id !== p.id).slice(0, 6);

  function onLightboxTouchStart(e: TouchEvent) {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  }
  function onLightboxTouchEnd(e: TouchEvent) {
    if (touchStartX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    if (pics.length < 2 || Math.abs(dx) < 40) return;
    if (dx > 0) setImg((i) => (i - 1 + pics.length) % pics.length);
    else setImg((i) => (i + 1) % pics.length);
  }

  const lightboxNode = lightbox
    ? createPortal(
        <div
          className="product-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Fotogalerie produktu ${p.name}`}
          onClick={() => setLightbox(false)}
          onTouchStart={onLightboxTouchStart}
          onTouchEnd={onLightboxTouchEnd}
        >
          <div className="product-lightbox-stage" onClick={(e) => e.stopPropagation()}>
            <button
              ref={closeLightboxRef}
              type="button"
              className="close-x product-lightbox-close"
              onClick={() => setLightbox(false)}
              aria-label="Zavřít fotogalerii"
            >
              ✕
            </button>
            <img
              className="product-lightbox-image"
              src={pics[img]}
              alt={`${p.name}, fotografie ${img + 1} z ${pics.length}`}
            />
            {pics.length > 1 && (
              <>
                <button
                  type="button"
                  className="product-lightbox-nav product-lightbox-prev"
                  onClick={() => setImg((i) => (i - 1 + pics.length) % pics.length)}
                  aria-label="Předchozí fotografie"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="product-lightbox-nav product-lightbox-next"
                  onClick={() => setImg((i) => (i + 1) % pics.length)}
                  aria-label="Další fotografie"
                >
                  ›
                </button>
                <div className="product-lightbox-meta">
                  <div className="product-lightbox-dots" aria-hidden="true">
                    {pics.map((_, i) => (
                      <span key={i} className={i === img ? "on" : ""} />
                    ))}
                  </div>
                  <p className="product-lightbox-caption">
                    {img + 1} / {pics.length}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

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
            onClick={() => setLightbox(true)}
            aria-label="Zvětšit fotografii"
          >
            <OptimizedImg src={picsRaw[img] || pics[img]} alt={p.name} width={900} height={900} decoding="async" fetchPriority="high" />
            <span className="gallery-zoom-hint">Klikněte pro zvětšení · {img + 1}/{pics.length}</span>
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
            <Price price={p.price} compare={p.compare_price} vatRate={vatRate} retail={p.price_retail} />
          </div>
          <Stock n={p.stock} />
          <p className="desc">{p.description}</p>
          <div className="qty-row">
            <div className="qty" aria-label="Počet kusů">
              <button
                type="button"
                disabled={qty <= 1}
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                aria-label="Odebrat jeden kus"
              >
                −
              </button>
              <span aria-live="polite">{qty}</span>
              <button
                type="button"
                disabled={p.stock <= 0 || qty >= p.stock}
                onClick={() => setQty((n) => Math.min(Math.max(1, p.stock), n + 1))}
                aria-label="Přidat jeden kus"
              >
                +
              </button>
            </div>
            <button
              type="button"
              className={`btn${added ? " btn-added" : ""}${busy ? " btn-busy" : ""}`}
              disabled={p.stock <= 0 || busy}
              onClick={() => void buy()}
            >
              {busy ? <span className="btn-spinner" aria-hidden="true" /> : added ? <IconCheck size={17} /> : <IconCart size={17} />}
              {p.stock <= 0 ? "Vyprodáno" : busy ? "Vkládám…" : added ? "V košíku" : "Vložit do košíku"}
            </button>
            <WishButton p={p} className="wish-inline" />
          </div>

          {p.stock <= 0 && (
            <div className="stock-alert-box">
              <b>Hlídací pes</b>
              <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--ink-soft)" }}>
                Tohle zboží je právě vyprodané. Napište nám e-mail — jakmile kus naskladníme, dáme vám vědět.
              </p>
              {alertDone ? (
                <p style={{ margin: "10px 0 0", color: "var(--ok)" }}>
                  <IconCheck size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />
                  {alertDone}
                </p>
              ) : (
                <>
                  <div className="sa-row">
                    <input
                      type="email"
                      placeholder={user?.email ? `např. ${user.email}` : "Váš e-mail"}
                      value={alertEmail}
                      onChange={(e) => setAlertEmail(e.target.value)}
                      aria-label="E-mail pro upozornění o naskladnění"
                      autoComplete="email"
                    />
                    <button type="button" className="btn" onClick={() => void watch()} disabled={alertBusy}>
                      {alertBusy ? "Hlídám…" : "Hlídat dostupnost"}
                    </button>
                  </div>
                  {pushSupported && (
                    <label className="sa-note" style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                      <input type="checkbox" checked={pushWanted} onChange={(e) => setPushWanted(e.target.checked)} />
                      Upozornit i v prohlížeči (Web Push)
                    </label>
                  )}
                  <p className="sa-note">E-mail použijeme pouze pro toto upozornění a podle GDPR ho dál nezpracováváme.</p>
                </>
              )}
            </div>
          )}

          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            Hmotnost {p.weight} g · skladem {p.stock} ks
          </p>
          <ul className="product-facts">
            <li>
              <IconLeaf size={16} /> Skladem do kusu — objednávka rezervuje polici
            </li>
            <li>
              <IconClock size={16} />{" "}
              {freeOver
                ? `Výdejní místa zdarma od ${czk(freeOver)}`
                : "Doprava na výdejní místo podle ceníku na pokladně"}
              {zbox ? ` · ${zbox.name} od ${czk(zbox.price)}` : ""}
            </li>
            <li>
              <IconShield size={16} /> 14 dní na vrácení · záruka 24 měsíců
            </li>
          </ul>
        </div>
      </div>

      {recentOthers.length > 0 && (
        <section className="section" style={{ paddingTop: 12 }}>
          <div className="section-head">
            <div>
              <div className="kicker">Zůstalo v paměti</div>
              <h2>Naposledy jste se dívali</h2>
            </div>
          </div>
          <div className="recent-strip">
            {recentOthers.map((r) => (
              <Link key={r.id} to={`/produkt/${r.slug}`} className="recent-card">
                <OptimizedImg src={r.image} alt={r.name} loading="lazy" decoding="async" width={240} height={240} />
                <div className="recent-card-body">
                  <span>{r.category_name || "KAVKA"}</span>
                  <b>{r.name}</b>
                  <small>{czk(r.price)}</small>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

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

        {user && p.can_review && !p.has_review ? (
          <form className="form" onSubmit={review} style={{ marginTop: 20 }}>
            <h3 className="serif" style={{ margin: 0 }}>
              Napsat hodnocení
            </h3>
            <p className="review-verified">
              <IconCheck size={15} /> Ověřený nákup — tento produkt máte v historii objednávek.
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
          <p className="review-note">
            {!user ? (
              <>
                Hodnotit může jen zákazník, který produkt koupil.{" "}
                <Link to="/prihlaseni">Přihlaste se</Link> a hodnocení napíšete u zboží ze své historie objednávek.
              </>
            ) : p.has_review ? (
              <>Tento produkt už jste hodnotili — děkujeme!</>
            ) : (
              <>
                Hodnotit můžete jen zboží, které máte v historii objednávek.{" "}
                <Link to="/ucet/objednavky">Zobrazit moje objednávky</Link>
              </>
            )}
          </p>
        )}
      </section>
      {lightboxNode}
    </div>
  );
}
