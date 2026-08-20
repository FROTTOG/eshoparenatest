import type { Bindings } from "./lib/types";
import { ensureReady } from "./lib/schema";
import { buildFeed } from "./lib/feeds";

export const onRequest: PagesFunction<Bindings> = async (context) => {
  const origin = new URL(context.request.url).origin;
  if (!context.env.DB) return new Response("DB missing", { status: 503 });
  await ensureReady(context.env);
  const xml = await buildFeed("zbozi", origin, context.env.DB);
  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=900" },
  });
};
