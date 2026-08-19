import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useStore } from "../store";
import { IconAdmin, IconCart, IconClose, IconCookie, IconHeart, IconMail, IconMenu, IconPhone, IconSearch, IconUser } from "./Icons";
import { CookieBanner, openCookieSettings } from "./CookieBanner";
import { SearchBox } from "./SearchBox";
import { Logo } from "./Ui";

export function Layout() {
  const { user, cart, settings, toasts, wishlist } = useStore();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
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

  const company = settings.store_company || settings.store_name || "KAVKA Ateliér s.r.o.";
  const ico = settings.store_ico || "19200456";
  const dic = settings.store_dic || "CZ19200456";

  return (
    <div className="page">
      <a className="skip-link" href="#obsah">
        Přeskočit na obsah
      </a>
      <header className={`header${scrolled ? " scrolled" : ""}`}>
        <div className="header-in">
          <Logo />
          <nav className={`nav ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
            <NavLink to="/katalog">Katalog</NavLink>
            <NavLink to="/doprava-a-platba">Doprava</NavLink>
            <NavLink to="/o-nas">O nás a kontakt</NavLink>
            <NavLink to="/sledovani">Sledování</NavLink>
            <div className="mobile-only" onClick={(e) => e.stopPropagation()}>
              <SearchBox variant="mobile" onDone={() => setOpen(false)} />
            </div>
          </nav>
          <div className="header-actions">
            <div className="desktop-only">
              <SearchBox />
            </div>
            <button type="button" className="icon-btn mobile-search" onClick={() => setSearchOpen(true)} aria-label="Hledat">
              <IconSearch />
            </button>
            <Link to="/oblibene" className="icon-btn" title="Oblíbené" aria-label="Oblíbené">
              <IconHeart />
              {wishlist.length > 0 && (
                <span className="badge" key={wishlist.length}>
                  {wishlist.length}
                </span>
              )}
            </Link>
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
          <div onClick={(e) => e.stopPropagation()}>
            <SearchBox variant="overlay" onDone={() => setSearchOpen(false)} />
          </div>
        </div>
      )}

      <main id="obsah" key={location.pathname} className="page-fade">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="wrap footer-grid">
          <div>
            <Logo />
            <p style={{ marginTop: 14, maxWidth: 320, fontSize: 13, color: "#cfc4b3" }}>
              <b>{company}</b>
              <br />
              IČO: {ico} | DIČ: {dic}
              <br />
              {settings.store_vat_note || "Plátce DPH"}
            </p>
            <p style={{ fontSize: 13, color: "#9aa396", marginTop: 8 }}>
              {settings.store_address || "Korunní 42, 120 00 Praha 2 - Vinohrady"}
              <br />
              Otevřeno: {settings.store_hours || "Po–Pá 10:00–18:00"}
            </p>
          </div>
          <div>
            <h3>Nákup a servis</h3>
            <ul>
              <li>
                <Link to="/katalog">Katalog produktů</Link>
              </li>
              <li>
                <Link to="/doprava-a-platba">Doprava a platba</Link>
              </li>
              <li>
                <Link to="/sledovani">Sledovat stav objednávky</Link>
              </li>
              <li>
                <Link to="/ucet">Můj zákaznický účet</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Právní informace</h3>
            <ul>
              <li>
                <Link to="/obchodni-podminky">Obchodní podmínky</Link>
              </li>
              <li>
                <Link to="/ochrana-udaju">Ochrana osobních údajů (GDPR)</Link>
              </li>
              <li>
                <Link to="/reklamace">Reklamace a vrácení zboží</Link>
              </li>
              <li>
                <Link to="/o-nas">O nás a kontakty</Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openCookieSettings}
                  className="linkish"
                  style={{ color: "#cfc4b3", textDecoration: "none", fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <IconCookie size={14} /> Nastavení cookies
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h3>Kontakt</h3>
            <p className="footer-contact">
              <span>
                <IconMail size={16} /> <a href={`mailto:${settings.store_email || "ahoj@kavka.shop"}`}>{settings.store_email || "ahoj@kavka.shop"}</a>
              </span>
              <span>
                <IconPhone size={16} /> <a href={`tel:${(settings.store_phone || "+420777123456").replace(/\s+/g, "")}`}>{settings.store_phone || "+420 777 123 456"}</a>
              </span>
            </p>
            <p style={{ fontSize: 12, color: "#9aa396", marginTop: 12 }}>
              Dohledový orgán: Česká obchodní inspekce (ČOI)
            </p>
          </div>
        </div>
        <div className="wrap footer-bottom">
          <span>© {new Date().getFullYear()} {company} · Všechna práva vyhrazena</span>
          <span>Všechny ceny jsou uvedeny včetně DPH</span>
        </div>
      </footer>

      <CookieBanner />

      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind || ""}`}>
            <span>{t.text}</span>
            {t.to && (
              <Link to={t.to} className="toast-link">
                {t.toLabel || "Otevřít"}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
