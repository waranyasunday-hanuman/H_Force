
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

async function getZone() {
    const response = await fetch("https://oapi.ecount.com/OAPI/V2/Zone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ COM_CODE: env.ECOUNT_COMPANY_CODE }),
    });
    return (await response.json()).Data;
}

async function run() {
    const zoneData = await getZone();
    const zone = zoneData.ZONE;
    const domain = zoneData.DOMAIN;
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

    console.log(`Checking Inventory Balance with WH_CD...`);
    const res = await fetch(`${baseUrl}/InventoryBalance/GetListInventoryBalanceStatus?SESSION_ID=${sessionKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            COM_CODE: env.ECOUNT_COMPANY_CODE,
            BASE_DATE: "20260423",
            IsPaging: false,
            WH_CD: "ST0002" // Testing the user's requested location
        }),
    });
    const data = await res.json();
    console.log(`Status with ST0002:`, data.Status);
    if (data.Data) {
        console.log(`Count with ST0002:`, data.Data.Result?.length);
    } else {
        console.log(`Error with ST0002:`, JSON.stringify(data.Errors));
    }

    const res2 = await fetch(`${baseUrl}/InventoryBalance/GetListInventoryBalanceStatus?SESSION_ID=${sessionKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            COM_CODE: env.ECOUNT_COMPANY_CODE,
            BASE_DATE: "20260423",
            IsPaging: false,
            WH_CD: "ST002" // Testing .env.local version
        }),
    });
    const data2 = await res2.json();
    console.log(`Status with ST002:`, data2.Status);
    if (data2.Data) {
        console.log(`Count with ST002:`, data2.Data.Result?.length);
    }
}

run();
