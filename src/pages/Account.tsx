import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, NavLink, useLocation } from "react-router-dom";
import { api, ApiError, type GiftVoucher, type Order } from "../api";
import {
  IconAdmin,
  IconCheck,
  IconClock,
  IconCopy,
  IconGift,
  IconHeart,
  IconLogout,
  IconMail,
  IconMapPin,
  IconPhone,
  IconTrash,
  IconUser,
  IconWrench,
} from "../components/Icons";
import { czk, dateCs, statusLabel } from "../format";
import { useStore } from "../store";
import { usePageTitle } from "../title";

/** Iniciály zákazníka do kolečka avataru. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

export function Account() {
  const { user, logout, wishlist, ready } = useStore();
  const loc = useLocation();
  usePageTitle("Můj účet — KAVKA");
  // Dokud se nenačte přihlášení, nikam neodskakujeme — jinak by obnovení
  // stránky v účtu vždy blesklo přihlašovacím formulářem.
  if (!ready) return <div className="wrap empty">Načítám váš účet…</div>;
  if (!user) return <Navigate to="/prihlaseni" replace />;
  const rest = loc.pathname.replace(/^\/ucet\/?/, "");

  return (
    <div className="wrap account-page">
      {/* Hlavička účtu — avatar, jméno a rychlé údaje */}
      <header className="account-hero">
        <span className="account-avatar" aria-hidden="true">
          {initials(user.name) || <IconUser size={22} />}
        </span>
        <div className="account-hero-body">
          <h1 className="serif">{user.name}</h1>
          <p className="account-hero-meta">
            <span>
              <IconMail size={15} /> {user.email}
            </span>
            {user.phone && (
              <span>
                <IconPhone size={15} /> {user.phone}
              </span>
            )}
            {user.customer_group === "b2b" && <span className="account-badge">Velkoobchod</span>}
            {user.role === "admin" && <span className="account-badge admin">Správce</span>}
          </p>
        </div>
        <div className="account-hero-actions">
          <Link to="/oblibene" className="btn-line btn-sm">
            <IconHeart size={15} /> Oblíbené{wishlist.length ? ` (${wishlist.length})` : ""}
          </Link>
          <button type="button" className="btn-line btn-sm" onClick={() => void logout()}>
            <IconLogout size={15} /> Odhlásit
          </button>
        </div>
      </header>

      <div className="account-grid">
        <nav className="side-nav account-nav" aria-label="Sekce účtu">
          <NavLink to="/ucet" end>
            <IconUser size={17} /> <span>Profil</span>
          </NavLink>
          <NavLink to="/ucet/objednavky">
            <IconClock size={17} /> <span>Objednávky</span>
          </NavLink>
          <NavLink to="/ucet/adresy">
            <IconMapPin size={17} /> <span>Adresy</span>
          </NavLink>
          <NavLink to="/ucet/poukazy">
            <IconGift size={17} /> <span>Dárkové poukazy</span>
          </NavLink>
          <NavLink to="/ucet/reklamace">
            <IconWrench size={17} /> <span>Reklamace</span>
          </NavLink>
          {user.role === "admin" && (
            <NavLink to="/admin">
              <IconAdmin size={17} /> <span>Administrace</span>
            </NavLink>
          )}
          <button type="button" onClick={() => void logout()}>
            <IconLogout size={17} /> <span>Odhlásit</span>
          </button>
        </nav>
        <div className="account-body">
          {rest.startsWith("objednavky") ? (
            <Orders />
          ) : rest.startsWith("adresy") ? (
            <Addresses />
          ) : rest.startsWith("poukazy") ? (
            <Vouchers />
          ) : rest.startsWith("reklamace") ? (
            <Claims />
          ) : (
            <Profile />
          )}
        </div>
      </div>
    </div>
  );
}

function Profile() {
  const { user, toast, refresh } = useStore();
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "", password: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState<{ orders: number; spent: number } | null>(null);

  useEffect(() => {
    void api<Order[]>("/orders")
      .then((rows) => setStats({ orders: rows.length, spent: rows.reduce((sum, o) => sum + (o.status === "cancelled" ? 0 : o.total), 0) }))
      .catch(() => setStats(null));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/account", { method: "PATCH", body: JSON.stringify(form) });
      await refresh();
      setForm((f) => ({ ...f, password: "" }));
      setDone(true);
      window.setTimeout(() => setDone(false), 2500);
      toast("Změny v profilu jsou uložené.");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Uložení se nepovedlo.", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="account-cards">
        <div className="account-card">
          <span className="account-card-icon">
            <IconClock size={18} />
          </span>
          <b>{stats ? stats.orders : "—"}</b>
          <small>Objednávek celkem</small>
        </div>
        <div className="account-card">
          <span className="account-card-icon gold">
            <IconGift size={18} />
          </span>
          <b>{stats ? czk(stats.spent) : "—"}</b>
          <small>Utraceno v ateliéru</small>
        </div>
        <div className="account-card">
          <span className="account-card-icon forest">
            <IconUser size={18} />
          </span>
          <b>{user?.customer_group === "b2b" ? "Velkoobchod" : "Běžný zákazník"}</b>
          <small>Cenová skupina</small>
        </div>
      </div>

      {user?.customer_group === "b2b" && (
        <p className="b2b-banner" style={{ maxWidth: 520 }}>
          <b>Velkoobchodní účet</b>
          <span>Ceny v e-shopu vidíte ve svém velkoobchodním ceníku bez DPH.</span>
        </p>
      )}

      <section className="account-section">
        <h2 className="account-section-title">
          <IconUser size={18} /> Osobní údaje
        </h2>
        <form className="form" onSubmit={save}>
          <label>
            Jméno a příjmení
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            Telefon
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            Nové heslo (prázdné = beze změny)
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="min. 8 znaků"
            />
          </label>
          <div className="save-row">
            <button className="btn-dark" disabled={busy}>
              {busy ? "Ukládám…" : "Uložit změny"}
            </button>
            {done && (
              <span className="save-ok">
                <IconCheck size={15} /> Uloženo
              </span>
            )}
          </div>
        </form>
      </section>
    </>
  );
}

function Orders() {
  const [rows, setRows] = useState<Order[] | null>(null);
  useEffect(() => {
    void api<Order[]>("/orders").then(setRows).catch(() => setRows([]));
  }, []);
  if (!rows) return <p className="empty">Načítám objednávky…</p>;
  if (!rows.length)
    return (
      <div className="empty account-empty">
        <IconClock size={26} />
        <h2 className="serif">Zatím žádná objednávka</h2>
        <p>Až něco pošleme, najdete tu celou historii i sledování zásilky.</p>
        <Link className="btn" to="/katalog">
          Do katalogu
        </Link>
      </div>
    );
  return (
    <section className="account-section">
      <h2 className="account-section-title">
        <IconClock size={18} /> Historie objednávek
      </h2>
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
    </section>
  );
}

function Addresses() {
  const { toast } = useStore();
  const [rows, setRows] = useState<{ id: number; label: string; name: string; street: string; city: string; zip: string; phone: string }[]>([]);
  const [form, setForm] = useState({ label: "Domů", name: "", street: "", city: "", zip: "", phone: "", is_default: true });
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await api<{ addresses: typeof rows }>("/account");
    setRows(r.addresses);
  }
  useEffect(() => {
    void load();
  }, []);

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api<{ addresses: typeof rows }>("/account/addresses", { method: "POST", body: JSON.stringify(form) });
      setRows(r.addresses);
      setForm({ label: "Domů", name: "", street: "", city: "", zip: "", phone: "", is_default: false });
      toast("Adresa přidána.");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Adresu se nepodařilo uložit.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      const r = await api<{ addresses: typeof rows }>(`/account/addresses/${id}`, { method: "DELETE" });
      setRows(r.addresses);
      toast("Adresa smazána.");
    } catch {
      toast("Adresu se nepodařilo smazat.", "err");
    }
  }

  return (
    <section className="account-section">
      <h2 className="account-section-title">
        <IconMapPin size={18} /> Uložené adresy
      </h2>
      {rows.length > 0 ? (
        <div className="address-grid">
          {rows.map((a) => (
            <div key={a.id} className="address-card">
              <span className="address-card-icon">
                <IconMapPin size={16} />
              </span>
              <div>
                <b>{a.label}</b>
                <p>
                  {a.name}
                  <br />
                  {a.street}
                  <br />
                  {a.zip} {a.city}
                </p>
              </div>
              <button type="button" className="icon-btn danger" onClick={() => void remove(a.id)} aria-label={`Smazat adresu ${a.label}`}>
                <IconTrash size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty">Zatím tu žádná adresa není — přidejte první níže.</p>
      )}
      <form className="form" onSubmit={add} style={{ marginTop: 18 }}>
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
        <button className="btn-dark" disabled={busy}>
          {busy ? "Ukládám…" : "Přidat adresu"}
        </button>
      </form>
    </section>
  );
}

/** Dárkové poukazy zákazníka — kód se ukáže po zaplacení objednávky. */
function Vouchers() {
  const { toast } = useStore();
  const [rows, setRows] = useState<GiftVoucher[] | null>(null);
  useEffect(() => {
    void api<GiftVoucher[]>("/account/vouchers").then(setRows).catch(() => setRows([]));
  }, []);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast("Kód zkopírován do schránky.");
    } catch {
      toast("Kód se nepodařilo zkopírovat.", "err");
    }
  }

  if (!rows) return <p className="empty">Načítám poukazy…</p>;
  if (!rows.length)
    return (
      <div className="empty account-empty">
        <IconGift size={26} />
        <h2 className="serif">Zatím žádný dárkový poukaz</h2>
        <p>Poukaz koupíte v katalogu. Po zaplacení vám kód přijde e-mailem a objeví se i tady.</p>
        <Link className="btn" to="/katalog?tags=d%C3%A1rkov%C3%BD%20poukaz">
          Vybrat poukaz
        </Link>
      </div>
    );

  return (
    <section className="account-section">
      <h2 className="account-section-title">
        <IconGift size={18} /> Dárkové poukazy
      </h2>
      <div className="voucher-grid">
        {rows.map((v) => {
          const used = (v.used_count || 0) > 0;
          return (
            <div key={v.id} className={`voucher-card${used ? " used" : ""}`}>
              <div className="voucher-top">
                <span className="voucher-amount">{czk(v.amount)}</span>
                <span className={`voucher-state ${used ? "used" : v.status}`}>
                  {used ? "Uplatněno" : v.status === "sent" ? "Aktivní" : "Čeká na zaplacení"}
                </span>
              </div>
              {v.code ? (
                <button type="button" className="voucher-code" onClick={() => void copy(v.code)} title="Zkopírovat kód">
                  <code>{v.code}</code>
                  <IconCopy size={15} />
                </button>
              ) : (
                <p className="voucher-hint">Kód pošleme e-mailem, jakmile bude objednávka zaplacená.</p>
              )}
              <small>
                {v.order_number ? `Objednávka ${v.order_number} · ` : ""}
                {v.valid_to ? `platnost do ${dateCs(v.valid_to)}` : "bez omezení platnosti"}
              </small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Claims() {
  const { toast } = useStore();
  const [rows, setRows] = useState<{ id: number; order_number: string; reason: string; description: string; status: string; created_at: string }[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState({ order_number: "", reason: "poškozené", description: "" });
  const load = () => void api<typeof rows>("/claims").then(setRows);
  useEffect(() => {
    load();
    void api<Order[]>("/orders").then(setOrders).catch(() => {});
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/claims", { method: "POST", body: JSON.stringify(form) });
      toast("Reklamace odeslána. Ozveme se e-mailem.");
      setForm({ order_number: "", reason: "poškozené", description: "" });
      load();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Chyba", "err");
    }
  }
  return (
    <section className="account-section">
      <h2 className="account-section-title">
        <IconWrench size={18} /> Reklamace
      </h2>
      <p style={{ color: "var(--muted)" }}>Podejte reklamaci ke své objednávce. Stav vyřízení sledujete níže.</p>
      <form className="form" onSubmit={submit}>
        <label>
          Číslo objednávky (nepovinné)
          <select value={form.order_number} onChange={(e) => setForm({ ...form, order_number: e.target.value })}>
            <option value="">— bez vazby / vyberte</option>
            {orders.map((o) => (
              <option key={o.id} value={o.number}>
                {o.number} · {dateCs(o.created_at)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Důvod
          <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
            <option value="poškozené">Poškozené při přepravě</option>
            <option value="nesprávné">Nesprávné zboží</option>
            <option value="nefunkční">Nefunkční / vada</option>
            <option value="jiné">Jiné</option>
          </select>
        </label>
        <label>
          Popis
          <textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </label>
        <button className="btn-dark" type="submit">
          Odeslat reklamaci
        </button>
      </form>
      <div style={{ marginTop: 18 }}>
        {rows.map((r) => (
          <div key={r.id} className="review">
            <b>
              {r.order_number || "—"} · {r.reason}
            </b>{" "}
            <span className="tag" style={{ marginLeft: 8 }}>
              {r.status}
            </span>
            <p>{r.description}</p>
            <small>{dateCs(r.created_at)}</small>
          </div>
        ))}
        {!rows.length && <p className="empty">Zatím žádná reklamace.</p>}
      </div>
    </section>
  );
}
