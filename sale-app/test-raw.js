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
        const zoneRes = await fetch("https://oapi.ecount.com/OAPI/V2/Zone", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ COM_CODE: env.ECOUNT_COMPANY_CODE }),
        });
        const zoneData = await zoneRes.json();
        const zone = zoneData.Data.ZONE;
        const domain = zoneData.Data.DOMAIN;

        const loginRes = await fetch(`https://oapi${zone}${domain}/OAPI/V2/OAPILogin`, {
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
        const cookie = (loginData.Data.Datas.SET_COOKIE || "").trim();
        const hostUrl = loginData.Data.Datas.HOST_URL;

        const baseUrl = `https://${hostUrl}/OAPI/V2`;

        const res2 = await fetch(`${baseUrl}/InventoryBasic/GetBasicProductsList?SESSION_ID=${sessionKey}`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Cookie": cookie,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            },
            body: JSON.stringify({
                COM_CODE: env.ECOUNT_COMPANY_CODE
            }),
        });
        const text2 = await res2.text();
        console.log("GetBasicProductsList Raw Response:", text2.substring(0, 500));
    } catch(err) {
        console.error("Test failed:", err);
    }
}

runTest();
