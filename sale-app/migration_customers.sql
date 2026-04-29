-- รันสคริปต์นี้ใน Supabase SQL Editor เพื่อขยายตารางลูกค้ารองรับช่องข้อมูลฉบับเต็ม

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS business_no VARCHAR(50);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS jongmok VARCHAR(100);

-- หมายเหตุ: คอลัมน์ cust_code มีอยู่แล้ว (แต่เดิมเราใช้เก็บเลขภาษี ตอนนี้จะใช้เก็บรหัสลูกค้าแท้ๆ แทน)
