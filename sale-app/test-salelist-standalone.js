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

// Mock environment for the test
process.env.ECOUNT_COMPANY_CODE = env.ECOUNT_COMPANY_CODE;
process.env.ECOUNT_USER_ID = env.ECOUNT_USER_ID;
process.env.ECOUNT_API_KEY = env.ECOUNT_API_KEY;

const { getSessionKey } = require('./lib/ecount');

async function testSaleList() {
    try {
        const auth = await getSessionKey();
        const baseUrl = `https://${auth.hostUrl.toLowerCase()}/OAPI/V2`;
        
        console.log("Fetching Sale List from June 2025...");
        const response = await fetch(`${baseUrl}/Sale/GetSaleListPost?SESSION_ID=${auth.sessionKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                COM_CODE: process.env.ECOUNT_COMPANY_CODE,
                START_DATE: "20250601",
                END_DATE: new Date().toISOString().split('T')[0].replace(/-/g, ''),
                IsPaging: false
            })
        });

        const data = await response.json();
        console.log("Status:", data.Status);
        if (data.Data && data.Data.Datas) {
            console.log("Found", data.Data.Datas.length, "sales");
            console.log("Sample Record:", JSON.stringify(data.Data.Datas[0], null, 2));
        } else {
            console.log("No data found or Error:", JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

testSaleList();
