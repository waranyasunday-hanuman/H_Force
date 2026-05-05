import { createClient } from "@supabase/supabase-js";
import { getSessionKey } from "../../lib/ecount";

/**
 * ฟังก์ชันสำหรับข้าม WAF ของ Ecount (จำเป็นมากสำหรับ OAPI V2)
 */
function getWafBypassHeaders(cookie, host) {
    const hostUrl = host || "oapiia.ecount.com";
    const origin = `https://${hostUrl.toLowerCase()}`;
    return {
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "Origin": origin,
        "Referer": `${origin}/`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        ...(cookie ? { "Cookie": cookie } : {}),
    };
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const auth = await getSessionKey();
        const baseUrl = `https://${auth.hostUrl.toLowerCase()}/OAPI/V2`;
        
        // รายชื่อ Endpoint ที่เป็นไปได้สำหรับข้อมูลการขาย/ลูกหนี้
        // จากการทดสอบ /Sale/GetSaleListPost เป็นเส้นที่ Standard ที่สุดสำหรับ V2
        const endpoints = [
            "Sale/GetSaleListPost",
            "Inventory/GetListSalePost",
            "Account/GetListInvoicePost"
        ];

        let salesData = [];
        let successEndpoint = "";

        for (const ep of endpoints) {
            try {
                const response = await fetch(`${baseUrl}/${ep}?SESSION_ID=${auth.sessionKey}`, {
                    method: 'POST',
                    headers: getWafBypassHeaders("", auth.hostUrl),
                    body: JSON.stringify({
                        COM_CODE: process.env.ECOUNT_COMPANY_CODE,
                        START_DATE: "20250601",
                        END_DATE: new Date().toISOString().split('T')[0].replace(/-/g, ''),
                        IsPaging: false
                    })
                });
                const result = await response.json();

                const dataList = result.Data?.Datas || result.Data?.Result;
                if (result.Status === "200" && dataList && dataList.length > 0) {
                    salesData = dataList;
                    successEndpoint = ep;
                    break;
                }
            } catch (e) {
                console.error(`Error probing ${ep}:`, e.message);
            }
        }

        // กรณีไม่พบข้อมูลเลย
        if (salesData.length === 0) {
            return res.status(404).json({ 
                error: "No sales data found in Ecount. Please check if OAPI Permission for 'Sale' is enabled or if sales are recorded in a different module.",
                checked_endpoints: endpoints
            });
        }

        // --- แปรรูปข้อมูลและบันทึกลง Supabase ---
        const invoices = salesData.map(s => {
            const invDate = s.IO_DATE || s.TRX_DATE || s.DATE || "";
            const formattedDate = invDate ? `${invDate.substring(0,4)}-${invDate.substring(4,6)}-${invDate.substring(6,8)}` : new Date().toISOString().split('T')[0];
            
            return {
                invoice_no: s.IO_NO || s.TRX_NO || s.DOC_NO || s.SL_NO || `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                customer_code: s.CUST || s.CUST_CD || "",
                customer_name: s.CUST_NAME || s.CUST_DES || "",
                invoice_date: formattedDate,
                total_amount: parseFloat(s.SUPPLY_AMT || s.AMT || 0) + parseFloat(s.VAT_AMT || 0),
                outstanding_amount: parseFloat(s.SUPPLY_AMT || s.AMT || 0) + parseFloat(s.VAT_AMT || 0),
                status: 'pending',
                pic_code: s.EMP_CD || "",
                pic_name: s.EMP_NAME || ""
            };
        });

        // ใช้ Admin client เพื่อข้าม RLS สำหรับการ Sync
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { error: upsertError } = await supabaseAdmin
            .from('invoices')
            .upsert(invoices, { onConflict: 'invoice_no' });

        if (upsertError) throw upsertError;

        res.status(200).json({ 
            success: true, 
            message: `Successfully synced ${invoices.length} invoices from Ecount (${successEndpoint})`,
            count: invoices.length 
        });

    } catch (error) {
        console.error("API Error sync-invoices:", error);
        res.status(500).json({ error: error.message });
    }
}
