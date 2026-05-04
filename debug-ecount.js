const { getSessionKey, getProducts, getInventoryBalance } = require('./sale-app/lib/ecount.js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, 'sale-app', '.env.local');
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length === 2) {
            process.env[parts[0].trim()] = parts[1].trim().replace(/^'|\"|\"|'$/g, '');
        }
    });
}

async function main() {
    try {
        console.log("--- DEBUG START ---");
        const companyCode = process.env.ECOUNT_COMPANY_CODE || "917158";
        console.log("COMPANY:", companyCode);

        console.log("1. Attempting Login...");
        const session = await getSessionKey();
        console.log("SUCCESS: Session ID =", session);

        console.log("2. Fetching Products...");
        const products = await getProducts(session);
        console.log("SUCCESS: Products Count =", products.length);
        if (products.length > 0) {
            console.log("First Product Data (Raw):", JSON.stringify(products[0], null, 2));
        }

        console.log("3. Fetching Balance (ST002)...");
        const balance = await getInventoryBalance(session, null, "ST002");
        console.log("SUCCESS: Balance Rows =", balance.length);
        if (balance.length > 0) {
            console.log("First Balance Row Data (Raw):", JSON.stringify(balance[0], null, 2));
        }

    } catch (error) {
        console.error("--- ERROR ---");
        console.error(error);
    }
}

main();
