import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api";
import { useStore } from "../store";

export function Login() {
  const { user, login } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  if (user) return <Navigate to={user.role === "admin" && loc.pathname === "/prihlaseni" ? "/admin" : "/ucet"} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await login(email, password);
      nav("/ucet");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Přihlášení selhalo.");
    }
  }

  return (
    <div className="auth-wrap">
      <h1>Vítejte zpátky</h1>
      <p style={{ color: "var(--muted)" }}>Stejný formulář pro zákazníka i správce ateliéru.</p>
      <form className="form" onSubmit={onSubmit}>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Heslo
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {err && <div className="err">{err}</div>}
        <button className="btn-dark" type="submit">
          Vstoupit
        </button>
      </form>
      <p>
        Nemáte účet? <Link to="/registrace">Registrace</Link>
      </p>
      <p style={{ fontSize: 13, color: "var(--muted)" }}>
        Ukázkový správce: <code>admin@kavka.shop</code> / <code>KavkaAdmin123</code>
        <br />
        Ukázková zákaznice: <code>anna@example.com</code> / <code>Anna12345</code>
      </p>
    </div>
  );
}

export function Register() {
  const { user, register } = useStore();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState("");
  if (user) return <Navigate to="/ucet" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await register(form);
      nav("/ucet");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Registrace selhala.");
    }
  }

  return (
    <div className="auth-wrap">
      <h1>Založit účet</h1>
      <p style={{ color: "var(--muted)" }}>Ať se vám nákup, adresy i hodnocení vracejí samy.</p>
      <form className="form" onSubmit={onSubmit}>
        <label>
          Jméno a příjmení
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          E-mail
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label>
          Telefon
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </label>
        <label>
          Heslo (min. 8 znaků)
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
        </label>
        {err && <div className="err">{err}</div>}
        <button className="btn-dark" type="submit">
          Vytvořit účet
        </button>
      </form>
      <p>
        Už u nás jste? <Link to="/prihlaseni">Přihlášení</Link>
      </p>
    </div>
  );
}
