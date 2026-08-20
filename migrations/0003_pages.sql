-- 0003: Editor stránek — tabulka stránek pro drag & drop builder.
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL UNIQUE,
  blocks_json TEXT NOT NULL DEFAULT '[]',
  in_nav INTEGER NOT NULL DEFAULT 0,
  nav_label TEXT NOT NULL DEFAULT '',
  nav_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_nav ON pages(in_nav, nav_order);
