
import { getSessionKey } from "../../lib/ecount";

export default async function handler(req, res) {
    try {
        const auth = await getSessionKey();
        const baseUrl = `https://${auth.hostUrl.toLowerCase()}/OAPI/V2`;
        
        const response = await fetch(`${baseUrl}/Receivable/GetListReceivableStatus?SESSION_ID=${auth.sessionKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                COM_CODE: process.env.ECOUNT_COMPANY_CODE,
                BASE_DATE: new Date().toISOString().split('T')[0].replace(/-/g, ''),
                IsPaging: false
            })
        });

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}
