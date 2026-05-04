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

        if (!dbError && dbProducts && dbProducts.length > 0) {
            const mappedProducts = dbProducts.map(p => ({
                PROD_CD: p.prod_cd,
                PROD_DES: p.prod_des || "",
                PROD_TYPE: String(p.prod_type || ""),
                UNIT: p.unit || "",
                BAR_CODE: p.bar_code || "",
                OUT_PRICE: parseFloat(p.out_price || 0),
                IN_PRICE: parseFloat(p.in_price || 0),
                REMARKS: p.remarks || ""
            }));
            return res.status(200).json({ products: mappedProducts, source: 'supabase' });
        }

        // 2. Fallback to Ecount
        console.log("Supabase products not found. Falling back to Ecount API...");
        const auth = await getSessionKey();
        const ecountProducts = await getProducts(auth.sessionKey, auth.hostUrl);

        const mappedEcount = (ecountProducts || []).map(p => ({
            PROD_CD: p.PROD_CD || p.PROD_CODE || "",
            PROD_DES: p.PROD_DES || p.PROD_NAME || p.PROD_NM || "",
            PROD_TYPE: String(p.PROD_TYPE || p.GOODS_GUBUN || ""),
            UNIT: p.UNIT || p.IN_UNIT || "",
            BAR_CODE: p.BAR_CODE || "",
            OUT_PRICE: parseFloat(p.OUT_PRICE || 0),
            IN_PRICE: parseFloat(p.IN_PRICE || 0),
            REMARKS: p.REMARKS || ""
        }));

        res.status(200).json({ products: mappedEcount, source: 'ecount' });
    } catch (error) {
        console.error("API Error products:", error);
        res.status(500).json({ error: "Cannot fetch products: " + error.message });
    }
}
