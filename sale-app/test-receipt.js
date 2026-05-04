const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2].trim();
});

const { getSessionKey } = require('./lib/ecount');

async function testEndpoints() {
    const { sessionKey, hostUrl } = await getSessionKey(true);
    const baseUrl = `https://${hostUrl.toLowerCase()}/OAPI/V2`;
    
    const ep = "Purchase/SavePurchase";

    const payload = {
        PurchaseList: [{
            BulkDatas: {
                UPLOAD_SER_NO: "1",
                IO_DATE: "20260504",
                PROD_CD: "00000",
                QTY: "1",
                WH_CD: "ST002"
            }
        }]
    };

    try {
        const response = await fetch(`${baseUrl}/${ep}?SESSION_ID=${sessionKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        console.log("Response:", JSON.stringify(data.Errors || data.Data || data, null, 2));
    } catch (e) {
        console.log("Fetch Error");
    }
}

testEndpoints();
