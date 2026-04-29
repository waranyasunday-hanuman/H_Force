import { getSessionKey, createGoodsIssue } from "../../lib/ecount";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { date, warehouseCode, inWarehouseCode, custCode, empCode, pjtCode, remarks, items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "ไม่มีรายการสินค้า" });
        }

        const sessionKey = await getSessionKey();

        const result = await createGoodsIssue(sessionKey, {
            date: date || new Date().toISOString().split('T')[0].replace(/-/g, ''),
            warehouseCode,
            inWarehouseCode,
            custCode,
            empCode,
            pjtCode,
            remarks,
            items
        });

        res.status(200).json({ success: true, result });
    } catch (error) {
        console.error("API Error goods-issue:", error);
        res.status(500).json({ error: error.message || "Failed to create goods issue" });
    }
}
