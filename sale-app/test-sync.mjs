const { getSessionKey, getCustomers } = require('./lib/ecount');
require('dotenv').config({ path: '.env.local' });

async function test() {
    try {
        console.log("Logging in...");
        const sessionKey = await getSessionKey();
        console.log("Logged in. Session Key:", sessionKey);
        
        console.log("Fetching customers...");
        const customers = await getCustomers(sessionKey);
        console.log("Found", customers.length, "customers.");
        if (customers.length > 0) {
            console.log("Sample customer:", JSON.stringify(customers[0], null, 2));
        }
    } catch (error) {
        console.error("Test failed:", error);
    }
}

test();
