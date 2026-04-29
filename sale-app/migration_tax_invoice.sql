ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS need_tax_invoice BOOLEAN DEFAULT false;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS tax_document_url TEXT;
