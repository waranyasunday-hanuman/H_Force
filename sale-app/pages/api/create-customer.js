import { getSessionKey, createCustomer } from "../../lib/ecount";
import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const custData = req.body;
        
        // Validation
        if (!custData || !custData.custName || !custData.businessNo) {
            return res.status(400).json({ error: "Missing required customer data (Name/Business No)" });
        }

        const sessionKey = await getSessionKey();
        
        // 1. ยิงเข้า Ecount
        const result = await createCustomer(sessionKey, custData);

        // 2. สำเนาลง Supabase (Dual-write) ไว้ให้ค้นหา
        const { error: dbError } = await supabase.from('customers').insert([{
            cust_code: custData.custCode || custData.businessNo || Math.random().toString(36).substr(2, 9), // Fallback if no cust code
            business_no: custData.businessNo,
            cust_name: custData.custName,
            boss_name: custData.bossName,
            tel: custData.tel,
            hp_no: custData.hpNo,
            email: custData.email,
            addr: custData.addr,
            uptae: custData.uptae,
            jongmok: custData.jongmok,
            remarks: custData.remarks
        }]);

        if (dbError) {
            console.error("Supabase Save Warning:", dbError);
            // ไม่ block flow ถ้า Ecount สำเร็จแล้วแต่ Supabase ผิดพลาด (อาจซ้ำ)
        }

        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error("API Error Create Customer:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to create customer" });
    }
}
