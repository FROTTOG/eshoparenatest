import { FormEvent, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { Logo } from "./Ui";

export function Layout() {
  const { user, cart, settings, toasts } = useStore();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const nav = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Po přechodu na jinou stránku vždy začni nahoře.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  function search(e: FormEvent) {
    e.preventDefault();
    nav(`/katalog?q=${encodeURIComponent(q)}`);
    setOpen(false);
  }

  return (
    <div className="page">
      <header className={`header${scrolled ? " scrolled" : ""}`}>
        <div className="header-in">
          <Logo />
          <nav className={`nav ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
            <NavLink to="/katalog">Katalog</NavLink>
            <NavLink to="/doprava-a-platba">Doprava</NavLink>
            <NavLink to="/o-nas">O nás</NavLink>
            <NavLink to="/sledovani">Sledování</NavLink>
          </nav>
          <div className="header-actions">
            <form className="search-form" onSubmit={search}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledat…" aria-label="Hledat" />
            </form>
            <Link to={user ? "/ucet" : "/prihlaseni"} className="icon-btn" title={user ? user.name : "Přihlášení"} aria-label="Účet">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="10" cy="7" r="3.2" />
                <path d="M3.5 17c1.4-3.2 3.8-4.6 6.5-4.6S15.1 13.8 16.5 17" />
              </svg>
            </Link>
            {user?.role === "admin" && (
              <Link to="/admin" className="icon-btn" title="Administrace" aria-label="Administrace">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M4 6h12M4 10h12M4 14h8" />
                </svg>
              </Link>
            )}
            <Link to="/kosik" className="icon-btn" aria-label="Košík">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M3 5h2l1.6 9h9.2l1.6-6H7" />
                <circle cx="9" cy="16.5" r="1" fill="currentColor" />
                <circle cx="15" cy="16.5" r="1" fill="currentColor" />
              </svg>
              {(cart?.count || 0) > 0 && (
                <span className="badge" key={cart?.count}>
                  {cart?.count}
                </span>
              )}
            </Link>
            <button className="icon-btn hamburger" onClick={() => setOpen((v) => !v)} aria-label="Menu">
              ☰
            </button>
          </div>
        </div>
      </header>
      <main key={location.pathname} className="page-fade">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="wrap footer-grid">
          <div>
            <Logo />
            <p style={{ marginTop: 14, maxWidth: 280 }}>
              {settings.store_tagline || "Věci s charakterem."} Ateliér a e-shop. Posíláme po celé republice.
            </p>
            <p>
              {settings.store_address}
              <br />
              {settings.store_hours}
            </p>
          </div>
          <div>
            <h3>Obchod</h3>
            <ul>
              <li><Link to="/katalog">Katalog</Link></li>
              <li><Link to="/doprava-a-platba">Doprava a platba</Link></li>
              <li><Link to="/sledovani">Sledovat objednávku</Link></li>
              <li><Link to="/ucet">Můj účet</Link></li>
            </ul>
          </div>
          <div>
            <h3>Informace</h3>
            <ul>
              <li><Link to="/o-nas">O nás</Link></li>
              <li><Link to="/obchodni-podminky">Obchodní podmínky</Link></li>
              <li><Link to="/ochrana-udaju">Ochrana údajů</Link></li>
              <li><Link to="/reklamace">Reklamace a vrácení</Link></li>
            </ul>
          </div>
          <div>
            <h3>Kontakt</h3>
            <p>
              {settings.store_email || "ahoj@kavka.shop"}
              <br />
              {settings.store_phone || "+420 777 123 456"}
            </p>
          </div>
        </div>
        <div className="wrap footer-bottom">
          <span>© {new Date().getFullYear()} {settings.store_name || "KAVKA"}</span>
          <span>Běží na Cloudflare Pages · D1 · R2</span>
        </div>
      </footer>
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind || ""}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
