-- ----------------------------------------------------
-- สคริปต์สำหรับการสร้าง Table: customers (รายชื่อลูกค้า)
-- ให้ก๊อปปี้สคริปต์นี้ไปกดรัน ในแท็บ SQL Editor ของ Supabase
-- ----------------------------------------------------

CREATE TABLE public.customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cust_code VARCHAR(50) UNIQUE NOT NULL,    -- รหัสลูกค้า (Ecount CUST หรือ BUSINESS_NO)
    cust_name VARCHAR(150) NOT NULL,          -- ชื่อบริษัท / ชื่อลูกค้า
    boss_name VARCHAR(100),                   -- ชื่อผู้ติดต่อ / CEO
    tel VARCHAR(50),                          -- เบอร์โทรศัพท์
    hp_no VARCHAR(50),                        -- เบอร์มือถือ
    email VARCHAR(100),                       -- อีเมล
    addr TEXT,                                -- ที่อยู่
    uptae VARCHAR(100),                       -- ประเภทธุรกิจ
    remarks TEXT,                             -- หมายเหตุ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ถ้าระบบ Supabase ของคุณใช้ Row Level Security (RLS) แบบเข้มงวด
-- ให้รันคำสั่ง 2 บรรทัดด้านล่างเพื่อให้ API เราสามารถ insert และ select ได้เต็มที่
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow All Access on Customers"
ON public.customers
FOR ALL
USING (true)
WITH CHECK (true);
