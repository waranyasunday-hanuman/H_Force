import { createClient } from "@supabase/supabase-js";
import { getSessionKey, getProducts } from "../../lib/ecount";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // 1. Try fetching from Supabase first
        const { data: dbProducts, error: dbError } = await supabase
            .from("products")
            .select("*");

        // If table exists and has data, return it
        if (!dbError && dbProducts && dbProducts.length > 0) {
            // Map keys back to match Ecount format so frontend doesn't break
            const mappedProducts = dbProducts.map(p => ({
                PROD_CD: p.prod_cd,
                PROD_DES: p.prod_des,
                PROD_TYPE: p.prod_type,
                UNIT: p.unit,
                BAR_CODE: p.bar_code,
                OUT_PRICE: p.out_price,
                IN_PRICE: p.in_price,
                REMARKS: p.remarks
            }));
            return res.status(200).json({ products: mappedProducts, source: 'supabase' });
        }

        // 2. Fallback to Ecount if Supabase table is empty or missing
        console.log("Supabase products not found or table missing. Falling back to Ecount API...");
        const auth = await getSessionKey();
        const allProducts = await getProducts(auth.sessionKey, auth.hostUrl);

        res.status(200).json({ products: allProducts || [], source: 'ecount' });
    } catch (error) {
        console.error("API Error products:", error);
        res.status(500).json({ error: "Cannot fetch products" });
    }
}
