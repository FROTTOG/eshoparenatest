import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { IconClose, IconCookie, IconLock, IconShield } from "./Icons";

export type CookiePreferences = {
  essential: boolean;
  analytics: boolean;
  preferences: boolean;
  marketing: boolean;
  timestamp: string;
};

const STORAGE_KEY = "kavka_cookie_consent";

export function openCookieSettings() {
  window.dispatchEvent(new CustomEvent("open-cookie-settings"));
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    preferences: false,
    marketing: false,
    timestamp: "",
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Show banner after brief delay
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    } else {
      try {
        setPrefs(JSON.parse(stored));
      } catch {
        setVisible(true);
      }
    }
  }, []);

  useEffect(() => {
    const handleOpen = () => {
      setModalOpen(true);
    };
    window.addEventListener("open-cookie-settings", handleOpen);
    return () => window.removeEventListener("open-cookie-settings", handleOpen);
  }, []);

  function saveAndClose(updated: CookiePreferences) {
    const payload = { ...updated, essential: true, timestamp: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setPrefs(payload);
    setVisible(false);
    setModalOpen(false);
  }

  function acceptAll() {
    saveAndClose({
      essential: true,
      analytics: true,
      preferences: true,
      marketing: true,
      timestamp: "",
    });
  }

  function acceptNecessary() {
    saveAndClose({
      essential: true,
      analytics: false,
      preferences: false,
      marketing: false,
      timestamp: "",
    });
  }

  return (
    <>
      {visible && !modalOpen && (
        <aside className="cookie-banner glass-card" role="dialog" aria-label="Souhlas s cookies">
          <div className="cookie-banner-content">
            <div className="cookie-banner-text">
              <div className="cookie-title">
                <IconCookie size={20} />
                <strong>Používáme cookies pro správné fungování e-shopu</strong>
              </div>
              <p>
                Aby náš ateliérový e-shop fungoval bezpečně, pamatoval si obsah vašeho košíku a umožnil vám
                pohodlný nákup, využíváme soubory cookies. Více informací naleznete v{" "}
                <Link to="/ochrana-udaju">Zásadách ochrany osobních údajů</Link>.
              </p>
            </div>
            <div className="cookie-banner-actions">
              <button type="button" className="btn-line btn-sm" onClick={() => setModalOpen(true)}>
                Nastavení
              </button>
              <button type="button" className="btn-line btn-sm" onClick={acceptNecessary}>
                Pouze nezbytné
              </button>
              <button type="button" className="btn btn-sm" onClick={acceptAll}>
                Přijmout vše
              </button>
            </div>
          </div>
        </aside>
      )}

      {modalOpen && (
        <div className="map-modal glass-scrim" onClick={() => setModalOpen(false)}>
          <div
            className="cookie-modal-card glass-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="cookie-modal-title"
          >
            <div className="cookie-modal-header">
              <div className="cookie-title">
                <IconCookie size={24} />
                <h2 id="cookie-modal-title" className="serif" style={{ margin: 0 }}>
                  Nastavení souborů cookies
                </h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setModalOpen(false)}
                aria-label="Zavřít"
              >
                <IconClose />
              </button>
            </div>

            <p style={{ fontSize: 14, color: "var(--ink-soft)", margin: "0 0 16px" }}>
              Zde si můžete upravit, jaké kategorie cookies povolíte. Nezbytné cookies jsou technicky nutné
              pro chod nákupního košíku a přihlášení a nelze je vypnout.
            </p>

            <div className="cookie-options">
              <div className="cookie-option">
                <div className="cookie-option-info">
                  <div className="cookie-option-head">
                    <IconLock size={16} />
                    <strong>Nezbytné technické cookies</strong>
                    <span className="tag ok">Vždy aktivní</span>
                  </div>
                  <p>
                    Umožňují základní funkce e-shopu — vložení zboží do košíku, uložení objednávky, přihlášení k
                    účtu a zabezpečení relace.
                  </p>
                </div>
                <input type="checkbox" checked disabled />
              </div>

              <div className="cookie-option">
                <div className="cookie-option-info">
                  <div className="cookie-option-head">
                    <IconShield size={16} />
                    <strong>Preferenční a funkční cookies</strong>
                  </div>
                  <p>
                    Umožňují zapamatovat si vaše volby (např. způsob zobrazení, předvolby dopravy a jazyk) pro
                    příjemnější zážitek.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.preferences}
                  onChange={(e) => setPrefs({ ...prefs, preferences: e.target.checked })}
                />
              </div>

              <div className="cookie-option">
                <div className="cookie-option-info">
                  <div className="cookie-option-head">
                    <IconShield size={16} />
                    <strong>Analytické a statistické cookies</strong>
                  </div>
                  <p>
                    Pomáhají nám anonymně porozumět tomu, jak lidé web používají, abychom mohli e-shop a výběr
                    zboží neustále zlepšovat.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.analytics}
                  onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })}
                />
              </div>

              <div className="cookie-option">
                <div className="cookie-option-info">
                  <div className="cookie-option-head">
                    <IconShield size={16} />
                    <strong>Marketingové cookies</strong>
                  </div>
                  <p>
                    Slouží k případnému přizpůsobení nabídek a zamezení zobrazování nerelevantních reklam.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.marketing}
                  onChange={(e) => setPrefs({ ...prefs, marketing: e.target.checked })}
                />
              </div>
            </div>

            <div className="cookie-modal-actions">
              <button type="button" className="btn-line" onClick={acceptNecessary}>
                Odmítnout volitelné
              </button>
              <button
                type="button"
                className="btn-dark"
                onClick={() => saveAndClose(prefs)}
              >
                Uložit vybrané
              </button>
              <button type="button" className="btn" onClick={acceptAll}>
                Povolit vše
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
