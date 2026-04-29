
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', 'sale-app', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    console.log("Checking sales_orders table...");
    const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching data:", error);
    } else {
        console.log("Success! Columns in sales_orders:");
        if (data.length > 0) {
            console.log(Object.keys(data[0]));
        } else {
            console.log("Table is empty, cannot infer columns from data.");
        }
    }
}

checkSchema();
