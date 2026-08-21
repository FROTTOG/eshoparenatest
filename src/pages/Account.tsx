import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, NavLink, useLocation } from "react-router-dom";
import { api, type Order } from "../api";
import { czk, dateCs, statusLabel } from "../format";
import { useStore } from "../store";

export function Account() {
  const { user, logout } = useStore();
  const loc = useLocation();
  if (!user) return <Navigate to="/prihlaseni" replace />;
  const rest = loc.pathname.replace(/^\/ucet\/?/, "");
  return (
    <div className="wrap account-grid">
      <nav className="side-nav">
        <NavLink to="/ucet" end>
          Profil
        </NavLink>
        <NavLink to="/ucet/objednavky">Objednávky</NavLink>
        <NavLink to="/ucet/adresy">Adresy</NavLink>
        <NavLink to="/ucet/reklamace">Reklamace</NavLink>
        {user.role === "admin" && <NavLink to="/admin">Administrace</NavLink>}
        <button onClick={() => void logout()}>Odhlásit</button>
      </nav>
      <div>
        {rest.startsWith("objednavky") ? <Orders /> : rest.startsWith("adresy") ? <Addresses /> : rest.startsWith("reklamace") ? <Claims /> : <Profile />}
      </div>
    </div>
  );
}

function Profile() {
  const { user, toast, refresh } = useStore();
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "", password: "" });

  async function save(e: FormEvent) {
    e.preventDefault();
    await api("/account", { method: "PATCH", body: JSON.stringify(form) });
    await refresh();
    toast("Uloženo.");
  }

  return (
    <>
      <h1 className="serif">Dobrý den, {user?.name.split(" ")[0]}</h1>
      {user?.customer_group === "b2b" && (
        <p className="b2b-banner" style={{ maxWidth: 520 }}>
          <b>Velkoobchodní účet</b>
          <span>Ceny v e-shopu vidíte ve svém velkoobchodním ceníku bez DPH.</span>
        </p>
      )}
      <form className="form" onSubmit={save}>
        <label>
          Jméno
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label>
          Telefon
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label>
          Nové heslo (prázdné = beze změny)
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button className="btn-dark">Uložit</button>
      </form>
    </>
  );
}

function Orders() {
  const [rows, setRows] = useState<Order[]>([]);
  useEffect(() => {
    void api<Order[]>("/orders").then(setRows);
  }, []);
  if (!rows.length) return <p className="empty">Zatím žádná objednávka.</p>;
  return (
    <>
      <h1 className="serif">Historie objednávek</h1>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Číslo</th>
              <th>Datum</th>
              <th>Stav</th>
              <th>Platba</th>
              <th>Celkem</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td data-label="Číslo">
                  <Link to={`/objednavka/${o.number}`}>{o.number}</Link>
                </td>
                <td data-label="Datum">{dateCs(o.created_at)}</td>
                <td data-label="Stav">
                  <span className={`tag ${o.status}`}>{statusLabel(o.status)}</span>
                </td>
                <td data-label="Platba">{statusLabel(o.payment_status)}</td>
                <td data-label="Celkem">{czk(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Addresses() {
  const [rows, setRows] = useState<{ id: number; label: string; name: string; street: string; city: string; zip: string; phone: string }[]>([]);
  const [form, setForm] = useState({ label: "Domů", name: "", street: "", city: "", zip: "", phone: "", is_default: true });

  async function load() {
    const r = await api<{ addresses: typeof rows }>("/account");
    setRows(r.addresses);
  }
  useEffect(() => {
    void load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    const r = await api<{ addresses: typeof rows }>("/account/addresses", { method: "POST", body: JSON.stringify(form) });
    setRows(r.addresses);
  }

  return (
    <>
      <h1 className="serif">Adresy</h1>
      {rows.map((a) => (
        <div key={a.id} className="review" style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <b>{a.label}</b>
            <div>
              {a.name}
              <br />
              {a.street}
              <br />
              {a.zip} {a.city}
            </div>
          </div>
          <button
            className="linkish"
            onClick={() => void api(`/account/addresses/${a.id}`, { method: "DELETE" }).then((r) => setRows((r as { addresses: typeof rows }).addresses))}
          >
            Smazat
          </button>
        </div>
      ))}
      <form className="form" onSubmit={add}>
        <h3 className="serif" style={{ margin: 0 }}>
          Nová adresa
        </h3>
        <label>
          Štítek
          <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        </label>
        <label>
          Jméno
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          Ulice
          <input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} required />
        </label>
        <label>
          Město
          <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
        </label>
        <label>
          PSČ
          <input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} required />
        </label>
        <button className="btn-dark">Přidat</button>
      </form>
    </>
  );
}

function Claims() {
  const { toast } = useStore();
  const [rows, setRows] = useState<{ id: number; order_number: string; reason: string; description: string; status: string; created_at: string }[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState({ order_number: "", reason: "poškozené", description: "" });
  const load = () => void api<typeof rows>("/claims").then(setRows);
  useEffect(() => { load(); void api<Order[]>("/orders").then(setOrders).catch(()=>{}); }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    try { await api("/claims", { method: "POST", body: JSON.stringify(form) }); toast("Reklamace odeslána. Ozveme se e-mailem."); setForm({ order_number: "", reason: "poškozené", description: "" }); load(); }
    catch (err: unknown) { toast(err instanceof Error ? err.message : "Chyba", "err"); }
  }
  return (
    <>
      <h1 className="serif">Reklamace</h1>
      <p style={{ color: "var(--muted)" }}>Přihlášení zákazníci zde mohou podat reklamaci ke své objednávce. Stav vyřízení sledujete níže.</p>
      <form className="form" onSubmit={submit}>
        <label>Číslo objednávky (nepovinné)
          <select value={form.order_number} onChange={(e) => setForm({...form, order_number: e.target.value})}>
            <option value="">— bez vazby / vyberte</option>
            {orders.map(o=> <option key={o.id} value={o.number}>{o.number} · {dateCs(o.created_at)}</option>)}
          </select>
        </label>
        <label>Důvod
          <select value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})}>
            <option value="poškozené">Poškozené při přepravě</option>
            <option value="nesprávné">Nesprávné zboží</option>
            <option value="nefunkční">Nefunkční / vada</option>
            <option value="jiné">Jiné</option>
          </select>
        </label>
        <label>Popis <textarea rows={4} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} required /></label>
        <button className="btn-dark" type="submit">Odeslat reklamaci</button>
      </form>
      <div style={{ marginTop: 18 }}>
        {rows.map(r=> <div key={r.id} className="review"><b>{r.order_number || "—"} · {r.reason}</b> <span className="tag" style={{ marginLeft: 8 }}>{r.status}</span><p>{r.description}</p><small>{dateCs(r.created_at)}</small></div>)}
        {!rows.length && <p className="empty">Zatím žádná reklamace.</p>}
      </div>
    </>
  );
}
