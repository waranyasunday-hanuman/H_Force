const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    if (line && line.indexOf('=') !== -1) {
        const parts = line.split('=');
        env[parts[0].trim()] = parts[1].trim().replace(/^['"](.*)['"]$/, '$1');
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testInvoice() {
    try {
        // 1. Get latest approved SO
        const { data: orders, error: dbError } = await supabase
            .from('sales_orders')
            .select('*')
            .eq('approval_status', 'approved')
            .order('created_at', { ascending: false })
            .limit(1);
            
        if (dbError || !orders || orders.length === 0) {
            console.log("No approved orders found to test.");
            return;
        }
        
        const order = orders[0];
        console.log("Testing Invoice for Order:", order.id, "Customer:", order.customer_code);

        // 2. Login to Ecount
        const zoneRes = await fetch("https://sboapi.ecount.com/OAPI/V2/Zone", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ COM_CODE: env.ECOUNT_COMPANY_CODE }),
        });
        const zoneData = await zoneRes.json();
        const zone = zoneData.Data.ZONE;
        const domain = zoneData.Data.DOMAIN;

        const loginRes = await fetch(`https://sboapi${zone}${domain}/OAPI/V2/OAPILogin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                COM_CODE: env.ECOUNT_COMPANY_CODE,
                USER_ID: env.ECOUNT_USER_ID,
                API_CERT_KEY: env.ECOUNT_API_KEY,
                LAN_TYPE: "th-TH",
                ZONE: zone,
            }),
        });
        const loginData = await loginRes.json();
        const sessionKey = loginData.Data.Datas.SESSION_ID;

        const baseUrl = `https://sboapi${zone}${domain}/OAPI/V2`;
        const invoiceDate = new Date().toISOString().split('T')[0].replace(/-/g, "");

        const invoiceAutoList = [{
            BulkDatas: {
                TRX_DATE: invoiceDate,           
                TAX_GUBUN: "11",                      
                CUST: order.customer_code,       
                SUPPLY_AMT: String(order.total_amount), 
                VAT_AMT: "0",      
                CR_CODE: "4019",                      
                REMARKS: "Test from Server"
            }
        }];

        const response = await fetch(
            `${baseUrl}/InvoiceAuto/SaveInvoiceAuto?SESSION_ID=${sessionKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ InvoiceAutoList: invoiceAutoList }),
            }
        );

        const data = await response.json();
        
        console.log("=== API RESPONSE ===");
        if (data.Data && Array.isArray(data.Data) && data.Data.length > 0) {
            console.log("FailCnt:", data.Data[0].FailCnt);
            console.log("ResultDetails:", data.Data[0].ResultDetails);
        } else if (data.Data && data.Data.FailCnt !== undefined) {
             console.log("FailCnt:", data.Data.FailCnt);
             console.log("ResultDetails:");
             console.log(JSON.stringify(data.Data.ResultDetails, null, 2));
        } else {
            console.log(JSON.stringify(data, null, 2));
        }

    } catch(err) {
        console.error("Fatal Error:", err);
    }
}
testInvoice();
