import type { Bindings } from "./lib/types";
import { loadFeedProducts, openaiJsonl } from "./lib/feeds";
import { loadSettings } from "./lib/invoices";

export const onRequest: PagesFunction<Bindings> = async (context) => {
  const origin = new URL(context.request.url).origin;
  if (!context.env.DB) return new Response("DB not available", { status: 503 });
  const s = await loadSettings(context.env.DB);
  const products = await loadFeedProducts(context.env.DB);
  const body = openaiJsonl(origin, products, s.store_name || "KAVKA");
  return new Response(body, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "content-disposition": 'inline; filename="openai-feed.jsonl"',
    },
  });
};
