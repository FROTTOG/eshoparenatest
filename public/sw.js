/* KAVKA service worker — offline podpora + Web Push (hlídací pes).
 * Strategie: statické assety cache-first, stránky network-first s offline
 * fallbackem. API a osobní data se nikdy necachují. */
const CACHE = "kavka-v1";
const ASSET_RE = /^\/(assets|products|hero\.|favicon\.|manifest\.|icon-)/;

// Offline stránka žije přímo ve workeru — nespoléháme na síť ani na .html asset.
const OFFLINE_HTML = `<!doctype html><html lang="cs"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="theme-color" content="#1c1915"/><title>Offline — KAVKA Ateliér</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f3eee4;color:#1c1915;font-family:Georgia,serif;text-align:center;padding:24px}.box{max-width:420px}h1{font-size:28px}p{color:#5b554b;line-height:1.5}</style>
</head><body><div class="box"><h1>Jste offline</h1>
<p>Kavka právě nemůže doletět na internet — spojení se přerušilo. Obnovte stránku, až budete zase online.</p>
<p><button onclick="location.reload()" style="background:#24352c;color:#efe8dc;border:0;border-radius:999px;padding:10px 22px;font-size:15px;cursor:pointer">Zkusit znovu</button></p>
</div></body></html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.put("/offline", new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (ASSET_RE.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(req, clone));
            }
            return res;
          })
      )
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/offline").then((hit) => hit || caches.match("/")))
    );
  }
});

self.addEventListener("push", (event) => {
  let data = { title: "KAVKA Ateliér", body: "", url: "/" };
  try {
    const parsed = event.data.json();
    if (parsed && typeof parsed.title === "string") data = parsed;
  } catch {
    /* payload nemusí být JSON */
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body || "",
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      lang: "cs",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
