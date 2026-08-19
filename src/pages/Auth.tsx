import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../api";
import { useStore } from "../store";
import { usePageTitle } from "../title";

function safeNext(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "";
  return raw;
}

export function Login() {
  usePageTitle("Přihlášení — KAVKA");
  const { user, login } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const next = safeNext(new URLSearchParams(loc.search).get("next"));
  if (user) return <Navigate to={user.role === "admin" && !next ? "/admin" : next || "/ucet"} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await login(email, password);
      nav(next || "/ucet");
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
        Nemáte účet? <Link to={next ? `/registrace?next=${encodeURIComponent(next)}` : "/registrace"}>Registrace</Link>
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
  usePageTitle("Registrace — KAVKA");
  const { user, register } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState("");
  const next = safeNext(new URLSearchParams(loc.search).get("next"));
  if (user) return <Navigate to={next || "/ucet"} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      await register(form);
      nav(next || "/ucet");
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
        Už u nás jste? <Link to={next ? `/prihlaseni?next=${encodeURIComponent(next)}` : "/prihlaseni"}>Přihlášení</Link>
      </p>
    </div>
  );
}
