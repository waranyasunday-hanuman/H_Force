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

async function runTest() {
    try {
        console.log("Getting Zone...");
        const zoneRes = await fetch("https://sboapi.ecount.com/OAPI/V2/Zone", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ COM_CODE: env.ECOUNT_COMPANY_CODE }),
        });
        const zoneData = await zoneRes.json();
        const zone = zoneData.Data.ZONE;
        const domain = zoneData.Data.DOMAIN;

        console.log("Logging in...");
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

        console.log("Fetching Sales...");
        const endpoints = [
            "/Sale/GetSaleList", 
            "/Sale/GetSaleListPost", 
            "/Sale/ViewSaleList", 
            "/SaleOrder/GetSaleOrderList",
            "/SaleOrder/GetListSaleOrder",
            "/InventoryBasic/GetSaleList"
        ];
        
        for (const ep of endpoints) {
            const res = await fetch(`${baseUrl}${ep}?SESSION_ID=${sessionKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    // Just an empty body or simple standard ones
                    COM_CODE: env.ECOUNT_COMPANY_CODE,
                    BASE_DATE: "20240101"
                }),
            });
            const data = await res.json();
            console.log(`Endpoint ${ep} Status:`, data.Status);
            if (data.Status === "200") {
                console.log(`Success on ${ep}`, !!data.Data);
                break;
            } else if (data.Errors && data.Errors.length > 0) {
                console.log(`Error on ${ep}:`, data.Errors[0].Code, data.Errors[0].Message.substring(0, 80));
            }
        }
    } catch(err) {
        console.error("Test failed:", err);
    }
}

runTest();
