import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Category, type Page, type Product } from "../api";
import { ProductCard } from "../components/ProductCard";
import { Reveal } from "../components/Reveal";
import { optimizedImage } from "../image";
import { useStore } from "../store";
import { useSeo } from "../title";

/* ============================================================
   Model bloku — každý blok je { id, type, props }.
   ============================================================ */

export type Block = { id: string; type: string; props: Record<string, unknown> };

export function newBlock(type: string): Block {
  const def = TOOLBOX.find((t) => t.type === type)?.defaults || {};
  const copy = JSON.parse(JSON.stringify(def)) as Record<string, unknown>;
  return { id: uid(), type, props: copy };
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "b" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ============================================================
   Pomocníci
   ============================================================ */

function isT(v: unknown): string {
  return v == null ? "" : String(v);
}

function num(v: unknown, d: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function clamp(n: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, Number.isFinite(n) ? n : a));
}

function splitUrl(u: string): { host: string; path: string } | null {
  try {
    const x = new URL(u);
    return { host: x.hostname, path: x.pathname + x.search };
  } catch {
    return null;
  }
}

function alignJustify(align: string): React.CSSProperties["justifyContent"] {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
}

function starsOf(v: unknown): string {
  return "★".repeat(clamp(num(v, 5), 1, 5));
}

/** Přepočet presetu vnitřního okraje na px. */
const PAD: Record<string, string> = { none: "0", sm: "14px", md: "28px", lg: "48px", xl: "72px" };

/* ============================================================
   Toolbox — katalog bloků
   ============================================================ */

export type ToolboxItem = {
  type: string;
  label: string;
  icon: string;
  hint: string;
  group: string;
  defaults: Record<string, unknown>;
};

export const TOOLBOX_GROUPS = ["Text", "Média", "E-shop", "Rozvržení", "Prvky"] as const;

export const TOOLBOX: ToolboxItem[] = [
  // ---------- Text ----------
  { type: "heading", label: "Nadpis", icon: "H", hint: "Nadpis stránky či sekce", group: "Text", defaults: { text: "Nadpis", level: 2, align: "left", color: "", size: "", weight: "" } },
  { type: "paragraph", label: "Odstavec", icon: "¶", hint: "Textový odstavec", group: "Text", defaults: { text: "Zde napište vlastní text…", align: "left", size: "", color: "" } },
  { type: "badge", label: "Štítek", icon: "◆", hint: "Malý zvýrazněný štítek", group: "Text", defaults: { text: "Novinka", align: "left", color: "", bg: "" } },
  { type: "quote", label: "Citát", icon: "❝", hint: "Citát s autorem", group: "Text", defaults: { text: "Citát, který vystihuje náš přístup.", author: "Autor citátu", color: "", size: "" } },
  { type: "list", label: "Seznam", icon: "≡", hint: "Odrážky / číslovaný seznam", group: "Text", defaults: { ordered: false, items: ["První položka", "Druhá položka", "Třetí položka"], icon: "", size: "" } },
  { type: "alert", label: "Upozornění", icon: "⚠", hint: "Barevný box s informací", group: "Text", defaults: { kind: "info", title: "Dobré vědět", text: "Text upozornění…" } },

  // ---------- Média ----------
  { type: "image", label: "Obrázek", icon: "🖼", hint: "Obrázek s popiskem", group: "Média", defaults: { url: "", alt: "", caption: "", rounded: true, width: "", ratio: "auto", link: "", center: false } },
  { type: "gallery", label: "Galerie", icon: "▤", hint: "Mřížka obrázků", group: "Média", defaults: { urls: ["", "", "", ""], cols: "auto", gap: 10 } },
  { type: "video", label: "Video", icon: "▶", hint: "YouTube / Vimeo embed", group: "Média", defaults: { url: "", ratio: "16:9" } },
  { type: "map", label: "Mapa", icon: "⌖", hint: "Embed Google Maps", group: "Média", defaults: { embed: "", height: 0 } },
  { type: "banner", label: "Banner", icon: "▬", hint: "Obrázek s textem přes sebe", group: "Média", defaults: { img: "", title: "Titulek banneru", text: "Doprovodný text…", button_label: "", button_to: "", height: 340, overlay: 55 } },
  { type: "image_text", label: "Obrázek + text", icon: "◧", hint: "Obrázek vedle textu", group: "Média", defaults: { url: "", title: "Nadpis vedle obrázku", text: "Text vedle obrázku…", button_label: "", button_to: "", side: "left" } },

  // ---------- E-shop ----------
  { type: "hero", label: "Hero sekce", icon: "★", hint: "Úvodní sekce s titulkem a tlačítky", group: "E-shop", defaults: { kicker: "ATELIÉR KAVKA", title: "Domov, který dýchá pomalu", text: "Krátký úvodní text, který návštěvníka přivítá.", img: "/hero.webp", align: "center", primary_label: "Procházet katalog", primary_to: "/katalog", secondary_label: "", secondary_to: "", min_height: 420 } },
  { type: "products", label: "Produkty", icon: "🛍", hint: "Živá mřížka produktů z obchodu", group: "E-shop", defaults: { kicker: "Vybrané kousky", title: "Doporučujeme", source: "featured", category: "", count: 4, cols: 4, link_label: "Celý katalog", link_to: "/katalog" } },
  { type: "categories", label: "Kategorie", icon: "🗂", hint: "Živé karty kategorií", group: "E-shop", defaults: { kicker: "Sortiment", title: "Kategorie", count: 6, cols: 3, show_desc: true, link_label: "Celý obchod", link_to: "/katalog", card_cta: "Procházet kategorii" } },
  { type: "button", label: "Tlačítko", icon: "▣", hint: "Tlačítko s odkazem", group: "E-shop", defaults: { label: "Do katalogu", to: "/katalog", style: "primary", size: "md", align: "left", full: false, newtab: false, icon: "" } },
  { type: "cta", label: "Výzva k akci (CTA)", icon: "◎", hint: "Banner s tlačítky", group: "E-shop", defaults: { title: "Chcete vědět víc?", text: "Rádi vám poradíme s výběrem.", button_label: "Kontaktujte nás", button_to: "/o-nas", secondary_label: "", secondary_to: "", bg: "", color: "" } },
  { type: "pricing", label: "Ceník / balíčky", icon: "₿", hint: "Cenové karty s výhodami", group: "E-shop", defaults: { items: [{ name: "Základ", price: "990 Kč", period: "sada", features: "Výhoda první\nVýhoda druhá", button_label: "Vybrat", button_to: "/katalog", highlight: false }, { name: "Komplet", price: "1 890 Kč", period: "sada", features: "Vše ze Základu\nBonus navíc\nDoprava zdarma", button_label: "Vybrat", button_to: "/katalog", highlight: true }] } },
  { type: "countdown", label: "Odpočet", icon: "⏳", hint: "Odpočítávání do termínu", group: "E-shop", defaults: { label: "Akce končí za", target: "", done_text: "Už je to tady! 🎉" } },
  { type: "newsletter", label: "Newsletter", icon: "✉", hint: "Přihlášení k odběru novinek", group: "E-shop", defaults: { title: "Novinky z ateliéru", text: "Jednou za čas pošleme novinky a slevy. Žádný spam.", placeholder: "vas@email.cz", button_label: "Přihlásit" } },
  { type: "file", label: "Soubor ke stažení", icon: "⇩", hint: "Např. ceník v PDF", group: "E-shop", defaults: { label: "Ceník ke stažení", url: "", note: "PDF · 1,2 MB", button_label: "Stáhnout" } },

  // ---------- Rozvržení ----------
  { type: "columns", label: "Sloupce", icon: "▦", hint: "2–3 sloupce textu", group: "Rozvržení", defaults: { cols: 2, items: [{ title: "Sloupec 1", text: "Text sloupce…", icon: "", link: "" }, { title: "Sloupec 2", text: "Text sloupce…", icon: "", link: "" }] } },
  { type: "tabs", label: "Záložky (taby)", icon: "⊞", hint: "Přepínací panely obsahu", group: "Rozvržení", defaults: { items: [{ title: "První záložka", text: "Obsah první záložky…" }, { title: "Druhá záložka", text: "Obsah druhé záložky…" }] } },
  { type: "faq", label: "FAQ / Akordeon", icon: "?", hint: "Sklápěcí otázky", group: "Rozvržení", defaults: { items: [{ q: "Otázka?", a: "Odpověď…" }, { q: "Další otázka?", a: "Odpověď…" }], open_first: false } },
  { type: "timeline", label: "Časová osa", icon: "↧", hint: "Kroky / postup pod sebou", group: "Rozvržení", defaults: { items: [{ date: "Krok 1", title: "Vyberete si", text: "Popis kroku…" }, { date: "Krok 2", title: "Zabalíme", text: "Popis kroku…" }, { date: "Krok 3", title: "Doručíme", text: "Popis kroku…" }] } },
  { type: "trust", label: "Trust karty", icon: "♥", hint: "Proč nakupovat u nás", group: "Rozvržení", defaults: { items: [{ title: "Kvalita", text: "…", icon: "✦" }, { title: "Doprava", text: "…", icon: "🚚" }, { title: "Vrácení", text: "…", icon: "↩" }] } },
  { type: "feature", label: "Vlastnost", icon: "✦", hint: "Ikona + nadpis + text", group: "Rozvržení", defaults: { icon: "✦", title: "Název vlastnosti", text: "Popis…", link: "" } },
  { type: "info_list", label: "Seznam s ikonami", icon: "✔", hint: "Body s popiskem", group: "Rozvržení", defaults: { items: [{ title: "Osobní odběr", text: "…", icon: "📍" }, { title: "Rychlá doprava", text: "…", icon: "🚚" }] } },
  { type: "stats", label: "Čísla / statistiky", icon: "∑", hint: "Čísla s popiskem", group: "Rozvržení", defaults: { items: [{ value: "10", label: "let praxe", icon: "" }, { value: "1200", label: "spokojených", icon: "" }, { value: "24", label: "měsíců záruka", icon: "" }] } },
  { type: "team", label: "Tým", icon: "👥", hint: "Karty členů týmu", group: "Rozvržení", defaults: { items: [{ photo: "", name: "Jméno", role: "Role", text: "Krátké představení…" }, { photo: "", name: "Jméno", role: "Role", text: "Krátké představení…" }], cols: 3 } },
  { type: "testimonial", label: "Reference", icon: "★", hint: "Hodnocení zákazníků", group: "Rozvržení", defaults: { items: [{ name: "Zákaznice", role: "Ověřený nákup", text: "Skvělý obchod, rychlé dodání.", stars: 5 }, { name: "Zákazník", role: "Ověřený nákup", text: "Kvalita odpovídá popisu.", stars: 5 }], cols: 2 } },

  // ---------- Prvky ----------
  { type: "divider", label: "Oddělovač", icon: "—", hint: "Vodorovná čára", group: "Prvky", defaults: { style: "solid", color: "", thickness: 1, width: "" } },
  { type: "spacer", label: "Mezera", icon: "␣", hint: "Prázdný prostor", group: "Prvky", defaults: { height: 40 } },
  { type: "social", label: "Sociální sítě", icon: "◎", hint: "Odkazy na profily", group: "Prvky", defaults: { items: [{ label: "Instagram", url: "https://instagram.com", icon: "📷" }, { label: "Facebook", url: "https://facebook.com", icon: "👥" }] } },
  { type: "contact", label: "Kontakt", icon: "✆", hint: "E-mail, telefon, adresa, hodiny", group: "Prvky", defaults: { email: "ahoj@kavka.shop", phone: "+420 777 123 456", address: "Korunní 42, Praha 2", hours: "Po–Pá 10:00–18:00", map_label: "", map_url: "" } },
  { type: "table", label: "Tabulka", icon: "▤", hint: "Jednoduchá tabulka", group: "Prvky", defaults: { header: true, rows: "Parametr | Hodnota\nVýška | 12 cm\nMateriál | kamenina" } },
  { type: "html", label: "HTML kód", icon: "<>", hint: "Vlastní HTML", group: "Prvky", defaults: { html: "<p>Vlastní HTML…</p>" } },
];

/* ============================================================
   Dynamické bloky (komponenty s vlastním načítáním dat)
   ============================================================ */

function ProductsBlock({ p }: { p: Record<string, unknown> }) {
  const src = isT(p.source) || "featured";
  const cat = isT(p.category) || "";
  const count = clamp(num(p.count, 4), 1, 12);
  const cols = clamp(num(p.cols, 4), 1, 4);
  const [items, setItems] = useState<Product[] | null>(null);

  useEffect(() => {
    let on = true;
    let q = "";
    if (src === "new") q = "sort=new";
    else if (src === "category" && cat) q = `category=${encodeURIComponent(cat)}`;
    else q = "featured=1";
    void api<{ items: Product[] }>(`/products?${q}&limit=${count}`)
      .then((r) => { if (on) setItems(r.items || []); })
      .catch(() => { if (on) setItems([]); });
    return () => { on = false; };
  }, [src, cat, count]);

  return (
    <div>
      {(isT(p.title) || isT(p.kicker)) && (
        <div className="pb-sec-head">
          <div>
            {isT(p.kicker) && <div className="pb-kicker">{isT(p.kicker)}</div>}
            {isT(p.title) && <h2 className="serif">{isT(p.title)}</h2>}
          </div>
          {isT(p.link_label) && (
            <Link className="btn-line" to={isT(p.link_to) || "/katalog"}>{isT(p.link_label)} →</Link>
          )}
        </div>
      )}
      {items === null ? (
        <div className="pb-loading">Načítám produkty…</div>
      ) : items.length === 0 ? (
        <div className="pb-embed-empty">Žádné produkty k zobrazení. Označte zboží jako „doporučené“ nebo zadejte kategorii.</div>
      ) : (
        <div className={`pb-products pb-cols-${cols}`}>
          {items.slice(0, count).map((it, i) => <ProductCard key={it.id} p={it} index={i} />)}
        </div>
      )}
    </div>
  );
}

function CategoriesBlock({ p }: { p: Record<string, unknown> }) {
  const count = clamp(num(p.count, 6), 1, 12);
  const cols = clamp(num(p.cols, 3), 1, 4);
  const [cats, setCats] = useState<Category[] | null>(null);

  useEffect(() => {
    let on = true;
    void api<Category[]>("/categories")
      .then((r) => { if (on) setCats(r || []); })
      .catch(() => { if (on) setCats([]); });
    return () => { on = false; };
  }, []);

  return (
    <div>
      {(isT(p.title) || isT(p.kicker)) && (
        <div className="pb-sec-head">
          <div>
            {isT(p.kicker) && <div className="pb-kicker">{isT(p.kicker)}</div>}
            {isT(p.title) && <h2 className="serif">{isT(p.title)}</h2>}
          </div>
          {isT(p.link_label) && (
            <Link className="btn-line" to={isT(p.link_to) || "/katalog"}>{isT(p.link_label)} →</Link>
          )}
        </div>
      )}
      {cats === null ? (
        <div className="pb-loading">Načítám kategorie…</div>
      ) : cats.length === 0 ? (
        <div className="pb-embed-empty">Žádné kategorie k zobrazení.</div>
      ) : (
        <div className={`pb-cats pb-cols-${cols}`}>
          {cats.slice(0, count).map((c) => (
            <Link key={c.id} to={`/katalog/${c.slug}`} className="pb-cat-card">
              <div className="pb-cat-img">
                {c.image ? <img src={optimizedImage(c.image)} alt={c.name} loading="lazy" /> : <div className="pb-img-empty">bez obrázku</div>}
              </div>
              <div className="pb-cat-info">
                <h3>{c.name}</h3>
                {!!p.show_desc && <p>{c.description || "Kolekce z ateliéru"}</p>}
                <span className="pb-cat-cta">{isT(p.card_cta) || "Procházet kategorii"} →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function TabsBlock({ p }: { p: Record<string, unknown> }) {
  const items = (p.items as { title: string; text: string }[]) || [];
  const [act, setAct] = useState(0);
  const idx = clamp(act, 0, Math.max(0, items.length - 1));
  return (
    <div className="pb-tabs">
      <div className="pb-tabs-bar" role="tablist">
        {items.map((it, i) => (
          <button key={i} type="button" role="tab" aria-selected={i === idx} className={i === idx ? "on" : ""} onClick={() => setAct(i)}>
            {it.title}
          </button>
        ))}
      </div>
      {items[idx] && <div className="pb-tabs-panel">{items[idx].text}</div>}
    </div>
  );
}

function CountdownBlock({ p }: { p: Record<string, unknown> }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const target = isT(p.target);
  const end = new Date(target).getTime();
  if (!target || Number.isNaN(end)) {
    return <div className="pb-embed-empty">Zadejte datum a čas odpočtu ve tvaru např. 2026-12-24T18:00.</div>;
  }
  const diff = Math.max(0, end - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <div className="pb-countdown">
      {isT(p.label) && <div className="pb-countdown-label">{isT(p.label)}</div>}
      {diff === 0 ? (
        <div className="pb-countdown-done">{isT(p.done_text) || "Už je to tady! 🎉"}</div>
      ) : (
        <div className="pb-countdown-grid">
          <div className="pb-cd-cell"><b>{String(d).padStart(2, "0")}</b><span>dní</span></div>
          <div className="pb-cd-cell"><b>{String(h).padStart(2, "0")}</b><span>hodin</span></div>
          <div className="pb-cd-cell"><b>{String(m).padStart(2, "0")}</b><span>minut</span></div>
          <div className="pb-cd-cell"><b>{String(s).padStart(2, "0")}</b><span>sekund</span></div>
        </div>
      )}
    </div>
  );
}

function NewsletterBlock({ p }: { p: Record<string, unknown> }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const { toast } = useStore();
  return (
    <div className="pb-newsletter">
      {isT(p.title) && <h3>{isT(p.title)}</h3>}
      {isT(p.text) && <p>{isT(p.text)}</p>}
      {done ? (
        <div className="pb-alert pb-alert-success">
          <span className="pb-alert-icon">✅</span>
          <div><b>Děkujeme!</b><p>E-mail {email} je přihlášený k odběru novinek.</p></div>
        </div>
      ) : (
        <form
          className="pb-newsletter-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            setDone(true);
            toast("Přihlášeno k odběru novinek.");
          }}
        >
          <input type="email" required placeholder={isT(p.placeholder) || "vas@email.cz"} value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit" className="btn-dark">{isT(p.button_label) || "Přihlásit"}</button>
        </form>
      )}
    </div>
  );
}

/* ============================================================
   Veřejné vykreslení bloků
   ============================================================ */

function renderBlockInner(b: Block): React.ReactNode {
  const p = b.props || {};
  switch (b.type) {
    case "heading": {
      const lvl = clamp(num(p.level, 2), 1, 3);
      const H = (["h1", "h2", "h3"] as const)[lvl - 1];
      return (
        <H
          className={lvl <= 2 ? "serif" : undefined}
          style={{
            textAlign: (isT(p.align) || "left") as React.CSSProperties["textAlign"],
            color: isT(p.color) || undefined,
            fontSize: num(p.size, 0) > 0 ? `${num(p.size, 0)}px` : undefined,
            fontWeight: isT(p.weight) || undefined,
          }}
        >
          {isT(p.text)}
        </H>
      );
    }
    case "paragraph":
      return (
        <p
          style={{
            textAlign: (isT(p.align) || "left") as React.CSSProperties["textAlign"],
            color: isT(p.color) || undefined,
            fontSize: num(p.size, 0) > 0 ? `${num(p.size, 0)}px` : undefined,
          }}
        >
          {isT(p.text)}
        </p>
      );
    case "badge":
      return (
        <div className="pb-badge-row" style={{ textAlign: (isT(p.align) || "left") as React.CSSProperties["textAlign"] }}>
          <span className="pb-badge" style={{ color: isT(p.color) || undefined, background: isT(p.bg) || undefined }}>
            {isT(p.text)}
          </span>
        </div>
      );
    case "image": {
      const url = isT(p.url);
      const ratio = isT(p.ratio);
      const imgStyle: React.CSSProperties = {};
      if (isT(p.width)) imgStyle.width = isT(p.width);
      if (ratio && ratio !== "auto") imgStyle.aspectRatio = ratio;
      const img = url ? (
        <img src={optimizedImage(url)} alt={isT(p.alt)} loading="lazy" style={imgStyle} />
      ) : (
        <div className="pb-img-empty">Obrázek bez URL</div>
      );
      const fig = (
        <figure className={p.rounded === false ? "" : "pb-figure"} style={p.center ? { textAlign: "center" } : undefined}>
          {img}
          {isT(p.caption) && <figcaption>{isT(p.caption)}</figcaption>}
        </figure>
      );
      return isT(p.link) ? (
        <a href={isT(p.link)} target={isT(p.link).startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
          {fig}
        </a>
      ) : (
        fig
      );
    }
    case "button": {
      const sizeCls = isT(p.size) === "sm" ? "btn-sm" : isT(p.size) === "lg" ? "btn-lg" : "";
      const styleCls = p.style === "line" ? "btn-line" : p.style === "dark" ? "btn-dark" : "btn";
      return (
        <div className="pb-btn-row" style={{ justifyContent: alignJustify(isT(p.align)) }}>
          <Link
            to={isT(p.to) || "/"}
            className={`${styleCls} ${sizeCls}`.trim()}
            target={p.newtab ? "_blank" : undefined}
            rel={p.newtab ? "noopener noreferrer" : undefined}
            style={p.full ? { width: "100%", justifyContent: "center" } : undefined}
          >
            {isT(p.icon) && <span className="pb-btn-icon">{isT(p.icon)}</span>}
            {isT(p.label)}
          </Link>
        </div>
      );
    }
    case "list": {
      const items = (p.items as string[]) || [];
      const icon = isT(p.icon);
      const style = num(p.size, 0) > 0 ? { fontSize: `${num(p.size, 0)}px` } : undefined;
      return p.ordered ? (
        <ol className="pb-list" style={style}>
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ol>
      ) : (
        <ul className={`pb-list${icon ? " has-icon" : ""}`} style={style}>
          {items.map((it, i) => (
            <li key={i}>
              {icon && <span className="pb-li-icon">{icon}</span>}
              {it}
            </li>
          ))}
        </ul>
      );
    }
    case "quote":
      return (
        <blockquote
          className="pb-quote"
          style={{ color: isT(p.color) || undefined, fontSize: num(p.size, 0) > 0 ? `${num(p.size, 0)}px` : undefined }}
        >
          <p>{isT(p.text)}</p>
          {isT(p.author) && <cite>{isT(p.author)}</cite>}
        </blockquote>
      );
    case "alert": {
      const kind = ["info", "success", "warning", "tip"].includes(isT(p.kind)) ? isT(p.kind) : "info";
      const icons: Record<string, string> = { info: "ℹ️", success: "✅", warning: "⚠️", tip: "💡" };
      return (
        <div className={`pb-alert pb-alert-${kind}`}>
          <span className="pb-alert-icon">{icons[kind]}</span>
          <div>
            {isT(p.title) && <b>{isT(p.title)}</b>}
            {isT(p.text) && <p>{isT(p.text)}</p>}
          </div>
        </div>
      );
    }
    case "divider":
      return (
        <hr
          className="pb-divider"
          style={{
            borderTop: `${num(p.thickness, 1)}px ${isT(p.style) || "solid"} ${isT(p.color) || "var(--line)"}`,
            width: isT(p.width) || undefined,
          }}
        />
      );
    case "spacer":
      return <div style={{ height: num(p.height, 40) }} />;
    case "columns": {
      const cols = clamp(num(p.cols, 2), 1, 3);
      const items = (p.items as { title: string; text: string; icon: string; link: string }[]) || [];
      return (
        <div className={`pb-columns cols-${cols}`}>
          {items.slice(0, cols).map((it, i) => {
            const body = (
              <div className="pb-col">
                {isT(it.icon) && <span className="pb-col-icon">{it.icon}</span>}
                <h3>{isT(it.title)}</h3>
                <p>{isT(it.text)}</p>
              </div>
            );
            return it.link ? (
              <a key={i} href={it.link} className="pb-col-link" target={it.link.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                {body}
              </a>
            ) : (
              <div key={i}>{body}</div>
            );
          })}
        </div>
      );
    }
    case "cta":
      return (
        <div className="pb-cta" style={{ background: isT(p.bg) || undefined, color: isT(p.color) || undefined }}>
          <h3>{isT(p.title)}</h3>
          <p>{isT(p.text)}</p>
          <div className="pb-btn-row" style={{ justifyContent: "center" }}>
            <Link to={isT(p.button_to) || "/"} className="btn">{isT(p.button_label)}</Link>
            {isT(p.secondary_label) && (
              <Link to={isT(p.secondary_to) || "/"} className="btn-line">{isT(p.secondary_label)}</Link>
            )}
          </div>
        </div>
      );
    case "feature": {
      const body = (
        <div className="pb-feature">
          <span className="pb-feature-icon">{isT(p.icon) || "✦"}</span>
          <h3>{isT(p.title)}</h3>
          <p>{isT(p.text)}</p>
        </div>
      );
      return isT(p.link) ? (
        <a href={isT(p.link)} className="pb-col-link" target={isT(p.link).startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
          {body}
        </a>
      ) : (
        body
      );
    }
    case "trust":
      return (
        <div className="pb-trust">
          {((p.items as { title: string; text: string; icon: string }[]) || []).map((it, i) => (
            <div key={i} className="pb-trust-card">
              {isT(it.icon) && <span className="pb-trust-icon">{it.icon}</span>}
              <b>{isT(it.title)}</b>
              <span>{isT(it.text)}</span>
            </div>
          ))}
        </div>
      );
    case "faq":
      return (
        <div className="pb-faq">
          {((p.items as { q: string; a: string }[]) || []).map((it, i) => (
            <details key={i} className="pb-faq-item" {...(i === 0 && p.open_first ? { open: true } : {})}>
              <summary>{isT(it.q)}</summary>
              <p>{isT(it.a)}</p>
            </details>
          ))}
        </div>
      );
    case "gallery": {
      const cols = clamp(num(p.cols, 0), 0, 4); // 0 = auto
      return (
        <div className={`pb-gallery${cols > 0 ? ` cols-${cols}` : ""}`} style={{ gap: num(p.gap, 10) }}>
          {((p.urls as string[]) || []).filter(Boolean).map((u, i) => (
            <img key={i} src={optimizedImage(u)} alt="" loading="lazy" />
          ))}
        </div>
      );
    }
    case "stats":
      return (
        <div className="pb-stats">
          {((p.items as { value: string; label: string; icon: string }[]) || []).map((it, i) => (
            <div key={i} className="pb-stat">
              {isT(it.icon) && <span className="pb-stat-icon">{it.icon}</span>}
              <b>{isT(it.value)}</b>
              <span>{isT(it.label)}</span>
            </div>
          ))}
        </div>
      );
    case "info_list":
      return (
        <ul className="pb-info-list">
          {((p.items as { title: string; text: string; icon: string }[]) || []).map((it, i) => (
            <li key={i}>
              <b>{isT(it.icon) && <span className="pb-li-icon">{it.icon}</span>}{isT(it.title)}</b>
              <span>{isT(it.text)}</span>
            </li>
          ))}
        </ul>
      );
    case "contact":
      return (
        <div className="pb-contact">
          {isT(p.email) && <p><b>E-mail:</b> <a href={`mailto:${isT(p.email)}`}>{isT(p.email)}</a></p>}
          {isT(p.phone) && <p><b>Telefon:</b> <a href={`tel:${isT(p.phone).replace(/\s+/g, "")}`}>{isT(p.phone)}</a></p>}
          {isT(p.address) && <p><b>Adresa:</b> {isT(p.address)}</p>}
          {isT(p.hours) && <p><b>Otevírací doba:</b> {isT(p.hours)}</p>}
          {isT(p.map_label) && (
            <div className="pb-btn-row">
              <a className="btn-line btn-sm" href={isT(p.map_url) || "#"} target="_blank" rel="noopener noreferrer">{isT(p.map_label)}</a>
            </div>
          )}
        </div>
      );
    case "map": {
      const u = isT(p.embed);
      if (!u) return <div className="pb-embed-empty">Vložte odkaz na mapu (Google Maps embed).</div>;
      const h = num(p.height, 0);
      return (
        <div className="pb-embed" style={h > 0 ? { paddingTop: 0, height: h } : undefined}>
          <iframe src={u} loading="lazy" title="Mapa" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      );
    }
    case "video": {
      const url = splitUrl(isT(p.url));
      const ratio = isT(p.ratio) === "4:3" ? 75 : isT(p.ratio) === "1:1" ? 100 : 56.25;
      if (!url) return <div className="pb-embed-empty">Vložte YouTube nebo Vimeo adresu.</div>;
      if (url.host.includes("youtu")) {
        const v = url.path.startsWith("/shorts/") ? url.path.split("/")[2] : url.path === "/watch" ? new URLSearchParams(url.path.split("?")[1] || "").get("v") : url.path.replace("/", "");
        return (
          <div className="pb-embed" style={{ paddingTop: `${ratio}%` }}>
            <iframe src={`https://www.youtube.com/embed/${v || ""}`} title="Video" allow="fullscreen" allowFullScreen loading="lazy" />
          </div>
        );
      }
      if (url.host.includes("vimeo")) {
        return (
          <div className="pb-embed" style={{ paddingTop: `${ratio}%` }}>
            <iframe src={`https://player.vimeo.com/video${url.path}`} title="Video" allow="fullscreen" allowFullScreen loading="lazy" />
          </div>
        );
      }
      return (
        <div className="pb-embed" style={{ paddingTop: `${ratio}%` }}>
          <iframe src={isT(p.url)} title="Video" allow="fullscreen" allowFullScreen loading="lazy" />
        </div>
      );
    }
    case "hero": {
      const img = isT(p.img);
      const align = isT(p.align) || "center";
      const style: React.CSSProperties = { textAlign: align as React.CSSProperties["textAlign"] };
      if (num(p.min_height, 0) > 0) style.minHeight = num(p.min_height, 420);
      if (img) style.backgroundImage = `url(${optimizedImage(img)})`;
      return (
        <div className={`pb-hero${img ? " has-img" : ""}`} style={style}>
          <div className="pb-hero-inner">
            {isT(p.kicker) && <span className="pb-kicker">{isT(p.kicker)}</span>}
            <h2 className="serif">{isT(p.title)}</h2>
            {isT(p.text) && <p className="pb-hero-text">{isT(p.text)}</p>}
            {(isT(p.primary_label) || isT(p.secondary_label)) && (
              <div className="pb-btn-row" style={{ justifyContent: alignJustify(align) }}>
                {isT(p.primary_label) && <Link className="btn" to={isT(p.primary_to) || "/"}>{isT(p.primary_label)}</Link>}
                {isT(p.secondary_label) && <Link className="btn-line" to={isT(p.secondary_to) || "/"}>{isT(p.secondary_label)}</Link>}
              </div>
            )}
          </div>
        </div>
      );
    }
    case "image_text": {
      const url = isT(p.url);
      return (
        <div className={`pb-imgtxt side-${isT(p.side) || "left"}`}>
          <div className="pb-imgtxt-media">
            {url ? <img src={optimizedImage(url)} alt={isT(p.title)} loading="lazy" /> : <div className="pb-img-empty">Obrázek bez URL</div>}
          </div>
          <div className="pb-imgtxt-body">
            <h3>{isT(p.title)}</h3>
            <p>{isT(p.text)}</p>
            {isT(p.button_label) && (
              <div className="pb-btn-row">
                <Link className="btn" to={isT(p.button_to) || "/"}>{isT(p.button_label)}</Link>
              </div>
            )}
          </div>
        </div>
      );
    }
    case "banner": {
      const img = isT(p.img);
      const overlay = clamp(num(p.overlay, 55), 0, 95);
      return (
        <div className="pb-banner" style={{ minHeight: num(p.height, 340) }}>
          {img && <img className="pb-banner-img" src={optimizedImage(img)} alt="" loading="lazy" />}
          {img && <div className="pb-banner-overlay" style={{ background: `rgba(15, 19, 13, ${overlay / 100})` }} />}
          <div className="pb-banner-body">
            <h3>{isT(p.title)}</h3>
            {isT(p.text) && <p>{isT(p.text)}</p>}
            {isT(p.button_label) && (
              <div className="pb-btn-row">
                <Link className="btn" to={isT(p.button_to) || "/"}>{isT(p.button_label)}</Link>
              </div>
            )}
          </div>
        </div>
      );
    }
    case "products":
      return <ProductsBlock p={p} />;
    case "categories":
      return <CategoriesBlock p={p} />;
    case "testimonial": {
      const cols = clamp(num(p.cols, 2), 1, 3);
      return (
        <div className={`pb-testimonials pb-cols-${cols}`}>
          {((p.items as { name: string; role: string; text: string; stars: number }[]) || []).map((it, i) => (
            <figure key={i} className="pb-testimonial">
              <div className="pb-stars">{starsOf(it.stars)}</div>
              <blockquote>{isT(it.text)}</blockquote>
              <figcaption>
                <b>{isT(it.name)}</b>
                {isT(it.role) && <span>{isT(it.role)}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      );
    }
    case "team": {
      const cols = clamp(num(p.cols, 3), 1, 4);
      return (
        <div className={`pb-team pb-cols-${cols}`}>
          {((p.items as { photo: string; name: string; role: string; text: string }[]) || []).map((it, i) => (
            <div key={i} className="pb-team-card">
              {isT(it.photo) ? (
                <img className="pb-team-photo" src={optimizedImage(it.photo)} alt={isT(it.name)} loading="lazy" />
              ) : (
                <div className="pb-team-photo pb-team-photo-empty">👤</div>
              )}
              <b>{isT(it.name)}</b>
              {isT(it.role) && <span className="pb-team-role">{isT(it.role)}</span>}
              {isT(it.text) && <p>{isT(it.text)}</p>}
            </div>
          ))}
        </div>
      );
    }
    case "pricing": {
      const cols = clamp(num(p.cols, 2), 1, 4);
      return (
        <div className={`pb-pricing pb-cols-${cols}`}>
          {((p.items as { name: string; price: string; period: string; features: string; button_label: string; button_to: string; highlight: boolean }[]) || []).map((it, i) => (
            <div key={i} className={`pb-price-card${it.highlight ? " highlight" : ""}`}>
              {it.highlight && <span className="pb-price-flag">Nejoblíbenější</span>}
              <h3>{isT(it.name)}</h3>
              <div className="pb-price">
                <b>{isT(it.price)}</b>
                {isT(it.period) && <span>/ {isT(it.period)}</span>}
              </div>
              {isT(it.features) && (
                <ul>
                  {isT(it.features).split("\n").filter(Boolean).map((f, j) => <li key={j}>{f}</li>)}
                </ul>
              )}
              {isT(it.button_label) && (
                <div className="pb-btn-row" style={{ justifyContent: "center" }}>
                  <Link className={it.highlight ? "btn" : "btn-line"} to={isT(it.button_to) || "/"}>{isT(it.button_label)}</Link>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    case "timeline":
      return (
        <div className="pb-timeline">
          {((p.items as { date: string; title: string; text: string }[]) || []).map((it, i) => (
            <div key={i} className="pb-tl-item">
              <span className="pb-tl-dot">{i + 1}</span>
              <div className="pb-tl-body">
                {isT(it.date) && <span className="pb-tl-date">{it.date}</span>}
                <b>{isT(it.title)}</b>
                {isT(it.text) && <p>{isT(it.text)}</p>}
              </div>
            </div>
          ))}
        </div>
      );
    case "tabs":
      return <TabsBlock p={p} />;
    case "countdown":
      return <CountdownBlock p={p} />;
    case "newsletter":
      return <NewsletterBlock p={p} />;
    case "social":
      return (
        <div className="pb-social">
          {((p.items as { label: string; url: string; icon: string }[]) || []).map((it, i) => (
            <a key={i} className="pb-social-chip" href={isT(it.url) || "#"} target="_blank" rel="noopener noreferrer">
              <span className="pb-social-icon">{isT(it.icon) || "🔗"}</span>
              {isT(it.label)}
            </a>
          ))}
        </div>
      );
    case "table": {
      const rows = isT(p.rows)
        .split("\n")
        .map((r) => r.split("|").map((c) => c.trim()))
        .filter((r) => r.some((c) => c !== ""));
      if (!rows.length) return <div className="pb-embed-empty">Vložte řádky tabulky — každý řádek na nový řádek, sloupce oddělte „|“.</div>;
      const header = !!p.header;
      return (
        <div className="pb-table-wrap">
          <table className="pb-table">
            {header && (
              <thead>
                <tr>{rows[0].map((c, i) => <th key={i}>{c}</th>)}</tr>
              </thead>
            )}
            <tbody>
              {(header ? rows.slice(1) : rows).map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case "file":
      return (
        <div className="pb-file">
          <span className="pb-file-icon">📄</span>
          <div className="pb-file-body">
            <b>{isT(p.label) || "Soubor ke stažení"}</b>
            {isT(p.note) && <span>{isT(p.note)}</span>}
          </div>
          <a className="btn-line btn-sm" href={isT(p.url) || "#"} download target="_blank" rel="noopener noreferrer">
            {isT(p.button_label) || "Stáhnout"}
          </a>
        </div>
      );
    case "html":
      return <div dangerouslySetInnerHTML={{ __html: isT(p.html) }} />;
    default:
      return <p>Neznámý blok {b.type}</p>;
  }
}

export function renderBlock(b: Block): React.ReactNode {
  const p = b.props || {};
  const style: React.CSSProperties = {};
  const pad = isT(p.pad);
  if (pad && PAD[pad]) style.padding = PAD[pad];
  if (p.bg) style.background = isT(p.bg);
  if (p.color) style.color = isT(p.color);
  const r = num(p.radius, 0);
  if (r > 0) style.borderRadius = `${r}px`;
  const mw = isT(p.maxw);
  if (mw) style.maxWidth = /^\d+$/.test(mw) ? `${mw}px` : mw;
  if (p.shadow) style.boxShadow = "0 10px 30px rgba(30, 26, 18, 0.10)";
  const cls = ["pb-block", `pb-block-${b.type}`, isT(p.cls), p.hide_m ? "pb-hide-m" : ""].filter(Boolean).join(" ");
  const inner = (
    <div className="pb-block-inner" style={style} id={isT(p.anchor) || undefined}>
      {renderBlockInner(b)}
    </div>
  );
  return <div className={cls}>{p.reveal ? <Reveal>{inner}</Reveal> : inner}</div>;
}

/* ============================================================
   Editor polí bloku (inspector v administraci)
   ============================================================ */

function Field({
  label,
  value,
  onChange,
  type = "text",
  rows,
  options,
  min,
  max,
  step,
}: {
  label: string;
  value: unknown;
  onChange: (v: unknown) => void;
  type?: "text" | "number" | "textarea" | "select" | "checkbox" | "color" | "range";
  rows?: number;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}) {
  let inner: React.ReactNode;
  switch (type) {
    case "textarea":
      inner = <textarea rows={rows || 3} value={isT(value)} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "number":
      inner = <input type="number" value={value as number} onChange={(e) => onChange(Number(e.target.value))} />;
      break;
    case "checkbox":
      inner = <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />;
      break;
    case "select":
      inner = (
        <select value={isT(value)} onChange={(e) => onChange(e.target.value)}>
          {(options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      break;
    case "color":
      inner = (
        <div className="pb-color-row">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{3,8}$/.test(isT(value)) ? isT(value) : "#c9b37e"}
            onChange={(e) => onChange(e.target.value)}
            title="Výběr barvy"
          />
          <input value={isT(value)} onChange={(e) => onChange(e.target.value)} placeholder="transparentní" />
        </div>
      );
      break;
    case "range":
      inner = (
        <div className="pb-range-row">
          <input type="range" min={min ?? 0} max={max ?? 100} step={step ?? 1} value={num(value, 0)} onChange={(e) => onChange(Number(e.target.value))} />
          <output>{num(value, 0)}</output>
        </div>
      );
      break;
    default:
      inner = <input value={isT(value)} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <label className={`pb-field pb-field-${type}`}>
      <span>{label}</span>
      {inner}
    </label>
  );
}

function StringsEditor({
  label,
  values,
  onChange,
  multiline,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  multiline?: boolean;
}) {
  return (
    <div className="pb-field pb-strings">
      <span>{label}</span>
      {values.map((it, i) => (
        <div key={i} className="pb-string-row">
          {multiline ? (
            <textarea rows={2} value={it} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} />
          ) : (
            <input value={it} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} />
          )}
          <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} title="Odebrat">×</button>
        </div>
      ))}
      <button type="button" className="pb-add" onClick={() => onChange([...values, ""])}>+ přidat položku</button>
    </div>
  );
}

function ObjListEditor({
  label,
  fields,
  items,
  onChange,
}: {
  label: string;
  fields: { key: string; label: string; multiline?: boolean; checkbox?: boolean }[];
  items: Record<string, unknown>[];
  onChange: (v: Record<string, unknown>[]) => void;
}) {
  return (
    <div className="pb-field pb-objlist">
      <span>{label}</span>
      {items.map((it, i) => (
        <div key={i} className="pb-objcard">
          {fields.map((f) => (
            <div key={f.key} className="pb-objrow">
              {f.checkbox ? (
                <label className="pb-objcheck">
                  <input
                    type="checkbox"
                    checked={!!it[f.key]}
                    onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: e.target.checked } : x)))}
                  />
                  {f.label}
                </label>
              ) : (
                <>
                  <span>{f.label}</span>
                  {f.multiline ? (
                    <textarea rows={2} value={isT(it[f.key])} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))} />
                  ) : (
                    <input value={isT(it[f.key])} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))} />
                  )}
                </>
              )}
            </div>
          ))}
          <button type="button" className="pb-remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>Odebrat</button>
        </div>
      ))}
      <button type="button" className="pb-add" onClick={() => onChange([...items, { ...Object.fromEntries(fields.map((f) => [f.key, f.checkbox ? false : ""])) }])}>+ přidat</button>
    </div>
  );
}

/** Společná nastavení vzhledu — dostupná pro každý blok. */
function StyleFields({ p, set }: { p: Record<string, unknown>; set: (k: string, v: unknown) => void }) {
  return (
    <details className="pb-sec-styles">
      <summary>Vzhled sekce</summary>
      <div className="pb-fields">
        <Field label="Vnitřní okraj" type="select" options={["", "none", "sm", "md", "lg", "xl"]} value={isT(p.pad)} onChange={(v) => set("pad", v)} />
        <Field label="Pozadí (CSS barva / gradient)" value={p.bg} onChange={(v) => set("bg", v)} />
        <Field label="Barva textu (CSS)" value={p.color} onChange={(v) => set("color", v)} />
        <Field label="Zaoblení rohů (px)" type="range" min={0} max={60} value={p.radius} onChange={(v) => set("radius", v)} />
        <Field label="Stín" type="checkbox" value={p.shadow} onChange={(v) => set("shadow", v)} />
        <Field label="Max. šířka (např. 820px)" value={p.maxw} onChange={(v) => set("maxw", v)} />
        <Field label="Kotva (id pro #odkaz)" value={p.anchor} onChange={(v) => set("anchor", v)} />
        <Field label="Vlastní CSS třída" value={p.cls} onChange={(v) => set("cls", v)} />
        <Field label="Animace při zobrazení" type="checkbox" value={p.reveal} onChange={(v) => set("reveal", v)} />
        <Field label="Skrýt na mobilu" type="checkbox" value={p.hide_m} onChange={(v) => set("hide_m", v)} />
      </div>
    </details>
  );
}

export function BlockFields({ block, onChange }: { block: Block; onChange: (props: Record<string, unknown>) => void }) {
  const p = block.props || {};
  const set = (k: string, v: unknown) => onChange({ ...p, [k]: v });
  const { toast } = useStore();

  async function pickImage(k = "url") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd, credentials: "include" });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error || "Chyba");
        set(k, data.url);
        toast("Obrázek nahrán do R2.");
      } catch (e) {
        toast(e instanceof Error ? e.message : "Nahrání selhalo", "err");
      }
    };
    input.click();
  }

  let fields: React.ReactNode;

  switch (block.type) {
    case "heading":
      fields = (
        <>
          <Field label="Text" value={p.text} onChange={(v) => set("text", v)} />
          <Field label="Úroveň" type="select" options={["1", "2", "3"]} value={String(p.level ?? 2)} onChange={(v) => set("level", Number(v))} />
          <Field label="Zarovnání" type="select" options={["left", "center", "right"]} value={p.align} onChange={(v) => set("align", v)} />
          <Field label="Velikost písma (px, prázdné = výchozí)" type="number" value={p.size} onChange={(v) => set("size", v)} />
          <Field label="Tučnost" type="select" options={["", "400", "500", "600", "700", "800"]} value={p.weight} onChange={(v) => set("weight", v)} />
          <Field label="Barva (CSS)" type="color" value={p.color} onChange={(v) => set("color", v)} />
        </>
      );
      break;
    case "paragraph":
      fields = (
        <>
          <Field label="Text" type="textarea" rows={4} value={p.text} onChange={(v) => set("text", v)} />
          <Field label="Zarovnání" type="select" options={["left", "center", "right", "justify"]} value={p.align} onChange={(v) => set("align", v)} />
          <Field label="Velikost písma (px)" type="number" value={p.size} onChange={(v) => set("size", v)} />
          <Field label="Barva (CSS)" type="color" value={p.color} onChange={(v) => set("color", v)} />
        </>
      );
      break;
    case "badge":
      fields = (
        <>
          <Field label="Text" value={p.text} onChange={(v) => set("text", v)} />
          <Field label="Zarovnání" type="select" options={["left", "center", "right"]} value={p.align} onChange={(v) => set("align", v)} />
          <Field label="Barva textu (CSS)" type="color" value={p.color} onChange={(v) => set("color", v)} />
          <Field label="Pozadí (CSS)" type="color" value={p.bg} onChange={(v) => set("bg", v)} />
        </>
      );
      break;
    case "image":
      fields = (
        <>
          <Field label="URL obrázku" value={p.url} onChange={(v) => set("url", v)} />
          <button type="button" className="pb-add" onClick={() => void pickImage("url")}>📤 Nahrát do R2</button>
          <Field label="Alt text" value={p.alt} onChange={(v) => set("alt", v)} />
          <Field label="Popisek" value={p.caption} onChange={(v) => set("caption", v)} />
          <Field label="Šířka (např. 60% nebo 400px)" value={p.width} onChange={(v) => set("width", v)} />
          <Field label="Poměr stran" type="select" options={["auto", "1:1", "4:3", "16:9"]} value={p.ratio} onChange={(v) => set("ratio", v)} />
          <Field label="Odkaz po kliknutí (volitelně)" value={p.link} onChange={(v) => set("link", v)} />
          <Field label="Vycentrovat" type="checkbox" value={p.center} onChange={(v) => set("center", v)} />
          <Field label="Zaoblené rohy" type="checkbox" value={p.rounded} onChange={(v) => set("rounded", v)} />
        </>
      );
      break;
    case "button":
      fields = (
        <>
          <Field label="Popisek" value={p.label} onChange={(v) => set("label", v)} />
          <Field label="Odkaz (např. /katalog)" value={p.to} onChange={(v) => set("to", v)} />
          <Field label="Styl" type="select" options={["primary", "line", "dark"]} value={p.style} onChange={(v) => set("style", v)} />
          <Field label="Velikost" type="select" options={["md", "sm", "lg"]} value={p.size} onChange={(v) => set("size", v)} />
          <Field label="Zarovnání" type="select" options={["left", "center", "right"]} value={p.align} onChange={(v) => set("align", v)} />
          <Field label="Ikona před textem (emoji)" value={p.icon} onChange={(v) => set("icon", v)} />
          <Field label="Přes celou šířku" type="checkbox" value={p.full} onChange={(v) => set("full", v)} />
          <Field label="Otevřít v novém okně" type="checkbox" value={p.newtab} onChange={(v) => set("newtab", v)} />
        </>
      );
      break;
    case "list":
      fields = (
        <>
          <Field label="Číslovaný" type="checkbox" value={p.ordered} onChange={(v) => set("ordered", v)} />
          <Field label="Ikona položek (emoji, volitelně)" value={p.icon} onChange={(v) => set("icon", v)} />
          <Field label="Velikost písma (px)" type="number" value={p.size} onChange={(v) => set("size", v)} />
          <StringsEditor label="Položky" values={((p.items as string[]) || []).map(String)} onChange={(v) => set("items", v)} />
        </>
      );
      break;
    case "quote":
      fields = (
        <>
          <Field label="Citát" type="textarea" rows={3} value={p.text} onChange={(v) => set("text", v)} />
          <Field label="Autor" value={p.author} onChange={(v) => set("author", v)} />
          <Field label="Barva (CSS)" type="color" value={p.color} onChange={(v) => set("color", v)} />
          <Field label="Velikost písma (px)" type="number" value={p.size} onChange={(v) => set("size", v)} />
        </>
      );
      break;
    case "alert":
      fields = (
        <>
          <Field label="Typ" type="select" options={["info", "success", "warning", "tip"]} value={p.kind} onChange={(v) => set("kind", v)} />
          <Field label="Nadpis" value={p.title} onChange={(v) => set("title", v)} />
          <Field label="Text" type="textarea" rows={3} value={p.text} onChange={(v) => set("text", v)} />
        </>
      );
      break;
    case "divider":
      fields = (
        <>
          <Field label="Styl čáry" type="select" options={["solid", "dashed", "dotted"]} value={p.style} onChange={(v) => set("style", v)} />
          <Field label="Barva (CSS)" type="color" value={p.color} onChange={(v) => set("color", v)} />
          <Field label="Tloušťka (px)" type="range" min={1} max={12} value={p.thickness} onChange={(v) => set("thickness", v)} />
          <Field label="Šířka (např. 60% nebo 400px)" value={p.width} onChange={(v) => set("width", v)} />
        </>
      );
      break;
    case "spacer":
      fields = <Field label="Výška (px)" type="range" min={4} max={240} value={p.height} onChange={(v) => set("height", v)} />;
      break;
    case "columns":
      fields = (
        <>
          <Field label="Počet sloupců (1–3)" type="select" options={["1", "2", "3"]} value={String(p.cols ?? 2)} onChange={(v) => set("cols", Number(v))} />
          <ObjListEditor
            label="Sloupce"
            fields={[
              { key: "icon", label: "Ikona (emoji)" },
              { key: "title", label: "Nadpis" },
              { key: "text", label: "Text", multiline: true },
              { key: "link", label: "Odkaz (volitelně)" },
            ]}
            items={(p.items as Record<string, unknown>[]) || []}
            onChange={(v) => set("items", v)}
          />
        </>
      );
      break;
    case "tabs":
      fields = (
        <ObjListEditor
          label="Záložky"
          fields={[{ key: "title", label: "Název" }, { key: "text", label: "Obsah", multiline: true }]}
          items={(p.items as Record<string, unknown>[]) || []}
          onChange={(v) => set("items", v)}
        />
      );
      break;
    case "cta":
      fields = (
        <>
          <Field label="Nadpis" value={p.title} onChange={(v) => set("title", v)} />
          <Field label="Text" type="textarea" rows={2} value={p.text} onChange={(v) => set("text", v)} />
          <Field label="Tlačítko – popisek" value={p.button_label} onChange={(v) => set("button_label", v)} />
          <Field label="Tlačítko – odkaz" value={p.button_to} onChange={(v) => set("button_to", v)} />
          <Field label="Druhé tlačítko – popisek" value={p.secondary_label} onChange={(v) => set("secondary_label", v)} />
          <Field label="Druhé tlačítko – odkaz" value={p.secondary_to} onChange={(v) => set("secondary_to", v)} />
          <Field label="Pozadí (CSS, prázdné = výchozí)" type="color" value={p.bg} onChange={(v) => set("bg", v)} />
          <Field label="Barva textu (CSS)" type="color" value={p.color} onChange={(v) => set("color", v)} />
        </>
      );
      break;
    case "feature":
      fields = (
        <>
          <Field label="Ikona (text/emoji)" value={p.icon} onChange={(v) => set("icon", v)} />
          <Field label="Nadpis" value={p.title} onChange={(v) => set("title", v)} />
          <Field label="Text" type="textarea" rows={2} value={p.text} onChange={(v) => set("text", v)} />
          <Field label="Odkaz celé karty (volitelně)" value={p.link} onChange={(v) => set("link", v)} />
        </>
      );
      break;
    case "trust":
      fields = (
        <ObjListEditor
          label="Karty"
          fields={[{ key: "icon", label: "Ikona (emoji)" }, { key: "title", label: "Nadpis" }, { key: "text", label: "Text", multiline: true }]}
          items={(p.items as Record<string, unknown>[]) || []}
          onChange={(v) => set("items", v)}
        />
      );
      break;
    case "faq":
      fields = (
        <>
          <Field label="První otázka rozbalená" type="checkbox" value={p.open_first} onChange={(v) => set("open_first", v)} />
          <ObjListEditor
            label="Otázky"
            fields={[{ key: "q", label: "Otázka" }, { key: "a", label: "Odpověď", multiline: true }]}
            items={(p.items as Record<string, unknown>[]) || []}
            onChange={(v) => set("items", v)}
          />
        </>
      );
      break;
    case "gallery":
      fields = (
        <>
          <Field label="Sloupce" type="select" options={["auto", "2", "3", "4"]} value={String(p.cols ?? 0)} onChange={(v) => set("cols", v === "auto" ? 0 : Number(v))} />
          <Field label="Mezera mezi obrázky (px)" type="range" min={4} max={40} value={p.gap} onChange={(v) => set("gap", v)} />
          <StringsEditor label="Obrázky (URL)" values={((p.urls as string[]) || []).map(String)} onChange={(v) => set("urls", v)} />
        </>
      );
      break;
    case "stats":
      fields = (
        <ObjListEditor
          label="Čísla"
          fields={[{ key: "value", label: "Hodnota" }, { key: "label", label: "Popisek" }, { key: "icon", label: "Ikona (emoji)" }]}
          items={(p.items as Record<string, unknown>[]) || []}
          onChange={(v) => set("items", v)}
        />
      );
      break;
    case "info_list":
      fields = (
        <ObjListEditor
          label="Položky"
          fields={[{ key: "icon", label: "Ikona (emoji)" }, { key: "title", label: "Nadpis" }, { key: "text", label: "Text", multiline: true }]}
          items={(p.items as Record<string, unknown>[]) || []}
          onChange={(v) => set("items", v)}
        />
      );
      break;
    case "contact":
      fields = (
        <>
          <Field label="E-mail" value={p.email} onChange={(v) => set("email", v)} />
          <Field label="Telefon" value={p.phone} onChange={(v) => set("phone", v)} />
          <Field label="Adresa" value={p.address} onChange={(v) => set("address", v)} />
          <Field label="Otevírací doba" value={p.hours} onChange={(v) => set("hours", v)} />
          <Field label="Tlačítko mapa – popisek" value={p.map_label} onChange={(v) => set("map_label", v)} />
          <Field label="Tlačítko mapa – odkaz" value={p.map_url} onChange={(v) => set("map_url", v)} />
        </>
      );
      break;
    case "map":
      fields = (
        <>
          <Field label="Odkaz na embed mapy" type="textarea" rows={2} value={p.embed} onChange={(v) => set("embed", v)} />
          <Field label="Výška (px, 0 = poměr 16:9)" type="number" value={p.height} onChange={(v) => set("height", v)} />
          <p className="pb-hint">Google Maps → Sdílet → „Vložit mapu“ a zkopírujte src adresu (https://maps.google.com/maps?...).</p>
        </>
      );
      break;
    case "video":
      fields = (
        <>
          <Field label="YouTube / Vimeo adresa" value={p.url} onChange={(v) => set("url", v)} />
          <Field label="Poměr stran" type="select" options={["16:9", "4:3", "1:1"]} value={p.ratio} onChange={(v) => set("ratio", v)} />
          <p className="pb-hint">Např. https://www.youtube.com/watch?v=XXXXX</p>
        </>
      );
      break;
    case "hero":
      fields = (
        <>
          <Field label="Štítek nad titulkem" value={p.kicker} onChange={(v) => set("kicker", v)} />
          <Field label="Titulek" value={p.title} onChange={(v) => set("title", v)} />
          <Field label="Text" type="textarea" rows={2} value={p.text} onChange={(v) => set("text", v)} />
          <Field label="Obrázek na pozadí (URL)" value={p.img} onChange={(v) => set("img", v)} />
          <button type="button" className="pb-add" onClick={() => void pickImage("img")}>📤 Nahrát pozadí do R2</button>
          <Field label="Zarovnání" type="select" options={["left", "center", "right"]} value={p.align} onChange={(v) => set("align", v)} />
          <Field label="Hlavní tlačítko – popisek" value={p.primary_label} onChange={(v) => set("primary_label", v)} />
          <Field label="Hlavní tlačítko – odkaz" value={p.primary_to} onChange={(v) => set("primary_to", v)} />
          <Field label="Druhé tlačítko – popisek" value={p.secondary_label} onChange={(v) => set("secondary_label", v)} />
          <Field label="Druhé tlačítko – odkaz" value={p.secondary_to} onChange={(v) => set("secondary_to", v)} />
          <Field label="Min. výška (px)" type="number" value={p.min_height} onChange={(v) => set("min_height", v)} />
        </>
      );
      break;
    case "products":
      fields = (
        <>
          <Field label="Štítek nad titulkem" value={p.kicker} onChange={(v) => set("kicker", v)} />
          <Field label="Nadpis" value={p.title} onChange={(v) => set("title", v)} />
          <Field label="Zdroj produktů" type="select" options={["featured", "new", "category"]} value={p.source} onChange={(v) => set("source", v)} />
          {isT(p.source) === "category" && (
            <Field label="Slug kategorie (např. keramika)" value={p.category} onChange={(v) => set("category", v)} />
          )}
          <Field label="Počet produktů" type="range" min={1} max={12} value={p.count} onChange={(v) => set("count", v)} />
          <Field label="Sloupce" type="select" options={["1", "2", "3", "4"]} value={String(p.cols ?? 4)} onChange={(v) => set("cols", Number(v))} />
          <Field label="Tlačítko „vše“ – popisek" value={p.link_label} onChange={(v) => set("link_label", v)} />
          <Field label="Tlačítko „vše“ – odkaz" value={p.link_to} onChange={(v) => set("link_to", v)} />
        </>
      );
      break;
    case "categories":
      fields = (
        <>
          <Field label="Štítek nad titulkem" value={p.kicker} onChange={(v) => set("kicker", v)} />
          <Field label="Nadpis" value={p.title} onChange={(v) => set("title", v)} />
          <Field label="Počet kategorií" type="range" min={1} max={12} value={p.count} onChange={(v) => set("count", v)} />
          <Field label="Sloupce" type="select" options={["1", "2", "3", "4"]} value={String(p.cols ?? 3)} onChange={(v) => set("cols", Number(v))} />
          <Field label="Zobrazit popis kategorie" type="checkbox" value={p.show_desc} onChange={(v) => set("show_desc", v)} />
          <Field label="Popisek karty (např. Procházet kategorii)" value={p.card_cta} onChange={(v) => set("card_cta", v)} />
          <Field label="Tlačítko „vše“ – popisek" value={p.link_label} onChange={(v) => set("link_label", v)} />
          <Field label="Tlačítko „vše“ – odkaz" value={p.link_to} onChange={(v) => set("link_to", v)} />
        </>
      );
      break;
    case "image_text":
      fields = (
        <>
          <Field label="URL obrázku" value={p.url} onChange={(v) => set("url", v)} />
          <button type="button" className="pb-add" onClick={() => void pickImage("url")}>📤 Nahrát do R2</button>
          <Field label="Nadpis" value={p.title} onChange={(v) => set("title", v)} />
          <Field label="Text" type="textarea" rows={3} value={p.text} onChange={(v) => set("text", v)} />
          <Field label="Tlačítko – popisek" value={p.button_label} onChange={(v) => set("button_label", v)} />
          <Field label="Tlačítko – odkaz" value={p.button_to} onChange={(v) => set("button_to", v)} />
          <Field label="Obrázek na straně" type="select" options={["left", "right"]} value={p.side} onChange={(v) => set("side", v)} />
        </>
      );
      break;
    case "banner":
      fields = (
        <>
          <Field label="Obrázek na pozadí (URL)" value={p.img} onChange={(v) => set("img", v)} />
          <button type="button" className="pb-add" onClick={() => void pickImage("img")}>📤 Nahrát pozadí do R2</button>
          <Field label="Titulek" value={p.title} onChange={(v) => set("title", v)} />
          <Field label="Text" type="textarea" rows={2} value={p.text} onChange={(v) => set("text", v)} />
          <Field label="Tlačítko – popisek" value={p.button_label} onChange={(v) => set("button_label", v)} />
          <Field label="Tlačítko – odkaz" value={p.button_to} onChange={(v) => set("button_to", v)} />
          <Field label="Výška (px)" type="range" min={200} max={700} value={p.height} onChange={(v) => set("height", v)} />
          <Field label="Ztmavení pozadí (%)" type="range" min={0} max={95} value={p.overlay} onChange={(v) => set("overlay", v)} />
        </>
      );
      break;
    case "testimonial":
      fields = (
        <>
          <Field label="Sloupce" type="select" options={["1", "2", "3"]} value={String(p.cols ?? 2)} onChange={(v) => set("cols", Number(v))} />
          <ObjListEditor
            label="Reference"
            fields={[
              { key: "name", label: "Jméno" },
              { key: "role", label: "Role (např. Ověřený nákup)" },
              { key: "text", label: "Text", multiline: true },
              { key: "stars", label: "Hvězdičky (1–5)" },
            ]}
            items={(p.items as Record<string, unknown>[]) || []}
            onChange={(v) => set("items", v)}
          />
        </>
      );
      break;
    case "team":
      fields = (
        <>
          <Field label="Sloupce" type="select" options={["1", "2", "3", "4"]} value={String(p.cols ?? 3)} onChange={(v) => set("cols", Number(v))} />
          <ObjListEditor
            label="Členové týmu"
            fields={[
              { key: "photo", label: "Fotka (URL)" },
              { key: "name", label: "Jméno" },
              { key: "role", label: "Role" },
              { key: "text", label: "Text", multiline: true },
            ]}
            items={(p.items as Record<string, unknown>[]) || []}
            onChange={(v) => set("items", v)}
          />
        </>
      );
      break;
    case "pricing":
      fields = (
        <>
          <Field label="Sloupce" type="select" options={["1", "2", "3", "4"]} value={String(p.cols ?? 2)} onChange={(v) => set("cols", Number(v))} />
          <ObjListEditor
            label="Balíčky"
            fields={[
              { key: "name", label: "Název" },
              { key: "price", label: "Cena (např. 990 Kč)" },
              { key: "period", label: "Za (např. sada / měsíc)" },
              { key: "features", label: "Výhody (každá na nový řádek)", multiline: true },
              { key: "button_label", label: "Tlačítko" },
              { key: "button_to", label: "Odkaz" },
              { key: "highlight", label: "Zvýrazněný balíček", checkbox: true },
            ]}
            items={(p.items as Record<string, unknown>[]) || []}
            onChange={(v) => set("items", v)}
          />
        </>
      );
      break;
    case "timeline":
      fields = (
        <ObjListEditor
          label="Kroky"
          fields={[
            { key: "date", label: "Štítek (např. Krok 1)" },
            { key: "title", label: "Nadpis" },
            { key: "text", label: "Text", multiline: true },
          ]}
          items={(p.items as Record<string, unknown>[]) || []}
          onChange={(v) => set("items", v)}
        />
      );
      break;
    case "countdown":
      fields = (
        <>
          <Field label="Text nad odpočtem" value={p.label} onChange={(v) => set("label", v)} />
          <Field label="Datum a čas konce (např. 2026-12-24T18:00)" value={p.target} onChange={(v) => set("target", v)} />
          <Field label="Text po vypršení" value={p.done_text} onChange={(v) => set("done_text", v)} />
        </>
      );
      break;
    case "newsletter":
      fields = (
        <>
          <Field label="Nadpis" value={p.title} onChange={(v) => set("title", v)} />
          <Field label="Text" type="textarea" rows={2} value={p.text} onChange={(v) => set("text", v)} />
          <Field label="Text pole (placeholder)" value={p.placeholder} onChange={(v) => set("placeholder", v)} />
          <Field label="Popisek tlačítka" value={p.button_label} onChange={(v) => set("button_label", v)} />
          <p className="pb-hint">Ukázkový formulář — přihlášení se zobrazuje klientovi okamžitě.</p>
        </>
      );
      break;
    case "social":
      fields = (
        <ObjListEditor
          label="Sociální sítě"
          fields={[
            { key: "label", label: "Název" },
            { key: "url", label: "Odkaz" },
            { key: "icon", label: "Ikona (emoji)" },
          ]}
          items={(p.items as Record<string, unknown>[]) || []}
          onChange={(v) => set("items", v)}
        />
      );
      break;
    case "table":
      fields = (
        <>
          <Field label="První řádek je hlavička" type="checkbox" value={p.header} onChange={(v) => set("header", v)} />
          <Field label="Řádky (sloupce oddělte „|“)" type="textarea" rows={6} value={p.rows} onChange={(v) => set("rows", v)} />
          <p className="pb-hint">Každý řádek = řádek tabulky. Např. „Výška | 12 cm“.</p>
        </>
      );
      break;
    case "file":
      fields = (
        <>
          <Field label="Název souboru" value={p.label} onChange={(v) => set("label", v)} />
          <Field label="Odkaz na soubor" value={p.url} onChange={(v) => set("url", v)} />
          <Field label="Poznámka (např. PDF · 1,2 MB)" value={p.note} onChange={(v) => set("note", v)} />
          <Field label="Popisek tlačítka" value={p.button_label} onChange={(v) => set("button_label", v)} />
        </>
      );
      break;
    case "html":
      fields = <Field label="HTML kód" type="textarea" rows={5} value={p.html} onChange={(v) => set("html", v)} />;
      break;
    default:
      fields = <p className="pb-hint">Tento blok nemá editovatelná pole.</p>;
  }

  return (
    <>
      {fields}
      <StyleFields p={p} set={set} />
    </>
  );
}

/* ============================================================
   Ukázkové bloky — rychlý start pro novou / hlavní stránku
   ============================================================ */

export function demoBlocks(): Block[] {
  const mk = (type: string, props: Record<string, unknown>): Block => ({ id: uid(), type, props });
  return [
    mk("hero", {
      kicker: "ATELIÉR KAVKA · VINOHRADY",
      title: "Domov, který dýchá pomalu",
      text: "Ručně točená kamenina z ateliéru, vypraný len z české dílny a doplňky z masivního dřeva s přirozenou kresbou.",
      img: "/hero.webp",
      align: "center",
      primary_label: "Procházet katalog",
      primary_to: "/katalog",
      secondary_label: "Vybrané kousky",
      secondary_to: "#produkty",
      min_height: 440,
    }),
    mk("products", { kicker: "Vybrané kousky", title: "Doporučujeme", source: "featured", count: 8, cols: 4, link_label: "Zobrazit celý katalog", link_to: "/katalog", anchor: "produkty" }),
    mk("categories", { kicker: "Sortiment", title: "Kategorie", count: 6, cols: 3, show_desc: true, link_label: "Celý obchod", link_to: "/katalog" }),
    mk("trust", {
      items: [
        { icon: "🍶", title: "Z ateliéru", text: "Keramika točená na kruhu, len z české dílny, dřevo olejované přírodním olejem." },
        { icon: "🚚", title: "Doprava po ČR", text: "Z-BOX, Zásilkovna i Balíkovna s živou mapou. Osobní odběr na Vinohradech." },
        { icon: "🛡", title: "14 dní na vrácení", text: "Zákonná záruka 24 měsíců. Reklamace vyřídíme do 30 dnů, nebo osobně v ateliéru." },
      ],
    }),
    mk("cta", { title: "Ateliér na Vinohradech.", text: "Otevřeno Po–Pá 10:00–18:00.", button_label: "Nakoupit online", button_to: "/katalog", secondary_label: "O ateliéru", secondary_to: "/o-nas" }),
  ];
}

/* ============================================================
   Systémové stránky (home + statické stránky v editoru)
   ============================================================ */

export const STATIC_PAGE_SLUGS = ["o-nas", "doprava-a-platba", "obchodni-podminky", "ochrana-udaju", "reklamace"];

/** Veřejná adresa systémové stránky (home → /, statické → /slug). */
export function systemPagePath(slug: string): string {
  if (slug === "home") return "/";
  if (STATIC_PAGE_SLUGS.includes(slug)) return `/${slug}`;
  return `/stranka/${slug}`;
}

/**
 * Načte systémovou stránku z editoru. Vrátí null, dokud se nenačte,
 * nebo když stránka nemá žádné bloky (pak se použije výchozí obsah).
 */
export function useSystemPage(slug: string): { page: Page; blocks: Block[] } | null {
  const [res, setRes] = useState<{ page: Page; blocks: Block[] } | null>(null);
  useEffect(() => {
    let on = true;
    void api<{ page: Page }>(`/pages/${slug}`)
      .then((r) => {
        if (!on) return;
        let blocks: Block[] = [];
        try {
          blocks = JSON.parse(r.page.blocks_json || "[]") as Block[];
        } catch {
          blocks = [];
        }
        if (blocks.length) setRes({ page: r.page, blocks });
      })
      .catch(() => {
        /* stránka neexistuje → výchozí obsah */
      });
    return () => {
      on = false;
    };
  }, [slug]);
  return res;
}

/** Vykreslení obsahu systému stránek z editoru (drobenka + bloky + SEO). */
export function SystemPageView({ page, blocks }: { page: Page; blocks: Block[] }) {
  useSeo({
    title: page.meta_title || `${page.title} — KAVKA`,
    description: page.meta_description || undefined,
    noindex: !!page.noindex,
  });
  const mw = isT(page.page_max_width);
  return (
    <div
      className="wrap prose-page pb-public-page pb-system-page"
      style={mw ? { maxWidth: /^\d+$/.test(mw) ? `${mw}px` : mw } : undefined}
    >
      {!page.hide_crumbs && (
        <div className="crumbs">
          <Link to="/">Domů</Link> / <span>{page.title}</span>
        </div>
      )}
      {blocks.map((b) => (
        <Fragment key={b.id}>{renderBlock(b)}</Fragment>
      ))}
    </div>
  );
}
