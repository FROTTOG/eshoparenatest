import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { api, ApiError, type Order, type Page, type Product } from "../api";
import { IconClose, IconMenu } from "../components/Icons";
import { Logo } from "../components/Ui";
import { czk, dateCs, statusLabel } from "../format";
import { optimizedImage } from "../image";
import { useStore } from "../store";
import { Pages, PageBuilder } from "./Pages";

export function Admin() {
  const { user } = useStore();
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
          <NavLink to="/admin" end>Přehled</NavLink>
          <NavLink to="/admin/produkty">Produkty</NavLink>
          <NavLink to="/admin/sklad">Sklad</NavLink>
          <NavLink to="/admin/kategorie">Kategorie</NavLink>
          <NavLink to="/admin/objednavky">Objednávky</NavLink>
          <NavLink to="/admin/faktury">Faktury</NavLink>
          <NavLink to="/admin/exporty">Exporty</NavLink>
          <NavLink to="/admin/zakaznici">Zákazníci</NavLink>
          <NavLink to="/admin/kupony">Kupóny / Dárkové poukazy</NavLink>
          <NavLink to="/admin/reklamace">Reklamace</NavLink>
          <NavLink to="/admin/hodnoceni">Hodnocení</NavLink>
          <NavLink to="/admin/doprava">Doprava</NavLink>
          <NavLink to="/admin/vydejni-mista">Výdejní místa</NavLink>
          <NavLink to="/admin/platby">Platby</NavLink>
          <NavLink to="/admin/stranky">Stránky (editor)</NavLink>
          <NavLink to="/admin/navbar">Menu a logo</NavLink>
          <NavLink to="/admin/feedy">Feedy a měření</NavLink>
          <NavLink to="/admin/emaily">E-maily</NavLink>
          <NavLink to="/admin/nastaveni">Nastavení</NavLink>
          <NavLink to="/">← E-shop</NavLink>
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
          <Route path="stranky" element={<Pages />} />
          <Route path="stranky/:id" element={<PageBuilder />} />
          <Route path="navbar" element={<NavbarSettings />} />
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
  const [rows, setRows] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  async function load(query = q) {
    setRows(await api<Product[]>(`/admin/products${query ? `?q=${encodeURIComponent(query)}` : ""}`));
  }
  useEffect(() => { void load(""); }, []);
  return (
    <>
      <div className="toolbar">
        <h1>Produkty</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledat" onKeyDown={(e) => e.key === "Enter" && void load()} />
          <Link className="btn" to="/admin/produkty/novy">Nový produkt</Link>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th></th><th>Název</th><th>SKU</th><th>Cena</th><th>Sklad</th><th>Aktivní</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.image ? <img src={optimizedImage(p.image)} alt="" loading="lazy" decoding="async" width={44} height={44} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 }} /> : null}</td>
                <td data-label="Název"><Link to={`/admin/produkty/${p.id}`}>{p.name}</Link></td>
                <td data-label="SKU">{p.sku}</td>
                <td data-label="Cena">{czk(p.price)}</td>
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
  const [cats, setCats] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState({
    name: "", slug: "", sku: "", description: "", short_description: "",
    price: 0, compare_price: "" as number | "", stock: 0, low_stock: 5,
    category_id: "" as number | "", image: "", weight: 0, active: 1, featured: 0,
  });

  useEffect(() => {
    void api<{ id: number; name: string }[]>("/admin/categories").then(setCats);
    if (id) {
      void api<Product & { compare_price: number | null }>(`/admin/products/${id}`).then((p) => {
        setForm({
          name: p.name, slug: p.slug, sku: p.sku, description: p.description, short_description: p.short_description,
          price: p.price, compare_price: p.compare_price ?? "", stock: p.stock, low_stock: p.low_stock,
          category_id: p.category_id ?? "", image: p.image, weight: p.weight, active: p.active, featured: p.featured,
        });
      });
    }
  }, [id]);

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
    const payload = { ...form, compare_price: form.compare_price === "" ? null : Number(form.compare_price), category_id: form.category_id === "" ? null : Number(form.category_id) };
    try {
      if (id) {
        await api(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        toast("Uloženo.");
      } else {
        const r = await api<{ id: number }>("/admin/products", { method: "POST", body: JSON.stringify(payload) });
        nav(`/admin/produkty/${r.id}`);
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Chyba", "err");
    }
  }

  async function remove() {
    if (!id || !confirm("Opravdu smazat produkt?")) return;
    await api(`/admin/products/${id}`, { method: "DELETE" });
    nav("/admin/produkty");
  }

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <>
      <h1>{id ? "Upravit produkt" : "Nový produkt"}</h1>
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
        {!id && <label>Počáteční sklad<input type="number" value={form.stock} onChange={(e) => set("stock", Number(e.target.value))} /></label>}
        <label>Hláška nízkého skladu<input type="number" value={form.low_stock} onChange={(e) => set("low_stock", Number(e.target.value))} /></label>
        <label>Hmotnost g<input type="number" value={form.weight} onChange={(e) => set("weight", Number(e.target.value))} /></label>
        <label>URL fotky<input value={form.image} onChange={(e) => set("image", e.target.value)} /></label>
        <label>Nahrát do R2<input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} /></label>
        <label className="full">Krátký popis<textarea value={form.short_description} onChange={(e) => set("short_description", e.target.value)} /></label>
        <label className="full">Popis<textarea rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
        <label><input type="checkbox" checked={!!form.active} onChange={(e) => set("active", e.target.checked ? 1 : 0)} /> Aktivní</label>
        <label><input type="checkbox" checked={!!form.featured} onChange={(e) => set("featured", e.target.checked ? 1 : 0)} /> Na úvod</label>
        <div className="full row-actions">
          <button className="btn-dark" type="submit">Uložit</button>
          {id && <button className="btn-line" type="button" onClick={() => void remove()}>Smazat</button>}
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
  const [rows, setRows] = useState<Order[]>([]);
  const [status, setStatus] = useState("");
  const load = () => void api<Order[]>(`/admin/orders${status ? `?status=${status}` : ""}`).then(setRows);
  useEffect(() => { load(); }, [status]);
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
      <div className="table-wrap">
        <table>
          <thead><tr><th>Číslo</th><th>Zákazník</th><th>Stav</th><th>Platba</th><th>Celkem</th><th>Kdy</th></tr></thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
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

function Customers() {
  const [rows, setRows] = useState<{ id: number; email: string; name: string; phone: string; role: string; orders: number; spent: number; created_at: string }[]>([]);
  useEffect(() => { void api<typeof rows>("/admin/customers").then(setRows); }, []);
  return (
    <>
      <h1>Zákazníci</h1>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Jméno</th><th>E-mail</th><th>Role</th><th>Obj.</th><th>Útrata</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td data-label="Jméno">{u.name}</td>
                <td data-label="E-mail">{u.email}<br /><small>{u.phone}</small></td>
                <td data-label="Role">{u.role}</td>
                <td data-label="Objednávek">{u.orders}</td>
                <td data-label="Útrata">{czk(u.spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Coupons() {
  const { toast } = useStore();
  const [rows, setRows] = useState<{ id: number; code: string; type: string; value: number; min_order: number; max_uses: number | null; used_count: number; active: number; description: string }[]>([]);
  const [form, setForm] = useState({ code: "", type: "percent", value: 10, min_order: 0, max_uses: 100, description: "" });
  const load = () => void api<typeof rows>("/admin/coupons").then(setRows);
  useEffect(() => { load(); }, []);
  return (
    <>
      <h1>Kupóny / Dárkové poukazy</h1>
      <p style={{ color: "var(--muted)" }}>Dárkový poukaz = kupón na 1 použití (max_uses = 1). Použijte tlačítko níže pro rychlé vygenerování.</p>
      <div style={{ marginBottom: 12 }}>
        <button className="btn-line btn-sm" onClick={() => { const code = "DAREK-" + Math.random().toString(36).slice(2,7).toUpperCase(); setForm({ code, type: "fixed", value: 500, min_order: 0, max_uses: 1, description: "Dárkový poukaz na jedno použití" }); toast("Kód vygenerován: " + code); }}>🎁 Vygenerovat dárkový poukaz (1 použití)</button>
        <button className="btn-line btn-sm" style={{ marginLeft: 8 }} onClick={() => setForm(f => ({ ...f, max_uses: 1, description: "Dárkový poukaz na jedno použití" }))}>Nastavit na 1 použití</button>
      </div>
      <form className="admin-form" onSubmit={(e) => { e.preventDefault(); void api("/admin/coupons", { method: "POST", body: JSON.stringify(form) }).then(load); }}>
        <label>Kód<input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required /></label>
        <label>Typ
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="percent">Procenta</option>
            <option value="fixed">Kč</option>
          </select>
        </label>
        <label>Hodnota<input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} /></label>
        <label>Min. objednávka<input type="number" value={form.min_order} onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })} /></label>
        <label>Max. použití<input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })} /></label>
        <label>Popis<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <button className="btn-dark">Přidat</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Kód</th><th>Sleva</th><th>Použito</th><th></th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td><b>{c.code}</b><br /><small>{c.description}</small></td>
                <td>{c.type === "percent" ? `${c.value} %` : czk(c.value)} {c.min_order ? `od ${czk(c.min_order)}` : ""}</td>
                <td>{c.used_count}{c.max_uses != null ? ` / ${c.max_uses}` : ""}</td>
                <td><button className="linkish" onClick={() => void api(`/admin/coupons/${c.id}`, { method: "DELETE" }).then(load)}>Smazat</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
  const [rows, setRows] = useState<{ id: number; name: string; description: string; fee: number; active: number; allowed_shipping: string; sort_order: number }[]>([]);
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
    await api("/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ navbar_items: JSON.stringify(items), logo_title: logoTitle, logo_subtext: logoSub, logo_svg: logoSvg }),
    });
    toast("Navbar a logo uloženy.");
    void refresh();
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

      <button className="btn-dark" onClick={() => void save()}>Uložit navbar a logo</button>

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

function SettingsPage() {
  const { toast, refresh } = useStore();
  const [form, setForm] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState(false);
  useEffect(() => { void api<Record<string, string>>("/admin/settings").then(setForm); }, []);
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
  ];
  return (
    <>
      <h1>Nastavení e-shopu a právní údaje</h1>
      <p style={{ color: "var(--muted)", marginBottom: 20 }}>
        Veškeré zde nastavené firemní a bankovní údaje se automaticky promítají do Obchodních podmínek, Zásad ochrany osobních údajů (GDPR), Reklamačního řádu, Patičky, Pokladny i QR plateb.
      </p>
      <form className="admin-form" onSubmit={(e) => { e.preventDefault(); void api("/admin/settings", { method: "PUT", body: JSON.stringify(form) }).then(() => { toast("Uloženo."); void refresh(); }); }}>
        {keys.map(([k, label]) => (
          <label key={k} className={k.includes("hero") || k.includes("address") || k.includes("registry") || k.includes("return") ? "full" : ""}>
            {label}
            {k.includes("hero_text") ? (
              <textarea value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            ) : k === "resend_api_key" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type={showKey ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  value={form[k] || ""}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  placeholder="re_…"
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
        <div className="full">
          <button className="btn-dark" type="submit">Uložit nastavení</button>
        </div>
      </form>
    </>
  );
}

function FeedsPage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const feeds = [
    { name: "Heureka.cz", path: "/heureka.xml", hint: "Heureka → XML feed produktů (stejný i na /api/feeds/heureka.xml)" },
    { name: "Zboží.cz", path: "/zbozi.xml", hint: "Seznam Zboží.cz → XML import" },
    { name: "Google Shopping", path: "/google-shopping.xml", hint: "Google Merchant Center → Products → Feeds" },
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
