/**
 * Vrstvená cache pro veřejná API čtení (katalog, kategorie, doprava, platby).
 *
 * Cloudflare Cache API (caches.default) je dostupné v Pages Functions bez
 * jakéhokoli nastavení. Aby šla cache po změně dat v administraci okamžitě
 * zneplatnit (Cache API neumí mazat podle prefixu), klíčujeme ji verzí
 * `cache_version` z tabulky settings:
 *
 *   klíč = https://host/api/products?…&__v=<cache_version>
 *
 * Zneplatnění = zvýšení verze (bumpCache) → staré klíče se prostě přestanou
 * používat. Verzi si Worker pamatuje 15 s v globalThis, takže čtení verzí
 * nespotřebovává D1 při každém požadavku.
 */

const MEMO_MS = 15_000;

type Memo = { version: number; at: number } | null;

const globalMemo = globalThis as typeof globalThis & { __kavkaCacheMemo?: Memo };

export async function cacheVersion(db: D1Database): Promise<number> {
  const memo = globalMemo.__kavkaCacheMemo;
  const now = Date.now();
  if (memo && now - memo.at < MEMO_MS) return memo.version;
  const row = await db
    .prepare("SELECT value FROM settings WHERE key = 'cache_version'")
    .first<{ value: string }>();
  const version = Number(row?.value || 0) || 0;
  globalMemo.__kavkaCacheMemo = { version, at: now };
  return version;
}

/** Zvýší verzi cache — volá se po mutacích v administraci. */
export async function bumpCache(db: D1Database): Promise<void> {
  await db
    .prepare(
      `INSERT INTO settings (key, value) VALUES ('cache_version', '1')
       ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT)`
    )
    .run();
  const memo = globalMemo.__kavkaCacheMemo;
  if (memo) globalMemo.__kavkaCacheMemo = { version: memo.version + 1, at: Date.now() };
}

/**
 * Obslouží GET endpoint s cache: při zásahu vrátí uloženou odpověď (bez
 * Set-Cookie — ty Hono doplní znovu), při neúspěchu zavolá `producer()`,
 * uloží odpověď a vrátí ji.
 */
export async function cachedJson(
  db: D1Database,
  requestUrl: string,
  keyPath: string,
  ttlSeconds: number,
  producer: () => Promise<unknown>
): Promise<Response> {
  const cache = caches.default;
  const version = await cacheVersion(db);
  const key = new URL(requestUrl);
  key.pathname = keyPath;
  key.searchParams.set("__v", String(version));

  const hit = await cache.match(key);
  if (hit) return new Response(hit.body, { status: hit.status, headers: hit.headers });

  const body = await producer();
  const res = Response.json(body);
  res.headers.set(
    "Cache-Control",
    `public, max-age=${ttlSeconds}, stale-while-revalidate=${Math.max(60, ttlSeconds * 5)}`
  );
  try {
    await cache.put(key, res.clone());
  } catch {
    /* cache jen urychluje — selhání nesmí shodit odpověď */
  }
  return res;
}
