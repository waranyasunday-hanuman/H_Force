require('dotenv').config({ path: '.env.local' });
const { getSessionKey, getProducts } = require('./lib/ecount.js');

async function test() {
    try {
        console.log("Getting session key...");
        const auth = await getSessionKey();
        console.log("Session key:", auth.sessionKey);
        console.log("Fetching products...");
        const products = await getProducts(auth.sessionKey, auth.hostUrl);
        console.log("Products count:", products.length);
        console.log(products.slice(0, 2));
    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
