import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, 'sale-app', '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('products').select('prod_cd, prod_des, prod_type').limit(10);
    if (error) {
        console.error("Error:", error);
        return;
    }
    console.log("PRODUCTS_DATA:");
    data.forEach(p => console.log(`[${p.prod_cd}] - ${p.prod_des} (Type: ${p.prod_type})`));
}
check();
