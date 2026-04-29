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
        const zoneRes = await fetch("https://sboapi.ecount.com/OAPI/V2/Zone", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        // ... (Zone login omitted for brevity here)
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

        const endpoints = [
            "/Account/SaveInvoiceAutoII",
            "/Account/SaveAutoInvoiceII",
            "/Account/SaveInvoiceAuto2",
            "/Account/SaveInvoice2",
            "/Account/SaveInvoiceII",
            "/Account/SaveSalesInvoice",
            "/Account/SaveSalesInvoiceAuto",
            "/AccountBasic/SaveInvoiceAuto",
            "/AccountBasic/SaveSalesInvoice",
            "/AccountBasic/SaveInvoiceAutoII",
            "/Invoice/SaveInvoiceAutoSales",
            "/Account/SaveInvoiceAutoSales"
        ];

        for (const ep of endpoints) {
            const res = await fetch(`${baseUrl}${ep}?SESSION_ID=${sessionKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (data.Status !== "500" || (data.Errors && data.Errors[0].Code !== "EXP00001")) {
                console.log(`Endpoint Found: ${ep}`, data.Errors || data.Status);
            }
        }
        console.log("Finished Testing");
    } catch(err) {
        console.error("Test failed:", err);
    }
}

runTest();
