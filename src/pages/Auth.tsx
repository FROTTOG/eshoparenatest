import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api";
import { useStore } from "../store";
import { usePageTitle } from "../title";

function safeNext(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "";
  return raw;
}

export function Login() {
  usePageTitle("Přihlášení — KAVKA");
  const { user, login, refresh } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [otp, setOtp] = useState<{ challenge: string; email: string } | null>(null);
  const [code, setCode] = useState("");
  const next = safeNext(new URLSearchParams(loc.search).get("next"));
  if (user) return <Navigate to={user.role === "admin" && !next ? "/admin" : next || "/ucet"} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const r = await api<{ user?: unknown; need_otp?: boolean; challenge?: string; email?: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (r.need_otp && r.challenge) {
        setOtp({ challenge: r.challenge, email: r.email || email });
        return;
      }
      await login(email, password);
      nav(next || "/ucet");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Přihlášení selhalo.");
    }
  }

  async function submitOtp(e: FormEvent) {
    e.preventDefault();
    if (!otp) return;
    setErr("");
    try {
      await api("/auth/otp", { method: "POST", body: JSON.stringify({ challenge: otp.challenge, code }) });
      await refresh();
      nav(next || "/ucet");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Ověření selhalo.");
    }
  }

  if (otp) {
    return (
      <div className="auth-wrap">
        <h1>Dvoufázové ověření</h1>
        <p style={{ color: "var(--muted)" }}>
          Účet <b>{otp.email}</b> má zapnuté dvoufázové ověření. Zadejte 6místný kód z autentizační aplikace.
        </p>
        <form className="form" onSubmit={submitOtp}>
          <label>
            Ověřovací kód
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
            />
          </label>
          {err && <div className="err">{err}</div>}
          <button className="btn-dark" type="submit">
            Ověřit a přihlásit
          </button>
          <button type="button" className="linkish" style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => { setOtp(null); setErr(""); }}>
            ← Zpět k přihlášení
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <h1>Vítejte zpátky</h1>
      <p style={{ color: "var(--muted)" }}>Stejný formulář pro zákazníka i správce ateliéru.</p>
      <form className="form" onSubmit={onSubmit}>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </label>
        <label>
          Heslo
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {err && <div className="err" role="alert">{err}</div>}
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
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoComplete="name" />
        </label>
        <label>
          E-mail
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
        </label>
        <label>
          Telefon
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" />
        </label>
        <label>
          Heslo (min. 8 znaků)
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} autoComplete="new-password" />
        </label>
        {err && <div className="err" role="alert">{err}</div>}
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
