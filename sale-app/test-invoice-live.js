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

        const invoiceAutoList = [
            {
                BulkDatas: {
                    TRX_DATE: new Date().toISOString().split('T')[0].replace(/-/g, ''),
                    TAX_GUBUN: "11",                      
                    CUST: "TEST_CUST_CODE",       // Invalid customer code probably to force an error
                    SUPPLY_AMT: "1000", 
                    VAT_AMT: "0",      
                    CR_CODE: "4019",                      
                    REMARKS: "Testing Auto Invoice"
                }
            }
        ];

        console.log("Sending Invoice Payload...");

        const response = await fetch(
            `${baseUrl}/InvoiceAuto/SaveInvoiceAuto?SESSION_ID=${sessionKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ InvoiceAutoList: invoiceAutoList }),
            }
        );

        const data = await response.json();
        console.log("Response:", JSON.stringify(data, null, 2));

    } catch(err) {
        console.error("Test failed:", err);
    }
}

runTest();
