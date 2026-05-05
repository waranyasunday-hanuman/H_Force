
import { getSessionKey } from "../../lib/ecount";

export default async function handler(req, res) {
    try {
        const auth = await getSessionKey();
        const baseUrl = `https://${auth.hostUrl.toLowerCase()}/OAPI/V2`;
        
        const response = await fetch(`${baseUrl}/Sale/GetSaleListPost?SESSION_ID=${auth.sessionKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                COM_CODE: process.env.ECOUNT_COMPANY_CODE,
                START_DATE: "20250601",
                END_DATE: new Date().toISOString().split('T')[0].replace(/-/g, ''),
                IsPaging: false
            })
        });

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
