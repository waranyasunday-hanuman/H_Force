-- ----------------------------------------------------
-- สคริปต์สำหรับการสร้าง Table: sales_orders (ใบสั่งขาย)
-- สำหรับรวบรวมข้อมูลจริงไว้แสดงบนหน้า Dashboard
-- ----------------------------------------------------

CREATE TABLE public.sales_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_date DATE NOT NULL,                 -- วันที่สั่งขาย เช่น '2024-04-17'
    customer_code VARCHAR(100) NOT NULL,      -- รหัสลูกค้า
    sales_person VARCHAR(100),                -- ชื่อเซลส์ หรืออีเมลคนที่ล็อกอินสร้างบิล
    total_amount NUMERIC(18, 2) DEFAULT 0,    -- ยอดรวมบิล (THB)
    so_count INTEGER DEFAULT 1,               -- จำนวนบิล (ค่าลัดคำนวณ)
    items JSONB,                              -- รายละเอียดสินค้าเก็บเป็น JSON Array เพื่อความง่าย
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ถ้าระบบ Supabase ของคุณใช้ Row Level Security (RLS)
-- ให้รันคำสั่ง 2 บรรทัดด้านล่างเพื่อให้ API อ่าน/เขียน ได้อย่างสมบูรณ์
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow All Access on Sales Orders"
ON public.sales_orders
FOR ALL
USING (true)
WITH CHECK (true);
