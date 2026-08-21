-- „Sleva na první nákup“ (KAVKA10) — jen pro registrované zákazníky a jen jednou.
-- KAVKA10 dostane příslušné vlajky a čerpání sledujeme na konkrétního uživatele.

ALTER TABLE coupons ADD COLUMN requires_login INTEGER NOT NULL DEFAULT 0;
ALTER TABLE coupons ADD COLUMN single_use INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coupon_code TEXT NOT NULL,
  user_id INTEGER,
  order_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user ON coupon_redemptions(coupon_code, user_id);

UPDATE coupons SET requires_login = 1, single_use = 1,
  description = 'Sleva 10 % na první nákup (jen pro registrované, jednou)'
WHERE code = 'KAVKA10';
