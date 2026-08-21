import type { Bindings } from "./types";
import { hashPassword } from "./crypto";
import { PICKUP_POINTS } from "./points";
import { INVOICES_SQL, INVOICES_INDEX_SQL } from "./invoices";

/**
 * Tabulka reklamací je i v SCHEMA_SQL, ale starší databáze (založené migrací
 * 0001, která ji ještě neměla) si ji nevytvořily — proto ji zajišťujeme
 * zvlášť při každém startu, stejně jako tabulku faktur.
 */
export const CLAIMS_SQL = `CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  order_id INTEGER,
  order_number TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

export const CLAIMS_INDEX_SQL = [
  "CREATE INDEX IF NOT EXISTS idx_claims_user ON claims(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status)",
];

/**
 * Indexy ze SCHEMA_SQL, které chybí databázím založeným migrací 0001.
 * Vytvoření je idempotentní, takže je pouštíme při každém studeném startu.
 */
export const GROWTH_SQL = [
  `CREATE TABLE IF NOT EXISTS stock_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    notified_at TEXT,
    UNIQUE(product_id, email)
  )`,
  `CREATE TABLE IF NOT EXISTS product_upsells (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    upsell_product_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(product_id, upsell_product_id)
  )`,
  `CREATE TABLE IF NOT EXISTS shipments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    carrier TEXT NOT NULL,
    tracking_number TEXT NOT NULL DEFAULT '',
    tracking_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'created',
    label_html TEXT NOT NULL DEFAULT '',
    api_response TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS email_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL DEFAULT 'generic',
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT '',
    body_html TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'logged',
    error TEXT,
    meta TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  // Omezení pokusů o přihlášení (brute-force) a Web Push subscriptions.
  `CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL DEFAULT 0,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL DEFAULT '',
    auth TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS otp_challenges (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  "CREATE INDEX IF NOT EXISTS idx_stock_alerts_product ON stock_alerts(product_id)",
  "CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id)",
  "CREATE INDEX IF NOT EXISTS idx_email_log_created ON email_log(created_at)",
  "CREATE INDEX IF NOT EXISTS idx_login_attempts_key ON login_attempts(key)",
  "ALTER TABLE orders ADD COLUMN tracking_number TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE orders ADD COLUMN tracking_carrier TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE orders ADD COLUMN tracking_url TEXT NOT NULL DEFAULT ''",
  // Sloupce pro 2FA, platební bránu a opuštěné košíky (idempotentní ALTERy).
  "ALTER TABLE users ADD COLUMN totp_secret TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE carts ADD COLUMN email TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE orders ADD COLUMN gateway_trans_id TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE orders ADD COLUMN gateway TEXT NOT NULL DEFAULT ''",
  // Editor stránek v2 — tabulka pages i se sloupci pro SEO a vzhled stránky.
  // Starší databáze (založené migrací 0003) dostanou chybějící sloupce
  // idempotentními ALTERy níže.
  `CREATE TABLE IF NOT EXISTS pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT '',
    slug TEXT NOT NULL UNIQUE,
    blocks_json TEXT NOT NULL DEFAULT '[]',
    in_nav INTEGER NOT NULL DEFAULT 0,
    nav_label TEXT NOT NULL DEFAULT '',
    nav_order INTEGER NOT NULL DEFAULT 0,
    published INTEGER NOT NULL DEFAULT 1,
    is_system INTEGER NOT NULL DEFAULT 0,
    meta_title TEXT NOT NULL DEFAULT '',
    meta_description TEXT NOT NULL DEFAULT '',
    noindex INTEGER NOT NULL DEFAULT 0,
    hide_crumbs INTEGER NOT NULL DEFAULT 0,
    page_max_width TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  "CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug)",
  "CREATE INDEX IF NOT EXISTS idx_pages_nav ON pages(in_nav, nav_order)",
];

/**
 * Sloupce editoru stránek v2 — u starších databází (migrace 0003) doplníme
 * potichu, stejně jako se doplňují sloupce objednávek.
 */
const pageCols = [
  "ALTER TABLE pages ADD COLUMN meta_title TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE pages ADD COLUMN meta_description TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE pages ADD COLUMN noindex INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE pages ADD COLUMN hide_crumbs INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE pages ADD COLUMN page_max_width TEXT NOT NULL DEFAULT ''",
];

/**
 * Systémové stránky, které se dají upravovat v editoru. Jejich prázdný
 * `blocks_json` znamená „zobraz výchozí obsah“ (hlavní stránka a statické
 * stránky). Jakmile do nich editor vloží bloky, nahradí výchozí obsah.
 */
export const SYSTEM_PAGES: [string, string][] = [
  ["home", "Hlavní stránka"],
  ["o-nas", "O ateliéru KAVKA"],
  ["doprava-a-platba", "Doprava a platba"],
  ["obchodni-podminky", "Obchodní podmínky"],
  ["ochrana-udaju", "Ochrana osobních údajů"],
  ["reklamace", "Reklamace"],
];

export const LATE_INDEX_SQL = [
  "CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id)",
  "CREATE INDEX IF NOT EXISTS idx_products_active ON products(active)",
  "CREATE INDEX IF NOT EXISTS idx_pickup_city ON pickup_points(city)",
  "CREATE INDEX IF NOT EXISTS idx_pickup_type ON pickup_points(type)",
  "CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(number)",
  "CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id)",
  "CREATE INDEX IF NOT EXISTS idx_cart_items ON cart_items(cart_id)",
  "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
];

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
  description TEXT NOT NULL DEFAULT '',
  requires_login INTEGER NOT NULL DEFAULT 0,
  single_use INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coupon_code TEXT NOT NULL,
  user_id INTEGER,
  order_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON coupon_redemptions(coupon_code, user_id);
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
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  order_id INTEGER NOT NULL,
  order_number TEXT NOT NULL DEFAULT '',
  variable_symbol TEXT NOT NULL DEFAULT '',
  issue_date TEXT NOT NULL,
  taxable_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  customer_street TEXT NOT NULL DEFAULT '',
  customer_city TEXT NOT NULL DEFAULT '',
  customer_zip TEXT NOT NULL DEFAULT '',
  customer_country TEXT NOT NULL DEFAULT 'CZ',
  company_name TEXT NOT NULL DEFAULT '',
  ico TEXT NOT NULL DEFAULT '',
  dic TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'CZK',
  vat_rate INTEGER NOT NULL DEFAULT 21,
  vat_payer INTEGER NOT NULL DEFAULT 1,
  subtotal INTEGER NOT NULL DEFAULT 0,
  vat_amount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  payment_code TEXT NOT NULL DEFAULT '',
  payment_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'issued',
  paid_at TEXT,
  note TEXT NOT NULL DEFAULT '',
  items_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_issue ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_pickup_city ON pickup_points(city);
CREATE INDEX IF NOT EXISTS idx_pickup_type ON pickup_points(type);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(number);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items ON cart_items(cart_id);
CREATE TABLE IF NOT EXISTS claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  order_id INTEGER,
  order_number TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  admin_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_claims_user ON claims(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
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
  invoice_auto: "1",
  invoice_auto_on: "order",
  invoice_prefix: "FV",
  invoice_pad: "4",
  invoice_due_days: "14",
  invoice_vat_payer: "1",
  invoice_vat_rate: "21",
  invoice_currency: "CZK",
  vendor_person: "Jan Minařík",
  vendor_web: "https://jmweb.cz",
  vendor_phone: "+420 776 677 399",
  hero_title: "Domov, který dýchá pomalu",
  hero_text:
    "Keramika z ateliéru, len z dílny, dřevo s kresbou. Posíláme po celé ČR — Z-BOX, Zásilkovna, Balíkovna i na adresu.",
  home_badge: "ATELIÉR KAVKA · VINOHRADY",
  home_hero_primary_cta: "Procházet katalog",
  home_hero_secondary_cta: "Vybrané kousky",
  home_coupon_title: "Sleva 10 % na první nákup",
  home_coupon_text: "V košíku zadejte kód",
  home_categories_title: "Kategorie",
  home_category_fallback: "Kolekce z ateliéru",
  home_category_cta: "Procházet kategorii",
  home_featured_kicker: "Vybrané kousky",
  home_featured_title: "Doporučujeme",
  home_featured_text: "Ručně točená kamenina, praný len a dřevo s kresbou.",
  home_featured_cta: "Zobrazit celý katalog",
  home_trust_1_title: "Z ateliéru",
  home_trust_1_text: "Keramika točená na kruhu, len z české dílny, dřevo olejované přírodním olejem.",
  home_trust_2_title: "Doprava po ČR",
  home_trust_2_text: "Z-BOX, Zásilkovna i Balíkovna s živou mapou",
  home_trust_3_title: "14 dní na vrácení",
  home_trust_3_text: "Zákonná záruka 24 měsíců. Reklamace vyřídíme do 30 dnů, nebo osobně v ateliéru.",
  home_cta_title: "Ateliér na Vinohradech.",
  home_cta_subtitle: "Otevřeno Po–Pá 10:00–18:00.",
  home_cta_primary: "Nakoupit online",
  home_cta_secondary: "O ateliéru",
  packeta_api_key: "197fd6840f332ccf",
  gtm_id: "",
  ga4_id: "",
  meta_pixel_id: "",
  resend_api_key: "",
  mail_from: "ahoj@kavka.shop",
  mail_webhook: "",
  store_url: "",
  feed_token: "",
  ppl_api_key: "",
  ppl_api_url: "",
  dpd_api_key: "",
  dpd_api_url: "",
  ceska_posta_api_key: "",
  ceska_posta_api_url: "",
  wallet_merchant_name: "KAVKA Ateliér",
  apple_pay_merchant_id: "",
  google_pay_merchant_id: "",
  exit_coupon: "STAY5",
  // Platební brána Comgate (karta online / Apple Pay / Google Pay přes bránu).
  // Dokud není comgate_merchant vyplněný, metoda „karta online“ zůstává neaktivní.
  comgate_merchant: "",
  comgate_secret: "",
  comgate_test: "1",
  // Vzhled e-shopu — barvy, zaoblení, stíny a animace načítacích tlačítek (stránka „Vzhled“).
  theme_bg: "#f3eee4",
  theme_bg_deep: "#e7dece",
  theme_card: "#fffdf8",
  theme_ink: "#1c1915",
  theme_accent: "#b54a2c",
  theme_forest: "#24352c",
  theme_radius: "20",
  theme_shadow: "0.08",
  theme_btn_anim: "spin",
  // Dvoufázové ověření (TOTP) pro administrátory: 0 = dobrovolné, 1 = povinné.
  totp_required: "0",
  // Verze cache katalogu — zvyšuje se automaticky po změnách v administraci.
  cache_version: "1",
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
    image: "/products/hrnek.webp",
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
    image: "/products/povleceni.webp",
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
    image: "/products/deka.webp",
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
    image: "/products/tac.webp",
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
    image: "/products/svicka.webp",
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
    image: "/products/vaza.webp",
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
    image: "/products/taska.webp",
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
    image: "/products/difuzer.webp",
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
    image: "/products/rucnik.webp",
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
    image: "/products/hrnek.webp",
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
    image: "/products/deka.webp",
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
    image: "/products/svicka.webp",
    featured: 0,
    weight: 180,
    short: "Nízká kameninová miska s otvorem na tyčinku.",
    desc: "Malý stojánek, který chytí popel a drží tyčinku rovně. Kamenina, neglazovaný spodek. Průměr 9 cm. Hodí se k difuzéru Borovice, když chcete chvíli kouř.",
  },
  {
    name: "Dlouhé zápalky",
    slug: "dlouhe-zapalky",
    sku: "KAV-ZAP-01",
    cat: "vune",
    price: 49,
    stock: 80,
    image: "/products/svicka.webp",
    featured: 0,
    weight: 40,
    short: "Krabička dlouhých zápalek k svíčce. Jedním klikem do košíku.",
    desc: "Tenké dlouhé zápalky v kraftové krabičce. Ke svíčce Smrk nebo difuzéru, když chcete zapálit knot bez ožehnutí prstů. Přibližně 40 ks.",
  },
];

async function seed(env: Bindings) {
  const db = env.DB;
  const stmts: D1PreparedStatement[] = [];

  for (const [k, v] of Object.entries(SETTINGS)) {
    stmts.push(db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").bind(k, v));
  }

  const cats = [
    ["Domov", "domov", "Vázy, dřevo, věci, které zůstanou na stole.", "/products/vaza.webp", 1],
    ["Textil", "textil", "Len, vlna, waffle. Látky, které chtějí ruku.", "/products/povleceni.webp", 2],
    ["Kuchyně", "kuchyne", "Hrnky, misky, tácy — denní chléb domácnosti.", "/products/hrnek.webp", 3],
    ["Vůně", "vune", "Svíčky a difuzéry s lesem, ne s cukrárnou.", "/products/svicka.webp", 4],
    ["Doplňky", "doplnky", "Tašky a drobnosti na cestu z domu.", "/products/taska.webp", 5],
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
    ["apple_pay", "Apple Pay", "Zaplatíte v Safari / iPhonu přes Apple Pay. Objednávka se označí jako zaplacená hned.", 0, 5, "*"],
    ["google_pay", "Google Pay", "Zaplatíte kartou uloženou v Google Pay. Objednávka se označí jako zaplacená hned.", 0, 6, "*"],
  ] as const;
  for (const p of pays) {
    stmts.push(
      db.prepare(
        "INSERT OR IGNORE INTO payment_methods (code, name, description, fee, sort_order, allowed_shipping, active) VALUES (?, ?, ?, ?, ?, ?, 1)"
      ).bind(...p)
    );
  }
  // Karta online přes platební bránu — výchozí stav neaktivní, zapne se
  // v administraci (Doprava a platby) po vyplnění comgate_merchant.
  stmts.push(
    db.prepare(
      `INSERT OR IGNORE INTO payment_methods (code, name, description, fee, sort_order, allowed_shipping, active)
       VALUES ('card', 'Online kartou', 'Visa, Mastercard, Apple Pay a Google Pay přes zabezpečenou platební bránu. Po zaplacení expedujeme ihned.', 0, 0, '*', 0)`
    )
  );

  // KAVKA10 = „sleva na první nákup“: jen pro registrované a jen jednou.
  const coupons = [
    ["KAVKA10", "percent", 10, 0, 200, "Sleva 10 % na první nákup (jen pro registrované, jednou)", 1, 1],
    ["VITEJ150", "fixed", 150, 800, 200, "Sleva 150 Kč od 800 Kč", 0, 0],
    ["LEN20", "percent", 20, 1500, 50, "20 % od 1 500 Kč", 0, 0],
  ] as const;
  for (const c of coupons) {
    stmts.push(
      db.prepare(
        "INSERT OR IGNORE INTO coupons (code, type, value, min_order, max_uses, used_count, active, description, requires_login, single_use) VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?, ?)"
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

  await seedGrowthExtras(env);
  await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('seeded', '1')").run();
}

async function seedGrowthExtras(env: Bindings) {
  const db = env.DB;
  await db
    .prepare(
      `INSERT OR IGNORE INTO payment_methods (code, name, description, fee, sort_order, allowed_shipping, active)
       VALUES ('card', 'Online kartou', 'Visa, Mastercard, Apple Pay a Google Pay přes zabezpečenou platební bránu. Po zaplacení expedujeme ihned.', 0, 0, '*', 0)`
    )
    .run();
  const extraPays = [
    ["apple_pay", "Apple Pay", "Zaplatíte v Safari / iPhonu přes Apple Pay. Objednávka se označí jako zaplacená hned.", 0, 5, "*"],
    ["google_pay", "Google Pay", "Zaplatíte kartou uloženou v Google Pay. Objednávka se označí jako zaplacená hned.", 0, 6, "*"],
  ] as const;
  for (const p of extraPays) {
    await db
      .prepare(
        "INSERT OR IGNORE INTO payment_methods (code, name, description, fee, sort_order, allowed_shipping, active) VALUES (?, ?, ?, ?, ?, ?, 1)"
      )
      .bind(...p)
      .run();
  }
  await db
    .prepare(
      "INSERT OR IGNORE INTO coupons (code, type, value, min_order, max_uses, used_count, active, description) VALUES ('STAY5', 'percent', 5, 0, 5000, 0, 1, 'Sleva 5 % za dokončení nákupu (opuštěný košík)')"
    )
    .run();
  const extraShip = [
    ["ppl", "PPL — na adresu", "Kurýr PPL. Štítek tisknete z administrace jedním klikem.", 99, 2000, "address", 6, "1–2 pracovní dny"],
    ["dpd", "DPD — na adresu", "Kurýr DPD. Štítek tisknete z administrace jedním klikem.", 109, 2000, "address", 7, "1–2 pracovní dny"],
    ["ceska_posta", "Česká pošta — na adresu", "Balík Do ruky. Podání online a tisk štítku z administrace.", 89, 2000, "address", 8, "2–3 pracovní dny"],
  ] as const;
  for (const s of extraShip) {
    await db
      .prepare(
        "INSERT OR IGNORE INTO shipping_methods (code, name, description, price, free_over, kind, sort_order, eta, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)"
      )
      .bind(...s)
      .run();
  }

  const vune = await db.prepare("SELECT id FROM categories WHERE slug = 'vune'").first<{ id: number }>();
  await db
    .prepare(
      `INSERT OR IGNORE INTO products
        (name, slug, sku, description, short_description, price, compare_price, stock, low_stock, category_id, image, weight, active, featured)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, 10, ?, ?, ?, 1, 0)`
    )
    .bind(
      "Dlouhé zápalky",
      "dlouhe-zapalky",
      "KAV-ZAP-01",
      "Tenké dlouhé zápalky v kraftové krabičce. Ke svíčce Smrk nebo difuzéru, když chcete zapálit knot bez ožehnutí prstů. Přibližně 40 ks.",
      "Krabička dlouhých zápalek k svíčce. Jedním klikem do košíku.",
      49,
      80,
      vune?.id ?? null,
      "/products/svicka.webp",
      40
    )
    .run();

  const candle = await db.prepare("SELECT id FROM products WHERE slug = 'sojova-svicka-smrk'").first<{ id: number }>();
  const matches = await db.prepare("SELECT id FROM products WHERE slug = 'dlouhe-zapalky'").first<{ id: number }>();
  const difuzer = await db.prepare("SELECT id FROM products WHERE slug = 'difuzer-borovice'").first<{ id: number }>();
  const stojanek = await db.prepare("SELECT id FROM products WHERE slug = 'stojanek-vonnych-tycinek'").first<{ id: number }>();
  if (candle && matches) {
    await db
      .prepare("INSERT OR IGNORE INTO product_upsells (product_id, upsell_product_id, sort_order) VALUES (?, ?, 0)")
      .bind(candle.id, matches.id)
      .run();
  }
  if (difuzer && stojanek) {
    await db
      .prepare("INSERT OR IGNORE INTO product_upsells (product_id, upsell_product_id, sort_order) VALUES (?, ?, 0)")
      .bind(difuzer.id, stojanek.id)
      .run();
  }
  if (matches) {
    const hasImg = await db.prepare("SELECT id FROM product_images WHERE product_id = ?").bind(matches.id).first();
    if (!hasImg) {
      await db.prepare("INSERT INTO product_images (product_id, url, sort_order) VALUES (?, ?, 0)").bind(matches.id, "/products/svicka.webp").run();
    }
  }
}

async function runChunked(db: D1Database, stmts: D1PreparedStatement[], size = 20) {
  for (let i = 0; i < stmts.length; i += size) {
    await db.batch(stmts.slice(i, i + size));
  }
}

let ready: Promise<void> | null = null;

async function prepareDatabase(env: Bindings) {
  const has = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first();
  if (!has) {
    const stmts = SCHEMA_SQL.split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of stmts) {
      try {
        await env.DB.prepare(stmt).run();
      } catch (err) {
        console.error("Prepare stmt error:", err, "Stmt:", stmt);
      }
    }
  }
  const seeded = await env.DB.prepare("SELECT value FROM settings WHERE key = 'seeded'").first<{ value: string }>();
  try {
    await env.DB.prepare("ALTER TABLE pickup_points ADD COLUMN external_id TEXT").run();
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
      await env.DB.prepare(col).run();
    } catch {
      /* sloupec už existuje */
    }
  }
  for (const col of pageCols) {
    try {
      await env.DB.prepare(col).run();
    } catch {
      /* sloupec už existuje */
    }
  }

  // Kupóny — „sleva na první nákup“ pro registrované a jen jednou.
  for (const col of [
    "ALTER TABLE coupons ADD COLUMN requires_login INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE coupons ADD COLUMN single_use INTEGER NOT NULL DEFAULT 0",
  ]) {
    try {
      await env.DB.prepare(col).run();
    } catch {
      /* sloupec už existuje */
    }
  }
  try {
    await env.DB
      .prepare(
        "CREATE TABLE IF NOT EXISTS coupon_redemptions (id INTEGER PRIMARY KEY AUTOINCREMENT, coupon_code TEXT NOT NULL, user_id INTEGER, order_id INTEGER, created_at TEXT NOT NULL DEFAULT (datetime('now')))"
      )
      .run();
    await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON coupon_redemptions(coupon_code, user_id)").run();
  } catch (err) {
    console.error("coupon_redemptions schema error:", err);
  }
  // Označíme KAVKA10 jako slevu na první nákup (i u dříve vytvořených databází).
  try {
    await env.DB
      .prepare("UPDATE coupons SET requires_login = 1, single_use = 1, description = 'Sleva 10 % na první nákup (jen pro registrované, jednou)' WHERE code = 'KAVKA10'")
      .run();
  } catch {
    /* kupón nemusí existovat */
  }

  // Platební metoda „karta online“ — i u databází založených dříve.
  // Zůstává neaktivní, dokud správce nezapne platební bránu (comgate_merchant).
  try {
    await env.DB
      .prepare(
        `INSERT OR IGNORE INTO payment_methods (code, name, description, fee, sort_order, allowed_shipping, active)
         VALUES ('card', 'Online kartou', 'Visa, Mastercard, Apple Pay a Google Pay přes zabezpečenou platební bránu. Po zaplacení expedujeme ihned.', 0, 0, '*', 0)`
      )
      .run();
  } catch {
    /* tabulka nemusí být ještě připravená */
  }

  // Faktury — doplníme i do starších databází.
  for (const stmt of [INVOICES_SQL, ...INVOICES_INDEX_SQL]) {
    try {
      await env.DB.prepare(stmt).run();
    } catch (err) {
      console.error("Invoices schema error:", err);
    }
  }

  // Reklamace a indexy — doplníme i do starších databází (migrace 0001 je ještě neměla).
  for (const stmt of [CLAIMS_SQL, ...CLAIMS_INDEX_SQL, ...LATE_INDEX_SQL, ...GROWTH_SQL]) {
    try {
      await env.DB.prepare(stmt).run();
    } catch (err) {
      console.error("Late schema error:", err);
    }
  }

  // Systémové stránky editoru — vzniknou automaticky, aby šly upravovat
  // (hlavní stránka, O ateliéru, doprava, VOP, GDPR, reklamace). Prázdné
  // bloky znamenají „ponech výchozí obsah“.
  for (const [slug, title] of SYSTEM_PAGES) {
    try {
      await env.DB.prepare(
        "INSERT OR IGNORE INTO pages (title, slug, blocks_json, in_nav, nav_label, nav_order, published, is_system) VALUES (?, ?, '[]', 0, '', 0, 1, 1)"
      )
        .bind(title, slug)
        .run();
    } catch (err) {
      console.error("System page seed error:", err);
    }
  }

  const settingStmts = Object.entries(SETTINGS).map(([k, v]) =>
    env.DB.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").bind(k, v)
  );
  await runChunked(env.DB, settingStmts);

  if (seeded?.value === "1") return;
  const n = await env.DB.prepare("SELECT COUNT(*) AS c FROM products").first<{ c: number }>();
  if ((n?.c || 0) > 0) {
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('seeded', '1')").run();
    return;
  }
  await seed(env);
}

/**
 * Příprava schématu je pro jednu Worker instanci společná. Bez této cache by
 * každý API požadavek znovu kontroloval všechny migrace a desítky nastavení.
 * Při chybě cache zahodíme, aby se další požadavek mohl bezpečně pokusit znovu.
 */
export function ensureReady(env: Bindings): Promise<void> {
  if (!ready) {
    ready = prepareDatabase(env).catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}
