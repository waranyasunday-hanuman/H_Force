// pages/api/warehouse/test-stock.js
import { getSessionKey, getInventoryBalance } from "../../../lib/ecount";

export default async function handler(req, res) {
    try {
        const session = await getSessionKey();
        const bal = await getInventoryBalance(session, null, 'ST002');
        return res.status(200).json({ count: bal.length, bal });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
