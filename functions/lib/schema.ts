import type { Bindings } from "./types";
import { hashPassword } from "./crypto";
import { PICKUP_POINTS } from "./points";

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  label TEXT NOT NULL DEFAULT 'Domů',
  name TEXT NOT NULL,
  street TEXT NOT NULL,
  city TEXT NOT NULL,
  zip TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'CZ',
  phone TEXT NOT NULL DEFAULT '',
  is_default INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  short_description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL,
  compare_price INTEGER,
  stock INTEGER NOT NULL DEFAULT 0,
  low_stock INTEGER NOT NULL DEFAULT 5,
  category_id INTEGER,
  image TEXT NOT NULL DEFAULT '',
  weight INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  coupon_code TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  UNIQUE(cart_id, product_id)
);
CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  type TEXT NOT NULL,
  value INTEGER NOT NULL,
  min_order INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_from TEXT,
  valid_to TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS shipping_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  free_over INTEGER,
  kind TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  eta TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS payment_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  fee INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  allowed_shipping TEXT NOT NULL DEFAULT '*'
);
CREATE TABLE IF NOT EXISTS pickup_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  carrier TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  zip TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  opening_hours TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  user_id INTEGER,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  billing_name TEXT NOT NULL DEFAULT '',
  billing_street TEXT NOT NULL DEFAULT '',
  billing_city TEXT NOT NULL DEFAULT '',
  billing_zip TEXT NOT NULL DEFAULT '',
  billing_country TEXT NOT NULL DEFAULT 'CZ',
  is_company INTEGER NOT NULL DEFAULT 0,
  company_name TEXT NOT NULL DEFAULT '',
  ico TEXT NOT NULL DEFAULT '',
  dic TEXT NOT NULL DEFAULT '',
  different_shipping INTEGER NOT NULL DEFAULT 0,
  shipping_recipient TEXT NOT NULL DEFAULT '',
  shipping_code TEXT NOT NULL,
  shipping_name TEXT NOT NULL,
  shipping_price INTEGER NOT NULL,
  payment_code TEXT NOT NULL,
  payment_name TEXT NOT NULL,
  payment_fee INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'new',
  street TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT 'CZ',
  pickup_point_id INTEGER,
  pickup_snapshot TEXT NOT NULL DEFAULT '',
  subtotal INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  coupon_code TEXT,
  total INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  agree_terms INTEGER NOT NULL DEFAULT 1,
  agree_gdpr INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT '',
  approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(product_id, user_id)
);
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  order_id INTEGER,
  admin_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_pickup_city ON pickup_points(city);
CREATE INDEX IF NOT EXISTS idx_pickup_type ON pickup_points(type);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(number);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`;

const SETTINGS: Record<string, string> = {
  store_name: "KAVKA",
  store_company: "KAVKA Ateliér s.r.o.",
  store_ico: "19200456",
  store_dic: "CZ19200456",
  store_vat_note: "Plátce DPH (všechny ceny jsou konečné včetně DPH)",
  store_registry: "Zapsáno v obchodním rejstříku vedeném Městským soudem v Praze, oddíl C, vložka 384512",
  store_tagline: "Věci s charakterem",
  store_email: "ahoj@kavka.shop",
  store_phone: "+420 777 123 456",
  store_address: "Korunní 42, 120 00 Praha 2 - Vinohrady",
  store_return_address: "KAVKA Ateliér (reklamace a vrácení), Korunní 42, 120 00 Praha 2",
  store_hours: "Po–Pá 10:00–18:00",
  iban: "CZ6508000000192000145399",
  bank_name: "Česká spořitelna, a.s.",
  bank_account: "192000145399/0800",
  reviews_auto_approve: "1",
  hero_title: "Domov, který dýchá pomalu",
  hero_text:
    "Keramika z ateliéru, len z dílny, dřevo s kresbou. Posíláme po celé ČR — Z-BOX, Zásilkovna, Balíkovna i na adresu.",
  packeta_api_key: "197fd6840f332ccf",
};

type ProductSeed = {
  name: string;
  slug: string;
  sku: string;
  cat: string;
  price: number;
  compare?: number;
  stock: number;
  image: string;
  featured: number;
  weight: number;
  short: string;
  desc: string;
};

const PRODUCTS: ProductSeed[] = [
  {
    name: "Keramický hrnek Hlína",
    slug: "keramicky-hrnek-hlina",
    sku: "KAV-HRN-01",
    cat: "kuchyne",
    price: 490,
    stock: 24,
    image: "/products/hrnek.jpg",
    featured: 1,
    weight: 380,
    short: "Ručně točený hrnek s tečkovanou glazurou a surovým soklem.",
    desc: "Každý hrnek Hlína vzniká na kruhu v malé dílně. Tělo má jemný tečkovaný střep, glazura je teplá, skoro jako vypálená hlína po dešti. Surový sokl necháváme bez glazury — sedí v dlani a nezvoní o stůl. Objem přibližně 300 ml. Mýt ručně.",
  },
  {
    name: "Lněné povlečení Písek",
    slug: "lnene-povleceni-pisek",
    sku: "KAV-POV-01",
    cat: "textil",
    price: 2890,
    compare: 3290,
    stock: 12,
    image: "/products/povleceni.jpg",
    featured: 1,
    weight: 1600,
    short: "Prané lněné povlečení v barvě říčního písku. 140 × 200 + 70 × 90.",
    desc: "Len, který je už z výroby vypraný, takže první noc není škrábání, ale měkký chlad. Barva Písek je teplá béžová — nesvítí, nešedne. Sada obsahuje povlak na peřinu 140 × 200 cm a povlak na polštář 70 × 90 cm. Složení 100 % len. Prát na 40 °C, sušit volně.",
  },
  {
    name: "Vlněná deka Ovce",
    slug: "vlnena-deka-ovce",
    sku: "KAV-DEK-01",
    cat: "textil",
    price: 2490,
    stock: 8,
    image: "/products/deka.jpg",
    featured: 1,
    weight: 1400,
    short: "Těžká vlněná deka v krémové a terakotě. 140 × 200 cm.",
    desc: "Deka Ovce je tkaná z evropské vlny, hustá, s viditelným vlasem. Pruhy krémové a pálené hlíny. V zimě na gauč, v létě přes nohy u otevřeného okna. Rozměr 140 × 200 cm. Čistit chemicky nebo vyvětrat v mrazu — vlna si s pachy poradí sama.",
  },
  {
    name: "Dubový tác",
    slug: "dubovy-tac",
    sku: "KAV-TAC-01",
    cat: "kuchyne",
    price: 890,
    stock: 18,
    image: "/products/tac.jpg",
    featured: 1,
    weight: 650,
    short: "Masivní dubový tác se zaoblenými rohy a živou kresbou.",
    desc: "Tác z masivního dubu, olejovaný přírodním olejem. Zaoblené rohy, nízký lem, kresba dřeva je pokaždé jiná. Snídaně do postele, sýry na stůl, klíče u dveří. Rozměr přibližně 36 × 24 cm. Otírat vlhkým hadříkem, ne myčku.",
  },
  {
    name: "Sójová svíčka Smrk",
    slug: "sojova-svicka-smrk",
    sku: "KAV-SVC-01",
    cat: "vune",
    price: 420,
    stock: 40,
    image: "/products/svicka.jpg",
    featured: 1,
    weight: 320,
    short: "Sójový vosk v jantarovém skle. Jehličí, kůra, trocha kouře.",
    desc: "Vůně zimního lesa bez umělého „vonítka z auta“. Svíčka Smrk je litá ze sójového vosku do jantarového skla, knot je bavlněný. Hoří přibližně 40 hodin. První hoření nechte, až se vosk rozleje k okrajům — vydrží rovně.",
  },
  {
    name: "Váza Kouř",
    slug: "vaza-kour",
    sku: "KAV-VAZ-01",
    cat: "domov",
    price: 1290,
    stock: 9,
    image: "/products/vaza.jpg",
    featured: 1,
    weight: 900,
    short: "Ručně foukané kouřové sklo. Organický tvar, jedno ústí.",
    desc: "Váza Kouř je foukaná ústy, proto není dokonale souměrná — a to je právě ono. Kouřové šedé sklo, těžké dno, úzké hrdlo pro pár stébel nebo jednu větev. Výška přibližně 22 cm. Mýt vlažnou vodou.",
  },
  {
    name: "Plátěná taška Poutník",
    slug: "platena-taska-poutnik",
    sku: "KAV-TAS-01",
    cat: "doplnky",
    price: 1190,
    compare: 1390,
    stock: 15,
    image: "/products/taska.jpg",
    featured: 0,
    weight: 480,
    short: "Pevná plátěná taška s koženými uchy. Unese nákup i notebook.",
    desc: "Taška Poutník je šitá z hutného bavlněného plátna barvy písku. Ucha jsou z hovězí kůže, dno má skryté vyztužení. Vejde se A4, láhev, svetr. Zapínání na skrytý magnet. Nenosit v lijáku — plátno není voskované.",
  },
  {
    name: "Difuzér Borovice",
    slug: "difuzer-borovice",
    sku: "KAV-DIF-01",
    cat: "vune",
    price: 560,
    stock: 22,
    image: "/products/difuzer.jpg",
    featured: 0,
    weight: 280,
    short: "Ratanové tyčinky v kouřovém skle. Pryskyřice a jehličí.",
    desc: "Pokojová vůně bez plamene. Směs vonných olejů s pryskyřicí a borovicí, ratanové tyčinky, lahvička z kouřového skla. Otočte tyčinky jednou za pár dní. Vydrží zhruba osm týdnů v běžném pokoji.",
  },
  {
    name: "Waffle ručník Žito",
    slug: "waffle-rucnik-zito",
    sku: "KAV-RUC-01",
    cat: "textil",
    price: 390,
    stock: 30,
    image: "/products/rucnik.jpg",
    featured: 0,
    weight: 220,
    short: "Bavlněný waffle ručník. Ovesná a terakota. 50 × 90 cm.",
    desc: "Lehký, savý, po vyprání ještě hezčí. Vazba waffle rychle schne a nezabírá skříň. Prodáváme v barvě ovsa a pálené hlíny. Rozměr 50 × 90 cm, 100 % bavlna. Prát na 40 °C.",
  },
  {
    name: "Miska Kamenina",
    slug: "miska-kamenina",
    sku: "KAV-MIS-01",
    cat: "kuchyne",
    price: 640,
    stock: 16,
    image: "/products/hrnek.jpg",
    featured: 0,
    weight: 520,
    short: "Hluboká miska z kameniny. Kaše, polévka, večerní ovoce.",
    desc: "Miska z vysokopálené kameniny, tečkovaná glazura v barvě ovsa. Průměr 16 cm, jde do myčky i trouby (ne termický šok). Pár k hrnku Hlína.",
  },
  {
    name: "Lněný polštář Šalvěj",
    slug: "lneny-polstar-salvej",
    sku: "KAV-POL-01",
    cat: "textil",
    price: 790,
    stock: 14,
    image: "/products/deka.jpg",
    featured: 0,
    weight: 450,
    short: "Potah z praného lnu v šalvějové zeleni. 45 × 45 cm, výplň v sadě.",
    desc: "Dekorativní polštář s potahem ze 100% lnu, barva šalvěj. Skrytý zip, výplň z recyklovaných vláken v sadě. 45 × 45 cm. Potah snímatelný, prát na 30 °C.",
  },
  {
    name: "Stojánek na vonné tyčinky",
    slug: "stojanek-vonnych-tycinek",
    sku: "KAV-STO-01",
    cat: "vune",
    price: 280,
    stock: 35,
    image: "/products/svicka.jpg",
    featured: 0,
    weight: 180,
    short: "Nízká kameninová miska s otvorem na tyčinku.",
    desc: "Malý stojánek, který chytí popel a drží tyčinku rovně. Kamenina, neglazovaný spodek. Průměr 9 cm. Hodí se k difuzéru Borovice, když chcete chvíli kouř.",
  },
];

async function seed(env: Bindings) {
  const db = env.DB;
  const stmts: D1PreparedStatement[] = [];

  for (const [k, v] of Object.entries(SETTINGS)) {
    stmts.push(db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").bind(k, v));
  }

  const cats = [
    ["Domov", "domov", "Vázy, dřevo, věci, které zůstanou na stole.", "/products/vaza.jpg", 1],
    ["Textil", "textil", "Len, vlna, waffle. Látky, které chtějí ruku.", "/products/povleceni.jpg", 2],
    ["Kuchyně", "kuchyne", "Hrnky, misky, tácy — denní chléb domácnosti.", "/products/hrnek.jpg", 3],
    ["Vůně", "vune", "Svíčky a difuzéry s lesem, ne s cukrárnou.", "/products/svicka.jpg", 4],
    ["Doplňky", "doplnky", "Tašky a drobnosti na cestu z domu.", "/products/taska.jpg", 5],
  ] as const;
  for (const c of cats) {
    stmts.push(
      db.prepare(
        "INSERT OR IGNORE INTO categories (name, slug, description, image, sort_order, active) VALUES (?, ?, ?, ?, ?, 1)"
      ).bind(...c)
    );
  }

  const shipping = [
    ["zasilkovna_zbox", "Zásilkovna Z-BOX", "Výdej z boxu kdykoli. Otevře se živá mapa Packety.", 59, 1500, "pickup_zbox", 1, "1–2 pracovní dny"],
    ["zasilkovna", "Zásilkovna — výdejní místo", "Pobočka Zásilkovny. Výběr v oficiální mapě Packety.", 79, 1500, "pickup_zasilkovna", 2, "1–2 pracovní dny"],
    ["balikovna", "Balíkovna", "Pošta, trafika nebo box. Živá mapa České pošty.", 65, 1500, "pickup_balikovna", 3, "2–3 pracovní dny"],
    ["address", "Na adresu", "Kurýr až ke dveřím. Vyplníte ulici, město a PSČ.", 99, 2000, "address", 4, "1–3 pracovní dny"],
    ["store", "Osobní odběr Praha", "Vyzvednutí v našem ateliéru na Vinohradech.", 0, null, "store", 5, "zítra od 10:00"],
  ] as const;
  for (const s of shipping) {
    stmts.push(
      db.prepare(
        "INSERT OR IGNORE INTO shipping_methods (code, name, description, price, free_over, kind, sort_order, eta, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)"
      ).bind(...s)
    );
  }

  const pays = [
    ["transfer", "Bankovní převod", "Po odeslání objednávky uvidíte QR platbu a údaje k převodu. Zboží expedujeme po připsání.", 0, 1, "*"],
    ["cod", "Dobírka", "Zaplatíte hotově nebo kartou až při převzetí. Nelze u Z-BOXu.", 39, 2, "zasilkovna,balikovna,address"],
    ["card_delivery", "Kartou při převzetí", "Terminál u kurýra nebo na výdejním místě.", 0, 3, "zasilkovna,balikovna,address"],
    ["cash_store", "Hotově při odběru", "Jen při osobním vyzvednutí v ateliéru.", 0, 4, "store"],
  ] as const;
  for (const p of pays) {
    stmts.push(
      db.prepare(
        "INSERT OR IGNORE INTO payment_methods (code, name, description, fee, sort_order, allowed_shipping, active) VALUES (?, ?, ?, ?, ?, ?, 1)"
      ).bind(...p)
    );
  }

  const coupons = [
    ["KAVKA10", "percent", 10, 0, 200, "Sleva 10 % na celý nákup"],
    ["VITEJ150", "fixed", 150, 800, 200, "Sleva 150 Kč od 800 Kč"],
    ["LEN20", "percent", 20, 1500, 50, "20 % od 1 500 Kč"],
  ] as const;
  for (const c of coupons) {
    stmts.push(
      db.prepare(
        "INSERT OR IGNORE INTO coupons (code, type, value, min_order, max_uses, used_count, active, description) VALUES (?, ?, ?, ?, ?, 0, 1, ?)"
      ).bind(...c)
    );
  }

  await runChunked(db, stmts);

  const catRows = await db.prepare("SELECT id, slug FROM categories").all<{ id: number; slug: string }>();
  const catMap = new Map((catRows.results || []).map((r) => [r.slug, r.id]));

  const pStmts: D1PreparedStatement[] = [];
  for (const p of PRODUCTS) {
    pStmts.push(
      db.prepare(
        `INSERT OR IGNORE INTO products
          (name, slug, sku, description, short_description, price, compare_price, stock, low_stock, category_id, image, weight, active, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 5, ?, ?, ?, 1, ?)`
      ).bind(
        p.name,
        p.slug,
        p.sku,
        p.desc,
        p.short,
        p.price,
        p.compare ?? null,
        p.stock,
        catMap.get(p.cat) ?? null,
        p.image,
        p.weight,
        p.featured
      )
    );
  }
  await runChunked(db, pStmts);

  const prodRows = await db.prepare("SELECT id, image FROM products").all<{ id: number; image: string }>();
  const imgStmts = (prodRows.results || []).map((p) =>
    db.prepare("INSERT INTO product_images (product_id, url, sort_order) VALUES (?, ?, 0)").bind(p.id, p.image)
  );
  await runChunked(db, imgStmts);

  const pointStmts = PICKUP_POINTS.map((p) =>
    db
      .prepare(
        "INSERT INTO pickup_points (carrier, type, name, address, city, zip, lat, lng, opening_hours, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)"
      )
      .bind(p.carrier, p.type, p.name, p.address, p.city, p.zip, p.lat, p.lng, p.hours)
  );
  await runChunked(db, pointStmts);

  const adminHash = await hashPassword("KavkaAdmin123");
  const annaHash = await hashPassword("Anna12345");
  await db
    .prepare("INSERT OR IGNORE INTO users (email, password_hash, name, phone, role) VALUES (?, ?, ?, ?, ?)")
    .bind("admin@kavka.shop", adminHash, "Správce KAVKA", "+420 777 123 456", "admin")
    .run();
  await db
    .prepare("INSERT OR IGNORE INTO users (email, password_hash, name, phone, role) VALUES (?, ?, ?, ?, ?)")
    .bind("anna@example.com", annaHash, "Anna Nováková", "+420 603 111 222", "customer")
    .run();

  const anna = await db.prepare("SELECT id FROM users WHERE email = ?").bind("anna@example.com").first<{ id: number }>();
  const admin = await db.prepare("SELECT id FROM users WHERE email = ?").bind("admin@kavka.shop").first<{ id: number }>();
  if (anna) {
    await db
      .prepare(
        "INSERT INTO addresses (user_id, label, name, street, city, zip, country, phone, is_default) VALUES (?, 'Domů', ?, 'Vinohradská 18', 'Praha', '12000', 'CZ', ?, 1)"
      )
      .bind(anna.id, "Anna Nováková", "+420 603 111 222")
      .run();
  }

  const hrnek = await db.prepare("SELECT id FROM products WHERE slug = ?").bind("keramicky-hrnek-hlina").first<{ id: number }>();
  const deka = await db.prepare("SELECT id FROM products WHERE slug = ?").bind("vlnena-deka-ovce").first<{ id: number }>();
  const vaza = await db.prepare("SELECT id FROM products WHERE slug = ?").bind("vaza-kour").first<{ id: number }>();
  if (anna && hrnek && deka && vaza) {
    await db
      .prepare(
        "INSERT OR IGNORE INTO reviews (product_id, user_id, rating, title, comment, approved) VALUES (?, ?, 5, ?, ?, 1)"
      )
      .bind(hrnek.id, anna.id, "Sedí v dlani", "Konečně hrnek, který není tenkostěnný jako z drogerie. Glazura je krásně nepravidelná.")
      .run();
    await db
      .prepare(
        "INSERT OR IGNORE INTO reviews (product_id, user_id, rating, title, comment, approved) VALUES (?, ?, 5, ?, ?, 1)"
      )
      .bind(deka.id, anna.id, "Těžká jak má být", "Vlněná, hřeje a hezky smrdí ovčí. To je kompliment.")
      .run();
    await db
      .prepare(
        "INSERT OR IGNORE INTO reviews (product_id, user_id, rating, title, comment, approved) VALUES (?, ?, 4, ?, ?, 1)"
      )
      .bind(vaza.id, anna.id, "Těžké dno", "Sklo je krásně kouřové. Trochu menší hrdlo, než jsem čekala — na jednu větev ideál.")
      .run();
  }

  if (admin) {
    const stockRows = await db.prepare("SELECT id, stock FROM products").all<{ id: number; stock: number }>();
    const mv = (stockRows.results || []).map((p) =>
      db
        .prepare("INSERT INTO stock_movements (product_id, delta, reason, admin_id) VALUES (?, ?, 'Počáteční naskladnění', ?)")
        .bind(p.id, p.stock, admin.id)
    );
    await runChunked(db, mv);
  }

  await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('seeded', '1')").run();
}

async function runChunked(db: D1Database, stmts: D1PreparedStatement[], size = 20) {
  for (let i = 0; i < stmts.length; i += size) {
    await db.batch(stmts.slice(i, i + size));
  }
}

export async function ensureReady(env: Bindings) {
  const has = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first();
  if (!has) await env.DB.exec(SCHEMA_SQL);
  const seeded = await env.DB.prepare("SELECT value FROM settings WHERE key = 'seeded'").first<{ value: string }>();
  try {
    await env.DB.exec("ALTER TABLE pickup_points ADD COLUMN external_id TEXT");
  } catch {
    /* už existuje */
  }

  const orderCols = [
    "ALTER TABLE orders ADD COLUMN billing_name TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN billing_street TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN billing_city TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN billing_zip TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN billing_country TEXT NOT NULL DEFAULT 'CZ'",
    "ALTER TABLE orders ADD COLUMN is_company INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN company_name TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN ico TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN dic TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN different_shipping INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN shipping_recipient TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE orders ADD COLUMN agree_terms INTEGER NOT NULL DEFAULT 1",
    "ALTER TABLE orders ADD COLUMN agree_gdpr INTEGER NOT NULL DEFAULT 1",
  ];
  for (const col of orderCols) {
    try {
      await env.DB.exec(col);
    } catch {
      /* sloupec už existuje */
    }
  }

  for (const [k, v] of Object.entries(SETTINGS)) {
    await env.DB.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").bind(k, v).run();
  }

  if (seeded?.value === "1") return;
  const n = await env.DB.prepare("SELECT COUNT(*) AS c FROM products").first<{ c: number }>();
  if ((n?.c || 0) > 0) {
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('seeded', '1')").run();
    return;
  }
  await seed(env);
}
