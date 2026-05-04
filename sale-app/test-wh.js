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
        
        console.log("Fetching balance for ST002...");
        const balance = await getInventoryBalance(auth.sessionKey, auth.hostUrl, null, "ST002");
        
        console.log(`Fetched ${balance.length} balances.`);
    } catch(err) {
        console.error("Test failed:", err);
    }
}

runTest();
