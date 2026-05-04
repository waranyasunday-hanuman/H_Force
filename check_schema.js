import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from sale-app
dotenv.config({ path: path.join(__dirname, 'sale-app', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase env variables in sale-app/.env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    console.log("Checking sales_orders schema...");
    const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching sales_orders:", error);
    } else {
        console.log("Columns in sales_orders:", Object.keys(data[0] || {}));
    }

    console.log("Checking visits schema...");
    const { data: vData, error: vError } = await supabase
        .from('visits')
        .select('*')
        .limit(1);

    if (vError) {
        console.error("Error fetching visits:", vError);
    } else {
        console.log("Columns in visits:", Object.keys(vData[0] || {}));
    }
}

checkSchema();
