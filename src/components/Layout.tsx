import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useStore } from "../store";
import { IconAdmin, IconCart, IconClose, IconCookie, IconHeart, IconMail, IconMenu, IconPhone, IconSearch, IconUser } from "./Icons";
import { CookieBanner, openCookieSettings } from "./CookieBanner";
import { SearchBox } from "./SearchBox";
import { Logo } from "./Ui";
import { vendorContact } from "../vendor";

export function Layout() {
  const { user, cart, settings, toasts, wishlist } = useStore();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const headerRef = useRef<HTMLElement>(null);

  // Skutečná výška hlavičky — mobilní menu k ní přesně navazovalo.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = () => {
      document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Zavření menu / vyhledávání klávesou Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const vendor = vendorContact(settings);
  const company = settings.store_company || settings.store_name || "KAVKA Ateliér s.r.o.";
  const ico = settings.store_ico || "19200456";
  const dic = settings.store_dic || "CZ19200456";

  return (
    <div className="page">
      <a className="skip-link" href="#obsah">
        Přeskočit na obsah
      </a>
      <header ref={headerRef} className={`header${scrolled ? " scrolled" : ""}`}>
        <div className="header-in">
          <Logo />
          <nav className={`nav ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
            <NavLink to="/" end>
              Prezentace KAVKA
            </NavLink>
            <NavLink to="/ukazka" className="nav-demo-link">
              Ukázkový E-shop <span className="nav-badge">DEMO</span>
            </NavLink>
            <NavLink to="/katalog">Katalog</NavLink>
            <NavLink to="/doprava-a-platba">Funkce</NavLink>
            <NavLink to="/o-nas">O platformě</NavLink>
            <NavLink to="/sledovani">Sledování</NavLink>
            <div className="saas-nav-cta desktop-only">
              <a href="/#nabidka" className="btn btn-sm" onClick={() => setOpen(false)}>
                Pronajmout KAVKA
              </a>
            </div>
            <div className="mobile-only" onClick={(e) => e.stopPropagation()}>
              <SearchBox variant="mobile" onDone={() => setOpen(false)} />
              <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
                <Link to="/ukazka" className="btn" style={{ textAlign: "center" }} onClick={() => setOpen(false)}>
                  🛍️ Ukázkový E-shop
                </Link>
                <Link to="/admin" className="btn-line" style={{ textAlign: "center" }} onClick={() => setOpen(false)}>
                  ⚙️ Demo Administrace
                </Link>
              </div>
              <p className="nav-note">Demo je 100&nbsp;% zdarma k vyzkoušení. Objednávky jsou testovací.</p>
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
            <a href="/#nabidka" className="btn btn-sm desktop-only" style={{ marginLeft: 4 }}>
              Ceník & Poptávka
            </a>
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
            <p style={{ marginTop: 14, maxWidth: 330, fontSize: 13, color: "#cfc4b3", lineHeight: 1.5 }}>
              <b>KAVKA — e-shop platforma</b>
              <br />
              Živá ukázka, kterou právě prohlížíte, může být zítra váš ostrý obchod. SaaS pronájem nebo prodej na klíč.
            </p>
            <p style={{ fontSize: 12, color: "#9aa396", marginTop: 10, border: "1px solid #3a4d43", borderRadius: 10, padding: "8px 10px", background: "rgba(255,255,255,0.04)" }}>
              <b style={{ color: "#cfc4b3" }}>Demo režim:</b> zboží na této stránce je fiktivní (keramika, len, dřevo). Objednávky slouží k vyzkoušení košíku, dopravy a plateb.
            </p>
            <p style={{ fontSize: 13, color: "#9aa396", marginTop: 12 }}>
              Provozovatel ukázky: {company}
              <br />
              IČO: {ico} | DIČ: {dic}
              <br />
              {settings.store_address || "Korunní 42, 120 00 Praha 2 - Vinohrady"}
            </p>
          </div>
          <div>
            <h3>Ukázkový obchod</h3>
            <ul>
              <li>
                <Link to="/katalog">Procházet katalog (demo)</Link>
              </li>
              <li>
                <Link to="/doprava-a-platba">Co umí doprava a platby</Link>
              </li>
              <li>
                <Link to="/sledovani">Vyzkoušet sledování zásilky</Link>
              </li>
              <li>
                <Link to="/ucet">Zákaznický účet (demo)</Link>
              </li>
              <li>
                <Link to="/admin" style={{ color: "#c4a574" }}>
                  → Vstoupit do dema administrace
                </Link>
              </li>
            </ul>
            <p style={{ fontSize: 12, color: "#9aa396", marginTop: 10 }}>
              Admin: <code style={{ background: "#2f3d37", padding: "2px 6px", borderRadius: 6, color: "#fff" }}>admin@kavka.shop / KavkaAdmin123</code>
            </p>
          </div>
          <div>
            <h3>Právní šablony</h3>
            <ul>
              <li>
                <Link to="/obchodni-podminky">Obchodní podmínky (vzor)</Link>
              </li>
              <li>
                <Link to="/ochrana-udaju">GDPR (vzor)</Link>
              </li>
              <li>
                <Link to="/reklamace">Reklamace a vrácení (vzor)</Link>
              </li>
              <li>
                <Link to="/o-nas">O platformě KAVKA</Link>
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
            <h3>Chci KAVKA pro sebe</h3>
            <p style={{ fontSize: 13, color: "#cfc4b3", marginTop: 0 }}>
              Napíšeme vám do 24 hodin, připravíme klon s vaším logem a naplníme vaše produkty.
            </p>
            <p style={{ fontSize: 13, color: "#cfc4b3", margin: "0 0 8px" }}>
              Objednávky systému KAVKA vyřizuje <b style={{ color: "#fff" }}>{vendor.person}</b>.
            </p>
            <p className="footer-contact">
              <span>
                <IconMail size={16} />{" "}
                <a href={vendor.web} target="_blank" rel="noreferrer">
                  {vendor.webLabel}
                </a>
              </span>
              <span>
                <IconPhone size={16} /> <a href={vendor.phoneHref}>{vendor.phone}</a>
              </span>
            </p>
            <a
              href={vendor.web}
              target="_blank"
              rel="noreferrer"
              className="btn"
              style={{ width: "100%", marginTop: 14, background: "#c4a574", color: "#1c1915", border: 0 }}
            >
              Objednat na {vendor.webLabel}
            </a>
            <p style={{ fontSize: 11, color: "#9aa396", marginTop: 8, textAlign: "center" }}>
              SaaS pronájem · Jednorázový prodej · White-label
            </p>
          </div>
        </div>
        <div className="wrap footer-bottom">
          <span>© {new Date().getFullYear()} {company} · KAVKA platforma · Všechna práva vyhrazena</span>
          <span>Cloudflare Pages · D1 · R2 · Živá ukázka — ceny zboží jsou ilustrační včetně DPH</span>
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
