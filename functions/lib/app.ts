import { Hono } from "hono";
import type { Bindings, Variables } from "./types";
import { ensureReady } from "./schema";
import {
  CART_DAYS,
  isSecure,
  newCartId,
  readCookie,
  setCookie,
  userBySession,
} from "./helpers";
import { registerPublic } from "./public";
import { registerAdmin } from "./admin";
import { writeMetric } from "./metrics";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().basePath("/api");

app.use("*", async (c, next) => {
  const started = Date.now();
  const path = new URL(c.req.url).pathname;
  let status = 200;
  const original = c.res;
  void original;
  if (!c.env.DB) {
    return c.json(
      {
        error:
          "D1 databáze (vazba DB) není připojená. Otevřete README.md a v Cloudflare Pages nastavte binding na D1.",
      },
      503
    );
  }
  try {
    await ensureReady(c.env);
  } catch (e) {
    console.error("Database setup error:", e);
    return c.json(
      {
        error: "Databáze se nepodařilo připravit. Zkontrolujte oprávnění D1 v Cloudflare.",
      },
      503
    );
  }

  const cookies = c.req.header("Cookie");
  const sid = readCookie(cookies, "sid");
  const user = await userBySession(c.env.DB, sid);
  c.set("user", user);

  let cartId = readCookie(cookies, "cid");
  const headers: string[] = [];
  if (!cartId) {
    cartId = newCartId();
    headers.push(setCookie("cid", cartId, CART_DAYS, isSecure(c)));
  }
  c.set("cartId", cartId);

  // Košík zakládají až jeho vlastní endpointy. Veřejné čtení katalogu tak
  // zbytečně nezapisuje do D1 při každém požadavku.
  await next();

  for (const h of headers) {
    c.header("Set-Cookie", h, { append: true });
  }
  status = c.res.status;
  writeMetric(c.env, "api_request", [Date.now() - started, status], [path.slice(0, 96)]);
});

registerPublic(app);
registerAdmin(app);

app.notFound((c) => c.json({ error: "Tato API cesta neexistuje." }, 404));
app.onError((err, c) => {
  console.error(err);
  writeMetric(c.env, "api_error", [500], [String(err).slice(0, 96)]);
  return c.json({ error: "Něco se pokazilo na serveru." }, 500);
});

export default app;
