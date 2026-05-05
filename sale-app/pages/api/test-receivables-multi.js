
import { getSessionKey } from "../../lib/ecount";

export default async function handler(req, res) {
    try {
        const auth = await getSessionKey();
        const baseUrl = `https://${auth.hostUrl.toLowerCase()}/OAPI/V2`;
        
        const endpoints = [
            "Receivable/GetListReceivableStatusPost",
            "Receivable/GetListReceivableAgingStatusPost"
        ];

        const results = {};

        for (const ep of endpoints) {
            try {
                const response = await fetch(`${baseUrl}/${ep}?SESSION_ID=${auth.sessionKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        COM_CODE: process.env.ECOUNT_COMPANY_CODE,
                        SESSION_ID: auth.sessionKey,
                        BASE_DATE: new Date().toISOString().split('T')[0].replace(/-/g, ''),
                        IsPaging: false
                    })
                });
                const data = await response.json();
                results[ep] = data;
            } catch (err) {
                results[ep] = { error: err.message };
            }
        }

        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
