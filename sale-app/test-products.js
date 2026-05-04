const fs = require('fs');
const path = require('path');
const { getSessionKey, getProducts } = require('./lib/ecount');

// Need to simulate environment variables
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
        
        console.log("Fetching products...");
        const products = await getProducts(auth.sessionKey, auth.hostUrl);
        
        console.log(`Fetched ${products.length} products.`);
        if (products.length > 0) {
            console.log("First product:", JSON.stringify(products[0], null, 2));
        } else {
            console.log("Products is empty. Let's check why getProducts might be failing.");
        }
    } catch(err) {
        console.error("Test failed:", err);
    }
}

runTest();
