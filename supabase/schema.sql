-- ==============================================================================
-- SCHEMA CƠ SỞ DỮ LIỆU SUPABASE CHO TẠP HOÁ - QUẢN LÝ SỔ GHI NỢ KHÁCH HÀNG
-- ==============================================================================
-- Hướng dẫn: 
-- 1. Đăng nhập vào trang quản trị Supabase (https://supabase.com/dashboard)
-- 2. Vào mục "SQL Editor" -> Bấm "New Query"
-- 3. Dán toàn bộ nội dung script này vào và bấm "Run" để khởi tạo bảng & trigger
-- ==============================================================================

-- Bật extension tạo UUID tự động nếu chưa có
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. BẢNG HỒ SƠ NGƯỜI NỢ (DEBTORS / CUSTOMERS WITH CREDIT)
-- Mỗi người nợ là 1 phần hồ sơ riêng biệt
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.debtors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                             -- Tên người nợ (vd: Cô Tư đầu hẻm, Anh Ba xe ôm)
    phone TEXT,                                     -- Số điện thoại liên hệ
    address TEXT,                                   -- Địa chỉ / vị trí nhận diện (vd: Nhà số 12, đối diện trường)
    note TEXT,                                      -- Ghi chú bổ sung
    credit_limit NUMERIC(12, 2) DEFAULT 2000000,    -- Hạn mức cho nợ tối đa (mặc định 2,000,000 đ)
    total_debt NUMERIC(12, 2) DEFAULT 0,            -- Tổng số tiền hiện đang nợ (tự động cập nhật qua trigger)
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SETTLED', 'BLOCKED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chỉ mục tìm kiếm nhanh theo tên và số điện thoại
CREATE INDEX IF NOT EXISTS idx_debtors_name ON public.debtors (name);
CREATE INDEX IF NOT EXISTS idx_debtors_phone ON public.debtors (phone);
CREATE INDEX IF NOT EXISTS idx_debtors_status ON public.debtors (status);

-- ------------------------------------------------------------------------------
-- 2. BẢNG GIAO DỊCH SỔ NỢ (DEBT TRANSACTIONS)
-- Lưu lại từng lần mua nợ (DEBT) hoặc từng lần trả nợ (PAYMENT)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.debt_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debtor_id UUID NOT NULL REFERENCES public.debtors(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('DEBT', 'PAYMENT')), -- DEBT: Mua chịu; PAYMENT: Trả tiền nợ
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),     -- Số tiền ghi nợ hoặc số tiền trả
    balance_after NUMERIC(12, 2) NOT NULL DEFAULT 0,       -- Dư nợ còn lại sau giao dịch
    payment_method TEXT CHECK (payment_method IN ('CASH', 'VIETQR', 'TRANSFER', 'OTHER')), -- Hình thức trả nếu là PAYMENT
    note TEXT,                                             -- Ghi chú (vd: Mua thiếu 2 chai dầu, trả trước 100k...)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debt_trans_debtor ON public.debt_transactions (debtor_id);
CREATE INDEX IF NOT EXISTS idx_debt_trans_created_at ON public.debt_transactions (created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. BẢNG CHI TIẾT MẶT HÀNG MUA NỢ (DEBT TRANSACTION ITEMS)
-- Khi mua nợ, lưu chi tiết mua những món hàng gì, số lượng bao nhiêu
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.debt_transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.debt_transactions(id) ON DELETE CASCADE,
    product_id TEXT,                                      -- ID sản phẩm trong kho (nếu có)
    barcode TEXT,                                         -- Mã vạch sản phẩm (nếu quét barcode)
    product_name TEXT NOT NULL,                           -- Tên mặt hàng (vd: Nước mắm Nam Ngư 500ml)
    unit TEXT DEFAULT 'cái',                              -- Đơn vị tính (chai, gói, lon, kg, lốc...)
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,           -- Số lượng mua
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,         -- Đơn giá tại thời điểm nợ
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0,        -- Thành tiền = quantity * unit_price
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debt_items_transaction ON public.debt_transaction_items (transaction_id);

-- ------------------------------------------------------------------------------
-- 4. FUNCTION & TRIGGER TỰ ĐỘNG TÍNH TOÁN DƯ NỢ CỦA NGƯỜI NỢ
-- Mỗi khi thêm/xóa/sửa giao dịch nợ, tổng nợ của người đó sẽ được cập nhật chính xác
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalculate_debtor_balance()
RETURNS TRIGGER AS $$
DECLARE
    target_debtor_id UUID;
    calculated_debt NUMERIC(12, 2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_debtor_id := OLD.debtor_id;
    ELSE
        target_debtor_id := NEW.debtor_id;
    END IF;

    -- Tính tổng nợ = Tổng số tiền DEBT trừ đi Tổng số tiền PAYMENT
    SELECT COALESCE(
        SUM(CASE WHEN type = 'DEBT' THEN amount ELSE -amount END), 
        0
    )
    INTO calculated_debt
    FROM public.debt_transactions
    WHERE debtor_id = target_debtor_id;

    -- Cập nhật lại tổng nợ và trạng thái
    UPDATE public.debtors
    SET 
        total_debt = GREATEST(calculated_debt, 0),
        status = CASE 
            WHEN calculated_debt <= 0 THEN 'SETTLED'
            ELSE 'ACTIVE'
        END,
        updated_at = NOW()
    WHERE id = target_debtor_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_debtor_balance ON public.debt_transactions;

CREATE TRIGGER trg_recalculate_debtor_balance
AFTER INSERT OR UPDATE OR DELETE ON public.debt_transactions
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_debtor_balance();

-- ------------------------------------------------------------------------------
-- 5. BẬT ROW LEVEL SECURITY (RLS) VÀ CẤP QUYỀN TRUY CẬP
-- ------------------------------------------------------------------------------
ALTER TABLE public.debtors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_transaction_items ENABLE ROW LEVEL SECURITY;

-- Tạo chính sách cho phép ứng dụng đọc và ghi dữ liệu (Anonymous & Authenticated)
CREATE POLICY "Allow public read debtors" ON public.debtors FOR SELECT USING (true);
CREATE POLICY "Allow public insert debtors" ON public.debtors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update debtors" ON public.debtors FOR UPDATE USING (true);
CREATE POLICY "Allow public delete debtors" ON public.debtors FOR DELETE USING (true);

CREATE POLICY "Allow public read debt_transactions" ON public.debt_transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert debt_transactions" ON public.debt_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update debt_transactions" ON public.debt_transactions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete debt_transactions" ON public.debt_transactions FOR DELETE USING (true);

CREATE POLICY "Allow public read debt_transaction_items" ON public.debt_transaction_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert debt_transaction_items" ON public.debt_transaction_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update debt_transaction_items" ON public.debt_transaction_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete debt_transaction_items" ON public.debt_transaction_items FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 6. DỮ LIỆU MẪU BAN ĐẦU (SEED DATA CHO QUÁN TẠP HOÁ THỰC TẾ)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    id_co_tu UUID := gen_random_uuid();
    id_anh_ba UUID := gen_random_uuid();
    id_bac_nam UUID := gen_random_uuid();
    trans_co_tu_1 UUID := gen_random_uuid();
    trans_co_tu_2 UUID := gen_random_uuid();
    trans_anh_ba_1 UUID := gen_random_uuid();
    trans_bac_nam_1 UUID := gen_random_uuid();
    trans_bac_nam_2 UUID := gen_random_uuid();
BEGIN
    -- Thêm 3 người nợ mẫu
    INSERT INTO public.debtors (id, name, phone, address, note, credit_limit, total_debt, status, created_at)
    VALUES 
        (id_co_tu, 'Cô Tư (Đầu hẻm 45)', '0918234567', 'Nhà 45/2 đường số 8, cạnh cây bàng', 'Khách quen lâu năm, lương hưu ngày 15 hàng tháng', 2000000, 315000, 'ACTIVE', NOW() - INTERVAL '15 days'),
        (id_anh_ba, 'Anh Ba Xe Ôm', '0987654321', 'Bến xe ngã tư, chạy xe máy Wave đỏ', 'Chạy xe buổi sáng, ghé mua nước ngọt và thuốc lá', 1000000, 165000, 'ACTIVE', NOW() - INTERVAL '5 days'),
        (id_bac_nam, 'Bác Năm Thợ Mộc', '0903112233', 'Xưởng mộc cuối đường Hoa Sữa', 'Thường trả theo tuần vào thứ 7', 3000000, 0, 'SETTLED', NOW() - INTERVAL '30 days');

    -- Thêm giao dịch mẫu cho Cô Tư (Lần 1: Mua dầu ăn & nước mắm 215k; Lần 2: Mua gạo 100k; Tổng nợ = 315k)
    INSERT INTO public.debt_transactions (id, debtor_id, type, amount, balance_after, note, created_at)
    VALUES 
        (trans_co_tu_1, id_co_tu, 'DEBT', 215000, 215000, 'Mua dầu ăn Tường An 1L & nước mắm Nam Ngư', NOW() - INTERVAL '10 days'),
        (trans_co_tu_2, id_co_tu, 'DEBT', 100000, 315000, 'Lấy 5kg gạo thơm lài', NOW() - INTERVAL '2 days');

    -- Chi tiết mặt hàng Cô Tư mua
    INSERT INTO public.debt_transaction_items (transaction_id, product_name, unit, quantity, unit_price, total_price)
    VALUES
        (trans_co_tu_1, 'Dầu ăn Tường An Cooking Oil 1L', 'chai', 2, 55000, 110000),
        (trans_co_tu_1, 'Nước mắm Nam Ngư Đệ Nhị 900ml', 'chai', 3, 35000, 105000),
        (trans_co_tu_2, 'Gạo thơm ST25 đóng túi', 'kg', 5, 20000, 100000);

    -- Giao dịch Anh Ba: Mua nước ngọt & bánh mì 165k
    INSERT INTO public.debt_transactions (id, debtor_id, type, amount, balance_after, note, created_at)
    VALUES 
        (trans_anh_ba_1, id_anh_ba, 'DEBT', 165000, 165000, 'Lấy nước ngọt và bánh kẹo cho con', NOW() - INTERVAL '3 days');

    INSERT INTO public.debt_transaction_items (transaction_id, product_name, unit, quantity, unit_price, total_price)
    VALUES
        (trans_anh_ba_1, 'Nước ngọt Coca Cola lon 320ml', 'lon', 6, 12000, 72000),
        (trans_anh_ba_1, 'Mì ăn liền Hảo Hảo Tôm Chua Cay', 'gói', 10, 4500, 45000),
        (trans_anh_ba_1, 'Bánh bông lan trứng sợi thịt gà Solite', 'hộp', 1, 48000, 48000);

    -- Giao dịch Bác Năm: Nợ 250k, sau đó đã trả đủ 250k tiền mặt
    INSERT INTO public.debt_transactions (id, debtor_id, type, amount, balance_after, note, created_at)
    VALUES 
        (trans_bac_nam_1, id_bac_nam, 'DEBT', 250000, 250000, 'Mua gia vị và bột ngọt gia đình', NOW() - INTERVAL '14 days'),
        (trans_bac_nam_2, id_bac_nam, 'PAYMENT', 250000, 0, 'Bác Năm trả đủ tiền mặt', NOW() - INTERVAL '7 days');

END $$;
