import { getSessionKey, getInventoryBalance, getProducts } from "../../lib/ecount";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { warehouse } = req.query;
        const sessionKey = await getSessionKey();
        
        // Fetch both products and inventory balances concurrently
        const [products, balances] = await Promise.all([
            getProducts(sessionKey).catch(() => []),
            getInventoryBalance(sessionKey, null, warehouse).catch(() => [])
        ]);

        // Create a map for balances for faster lookup (O(1))
        const balanceMap = {};
        if (balances && balances.length > 0) {
            balances.forEach(b => {
                if (b.PROD_CD) {
                    balanceMap[b.PROD_CD] = parseFloat(b.QTY || b.BAL_QTY || 0);
                }
            });
        }

        // Helper Map to descriptive Types (based on Ecount Standard)
        const typeMapping = {
            "1": "สินค้าสำเร็จรูป (FG)",
            "2": "สินค้ากึ่งสำเร็จรูป (WIP)",
            "3": "วัตถุดิบ (RM)",
            "4": "วัสดุประกอบ",
            "5": "สินค้าซื้อมาขายไป",
            "6": "บริการ",
            "7": "อื่นๆ"
        };

        // Merge & Filter: We only want Finished Goods (FG) as requested
        const inventoryListing = (products || [])
            .filter(p => p.PROD_TYPE === "1") // "1" is FG mapping in Ecount
            .map(p => {
                return {
                    PROD_CD: p.PROD_CD,
                    PROD_DES: p.PROD_DES || "-",
                    PROD_TYPE: typeMapping[p.PROD_TYPE] || p.PROD_TYPE || "สินค้าสำเร็จรูป (FG)",
                    QTY: balanceMap[p.PROD_CD] || 0
                };
            });
        
        res.status(200).json({ inventory: inventoryListing });
    } catch (error) {
        console.error("API Error Inventory:", error);
        res.status(500).json({ error: "Cannot fetch inventory balance" });
    }
}
