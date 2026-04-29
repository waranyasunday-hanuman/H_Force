import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumn() {
  const { data, error } = await supabase.rpc('execute_sql', { query: 'ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS so_number VARCHAR(50);' });
  console.log("RPC Error (might fail if RPC not created):", error);
}

addColumn();
