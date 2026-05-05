
-- สร้างตารางเก็บข้อมูล Invoice ที่ Sync จาก Ecount
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_no TEXT UNIQUE NOT NULL,      -- เลขที่ใบกำกับ/ใบขาย (IO_NO หรือ SL_NO)
    customer_code TEXT NOT NULL,         -- รหัสลูกค้า
    customer_name TEXT,                  -- ชื่อลูกค้า
    invoice_date DATE NOT NULL,          -- วันที่ใบกำกับ
    total_amount DECIMAL(15, 2) NOT NULL, -- ยอดเงินรวม
    outstanding_amount DECIMAL(15, 2),   -- ยอดคงค้าง (เริ่มแรกเท่ากับ total_amount)
    status TEXT DEFAULT 'pending',        -- 'pending', 'paid'
    pic_code TEXT,                       -- รหัสพนักงาน (EMP_CD จาก Ecount)
    pic_name TEXT,                       -- ชื่อพนักงาน
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index เพื่อความรวดเร็วในการค้นหา
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_code);
CREATE INDEX IF NOT EXISTS idx_invoices_pic ON invoices(pic_code);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);

-- ฟังก์ชันสำหรับคำนวณอายุหนี้ใน View (ถ้าต้องการ)
CREATE OR REPLACE VIEW v_debt_aging AS
SELECT 
    *,
    CURRENT_DATE - invoice_date AS aging_days,
    CASE 
        WHEN (CURRENT_DATE - invoice_date) <= 30 THEN '0-30'
        WHEN (CURRENT_DATE - invoice_date) <= 60 THEN '31-60'
        WHEN (CURRENT_DATE - invoice_date) <= 90 THEN '61-90'
        ELSE '91+'
    END AS aging_range
FROM invoices
WHERE status = 'pending';
