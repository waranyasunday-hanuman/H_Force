
const { getSessionKey } = require('./lib/ecount');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function testReceivable() {
    try {
        const auth = await getSessionKey();
        const baseUrl = `https://${auth.hostUrl.toLowerCase()}/OAPI/V2`;
        
        console.log("Fetching Receivable Status...");
        const response = await fetch(`${baseUrl}/Receivable/GetListReceivableStatus?SESSION_ID=${auth.sessionKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                COM_CODE: process.env.ECOUNT_COMPANY_CODE,
                BASE_DATE: new Date().toISOString().split('T')[0].replace(/-/g, ''),
                IsPaging: false
            })
        });

        const data = await response.json();
        console.log("Status:", data.Status);
        if (data.Data && data.Data.Result) {
            console.log("Found", data.Data.Result.length, "records");
            console.log("Sample Record:", JSON.stringify(data.Data.Result[0], null, 2));
        } else {
            console.log("No data found or Error:", JSON.stringify(data, null, 2));
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

testReceivable();
