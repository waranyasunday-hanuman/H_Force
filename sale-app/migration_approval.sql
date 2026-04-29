-- การเพิ่มคอลัมน์ระบบพิจารณาอนุมัติบิล
-- นำสคริปต์นีไปรันในช่อง SQL Editor ของ Supabase
-- คำเตือน: รันแล้วไม่ต้องรันซ้ำซ้อนนะครับ

ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS invoice_date DATE;

-- ตั้งสิทธิ์ให้แก้ไขสถานะเฉพาะ Admin (หากจำเป็นต้องแบ่ง RLS ละเอียดในอนาคต)
-- ตอนนี้ให้สิทธิ์ทั้งหมดตามโครงสร้างปัจจุบัน (Allow All Access)
