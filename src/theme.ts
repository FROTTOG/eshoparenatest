import type { Settings } from "./api";

/**
 * Vzhled e-shopu — barvy, zaoblení, stíny a animace načítacích tlačítek.
 *
 * Hodnoty se ukládají do tabulky `settings` (klíče `theme_*`) a na veřejném
 * webu se aplikují jako CSS proměnné na <html>. V administraci (stránka
 * „Vzhled“) se stejná funkce volá při každé změně, takže náhled je živý.
 */

export type ThemeVar = {
  key: string;
  css: string;
  label: string;
  def: string;
};

/** Barvy → CSS proměnná + výchozí hodnota (odpovídá :root ve styles.css). */
export const THEME_VARS: ThemeVar[] = [
  { key: "theme_bg", css: "--bg", label: "Pozadí stránky", def: "#f3eee4" },
  { key: "theme_bg_deep", css: "--bg-deep", label: "Hlubší pozadí", def: "#e7dece" },
  { key: "theme_card", css: "--card", label: "Karty a panely", def: "#fffdf8" },
  { key: "theme_ink", css: "--ink", label: "Text a tmavá barva", def: "#1c1915" },
  { key: "theme_accent", css: "--accent", label: "Akcent (tlačítka, odkazy)", def: "#b54a2c" },
  { key: "theme_forest", css: "--forest", label: "Patička a tmavé plochy", def: "#24352c" },
];

export const BTN_ANIMS = ["spin", "dots", "pulse", "bar"] as const;
export type BtnAnim = (typeof BTN_ANIMS)[number];

export const ANIM_LABELS: Record<BtnAnim, string> = {
  spin: "Kolečko",
  dots: "Tečky",
  pulse: "Puls",
  bar: "Pruh",
};

const DEFAULTS: Record<string, string> = {
  theme_bg: "#f3eee4",
  theme_bg_deep: "#e7dece",
  theme_card: "#fffdf8",
  theme_ink: "#1c1915",
  theme_accent: "#b54a2c",
  theme_forest: "#24352c",
  theme_radius: "20",
  theme_shadow: "0.08",
  theme_btn_anim: "spin",
};

export function themeDefaults(): Record<string, string> {
  return { ...DEFAULTS };
}

/** Vrátí nastavení vzhledu doplněné o výchozí hodnoty (prázdné → výchozí). */
export function readTheme(s: Settings): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(DEFAULTS)) {
    const val = s[k];
    out[k] = val == null || String(val).trim() === "" ? v : String(val);
  }
  return out;
}

/** Ověří a vrátí hex barvu ve tvaru #rrggbb (kvůli <input type="color">). */
export function toHex(v: string | undefined, fallback: string): string {
  const s = String(v || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : fallback;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/** Aplikuje vzhled na <html> — barvy, zaoblení, stíny a animaci tlačítek. */
export function applyTheme(s: Settings): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const st = root.style;
  const t = readTheme(s);

  for (const v of THEME_VARS) {
    st.setProperty(v.css, toHex(t[v.key], v.def));
  }

  // Zaoblení rohů (slider) — px
  st.setProperty("--radius", `${clamp(Number(t.theme_radius), 0, 40)}px`);
  // Intenzita stínů (slider) — násobek alfa kanálu stínů
  st.setProperty("--shadow-alpha", String(clamp(Number(t.theme_shadow), 0, 0.25)));

  // Animace načítacích tlačítek (spinner)
  const anim = BTN_ANIMS.includes(t.theme_btn_anim as BtnAnim) ? t.theme_btn_anim : "spin";
  root.setAttribute("data-btn-anim", anim);
}
