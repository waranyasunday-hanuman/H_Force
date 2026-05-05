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

function getWafBypassHeaders(cookie, host) {
    const origin = `https://${host.toLowerCase()}`;
    return {
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "Origin": origin,
        "Referer": `${origin}/`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        ...(cookie ? { "Cookie": cookie } : {}),
    };
}

async function probe() {
    try {
        const zoneRes = await fetch("https://oapi.ecount.com/OAPI/V2/Zone", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ COM_CODE: env.ECOUNT_COMPANY_CODE }),
        });
        const zoneJson = await zoneRes.json();
        const zone = zoneJson.Data.ZONE;
        const domain = zoneJson.Data.DOMAIN;

        const loginRes = await fetch(`https://oapi${zone}${domain}/OAPI/V2/OAPILogin`, {
            method: "POST",
            headers: getWafBypassHeaders("", `oapi${zone}${domain}`),
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
        const hostUrl = loginData.Data.Datas.HOST_URL;
        const cookie = loginData.Data.Datas.SET_COOKIE;
        const baseUrl = `https://${hostUrl}/OAPI/V2`;

        const ep = "/InventoryStatus/GetListSaleStatus";
        console.log(`Testing EP: ${ep}`);
        const response = await fetch(`${baseUrl}${ep}?SESSION_ID=${sessionKey}`, {
            method: 'POST',
            headers: getWafBypassHeaders(cookie, hostUrl),
            body: JSON.stringify({
                COM_CODE: env.ECOUNT_COMPANY_CODE,
                BASE_DATE: "20260505",
                START_DATE: "20250601",
                END_DATE: "20260505",
                IsPaging: false
            })
        });

        const data = await response.json();
        console.log(`Status: ${data.Status}`);
        if (data.Status === "200" && data.Data) {
            console.log("SUCCESS!");
        } else {
            console.log("Error:", JSON.stringify(data.Errors || data, null, 2));
        }
    } catch (e) {
        console.error(e);
    }
}

probe();
