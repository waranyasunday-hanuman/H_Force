-- ============================================================
-- Migration: profiles table สำหรับ User Management
-- รันใน Supabase SQL Editor
-- ============================================================

-- 1. สร้าง profiles table (ถ้ายังไม่มี)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'sale' CHECK (role IN ('manager', 'sale')),
    display_name VARCHAR(100),
    pic_code VARCHAR(50),          -- รหัส PIC เชื่อมกับ Ecount ERP
    pic_name VARCHAR(100),         -- ชื่อ PIC
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. เพิ่ม column ใหม่ (ถ้ามี profiles อยู่แล้ว)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS display_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS pic_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS pic_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. เปิด RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ⚠️ ลบ Policy เก่าก่อน (ถ้ามี) เพื่อป้องกัน conflict
-- ============================================================
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "User can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "User can update own display_name" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update own profile" ON public.profiles;

-- ============================================================
-- ✅ Policy แบบง่าย — ไม่มี circular reference
-- ============================================================

-- ทุก user ที่ login แล้ว อ่าน profiles ได้ทั้งหมด
-- (Write/Delete จัดการผ่าน service_role API เท่านั้น)
CREATE POLICY "Allow authenticated users to read profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- User อัพเดต profile ตัวเองได้
CREATE POLICY "Allow authenticated users to update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================================
-- หมายเหตุ: service_role key (ใน .env.local) bypass RLS อัตโนมัติ
-- ดังนั้น API /api/users สามารถ insert/update ได้ทุก row
-- ============================================================
