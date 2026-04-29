-- Create sales_plans table for visit scheduling
CREATE TABLE IF NOT EXISTS public.sales_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    customer_code VARCHAR(50),
    customer_name VARCHAR(150),
    plan_date DATE NOT NULL,
    plan_time TIME,
    purpose VARCHAR(50),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
    reschedule_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and add policy
ALTER TABLE public.sales_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All Access on Sales Plans" ON public.sales_plans;
CREATE POLICY "Allow All Access on Sales Plans" ON public.sales_plans FOR ALL USING (true) WITH CHECK (true);

-- Update visits table for fraud detection and distance tracking
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS distance_km NUMERIC(10, 2);
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS is_out_of_range BOOLEAN DEFAULT FALSE;
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS gps_accuracy NUMERIC(10, 2);
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.sales_plans(id);

-- Ensure purpose and sales_person exist (from v2 migration)
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS purpose VARCHAR(50);
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS sales_person VARCHAR(100);
