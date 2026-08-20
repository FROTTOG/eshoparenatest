import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError, type Page } from "../api";
import { useStore } from "../store";
import { BlockFields, newBlock, renderBlock, TOOLBOX, type Block } from "./blocks";

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
        Vytvářejte a upravujte vlastní stránky pomocí <b>drag & drop editoru</b>. Nové stránky můžete také zobrazit
        v hlavním menu (navbar) a přeuspořádat je.
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
                <td data-label="Stránka"><b>{p.title}</b>{p.is_system ? " · systémová" : ""}</td>
                <td data-label="Adresa"><code>/stranka/{p.slug}</code></td>
                <td data-label="Menu">{p.in_nav ? `✓ (${p.nav_label || p.title})` : "—"}</td>
                <td data-label="Zveřejněno"><button className={`chip ${p.published ? "on" : ""}`} onClick={() => void togglePub(p)}>{p.published ? "ano" : "ne"}</button></td>
                <td>
                  <div className="row-actions">
                    <Link className="chip" to={`/admin/stranky/${p.id}`}>✏️ Upravit</Link>
                    <Link className="chip" target="_blank" to={`/stranka/${p.slug}`}>Otevřít</Link>
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

  const load = () => {
    void api<{ page: Page }>(`/admin/pages/${id}`).then((r) => {
      setPage(r.page);
      try {
        setBlocks(JSON.parse(r.page.blocks_json || "[]") as Block[]);
      } catch {
        setBlocks([]);
      }
    });
  };
  useEffect(() => { load(); }, [id]);

  if (!page) return <p>Načítám editor…</p>;
  const cur = page;

  function setProp(blockId: string, props: Record<string, unknown>) {
    setBlocks(blocks.map((b) => (b.id === blockId ? { ...b, props } : b)));
  }

  function move(from: number, to: number) {
    setBlocks((prev) => {
      if (from === to || from < 0 || to < 0 || from >= prev.length || to >= prev.length) return prev;
      const next = prev.slice();
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  }

  async function save() {
    setBusy(true);
    try {
      await api(`/admin/pages/${cur.id}`, {
        method: "PUT",
        body: JSON.stringify({ title: cur.title, slug: cur.slug, blocks_json: JSON.stringify(blocks), in_nav: cur.in_nav, nav_label: cur.nav_label, published: cur.published }),
      });
      toast("Stránka uložena.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Uložení selhalo.", "err");
    } finally {
      setBusy(false);
    }
  }

  const selected = blocks.find((b) => b.id === sel) || null;

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
          <span className="pb-slug">/stranka/<input value={page.slug} onChange={(e) => setPage({ ...page, slug: slugify(e.target.value) })} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "4px 8px", width: 160 }} /></span>
          <label className="pb-check"><input type="checkbox" checked={!!page.in_nav} onChange={(e) => setPage({ ...page, in_nav: e.target.checked ? 1 : 0 })} /> v menu</label>
          {page.in_nav ? (
            <input value={page.nav_label || page.title} onChange={(e) => setPage({ ...page, nav_label: e.target.value })} placeholder="Popisek v menu" style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "4px 8px", width: 130 }} />
          ) : null}
          <label className="pb-check"><input type="checkbox" checked={!!page.published} onChange={(e) => setPage({ ...page, published: e.target.checked ? 1 : 0 })} /> zveřejněno</label>
          <button className="btn-dark btn-sm" disabled={busy} onClick={() => void save()}>{busy ? "Ukládám…" : "Uložit"}</button>
        </div>
      </div>

      <div className="pb-body">
        {/* TOOLBOX */}
        <aside className="pb-toolbox">
          <h3>Toolbox</h3>
          <p className="pb-toolbox-hint">Přetáhněte blok na plochu, nebo klikněte pro přidání na konec.</p>
          <div className="pb-tool-list">
            {TOOLBOX.map((t) => (
              <div
                key={t.type}
                className="pb-tool"
                draggable
                title={t.hint}
                onDragStart={(e) => { setNewType(t.type); e.dataTransfer.effectAllowed = "copy"; }}
                onDragEnd={() => setNewType(null)}
                onClick={() => setBlocks((prev) => [...prev, newBlock(t.type)])}
              >
                <span className="pb-tool-icon">{t.icon}</span>
                <span>
                  <b>{t.label}</b>
                  <small>{t.hint}</small>
                </span>
              </div>
            ))}
          </div>
        </aside>

        {/* CANVAS */}
        <div
          className="pb-canvas"
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
          onDrop={(e) => {
            e.preventDefault();
            if (newType) { setBlocks((prev) => [...prev, newBlock(newType)]); setNewType(null); }
            setDragId(null); setOver(null);
          }}
        >
          <div className="pb-canvas-head">
            <span>Náhled stránky</span>
            <span style={{ color: "var(--muted)", fontWeight: 400 }}>{blocks.length} bloků</span>
          </div>
          {blocks.length === 0 && (
            <div className="pb-canvas-empty">Přetáhněte sem bloky z toolboxu (vlevo).</div>
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
                  setBlocks((prev) => { const next = prev.slice(); next.splice(i + 1, 0, newBlock(newType)); return next; });
                  setNewType(null);
                } else if (dragId && dragId !== b.id) {
                  const from = blocks.findIndex((x) => x.id === dragId);
                  move(from, i);
                  setDragId(null);
                }
                setDragId(null);
              }}
              onClick={() => setSel(b.id)}
            >
              <div className="pb-block-shell">
                <div className="pb-block-bar">
                  <span className="pb-grip">⠿</span>
                  <b>{TOOLBOX.find((t) => t.type === b.type)?.label || b.type}</b>
                  <span className="pb-block-actions">
                    <button title="Nahoru" onClick={(e) => { e.stopPropagation(); move(i, i - 1); }}>↑</button>
                    <button title="Dolů" onClick={(e) => { e.stopPropagation(); move(i, i + 1); }}>↓</button>
                    <button title="Duplikovat" onClick={(e) => { e.stopPropagation(); const c = JSON.parse(JSON.stringify(b)); c.id = c.id + "-" + Math.random().toString(36).slice(2, 6); setBlocks((prev) => [...prev.slice(0, i + 1), c, ...prev.slice(i + 1)]); }}>⧉</button>
                    <button title="Smazat" className="danger" onClick={(e) => { e.stopPropagation(); setBlocks((prev) => prev.filter((x) => x.id !== b.id)); if (sel === b.id) setSel(null); }}>🗑</button>
                  </span>
                </div>
                <div className="pb-block-preview">{renderBlock(b)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* INSPECTOR */}
        <aside className="pb-inspector">
          <h3>Nastavení bloku</h3>
          {selected ? (
            <>
              <p className="pb-hint">Typ: <b>{TOOLBOX.find((t) => t.type === selected.type)?.label || selected.type}</b></p>
              <div className="pb-fields">
                <BlockFields block={selected} onChange={(props) => setProp(selected.id, props)} />
              </div>
            </>
          ) : (
            <p className="pb-hint" style={{ color: "var(--muted)" }}>Klikněte na blok v náhledu pro úpravu jeho obsahu.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
