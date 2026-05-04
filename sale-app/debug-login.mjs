import { getSessionKey } from './lib/ecount.js';

async function debugLogin() {
    console.log("--- Ecount Login Debug ---");
    console.log("COM_CODE:", process.env.ECOUNT_COMPANY_CODE);
    console.log("USER_ID:", process.env.ECOUNT_USER_ID);
    console.log("API_KEY:", process.env.ECOUNT_API_KEY ? "YES (HIDDEN)" : "MISSING");

    try {
        console.log("\nAttempting Login via getSessionKey()...");
        const session = await getSessionKey();
        console.log("\nLogin SUCCESS! Session ID:", session);
    } catch (err) {
        console.error("\nDEBUG FAILED:", err.message);
    }
}

debugLogin();
