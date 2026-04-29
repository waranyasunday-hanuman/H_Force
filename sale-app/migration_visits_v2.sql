-- เพิ่มฟิลด์ใหม่ให้รองรับ 3 ทางแยก (เสนอขาย / ตรวจร้าน / เก็บหนี้)
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS purpose VARCHAR(50);
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS visit_result JSONB;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS sales_person VARCHAR(100);
