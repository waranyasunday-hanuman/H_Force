ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS so_number VARCHAR(50);
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS plan_id TEXT;
