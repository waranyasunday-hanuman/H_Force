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

// Mock environment
process.env.ECOUNT_COMPANY_CODE = env.ECOUNT_COMPANY_CODE;
process.env.ECOUNT_USER_ID = env.ECOUNT_USER_ID;
process.env.ECOUNT_API_KEY = env.ECOUNT_API_KEY;

const { getSessionKey } = require('./lib/ecount');

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

async function test() {
    try {
        const auth = await getSessionKey();
        const baseUrl = `https://${auth.hostUrl.toLowerCase()}/OAPI/V2`;
        
        const ep = "/Accounting/GetARAPAgingListPost";
        console.log(`Testing EP: ${ep}`);
        const response = await fetch(`${baseUrl}${ep}?SESSION_ID=${auth.sessionKey}`, {
            method: 'POST',
            headers: getWafBypassHeaders("", auth.hostUrl),
            body: JSON.stringify({
                COM_CODE: process.env.ECOUNT_COMPANY_CODE,
                BASE_DATE: "20260505",
                IsPaging: false
            })
        });

        const data = await response.json();
        console.log(`Status: ${data.Status}`);
        if (data.Data && (data.Data.Datas || data.Data.Result)) {
            const count = (data.Data.Datas || data.Data.Result).length;
            console.log(`FOUND ${count} records!`);
            if (count > 0) {
                console.log("Sample:", JSON.stringify((data.Data.Datas || data.Data.Result)[0], null, 2));
            }
        } else {
            console.log("No data or Error:", JSON.stringify(data.Errors || data, null, 2));
        }
    } catch (err) {
        console.error("Test Error:", err);
    }
}

test();
