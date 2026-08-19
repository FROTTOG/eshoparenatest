export const onRequest: PagesFunction = async (context) => {
  const origin = new URL(context.request.url).origin;
  const body = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /ucet\nDisallow: /pokladna\nDisallow: /kosik\nDisallow: /prihlaseni\nDisallow: /registrace\nSitemap: ${origin}/sitemap.xml\n`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
};
