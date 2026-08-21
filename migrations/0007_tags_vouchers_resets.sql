-- 0007 — štítky a filtry, doporučené produkty, dárkové poukazy,
--        obnova hesla e-mailem a automatické mazání kupónů.

-- 1) Štítky produktů (čárkou oddělený seznam) + dárkové poukazy jako produkt
ALTER TABLE products ADD COLUMN tags TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN is_gift_card INTEGER NOT NULL DEFAULT 0;

-- 2) Doporučené („mohlo by se hodit“) produkty ručně vybrané v administraci
CREATE TABLE IF NOT EXISTS product_related (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  related_product_id INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, related_product_id)
);
CREATE INDEX IF NOT EXISTS idx_product_related ON product_related(product_id, sort_order);

-- 3) Kupóny — automatické smazání po vypršení platnosti
ALTER TABLE coupons ADD COLUMN auto_delete INTEGER NOT NULL DEFAULT 0;

-- 4) Dárkové poukazy zakoupené zákazníkem
CREATE TABLE IF NOT EXISTS gift_vouchers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  amount INTEGER NOT NULL,
  order_id INTEGER,
  order_number TEXT NOT NULL DEFAULT '',
  user_id INTEGER,
  buyer_email TEXT NOT NULL DEFAULT '',
  recipient_email TEXT NOT NULL DEFAULT '',
  recipient_name TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TEXT,
  valid_to TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gift_vouchers_order ON gift_vouchers(order_id);
CREATE INDEX IF NOT EXISTS idx_gift_vouchers_user ON gift_vouchers(user_id);

-- 5) Obnova hesla e-mailem
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

-- 6) Doprava e-mailem (jen pro dárkové poukazy)
INSERT OR IGNORE INTO shipping_methods (code, name, description, price, free_over, kind, active, sort_order, eta)
VALUES ('email', 'E-mailem', 'Dárkový poukaz pošleme e-mailem hned po zaplacení.', 0, NULL, 'digital', 1, 0, 'ihned');

-- 7) Výchozí nastavení nových modulů
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('announce_enabled', '1'),
  ('announce_items', ''),
  ('announce_bg', ''),
  ('announce_fg', ''),
  ('home_tiles_enabled', '1'),
  ('home_tiles_show_categories', '1'),
  ('home_tiles_items', ''),
  ('catalog_filters', ''),
  ('gift_enabled', '1'),
  ('gift_valid_months', '12');
