-- Magazín (blog), velkoobchodní režim (B2B) a série opuštěného košíku.
-- Stejné příkazy pouští i functions/lib/schema.ts při startu (idempotentně),
-- tenhle soubor je pro ruční spuštění: npx wrangler d1 migrations apply kavka-shop --remote

-- 1) Magazín / blog
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL UNIQUE,
  perex TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  cover TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  meta_title TEXT NOT NULL DEFAULT '',
  meta_description TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 0,
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published, published_at);

-- 2) Velkoobchodní režim (B2B)
ALTER TABLE users ADD COLUMN customer_group TEXT NOT NULL DEFAULT 'retail';
ALTER TABLE users ADD COLUMN company_name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN ico TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN price_b2b INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN customer_group TEXT NOT NULL DEFAULT 'retail';

-- 3) Opuštěné košíky — která fáze připomínky už odešla
ALTER TABLE carts ADD COLUMN abandoned_stage INTEGER NOT NULL DEFAULT 0;
ALTER TABLE carts ADD COLUMN abandoned_at TEXT;

-- 4) Výchozí nastavení nových modulů
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('b2b_enabled', '1'),
  ('b2b_discount', '20'),
  ('b2b_note', 'Velkoobchodní ceny jsou uvedené bez DPH. DPH dopočítáme v pokladně.'),
  ('blog_enabled', '1'),
  ('blog_title', 'Magazín'),
  ('blog_perex', 'Články z ateliéru — jak pečovat o keramiku, len i dřevo.'),
  ('abandoned_enabled', '1'),
  ('abandoned_stage1_hours', '2'),
  ('abandoned_stage2_hours', '24'),
  ('og_dynamic', '1');
