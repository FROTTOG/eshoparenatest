import { FormEvent, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { IconAdmin, IconCart, IconClose, IconMail, IconMenu, IconPhone, IconSearch, IconUser } from "./Icons";
import { Logo } from "./Ui";

export function Layout() {
  const { user, cart, settings, toasts } = useStore();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    setOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open || searchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, searchOpen]);

  function search(e: FormEvent) {
    e.preventDefault();
    nav(`/katalog?q=${encodeURIComponent(q)}`);
    setOpen(false);
    setSearchOpen(false);
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
            <form className="search-form mobile-only" onSubmit={search}>
              <IconSearch size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledat v ateliéru…" aria-label="Hledat" />
            </form>
          </nav>
          <div className="header-actions">
            <form className="search-form desktop-only" onSubmit={search}>
              <IconSearch size={16} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledat…" aria-label="Hledat" />
            </form>
            <button type="button" className="icon-btn mobile-search" onClick={() => setSearchOpen(true)} aria-label="Hledat">
              <IconSearch />
            </button>
            <Link to={user ? "/ucet" : "/prihlaseni"} className="icon-btn" title={user ? user.name : "Přihlášení"} aria-label="Účet">
              <IconUser />
            </Link>
            {user?.role === "admin" && (
              <Link to="/admin" className="icon-btn" title="Administrace" aria-label="Administrace">
                <IconAdmin />
              </Link>
            )}
            <Link to="/kosik" className="icon-btn" aria-label="Košík">
              <IconCart />
              {(cart?.count || 0) > 0 && (
                <span className="badge" key={cart?.count}>
                  {cart?.count}
                </span>
              )}
            </Link>
            <button className={`icon-btn hamburger${open ? " is-open" : ""}`} onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open}>
              {open ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="search-overlay" onClick={() => setSearchOpen(false)}>
          <form className="search-overlay-form glass-card" onClick={(e) => e.stopPropagation()} onSubmit={search}>
            <IconSearch />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hrnek, deka, vůně…" aria-label="Hledat" />
            <button className="btn" type="submit">
              Hledat
            </button>
          </form>
        </div>
      )}

      <main key={location.pathname} className="page-fade">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="wrap footer-grid">
          <div>
            <Logo />
            <p style={{ marginTop: 14, maxWidth: 300 }}>
              {settings.store_tagline || "Věci s charakterem."} Ateliér na Vinohradech a e-shop, který posílá po celé republice.
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
              <li>
                <Link to="/katalog">Katalog</Link>
              </li>
              <li>
                <Link to="/doprava-a-platba">Doprava a platba</Link>
              </li>
              <li>
                <Link to="/sledovani">Sledovat objednávku</Link>
              </li>
              <li>
                <Link to="/ucet">Můj účet</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Informace</h3>
            <ul>
              <li>
                <Link to="/o-nas">O nás</Link>
              </li>
              <li>
                <Link to="/obchodni-podminky">Obchodní podmínky</Link>
              </li>
              <li>
                <Link to="/ochrana-udaju">Ochrana údajů</Link>
              </li>
              <li>
                <Link to="/reklamace">Reklamace a vrácení</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Napište nám</h3>
            <p className="footer-contact">
              <span>
                <IconMail size={16} /> {settings.store_email || "ahoj@kavka.shop"}
              </span>
              <span>
                <IconPhone size={16} /> {settings.store_phone || "+420 777 123 456"}
              </span>
            </p>
          </div>
        </div>
        <div className="wrap footer-bottom">
          <span>© {new Date().getFullYear()} {settings.store_name || "KAVKA"}</span>
          <span>Ateliér · Zásilkovna · Balíkovna</span>
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
