import { getSessionKey, getCustomers } from "../../lib/ecount";
import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const auth = await getSessionKey();
        const ecountCustomers = await getCustomers(auth.sessionKey, auth.hostUrl);
        
        // Transform Ecount data to standard format
        const customers = (ecountCustomers || []).map(c => ({
            ...c,
            CUST_CODE: c.CUST_CODE || c.CUST || c.CUST_CD || "",
            CUST_NAME: c.CUST_NAME || c.CUST_DES || c.CUST_NM || "",
            is_ecount: true
        }));

        if (customers.length === 0) throw new Error("No customers found in Ecount");

        res.status(200).json({ customers });
    } catch (error) {
        console.error("API Error getCustomers (Ecount), falling back to Supabase:", error);
        
        // Fallback to Supabase if Ecount fails
        const { data: dbCustomers } = await supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });

        const mapped = (dbCustomers || []).map(c => ({
            ...c,
            CUST_CODE: c.cust_code,
            CUST_NAME: c.cust_name,
            BUSINESS_NO: c.business_no || "",
            JONGMOK: c.jongmok || "",
            TEL: c.tel || "",
            BOSS_NAME: c.boss_name || "",
            is_ecount: false
        }));

        res.status(200).json({ customers: mapped });
    }
}
