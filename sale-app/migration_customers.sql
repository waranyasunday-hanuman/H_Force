-- รันสคริปต์นี้ใน Supabase SQL Editor เพื่อขยายตารางลูกค้ารองรับช่องข้อมูลฉบับเต็มตามคู่มือ Ecount
-- หมายเหตุ: คอลัมน์ cust_code มีอยู่แล้ว

-- ข้อมูลหลักและการระบุตัวตน
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS category VARCHAR(50); -- 'Customer', 'Supplier', 'Service'
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS business_no VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cust_name VARCHAR(200);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS boss_name VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS uptae VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS jongmok VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tax_reg_id VARCHAR(50);

-- ข้อมูลติดต่อ
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tel VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS fax VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS hp_no VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS post_no VARCHAR(20);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS addr TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS url_path VARCHAR(255);

-- ข้อมูลที่อยู่ MD (DM)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS dm_post VARCHAR(20);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS dm_addr TEXT;

-- การตั้งค่ากลุ่มและประเภท
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS g_gubun VARCHAR(10);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS g_business_type VARCHAR(10);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS g_business_cd VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS gubun VARCHAR(10);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS foreign_flag VARCHAR(1);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS exchange_code VARCHAR(20);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cust_group1 VARCHAR(100);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cust_group2 VARCHAR(100);

-- ข้อมูลพนักงานและเครดิต
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS emp_cd VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cust_limit NUMERIC(18,2);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cust_limit_term INTEGER;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS manage_bond_no VARCHAR(10);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS manage_debit_no VARCHAR(10);

-- การตั้งค่าราคาและภาษี
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS price_group VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS price_group2 VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS o_rate NUMERIC(5,2);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS i_rate NUMERIC(5,2);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS outorder_yn VARCHAR(1);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS io_code_sl_base_yn VARCHAR(1);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS io_code_sl VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS io_code_by_base_yn VARCHAR(1);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS io_code_by VARCHAR(50);

-- ข้อความและหมายเหตุเพิ่มเติม
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS remarks_win VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cont1 VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cont2 VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cont3 VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cont4 VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cont5 VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS cont6 VARCHAR(255);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS no_cust_user1 NUMERIC(18,6);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS no_cust_user2 NUMERIC(18,6);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS no_cust_user3 NUMERIC(18,6);
