import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { api, ApiError, type Order, type Product } from "../api";
import { IconClose, IconMenu } from "../components/Icons";
import { Logo } from "../components/Ui";
import { czk, dateCs, statusLabel } from "../format";
import { useStore } from "../store";

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
          <NavLink to="/admin/zakaznici">Zákazníci</NavLink>
          <NavLink to="/admin/kupony">Kupóny</NavLink>
          <NavLink to="/admin/hodnoceni">Hodnocení</NavLink>
          <NavLink to="/admin/doprava">Doprava</NavLink>
          <NavLink to="/admin/vydejni-mista">Výdejní místa</NavLink>
          <NavLink to="/admin/platby">Platby</NavLink>
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
          <Route path="zakaznici" element={<Customers />} />
          <Route path="kupony" element={<Coupons />} />
          <Route path="hodnoceni" element={<Reviews />} />
          <Route path="doprava" element={<Shipping />} />
          <Route path="vydejni-mista" element={<Points />} />
          <Route path="platby" element={<Payments />} />
          <Route path="nastaveni" element={<SettingsPage />} />
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
                <td><Link to={`/admin/produkty/${p.id}`}>{p.name}</Link></td>
                <td>{p.sku}</td>
                <td>{p.stock}</td>
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
                <td><Link to={`/admin/objednavky/${o.id}`}>{o.number}</Link></td>
                <td>{o.name}</td>
                <td><span className={`tag ${o.status}`}>{statusLabel(o.status)}</span></td>
                <td>{czk(o.total)}</td>
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
                <td>{p.image ? <img src={p.image} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 }} /> : null}</td>
                <td><Link to={`/admin/produkty/${p.id}`}>{p.name}</Link></td>
                <td>{p.sku}</td>
                <td>{czk(p.price)}</td>
                <td>{p.stock}</td>
                <td>{p.active ? "ano" : "ne"}</td>
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

  async function upload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await api<{ url: string }>("/admin/upload", { method: "POST", body: fd });
      setForm((f) => ({ ...f, image: r.url }));
      toast("Fotka je v R2.");
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
                <td><Link to={`/admin/objednavky/${o.id}`}>{o.number}</Link></td>
                <td>{o.name}<br /><small>{o.email}</small></td>
                <td><span className={`tag ${o.status}`}>{statusLabel(o.status)}</span></td>
                <td>{statusLabel(o.payment_status)}</td>
                <td>{czk(o.total)}</td>
                <td>{dateCs(o.created_at)}</td>
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
                <td>{u.name}</td><td>{u.email}<br /><small>{u.phone}</small></td>
                <td>{u.role}</td><td>{u.orders}</td><td>{czk(u.spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Coupons() {
  const [rows, setRows] = useState<{ id: number; code: string; type: string; value: number; min_order: number; max_uses: number | null; used_count: number; active: number; description: string }[]>([]);
  const [form, setForm] = useState({ code: "", type: "percent", value: 10, min_order: 0, max_uses: 100, description: "" });
  const load = () => void api<typeof rows>("/admin/coupons").then(setRows);
  useEffect(() => { load(); }, []);
  return (
    <>
      <h1>Kupóny</h1>
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

function SettingsPage() {
  const { toast, refresh } = useStore();
  const [form, setForm] = useState<Record<string, string>>({});
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
            ) : (
              <input value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            )}
          </label>
        ))}
        <div className="full">
          <button className="btn-dark" type="submit">Uložit nastavení</button>
        </div>
      </form>
    </>
  );
}
