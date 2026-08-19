/**
 * SPA fallback: neexistující HTML cesty vrátí index.html.
 * /api/* necháváme na functions/api.
 */
export const onRequest: PagesFunction<{ ASSETS: Fetcher }> = async (context) => {
  const url = new URL(context.request.url);
  if (url.pathname.startsWith("/api/")) {
    return context.next();
  }
  const res = await context.next();
  if (res.status !== 404) return res;
  const accept = context.request.headers.get("Accept") || "";
  if (!accept.includes("text/html")) return res;
  return context.env.ASSETS.fetch(new URL("/index.html", url.origin));
};
