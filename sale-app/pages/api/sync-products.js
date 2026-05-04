import { createClient } from "@supabase/supabase-js";
import { getSessionKey, getProducts } from "../../lib/ecount";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== "POST" && req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        console.log("Starting Products Sync from Ecount...");
        
        // 1. Fetch from Ecount
        const auth = await getSessionKey();
        const ecountProducts = await getProducts(auth.sessionKey, auth.hostUrl);
        
        if (!ecountProducts || ecountProducts.length === 0) {
            return res.status(200).json({ success: true, message: "No products found in Ecount" });
        }

        console.log(`Fetched ${ecountProducts.length} products from Ecount. Syncing to Supabase...`);

        // 2. Map data for Supabase
        const productsToUpsert = ecountProducts.map(p => ({
            prod_cd: p.PROD_CD || "",
            prod_des: p.PROD_DES || "",
            prod_type: String(p.PROD_TYPE || ""),
            unit: p.UNIT || "",
            bar_code: p.BAR_CODE || "",
            out_price: parseFloat(p.OUT_PRICE || 0),
            in_price: parseFloat(p.IN_PRICE || 0),
            remarks: p.REMARKS || ""
        })).filter(p => p.prod_cd !== ""); // Must have code

        // 3. Upsert to Supabase in chunks (max 1000 per request)
        const CHUNK_SIZE = 500;
        let successCount = 0;
        
        for (let i = 0; i < productsToUpsert.length; i += CHUNK_SIZE) {
            const chunk = productsToUpsert.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase
                .from("products")
                .upsert(chunk, { onConflict: "prod_cd" });
                
            if (error) {
                if (error.code === '42P01') {
                    return res.status(400).json({ 
                        error: "Table 'products' does not exist in Supabase. Please run migration_products.sql first." 
                    });
                }
                throw error;
            }
            successCount += chunk.length;
        }

        res.status(200).json({ 
            success: true, 
            message: `Successfully synced ${successCount} products`,
            count: successCount
        });
    } catch (error) {
        console.error("API Error sync-products:", error);
        res.status(500).json({ error: error.message || "Failed to sync products" });
    }
}
