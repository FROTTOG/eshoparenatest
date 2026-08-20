-- 0002: doplnění faktur, reklamací a chybějících indexů.
-- Migrace 0001 tyto tabulky a indexy ještě neobsahovala; databáze, kde už
-- 0001 proběhla, je dostanou touto migrací. Vše je idempotentní (IF NOT EXISTS).

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

CREATE INDEX IF NOT EXISTS idx_products_cat ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_pickup_city ON pickup_points(city);
CREATE INDEX IF NOT EXISTS idx_pickup_type ON pickup_points(type);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(number);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
