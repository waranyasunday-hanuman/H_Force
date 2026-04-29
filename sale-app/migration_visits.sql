-- การเพิ่มตารางประวัติการเข้าพบลูกค้า (Visits)
CREATE TABLE IF NOT EXISTS public.visits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),       -- รหัสพนักงานขาย (เชื่อมกับ Supabase Auth)
    customer_type VARCHAR(20) NOT NULL,           -- 'new' หรือ 'existing'
    customer_code VARCHAR(50),                    -- ถ้าเป็น existing จะเก็บ CUST_CODE, ถ้า new เก็บเลขชั่วคราว/business_no
    customer_name VARCHAR(150),                   -- ชื่อร้าน/ลูกค้า
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    check_out_time TIMESTAMP WITH TIME ZONE,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    photo_url TEXT,                               -- ลิงก์รูปถ่าย Selfie
    notes TEXT,                                   -- บันทึกเพิ่มเติม หรือผลการเข้าพบ
    is_completed BOOLEAN DEFAULT FALSE,           -- true เมื่อกด Check-out
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow All Access on Visits"
ON public.visits
FOR ALL
USING (true)
WITH CHECK (true);

-- การปรับปรุงตารางใบสั่งขาย (Sales Orders) เพิ่มระบบชำระเงิน
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20); -- 'cash', 'transfer', 'credit'
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS payment_slip_url TEXT;    -- รูปสลิป
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS due_date DATE;            -- กำหนดโอนเข้าธนาคาร หรือ กำหนดจ่ายเครดิต
