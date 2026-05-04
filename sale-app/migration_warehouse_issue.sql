-- ===================================================
-- Warehouse Issue Request System
-- ===================================================

-- Running Number ตาม ประเภทและปี
CREATE TABLE IF NOT EXISTS warehouse_issue_sequences (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL,   -- 'RM' | 'FG'
    year INT NOT NULL,
    last_no INT DEFAULT 0,
    UNIQUE(type, year)
);

-- ตารางหัวเอกสารคำขอเบิก
CREATE TABLE IF NOT EXISTS warehouse_issue_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_no TEXT UNIQUE NOT NULL,  -- เช่น RM-2026-0001 หรือ FG-2026-0001
    type TEXT NOT NULL CHECK (type IN ('RAW_MATERIAL', 'FINISH_GOODS')),
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'rejected', 'issued', 'cancelled')),
    purpose TEXT,                         -- วัตถุประสงค์
    department TEXT,                      -- แผนกผู้ขอ
    requester_id UUID,                    -- User ID
    requester_name TEXT NOT NULL,         -- ชื่อผู้ขอ
    needed_date DATE,                     -- วันที่ต้องการ
    remarks TEXT,                         -- หมายเหตุ
    -- อนุมัติ
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    approval_remarks TEXT,
    -- จ่ายออก
    issued_by TEXT,
    issued_at TIMESTAMPTZ,
    ecount_ref_no TEXT,                   -- เลขที่เอกสารใน Ecount
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ตารางรายการสินค้าในคำขอ
CREATE TABLE IF NOT EXISTS warehouse_issue_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES warehouse_issue_requests(id) ON DELETE CASCADE,
    product_code TEXT NOT NULL,
    product_name TEXT,
    unit TEXT,
    requested_qty NUMERIC NOT NULL DEFAULT 0,
    approved_qty NUMERIC,     -- คลังแก้ไขและอนุมัติ
    issued_qty NUMERIC,       -- จ่ายจริง (อาจน้อยกว่า approved)
    item_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ฟังก์ชันสร้าง Running Number อัตโนมัติ
CREATE OR REPLACE FUNCTION generate_issue_request_no(p_type TEXT)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_year INT;
    v_next_no INT;
    v_request_no TEXT;
BEGIN
    v_prefix := CASE p_type
        WHEN 'RAW_MATERIAL' THEN 'RM'
        WHEN 'FINISH_GOODS' THEN 'FG'
        ELSE 'WI'
    END;
    
    v_year := EXTRACT(YEAR FROM NOW());
    
    INSERT INTO warehouse_issue_sequences (type, year, last_no)
    VALUES (v_prefix, v_year, 1)
    ON CONFLICT (type, year) DO UPDATE
        SET last_no = warehouse_issue_sequences.last_no + 1
    RETURNING last_no INTO v_next_no;
    
    v_request_no := v_prefix || '-' || v_year || '-' || LPAD(v_next_no::TEXT, 4, '0');
    RETURN v_request_no;
END;
$$ LANGUAGE plpgsql;

-- Index สำหรับ Query เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_issue_requests_status ON warehouse_issue_requests(status);
CREATE INDEX IF NOT EXISTS idx_issue_requests_type ON warehouse_issue_requests(type);
CREATE INDEX IF NOT EXISTS idx_issue_requests_requester ON warehouse_issue_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_issue_items_request_id ON warehouse_issue_items(request_id);
