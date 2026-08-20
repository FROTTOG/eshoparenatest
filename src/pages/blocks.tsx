import { Link } from "react-router-dom";
import { optimizedImage } from "../image";
import { useStore } from "../store";

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
   Toolbox — katalog bloků („spousta itemů“)
   ============================================================ */

export type ToolboxItem = { type: string; label: string; icon: string; hint: string; defaults: Record<string, unknown> };

export const TOOLBOX: ToolboxItem[] = [
  { type: "heading", label: "Nadpis", icon: "H", hint: "Nadpis stránky či sekce", defaults: { text: "Nadpis", level: 2, align: "left", color: "" } },
  { type: "paragraph", label: "Odstavec", icon: "¶", hint: "Textový odstavec", defaults: { text: "Zde napište vlastní text…", align: "left" } },
  { type: "image", label: "Obrázek", icon: "🖼", hint: "Obrázek s popiskem", defaults: { url: "", alt: "", caption: "", rounded: true } },
  { type: "button", label: "Tlačítko", icon: "▣", hint: "Tlačítko s odkazem", defaults: { label: "Do katalogu", to: "/katalog", style: "primary", size: "md" } },
  { type: "list", label: "Seznam", icon: "≡", hint: "Odrážky / číslovaný seznam", defaults: { ordered: false, items: ["První položka", "Druhá položka", "Třetí položka"] } },
  { type: "quote", label: "Citát", icon: "❝", hint: "Citát s autorem", defaults: { text: "Citát, který vystihuje náš přístup.", author: "Autor citátu" } },
  { type: "divider", label: "Oddělovač", icon: "—", hint: "Vodorovná čára", defaults: {} },
  { type: "spacer", label: "Mezera", icon: "␣", hint: "Prázdný prostor", defaults: { height: 40 } },
  { type: "columns", label: "Sloupce", icon: "▦", hint: "2–3 sloupce textu", defaults: { cols: 2, items: [{ title: "Sloupec 1", text: "Text sloupce…" }, { title: "Sloupec 2", text: "Text sloupce…" }] } },
  { type: "cta", label: "Výzva k akci (CTA)", icon: "◎", hint: "Banner s tlačítkem", defaults: { title: "Chcete vědět víc?", text: "Rádi vám poradíme s výběrem.", button_label: "Kontaktujte nás", button_to: "/o-nas" } },
  { type: "feature", label: "Vlastnost", icon: "✦", hint: "Ikona + nadpis + text", defaults: { icon: "icon", title: "Název vlastnosti", text: "Popis…" } },
  { type: "trust", label: "Trust karty", icon: "♥", hint: "Proč nakupovat u nás", defaults: { items: [{ title: "Kvalita", text: "…" }, { title: "Doprava", text: "…" }, { title: "Vrácení", text: "…" }] } },
  { type: "faq", label: "FAQ / Akordeon", icon: "?", hint: "Sklápěcí otázky", defaults: { items: [{ q: "Otázka?", a: "Odpověď…" }, { q: "Další otázka?", a: "Odpověď…" }] } },
  { type: "gallery", label: "Galerie", icon: "▤", hint: "Mřížka obrázků", defaults: { urls: ["", "", "", ""] } },
  { type: "stats", label: "Čísla / statistiky", icon: "∑", hint: "Čísla s popiskem", defaults: { items: [{ value: "10", label: "let praxe" }, { value: "1200", label: "spokojených" }, { value: "24", label: "měsíců záruka" }] } },
  { type: "info_list", label: "Seznam s ikonami", icon: "✔", hint: "Body s popiskem", defaults: { items: [{ title: "Osobní odběr", text: "…" }, { title: "Rychlá doprava", text: "…" }] } },
  { type: "contact", label: "Kontakt", icon: "✉", hint: "E-mail, telefon, adresa", defaults: { email: "ahoj@kavka.shop", phone: "+420 777 123 456", address: "Korunní 42, Praha 2" } },
  { type: "map", label: "Mapa", icon: "⌖", hint: "Embed Google Maps", defaults: { embed: "" } },
  { type: "video", label: "Video", icon: "▶", hint: "YouTube / Vimeo embed", defaults: { url: "" } },
  { type: "html", label: "HTML kód", icon: "<>", hint: "Vlastní HTML", defaults: { html: "<p>Vlastní HTML…</p>" } },
];

/* ============================================================
   Veřejné vykreslení bloků
   ============================================================ */

function isT(v: unknown): string {
  return v == null ? "" : String(v);
}

function splitUrl(u: string): { host: string; path: string } | null {
  try {
    const x = new URL(u);
    return { host: x.hostname, path: x.pathname + x.search };
  } catch {
    return null;
  }
}

function renderBlockInner(b: Block): React.ReactNode {
  const p = b.props || {};
  switch (b.type) {
    case "heading": {
      const lvl = Number(p.level || 2) as 1 | 2 | 3;
      const H = ["h1", "h2", "h3"][lvl - 1] as "h1" | "h2" | "h3";
      return (
        <H
          className={lvl === 1 ? "serif" : lvl === 2 ? "serif" : undefined}
          style={{ textAlign: ((p.align as string) || "left") as React.CSSProperties["textAlign"], color: isT(p.color) || undefined }}
        >
          {isT(p.text)}
        </H>
      );
    }
    case "paragraph":
      return <p style={{ textAlign: ((p.align as string) || "left") as React.CSSProperties["textAlign"] }}>{isT(p.text)}</p>;
    case "image": {
      const url = isT(p.url);
      return (
        <figure className={p.rounded === false ? "" : "pb-figure"}>
          {url ? <img src={optimizedImage(url)} alt={isT(p.alt)} loading="lazy" /> : <div className="pb-img-empty">Obrázek bez URL</div>}
          {isT(p.caption) && <figcaption>{isT(p.caption)}</figcaption>}
        </figure>
      );
    }
    case "button":
      return (
        <div className="pb-btn-row">
          <Link to={isT(p.to) || "/"} className={p.style === "line" ? "btn-line" : p.style === "dark" ? "btn-dark" : "btn"}>
            {isT(p.label)}
          </Link>
        </div>
      );
    case "list":
      return p.ordered ? (
        <ol>{((p.items as string[]) || []).map((it, i) => <li key={i}>{it}</li>)}</ol>
      ) : (
        <ul>{((p.items as string[]) || []).map((it, i) => <li key={i}>{it}</li>)}</ul>
      );
    case "quote":
      return (
        <blockquote className="pb-quote">
          <p>{isT(p.text)}</p>
          {isT(p.author) && <cite>{isT(p.author)}</cite>}
        </blockquote>
      );
    case "divider":
      return <hr className="pb-divider" />;
    case "spacer":
      return <div style={{ height: Number(p.height || 40) }} />;
    case "columns": {
      const cols = Math.min(3, Math.max(1, Number(p.cols || 2)));
      const items = (p.items as { title: string; text: string }[]) || [];
      return (
        <div className={`pb-columns cols-${cols}`}>
          {items.slice(0, cols).map((it, i) => (
            <div key={i} className="pb-col">
              <h3>{isT(it.title)}</h3>
              <p>{isT(it.text)}</p>
            </div>
          ))}
        </div>
      );
    }
    case "cta":
      return (
        <div className="pb-cta">
          <h3>{isT(p.title)}</h3>
          <p>{isT(p.text)}</p>
          <Link to={isT(p.button_to) || "/"} className="btn">
            {isT(p.button_label)}
          </Link>
        </div>
      );
    case "feature":
      return (
        <div className="pb-feature">
          <span className="pb-feature-icon">{isT(p.icon) === "icon" ? "✦" : isT(p.icon)}</span>
          <h3>{isT(p.title)}</h3>
          <p>{isT(p.text)}</p>
        </div>
      );
    case "trust":
      return (
        <div className="pb-trust">
          {((p.items as { title: string; text: string }[]) || []).map((it, i) => (
            <div key={i} className="pb-trust-card">
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
            <details key={i} className="pb-faq-item">
              <summary>{isT(it.q)}</summary>
              <p>{isT(it.a)}</p>
            </details>
          ))}
        </div>
      );
    case "gallery":
      return (
        <div className="pb-gallery">
          {((p.urls as string[]) || []).filter(Boolean).map((u, i) => (
            <img key={i} src={optimizedImage(u)} alt="" loading="lazy" />
          ))}
        </div>
      );
    case "stats":
      return (
        <div className="pb-stats">
          {((p.items as { value: string; label: string }[]) || []).map((it, i) => (
            <div key={i} className="pb-stat">
              <b>{isT(it.value)}</b>
              <span>{isT(it.label)}</span>
            </div>
          ))}
        </div>
      );
    case "info_list":
      return (
        <ul className="pb-info-list">
          {((p.items as { title: string; text: string }[]) || []).map((it, i) => (
            <li key={i}>
              <b>{isT(it.title)}</b>
              <span>{isT(it.text)}</span>
            </li>
          ))}
        </ul>
      );
    case "contact":
      return (
        <div className="pb-contact">
          <p><b>E-mail:</b> {isT(p.email)}</p>
          <p><b>Telefon:</b> {isT(p.phone)}</p>
          <p><b>Adresa:</b> {isT(p.address)}</p>
        </div>
      );
    case "map": {
      const u = isT(p.embed);
      if (!u) return <div className="pb-embed-empty">Vložte odkaz na mapu (Google Maps embed).</div>;
      return (
        <div className="pb-embed">
          <iframe src={u} loading="lazy" title="Mapa" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      );
    }
    case "video": {
      const url = splitUrl(isT(p.url));
      if (!url) return <div className="pb-embed-empty">Vložte YouTube nebo Vimeo adresu.</div>;
      if (url.host.includes("youtu")) {
        const v = url.path.startsWith("/shorts/") ? url.path.split("/")[2] : url.path === "/watch" ? new URLSearchParams(url.path.split("?")[1] || "").get("v") : url.path.replace("/", "");
        return (
          <div className="pb-embed">
            <iframe src={`https://www.youtube.com/embed/${v || ""}`} title="Video" allow="fullscreen" allowFullScreen loading="lazy" />
          </div>
        );
      }
      if (url.host.includes("vimeo")) {
        return (
          <div className="pb-embed">
            <iframe src={`https://player.vimeo.com/video${url.path}`} title="Video" allow="fullscreen" allowFullScreen loading="lazy" />
          </div>
        );
      }
      return (
        <div className="pb-embed">
          <iframe src={isT(p.url)} title="Video" allow="fullscreen" allowFullScreen loading="lazy" />
        </div>
      );
    }
    case "html":
      return <div dangerouslySetInnerHTML={{ __html: isT(p.html) }} />;
    default:
      return <p>Neznámý blok {b.type}</p>;
  }
}

export function renderBlock(b: Block): React.ReactNode {
  return <div className={`pb-block pb-block-${b.type}`}>{renderBlockInner(b)}</div>;
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
}: {
  label: string;
  value: unknown;
  onChange: (v: unknown) => void;
  type?: "text" | "number" | "textarea" | "select" | "checkbox";
  rows?: number;
  options?: string[];
}) {
  const inner =
    type === "textarea" ? (
      <textarea rows={rows || 3} value={value as string} onChange={(e) => onChange(e.target.value)} />
    ) : type === "number" ? (
      <input type="number" value={value as number} onChange={(e) => onChange(Number(e.target.value))} />
    ) : type === "checkbox" ? (
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
    ) : type === "select" ? (
      <select value={value as string} onChange={(e) => onChange(e.target.value)}>
        {(options || []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input value={value as string} onChange={(e) => onChange(e.target.value)} />
    );
  return (
    <label className="pb-field">
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
            <textarea value={it} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} />
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
  fields: { key: string; label: string; multiline?: boolean }[];
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
              <span>{f.label}</span>
              {f.multiline ? (
                <textarea rows={2} value={isT(it[f.key])} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))} />
              ) : (
                <input value={isT(it[f.key])} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [f.key]: e.target.value } : x)))} />
              )}
            </div>
          ))}
          <button type="button" className="pb-remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>Odebrat</button>
        </div>
      ))}
      <button type="button" className="pb-add" onClick={() => onChange([...items, { ...Object.fromEntries(fields.map((f) => [f.key, ""])) }])}>+ přidat</button>
    </div>
  );
}

export function BlockFields({ block, onChange }: { block: Block; onChange: (props: Record<string, unknown>) => void }) {
  const p = block.props || {};
  const set = (k: string, v: unknown) => onChange({ ...p, [k]: v });
  const { toast } = useToasts();

  async function pickImage() {
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
        set("url", data.url);
        toast("Obrázek nahrán do R2.");
      } catch (e) {
        toast(e instanceof Error ? e.message : "Nahrání selhalo", "err");
      }
    };
    input.click();
  }

  switch (block.type) {
    case "heading":
      return (
        <>
          <Field label="Text" value={p.text} onChange={(v) => set("text", v)} />
          <Field label="Úroveň" type="select" options={["1", "2", "3"]} value={String(p.level)} onChange={(v) => set("level", Number(v))} />
          <Field label="Zarovnání" type="select" options={["left", "center", "right"]} value={p.align} onChange={(v) => set("align", v)} />
          <Field label="Barva (volitelně, CSS)" value={p.color} onChange={(v) => set("color", v)} />
        </>
      );
    case "paragraph":
      return (
        <>
          <Field label="Text" type="textarea" rows={4} value={p.text} onChange={(v) => set("text", v)} />
          <Field label="Zarovnání" type="select" options={["left", "center", "right", "justify"]} value={p.align} onChange={(v) => set("align", v)} />
        </>
      );
    case "image":
      return (
        <>
          <Field label="URL obrázku" value={p.url} onChange={(v) => set("url", v)} />
          <button type="button" className="pb-add" onClick={() => void pickImage()}>📤 Nahrát do R2</button>
          <Field label="Alt text" value={p.alt} onChange={(v) => set("alt", v)} />
          <Field label="Popisek" value={p.caption} onChange={(v) => set("caption", v)} />
          <Field label="Zaoblené rohy" type="checkbox" value={p.rounded} onChange={(v) => set("rounded", v)} />
        </>
      );
    case "button":
      return (
        <>
          <Field label="Popisek" value={p.label} onChange={(v) => set("label", v)} />
          <Field label="Odkaz (např. /katalog)" value={p.to} onChange={(v) => set("to", v)} />
          <Field label="Styl" type="select" options={["primary", "line", "dark"]} value={p.style} onChange={(v) => set("style", v)} />
          <Field label="Velikost" type="select" options={["md", "sm", "lg"]} value={p.size} onChange={(v) => set("size", v)} />
        </>
      );
    case "list":
      return (
        <>
          <Field label="Číslovaný" type="checkbox" value={p.ordered} onChange={(v) => set("ordered", v)} />
          <StringsEditor label="Položky" values={((p.items as string[]) || []).map(String)} onChange={(v) => set("items", v)} />
        </>
      );
    case "quote":
      return (
        <>
          <Field label="Citát" type="textarea" rows={3} value={p.text} onChange={(v) => set("text", v)} />
          <Field label="Autor" value={p.author} onChange={(v) => set("author", v)} />
        </>
      );
    case "divider":
      return <p className="pb-hint">Oddělovač nemá žádná nastavení.</p>;
    case "spacer":
      return <Field label="Výška (px)" type="number" value={p.height} onChange={(v) => set("height", v)} />;
    case "columns":
      return (
        <>
          <Field label="Počet sloupců (2–3)" type="select" options={["2", "3"]} value={String(p.cols)} onChange={(v) => set("cols", Number(v))} />
          <ObjListEditor
            label="Sloupce"
            fields={[{ key: "title", label: "Nadpis" }, { key: "text", label: "Text", multiline: true }]}
            items={(p.items as Record<string, unknown>[]) || []}
            onChange={(v) => set("items", v)}
          />
        </>
      );
    case "cta":
      return (
        <>
          <Field label="Nadpis" value={p.title} onChange={(v) => set("title", v)} />
          <Field label="Text" type="textarea" rows={2} value={p.text} onChange={(v) => set("text", v)} />
          <Field label="Tlačítko – popisek" value={p.button_label} onChange={(v) => set("button_label", v)} />
          <Field label="Tlačítko – odkaz" value={p.button_to} onChange={(v) => set("button_to", v)} />
        </>
      );
    case "feature":
      return (
        <>
          <Field label="Ikona (text/emoji)" value={p.icon} onChange={(v) => set("icon", v)} />
          <Field label="Nadpis" value={p.title} onChange={(v) => set("title", v)} />
          <Field label="Text" type="textarea" rows={2} value={p.text} onChange={(v) => set("text", v)} />
        </>
      );
    case "trust":
      return (
        <ObjListEditor
          label="Karty"
          fields={[{ key: "title", label: "Nadpis" }, { key: "text", label: "Text", multiline: true }]}
          items={(p.items as Record<string, unknown>[]) || []}
          onChange={(v) => set("items", v)}
        />
      );
    case "faq":
      return (
        <ObjListEditor
          label="Otázky"
          fields={[{ key: "q", label: "Otázka" }, { key: "a", label: "Odpověď", multiline: true }]}
          items={(p.items as Record<string, unknown>[]) || []}
          onChange={(v) => set("items", v)}
        />
      );
    case "gallery":
      return <StringsEditor label="Obrázky (URL)" values={((p.urls as string[]) || []).map(String)} onChange={(v) => set("urls", v)} />;
    case "stats":
      return (
        <ObjListEditor
          label="Čísla"
          fields={[{ key: "value", label: "Hodnota" }, { key: "label", label: "Popisek" }]}
          items={(p.items as Record<string, unknown>[]) || []}
          onChange={(v) => set("items", v)}
        />
      );
    case "info_list":
      return (
        <ObjListEditor
          label="Položky"
          fields={[{ key: "title", label: "Nadpis" }, { key: "text", label: "Text", multiline: true }]}
          items={(p.items as Record<string, unknown>[]) || []}
          onChange={(v) => set("items", v)}
        />
      );
    case "contact":
      return (
        <>
          <Field label="E-mail" value={p.email} onChange={(v) => set("email", v)} />
          <Field label="Telefon" value={p.phone} onChange={(v) => set("phone", v)} />
          <Field label="Adresa" value={p.address} onChange={(v) => set("address", v)} />
        </>
      );
    case "map":
      return (
        <>
          <Field label="Odkaz na embed mapy" type="textarea" rows={2} value={p.embed} onChange={(v) => set("embed", v)} />
          <p className="pb-hint">Google Maps → Sdílet → „Vložit mapu“ a zkopírujte src adresu (https://maps.google.com/maps?...).</p>
        </>
      );
    case "video":
      return (
        <>
          <Field label="YouTube / Vimeo adresa" value={p.url} onChange={(v) => set("url", v)} />
          <p className="pb-hint">Např. https://www.youtube.com/watch?v=XXXXX</p>
        </>
      );
    case "html":
      return <Field label="HTML kód" type="textarea" rows={5} value={p.html} onChange={(v) => set("html", v)} />;
    default:
      return <p className="pb-hint">Tento blok nemá editovatelná pole.</p>;
  }
}

/* Lehký pomocník pro toasty v editoru — využije useStore */
function useToasts() {
  const { toast } = useStore();
  return { toast };
}
