const fs = require('fs');
const path = require('path');
const { getSessionKey, getInventoryBalance } = require('./lib/ecount');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
envFile.split('\n').forEach(line => {
    if (line && line.indexOf('=') !== -1) {
        const parts = line.split('=');
        process.env[parts[0].trim()] = parts[1].trim().replace(/^['"](.*)['"]$/, '$1');
    }
});

async function runTest() {
    try {
        console.log("Logging in...");
        const auth = await getSessionKey();
        console.log("Logged in:", auth.hostUrl);
        
        console.log("Fetching balance...");
        const balance = await getInventoryBalance(auth.sessionKey, auth.hostUrl, null, "ALL");
        
        console.log(`Fetched ${balance.length} balances.`);
        if (balance.length > 0) {
            console.log("First balance:", JSON.stringify(balance[0], null, 2));
        }
    } catch(err) {
        console.error("Test failed:", err);
    }
}

runTest();
