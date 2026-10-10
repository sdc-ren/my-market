-- =============================================================================
-- SQL SCHEMA CHO TẠP HÓA THÔNG MINH (SUPABASE POSTGRESQL)
-- =============================================================================

-- 1. Bảng Danh mục hàng hoá
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Bảng Sản phẩm
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  barcode TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  brand TEXT DEFAULT '',
  category TEXT NOT NULL REFERENCES categories(id) ON UPDATE CASCADE,
  unit TEXT NOT NULL,
  cost_price INTEGER NOT NULL DEFAULT 0,
  selling_price INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock_alert INTEGER NOT NULL DEFAULT 5,
  mfg_date TEXT DEFAULT '',
  expiry_date TEXT DEFAULT '',
  batch_number TEXT DEFAULT '',
  shelf_location TEXT DEFAULT '',
  image TEXT DEFAULT '',
  description TEXT DEFAULT '',
  sold_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Bảng Người nợ (Sổ Ghi Nợ)
CREATE TABLE IF NOT EXISTS debtors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  note TEXT DEFAULT '',
  credit_limit INTEGER NOT NULL DEFAULT 2000000,
  total_debt INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Bảng Giao dịch ghi nợ & trả nợ
CREATE TABLE IF NOT EXISTS debt_transactions (
  id TEXT PRIMARY KEY,
  debtor_id TEXT NOT NULL REFERENCES debtors(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'DEBT' | 'PAYMENT'
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'CASH',
  note TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Bảng Chi tiết món hàng trong lần nợ
CREATE TABLE IF NOT EXISTS debt_transaction_items (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES debt_transactions(id) ON DELETE CASCADE,
  product_id TEXT,
  barcode TEXT,
  product_name TEXT NOT NULL,
  unit TEXT DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL DEFAULT 0,
  total_price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Bảng Đơn hàng
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  customer_name TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  customer_address TEXT DEFAULT '',
  delivery_type TEXT DEFAULT 'PICKUP',
  total_amount INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'CASH',
  payment_status TEXT DEFAULT 'PENDING',
  order_status TEXT DEFAULT 'COMPLETED',
  note TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Bảng Món hàng trong đơn hàng
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  barcode TEXT DEFAULT '',
  product_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  cost_price INTEGER DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT DEFAULT '',
  image TEXT DEFAULT ''
);

-- 8. Bảng Cấu hình cửa hàng
CREATE TABLE IF NOT EXISTS store_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  store_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  bank_id TEXT DEFAULT 'MB',
  bank_account TEXT DEFAULT '',
  bank_account_name TEXT DEFAULT '',
  qr_template TEXT DEFAULT 'compact2',
  low_stock_threshold INTEGER DEFAULT 5,
  expiry_warning_days INTEGER DEFAULT 30,
  owner_pin TEXT DEFAULT '1234',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Kích hoạt Row Level Security (RLS) & Cho phép đọc ghi cho người dùng ứng dụng
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE debtors ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách (Policies) cho phép client anon truy cập
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public access categories" ON categories;
  CREATE POLICY "Public access categories" ON categories FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access products" ON products;
  CREATE POLICY "Public access products" ON products FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access debtors" ON debtors;
  CREATE POLICY "Public access debtors" ON debtors FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access debt_transactions" ON debt_transactions;
  CREATE POLICY "Public access debt_transactions" ON debt_transactions FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access debt_transaction_items" ON debt_transaction_items;
  CREATE POLICY "Public access debt_transaction_items" ON debt_transaction_items FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access orders" ON orders;
  CREATE POLICY "Public access orders" ON orders FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access order_items" ON order_items;
  CREATE POLICY "Public access order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access store_settings" ON store_settings;
  CREATE POLICY "Public access store_settings" ON store_settings FOR ALL USING (true) WITH CHECK (true);
END
$$;
