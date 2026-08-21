/**
 * Web Push (RFC 8291, aes128gcm) — upozornění „hlídací pes“ do prohlížeče.
 *
 * Posíláme data-only payload {title, body, url}; service worker ho zobrazí
 * sám (viz public/sw.js). Vyžaduje klíče VAPID (vygenerují se jednou a uloží
 * do settings) a páry klíčů subscription (p256dh + auth).
 */

export type PushSubscription = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
};

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function ensureVapidKeys(db: D1Database): Promise<{ pub: string; priv: string }> {
  const row = await db
    .prepare("SELECT value FROM settings WHERE key = 'vapid_public_key'")
    .first<{ value: string }>();
  const privRow = await db
    .prepare("SELECT value FROM settings WHERE key = 'vapid_private_key'")
    .first<{ value: string }>();
  if (row?.value && privRow?.value) return { pub: row.value, priv: privRow.value };

  const pair = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  )) as CryptoKeyPair;
  const pubRaw = (await crypto.subtle.exportKey("raw", pair.publicKey)) as ArrayBuffer;
  const privPkcs8 = (await crypto.subtle.exportKey("pkcs8", pair.privateKey)) as ArrayBuffer;
  const pub = b64url(pubRaw);
  const priv = b64url(privPkcs8);
  await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('vapid_public_key', ?)").bind(pub).run();
  await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('vapid_private_key', ?)").bind(priv).run();
  return { pub, priv };
}

async function importVapidPrivate(privB64url: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    fromB64url(privB64url),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
}

async function vapidJwt(priv: string, sub: string): Promise<string> {
  const enc = (o: object) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const header = enc({ typ: "JWT", alg: "ES256" });
  const payload = enc({
    aud: "https://fcm.googleapis.com",
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub,
  });
  const unsigned = `${header}.${payload}`;
  const key = await importVapidPrivate(priv);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsigned)
  );
  return `${unsigned}.${b64url(sig)}`;
}

async function hmacSha256(keyBytes: Uint8Array, ...parts: Uint8Array[]): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const total = parts.reduce((n, p) => n + p.length, 0);
  const data = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    data.set(p, off);
    off += p.length;
  }
  const sig = (await crypto.subtle.sign("HMAC", key, data)) as ArrayBuffer;
  return new Uint8Array(sig);
}

/** HKDF roztažení: vrátí `len` bajtů z PRK a info. */
async function hkdfExpand(prk: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
  const out = new Uint8Array(len);
  let t: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  let offset = 0;
  let counter = 1;
  while (offset < len) {
    const chunk = await hmacSha256(prk, t, info, new Uint8Array([counter]));
    out.set(chunk.slice(0, len - offset), offset);
    offset += chunk.length;
    t = chunk;
    counter++;
  }
  return out;
}

/**
 * Zašifruje payload podle RFC 8291 (aes128gcm) a odešle push na jeden endpoint.
 */
async function sendEncrypted(
  endpoint: string,
  subKeys: { p256dh: string; auth: string },
  vapid: { pub: string; jwt: string },
  payload: Uint8Array
): Promise<Response> {
  const uaPub = fromB64url(subKeys.p256dh);
  const authSecret = fromB64url(subKeys.auth);

  const epkPair = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const epkRaw = new Uint8Array((await crypto.subtle.exportKey("raw", epkPair.publicKey)) as ArrayBuffer);
  const uaPubKey = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const deriveAlg = { name: "ECDH", public: uaPubKey } as unknown as SubtleCryptoDeriveKeyAlgorithm;
  const sharedBits = (await crypto.subtle.deriveBits(deriveAlg, epkPair.privateKey, 256)) as ArrayBuffer;
  const shared = new Uint8Array(sharedBits);

  // PRK = HMAC-SHA-256(auth_secret, ecdh_secret || ua_public || auth_secret)
  const prk = await hmacSha256(authSecret, shared, uaPub, authSecret);

  const keyInfo = new Uint8Array([...new TextEncoder().encode("WebPush: info"), 0, ...uaPub, ...epkRaw]);
  const nonceInfo = new Uint8Array([...new TextEncoder().encode("Content-Encoding: nonce"), 0, ...uaPub, ...epkRaw]);
  const cek = (await hkdfExpand(prk, keyInfo, 16)).slice(0, 16);
  const nonce = (await hkdfExpand(prk, nonceInfo, 12)).slice(0, 12);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, additionalData: undefined }, aesKey, payload)
  );
  const body = new Uint8Array(salt.length + cipher.length);
  body.set(salt, 0);
  body.set(cipher, salt.length);

  return fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `vapid t=${vapid.jwt}, k=${vapid.pub}`,
      TTL: "86400",
      Urgency: "high",
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      Encryption: `salt=${btoa(String.fromCharCode(...salt))}`,
      "Crypto-Key": `dh=${b64url(epkRaw)}`,
    },
    body,
  });
}

export async function pushToSubscriptions(
  db: D1Database,
  subs: PushSubscription[],
  payload: { title: string; body: string; url: string }
): Promise<{ ok: number; failed: number }> {
  const { pub, priv } = await ensureVapidKeys(db);
  const jwt = await vapidJwt(priv, pub);
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let ok = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        if (!sub.keys?.p256dh || !sub.keys?.auth) {
          failed++;
          return;
        }
        const res = await sendEncrypted(sub.endpoint, sub.keys as { p256dh: string; auth: string }, { pub, jwt }, bytes);
        if (res.ok) {
          ok++;
        } else if (res.status === 404 || res.status === 410) {
          await db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").bind(sub.endpoint).run();
          failed++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    })
  );
  return { ok, failed };
}
