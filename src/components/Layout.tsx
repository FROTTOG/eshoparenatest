import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { api } from "../api";
import { useStore } from "../store";
import { IconAdmin, IconArrowUp, IconCart, IconClose, IconCookie, IconHeart, IconMail, IconPhone, IconUser } from "./Icons";
import { CookieBanner, openCookieSettings } from "./CookieBanner";
import { ExitIntent } from "./ExitIntent";
import { bootTags } from "../analytics";
import { SearchBox } from "./SearchBox";
import { Logo } from "./Ui";
import { BottomNav } from "./BottomNav";
import { czk, pickupFreeOver } from "../format";

const NAV_LINKS = [
  { to: "/", label: "Domů", end: true },
  { to: "/katalog", label: "Katalog" },
  { to: "/magazin", label: "Magazín" },
  { to: "/doprava-a-platba", label: "Doprava a platba" },
  { to: "/o-nas", label: "O ateliéru" },
  { to: "/sledovani", label: "Sledování" },
];

export function Layout() {
  const { user, cart, settings, toasts, wishlist, shipping } = useStore();
  const [navPages, setNavPages] = useState<{ id: number; title: string; slug: string; in_nav: number; nav_label: string; nav_order: number }[]>([]);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const location = useLocation();
  const headerRef = useRef<HTMLElement>(null);

  // Na pokladně má spodní lištu s odesláním objednávky — neduplikujeme ji
  // se spodním menu, aby se navzájem nepřekrývaly.
  const hideBottomNav = location.pathname.startsWith("/pokladna");

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const apply = () => {
      // Skutečná výška hlavičky — na desktopu může menu zabrat dva řádky,
      // proto ji promítneme do --header i --header-h (kotvy, sticky, hero).
      // Důležité: tato hodnota smí sloužit jen prvkům POD/okolo hlavičky.
      // Samotná výška hlavičky musí zůstat na pevném --header-min (viz CSS),
      // jinak by se měřená výška propsala zpět do výšky hlavičky a vznikla
      // nekonečná smyčka ResizeObserver (hlavička neustále „nabíhala“).
      document.documentElement.style.setProperty("--header", `${el.offsetHeight}px`);
      document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`);
      // Kam sahá hlavička od vrchu okna (pod informační lištou), pro mobilní menu
      document.documentElement.style.setProperty("--header-offset", `${Math.max(0, el.getBoundingClientRect().top)}px`);
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      setShowTop(y > 600);
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      setProgress(max > 0 ? Math.min(1, y / max) : 0);
      const el = headerRef.current;
      if (el) doc.style.setProperty("--header-offset", `${Math.max(0, el.getBoundingClientRect().top)}px`);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    setOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  // Dynamický navbar: systémové odkazy + zveřejněné stránky s "v menu"
  useEffect(() => {
    void api<typeof navPages>("/pages")
      .then(setNavPages)
      .catch(() => {});
  }, []);

  useEffect(() => {
    bootTags(settings);
    const onConsent = () => bootTags(settings);
    window.addEventListener("kavka-consent", onConsent);
    return () => window.removeEventListener("kavka-consent", onConsent);
  }, [settings.gtm_id, settings.ga4_id, settings.meta_pixel_id]);

  const navLinks = useMemo(() => {
    let base = NAV_LINKS;
    try {
      const raw = settings.navbar_items;
      if (raw) {
        const parsed = JSON.parse(raw) as { label?: string; to?: string; end?: boolean }[];
        if (Array.isArray(parsed) && parsed.length) {
          base = parsed
            .filter((i) => i && i.label && i.to)
            .map((i) => ({ to: String(i.to), label: String(i.label), end: !!i.end }));
        }
      }
    } catch {
      /* ponecháme výchozí */
    }
    const dyn = navPages
      .filter((p) => p.in_nav)
      .sort((a, b) => (a.nav_order || 0) - (b.nav_order || 0))
      .map((p) => ({ to: `/stranka/${p.slug}`, label: p.nav_label || p.title, end: false }));
    const seen = new Set<string>();
    const out: { to: string; label: string; end: boolean }[] = [];
    // Magazín se v menu ukáže jen když je modul zapnutý (nastavení blog_enabled).
    const blogOff = settings.blog_enabled === "0";
    const blogLabel = settings.blog_title || "Magazín";
    for (const l of [...base, ...dyn]) {
      if (l.to === "/magazin") {
        if (blogOff) continue;
        l.label = blogLabel;
      }
      if (seen.has(l.to)) continue;
      seen.add(l.to);
      out.push({ to: l.to, label: l.label, end: !!l.end });
    }
    return out;
  }, [settings.navbar_items, settings.blog_enabled, settings.blog_title, navPages]);

  useEffect(() => {
    document.body.style.overflow = open || searchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, searchOpen]);

  const freeOver = pickupFreeOver(shipping);

  const company = settings.store_company || settings.store_name || "KAVKA Ateliér s.r.o.";
  const ico = settings.store_ico || "19200456";
  const dic = settings.store_dic || "CZ19200456";
  const email = settings.store_email || "ahoj@kavka.shop";
  const phone = settings.store_phone || "+420 777 123 456";
  const phoneHref = `tel:${phone.replace(/[^\d+]/g, "")}`;

  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <div className="page">
      <a className="skip-link" href="#obsah">
        Přeskočit na obsah
      </a>

      {/* Pruh postupu čtení stránky */}
      <div className="scroll-progress" aria-hidden="true" style={{ transform: `scaleX(${progress})` }} />

      {/* Informační lišta nad hlavičkou */}
      <div className="announce" role="note">
        <span className="announce-dot" aria-hidden="true" />
        <span>
          {freeOver ? (
            <>
              Doprava zdarma od <b>{czk(freeOver)}</b>
            </>
          ) : (
            <>Doprava po celé ČR</>
          )}
          <span className="announce-sep" aria-hidden="true">·</span>
          Sleva 10 % na první nákup pro registrované — kód <b>KAVKA10</b>
        </span>
      </div>

      <header ref={headerRef} className={`header${scrolled ? " scrolled" : ""}`}>
        <div className="header-in">
          <Logo />
          <nav className="nav" aria-label="Hlavní navigace">
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end}>
                {l.label}
              </NavLink>
            ))}
            {/* Účet je v menu — zvlášť jako položka navigace */}
            <NavLink to={user ? "/ucet" : "/prihlaseni"}>
              {user ? "Můj účet" : "Přihlášení"}
            </NavLink>
          </nav>
          <div className="header-actions">
            {/* Desktop: vyhledávání + košík + oblíbené + CTA. Mobil: spodní lišta (BottomNav). */}
            <div className="desktop-only">
              <SearchBox />
            </div>
            <Link to="/oblibene" className="icon-btn desktop-only header-wish" title="Oblíbené" aria-label="Oblíbené">
              <IconHeart />
              {wishlist.length > 0 && (
                <span className="badge" key={wishlist.length}>
                  {wishlist.length}
                </span>
              )}
            </Link>
            {/* Stav přihlášení nahoře — jméno zákazníka, nebo tlačítko „Přihlásit se“ */}
            {user ? (
              <Link to="/ucet" className="user-pill" title={`${user.name} — můj účet`}>
                <span className="user-pill-avatar" aria-hidden="true">
                  <IconUser size={16} />
                </span>
                <span className="user-pill-body">
                  <b>{user.name}</b>
                  <small>
                    <span className="dot" aria-hidden="true" />
                    Přihlášen
                  </small>
                </span>
              </Link>
            ) : (
              <Link to="/prihlaseni" className="btn btn-sm user-login-btn">
                Přihlásit se
              </Link>
            )}
            {user?.role === "admin" && (
              <Link to="/admin" className="icon-btn" title="Administrace" aria-label="Administrace">
                <IconAdmin />
              </Link>
            )}
            <Link to="/kosik" className="icon-btn desktop-only header-cart" aria-label="Košík">
              <IconCart />
              {(cart?.count || 0) > 0 && (
                <span className="badge" key={cart?.count}>
                  {cart?.count}
                </span>
              )}
            </Link>
            <Link to="/katalog" className="btn btn-sm desktop-only" style={{ marginLeft: 4 }}>
              Nakoupit
            </Link>
          </div>
        </div>
      </header>

      {/* Mobilní menu — otevírá se jen ze spodní lišty (BottomNav), bez dalšího vyhledávání */}
      <div className={`mobile-nav${open ? " open" : ""}`} id="mobilni-menu" role="dialog" aria-modal="true" aria-label="Menu" aria-hidden={!open}>
        <div className="mobile-nav-panel">
          <div className="mobile-nav-head">
            <span className="serif">Menu</span>
            <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Zavřít menu">
              <IconClose />
            </button>
          </div>
          <nav className="mobile-nav-links" aria-label="Mobilní navigace">
            {navLinks.map((l, i) => (
              <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)} style={{ animationDelay: `${60 + i * 45}ms` }}>
                <span>{l.label}</span>
                <span className="mobile-nav-arrow" aria-hidden="true">
                  →
                </span>
              </NavLink>
            ))}
            <NavLink to="/oblibene" onClick={() => setOpen(false)} style={{ animationDelay: `${60 + navLinks.length * 45}ms` }}>
              <span>Oblíbené{wishlist.length > 0 ? ` (${wishlist.length})` : ""}</span>
              <span className="mobile-nav-arrow" aria-hidden="true">→</span>
            </NavLink>
            <NavLink to={user ? "/ucet" : "/prihlaseni"} onClick={() => setOpen(false)} style={{ animationDelay: `${60 + (navLinks.length + 1) * 45}ms` }}>
              <span>{user ? "Můj účet" : "Přihlášení"}</span>
              <span className="mobile-nav-arrow" aria-hidden="true">→</span>
            </NavLink>
          </nav>
          <div className="mobile-nav-foot">
            <a href={`tel:${phoneHref.replace("tel:", "")}`}>{phone}</a>
            <a href={`mailto:${email}`}>{email}</a>
            <span>{settings.store_address || "Korunní 42, 120 00 Praha 2"}</span>
          </div>
        </div>
      </div>

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
              <b>KAVKA Ateliér</b>
              <br />
              Keramika, len a dřevo z dílny na Vinohradech. Věci, které mají zůstat.
            </p>
            <p style={{ fontSize: 13, color: "#9aa396", marginTop: 12 }}>
              {company}
              <br />
              IČO: {ico} | DIČ: {dic}
              <br />
              {settings.store_address || "Korunní 42, 120 00 Praha 2 - Vinohrady"}
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
                <Link to="/sledovani">Sledování zásilky</Link>
              </li>
              <li>
                <Link to="/ucet">Můj účet</Link>
              </li>
              <li>
                <Link to="/oblibene">Oblíbené</Link>
              </li>
              <li>
                <Link to="/magazin">Magazín</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Informace</h3>
            <ul>
              <li>
                <Link to="/o-nas">O ateliéru</Link>
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
            <p style={{ fontSize: 13, color: "#cfc4b3", marginTop: 0 }}>
              {settings.store_hours || "Po–Pá 10:00–18:00"}
            </p>
            <p className="footer-contact">
              <span>
                <IconMail size={16} />{" "}
                <a href={`mailto:${email}`}>{email}</a>
              </span>
              <span>
                <IconPhone size={16} /> <a href={phoneHref}>{phone}</a>
              </span>
            </p>
          </div>
        </div>
        <div className="wrap footer-bottom">
          <span>
            © {new Date().getFullYear()} {company} · Všechna práva vyhrazena
          </span>
          <span>Ceny jsou konečné včetně DPH · Funkční demo e-shopu</span>
        </div>
      </footer>

      <CookieBanner />
      <ExitIntent />

      {/* Pevné spodní menu */}
      {!hideBottomNav && (
        <BottomNav onSearch={() => setSearchOpen(true)} onMenu={() => setOpen((v) => !v)} />
      )}

      {/* Tlačítko nahoru */}
      <button
        type="button"
        className={`scroll-top${showTop ? " show" : ""}`}
        onClick={scrollTop}
        aria-label="Zpět nahoru"
        aria-hidden={!showTop}
        tabIndex={showTop ? 0 : -1}
      >
        <svg className="scroll-top-ring" viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="22" className="scroll-top-track" />
          <circle cx="24" cy="24" r="22" className="scroll-top-bar" style={{ strokeDashoffset: 138.2 * (1 - progress) }} />
        </svg>
        <IconArrowUp className="scroll-top-icon" size={20} />
      </button>

      <div className="toasts" role="status" aria-live="polite">
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
