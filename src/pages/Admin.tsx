import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { api, ApiError, type Order, type Page, type Product } from "../api";
import QRCode from "qrcode";
import {
  IconAdmin,
  IconBell,
  IconCard,
  IconChat,
  IconCheck,
  IconClose,
  IconCopy,
  IconDashboard,
  IconExport,
  IconFeed,
  IconFilter,
  IconFolder,
  IconGear,
  IconGift,
  IconGrid,
  IconInbox,
  IconKey,
  IconLayout,
  IconMail,
  IconMapPin,
  IconMegaphone,
  IconMenu,
  IconPalette,
  IconPen,
  IconPlus,
  IconReceipt,
  IconShop,
  IconSlides,
  IconStar,
  IconTagIcon,
  IconTicket,
  IconTrash,
  IconTruck,
  IconUsers,
  IconWarehouse,
  IconWrench,
} from "../components/Icons";
import { InfoButton } from "../components/InfoButton";
import { SaveButton, useSaver } from "../components/SaveButton";
import { TILE_COLORS, TILE_ICONS, emptyTile, readAnnounce, readFilterGroups, readHomeTiles, type AnnounceItem, type HomeTile } from "../settings";
import { Logo } from "../components/Ui";
import { czk, dateCs, statusLabel } from "../format";
import { optimizedImage } from "../image";
import { useStore } from "../store";
import { ANIM_LABELS, applyTheme, BTN_ANIMS, readTheme, THEME_VARS, themeDefaults, toHex } from "../theme";
import { Pages, PageBuilder } from "./Pages";

/** Položky menu administrace — seskupené a s ikonami. */
const ADMIN_NAV: { title: string; links: { to: string; label: string; icon: ReactNode; end?: boolean }[] }[] = [
  {
    title: "Provoz",
    links: [
      { to: "/admin", label: "Přehled", icon: <IconDashboard size={17} />, end: true },
      { to: "/admin/objednavky", label: "Objednávky", icon: <IconInbox size={17} /> },
      { to: "/admin/faktury", label: "Faktury", icon: <IconReceipt size={17} /> },
      { to: "/admin/exporty", label: "Exporty", icon: <IconExport size={17} /> },
      { to: "/admin/zakaznici", label: "Zákazníci", icon: <IconUsers size={17} /> },
      { to: "/admin/reklamace", label: "Reklamace", icon: <IconWrench size={17} /> },
    ],
  },
  {
    title: "Sortiment",
    links: [
      { to: "/admin/produkty", label: "Produkty", icon: <IconTagIcon size={17} /> },
      { to: "/admin/sklad", label: "Sklad", icon: <IconWarehouse size={17} /> },
      { to: "/admin/kategorie", label: "Kategorie", icon: <IconFolder size={17} /> },
      { to: "/admin/filtry", label: "Filtry a štítky", icon: <IconFilter size={17} /> },
      { to: "/admin/hodnoceni", label: "Hodnocení", icon: <IconStar size={17} /> },
    ],
  },
  {
    title: "Prodej",
    links: [
      { to: "/admin/kupony", label: "Kupóny a poukazy", icon: <IconTicket size={17} /> },
      { to: "/admin/doprava", label: "Doprava", icon: <IconTruck size={17} /> },
      { to: "/admin/vydejni-mista", label: "Výdejní místa", icon: <IconMapPin size={17} /> },
      { to: "/admin/platby", label: "Platby", icon: <IconCard size={17} /> },
    ],
  },
  {
    title: "Obsah a vzhled",
    links: [
      { to: "/admin/stranky", label: "Stránky (editor)", icon: <IconLayout size={17} /> },
      { to: "/admin/magazin", label: "Magazín (blog)", icon: <IconPen size={17} /> },
      { to: "/admin/carousel", label: "Carousel", icon: <IconSlides size={17} /> },
      { to: "/admin/lista-a-dlazdice", label: "Lišta a dlaždice", icon: <IconMegaphone size={17} /> },
      { to: "/admin/navbar", label: "Menu a logo", icon: <IconGrid size={17} /> },
      { to: "/admin/vzhled", label: "Vzhled", icon: <IconPalette size={17} /> },
    ],
  },
  {
    title: "Systém",
    links: [
      { to: "/admin/feedy", label: "Feedy a měření", icon: <IconFeed size={17} /> },
      { to: "/admin/emaily", label: "E-maily", icon: <IconMail size={17} /> },
      { to: "/admin/nastaveni", label: "Nastavení", icon: <IconGear size={17} /> },
    ],
  },
];

export function Admin() {
  const { user, ready } = useStore();
  const loc = useLocation();
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    setMenu(false);
  }, [loc.pathname]);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);

  // Než se načte přihlášení, nepřesměrováváme — obnovení stránky
  // v administraci by jinak vždy skočilo na přihlašovací formulář.
  if (!ready) return <div className="wrap empty">Otevíráme administraci…</div>;
  if (!user) return <Navigate to="/prihlaseni" replace />;
  if (user.role !== "admin") return <Navigate to="/ucet" replace />;

  return (
    <div className={`admin${menu ? " nav-open" : ""}`}>
      <header className="admin-topbar">
        <button type="button" className="icon-btn" onClick={() => setMenu((v) => !v)} aria-label="Menu administrace" aria-expanded={menu}>
          {menu ? <IconClose /> : <IconMenu />}
        </button>
        <Logo />
        <Link to="/" className="chip">
          E-shop
        </Link>
      </header>
      {menu && <button type="button" className="admin-scrim" aria-label="Zavřít menu" onClick={() => setMenu(false)} />}
      <aside>
        <Logo />
        <nav onClick={() => setMenu(false)}>
          {ADMIN_NAV.map((group) => (
            <div key={group.title} className="admin-nav-group">
              <span className="admin-nav-title">{group.title}</span>
              {group.links.map((l) => (
                <NavLink key={l.to} to={l.to} end={l.end}>
                  <span className="admin-nav-icon">{l.icon}</span>
                  <span className="admin-nav-label">{l.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
          <div className="admin-nav-group">
            <NavLink to="/" className="admin-nav-back">
              <span className="admin-nav-icon">
                <IconShop size={17} />
              </span>
              <span className="admin-nav-label">Zpět do e-shopu</span>
            </NavLink>
          </div>
        </nav>
      </aside>
      <main>
        <Routes>
          <Route index element={<Dash />} />
          <Route path="produkty" element={<Products />} />
          <Route path="produkty/novy" element={<ProductForm />} />
          <Route path="produkty/:id" element={<ProductForm />} />
          <Route path="sklad" element={<Stock />} />
          <Route path="kategorie" element={<Categories />} />
          <Route path="objednavky" element={<Orders />} />
          <Route path="objednavky/:id" element={<OrderEdit />} />
          <Route path="faktury" element={<Invoices />} />
          <Route path="exporty" element={<Exports />} />
          <Route path="zakaznici" element={<Customers />} />
          <Route path="kupony" element={<Coupons />} />
          <Route path="reklamace" element={<ClaimsAdmin />} />
          <Route path="hodnoceni" element={<Reviews />} />
          <Route path="doprava" element={<Shipping />} />
          <Route path="vydejni-mista" element={<Points />} />
          <Route path="platby" element={<Payments />} />
          <Route path="magazin" element={<Posts />} />
          <Route path="magazin/novy" element={<PostForm />} />
          <Route path="magazin/:id" element={<PostForm />} />
          <Route path="stranky" element={<Pages />} />
          <Route path="stranky/:id" element={<PageBuilder />} />
          <Route path="navbar" element={<NavbarSettings />} />
          <Route path="carousel" element={<CarouselSettings />} />
          <Route path="lista-a-dlazdice" element={<StripAndTiles />} />
          <Route path="filtry" element={<FiltersAndTags />} />
          <Route path="vzhled" element={<AppearanceSettings />} />
          <Route path="nastaveni" element={<SettingsPage />} />
          <Route path="feedy" element={<FeedsPage />} />
          <Route path="emaily" element={<EmailsPage />} />
        </Routes>
      </main>
    </div>
  );
}

function Dash() {
  const [s, setS] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    void api<Record<string, unknown>>("/admin/stats").then(setS);
  }, []);
  if (!s) return <p>Načítám…</p>;
  return (
    <>
      <h1>Přehled</h1>
      <div className="stats">
        <div className="stat"><b>{czk(Number(s.revenue || 0))}</b><span>Tržby celkem</span></div>
        <div className="stat"><b>{czk(Number(s.today_revenue || 0))}</b><span>Dnes</span></div>
        <div className="stat"><b>{String(s.new_orders || 0)}</b><span>Nové objednávky</span></div>
        <div className="stat"><b>{String(s.pending_reviews || 0)}</b><span>Čekající hodnocení</span></div>
      </div>
      <h2>Nízký sklad</h2>
      <div className="table-wrap" style={{ marginBottom: 22 }}>
        <table>
          <thead><tr><th>Produkt</th><th>SKU</th><th>Sklad</th></tr></thead>
          <tbody>
            {(s.low_stock as { id: number; name: string; sku: string; stock: number }[]).map((p) => (
              <tr key={p.id}>
                <td data-label="Produkt"><Link to={`/admin/produkty/${p.id}`}>{p.name}</Link></td>
                <td data-label="SKU">{p.sku}</td>
                <td data-label="Sklad">{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Poslední objednávky</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Číslo</th><th>Zákazník</th><th>Stav</th><th>Částka</th></tr></thead>
          <tbody>
            {(s.recent_orders as Order[]).map((o) => (
              <tr key={o.id}>
                <td data-label="Číslo"><Link to={`/admin/objednavky/${o.id}`}>{o.number}</Link></td>
                <td data-label="Zákazník">{o.name}</td>
                <td data-label="Stav"><span className={`tag ${o.status}`}>{statusLabel(o.status)}</span></td>
                <td data-label="Částka">{czk(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Products() {
  const { toast } = useStore();
  const [rows, setRows] = useState<Product[]>([]);
  const [cats, setCats] = useState<{ id: number; name: string }[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const [action, setAction] = useState("price_percent");
  const [value, setValue] = useState("10");
  const [busy, setBusy] = useState(false);
  const [importInfo, setImportInfo] = useState("");

  async function load(query = q) {
    setRows(await api<Product[]>(`/admin/products${query ? `?q=${encodeURIComponent(query)}` : ""}`));
    setSel([]);
  }
  useEffect(() => {
    void load("");
    void api<{ id: number; name: string }[]>("/admin/categories").then(setCats);
  }, []);

  const allChecked = rows.length > 0 && sel.length === rows.length;
  const toggle = (id: number) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleAll = () => setSel(allChecked ? [] : rows.map((r) => r.id));

  /** Popisek a typ pole pro hodnotu podle zvolené hromadné akce. */
  const valueHint: Record<string, string> = {
    price_percent: "Změna ceny v % (např. 10 = zdražit o 10 %, -15 = zlevnit o 15 %)",
    price_add: "Přičíst / odečíst Kč (např. -50)",
    price_set: "Nastavit cenu na (Kč)",
    b2b_percent: "Velkoobchodní sleva v % z maloobchodní ceny (dopočte cenu bez DPH)",
    b2b_set: "Nastavit velkoobchodní cenu bez DPH (Kč)",
    stock_set: "Nastavit sklad na (ks)",
    stock_add: "Naskladnit / odepsat (ks, např. -3)",
    category: "Zvolte kategorii",
    active: "1 = zobrazit v e-shopu, 0 = skrýt",
    featured: "1 = zobrazit na úvodní stránce, 0 = ne",
    delete: "Smazání je nevratné",
  };

  async function runBulk() {
    if (!sel.length) {
      toast("Nejdřív zaškrtněte produkty.", "err");
      return;
    }
    if (action === "delete" && !confirm(`Opravdu smazat ${sel.length} produktů? Tato akce je nevratná.`)) return;
    setBusy(true);
    try {
      const r = await api<{ changed: number }>("/admin/products/bulk", {
        method: "POST",
        body: JSON.stringify({ ids: sel, action, value: Number(value) || 0 }),
      });
      toast(`Upraveno ${r.changed} produktů.`);
      await load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Hromadná úprava selhala.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function importCsv(file: File) {
    setBusy(true);
    setImportInfo("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await api<{ created: number; updated: number; skipped: number; errors: string[] }>("/admin/products/import", {
        method: "POST",
        body: fd,
      });
      setImportInfo(
        `Nových: ${r.created} · upravených: ${r.updated} · přeskočených: ${r.skipped}` +
          (r.errors.length ? ` — ${r.errors.slice(0, 3).join(" | ")}` : "")
      );
      toast(`Import hotov: ${r.created} nových, ${r.updated} upravených.`);
      await load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Import se nezdařil.", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="toolbar">
        <h1>Produkty</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledat" onKeyDown={(e) => e.key === "Enter" && void load()} />
          <Link className="btn" to="/admin/produkty/novy">Nový produkt</Link>
        </div>
      </div>

      {/* Hromadné úpravy — zaškrtněte řádky a vyberte akci */}
      <div className="bulk-bar">
        <div className="bulk-row">
          <strong>Hromadná úprava</strong>
          <span className="bulk-count">{sel.length ? `${sel.length} vybráno` : "nic není vybráno"}</span>
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <optgroup label="Cena">
              <option value="price_percent">Změnit cenu o %</option>
              <option value="price_add">Přičíst / odečíst Kč</option>
              <option value="price_set">Nastavit cenu</option>
            </optgroup>
            <optgroup label="Velkoobchod (B2B)">
              <option value="b2b_percent">Velkoobchodní sleva v %</option>
              <option value="b2b_set">Nastavit VO cenu bez DPH</option>
            </optgroup>
            <optgroup label="Sklad">
              <option value="stock_set">Nastavit sklad</option>
              <option value="stock_add">Naskladnit / odepsat</option>
            </optgroup>
            <optgroup label="Ostatní">
              <option value="category">Přesunout do kategorie</option>
              <option value="active">Viditelnost v e-shopu</option>
              <option value="featured">Doporučené na úvod</option>
              <option value="delete">Smazat produkty</option>
            </optgroup>
          </select>
          {action === "category" ? (
            <select value={value} onChange={(e) => setValue(e.target.value)}>
              <option value="0">— bez kategorie —</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : action === "delete" ? null : (
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={{ width: 120 }}
              aria-label="Hodnota hromadné úpravy"
            />
          )}
          <button className="btn btn-sm" type="button" disabled={busy || !sel.length} onClick={() => void runBulk()}>
            Provést
          </button>
        </div>
        <p className="bulk-hint">{valueHint[action]}</p>
        <div className="bulk-row">
          <a className="btn-line btn-sm" href="/api/admin/export/products-csv">Export produktů do CSV</a>
          <label className="btn-line btn-sm" style={{ cursor: "pointer" }}>
            Import z CSV
            <input
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && void importCsv(e.target.files[0])}
            />
          </label>
          <span className="bulk-hint" style={{ margin: 0 }}>
            Sloupce: id / sku / slug pro spárování, dál jen to, co chcete měnit (price, price_b2b, stock, category_slug, tags, active…).
          </span>
        </div>
        {importInfo && <p className="bulk-hint">{importInfo}</p>}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 34 }}>
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Vybrat vše" />
              </th>
              <th></th><th>Název</th><th>SKU</th><th>Cena</th><th>VO bez DPH</th><th>Sklad</th><th>Aktivní</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className={sel.includes(p.id) ? "row-selected" : ""}>
                <td>
                  <input type="checkbox" checked={sel.includes(p.id)} onChange={() => toggle(p.id)} aria-label={`Vybrat ${p.name}`} />
                </td>
                <td>{p.image ? <img src={optimizedImage(p.image)} alt="" loading="lazy" decoding="async" width={44} height={44} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 }} /> : null}</td>
                <td data-label="Název"><Link to={`/admin/produkty/${p.id}`}>{p.name}</Link></td>
                <td data-label="SKU">{p.sku}</td>
                <td data-label="Cena">{czk(p.price)}</td>
                <td data-label="VO bez DPH">{p.price_b2b ? czk(p.price_b2b) : "—"}</td>
                <td data-label="Sklad">{p.stock}</td>
                <td data-label="Aktivní">{p.active ? "ano" : "ne"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProductForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { toast } = useStore();
  const saver = useSaver();
  const [cats, setCats] = useState<{ id: number; name: string }[]>([]);
  const [allTags, setAllTags] = useState<{ tag: string; count: number }[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [related, setRelated] = useState<{ id: number; name: string; sku: string; image: string; price: number }[]>([]);
  const [relQuery, setRelQuery] = useState("");
  const [relResults, setRelResults] = useState<Product[]>([]);
  const [form, setForm] = useState({
    name: "", slug: "", sku: "", description: "", short_description: "",
    price: 0, price_b2b: 0, compare_price: "" as number | "", stock: 0, low_stock: 5,
    category_id: "" as number | "", image: "", weight: 0, active: 1, featured: 0, is_gift_card: 0,
  });

  useEffect(() => {
    void api<{ id: number; name: string }[]>("/admin/categories").then(setCats);
    void api<{ tag: string; count: number }[]>("/admin/tags").then(setAllTags).catch(() => setAllTags([]));
    if (id) {
      void api<Product & { compare_price: number | null; related?: typeof related }>(`/admin/products/${id}`).then((p) => {
        setForm({
          name: p.name, slug: p.slug, sku: p.sku, description: p.description, short_description: p.short_description,
          price: p.price, price_b2b: p.price_b2b ?? 0, compare_price: p.compare_price ?? "", stock: p.stock, low_stock: p.low_stock,
          category_id: p.category_id ?? "", image: p.image, weight: p.weight, active: p.active, featured: p.featured,
          is_gift_card: p.is_gift_card ?? 0,
        });
        setTags(typeof p.tags === "string" ? p.tags.split(",").map((t) => t.trim()).filter(Boolean) : Array.isArray(p.tags) ? p.tags : []);
        setRelated(p.related || []);
      });
    }
  }, [id]);

  // Našeptávač produktů pro sekci „Mohlo by se hodit“.
  useEffect(() => {
    const q = relQuery.trim();
    if (q.length < 2) {
      setRelResults([]);
      return;
    }
    const t = window.setTimeout(() => {
      void api<Product[]>(`/admin/products?q=${encodeURIComponent(q)}`)
        .then((r) => setRelResults(r.filter((x) => String(x.id) !== id).slice(0, 8)))
        .catch(() => setRelResults([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [relQuery, id]);

  function addTag(raw: string) {
    const tag = raw.trim().replace(/,/g, "");
    if (!tag) return;
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setTagInput("");
      return;
    }
    setTags([...tags, tag]);
    setTagInput("");
  }

  async function toWebp(file: File): Promise<File> {
    if (file.type === "image/webp") return file;
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d"); if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0);
      const blob: Blob | null = await new Promise(res => canvas.toBlob(res, "image/webp", 0.82));
      if (!blob) return file;
      return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
    } catch { return file; }
  }
  async function upload(file: File) {
    const webp = await toWebp(file);
    const fd = new FormData();
    fd.append("file", webp);
    try {
      const r = await api<{ url: string }>("/admin/upload", { method: "POST", body: fd });
      setForm((f) => ({ ...f, image: r.url }));
      if (id) { try { await api(`/admin/products/${id}/images`, { method: "POST", body: JSON.stringify({ url: r.url }) }); toast("Fotka přidána do galerie (webp)."); } catch {} }
      else toast("Fotka je v R2 (webp).");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Nahrání selhalo. Máte připojené R2?", "err");
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      compare_price: form.compare_price === "" ? null : Number(form.compare_price),
      category_id: form.category_id === "" ? null : Number(form.category_id),
      tags: tags.join(","),
      related_ids: related.map((r) => r.id),
    };
    await saver.run(async () => {
      if (id) {
        await api(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        const r = await api<{ id: number }>("/admin/products", { method: "POST", body: JSON.stringify(payload) });
        nav(`/admin/produkty/${r.id}`);
      }
    }, id ? "Produkt uložen." : "Produkt vytvořen.");
  }

  async function remove() {
    if (!id || !confirm("Opravdu smazat produkt?")) return;
    await api(`/admin/products/${id}`, { method: "DELETE" });
    toast("Produkt smazán.");
    nav("/admin/produkty");
  }

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const suggestions = allTags.filter((t) => !tags.some((x) => x.toLowerCase() === t.tag.toLowerCase())).slice(0, 12);

  return (
    <>
      <h1>
        <IconTagIcon size={26} /> {id ? "Upravit produkt" : "Nový produkt"}
      </h1>
      <form className="admin-form" onSubmit={save}>
        <label>Název<input value={form.name} onChange={(e) => set("name", e.target.value)} required /></label>
        <label>Slug<input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="doplní se samo" /></label>
        <label>SKU<input value={form.sku} onChange={(e) => set("sku", e.target.value)} /></label>
        <label>Kategorie
          <select value={form.category_id} onChange={(e) => set("category_id", e.target.value ? Number(e.target.value) : "")}>
            <option value="">—</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Cena Kč<input type="number" value={form.price} onChange={(e) => set("price", Number(e.target.value))} /></label>
        <label>Původní cena<input type="number" value={form.compare_price} onChange={(e) => set("compare_price", e.target.value === "" ? "" : Number(e.target.value))} /></label>
        <label>
          Velkoobchodní cena bez DPH
          <input type="number" value={form.price_b2b} onChange={(e) => set("price_b2b", Number(e.target.value))} />
          <small style={{ color: "var(--muted)" }}>0 = použije se plošná sleva z nastavení (b2b_discount).</small>
        </label>
        {!id && <label>Počáteční sklad<input type="number" value={form.stock} onChange={(e) => set("stock", Number(e.target.value))} /></label>}
        <label>Hláška nízkého skladu<input type="number" value={form.low_stock} onChange={(e) => set("low_stock", Number(e.target.value))} /></label>
        <label>Hmotnost g<input type="number" value={form.weight} onChange={(e) => set("weight", Number(e.target.value))} /></label>
        <label>URL fotky<input value={form.image} onChange={(e) => set("image", e.target.value)} /></label>
        <label>Nahrát do R2<input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} /></label>
        <label className="full">Krátký popis<textarea value={form.short_description} onChange={(e) => set("short_description", e.target.value)} /></label>
        <label className="full">Popis<textarea rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>

        {/* Štítky produktu — filtry v katalogu */}
        <div className="full admin-subcard">
          <h3 className="admin-form-title">
            <IconFilter size={17} /> Štítky produktu
          </h3>
          <p className="admin-hint">
            Štítky slouží k filtrování v katalogu (např. „len“, „ruční práce“, „dárek do 1000“). Skupiny filtrů, které
            zákazník uvidí, sestavíte v sekci <Link to="/admin/filtry">Filtry a štítky</Link>.
          </p>
          <div className="tag-editor">
            {tags.map((t) => (
              <span key={t} className="tag-chip on">
                {t}
                <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Odebrat štítek ${t}`}>
                  ✕
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagInput);
                }
                if (e.key === "Backspace" && !tagInput && tags.length) setTags(tags.slice(0, -1));
              }}
              placeholder="Napište štítek a stiskněte Enter"
            />
          </div>
          {suggestions.length > 0 && (
            <div className="tag-suggest">
              <span>Používané štítky:</span>
              {suggestions.map((t) => (
                <button key={t.tag} type="button" className="chip" onClick={() => addTag(t.tag)}>
                  + {t.tag} <small>{t.count}</small>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Doporučené produkty */}
        <div className="full admin-subcard">
          <h3 className="admin-form-title">
            <IconGrid size={17} /> Doporučujeme k tomuto produktu
          </h3>
          <p className="admin-hint">
            Vybrané produkty se u zboží zobrazí v sekci <b>„Mohlo by se hodit“</b>. Když nic nevyberete, doplní se
            automaticky zboží ze stejné kategorie.
          </p>
          {related.length > 0 && (
            <div className="related-list">
              {related.map((r, i) => (
                <div key={r.id} className="related-item">
                  {r.image ? <img src={optimizedImage(r.image)} alt="" width={40} height={40} /> : <span className="related-ph" />}
                  <span>
                    <b>{r.name}</b>
                    <small>{r.sku} · {czk(r.price)}</small>
                  </span>
                  <span className="row-actions">
                    <button type="button" className="chip" disabled={i === 0} onClick={() => {
                      const next = related.slice();
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      setRelated(next);
                    }}>↑</button>
                    <button type="button" className="chip" disabled={i === related.length - 1} onClick={() => {
                      const next = related.slice();
                      [next[i + 1], next[i]] = [next[i], next[i + 1]];
                      setRelated(next);
                    }}>↓</button>
                    <button type="button" className="chip danger" onClick={() => setRelated(related.filter((x) => x.id !== r.id))}>
                      <IconTrash size={14} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
          <input
            value={relQuery}
            onChange={(e) => setRelQuery(e.target.value)}
            placeholder="Hledat produkt podle názvu nebo SKU…"
            style={{ marginTop: 10 }}
          />
          {relResults.length > 0 && (
            <div className="related-results">
              {relResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="related-result"
                  disabled={related.some((x) => x.id === r.id)}
                  onClick={() => {
                    setRelated([...related, { id: r.id, name: r.name, sku: r.sku, image: r.image, price: r.price }]);
                    setRelQuery("");
                    setRelResults([]);
                  }}
                >
                  <IconPlus size={14} /> {r.name} <small>{r.sku}</small>
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="admin-check"><input type="checkbox" checked={!!form.active} onChange={(e) => set("active", e.target.checked ? 1 : 0)} /> <span><b>Aktivní</b><small>Zobrazuje se v e-shopu.</small></span></label>
        <label className="admin-check"><input type="checkbox" checked={!!form.featured} onChange={(e) => set("featured", e.target.checked ? 1 : 0)} /> <span><b>Na úvod</b><small>Objeví se mezi doporučenými.</small></span></label>
        <label className="admin-check"><input type="checkbox" checked={!!form.is_gift_card} onChange={(e) => set("is_gift_card", e.target.checked ? 1 : 0)} /> <span><b>Dárkový poukaz</b><small>Po zaplacení pošleme zákazníkovi kód e-mailem.</small></span></label>
        <div className="full">
          <SaveButton state={saver.state} error={saver.error} type="submit">
            {id ? "Uložit produkt" : "Vytvořit produkt"}
          </SaveButton>
          {id && (
            <button className="btn-line btn-sm" type="button" style={{ marginTop: 8 }} onClick={() => void remove()}>
              <IconTrash size={15} /> Smazat produkt
            </button>
          )}
        </div>
      </form>
    </>
  );
}

function Stock() {
  const { toast } = useStore();
  const [rows, setRows] = useState<{ id: number; name: string; sku: string; stock: number; low_stock: number }[]>([]);
  const load = () => void api<typeof rows>("/admin/stock").then(setRows);
  useEffect(() => { load(); }, []);
  async function adj(id: number, delta: number) {
    const reason = prompt("Důvod pohybu", delta > 0 ? "Naskladnění" : "Odpis") || "Úprava";
    await api(`/admin/products/${id}/stock`, { method: "POST", body: JSON.stringify({ delta, reason }) });
    toast("Sklad upraven.");
    load();
  }
  return (
    <>
      <h1>Sklad</h1>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Produkt</th><th>SKU</th><th>Ks</th><th></th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name}{p.stock <= p.low_stock ? " · málo" : ""}</td>
                <td>{p.sku}</td>
                <td><b>{p.stock}</b></td>
                <td className="row-actions">
                  <button className="chip" onClick={() => void adj(p.id, 1)}>+1</button>
                  <button className="chip" onClick={() => void adj(p.id, 5)}>+5</button>
                  <button className="chip" onClick={() => void adj(p.id, -1)}>−1</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Categories() {
  const [rows, setRows] = useState<{ id: number; name: string; slug: string; description: string; sort_order: number; active: number }[]>([]);
  const [form, setForm] = useState({ name: "", description: "" });
  const load = () => void api<typeof rows>("/admin/categories").then(setRows);
  useEffect(() => { load(); }, []);
  return (
    <>
      <h1>Kategorie</h1>
      <form className="admin-form" onSubmit={(e) => { e.preventDefault(); void api("/admin/categories", { method: "POST", body: JSON.stringify(form) }).then(load); }}>
        <label>Název<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label>Popis<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <button className="btn-dark">Přidat</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Název</th><th>Slug</th><th></th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.slug}</td>
                <td><button className="linkish" onClick={() => void api(`/admin/categories/${c.id}`, { method: "DELETE" }).then(load)}>Smazat</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Orders() {
  const { toast } = useStore();
  const [rows, setRows] = useState<Order[]>([]);
  const [status, setStatus] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const load = () => void api<Order[]>(`/admin/orders${status ? `?status=${status}` : ""}`).then((r) => { setRows(r); setSel([]); });
  useEffect(() => { load(); }, [status]);

  const allChecked = rows.length > 0 && sel.length === rows.length;
  const toggle = (id: number) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  /** Otevře jeden tiskový dokument se všemi vybranými fakturami / štítky. */
  function print(what: "invoices" | "labels" | "both") {
    if (!sel.length) {
      toast("Nejdřív zaškrtněte objednávky.", "err");
      return;
    }
    window.open(`/api/admin/print?ids=${sel.join(",")}&what=${what}`, "_blank", "noopener");
  }

  async function bulkStatus(next: string) {
    if (!sel.length) {
      toast("Nejdřív zaškrtněte objednávky.", "err");
      return;
    }
    try {
      const r = await api<{ changed: number }>("/admin/orders/bulk", {
        method: "POST",
        body: JSON.stringify({ ids: sel, status: next }),
      });
      toast(`Změněno u ${r.changed} objednávek.`);
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Nepodařilo se změnit stav.", "err");
    }
  }

  return (
    <>
      <div className="toolbar">
        <h1>Objednávky</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Vše</option>
          {["new", "paid", "processing", "shipped", "delivered", "cancelled"].map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
      </div>

      {/* Hromadný tisk — označte objednávky a stáhněte jedno PDF */}
      <div className="bulk-bar">
        <div className="bulk-row">
          <strong>Hromadné akce</strong>
          <span className="bulk-count">{sel.length ? `${sel.length} vybráno` : "nic není vybráno"}</span>
          <button className="btn btn-sm" type="button" onClick={() => print("both")}>Tisk faktur + štítků</button>
          <button className="btn-line btn-sm" type="button" onClick={() => print("invoices")}>Jen faktury</button>
          <button className="btn-line btn-sm" type="button" onClick={() => print("labels")}>Jen štítky</button>
          <button className="btn-line btn-sm" type="button" onClick={() => void bulkStatus("processing")}>Označit „Zpracovává se“</button>
          <button className="btn-line btn-sm" type="button" onClick={() => void bulkStatus("shipped")}>Označit „Odesláno“</button>
        </div>
        <p className="bulk-hint">
          Otevře se jeden dokument se všemi fakturami a adresními štítky (každý na vlastní stránce) rovnou v tiskovém
          dialogu — vyberte „Uložit jako PDF“ nebo tiskárnu.
        </p>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 34 }}>
                <input type="checkbox" checked={allChecked} onChange={() => setSel(allChecked ? [] : rows.map((r) => r.id))} aria-label="Vybrat vše" />
              </th>
              <th>Číslo</th><th>Zákazník</th><th>Stav</th><th>Platba</th><th>Celkem</th><th>Kdy</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className={sel.includes(o.id) ? "row-selected" : ""}>
                <td>
                  <input type="checkbox" checked={sel.includes(o.id)} onChange={() => toggle(o.id)} aria-label={`Vybrat objednávku ${o.number}`} />
                </td>
                <td data-label="Číslo"><Link to={`/admin/objednavky/${o.id}`}>{o.number}</Link></td>
                <td data-label="Zákazník">{o.name}<br /><small>{o.email}</small></td>
                <td data-label="Stav"><span className={`tag ${o.status}`}>{statusLabel(o.status)}</span></td>
                <td data-label="Platba">{statusLabel(o.payment_status)}</td>
                <td data-label="Celkem">{czk(o.total)}</td>
                <td data-label="Vytvořeno">{dateCs(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function OrderEdit() {
  const { id } = useParams();
  const { toast } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const load = () => void api<{ order: Order }>(`/admin/orders/${id}`).then((r) => setOrder(r.order));
  useEffect(() => { load(); }, [id]);
  async function patch(body: Record<string, string>) {
    const r = await api<{ order: Order }>(`/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    setOrder(r.order);
    toast("Uloženo.");
  }
  if (!order) return <p>Načítám…</p>;
  return (
    <>
      <h1>{order.number}</h1>
      <div className="row-actions" style={{ marginBottom: 16 }}>
        {["new", "paid", "processing", "shipped", "delivered", "cancelled"].map((s) => (
          <button key={s} className={`chip ${order.status === s ? "on" : ""}`} onClick={() => void patch({ status: s })}>{statusLabel(s)}</button>
        ))}
      </div>
      <div className="row-actions" style={{ marginBottom: 16 }}>
        {["pending", "paid", "cod", "refunded"].map((s) => (
          <button key={s} className={`chip ${order.payment_status === s ? "on" : ""}`} onClick={() => void patch({ payment_status: s })}>Platba: {statusLabel(s)}</button>
        ))}
      </div>
      <div className="row-actions" style={{ marginBottom: 16 }}>
        <button
          className="btn btn-sm"
          onClick={async () => {
            try {
              const r = await api<{ invoice: { id: number; number: string } }>(`/admin/orders/${order.id}/invoice`, { method: "POST" });
              toast(`Faktura ${r.invoice.number} je připravená.`);
              window.open(`/api/admin/invoices/${r.invoice.id}/html`, "_blank", "noopener");
            } catch (e) {
              toast(e instanceof ApiError ? e.message : "Fakturu se nepodařilo vystavit.", "err");
            }
          }}
        >
          Faktura (vystavit / otevřít)
        </button>
        <Link className="chip" to="/admin/faktury">Všechny faktury</Link>
      </div>
      <div className="row-actions" style={{ marginBottom: 16 }}>
        {[
          ["ceska_posta", "Česká pošta — tisk štítku"],
          ["ppl", "PPL — tisk štítku"],
          ["dpd", "DPD — tisk štítku"],
        ].map(([carrier, label]) => (
          <button
            key={carrier}
            className="btn btn-sm"
            onClick={async () => {
              try {
                const r = await api<{ shipment: { tracking_number: string; tracking_url: string }; order: Order }>(
                  `/admin/orders/${order.id}/label`,
                  { method: "POST", body: JSON.stringify({ carrier }) }
                );
                setOrder(r.order);
                toast(`Štítek ${r.shipment.tracking_number} je připravený.`);
                window.open(`/api/admin/orders/${order.id}/label?carrier=${carrier}`, "_blank", "noopener");
              } catch (e) {
                toast(e instanceof ApiError ? e.message : "Štítek se nepodařilo vytvořit.", "err");
              }
            }}
          >
            {label}
          </button>
        ))}
        {order.tracking_number && (
          <a className="chip" href={order.tracking_url || "#"} target="_blank" rel="noreferrer">
            Sledovat {order.tracking_number}
          </a>
        )}
      </div>
      <div className="admin-split" style={{ display: "grid", gap: 16, margin: "16px 0", background: "var(--card)", padding: 18, borderRadius: 16, border: "1px solid var(--line)" }}>
        <div>
          <b style={{ display: "block", marginBottom: 6 }}>Fakturační údaje:</b>
          {order.is_company ? (
            <>
              <b>{order.company_name}</b>
              <br />
              IČO: {order.ico} {order.dic ? `· DIČ: ${order.dic}` : ""}
              <br />
              Kontakt: {order.billing_name || order.name}
            </>
          ) : (
            <b>{order.billing_name || order.name}</b>
          )}
          <br />
          {order.billing_street || order.street}
          <br />
          {order.billing_zip || order.zip} {order.billing_city || order.city}
          <br />
          {order.billing_country || order.country || "CZ"}
          <br />
          <span style={{ color: "var(--muted)" }}>{order.email} · {order.phone}</span>
        </div>
        <div>
          <b style={{ display: "block", marginBottom: 6 }}>Doručení a platba:</b>
          <b>{order.shipping_name}</b> ({czk(order.shipping_price)})
          <br />
          {order.pickup ? (
            <>
              Výdejní místo: <b>{order.pickup.name}</b>
              <br />
              {order.pickup.address}, {order.pickup.zip} {order.pickup.city}
            </>
          ) : (
            <>
              Příjemce: {order.shipping_recipient || order.billing_name || order.name}
              <br />
              {order.street}, {order.zip} {order.city}
            </>
          )}
          <br />
          Platba: <b>{order.payment_name}</b> ({czk(order.payment_fee)})
          <br />
          Celková částka: <b style={{ color: "var(--accent)" }}>{czk(order.total)}</b>
          {order.note && (
            <div style={{ marginTop: 8, padding: 8, background: "var(--bg-deep)", borderRadius: 8, fontSize: 13 }}>
              <b>Poznámka zákazníka:</b> {order.note}
            </div>
          )}
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Položka</th><th>Ks</th><th>Cena</th></tr></thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id}><td>{it.name}</td><td>{it.quantity}</td><td>{czk(it.price * it.quantity)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

type Invoice = {
  id: number;
  number: string;
  order_id: number;
  order_number: string;
  variable_symbol: string;
  issue_date: string;
  due_date: string;
  customer_name: string;
  company_name: string;
  customer_email: string;
  ico: string;
  subtotal: number;
  vat_amount: number;
  total: number;
  currency: string;
  status: string;
  paid_at: string | null;
};

function invoiceStatusLabel(s: string) {
  return s === "paid" ? "Zaplaceno" : s === "cancelled" ? "Storno" : "Vystaveno";
}

function Invoices() {
  const { toast } = useStore();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState({ count: 0, total: 0, unpaid: 0 });
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    const r = await api<{ invoices: Invoice[]; summary: typeof summary }>(`/admin/invoices${params.toString() ? `?${params}` : ""}`);
    setRows(r.invoices);
    setSummary(r.summary);
  }
  useEffect(() => { void load(); }, [status]);

  async function generate(onlyPaid: boolean) {
    setBusy(true);
    try {
      const r = await api<{ created: number; checked: number }>("/admin/invoices/generate", {
        method: "POST",
        body: JSON.stringify({ only_paid: onlyPaid }),
      });
      toast(r.created ? `Vystaveno ${r.created} faktur.` : "Všechny objednávky už fakturu mají.");
      await load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Generování selhalo.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function setStatusOf(inv: Invoice, next: string) {
    await api(`/admin/invoices/${inv.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    toast("Uloženo.");
    await load();
  }

  return (
    <>
      <div className="toolbar">
        <h1>Faktury</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledat číslo, zákazníka…" onKeyDown={(e) => e.key === "Enter" && void load()} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Všechny stavy</option>
            <option value="issued">Vystavené</option>
            <option value="paid">Zaplacené</option>
            <option value="cancelled">Storno</option>
          </select>
          <button className="btn-dark btn-sm" disabled={busy} onClick={() => void generate(false)}>Dogenerovat chybějící</button>
          <Link className="btn btn-sm" to="/admin/exporty">Export do účetnictví →</Link>
        </div>
      </div>

      <p style={{ color: "var(--muted)", marginTop: -6 }}>
        Faktury se vystavují samy podle nastavení (<Link to="/admin/nastaveni">Nastavení → invoice_auto</Link>). Tlačítkem výše doplníte faktury ke starším objednávkám.
      </p>

      <div className="stats">
        <div className="stat"><b>{summary.count}</b><span>Faktur v seznamu</span></div>
        <div className="stat"><b>{czk(summary.total)}</b><span>Fakturováno celkem</span></div>
        <div className="stat"><b>{czk(summary.unpaid)}</b><span>Čeká na úhradu</span></div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Číslo</th><th>Objednávka</th><th>Odběratel</th><th>Vystaveno</th><th>Splatnost</th><th>Celkem</th><th>Stav</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                <td data-label="Číslo"><b>{i.number}</b><br /><small>VS {i.variable_symbol}</small></td>
                <td data-label="Objednávka"><Link to={`/admin/objednavky/${i.order_id}`}>{i.order_number}</Link></td>
                <td data-label="Odběratel">{i.company_name || i.customer_name}<br /><small>{i.customer_email}</small></td>
                <td data-label="Vystaveno">{dateCs(i.issue_date)}</td>
                <td data-label="Splatnost">{dateCs(i.due_date)}</td>
                <td data-label="Celkem">{czk(i.total)}<br /><small>bez DPH {czk(i.subtotal)}</small></td>
                <td data-label="Stav"><span className={`tag ${i.status === "paid" ? "paid" : i.status === "cancelled" ? "cancelled" : "new"}`}>{invoiceStatusLabel(i.status)}</span></td>
                <td>
                  <div className="row-actions">
                    <a className="chip" href={`/api/admin/invoices/${i.id}/html`} target="_blank" rel="noreferrer">Tisk / PDF</a>
                    {i.status !== "paid" ? (
                      <button className="chip" onClick={() => void setStatusOf(i, "paid")}>Zaplaceno</button>
                    ) : (
                      <button className="chip" onClick={() => void setStatusOf(i, "issued")}>Zrušit úhradu</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={8} style={{ color: "var(--muted)" }}>Zatím tu nejsou žádné faktury.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Exports() {
  const { toast } = useStore();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [onlyPaid, setOnlyPaid] = useState(false);

  function url(target: string) {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (onlyPaid) p.set("only_paid", "1");
    return `/api/admin/export/${target}${p.toString() ? `?${p}` : ""}`;
  }

  async function download(target: string, label: string) {
    try {
      const res = await fetch(url(target), { credentials: "include" });
      if (!res.ok) {
        const t = await res.text();
        let msg = "Export selhal.";
        try {
          msg = (JSON.parse(t) as { error?: string }).error || msg;
        } catch {
          /* ponecháme obecnou hlášku */
        }
        toast(msg, "err");
        return;
      }
      const blob = await res.blob();
      const name = res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || `${target}.csv`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      toast(`${label} stažen.`);
    } catch {
      toast("Export selhal.", "err");
    }
  }

  const cards: { target: string; title: string; badge: string; text: string; how: string }[] = [
    {
      target: "idoklad",
      title: "iDoklad",
      badge: "CSV",
      text: "Vydané faktury po položkách, středníkem oddělené CSV v UTF-8 (s BOM) — otevře se rovnou v Excelu i v importu iDokladu.",
      how: "iDoklad → Faktury vydané → Import → vyberte stažený soubor a namapujte sloupce.",
    },
    {
      target: "fakturoid",
      title: "Fakturoid",
      badge: "CSV",
      text: "CSV s anglickými názvy sloupců (number, issued_on, client_name, line_name…), ceny včetně DPH.",
      how: "Fakturoid → Faktury → Import → nahrajte CSV. Sloupce v prvním řádku nemažte.",
    },
    {
      target: "pohoda",
      title: "POHODA",
      badge: "XML",
      text: "XML dataPack se strukturou Stormware (schema version_2), vydané faktury včetně položek, DPH a bankovního účtu.",
      how: "POHODA → Soubor → Datová komunikace → XML import/export → vyberte stažené XML.",
    },
    {
      target: "invoices-csv",
      title: "Faktury — univerzální CSV",
      badge: "CSV",
      text: "Jeden řádek = jedna faktura. Hodí se pro účetní, Excel nebo jiný systém.",
      how: "Otevřete v Excelu / Google Sheets, nebo pošlete účetní.",
    },
    {
      target: "orders-csv",
      title: "Objednávky — CSV",
      badge: "CSV",
      text: "Export objednávek se stavy, dopravou, platbou a částkami (nezávisle na fakturách).",
      how: "Reporting, sklady, marketing, reklamace.",
    },
  ];

  return (
    <>
      <h1>Exporty do účetnictví</h1>
      <p style={{ color: "var(--muted)" }}>
        Vyberte období a stáhněte si podklady pro <b>iDoklad</b>, <b>Fakturoid</b> nebo <b>POHODU</b>. Exportují se faktury,
        které e-shop vystavil automaticky — chybějící doplníte v sekci <Link to="/admin/faktury">Faktury</Link>.
      </p>

      <form className="admin-form" onSubmit={(e) => e.preventDefault()}>
        <label>Od data<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>Do data<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label className="full">
          <input type="checkbox" checked={onlyPaid} onChange={(e) => setOnlyPaid(e.target.checked)} /> Jen zaplacené faktury
        </label>
      </form>

      <div className="export-grid">
        {cards.map((c) => (
          <div className="export-card" key={c.target}>
            <div className="export-head">
              <h3>{c.title}</h3>
              <span className="export-badge">{c.badge}</span>
            </div>
            <p>{c.text}</p>
            <p className="export-how">{c.how}</p>
            <button className="btn btn-sm" onClick={() => void download(c.target, c.title)}>Stáhnout export</button>
          </div>
        ))}
      </div>
    </>
  );
}

type CustomerRow = {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: string;
  customer_group?: string;
  company_name?: string;
  ico?: string;
  orders: number;
  spent: number;
  created_at: string;
};

function Customers() {
  const { toast, user: me } = useStore();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<CustomerRow | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => void api<CustomerRow[]>("/admin/customers").then(setRows);
  useEffect(() => { load(); }, []);

  async function setGroup(u: CustomerRow, group: string) {
    try {
      await api(`/admin/customers/${u.id}`, { method: "PATCH", body: JSON.stringify({ customer_group: group }) });
      setRows((prev) => prev.map((r) => (r.id === u.id ? { ...r, customer_group: group } : r)));
      toast(group === "b2b" ? `${u.email} vidí velkoobchodní ceny.` : `${u.email} má běžné ceny.`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Změnu se nepodařilo uložit.", "err");
    }
  }

  async function remove(u: CustomerRow) {
    if (!confirm(`Opravdu smazat účet ${u.email}? Objednávky zůstanou zachované.`)) return;
    try {
      await api(`/admin/customers/${u.id}`, { method: "DELETE" });
      toast("Účet smazán.");
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Účet se nepodařilo smazat.", "err");
    }
  }

  async function sendReset(u: CustomerRow) {
    try {
      await api(`/admin/customers/${u.id}/reset`, { method: "POST" });
      toast(`Odkaz pro nastavení hesla odeslán na ${u.email}.`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "E-mail se nepodařilo odeslat.", "err");
    }
  }

  const filtered = rows.filter(
    (u) => !q || `${u.name} ${u.email} ${u.company_name || ""} ${u.ico || ""}`.toLowerCase().includes(q.toLowerCase())
  );
  const b2bCount = rows.filter((u) => u.customer_group === "b2b").length;

  return (
    <>
      <div className="toolbar">
        <h1>
          <IconUsers size={26} /> Zákazníci
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledat jméno, e-mail, IČO" />
          <button type="button" className="btn btn-sm" onClick={() => { setCreating(true); setEdit(null); }}>
            <IconPlus size={15} /> Nový zákazník
          </button>
        </div>
      </div>
      <p className="admin-lead">
        Kliknutím na <b>Upravit</b> změníte jméno, e-mail, telefon, roli i heslo. Velkoobchodní skupina: <b>{b2bCount}</b> z {rows.length}.
        Ceník nastavíte u produktu nebo plošně v <Link to="/admin/nastaveni">Nastavení → b2b_discount</Link>.
      </p>

      {(edit || creating) && (
        <CustomerEditor
          row={edit}
          onClose={() => { setEdit(null); setCreating(false); }}
          onSaved={() => { setEdit(null); setCreating(false); load(); }}
        />
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Jméno</th><th>E-mail</th><th>Skupina</th><th>Role</th><th>Obj.</th><th>Útrata</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id}>
                <td data-label="Jméno">
                  {u.name}
                  {u.company_name ? <><br /><small>{u.company_name}{u.ico ? ` · IČO ${u.ico}` : ""}</small></> : null}
                </td>
                <td data-label="E-mail">{u.email}<br /><small>{u.phone}</small></td>
                <td data-label="Skupina">
                  <select value={u.customer_group === "b2b" ? "b2b" : "retail"} onChange={(e) => void setGroup(u, e.target.value)}>
                    <option value="retail">Běžný zákazník</option>
                    <option value="b2b">Velkoobchod (B2B)</option>
                  </select>
                </td>
                <td data-label="Role">
                  <span className={`tag ${u.role === "admin" ? "paid" : ""}`}>{u.role === "admin" ? "správce" : "zákazník"}</span>
                </td>
                <td data-label="Objednávek">{u.orders}</td>
                <td data-label="Útrata">{czk(u.spent)}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="chip" onClick={() => { setEdit(u); setCreating(false); }}>
                      <IconPen size={14} /> Upravit
                    </button>
                    <button type="button" className="chip" onClick={() => void sendReset(u)} title="Pošle odkaz na nastavení nového hesla">
                      <IconKey size={14} /> Reset hesla
                    </button>
                    {me?.id !== u.id && (
                      <button type="button" className="chip danger" onClick={() => void remove(u)}>
                        <IconTrash size={14} /> Smazat
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} style={{ color: "var(--muted)" }}>Nikdo takový tu není.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Formulář pro úpravu (nebo založení) zákaznického účtu. */
function CustomerEditor({ row, onClose, onSaved }: { row: CustomerRow | null; onClose: () => void; onSaved: () => void }) {
  const saver = useSaver();
  const [form, setForm] = useState({
    name: row?.name || "",
    email: row?.email || "",
    phone: row?.phone || "",
    password: "",
    role: row?.role === "admin" ? "admin" : "customer",
    customer_group: row?.customer_group === "b2b" ? "b2b" : "retail",
    company_name: row?.company_name || "",
    ico: row?.ico || "",
  });

  useEffect(() => {
    setForm({
      name: row?.name || "",
      email: row?.email || "",
      phone: row?.phone || "",
      password: "",
      role: row?.role === "admin" ? "admin" : "customer",
      customer_group: row?.customer_group === "b2b" ? "b2b" : "retail",
      company_name: row?.company_name || "",
      ico: row?.ico || "",
    });
  }, [row?.id]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ok = await saver.run(async () => {
      if (row) {
        const payload: Record<string, unknown> = { ...form };
        if (!form.password) delete payload.password;
        await api(`/admin/customers/${row.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      } else {
        await api("/admin/customers", { method: "POST", body: JSON.stringify(form) });
      }
    }, row ? "Účet zákazníka uložen." : "Zákazník založen.");
    if (ok) onSaved();
  }

  return (
    <form className="admin-form admin-card" onSubmit={submit}>
      <h2 className="admin-form-title">
        {row ? <IconPen size={18} /> : <IconPlus size={18} />} {row ? `Upravit účet ${row.email}` : "Nový zákazník"}
      </h2>
      <label>Jméno a příjmení<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
      <label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
      <label>Telefon<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
      <label>
        {row ? "Nové heslo (prázdné = beze změny)" : "Heslo (min. 8 znaků)"}
        <input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!row} />
      </label>
      <label>
        Role
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="customer">Zákazník</option>
          <option value="admin">Správce (přístup do administrace)</option>
        </select>
      </label>
      <label>
        Cenová skupina
        <select value={form.customer_group} onChange={(e) => setForm({ ...form, customer_group: e.target.value })}>
          <option value="retail">Běžný zákazník</option>
          <option value="b2b">Velkoobchod (B2B)</option>
        </select>
      </label>
      <label>Firma<input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></label>
      <label>IČO<input value={form.ico} onChange={(e) => setForm({ ...form, ico: e.target.value })} /></label>
      <div className="full">
        <SaveButton state={saver.state} error={saver.error} type="submit">
          {row ? "Uložit účet" : "Založit účet"}
        </SaveButton>
        <button type="button" className="btn-line btn-sm" style={{ marginTop: 8 }} onClick={onClose}>
          Zavřít
        </button>
      </div>
    </form>
  );
}

type CouponRow = {
  id: number;
  code: string;
  type: string;
  value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  active: number;
  description: string;
  valid_from: string | null;
  valid_to: string | null;
  auto_delete: number;
  requires_login?: number;
  single_use?: number;
};

type VoucherRow = {
  id: number;
  code: string;
  amount: number;
  order_number: string;
  buyer_email: string;
  recipient_email: string;
  status: string;
  valid_to: string | null;
  created_at: string;
  used_count: number;
};

const emptyCoupon = () => ({
  code: "",
  type: "percent",
  value: 10,
  min_order: 0,
  max_uses: 100 as number | null,
  description: "",
  valid_from: "",
  valid_to: "",
  auto_delete: 0,
  active: 1,
  requires_login: 0,
  single_use: 0,
});

/** Hodnota pro <input type="datetime-local"> z hodnoty uložené v databázi. */
function toLocalInput(v: string | null | undefined): string {
  if (!v) return "";
  const s = String(v).replace(" ", "T");
  return s.slice(0, 16);
}

/** Zpět do formátu, kterému rozumí SQLite (YYYY-MM-DD HH:MM:SS). */
function fromLocalInput(v: string): string | null {
  if (!v) return null;
  return `${v.replace("T", " ")}:00`.slice(0, 19);
}

function Coupons() {
  const { toast } = useStore();
  const saver = useSaver();
  const [rows, setRows] = useState<CouponRow[]>([]);
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [form, setForm] = useState(emptyCoupon());
  const [editId, setEditId] = useState<number | null>(null);
  const [tab, setTab] = useState<"coupons" | "vouchers">("coupons");
  const [giftAmount, setGiftAmount] = useState(500);
  const [manual, setManual] = useState({ amount: 500, email: "", recipient_name: "", message: "", months: 12 });

  const load = () => {
    void api<{ items: CouponRow[]; purged: number }>("/admin/coupons").then((r) => {
      setRows(r.items || []);
      if (r.purged) toast(`Automaticky smazáno ${r.purged} kupónů po vypršení platnosti.`);
    });
    void api<VoucherRow[]>("/admin/vouchers").then(setVouchers).catch(() => setVouchers([]));
  };
  useEffect(() => { load(); }, []);

  function edit(c: CouponRow) {
    setEditId(c.id);
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      min_order: c.min_order,
      max_uses: c.max_uses,
      description: c.description,
      valid_from: toLocalInput(c.valid_from),
      valid_to: toLocalInput(c.valid_to),
      auto_delete: c.auto_delete ? 1 : 0,
      active: c.active ? 1 : 0,
      requires_login: c.requires_login ? 1 : 0,
      single_use: c.single_use ? 1 : 0,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditId(null);
    setForm(emptyCoupon());
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      valid_from: fromLocalInput(form.valid_from),
      valid_to: fromLocalInput(form.valid_to),
    };
    const okDone = await saver.run(
      async () => {
        if (editId) await api(`/admin/coupons/${editId}`, { method: "PUT", body: JSON.stringify(payload) });
        else await api("/admin/coupons", { method: "POST", body: JSON.stringify(payload) });
      },
      editId ? "Kupón upraven." : "Kupón přidán."
    );
    if (okDone) {
      reset();
      load();
    }
  }

  async function remove(c: CouponRow) {
    if (!confirm(`Opravdu smazat kupón ${c.code}?`)) return;
    await api(`/admin/coupons/${c.id}`, { method: "DELETE" });
    toast("Kupón smazán.");
    load();
  }

  async function purge() {
    const r = await api<{ purged: number }>("/admin/coupons/purge", { method: "POST" });
    toast(r.purged ? `Smazáno ${r.purged} vypršelých kupónů.` : "Žádný kupón k smazání — všechny jsou platné.");
    load();
  }

  async function createGiftProduct() {
    try {
      const r = await api<{ name: string }>("/admin/vouchers/product", { method: "POST", body: JSON.stringify({ amount: giftAmount }) });
      toast(`Produkt „${r.name}“ je v katalogu. Zákazník ho koupí jako běžné zboží.`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Poukaz se nepodařilo založit.", "err");
    }
  }

  async function issueManual(e: FormEvent) {
    e.preventDefault();
    try {
      const r = await api<{ code: string; sent: number }>("/admin/vouchers", { method: "POST", body: JSON.stringify(manual) });
      toast(r.sent ? `Poukaz ${r.code} odeslán na ${manual.email}.` : `Poukaz ${r.code} vytvořen (e-mail se nepodařilo odeslat).`, r.sent ? "ok" : "err");
      setManual({ amount: 500, email: "", recipient_name: "", message: "", months: 12 });
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Poukaz se nepodařilo vystavit.", "err");
    }
  }

  async function resend(v: VoucherRow) {
    try {
      const r = await api<{ sent: number }>("/admin/vouchers/send", { method: "POST", body: JSON.stringify({ voucher_id: v.id }) });
      toast(r.sent ? "Poukaz odeslán e-mailem." : "E-mail se nepodařilo odeslat — zkontrolujte nastavení Resend.", r.sent ? "ok" : "err");
      load();
    } catch {
      toast("Odeslání selhalo.", "err");
    }
  }

  const expired = (c: CouponRow) => !!c.valid_to && new Date(String(c.valid_to).replace(" ", "T")) < new Date();

  return (
    <>
      <div className="toolbar">
        <h1>
          <IconTicket size={26} /> Kupóny a dárkové poukazy
        </h1>
        <div className="admin-tabs">
          <button type="button" className={`chip ${tab === "coupons" ? "on" : ""}`} onClick={() => setTab("coupons")}>
            <IconTicket size={15} /> Kupóny ({rows.length})
          </button>
          <button type="button" className={`chip ${tab === "vouchers" ? "on" : ""}`} onClick={() => setTab("vouchers")}>
            <IconGift size={15} /> Poukazy ({vouchers.length})
          </button>
        </div>
      </div>

      {tab === "coupons" ? (
        <>
          <p className="admin-lead">
            Kupón může mít platnost <b>od–do včetně času</b>. Když zapnete „Po vypršení automaticky smazat“, kupón po
            uplynutí platnosti sám zmizí ze seznamu (úklid proběhne při otevření této stránky nebo při pokusu o uplatnění).
          </p>

          <form className="admin-form admin-card" onSubmit={submit}>
            <h2 className="admin-form-title">
              {editId ? <IconPen size={18} /> : <IconPlus size={18} />} {editId ? `Upravit kupón ${form.code}` : "Nový kupón"}
            </h2>
            <label>
              Kód
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required placeholder="LETO25" />
            </label>
            <label>
              Typ slevy
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="percent">Procenta (%)</option>
                <option value="fixed">Pevná částka (Kč)</option>
              </select>
            </label>
            <label>
              Hodnota
              <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
            </label>
            <label>
              Minimální objednávka (Kč)
              <input type="number" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })} />
            </label>
            <label>
              Max. počet použití
              <input
                type="number"
                value={form.max_uses ?? ""}
                onChange={(e) => setForm({ ...form, max_uses: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="prázdné = bez omezení"
              />
            </label>
            <label>
              Platí od (datum a čas)
              <input type="datetime-local" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
            </label>
            <label>
              Platí do (datum a čas)
              <input type="datetime-local" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} />
            </label>
            <label className="full">
              Popis (uvidí ho zákazník v košíku)
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={!!form.auto_delete} onChange={(e) => setForm({ ...form, auto_delete: e.target.checked ? 1 : 0 })} />
              <span>
                <b>Po vypršení automaticky smazat</b>
                <small>Kupón se po datu „platí do“ sám odstraní z databáze.</small>
              </span>
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked ? 1 : 0 })} />
              <span>
                <b>Aktivní</b>
                <small>Vypnutý kupón nejde uplatnit, ale zůstává v seznamu.</small>
              </span>
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={!!form.requires_login} onChange={(e) => setForm({ ...form, requires_login: e.target.checked ? 1 : 0 })} />
              <span>
                <b>Jen pro přihlášené</b>
                <small>Host kupón neuplatní.</small>
              </span>
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={!!form.single_use} onChange={(e) => setForm({ ...form, single_use: e.target.checked ? 1 : 0 })} />
              <span>
                <b>Jen jednou na zákazníka</b>
                <small>Typicky sleva na první nákup.</small>
              </span>
            </label>
            <div className="full">
              <SaveButton state={saver.state} error={saver.error} type="submit" savedLabel={editId ? "Upraveno" : "Přidáno"}>
                {editId ? "Uložit změny" : "Přidat kupón"}
              </SaveButton>
              {editId && (
                <button type="button" className="btn-line btn-sm" style={{ marginTop: 8 }} onClick={reset}>
                  Zrušit úpravu
                </button>
              )}
            </div>
          </form>

          <div className="row-actions" style={{ margin: "16px 0" }}>
            <button type="button" className="btn-line btn-sm" onClick={() => void purge()}>
              <IconTrash size={15} /> Uklidit vypršelé kupóny
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kód</th>
                  <th>Sleva</th>
                  <th>Platnost</th>
                  <th>Použito</th>
                  <th>Stav</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td data-label="Kód">
                      <b>{c.code}</b>
                      {c.description ? <><br /><small>{c.description}</small></> : null}
                    </td>
                    <td data-label="Sleva">
                      {c.type === "percent" ? `${c.value} %` : czk(c.value)}
                      {c.min_order ? <><br /><small>od {czk(c.min_order)}</small></> : null}
                    </td>
                    <td data-label="Platnost">
                      {c.valid_from ? <>od {dateCs(c.valid_from)}<br /></> : null}
                      {c.valid_to ? <>do {dateCs(c.valid_to)}</> : <small>bez omezení</small>}
                      {c.auto_delete ? <><br /><small className="admin-flag">⏱ smaže se sám</small></> : null}
                    </td>
                    <td data-label="Použito">{c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ""}</td>
                    <td data-label="Stav">
                      <span className={`tag ${expired(c) ? "cancelled" : c.active ? "paid" : ""}`}>
                        {expired(c) ? "vypršel" : c.active ? "aktivní" : "vypnutý"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="chip" onClick={() => edit(c)}>
                          <IconPen size={14} /> Upravit
                        </button>
                        <button type="button" className="chip danger" onClick={() => void remove(c)}>
                          <IconTrash size={14} /> Smazat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={6} style={{ color: "var(--muted)" }}>Zatím žádný kupón.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <p className="admin-lead">
            Dárkový poukaz je <b>produkt v katalogu</b>. Zákazník ho koupí jako běžné zboží, po zaplacení mu na e-mail
            dorazí kód a poukaz uvidí i ve svém účtu v sekci „Dárkové poukazy“. Kód funguje v košíku jako slevový kupón.
          </p>

          <div className="admin-split">
            <div className="admin-card">
              <h2 className="admin-form-title">
                <IconPlus size={18} /> Poukaz do katalogu
              </h2>
              <p className="admin-hint">Založí produkt „Dárkový poukaz“ na zvolenou hodnotu, který si zákazníci koupí sami.</p>
              <div className="row-actions">
                <input type="number" value={giftAmount} min={100} step={100} onChange={(e) => setGiftAmount(Number(e.target.value))} style={{ width: 120 }} />
                <span>Kč</span>
                <button type="button" className="btn-dark btn-sm" onClick={() => void createGiftProduct()}>
                  <IconGift size={15} /> Vytvořit produkt
                </button>
              </div>
              <div className="row-actions" style={{ marginTop: 10 }}>
                {[500, 1000, 2000].map((a) => (
                  <button key={a} type="button" className="chip" onClick={() => setGiftAmount(a)}>
                    {a} Kč
                  </button>
                ))}
              </div>
            </div>

            <form className="admin-card" onSubmit={issueManual}>
              <h2 className="admin-form-title">
                <IconMail size={18} /> Vystavit poukaz ručně
              </h2>
              <p className="admin-hint">Například jako omluvu nebo dárek. Kód odejde e-mailem hned po uložení.</p>
              <div className="admin-form" style={{ padding: 0, border: 0, background: "transparent" }}>
                <label>
                  Hodnota (Kč)
                  <input type="number" value={manual.amount} onChange={(e) => setManual({ ...manual, amount: Number(e.target.value) })} required />
                </label>
                <label>
                  Platnost (měsíců)
                  <input type="number" value={manual.months} onChange={(e) => setManual({ ...manual, months: Number(e.target.value) })} />
                </label>
                <label className="full">
                  E-mail příjemce
                  <input type="email" value={manual.email} onChange={(e) => setManual({ ...manual, email: e.target.value })} required />
                </label>
                <label className="full">
                  Jméno příjemce
                  <input value={manual.recipient_name} onChange={(e) => setManual({ ...manual, recipient_name: e.target.value })} />
                </label>
                <label className="full">
                  Vzkaz v e-mailu
                  <textarea rows={2} value={manual.message} onChange={(e) => setManual({ ...manual, message: e.target.value })} />
                </label>
                <div className="full">
                  <button className="btn-dark" type="submit">
                    <IconGift size={16} /> Vystavit a odeslat
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="table-wrap" style={{ marginTop: 18 }}>
            <table>
              <thead>
                <tr>
                  <th>Kód</th>
                  <th>Hodnota</th>
                  <th>Objednávka</th>
                  <th>Příjemce</th>
                  <th>Stav</th>
                  <th>Platnost</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => (
                  <tr key={v.id}>
                    <td data-label="Kód"><code>{v.code}</code></td>
                    <td data-label="Hodnota">{czk(v.amount)}</td>
                    <td data-label="Objednávka">{v.order_number || "—"}</td>
                    <td data-label="Příjemce">{v.recipient_email || v.buyer_email}</td>
                    <td data-label="Stav">
                      <span className={`tag ${v.used_count > 0 ? "cancelled" : v.status === "sent" ? "paid" : "new"}`}>
                        {v.used_count > 0 ? "uplatněno" : v.status === "sent" ? "odesláno" : "čeká na platbu"}
                      </span>
                    </td>
                    <td data-label="Platnost">{v.valid_to ? dateCs(v.valid_to) : "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button type="button" className="chip" onClick={() => void resend(v)}>
                          <IconMail size={14} /> Poslat znovu
                        </button>
                        <button
                          type="button"
                          className="chip danger"
                          onClick={() => {
                            if (!confirm("Smazat poukaz i jeho slevový kód?")) return;
                            void api(`/admin/vouchers/${v.id}`, { method: "DELETE" }).then(() => { toast("Poukaz smazán."); load(); });
                          }}
                        >
                          <IconTrash size={14} /> Smazat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!vouchers.length && <tr><td colSpan={7} style={{ color: "var(--muted)" }}>Zatím nikdo poukaz nekoupil.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function Reviews() {
  const [rows, setRows] = useState<{ id: number; rating: number; title: string; comment: string; approved: number; user_name: string; product_name: string }[]>([]);
  const load = () => void api<typeof rows>("/admin/reviews").then(setRows);
  useEffect(() => { load(); }, []);
  return (
    <>
      <h1>Hodnocení</h1>
      {rows.map((r) => (
        <article key={r.id} className="review">
          <b>{r.product_name}</b> · {r.user_name} · {r.rating}/5 {r.approved ? "· zveřejněno" : "· čeká"}
          <p>{r.title} — {r.comment}</p>
          <div className="row-actions">
            <button className="chip" onClick={() => void api(`/admin/reviews/${r.id}`, { method: "PATCH", body: JSON.stringify({ approved: r.approved ? 0 : 1 }) }).then(load)}>
              {r.approved ? "Skrýt" : "Schválit"}
            </button>
            <button className="linkish" onClick={() => void api(`/admin/reviews/${r.id}`, { method: "DELETE" }).then(load)}>Smazat</button>
          </div>
        </article>
      ))}
    </>
  );
}

function Shipping() {
  const [rows, setRows] = useState<{ id: number; code: string; name: string; description: string; price: number; free_over: number | null; kind: string; active: number; sort_order: number; eta: string }[]>([]);
  const load = () => void api<typeof rows>("/admin/shipping").then(setRows);
  useEffect(() => { load(); }, []);
  return (
    <>
      <h1>Doprava</h1>
      <p>Druh (kind): <code>pickup_zbox</code>, <code>pickup_zasilkovna</code>, <code>pickup_balikovna</code>, <code>address</code>, <code>store</code>.</p>
      {rows.map((s) => (
        <form key={s.id} className="admin-form" onSubmit={(e) => { e.preventDefault(); void api(`/admin/shipping/${s.id}`, { method: "PUT", body: JSON.stringify(s) }).then(load); }}>
          <label>Název<input value={s.name} onChange={(e) => setRows(rows.map((x) => x.id === s.id ? { ...x, name: e.target.value } : x))} /></label>
          <label>Cena<input type="number" value={s.price} onChange={(e) => setRows(rows.map((x) => x.id === s.id ? { ...x, price: Number(e.target.value) } : x))} /></label>
          <label>Zdarma od<input type="number" value={s.free_over ?? ""} onChange={(e) => setRows(rows.map((x) => x.id === s.id ? { ...x, free_over: e.target.value === "" ? null : Number(e.target.value) } : x))} /></label>
          <label>Druh<input value={s.kind} onChange={(e) => setRows(rows.map((x) => x.id === s.id ? { ...x, kind: e.target.value } : x))} /></label>
          <label>Termín<input value={s.eta} onChange={(e) => setRows(rows.map((x) => x.id === s.id ? { ...x, eta: e.target.value } : x))} /></label>
          <label><input type="checkbox" checked={!!s.active} onChange={(e) => setRows(rows.map((x) => x.id === s.id ? { ...x, active: e.target.checked ? 1 : 0 } : x))} /> Aktivní</label>
          <button className="btn-dark">Uložit</button>
        </form>
      ))}
    </>
  );
}

function Payments() {
  const [rows, setRows] = useState<{ id: number; code: string; name: string; description: string; fee: number; active: number; allowed_shipping: string; sort_order: number }[]>([]);
  const load = () => void api<typeof rows>("/admin/payments").then(setRows);
  useEffect(() => { load(); }, []);
  return (
    <>
      <h1>Platby</h1>
      {rows.map((p) => (
        <form key={p.id} className="admin-form" onSubmit={(e) => { e.preventDefault(); void api(`/admin/payments/${p.id}`, { method: "PUT", body: JSON.stringify(p) }).then(load); }}>
          <label>Název<input value={p.name} onChange={(e) => setRows(rows.map((x) => x.id === p.id ? { ...x, name: e.target.value } : x))} /></label>
          <label>Poplatek<input type="number" value={p.fee} onChange={(e) => setRows(rows.map((x) => x.id === p.id ? { ...x, fee: Number(e.target.value) } : x))} /></label>
          <label className="full">Povolené dopravy (* = všechny)<input value={p.allowed_shipping} onChange={(e) => setRows(rows.map((x) => x.id === p.id ? { ...x, allowed_shipping: e.target.value } : x))} /></label>
          <label className="full">Popis<textarea value={p.description} onChange={(e) => setRows(rows.map((x) => x.id === p.id ? { ...x, description: e.target.value } : x))} /></label>
          <label><input type="checkbox" checked={!!p.active} onChange={(e) => setRows(rows.map((x) => x.id === p.id ? { ...x, active: e.target.checked ? 1 : 0 } : x))} /> Aktivní</label>
          {p.code === "card" && (
            <p className="full" style={{ fontSize: 13, color: "var(--muted)" }}>
              Karta online se zákazníkům nabízí jen s vyplněnou platební bránou — nastavte <code>comgate_merchant</code> v{" "}
              <Link to="/admin/nastaveni">Nastavení</Link>. Bez brány zůstává metoda skrytá.
            </p>
          )}
          <button className="btn-dark">Uložit</button>
        </form>
      ))}
    </>
  );
}

function Points() {
  const empty = { carrier: "zasilkovna", type: "zbox", name: "", address: "", city: "", zip: "", lat: 50.08, lng: 14.43, opening_hours: "nonstop", active: 1 };
  const [rows, setRows] = useState<(typeof empty & { id: number })[]>([]);
  const [form, setForm] = useState(empty);
  const load = () => void api<typeof rows>("/admin/pickup-points").then(setRows);
  useEffect(() => { load(); }, []);
  return (
    <>
      <h1>Výdejní místa</h1>
      <p>
        Záložní mapa a ručně přidaná místa. Na pokladně se nejdřív otevře živá mapa Packety / Balíkovny; vybrané místo se
        sem uloží samo.
      </p>
      <form className="admin-form" onSubmit={(e) => { e.preventDefault(); void api("/admin/pickup-points", { method: "POST", body: JSON.stringify(form) }).then(() => { setForm(empty); load(); }); }}>
        <label>Název<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label>Typ
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="zbox">Z-BOX</option>
            <option value="branch">Zásilkovna</option>
            <option value="balikovna">Balíkovna</option>
          </select>
        </label>
        <label>Ulice<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></label>
        <label>Město<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required /></label>
        <label>PSČ<input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></label>
        <label>Zem. šířka<input type="number" step="0.0001" value={form.lat} onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })} /></label>
        <label>Zem. délka<input type="number" step="0.0001" value={form.lng} onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })} /></label>
        <label>Otevírací doba<input value={form.opening_hours} onChange={(e) => setForm({ ...form, opening_hours: e.target.value })} /></label>
        <button className="btn-dark">Přidat místo</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Název</th><th>Typ</th><th>Adresa</th><th></th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.type}</td>
                <td>{p.address}, {p.zip} {p.city}</td>
                <td><button className="linkish" onClick={() => void api(`/admin/pickup-points/${p.id}`, { method: "DELETE" }).then(load)}>Smazat</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ClaimsAdmin() {
  const { toast } = useStore();
  const [rows, setRows] = useState<{ id: number; order_number: string; email: string; reason: string; description: string; status: string; admin_note: string; created_at: string; user_name: string }[]>([]);
  const load = () => void api<typeof rows>("/admin/claims").then(setRows);
  useEffect(() => { load(); }, []);
  async function upd(id: number, status: string) { await api(`/admin/claims/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }); toast("Uloženo."); load(); }
  return (<><h1>Reklamace</h1><div className="table-wrap"><table><thead><tr><th>Objednávka</th><th>Důvod</th><th>Stav</th><th></th></tr></thead><tbody>{rows.map(r=> <tr key={r.id}><td>{r.order_number || "—"}<br/><small>{r.email}</small></td><td><b>{r.reason}</b><br/><small>{r.description.slice(0,80)}</small></td><td><span className="tag">{r.status}</span></td><td className="row-actions"><select value={r.status} onChange={e=> void upd(r.id, e.target.value)}><option value="new">Nová</option><option value="processing">Vyřizuje se</option><option value="approved">Uznána</option><option value="rejected">Zamítnuta</option><option value="closed">Uzavřena</option></select></td></tr>)}</tbody></table></div></>);
}

function NavbarSettings() {
  const saver = useSaver();
  const { toast, refresh } = useStore();
  const [items, setItems] = useState<{ label: string; to: string; end: boolean }[]>([
    { label: "Domů", to: "/", end: true },
    { label: "Katalog", to: "/katalog", end: false },
    { label: "Doprava a platba", to: "/doprava-a-platba", end: false },
    { label: "O ateliéru", to: "/o-nas", end: false },
    { label: "Sledování", to: "/sledovani", end: false },
  ]);
  const [logoTitle, setLogoTitle] = useState("KAVKA");
  const [logoSub, setLogoSub] = useState("ateliér");
  const [logoSvg, setLogoSvg] = useState("");
  const [navPages, setNavPages] = useState<Page[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void api<Record<string, string>>("/admin/settings").then((s) => {
      try {
        const raw = s.navbar_items;
        if (raw) {
          const parsed = JSON.parse(raw) as { label: string; to: string; end?: boolean }[];
          if (Array.isArray(parsed) && parsed.length) {
            setItems(parsed.filter((i) => i && i.label && i.to).map((i) => ({ label: i.label, to: i.to, end: !!i.end })));
          }
        }
      } catch {}
      if (s.logo_title) setLogoTitle(s.logo_title);
      if (s.logo_subtext) setLogoSub(s.logo_subtext);
      if (s.logo_svg) setLogoSvg(s.logo_svg);
      setLoaded(true);
    });
    void api<Page[]>("/admin/pages").then(setNavPages);
  }, []);

  function move(i: number, dir: number) {
    setItems((prev) => {
      const to = i + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = prev.slice();
      const [it] = next.splice(i, 1);
      next.splice(to, 0, it);
      return next;
    });
  }

  async function save() {
    await saver.run(async () => {
      await api("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ navbar_items: JSON.stringify(items), logo_title: logoTitle, logo_subtext: logoSub, logo_svg: logoSvg }),
      });
      await refresh();
    }, "Menu a logo uloženy.");
  }

  async function patchPage(p: Page, body: Record<string, unknown>) {
    await api(`/admin/pages/${p.id}`, { method: "PATCH", body: JSON.stringify(body) });
    setNavPages((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...body } : x)));
    toast("Uloženo.");
  }

  if (!loaded) return <p>Načítám…</p>;

  return (
    <>
      <h1>Navbar a logo</h1>
      <p style={{ color: "var(--muted)" }}>
        Zde upravíte položky hlavního menu a textové logo v hlavičce. Pořadí měňte šipkami. Pokud pole necháte
        prázdné pro navbar, použije se výchozí menu.
      </p>

      <div className="admin-form" style={{ gridTemplateColumns: "1fr" }}>
        <label className="full">Logo – hlavní text
          <input value={logoTitle} onChange={(e) => setLogoTitle(e.target.value)} />
        </label>
        <label className="full">Logo – podtext
          <input value={logoSub} onChange={(e) => setLogoSub(e.target.value)} />
        </label>
        <label className="full">Vlastní SVG loga (volitelně, místo výchozí ikony)
          <textarea rows={3} value={logoSvg} onChange={(e) => setLogoSvg(e.target.value)} placeholder="<svg …>…</svg>" />
        </label>
      </div>

      <div className="table-wrap" style={{ marginBottom: 18 }}>
        <table>
          <thead><tr><th>Pořadí</th><th>Popisek</th><th>Odkaz</th><th></th></tr></thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td><button className="chip" onClick={() => move(i, -1)}>↑</button> <button className="chip" onClick={() => move(i, 1)}>↓</button></td>
                <td><input style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px" }} value={it.label} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} /></td>
                <td><input style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px" }} value={it.to} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} /></td>
                <td><button className="linkish" onClick={() => setItems(items.filter((_, j) => j !== i))}>Smazat</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: 12 }}>
          <button
            className="pb-add"
            onClick={() => setItems((prev) => [...prev, { label: "Nový odkaz", to: "/", end: false }])}
          >
            + Přidat položku menu
          </button>
        </div>
      </div>

      <div className="admin-sticky-save">
        <SaveButton state={saver.state} error={saver.error} onClick={() => void save()}>
          Uložit menu a logo
        </SaveButton>
      </div>

      <h2 style={{ marginTop: 28, fontSize: 22 }}>Stránky v menu</h2>
      <p style={{ color: "var(--muted)" }}>
        Přepnutím „v menu“ u stránky ji přidáte do hlavního menu (řadí se podle pořadí).
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Stránka</th><th>V menu</th><th>Popisek</th><th>Pořadí</th></tr></thead>
          <tbody>
            {navPages.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/admin/stranky/${p.id}`}>{p.title}</Link></td>
                <td><input type="checkbox" checked={!!p.in_nav} onChange={(e) => void patchPage(p, { in_nav: e.target.checked ? 1 : 0 })} /></td>
                <td><input style={{ border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px" }} value={p.nav_label || ""} placeholder={p.title} onChange={(e) => void patchPage(p, { nav_label: e.target.value })} /></td>
                <td><input type="number" style={{ width: 70, border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px" }} value={p.nav_order} onChange={(e) => void patchPage(p, { nav_order: Number(e.target.value) })} /></td>
              </tr>
            ))}
            {!navPages.length && <tr><td colSpan={4} style={{ color: "var(--muted)" }}>Zatím žádné stránky.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CarouselSettings() {
  const { toast, refresh } = useStore();
  const saver = useSaver();
  type Slide = { kicker: string; title: string; text: string; cta: string; to: string; image: string; accent: boolean };
  const empty = (): Slide => ({ kicker: "", title: "", text: "", cta: "Zobrazit", to: "/katalog", image: "", accent: false });
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<number | null>(0);
  const [preview, setPreview] = useState(0);

  useEffect(() => {
    void api<Record<string, string>>("/admin/settings").then((s) => {
      try {
        const raw = s.hero_slides;
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Slide>[];
          if (Array.isArray(parsed)) {
            setSlides(
              parsed
                .filter((x) => x && typeof x === "object")
                .map((x) => ({
                  kicker: String(x.kicker || ""),
                  title: String(x.title || ""),
                  text: String(x.text || ""),
                  cta: String(x.cta || ""),
                  to: String(x.to || "/katalog"),
                  image: String(x.image || ""),
                  accent: !!x.accent,
                }))
            );
          }
        }
      } catch {
        /* poškozený JSON — necháme prázdný seznam */
      }
      setLoaded(true);
    });
  }, []);

  function patch(i: number, k: keyof Slide, v: string | boolean) {
    setSlides((prev) => prev.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  }

  function move(i: number, dir: number) {
    setSlides((prev) => {
      const to = i + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = prev.slice();
      const [it] = next.splice(i, 1);
      next.splice(to, 0, it);
      return next;
    });
    setOpen(i + dir);
    setPreview(i + dir);
  }

  function duplicate(i: number) {
    setSlides((prev) => {
      const next = prev.slice();
      next.splice(i + 1, 0, { ...prev[i] });
      return next;
    });
    toast("Slide zduplikován.");
  }

  async function toWebp(file: File): Promise<File> {
    if (file.type === "image/webp") return file;
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0);
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/webp", 0.82));
      if (!blob) return file;
      return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
    } catch {
      return file;
    }
  }

  async function upload(i: number, file: File) {
    const webp = await toWebp(file);
    const fd = new FormData();
    fd.append("file", webp);
    try {
      const r = await api<{ url: string }>("/admin/upload", { method: "POST", body: fd });
      patch(i, "image", r.url);
      toast("Obrázek nahrán.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Nahrání selhalo. Máte připojené R2?", "err");
    }
  }

  async function save() {
    await saver.run(async () => {
      await api("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          hero_slides: JSON.stringify(slides.filter((s) => s.title || s.text || s.image)),
        }),
      });
      await refresh();
    }, "Carousel uložen — na úvodní stránce se projeví ihned.");
  }

  if (!loaded) return <p>Načítám…</p>;

  const shown = slides.length ? slides[Math.min(preview, slides.length - 1)] : null;

  return (
    <>
      <div className="toolbar">
        <h1>
          <IconSlides size={26} /> Carousel na úvodní stránce
        </h1>
        <div className="row-actions">
          <a className="btn-line btn-sm" href="/" target="_blank" rel="noreferrer">
            Otevřít web
          </a>
        </div>
      </div>
      <p className="admin-lead">
        Slidy se ukládají do nastavení a na úvodní stránce se objeví ihned po uložení. Když seznam necháte prázdný,
        zobrazí se výchozí obsah (hlavní nadpis z nastavení a doporučený produkt). Náhled dole ukazuje <b>rozpracovanou
        podobu</b>, ještě než ji uložíte.
      </p>

      {/* Živý náhled slidu */}
      {shown && (
        <div className="admin-preview">
          <span className="admin-preview-label">Živý náhled (neuložené změny)</span>
          <div className={`carousel-preview${shown.accent ? " accent" : ""}`}>
            <div className="carousel-preview-copy">
              {shown.kicker && <span className="kicker">{shown.kicker}</span>}
              <h3>{shown.title || "Nadpis slidu"}</h3>
              <p>{shown.text || "Krátký popis, který se ukáže pod nadpisem."}</p>
              <span className="carousel-preview-cta">{shown.cta || "Zobrazit"} →</span>
            </div>
            {shown.image ? (
              <div className="carousel-preview-img">
                <img src={shown.image} alt="" />
              </div>
            ) : (
              <div className="carousel-preview-img empty">bez obrázku</div>
            )}
          </div>
          {slides.length > 1 && (
            <div className="carousel-preview-dots">
              {slides.map((_, i) => (
                <button key={i} type="button" className={i === preview ? "on" : ""} onClick={() => setPreview(i)} aria-label={`Náhled slidu ${i + 1}`} />
              ))}
            </div>
          )}
        </div>
      )}

      {slides.map((s, i) => (
        <div className={`slide-editor${open === i ? " open" : ""}`} key={i}>
          <div className="slide-editor-head">
            <button
              type="button"
              className="slide-editor-toggle"
              onClick={() => { setOpen(open === i ? null : i); setPreview(i); }}
              aria-expanded={open === i}
            >
              <span className="slide-editor-num">{i + 1}</span>
              <span className="slide-editor-name">
                <b>{s.title || "Nový slide"}</b>
                <small>{s.kicker || s.to}</small>
              </span>
              {s.image && <img className="slide-editor-thumb" src={s.image} alt="" />}
              <span className="slide-editor-caret">{open === i ? "▲" : "▼"}</span>
            </button>
            <span className="row-actions">
              <button type="button" className="chip" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Posunout nahoru">↑</button>
              <button type="button" className="chip" onClick={() => move(i, 1)} disabled={i === slides.length - 1} aria-label="Posunout dolů">↓</button>
              <button type="button" className="chip" onClick={() => duplicate(i)} aria-label="Duplikovat">
                <IconCopy size={14} />
              </button>
              <button
                type="button"
                className="chip danger"
                onClick={() => {
                  if (!confirm("Opravdu smazat tento slide?")) return;
                  setSlides((prev) => prev.filter((_, j) => j !== i));
                  setOpen(null);
                  setPreview(0);
                }}
              >
                <IconTrash size={14} /> Smazat
              </button>
            </span>
          </div>

          {open === i && (
            <div className="admin-form slide-editor-body">
              <label>
                Štítek nad nadpisem
                <input value={s.kicker} onChange={(e) => patch(i, "kicker", e.target.value)} placeholder="např. ATELIÉR KAVKA" />
              </label>
              <label>
                Nadpis
                <input value={s.title} onChange={(e) => patch(i, "title", e.target.value)} placeholder="Domov, který dýchá pomalu" />
              </label>
              <label className="full">
                Text
                <textarea rows={2} value={s.text} onChange={(e) => patch(i, "text", e.target.value)} />
              </label>
              <label>
                Text tlačítka
                <input value={s.cta} onChange={(e) => patch(i, "cta", e.target.value)} placeholder="Procházet katalog" />
              </label>
              <label>
                Odkaz tlačítka
                <input value={s.to} onChange={(e) => patch(i, "to", e.target.value)} placeholder="/katalog" />
              </label>
              <label className="full">
                URL obrázku
                <input value={s.image} onChange={(e) => patch(i, "image", e.target.value)} placeholder="/hero.webp" />
              </label>
              <label className="full">
                Nahrát obrázek (uloží se do R2 jako webp)
                <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void upload(i, e.target.files[0])} />
              </label>
              <label className="admin-check full">
                <input type="checkbox" checked={s.accent} onChange={(e) => patch(i, "accent", e.target.checked)} />
                <span>
                  <b>Tmavý (akcentní) slide</b>
                  <small>Slide dostane tmavé pozadí a světlý text.</small>
                </span>
              </label>
            </div>
          )}
        </div>
      ))}

      <button
        className="pb-add"
        style={{ width: "100%", marginBottom: 16 }}
        onClick={() => {
          setSlides((prev) => [...prev, empty()]);
          setOpen(slides.length);
          setPreview(slides.length);
        }}
      >
        + Přidat slide
      </button>

      <div className="admin-sticky-save">
        <SaveButton state={saver.state} error={saver.error} onClick={() => void save()}>
          Uložit carousel
        </SaveButton>
      </div>
    </>
  );
}

function AppearanceSettings() {
  const { toast, refresh, settings: saved } = useStore();
  const saver = useSaver();
  const [form, setForm] = useState<Record<string, string>>(themeDefaults());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void api<Record<string, string>>("/admin/settings").then((s) => {
      setForm(readTheme(s));
      setLoaded(true);
    });
  }, []);

  // Živý náhled — každá změna se ihned aplikuje na stránku (i do náhledu níže).
  useEffect(() => {
    if (loaded) applyTheme(form);
  }, [form, loaded]);

  // Při odchodu z editoru vrátíme uložený vzhled (zahodí se neuložený náhled).
  useEffect(() => {
    return () => applyTheme(saved);
  }, [saved]);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    await saver.run(async () => {
      await api("/admin/settings", { method: "PUT", body: JSON.stringify(form) });
      await refresh();
    }, "Vzhled uložen — na veřejném webu platí ihned.");
  }

  if (!loaded) return <p>Načítám…</p>;

  return (
    <>
      <h1>Vzhled e-shopu</h1>
      <p style={{ color: "var(--muted)", marginBottom: 4 }}>
        Barvy pozadí a webu, zaoblení, intenzita stínů a animace načítacích tlačítek. Změny se hned promítají do náhledu
        níže, po uložení platí na celém e-shopu.
      </p>

      <div className="appearance-grid">
        <section className="appearance-panel" aria-label="Barvy">
          <h2>Barvy</h2>
          {THEME_VARS.map((v) => (
            <label className="color-field" key={v.key}>
              <span>{v.label}</span>
              <span className="color-input">
                <code>{toHex(form[v.key], v.def)}</code>
                <input
                  type="color"
                  value={toHex(form[v.key], v.def)}
                  aria-label={v.label}
                  onChange={(e) => set(v.key, e.target.value)}
                />
              </span>
            </label>
          ))}
        </section>

        <section className="appearance-panel" aria-label="Animace načítacích tlačítek">
          <h2>Animace načítacích tlačítek</h2>
          <div className="anim-options" role="radiogroup" aria-label="Animace spinneru v tlačítkách">
            {BTN_ANIMS.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={form.theme_btn_anim === a}
                className={`anim-option${form.theme_btn_anim === a ? " on" : ""}`}
                onClick={() => set("theme_btn_anim", a)}
              >
                <span className={`anim-demo anim-demo-${a}`} aria-hidden="true">
                  <i />
                </span>
                <span>{ANIM_LABELS[a]}</span>
              </button>
            ))}
          </div>
          <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.5, margin: "14px 0 0" }}>
            Tato animace se ukazuje v tlačítkách, která načítají (např. „Do košíku“), dokud se akce nedokončí.
          </p>
        </section>

        <section className="appearance-panel" aria-label="Zaoblení a stíny">
          <h2>Zaoblení a stíny</h2>
          <label className="range-field">
            <span>
              Zaoblení rohů <output>{Number(form.theme_radius) || 0} px</output>
            </span>
            <input
              type="range"
              min={0}
              max={40}
              step={1}
              value={Number(form.theme_radius) || 0}
              onChange={(e) => set("theme_radius", e.target.value)}
            />
          </label>
          <label className="range-field">
            <span>
              Intenzita stínů <output>{Math.round((Number(form.theme_shadow) || 0) * 100)} %</output>
            </span>
            <input
              type="range"
              min={0}
              max={0.25}
              step={0.005}
              value={Number(form.theme_shadow) || 0}
              onChange={(e) => set("theme_shadow", e.target.value)}
            />
          </label>
        </section>
      </div>

      <section className="appearance-preview" aria-label="Náhled vzhledu">
        <h2>Náhled</h2>
        <div className="preview-card">
          <div className="preview-media">KAVKA</div>
          <div className="preview-body">
            <span className="preview-badge">Akce</span>
            <h3>Keramický hrnek</h3>
            <p>Ručně točená kamenina z ateliéru.</p>
            <div className="preview-demo">
              <button type="button" className="btn">
                <span className="btn-spinner" aria-hidden="true" />
                Přidává se…
              </button>
              <button type="button" className="btn-line">
                <span className="btn-spinner" aria-hidden="true" />
                Vkládám…
              </button>
            </div>
          </div>
          <div className="preview-footer">Patička e-shopu · KAVKA Ateliér</div>
        </div>
      </section>

      <div className="admin-sticky-save">
        <SaveButton state={saver.state} error={saver.error} onClick={() => void save()}>
          Uložit vzhled
        </SaveButton>
        <button className="btn-line btn-sm" type="button" onClick={() => setForm(themeDefaults())}>
          Obnovit výchozí
        </button>
      </div>
    </>
  );
}

/* ============================================================
   Magazín (blog) — psaní článků pro organickou návštěvnost
   ============================================================ */
type AdminPost = {
  id: number; title: string; slug: string; perex: string; body?: string; cover: string;
  author: string; tags: string; meta_title?: string; meta_description?: string;
  published: number; published_at: string; updated_at?: string;
};

function Posts() {
  const { toast } = useStore();
  const [rows, setRows] = useState<AdminPost[]>([]);
  const load = () => void api<AdminPost[]>("/admin/posts").then(setRows);
  useEffect(() => { load(); }, []);

  async function remove(p: AdminPost) {
    if (!confirm(`Smazat článek „${p.title}“?`)) return;
    await api(`/admin/posts/${p.id}`, { method: "DELETE" });
    toast("Článek smazán.");
    load();
  }

  async function togglePublish(p: AdminPost) {
    await api(`/admin/posts/${p.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...p, published: p.published ? 0 : 1 }),
    });
    load();
  }

  return (
    <>
      <div className="toolbar">
        <h1>Magazín</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="btn-line btn-sm" href="/magazin" target="_blank" rel="noreferrer">Zobrazit na webu</a>
          <Link className="btn" to="/admin/magazin/novy">Nový článek</Link>
        </div>
      </div>
      <p style={{ color: "var(--muted)" }}>
        Články pomáhají e-shopu růst ve vyhledávačích. Každý článek dostane vlastní SEO titulek, popis, drobečkovou
        navigaci a strukturovaná data (Article) — Google je tak umí zobrazit s datem i autorem.
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Název</th><th>URL</th><th>Štítky</th><th>Vyšlo</th><th>Stav</th><th></th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td data-label="Název"><Link to={`/admin/magazin/${p.id}`}>{p.title}</Link></td>
                <td data-label="URL"><small>/magazin/{p.slug}</small></td>
                <td data-label="Štítky"><small>{p.tags}</small></td>
                <td data-label="Vyšlo">{dateCs(p.published_at)}</td>
                <td data-label="Stav">
                  <button className={`chip ${p.published ? "on" : ""}`} onClick={() => void togglePublish(p)}>
                    {p.published ? "Publikováno" : "Koncept"}
                  </button>
                </td>
                <td><button className="linkish" onClick={() => void remove(p)}>Smazat</button></td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={6}>Zatím žádné články. Začněte tlačítkem „Nový článek“.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PostForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const { toast } = useStore();
  const [form, setForm] = useState({
    title: "", slug: "", perex: "", body: "", cover: "", author: "", tags: "",
    meta_title: "", meta_description: "", published: 1, published_at: "",
  });

  useEffect(() => {
    if (!id) return;
    void api<{ post: AdminPost }>(`/admin/posts/${id}`).then(({ post }) => {
      setForm({
        title: post.title, slug: post.slug, perex: post.perex, body: post.body || "", cover: post.cover,
        author: post.author, tags: post.tags, meta_title: post.meta_title || "",
        meta_description: post.meta_description || "", published: post.published,
        published_at: (post.published_at || "").slice(0, 10),
      });
    });
  }, [id]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function upload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await api<{ url: string }>("/admin/upload", { method: "POST", body: fd });
      set("cover", r.url);
      toast("Titulní fotka nahrána.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Nahrání selhalo. Máte připojené R2?", "err");
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      if (id) {
        await api(`/admin/posts/${id}`, { method: "PUT", body: JSON.stringify(form) });
        toast("Uloženo.");
      } else {
        const r = await api<{ id: number }>("/admin/posts", { method: "POST", body: JSON.stringify(form) });
        nav(`/admin/magazin/${r.id}`);
      }
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Uložení selhalo.", "err");
    }
  }

  return (
    <>
      <div className="toolbar">
        <h1>{id ? "Upravit článek" : "Nový článek"}</h1>
        {id && form.slug && (
          <a className="btn-line btn-sm" href={`/magazin/${form.slug}`} target="_blank" rel="noreferrer">Náhled</a>
        )}
      </div>
      <form className="admin-form" onSubmit={save}>
        <label className="full">Název<input value={form.title} onChange={(e) => set("title", e.target.value)} required /></label>
        <label>URL (slug)<input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="doplní se samo" /></label>
        <label>Autor<input value={form.author} onChange={(e) => set("author", e.target.value)} /></label>
        <label>Štítky (oddělte čárkou)<input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="keramika,péče" /></label>
        <label>Datum vydání<input type="date" value={form.published_at} onChange={(e) => set("published_at", e.target.value)} /></label>
        <label>Titulní fotka (URL)<input value={form.cover} onChange={(e) => set("cover", e.target.value)} /></label>
        <label>Nahrát fotku<input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} /></label>
        <label className="full">
          Perex (krátké shrnutí — použije se ve výpisu a v náhledu odkazu)
          <textarea rows={2} value={form.perex} onChange={(e) => set("perex", e.target.value)} />
        </label>
        <label className="full">
          Text článku (HTML: &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;a&gt;)
          <textarea rows={16} value={form.body} onChange={(e) => set("body", e.target.value)} />
        </label>
        <label className="full">SEO titulek<input value={form.meta_title} onChange={(e) => set("meta_title", e.target.value)} placeholder="Nechte prázdné = použije se název" /></label>
        <label className="full">SEO popis<textarea rows={2} value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)} placeholder="Nechte prázdné = použije se perex" /></label>
        <label><input type="checkbox" checked={!!form.published} onChange={(e) => set("published", e.target.checked ? 1 : 0)} /> Publikovat</label>
        <div className="full row-actions">
          <button className="btn-dark" type="submit">Uložit</button>
          <Link className="btn-line" to="/admin/magazin">Zpět na seznam</Link>
        </div>
      </form>
    </>
  );
}

function SettingsPage() {
  const { refresh } = useStore();
  const saver = useSaver();
  const [form, setForm] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => { void api<Record<string, string>>("/admin/settings").then(setForm); }, []);

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    await saver.run(async () => {
      await api("/admin/settings", { method: "PUT", body: JSON.stringify(form) });
      await refresh();
    }, "Nastavení uloženo.");
  }
  const keys: [string, string][] = [
    ["store_name", "Zkrácený název obchodu (např. KAVKA)"],
    ["store_company", "Obchodní firma / Provozovatel (pro faktury a VOP)"],
    ["store_ico", "IČO provozovatele"],
    ["store_dic", "DIČ provozovatele"],
    ["store_vat_note", "Informace o DPH (např. Plátce DPH / Neplátce DPH)"],
    ["store_registry", "Zápis v obchodním / živnostenském rejstříku"],
    ["store_tagline", "Slogan obchodu"],
    ["hero_title", "Titulek na hlavní straně"],
    ["hero_text", "Text úvodu na hlavní straně"],
    ["home_badge", "Štítek nad hlavním titulkem"],
    ["home_hero_primary_cta", "Hlavní tlačítko úvodu"],
    ["home_hero_secondary_cta", "Druhé tlačítko úvodu"],
    ["home_coupon_title", "Titulek štítku s kupónem"],
    ["home_coupon_text", "Text u kupónu na hlavní straně"],
    ["home_categories_title", "Nadpis sekce kategorií"],
    ["home_category_fallback", "Výchozí popis kategorie"],
    ["home_category_cta", "Odkaz na kategorii"],
    ["home_featured_kicker", "Nadpis nad doporučenými produkty"],
    ["home_featured_title", "Nadpis doporučených produktů"],
    ["home_featured_text", "Popis sekce doporučených produktů"],
    ["home_featured_cta", "Odkaz na celý katalog"],
    ["home_trust_1_title", "Výhoda 1 — nadpis"],
    ["home_trust_1_text", "Výhoda 1 — text"],
    ["home_trust_2_title", "Výhoda 2 — nadpis"],
    ["home_trust_2_text", "Výhoda 2 — text"],
    ["home_trust_3_title", "Výhoda 3 — nadpis"],
    ["home_trust_3_text", "Výhoda 3 — text"],
    ["home_cta_title", "Závěrečná výzva — nadpis"],
    ["home_cta_subtitle", "Závěrečná výzva — druhý řádek"],
    ["home_cta_primary", "Závěrečná výzva — hlavní tlačítko"],
    ["home_cta_secondary", "Závěrečná výzva — druhé tlačítko"],
    ["store_email", "Oficiální kontaktní e-mail"],
    ["store_phone", "Oficiální telefon pro zákazníky"],
    ["store_address", "Sídlo a adresa ateliéru"],
    ["store_return_address", "Doručovací adresa pro vrácení zboží a reklamace"],
    ["store_hours", "Otevírací doba ateliéru"],
    ["iban", "IBAN pro QR platbu (SPD)"],
    ["bank_name", "Banka"],
    ["bank_account", "Číslo bankovního účtu"],
    ["reviews_auto_approve", "Automaticky schvalovat hodnocení zákazníků (1/0)"],
    ["invoice_auto", "Automaticky vystavovat faktury (1 = zapnuto, 0 = vypnuto)"],
    ["invoice_auto_on", "Kdy vystavit fakturu (order = při objednávce, paid = po zaplacení)"],
    ["invoice_prefix", "Předpona čísla faktury (např. FV)"],
    ["invoice_pad", "Počet číslic pořadového čísla faktury (např. 4)"],
    ["invoice_due_days", "Splatnost faktury ve dnech"],
    ["invoice_vat_payer", "Plátce DPH (1/0)"],
    ["invoice_vat_rate", "Sazba DPH v % (např. 21)"],
    ["invoice_currency", "Měna faktur (např. CZK)"],
    ["vendor_person", "Kontaktní osoba dodavatele systému KAVKA"],
    ["vendor_web", "Web pro objednání systému KAVKA"],
    ["vendor_phone", "Telefon pro objednání systému KAVKA"],
    ["gtm_id", "Google Tag Manager ID (GTM-XXXX)"],
    ["ga4_id", "Google Analytics 4 measurement ID (G-XXXX)"],
    ["meta_pixel_id", "Meta Pixel ID (pro reklamy na Facebooku / Instagramu)"],
    ["resend_api_key", "Resend API klíč pro odesílání e-mailů"],
    ["mail_from", "Odesílatel e-mailů (ověřená doména v Resend)"],
    ["mail_webhook", "Záložní webhook pro e-maily (pokud není Resend)"],
    ["store_url", "Veřejná URL e-shopu (pro odkazy v e-mailech a feedech)"],
    ["ceska_posta_api_key", "Česká pošta Podání online — API klíč / Basic"],
    ["ceska_posta_api_url", "Česká pošta API URL"],
    ["ppl_api_key", "PPL API klíč"],
    ["ppl_api_url", "PPL API URL"],
    ["dpd_api_key", "DPD API klíč"],
    ["dpd_api_url", "DPD API URL"],
    ["wallet_merchant_name", "Název obchodníka pro Apple Pay / Google Pay"],
    ["apple_pay_merchant_id", "Apple Pay merchant ID"],
    ["google_pay_merchant_id", "Google Pay merchant ID"],
    ["exit_coupon", "Kupón pro opouštěcí pop-up (výchozí STAY5)"],
    ["b2b_enabled", "Velkoobchodní režim B2B (1 = zapnutý, 0 = vypnutý)"],
    ["b2b_discount", "Plošná velkoobchodní sleva v % (u produktů bez vlastní ceny)"],
    ["b2b_note", "Věta o velkoobchodních cenách (zobrazí se v košíku a pokladně)"],
    ["blog_enabled", "Magazín / blog (1 = zapnutý, 0 = vypnutý)"],
    ["blog_title", "Název magazínu (nadpis a odkaz v menu)"],
    ["blog_perex", "Úvodní věta magazínu"],
    ["abandoned_enabled", "Připomínky opuštěného košíku (1/0)"],
    ["abandoned_stage1_hours", "1. připomínka opuštěného košíku — po kolika hodinách (např. 2)"],
    ["abandoned_stage2_hours", "2. připomínka opuštěného košíku — po kolika hodinách (např. 24)"],
    ["og_dynamic", "Dynamické náhledové obrázky pro sdílení (1 = generovat, 0 = fotka produktu)"],
  ];
  const help: Record<string, string> = {
    store_name: "Krátký název se zobrazuje v logu, titulcích, e-mailech a produktových feedech.",
    store_company: "Plný právní název provozovatele. Používá se na fakturách, v patičce a právních dokumentech.",
    store_ico: "Osmimístné IČO. Vyplňte přesně podle ARES; slouží k identifikaci podnikatele.",
    store_dic: "DIČ včetně prefixu CZ, pokud jste plátce DPH. U neplátce ponechte prázdné.",
    store_vat_note: "Text o režimu DPH, který zákazník uvidí u právních a fakturačních údajů.",
    store_registry: "Povinná registrační věta pro obchodní podmínky a patičku e-shopu.",
    store_tagline: "Krátký slogan používaný u značky a v meta informacích.",
    hero_title: "Hlavní nadpis první obrazovky. Čárka jej rozdělí na dva řádky, druhý řádek bude kurzívou.",
    hero_text: "Úvodní odstavec pod nadpisem. Pište stručně, ideálně jednu až dvě věty.",
    home_badge: "Malý štítek nad hlavním nadpisem na úvodní stránce.",
    home_hero_primary_cta: "Text hlavního tlačítka, které vede do katalogu.",
    home_hero_secondary_cta: "Text druhého tlačítka, které posune návštěvníka k doporučeným produktům.",
    home_coupon_title: "Titulek promo štítku přes fotografii. Kupón se bere z nastavení exit_coupon.",
    home_coupon_text: "Krátká instrukce, která se zobrazí před kódem slevy.",
    home_categories_title: "Nadpis sekce kategorií na úvodní stránce.",
    home_category_fallback: "Popis použitý jen u kategorie, která nemá vlastní popis.",
    home_category_cta: "Text odkazu v každé kartě kategorie.",
    home_featured_kicker: "Malý nadpis nad sekcí doporučených produktů.",
    home_featured_title: "Hlavní nadpis sekce doporučených produktů.",
    home_featured_text: "Vysvětlující text pod nadpisem doporučených produktů.",
    home_featured_cta: "Text odkazu na kompletní katalog.",
    home_trust_1_title: "Nadpis první prodejní výhody na úvodní stránce.",
    home_trust_1_text: "Detailní popis první prodejní výhody.",
    home_trust_2_title: "Nadpis druhé prodejní výhody na úvodní stránce.",
    home_trust_2_text: "Detailní popis dopravy; cena dopravy a osobní odběr se doplní automaticky.",
    home_trust_3_title: "Nadpis třetí prodejní výhody na úvodní stránce.",
    home_trust_3_text: "Detailní popis vrácení, záruky a reklamací.",
    home_cta_title: "Nadpis závěrečného kontaktního bloku na úvodní stránce.",
    home_cta_subtitle: "Druhý řádek závěrečného nadpisu, obvykle otevírací doba.",
    home_cta_primary: "Text tlačítka, které vede do katalogu.",
    home_cta_secondary: "Text tlačítka, které vede na stránku O nás.",
    store_email: "Adresa pro zákaznické dotazy a systémová oznámení; musí být platná.",
    store_phone: "Telefon zobrazovaný zákazníkům v patičce, na úvodní stránce a v dokumentech.",
    store_address: "Veřejná adresa provozovny. Uvádí se také v patičce a strukturovaných datech.",
    store_return_address: "Adresa, kam zákazníci posílají vrácené zboží a reklamace.",
    store_hours: "Otevírací doba provozovny zobrazovaná zákazníkům.",
    iban: "IBAN pro automaticky generovaný QR kód při platbě převodem.",
    bank_name: "Název banky zobrazený u údajů pro převod.",
    bank_account: "Lokální číslo účtu pro ruční platby; kontrolujte jej před spuštěním obchodu.",
    reviews_auto_approve: "1 schvaluje hodnocení automaticky, 0 je pošle do fronty ke schválení v sekci Hodnocení.",
    invoice_auto: "1 vystaví fakturu automaticky, 0 ponechá vystavení na ruční akci v sekci Faktury.",
    invoice_auto_on: "Zvolte order pro vystavení při objednávce, nebo paid po potvrzení platby.",
    invoice_prefix: "Předpona čísel faktur, například FV.",
    invoice_pad: "Počet číslic pořadového čísla, například 4 vytvoří FV-0001.",
    invoice_due_days: "Počet dnů splatnosti faktury.",
    invoice_vat_payer: "1 znamená plátce DPH a zapne rozpis DPH na faktuře; 0 jej vypne.",
    invoice_vat_rate: "Výchozí sazba DPH v procentech používaná na fakturách.",
    b2b_enabled: "Po zapnutí vidí zákazník ve skupině B2B velkoobchodní ceny bez DPH. Skupinu nastavíte v sekci Zákazníci.",
    b2b_discount: "Použije se u produktů, které nemají vyplněnou vlastní velkoobchodní cenu. Například 20 = sleva 20 % z maloobchodní ceny.",
    b2b_note: "Krátké vysvětlení, proč jsou ceny bez DPH. Zobrazí se velkoobchodníkovi v košíku a v pokladně.",
    blog_enabled: "Vypnutí skryje odkaz na magazín v menu. Články zůstanou uložené.",
    blog_title: "Zobrazuje se jako nadpis magazínu a v hlavním menu.",
    blog_perex: "Jedna až dvě věty pod nadpisem magazínu.",
    abandoned_enabled: "0 vypne automatické e-maily zákazníkům, kteří nedokončili nákup.",
    abandoned_stage1_hours: "Za jak dlouho po opuštění košíku odejde první připomínka. Doporučeno 2 hodiny.",
    abandoned_stage2_hours: "Druhá (poslední) připomínka. Doporučeno 24 hodin.",
    og_dynamic: "Náhled odkazu na Facebooku či Instagramu se vygeneruje s fotkou, názvem a cenou produktu.",
    invoice_currency: "Třípísmenný kód měny, standardně CZK.",
    gtm_id: "ID kontejneru Google Tag Manager ve tvaru GTM-XXXX. Prázdné pole měření vypne.",
    ga4_id: "Measurement ID Google Analytics 4 ve tvaru G-XXXX.",
    meta_pixel_id: "Číselné ID Meta Pixelu pro měření reklamních konverzí.",
    resend_api_key: "Tajný klíč Resend. Bezpečnější je uložit jej jako Cloudflare secret RESEND_API_KEY.",
    mail_from: "Ověřený odesílatel v Resend, například obchod@vasedomena.cz.",
    mail_webhook: "Volitelná záložní URL webhooku pro odesílání e-mailů bez Resend.",
    store_url: "Veřejná URL včetně https://; používá se v e-mailech, sitemapě a feedech.",
    wallet_merchant_name: "Název obchodníka pro Apple Pay a Google Pay.",
    apple_pay_merchant_id: "Merchant ID z Apple Developer účtu; bez něj Apple Pay nezprovozníte.",
    google_pay_merchant_id: "Merchant ID pro Google Pay, podle nastavení vašeho poskytovatele plateb.",
    exit_coupon: "Kód kupónu v opouštěcím pop-upu a promo štítku. Musí existovat v sekci Kupóny.",
  };
  return (
    <>
      <div className="toolbar">
        <h1>
          <IconGear size={26} /> Nastavení e-shopu
        </h1>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledat nastavení…" style={{ minWidth: 220 }} />
      </div>
      <p className="admin-lead">
        Firemní a bankovní údaje se automaticky promítají do Obchodních podmínek, GDPR, Reklamačního řádu, patičky,
        pokladny i QR plateb. Po uložení se zobrazí potvrzení a změny platí okamžitě.
      </p>
      <form className="admin-form" onSubmit={saveSettings}>
        {keys
          .filter(([k, label]) => !q || `${k} ${label}`.toLowerCase().includes(q.toLowerCase()))
          .map(([k, label]) => (
          <label key={k} className={k.includes("hero") || k.includes("home_") || k.includes("address") || k.includes("registry") || k.includes("return") ? "full" : ""}>
            <span className="field-label">{label} <InfoButton title={label}>{help[k] || "Toto nastavení upravuje chování e-shopu. Změnu uložte tlačítkem dole a poté ověřte výsledek na veřejném webu."}</InfoButton></span>
            {k.includes("hero_text") || k.includes("home_") ? (
              <textarea value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            ) : k === "resend_api_key" || k === "comgate_secret" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type={showKey ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  value={form[k] || ""}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  placeholder={k === "comgate_secret" ? "heslo z portálu Comgate" : "re_…"}
                />
                <button
                  type="button"
                  className="btn-line btn-sm"
                  style={{ whiteSpace: "nowrap" }}
                  onClick={() => setShowKey((v) => !v)}
                  aria-label={showKey ? "Skrýt klíč" : "Zobrazit klíč"}
                >
                  {showKey ? "Skrýt" : "Ukázat"}
                </button>
              </div>
            ) : (
              <input value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            )}
          </label>
        ))}
        <div className="full mail-hint" style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
          <b style={{ color: "var(--ink-soft)" }}>Tip k e-mailům:</b> klíč Resend můžete nechat tady v nastavení, nebo ho
          bezpečněji uložit jako Cloudflare secret <code>RESEND_API_KEY</code> (v Pages → Settings → Environment
          variables) — pak ho stačí nechat tady prázdný. Odesílatel <code>mail_from</code> musí být z domény ověřené v
          Resend. Stav a zkušební odeslání najdete na stránce{" "}
          <Link to="/admin/emaily">E-maily</Link>.
        </div>
        <div className="full admin-sticky-save">
          <SaveButton state={saver.state} error={saver.error} type="submit" savedLabel="Nastavení uloženo">
            Uložit nastavení
          </SaveButton>
        </div>
      </form>

      <SecuritySettings />
    </>
  );
}

function SecuritySettings() {
  const { toast } = useStore();
  const [totp, setTotp] = useState<{ enabled: boolean; required: boolean } | null>(null);
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [qr, setQr] = useState("");
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => void api<{ enabled: boolean; required: boolean }>("/admin/totp").then(setTotp).catch(() => {});
  useEffect(load, []);

  async function startSetup() {
    setBusy(true);
    try {
      const r = await api<{ secret: string; otpauth: string }>("/admin/totp/setup");
      const data = await QRCode.toDataURL(r.otpauth, { width: 200, margin: 1 });
      setSetup(r);
      setQr(data);
      setCode("");
      setPw("");
    } catch {
      toast("Přípravu ověření se nepodařilo spustit.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function enable() {
    if (!setup) return;
    setBusy(true);
    try {
      await api("/admin/totp/enable", { method: "POST", body: JSON.stringify({ password: pw, code, secret: setup.secret }) });
      toast("Dvoufázové ověření je zapnuté. Při příštím přihlášení budete zadávat kód z aplikace.");
      setSetup(null);
      setQr("");
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Nepodařilo se zapnout.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      await api("/admin/totp/disable", { method: "POST", body: JSON.stringify({ password: pw, code }) });
      toast("Dvoufázové ověření je vypnuté.");
      setPw("");
      setCode("");
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Nepodařilo se vypnout.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function backup() {
    setBusy(true);
    try {
      const r = await api<{ bytes: number; r2_key?: string }>("/admin/backup", { method: "POST" });
      toast(r.r2_key ? `Záloha uložená do R2 (${r.r2_key}, ${Math.round(r.bytes / 1024)} kB).` : `Záloha připravená (${Math.round(r.bytes / 1024)} kB). R2 není připojené.`, "ok");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Záloha selhala.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function runAbandoned() {
    setBusy(true);
    try {
      const r = await api<{ sent: number }>("/admin/mail/abandoned", { method: "POST" });
      toast(`Série opuštěného košíku: odesláno ${r.sent} e-mailů.`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Zpracování selhalo.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function maintenance() {
    setBusy(true);
    try {
      await api("/admin/maintenance", { method: "POST" });
      toast("Údržba dokončena.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Údržba selhala.", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="admin-form" style={{ marginTop: 28 }} aria-label="Bezpečnost a provoz">
      <h2 style={{ margin: "0 0 4px" }}>Bezpečnost a provoz</h2>

      <div className="totp-box">
        <h3 style={{ margin: "12px 0 6px" }}>Dvoufázové ověření (TOTP)</h3>
        <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 10px" }}>
          {totp?.enabled
            ? "Zapnuté — při přihlášení se po heslu zadává 6místný kód z autentizační aplikace (Google Authenticator, 1Password…)."
            : "Vypnuté — po zapnutí bude přihlášení chráněné jednorázovým kódem z autentizační aplikace."}
        </p>
        {totp?.enabled ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label>
              Heslo
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
            </label>
            <label>
              Kód z aplikace
              <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="123456" />
            </label>
            <button type="button" className="btn-line" disabled={busy} onClick={() => void disable()}>
              Vypnout 2FA
            </button>
          </div>
        ) : setup ? (
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 13.5 }}>
              Naskenujte QR kód do autentizační aplikace (nebo zadejte tajemství ručně) a potvrďte aktuálním kódem:
            </p>
            <span className="totp-qr">
              <img src={qr} alt="QR kód pro autentizační aplikaci" />
            </span>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0" }}>
              Tajemství: <code>{setup.secret}</code>
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <label>
                Heslo
                <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
              </label>
              <label>
                Kód z aplikace
                <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="123456" />
              </label>
              <button type="button" className="btn" disabled={busy} onClick={() => void enable()}>
                Zapnout 2FA
              </button>
              <button type="button" className="linkish" style={{ background: "none", border: "none" }} onClick={() => setSetup(null)}>
                Zrušit
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn-line" disabled={busy} onClick={() => void startSetup()}>
            Zapnout dvoufázové ověření
          </button>
        )}
      </div>

      <div style={{ marginTop: 18 }}>
        <h3 style={{ margin: "12px 0 6px" }}>Záloha a údržba</h3>
        <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 10px" }}>
          Záloha D1 (produkty, objednávky, zákazníci…) do R2. Sérii e-mailů opuštěného košíku jinak spouští cron —
          zde ji spustíte ručně.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn-line" disabled={busy} onClick={() => void backup()}>
            Zálohovat databázi
          </button>
          <button type="button" className="btn-line" disabled={busy} onClick={() => void runAbandoned()}>
            Odeslat sérii opuštěných košíků
          </button>
          <button type="button" className="btn-line" disabled={busy} onClick={() => void maintenance()}>
            Údržba (úklid logů)
          </button>
        </div>
      </div>
    </section>
  );
}

function FeedsPage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const feeds = [
    { name: "Heureka.cz", path: "/heureka.xml", hint: "Heureka → XML feed produktů (stejný i na /api/feeds/heureka.xml)" },
    { name: "Zboží.cz", path: "/zbozi.xml", hint: "Seznam Zboží.cz → XML import" },
    { name: "Google Shopping", path: "/google-shopping.xml", hint: "Google Merchant Center → Products → Feeds" },
    { name: "OpenAI (ChatGPT Shopping)", path: "/openai-feed.jsonl.gz", hint: "JSONL.GZ dle specifikace OpenAI Commerce — dodává se přes SFTP po schválení v ChatGPT merchant portálu" },
  ];
  return (
    <>
      <h1>Feedy a měření</h1>
      <p style={{ color: "var(--muted)" }}>
        Adresy níže zadejte do Heureky, Zboží.cz a Google Merchant Center. GTM / GA4 / Meta Pixel vyplňte v{" "}
        <Link to="/admin/nastaveni">Nastavení</Link>. Skripty se načtou až po souhlasu s analytickými cookies.
      </p>
      <div className="export-grid">
        {feeds.map((f) => (
          <div className="export-card" key={f.path}>
            <div className="export-head">
              <h3>{f.name}</h3>
              <span className="export-badge">XML</span>
            </div>
            <p>{f.hint}</p>
            <p className="export-how">
              <a href={`${origin}${f.path}`} target="_blank" rel="noreferrer">
                {origin}
                {f.path}
              </a>
            </p>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 18 }}>
        E-commerce události: <code>view_item</code>, <code>add_to_cart</code>, <code>purchase</code>.
      </p>
    </>
  );
}

function EmailsPage() {
  const { toast } = useStore();
  const [rows, setRows] = useState<{ id: number; kind: string; recipient: string; subject: string; status: string; error: string | null; created_at: string }[]>([]);
  const [alerts, setAlerts] = useState<{ id: number; email: string; product_name: string; notified_at: string | null; created_at: string }[]>([]);
  const [status, setStatus] = useState<{
    key_present: boolean;
    key_source: string;
    key_masked: string | null;
    from: string;
    from_verified: boolean | null;
    from_domain: string;
    domains: { name: string; status: string }[] | null;
    hint: string | null;
    domain_error: string | null;
  } | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; error?: string; hint?: string } | null>(null);

  function load() {
    void api<typeof rows>("/admin/emails").then(setRows).catch(() => {});
    void api<typeof alerts>("/admin/stock-alerts").then(setAlerts).catch(() => {});
    void api<typeof status>("/admin/mail/status").then(setStatus).catch(() => {});
  }
  useEffect(load, []);

  async function sendTest() {
    const to = testTo.trim();
    if (!to) return toast("Zadejte e-mail pro test.", "err");
    setTesting(true);
    setTestResult(null);
    try {
      const r = await api<{ status: string; error?: string; hint?: string; ok: boolean }>("/admin/mail/test", {
        method: "POST",
        body: JSON.stringify({ to }),
      });
      setTestResult(r);
      if (r.status === "sent") toast(`Testovací e-mail odeslán na ${to}.`);
      else if (r.status === "logged") toast("Klíč Resend chybí — e-mail se jen uložil.", "err");
      else toast("Test se nepovedl — viz detail níže.", "err");
      load();
    } catch (e) {
      setTestResult({ status: "failed", error: e instanceof Error ? e.message : "Nešlo odeslat test." });
      toast("Test se nepovedl — viz detail níže.", "err");
    } finally {
      setTesting(false);
    }
  }

  return (
    <>
      <h1>E-maily a hlídací psi</h1>
      <p style={{ color: "var(--muted)" }}>
        Potvrzení objednávky, změna stavu, naskladnění a opuštěný košík se odesílají přes Resend. Bez klíče se e-maily
        pouze ukládají sem (status <b>logged</b>) — klíč vyplňte v <Link to="/admin/nastaveni">nastavení</Link> nebo
        jako Cloudflare secret <code>RESEND_API_KEY</code>.
      </p>

      <div className="export-grid" style={{ marginBottom: 22 }}>
        <div className="export-card" style={{ gridColumn: "1 / -1" }}>
          <div className="export-head">
            <h3>Stav odesílání</h3>
            <span className={`export-badge ${status?.key_present ? "paid" : "cancelled"}`}>
              {status ? (status.key_present ? "KLÍČ NASTAVEN" : "KLÍČ CHYBÍ") : "…"}
            </span>
          </div>
          {status ? (
            <>
              <p style={{ margin: "6px 0 10px" }}>
                {status.key_present ? (
                  <>
                    Klíč <code>{status.key_masked}</code> je nastaven ({status.key_source === "settings" ? "v nastavení e-shopu" : "jako Cloudflare secret"}).
                    Odesílatel: <b>{status.from}</b>
                    {status.from_verified === true && " · doména je v Resend ověřená ✓"}
                    {status.from_verified === false && " · doména NENÍ v Resend ověřená ✗"}
                  </>
                ) : (
                  "Žádný Resend API klíč zatím není nastavený."
                )}
                {status.domains && status.domains.length > 0 && (
                  <>
                    {" "}· Ověřené domény v účtu:{" "}
                    {status.domains.map((d) => `${d.name} (${d.status})`).join(", ")}
                  </>
                )}
                {status.domain_error && <> · Domény se nepodařilo načíst: {status.domain_error}</>}
              </p>
              {status.hint && (
                <p className="mail-hint" style={{ background: "var(--bg-deep)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 12px", fontSize: 13 }}>
                  {status.hint}
                </p>
              )}
            </>
          ) : (
            <p style={{ color: "var(--muted)" }}>Kontroluji stav…</p>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
            <input
              type="email"
              placeholder="test@vas-domena.cz"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              style={{ border: "1px solid var(--line)", borderRadius: 999, padding: "9px 14px", background: "var(--card)", flex: "0 1 260px" }}
            />
            <button className="btn-dark btn-sm" type="button" disabled={testing} onClick={() => void sendTest()}>
              {testing ? "Odesílám…" : "Odeslat testovací e-mail"}
            </button>
            <button className="btn-line btn-sm" type="button" onClick={load}>
              Znovu zkontrolovat
            </button>
          </div>
          {testResult && (
            <p className="mail-hint" style={{ marginTop: 10, fontSize: 13, borderRadius: 12, padding: "10px 12px", background: testResult.status === "sent" ? "color-mix(in srgb, var(--ok) 10%, var(--card))" : "color-mix(in srgb, var(--danger) 8%, var(--card))", border: `1px solid ${testResult.status === "sent" ? "var(--ok)" : "var(--danger)"}` }}>
              <b>Výsledek testu: {testResult.status === "sent" ? "odesláno ✓" : testResult.status === "logged" ? "uloženo (log) — klíč chybí" : "chyba"}</b>
              {testResult.hint ? <> — {testResult.hint}</> : testResult.error ? <> — {testResult.error}</> : null}
            </p>
          )}
        </div>
      </div>

      <h2>Odeslané / zařazené</h2>
      <div className="table-wrap" style={{ marginBottom: 22 }}>
        <table>
          <thead>
            <tr>
              <th>Kdy</th>
              <th>Druh</th>
              <th>Komu</th>
              <th>Předmět</th>
              <th>Stav</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td data-label="Kdy">{dateCs(r.created_at)}</td>
                <td data-label="Druh">{r.kind}</td>
                <td data-label="Komu">{r.recipient}</td>
                <td data-label="Předmět">{r.subject}</td>
                <td data-label="Stav">
                  <span className={`tag ${r.status === "sent" ? "paid" : r.status === "failed" ? "cancelled" : "new"}`}>{r.status}</span>
                  {r.error ? <small> {r.error}</small> : null}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} style={{ color: "var(--muted)" }}>
                  Zatím žádné e-maily.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <h2>Hlídací pes</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Produkt</th>
              <th>E-mail</th>
              <th>Od</th>
              <th>Oznámeno</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id}>
                <td>{a.product_name}</td>
                <td>{a.email}</td>
                <td>{dateCs(a.created_at)}</td>
                <td>{a.notified_at ? dateCs(a.notified_at) : "čeká"}</td>
              </tr>
            ))}
            {!alerts.length && (
              <tr>
                <td colSpan={4} style={{ color: "var(--muted)" }}>
                  Nikdo zatím hlídacího psa nenasadil.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ============================================================
   Oznamovací lišta a dlaždice na úvodní stránce
   ============================================================ */

const TILE_ICON_LABELS: Record<string, string> = {
  gift: "🎁 Dárek",
  leaf: "🌿 List",
  locker: "📦 Výdejní box",
  truck: "🚚 Doprava",
  shield: "🛡 Záruka",
  spark: "✨ Jiskra",
  clock: "⏱ Hodiny",
  heart: "❤️ Srdce",
  pin: "📍 Špendlík",
  shop: "🏠 Obchod",
  star: "★ Hvězda",
  card: "💳 Karta",
};

const TILE_COLOR_LABELS: Record<string, string> = {
  accent: "Akcentní (terakota)",
  forest: "Lesní zelená",
  gold: "Zlatá",
  plain: "Neutrální",
};

function StripAndTiles() {
  const { refresh, settings } = useStore();
  const saver = useSaver();
  const [loaded, setLoaded] = useState(false);
  const [announceOn, setAnnounceOn] = useState(true);
  const [rotate, setRotate] = useState(false);
  const [items, setItems] = useState<AnnounceItem[]>([]);
  const [bg, setBg] = useState("");
  const [fg, setFg] = useState("");
  const [tilesOn, setTilesOn] = useState(true);
  const [showCats, setShowCats] = useState(true);
  const [tilesTitle, setTilesTitle] = useState("");
  const [tiles, setTiles] = useState<HomeTile[]>([]);

  useEffect(() => {
    void api<Record<string, string>>("/admin/settings").then((s) => {
      const a = readAnnounce(s);
      setAnnounceOn(a.enabled);
      setRotate(a.rotate);
      setItems(a.items);
      setBg(a.bg);
      setFg(a.fg);
      const t = readHomeTiles(s);
      setTilesOn(t.enabled);
      setShowCats(t.showCategories);
      setTilesTitle(t.title);
      setTiles(t.items);
      setLoaded(true);
    });
  }, []);

  async function save() {
    await saver.run(async () => {
      await api("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          announce_enabled: announceOn ? "1" : "0",
          announce_rotate: rotate ? "1" : "0",
          announce_items: JSON.stringify(items.filter((i) => i.text.trim())),
          announce_bg: bg,
          announce_fg: fg,
          home_tiles_enabled: tilesOn ? "1" : "0",
          home_tiles_show_categories: showCats ? "1" : "0",
          home_tiles_title: tilesTitle,
          home_tiles_items: JSON.stringify(tiles.filter((t) => t.title.trim() || t.image)),
        }),
      });
      await refresh();
    }, "Lišta a dlaždice uloženy — na webu se to projeví hned.");
  }

  function moveTile(i: number, dir: number) {
    const to = i + dir;
    if (to < 0 || to >= tiles.length) return;
    const next = tiles.slice();
    [next[i], next[to]] = [next[to], next[i]];
    setTiles(next);
  }

  if (!loaded) return <p>Načítám…</p>;

  const previewItems = items.filter((i) => i.text.trim());

  return (
    <>
      <h1>
        <IconMegaphone size={26} /> Lišta a dlaždice
      </h1>
      <p className="admin-lead">
        Tady upravíte <b>oznamovací lištu</b> nad hlavičkou (ten tenký pruh s dopravou zdarma) a <b>dlaždice rychlých
        odkazů</b> na úvodní stránce. Obojí jde i úplně vypnout.
      </p>

      {/* ---------------- Oznamovací lišta ---------------- */}
      <section className="admin-card">
        <h2 className="admin-form-title">
          <IconBell size={18} /> Oznamovací lišta nad hlavičkou
        </h2>

        <label className="admin-check">
          <input type="checkbox" checked={announceOn} onChange={(e) => setAnnounceOn(e.target.checked)} />
          <span>
            <b>Lištu zobrazovat</b>
            <small>Po vypnutí pruh z webu úplně zmizí.</small>
          </span>
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={rotate} onChange={(e) => setRotate(e.target.checked)} />
          <span>
            <b>Zprávy střídat po pěti vteřinách</b>
            <small>Jinak se zobrazí všechny vedle sebe oddělené tečkou.</small>
          </span>
        </label>

        <div className="admin-preview" style={{ background: bg || undefined, color: fg || undefined }}>
          <span className="admin-preview-label">Náhled lišty</span>
          <div className="announce announce-preview" style={{ background: bg || undefined, color: fg || undefined }}>
            <span className="announce-dot" aria-hidden="true" />
            <span className="announce-body">
              {(previewItems.length
                ? previewItems
                : [{ text: "Doprava zdarma od *1 500 Kč*" }, { text: "Sleva 10 % na první nákup — kód *KAVKA10*" }]
              ).map((it, i) => (
                <span key={i} className="announce-item">
                  {i > 0 && <span className="announce-sep">·</span>}
                  {it.text.split("*").map((part, j) => (j % 2 === 1 ? <b key={j}>{part}</b> : <span key={j}>{part}</span>))}
                </span>
              ))}
            </span>
          </div>
        </div>

        <p className="admin-hint">
          Text mezi <code>*hvězdičkami*</code> se zvýrazní tučně, například <code>Doprava zdarma od *1 500 Kč*</code>.
        </p>

        {items.map((it, i) => (
          <div key={i} className="admin-row-card">
            <span className="admin-row-num">{i + 1}</span>
            <div className="admin-row-fields">
              <label>
                Text zprávy
                <input value={it.text} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
              </label>
              <label>
                Odkaz (nepovinné)
                <input
                  value={it.to || ""}
                  placeholder="/katalog"
                  onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))}
                />
              </label>
            </div>
            <div className="row-actions">
              <button type="button" className="chip" disabled={i === 0} onClick={() => {
                const next = items.slice();
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                setItems(next);
              }}>↑</button>
              <button type="button" className="chip" disabled={i === items.length - 1} onClick={() => {
                const next = items.slice();
                [next[i + 1], next[i]] = [next[i], next[i + 1]];
                setItems(next);
              }}>↓</button>
              <button type="button" className="chip danger" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                <IconTrash size={14} /> Odebrat
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="pb-add" onClick={() => setItems([...items, { text: "" }])}>
          + Přidat zprávu do lišty
        </button>

        <div className="admin-form" style={{ padding: 0, border: 0, background: "transparent", marginTop: 14 }}>
          <label>
            Barva pozadí lišty
            <div className="color-field">
              <input type="color" value={bg || "#24352c"} onChange={(e) => setBg(e.target.value)} />
              <input value={bg} onChange={(e) => setBg(e.target.value)} placeholder="výchozí" />
              {bg && <button type="button" className="chip" onClick={() => setBg("")}>Výchozí</button>}
            </div>
          </label>
          <label>
            Barva textu
            <div className="color-field">
              <input type="color" value={fg || "#efe8dc"} onChange={(e) => setFg(e.target.value)} />
              <input value={fg} onChange={(e) => setFg(e.target.value)} placeholder="výchozí" />
              {fg && <button type="button" className="chip" onClick={() => setFg("")}>Výchozí</button>}
            </div>
          </label>
        </div>
      </section>

      {/* ---------------- Dlaždice ---------------- */}
      <section className="admin-card">
        <h2 className="admin-form-title">
          <IconGrid size={18} /> Dlaždice rychlých odkazů (úvodní stránka)
        </h2>

        <label className="admin-check">
          <input type="checkbox" checked={tilesOn} onChange={(e) => setTilesOn(e.target.checked)} />
          <span>
            <b>Dlaždice zobrazovat</b>
            <small>Sekce „Rychlé odkazy“ hned pod úvodním carouselem.</small>
          </span>
        </label>
        <label className="admin-check">
          <input type="checkbox" checked={showCats} onChange={(e) => setShowCats(e.target.checked)} />
          <span>
            <b>Doplnit dlaždice kategoriemi</b>
            <small>Za vaše dlaždice se přidají první čtyři kategorie z katalogu.</small>
          </span>
        </label>
        <div className="admin-form" style={{ padding: 0, border: 0, background: "transparent" }}>
          <label className="full">
            Nadpis nad dlaždicemi (nepovinné)
            <input value={tilesTitle} onChange={(e) => setTilesTitle(e.target.value)} placeholder="např. Kam dál" />
          </label>
        </div>

        {/* Živý náhled dlaždic */}
        {(tiles.length > 0 || tilesOn) && (
          <div className="admin-preview">
            <span className="admin-preview-label">Náhled dlaždic</span>
            <div className="tile-preview">
              {(tiles.length ? tiles : [emptyTile()]).map((t, i) => (
                <span key={i} className="tile-preview-item">
                  <span className={`home-tile-icon ${t.color}`}>{TILE_ICON_LABELS[t.icon]?.split(" ")[0] || "✨"}</span>
                  <span>
                    <b>{t.title || "Název dlaždice"}</b>
                    <small>{t.subtitle || "Popisek"}</small>
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {tiles.map((t, i) => (
          <div key={i} className="admin-row-card">
            <span className="admin-row-num">{i + 1}</span>
            <div className="admin-row-fields tile-fields">
              <label>
                Nadpis
                <input value={t.title} onChange={(e) => setTiles(tiles.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
              </label>
              <label>
                Popisek
                <input value={t.subtitle} onChange={(e) => setTiles(tiles.map((x, j) => (j === i ? { ...x, subtitle: e.target.value } : x)))} />
              </label>
              <label>
                Odkaz
                <input value={t.to} onChange={(e) => setTiles(tiles.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} placeholder="/katalog" />
              </label>
              <label>
                Ikona
                <select value={t.icon} onChange={(e) => setTiles(tiles.map((x, j) => (j === i ? { ...x, icon: e.target.value as HomeTile["icon"] } : x)))}>
                  {TILE_ICONS.map((ic) => (
                    <option key={ic} value={ic}>{TILE_ICON_LABELS[ic] || ic}</option>
                  ))}
                </select>
              </label>
              <label>
                Barva
                <select value={t.color} onChange={(e) => setTiles(tiles.map((x, j) => (j === i ? { ...x, color: e.target.value as HomeTile["color"] } : x)))}>
                  {TILE_COLORS.map((c) => (
                    <option key={c} value={c}>{TILE_COLOR_LABELS[c] || c}</option>
                  ))}
                </select>
              </label>
              <label>
                Vlastní obrázek (URL, místo ikony)
                <input value={t.image || ""} onChange={(e) => setTiles(tiles.map((x, j) => (j === i ? { ...x, image: e.target.value } : x)))} />
              </label>
            </div>
            <div className="row-actions">
              <button type="button" className="chip" disabled={i === 0} onClick={() => moveTile(i, -1)}>↑</button>
              <button type="button" className="chip" disabled={i === tiles.length - 1} onClick={() => moveTile(i, 1)}>↓</button>
              <button type="button" className="chip danger" onClick={() => setTiles(tiles.filter((_, j) => j !== i))}>
                <IconTrash size={14} /> Odebrat
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="pb-add" onClick={() => setTiles([...tiles, emptyTile()])}>
          + Přidat dlaždici
        </button>
        {!tiles.length && (
          <p className="admin-hint">
            Dokud nepřidáte vlastní dlaždice, zobrazí se výchozí čtveřice (poukazy, ateliér, výdejní místa, doprava).
          </p>
        )}
      </section>

      <div className="admin-sticky-save">
        <SaveButton state={saver.state} error={saver.error} onClick={() => void save()}>
          Uložit lištu a dlaždice
        </SaveButton>
      </div>
      {settings.announce_enabled === "0" && announceOn && (
        <p className="admin-hint">Lišta je zatím na webu vypnutá — uložením ji zapnete.</p>
      )}
    </>
  );
}

/* ============================================================
   Filtry a štítky katalogu
   ============================================================ */

function FiltersAndTags() {
  const { refresh } = useStore();
  const { toast } = useStore();
  const saver = useSaver();
  const [tags, setTags] = useState<{ tag: string; count: number }[]>([]);
  const [groups, setGroups] = useState<{ title: string; tags: string[] }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [rename, setRename] = useState<{ from: string; to: string } | null>(null);

  const loadTags = () => void api<{ tag: string; count: number }[]>("/admin/tags").then(setTags).catch(() => setTags([]));

  useEffect(() => {
    loadTags();
    void api<Record<string, string>>("/admin/settings").then((s) => {
      setGroups(readFilterGroups(s));
      setLoaded(true);
    });
  }, []);

  async function save() {
    await saver.run(async () => {
      await api("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ catalog_filters: JSON.stringify(groups.filter((g) => g.title.trim() && g.tags.length)) }),
      });
      await refresh();
    }, "Filtry uloženy — v katalogu se projeví hned.");
  }

  async function applyRename() {
    if (!rename) return;
    try {
      const r = await api<{ changed: number }>("/admin/tags", { method: "POST", body: JSON.stringify(rename) });
      toast(rename.to ? `Štítek přejmenován u ${r.changed} produktů.` : `Štítek smazán u ${r.changed} produktů.`);
      setRename(null);
      loadTags();
    } catch {
      toast("Změnu se nepodařilo provést.", "err");
    }
  }

  function toggleInGroup(gi: number, tag: string) {
    setGroups(
      groups.map((g, i) =>
        i === gi
          ? { ...g, tags: g.tags.some((t) => t.toLowerCase() === tag.toLowerCase()) ? g.tags.filter((t) => t.toLowerCase() !== tag.toLowerCase()) : [...g.tags, tag] }
          : g
      )
    );
  }

  if (!loaded) return <p>Načítám…</p>;

  return (
    <>
      <h1>
        <IconFilter size={26} /> Filtry a štítky
      </h1>
      <p className="admin-lead">
        Štítky přidáváte přímo u produktu (sekce <b>Štítky produktu</b>). Tady z nich sestavíte <b>skupiny filtrů</b>,
        které zákazník uvidí v katalogu, a můžete štítky hromadně přejmenovat nebo smazat.
      </p>

      <section className="admin-card">
        <h2 className="admin-form-title">
          <IconTagIcon size={18} /> Použité štítky ({tags.length})
        </h2>
        {tags.length ? (
          <div className="tag-editor">
            {tags.map((t) => (
              <span key={t.tag} className="tag-chip">
                {t.tag} <small>{t.count}×</small>
                <button type="button" onClick={() => setRename({ from: t.tag, to: t.tag })} aria-label={`Upravit štítek ${t.tag}`}>
                  <IconPen size={12} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="admin-hint">
            Zatím žádné štítky. Otevřete <Link to="/admin/produkty">produkt</Link> a přidejte mu první štítek.
          </p>
        )}

        {rename && (
          <div className="admin-row-card" style={{ marginTop: 12 }}>
            <div className="admin-row-fields">
              <label>
                Přejmenovat štítek „{rename.from}“ na
                <input value={rename.to} onChange={(e) => setRename({ ...rename, to: e.target.value })} />
              </label>
            </div>
            <div className="row-actions">
              <button type="button" className="btn-dark btn-sm" onClick={() => void applyRename()}>
                Přejmenovat
              </button>
              <button type="button" className="chip danger" onClick={() => { setRename({ ...rename, to: "" }); void applyRename(); }}>
                <IconTrash size={14} /> Smazat u všech produktů
              </button>
              <button type="button" className="chip" onClick={() => setRename(null)}>
                Zrušit
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="admin-card">
        <h2 className="admin-form-title">
          <IconFilter size={18} /> Skupiny filtrů v katalogu
        </h2>
        <p className="admin-hint">
          Každá skupina je jeden blok filtrů (např. „Materiál“ se štítky len, keramika, dřevo). Když nevytvoříte žádnou
          skupinu, katalog nabídne prostě všechny štítky.
        </p>
        {groups.map((g, gi) => (
          <div key={gi} className="admin-row-card">
            <span className="admin-row-num">{gi + 1}</span>
            <div className="admin-row-fields">
              <label>
                Název skupiny
                <input value={g.title} onChange={(e) => setGroups(groups.map((x, i) => (i === gi ? { ...x, title: e.target.value } : x)))} placeholder="Materiál" />
              </label>
              <div className="tag-picker">
                <span>Štítky ve skupině:</span>
                <div className="tag-editor">
                  {tags.map((t) => {
                    const on = g.tags.some((x) => x.toLowerCase() === t.tag.toLowerCase());
                    return (
                      <button key={t.tag} type="button" className={`chip tag-chip${on ? " on" : ""}`} onClick={() => toggleInGroup(gi, t.tag)}>
                        {on ? "✓ " : "+ "}
                        {t.tag}
                      </button>
                    );
                  })}
                  {!tags.length && <small className="admin-hint">Nejdřív přidejte štítky produktům.</small>}
                </div>
              </div>
            </div>
            <div className="row-actions">
              <button type="button" className="chip" disabled={gi === 0} onClick={() => {
                const next = groups.slice();
                [next[gi - 1], next[gi]] = [next[gi], next[gi - 1]];
                setGroups(next);
              }}>↑</button>
              <button type="button" className="chip" disabled={gi === groups.length - 1} onClick={() => {
                const next = groups.slice();
                [next[gi + 1], next[gi]] = [next[gi], next[gi + 1]];
                setGroups(next);
              }}>↓</button>
              <button type="button" className="chip danger" onClick={() => setGroups(groups.filter((_, i) => i !== gi))}>
                <IconTrash size={14} /> Odebrat
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="pb-add" onClick={() => setGroups([...groups, { title: "", tags: [] }])}>
          + Přidat skupinu filtrů
        </button>
      </section>

      <div className="admin-sticky-save">
        <SaveButton state={saver.state} error={saver.error} onClick={() => void save()}>
          Uložit filtry
        </SaveButton>
      </div>
    </>
  );
}
