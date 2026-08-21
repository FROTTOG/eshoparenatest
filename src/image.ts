const DEMO_IMAGES = new Set([
  "deka",
  "difuzer",
  "hrnek",
  "povleceni",
  "rucnik",
  "svicka",
  "tac",
  "taska",
  "vaza",
]);

/**
 * Vestavěné ukázkové fotografie mají úspornější WebP a AVIF variantu.
 * Vlastní URL z administrace necháváme beze změny, takže R2 i externí
 * obrázky fungují dál.
 */
export function optimizedImage(src: string | null | undefined): string {
  if (!src) return "/products/hrnek.webp";
  if (/^\/hero\.(jpe?g)$/i.test(src)) return "/hero.webp";
  const match = src.match(/^\/products\/([a-z0-9-]+)\.jpg$/i);
  return match && DEMO_IMAGES.has(match[1].toLowerCase())
    ? `/products/${match[1].toLowerCase()}.webp`
    : src;
}

/** AVIF varianta (pro <picture><source type="image/avif">) — tam, kde existuje. */
export function optimizedAvif(src: string | null | undefined): string | null {
  if (!src) return "/products/hrnek.avif";
  if (/^\/hero\.(jpe?g|webp)$/i.test(src)) return "/hero.avif";
  const match = src.match(/^\/products\/([a-z0-9-]+)\.jpg$/i);
  return match && DEMO_IMAGES.has(match[1].toLowerCase())
    ? `/products/${match[1].toLowerCase()}.avif`
    : null;
}
