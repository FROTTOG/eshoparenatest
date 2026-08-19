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
        {user.role === "admin" && <NavLink to="/admin">Administrace</NavLink>}
        <button onClick={() => void logout()}>Odhlásit</button>
      </nav>
      <div>
        {rest.startsWith("objednavky") ? <Orders /> : rest.startsWith("adresy") ? <Addresses /> : <Profile />}
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
                <td>
                  <Link to={`/objednavka/${o.number}`}>{o.number}</Link>
                </td>
                <td>{dateCs(o.created_at)}</td>
                <td>
                  <span className={`tag ${o.status}`}>{statusLabel(o.status)}</span>
                </td>
                <td>{statusLabel(o.payment_status)}</td>
                <td>{czk(o.total)}</td>
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
