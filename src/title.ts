import { useEffect } from "react";

const DEFAULT_DESC =
  "KAVKA Ateliér — keramika, len a dřevo. Doprava Zásilkovna, Z-BOX i Balíkovna s živou mapou.";
const DEFAULT_IMAGE = "/hero.webp";

function upsertMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function abs(path: string) {
  if (!path) return `${window.location.origin}${DEFAULT_IMAGE}`;
  if (path.startsWith("http")) return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function useSeo(opts: { title: string; description?: string; image?: string; type?: string; noindex?: boolean }) {
  const title = opts.title;
  const description = opts.description || DEFAULT_DESC;
  const image = abs(opts.image || DEFAULT_IMAGE);
  const type = opts.type || "website";
  const noindex = !!opts.noindex;

  useEffect(() => {
    const url = `${window.location.origin}${window.location.pathname}`;
    document.title = title;
    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:locale", "cs_CZ");
    upsertMeta("property", "og:site_name", "KAVKA Ateliér");
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);
    if (noindex) {
      upsertMeta("name", "robots", "noindex, nofollow");
    } else {
      document.head.querySelector('meta[name="robots"]')?.remove();
    }
    upsertLink("canonical", url);
  }, [title, description, image, type, noindex]);
}

export function usePageTitle(title: string, description?: string) {
  useSeo({ title, description });
}
