export const onRequest: PagesFunction = async (context) => {
  const origin = new URL(context.request.url).origin;
  // AI crawleři (ChatGPT, Google AI) mají k veřejnému obsahu přístup —
  // uzavřené části (admin, účet, pokladna) zůstávají zakázané pro všechny.
  const body = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /ucet\nDisallow: /pokladna\nDisallow: /kosik\nDisallow: /prihlaseni\nDisallow: /registrace\n\n# AI vyhledávání — povolíme veřejný obsah (produkty, katalog, stránky)\nUser-agent: GPTBot\nAllow: /\nDisallow: /admin\nDisallow: /ucet\nDisallow: /pokladna\nDisallow: /kosik\n\nUser-agent: OAI-SearchBot\nAllow: /\nDisallow: /admin\nDisallow: /ucet\nDisallow: /pokladna\nDisallow: /kosik\n\nUser-agent: ChatGPT-User\nAllow: /\nDisallow: /admin\nDisallow: /ucet\nDisallow: /pokladna\nDisallow: /kosik\n\nSitemap: ${origin}/sitemap.xml\n`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
};
