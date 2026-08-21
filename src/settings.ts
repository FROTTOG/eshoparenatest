/**
 * Čtení nastavení, která se ukládají jako JSON do tabulky `settings`.
 *
 * Administrace je zapisuje v sekcích „Lišta a dlaždice“ a „Filtry a štítky“,
 * veřejný web je jen čte. Když je hodnota prázdná nebo poškozená, vrací se
 * bezpečná výchozí podoba, takže se e-shop nikdy nerozbije.
 */

import type { FilterGroup, Settings } from "./api";

/* ---------- Oznamovací lišta nad hlavičkou ---------- */

export type AnnounceItem = {
  /** Text zprávy. Části v **hvězdičkách** se zvýrazní. */
  text: string;
  /** Nepovinný odkaz (interní cesta typu /katalog). */
  to?: string;
};

export function readAnnounce(s: Settings): {
  enabled: boolean;
  items: AnnounceItem[];
  bg: string;
  fg: string;
  rotate: boolean;
} {
  const enabled = s.announce_enabled !== "0";
  let items: AnnounceItem[] = [];
  try {
    const parsed = JSON.parse(s.announce_items || "[]") as AnnounceItem[];
    if (Array.isArray(parsed)) {
      items = parsed
        .filter((i) => i && typeof i === "object" && String(i.text || "").trim())
        .map((i) => ({ text: String(i.text), to: i.to ? String(i.to) : undefined }))
        .slice(0, 6);
    }
  } catch {
    items = [];
  }
  return {
    enabled,
    items,
    bg: s.announce_bg || "",
    fg: s.announce_fg || "",
    rotate: s.announce_rotate === "1",
  };
}

/* ---------- Dlaždice rychlých odkazů na úvodní stránce ---------- */

export const TILE_ICONS = [
  "gift",
  "leaf",
  "locker",
  "truck",
  "shield",
  "spark",
  "clock",
  "heart",
  "pin",
  "shop",
  "star",
  "card",
] as const;
export type TileIcon = (typeof TILE_ICONS)[number];

export const TILE_COLORS = ["accent", "forest", "gold", "plain"] as const;
export type TileColor = (typeof TILE_COLORS)[number];

export type HomeTile = {
  icon: TileIcon;
  title: string;
  subtitle: string;
  to: string;
  color: TileColor;
  /** Nepovinný vlastní obrázek místo ikony. */
  image?: string;
};

export function emptyTile(): HomeTile {
  return { icon: "spark", title: "", subtitle: "", to: "/katalog", color: "accent" };
}

export function readHomeTiles(s: Settings): {
  enabled: boolean;
  showCategories: boolean;
  title: string;
  items: HomeTile[];
} {
  let items: HomeTile[] = [];
  try {
    const parsed = JSON.parse(s.home_tiles_items || "[]") as Partial<HomeTile>[];
    if (Array.isArray(parsed)) {
      items = parsed
        .filter((t) => t && typeof t === "object" && (t.title || t.subtitle || t.image))
        .map((t) => ({
          icon: (TILE_ICONS as readonly string[]).includes(String(t.icon)) ? (t.icon as TileIcon) : "spark",
          title: String(t.title || ""),
          subtitle: String(t.subtitle || ""),
          to: String(t.to || "/katalog"),
          color: (TILE_COLORS as readonly string[]).includes(String(t.color)) ? (t.color as TileColor) : "accent",
          image: t.image ? String(t.image) : undefined,
        }))
        .slice(0, 12);
    }
  } catch {
    items = [];
  }
  return {
    enabled: s.home_tiles_enabled !== "0",
    showCategories: s.home_tiles_show_categories !== "0",
    title: s.home_tiles_title || "",
    items,
  };
}

/* ---------- Filtry katalogu nad štítky produktů ---------- */

export function readFilterGroups(s: Settings): FilterGroup[] {
  try {
    const parsed = JSON.parse(s.catalog_filters || "[]") as Partial<FilterGroup>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((g) => g && typeof g === "object" && Array.isArray(g.tags) && g.tags.length)
      .map((g) => ({ title: String(g.title || "Filtr"), tags: (g.tags as string[]).map(String).filter(Boolean) }))
      .slice(0, 8);
  } catch {
    return [];
  }
}

/**
 * Text lišty s podporou zvýraznění: „Doprava zdarma od *1 500 Kč*“.
 * Vrací pole úseků, kde `bold` znamená tučný zvýrazněný text.
 */
export function splitBold(text: string): { text: string; bold: boolean }[] {
  const out: { text: string; bold: boolean }[] = [];
  const parts = String(text || "").split("*");
  parts.forEach((part, i) => {
    if (!part) return;
    out.push({ text: part, bold: i % 2 === 1 });
  });
  return out.length ? out : [{ text: String(text || ""), bold: false }];
}
