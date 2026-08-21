import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, type Page } from "../api";
import { useStore } from "../store";
import {
  BlockFields,
  demoBlocks,
  newBlock,
  renderBlock,
  systemPagePath,
  TOOLBOX,
  TOOLBOX_GROUPS,
  type Block,
} from "./blocks";

/* ============================================================
   Seznam stránek — přidávat / odebírat / upravovat
   ============================================================ */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function Pages() {
  const { toast } = useStore();
  const [rows, setRows] = useState<Page[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => void api<Page[]>("/admin/pages").then(setRows);
  useEffect(() => { load(); }, []);

  async function add() {
    if (!title.trim()) { toast("Zadejte název stránky.", "err"); return; }
    setBusy(true);
    try {
      const r = await api<{ id: number }>("/admin/pages", { method: "POST", body: JSON.stringify({ title }) });
      toast("Stránka vytvořena. Otevřete editor a přidejte bloky.");
      load();
      window.location.href = `/admin/stranky/${r.id}`;
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Chyba", "err");
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: Page) {
    if (!confirm(`Opravdu smazat stránku „${p.title}“?`)) return;
    await api(`/admin/pages/${p.id}`, { method: "DELETE" });
    toast("Stránka smazána.");
    load();
  }

  async function togglePub(p: Page) {
    await api(`/admin/pages/${p.id}`, { method: "PATCH", body: JSON.stringify({ published: p.published ? 0 : 1 }) });
    load();
  }

  return (
    <>
      <h1>Stránky</h1>
      <p style={{ color: "var(--muted)" }}>
        Vytvářejte a upravujte vlastní stránky pomocí <b>drag &amp; drop editoru</b>. Nové stránky můžete také
        zobrazit v hlavním menu (navbar) a přeuspořádat je. Systémové stránky (hlavní stránka, O ateliéru,
        doprava, podmínky…) mají výchozí obsah — jakmile do nich v editoru vložíte bloky, obsah z editoru
        výchozí obsah nahradí.
      </p>
      <form className="admin-form" onSubmit={(e) => { e.preventDefault(); void add(); }}>
        <label className="full">Název nové stránky
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="např. Naše historie" />
        </label>
        <button className="btn-dark" disabled={busy}>+ Vytvořit stránku</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Stránka</th><th>Adresa</th><th>Menu</th><th>Zveřejněno</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td data-label="Stránka">
                  <b>{p.title}</b>
                  {p.is_system ? (
                    <span className="chip" style={{ marginLeft: 8 }}>systémová{p.slug === "home" ? " · hlavní stránka" : ""}</span>
                  ) : null}
                </td>
                <td data-label="Adresa"><code>{systemPagePath(p.slug)}</code></td>
                <td data-label="Menu">{p.in_nav ? `✓ (${p.nav_label || p.title})` : "—"}</td>
                <td data-label="Zveřejněno"><button className={`chip ${p.published ? "on" : ""}`} onClick={() => void togglePub(p)}>{p.published ? "ano" : "ne"}</button></td>
                <td>
                  <div className="row-actions">
                    <Link className="chip" to={`/admin/stranky/${p.id}`}>✏️ Upravit</Link>
                    <Link className="chip" target="_blank" to={systemPagePath(p.slug)}>Otevřít</Link>
                    {!p.is_system && <button className="chip" onClick={() => void remove(p)}>Smazat</button>}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} style={{ color: "var(--muted)" }}>Zatím žádné stránky.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ============================================================
   Drag & drop editor
   ============================================================ */

export function PageBuilder() {
  const { id } = useParams();
  const { toast } = useStore();
  const [page, setPage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [newType, setNewType] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toolQ, setToolQ] = useState("");
  const [, setHistTick] = useState(0);

  // Historie pro zpět / znovu (strukturální změny bloků)
  const undoRef = useRef<Block[][]>([]);
  const redoRef = useRef<Block[][]>([]);
  const blocksRef = useRef<Block[]>([]);
  const selRef = useRef<string | null>(null);

  const applyBlocks = useCallback((next: Block[], record = true) => {
    if (record) {
      undoRef.current.push(blocksRef.current);
      if (undoRef.current.length > 80) undoRef.current.shift();
      redoRef.current = [];
    }
    blocksRef.current = next;
    setBlocks(next);
    setHistTick((n) => n + 1);
  }, []);

  const undo = useCallback(() => {
    const prev = undoRef.current.pop();
    if (!prev) return;
    redoRef.current.push(blocksRef.current);
    blocksRef.current = prev;
    setBlocks(prev);
    setHistTick((n) => n + 1);
  }, []);

  const redo = useCallback(() => {
    const next = redoRef.current.pop();
    if (!next) return;
    undoRef.current.push(blocksRef.current);
    blocksRef.current = next;
    setBlocks(next);
    setHistTick((n) => n + 1);
  }, []);

  const load = () => {
    void api<{ page: Page }>(`/admin/pages/${id}`).then((r) => {
      setPage(r.page);
      let parsed: Block[] = [];
      try {
        parsed = JSON.parse(r.page.blocks_json || "[]") as Block[];
      } catch {
        parsed = [];
      }
      blocksRef.current = parsed;
      undoRef.current = [];
      redoRef.current = [];
      setBlocks(parsed);
      setSel(null);
      selRef.current = null;
    });
  };
  useEffect(() => { load(); }, [id]);

  // Obsluha klávesnice (Ctrl+S, Ctrl+Z, Delete) — refs kvůli stabilnímu listeneru.
  const saveRef = useRef<() => void>(() => {});
  const undoRefFn = useRef<() => void>(() => {});
  const redoRefFn = useRef<() => void>(() => {});
  const removeRef = useRef<(b: string) => void>(() => {});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveRef.current();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redoRefFn.current();
        else undoRefFn.current();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redoRefFn.current();
        return;
      }
      if (!typing && (e.key === "Delete" || e.key === "Backspace") && selRef.current) {
        e.preventDefault();
        removeRef.current(selRef.current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!page) return <p>Načítám editor…</p>;
  const cur = page;

  function setProp(blockId: string, props: Record<string, unknown>) {
    const next = blocksRef.current.map((b) => (b.id === blockId ? { ...b, props } : b));
    applyBlocks(next, false);
  }

  function move(from: number, to: number) {
    const prev = blocksRef.current;
    if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return;
    const next = prev.slice();
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    applyBlocks(next);
  }

  function addAtEnd(type: string) {
    applyBlocks([...blocksRef.current, newBlock(type)]);
    toast("Blok přidán. Nezapomeňte uložit.");
  }

  function insertAt(type: string, index: number) {
    const next = blocksRef.current.slice();
    next.splice(index + 1, 0, newBlock(type));
    applyBlocks(next);
  }

  function removeBlock(blockId: string) {
    applyBlocks(blocksRef.current.filter((x) => x.id !== blockId));
    if (selRef.current === blockId) {
      selRef.current = null;
      setSel(null);
    }
  }

  function duplicate(i: number) {
    const all = blocksRef.current;
    const it = all[i];
    if (!it) return;
    const c = JSON.parse(JSON.stringify(it)) as Block;
    c.id = c.id + "-" + Math.random().toString(36).slice(2, 6);
    const next = all.slice();
    next.splice(i + 1, 0, c);
    applyBlocks(next);
  }

  async function save() {
    setBusy(true);
    try {
      await api(`/admin/pages/${cur.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: cur.title,
          slug: cur.slug,
          blocks_json: JSON.stringify(blocksRef.current),
          in_nav: cur.in_nav,
          nav_label: cur.nav_label,
          published: cur.published,
          meta_title: cur.meta_title,
          meta_description: cur.meta_description,
          noindex: cur.noindex,
          hide_crumbs: cur.hide_crumbs,
          page_max_width: cur.page_max_width,
        }),
      });
      toast("Stránka uložena.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Uložení selhalo.", "err");
    } finally {
      setBusy(false);
    }
  }

  // Aktualizace obsluh (refs → vždy čerstvé funkce z aktuálního renderu).
  saveRef.current = () => void save();
  undoRefFn.current = undo;
  redoRefFn.current = redo;
  removeRef.current = removeBlock;

  const selected = blocks.find((b) => b.id === sel) || null;
  const filteredTools = TOOLBOX.filter((t) => {
    const q = toolQ.trim().toLowerCase();
    if (!q) return true;
    return t.label.toLowerCase().includes(q) || t.hint.toLowerCase().includes(q) || t.type.toLowerCase().includes(q);
  });

  return (
    <div className="pb-layout">
      <div className="pb-topbar">
        <div className="pb-top-title">
          <Link to="/admin/stranky" className="chip">← Stránky</Link>
          <input
            value={page.title}
            onChange={(e) => setPage({ ...page, title: e.target.value })}
            placeholder="Název stránky"
            style={{ fontSize: 20, fontWeight: 700, border: "1px solid var(--line)", borderRadius: 10, padding: "6px 10px", width: 260 }}
          />
          {page.is_system ? (
            <span className="pb-slug" title="Adresa systémové stránky je pevná">{systemPagePath(page.slug)}</span>
          ) : (
            <span className="pb-slug">/stranka/<input value={page.slug} onChange={(e) => setPage({ ...page, slug: slugify(e.target.value) })} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "4px 8px", width: 160 }} /></span>
          )}
          <label className="pb-check"><input type="checkbox" checked={!!page.in_nav} onChange={(e) => setPage({ ...page, in_nav: e.target.checked ? 1 : 0 })} /> v menu</label>
          {page.in_nav ? (
            <input value={page.nav_label || page.title} onChange={(e) => setPage({ ...page, nav_label: e.target.value })} placeholder="Popisek v menu" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "4px 8px", width: 130 }} />
          ) : null}
          <label className="pb-check"><input type="checkbox" checked={!!page.published} onChange={(e) => setPage({ ...page, published: e.target.checked ? 1 : 0 })} /> zveřejněno</label>
          <div className="pb-top-actions">
            <button className="chip" title="Zpět (Ctrl+Z)" disabled={!undoRef.current.length} onClick={undo}>↶</button>
            <button className="chip" title="Znovu (Ctrl+Shift+Z)" disabled={!redoRef.current.length} onClick={redo}>↷</button>
            <Link className="chip" to={systemPagePath(page.slug)} target="_blank">👁 Náhled</Link>
            <button className="btn-dark btn-sm" disabled={busy} onClick={() => void save()}>{busy ? "Ukládám…" : "Uložit"}</button>
          </div>
        </div>
      </div>

      <div className="pb-body">
        {/* TOOLBOX */}
        <aside className="pb-toolbox">
          <h3>Toolbox</h3>
          <p className="pb-toolbox-hint">Přetáhněte blok na plochu, nebo klikněte pro přidání na konec.</p>
          <input
            className="pb-tool-search"
            placeholder="Hledat blok…"
            value={toolQ}
            onChange={(e) => setToolQ(e.target.value)}
          />
          <div className="pb-tool-list">
            {TOOLBOX_GROUPS.map((g) => {
              const tools = filteredTools.filter((t) => t.group === g);
              if (!tools.length) return null;
              return (
                <div key={g} className="pb-tool-group-wrap">
                  <div className="pb-tool-group">{g}</div>
                  {tools.map((t) => (
                    <div
                      key={t.type}
                      className="pb-tool"
                      draggable
                      title={t.hint}
                      onDragStart={(e) => { setNewType(t.type); e.dataTransfer.effectAllowed = "copy"; }}
                      onDragEnd={() => setNewType(null)}
                      onClick={() => addAtEnd(t.type)}
                    >
                      <span className="pb-tool-icon">{t.icon}</span>
                      <span>
                        <b>{t.label}</b>
                        <small>{t.hint}</small>
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
            {!filteredTools.length && <p className="pb-hint">Nic nenalezeno.</p>}
          </div>
        </aside>

        {/* CANVAS */}
        <div
          className="pb-canvas"
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
          onDrop={(e) => {
            e.preventDefault();
            if (newType) { applyBlocks([...blocksRef.current, newBlock(newType)]); setNewType(null); }
            setDragId(null); setOver(null);
          }}
        >
          <div className="pb-canvas-head">
            <span>Náhled stránky</span>
            <span style={{ color: "var(--muted)", fontWeight: 400 }}>{blocks.length} bloků</span>
          </div>
          {page.is_system && page.slug === "home" && (
            <div className="pb-canvas-note">
              ℹ️ Toto je <b>hlavní stránka</b>. Jakmile bude obsahovat bloky, zobrazí se na úvodní adrese <code>/</code>{" "}
              místo výchozí domovské stránky. Tlačítkem „Vložit ukázkové bloky“ vpravo nahoře sestavíte stránku
              podobnou té současné.
            </div>
          )}
          {page.is_system && page.slug !== "home" && (
            <div className="pb-canvas-note">
              ℹ️ Systémová stránka — dokud nemá bloky, zobrazuje se výchozí obsah (např. obchodní podmínky).
              Po vložení bloků obsah z editoru výchozí obsah nahradí.
            </div>
          )}
          {blocks.length === 0 && (
            <div className="pb-canvas-empty">
              Přetáhněte sem bloky z toolboxu (vlevo)…
              <div style={{ marginTop: 10 }}>
                <button className="btn-dark btn-sm" onClick={() => applyBlocks(demoBlocks())}>✨ Vložit ukázkové bloky</button>
              </div>
            </div>
          )}
          {blocks.map((b, i) => (
            <div
              key={b.id}
              className={`pb-droppable${over === b.id ? " over" : ""}${sel === b.id ? " selected" : ""}`}
              draggable
              onDragStart={(e) => { setDragId(b.id); e.dataTransfer.effectAllowed = "move"; }}
              onDragEnd={() => { setDragId(null); setOver(null); }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = newType ? "copy" : "move"; setOver(b.id); }}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                if (newType) {
                  insertAt(newType, i);
                  setNewType(null);
                } else if (dragId && dragId !== b.id) {
                  const prev = blocksRef.current;
                  const from = prev.findIndex((x) => x.id === dragId);
                  if (from >= 0) {
                    const next = prev.slice();
                    const [it] = next.splice(from, 1);
                    const to = next.indexOf(b);
                    next.splice(to >= 0 ? to : i, 0, it);
                    applyBlocks(next);
                  }
                  setDragId(null);
                }
                setDragId(null);
              }}
              onClick={() => { setSel(b.id); selRef.current = b.id; }}
            >
              <div className="pb-block-shell">
                <div className="pb-block-bar">
                  <span className="pb-grip">⠿</span>
                  <b>{TOOLBOX.find((t) => t.type === b.type)?.label || b.type}</b>
                  {b.props?.hide_m ? <span className="pb-block-kind">· skryto na mobilu</span> : null}
                  <span className="pb-block-actions">
                    <button title="Nahoru" onClick={(e) => { e.stopPropagation(); move(i, i - 1); }}>↑</button>
                    <button title="Dolů" onClick={(e) => { e.stopPropagation(); move(i, i + 1); }}>↓</button>
                    <button title="Duplikovat" onClick={(e) => { e.stopPropagation(); duplicate(i); }}>⧉</button>
                    <button title="Smazat" className="danger" onClick={(e) => { e.stopPropagation(); removeBlock(b.id); }}>🗑</button>
                  </span>
                </div>
                <div className="pb-block-preview">{renderBlock(b)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* INSPECTOR */}
        <aside className="pb-inspector">
          <h3>{selected ? "Nastavení bloku" : "Nastavení stránky"}</h3>
          {selected ? (
            <>
              <p className="pb-hint">Typ: <b>{TOOLBOX.find((t) => t.type === selected.type)?.label || selected.type}</b></p>
              <div className="pb-fields">
                <BlockFields block={selected} onChange={(props) => setProp(selected.id, props)} />
              </div>
            </>
          ) : (
            <>
              <p className="pb-hint" style={{ color: "var(--muted)" }}>
                Klikněte na blok v náhledu pro úpravu jeho obsahu. Tady nastavíte vlastnosti celé stránky.
              </p>
              <div className="pb-fields">
                <label className="pb-field">
                  <span>SEO titulek (prázdné = název stránky)</span>
                  <input value={page.meta_title} onChange={(e) => setPage({ ...page, meta_title: e.target.value })} />
                </label>
                <label className="pb-field">
                  <span>SEO popisek (meta description)</span>
                  <textarea rows={2} value={page.meta_description} onChange={(e) => setPage({ ...page, meta_description: e.target.value })} />
                </label>
                <label className="pb-field">
                  <span>Max. šířka obsahu (např. 820px, prázdné = 820px)</span>
                  <input value={page.page_max_width} onChange={(e) => setPage({ ...page, page_max_width: e.target.value })} placeholder="820px" />
                </label>
                <label className="pb-field pb-field-checkbox">
                  <span>Nezaindexovat (noindex)</span>
                  <input type="checkbox" checked={!!page.noindex} onChange={(e) => setPage({ ...page, noindex: e.target.checked ? 1 : 0 })} />
                </label>
                <label className="pb-field pb-field-checkbox">
                  <span>Skrýt drobečkovou navigaci</span>
                  <input type="checkbox" checked={!!page.hide_crumbs} onChange={(e) => setPage({ ...page, hide_crumbs: e.target.checked ? 1 : 0 })} />
                </label>
              </div>
              <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
                <button className="pb-add" onClick={() => applyBlocks(demoBlocks())}>✨ Vložit ukázkové bloky</button>
                {blocks.length > 0 && (
                  <button
                    className="pb-add"
                    style={{ color: "var(--danger)", borderColor: "color-mix(in srgb, var(--danger) 40%, var(--line))" }}
                    onClick={() => {
                      if (confirm("Smazat všechny bloky stránky?")) applyBlocks([]);
                    }}
                  >
                    🗑 Smazat všechny bloky
                  </button>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
