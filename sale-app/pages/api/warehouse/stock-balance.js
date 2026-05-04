import { getSessionKey, getInventoryBalance, getProducts } from "../../../lib/ecount";

const TYPE_MAP = {
    "1": "Finish Goods (FG)",
    "2": "Work-in-process (WIP)",
    "3": "Raw Material (RM)",
    "4": "Sub-material",
    "5": "Merchandise",
    "6": "Service",
    "7": "Expense",
    "8": "Other"
};

// --- In-Memory Cache for Products ---
let cachedProducts = null;
let cachedProductsTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const { warehouse, search, showZero, type } = req.query;
    const targetWH = (warehouse && warehouse !== "all") ? warehouse : "";

    try {
        let auth;
        try {
            auth = await getSessionKey();
        } catch (authErr) {
            console.error("Auth failed:", authErr);
            return res.status(401).json({ error: "การเชื่อมต่อ Ecount ล้มเหลว (Login Failed)" });
        }

        const { sessionKey, hostUrl } = auth;

        // 1. ดึงยอดคงเหลือ (สำคัญที่สุด)
        const balRows = await getInventoryBalance(sessionKey, hostUrl, null, targetWH);
        
        // 2. ดึง Master สินค้า (ใช้ Cache เพื่อไม่ให้โหลดหนักเกินไปจนโดน Ecount บล็อก)
        let productsList = [];
        const now = Date.now();
        if (cachedProducts && (now - cachedProductsTime < CACHE_TTL)) {
            productsList = cachedProducts;
            console.log("Using cached products list");
        } else {
            productsList = await getProducts(sessionKey, hostUrl).catch((e) => {
                console.warn("getProducts failed, gracefully degrading", e);
                return [];
            });
            if (productsList.length > 0) {
                cachedProducts = productsList;
                cachedProductsTime = now;
            } else if (cachedProducts) {
                // If it failed but we have old cache, use old cache
                productsList = cachedProducts;
            }
        }

        // 3. จัดกลุ่มยอดคงเหลือ
        const balMap = {};
        for (const b of balRows) {
            const code = b.PROD_CD || b.PROD_CODE;
            if (code) {
                balMap[code] = (balMap[code] || 0) + parseFloat(b.BAL_QTY ?? b.QTY ?? b.QTY_BAL ?? 0);
            }
        }

        // 4. สร้างชุดข้อมูล
        let data = [];
        
        if (productsList.length > 0) {
            // กรณีปกติ: ใช้รายชื่อจาก Master จะได้ข้อมูลที่ครบถ้วน (รวมถึงสินค้าที่ยอดเป็น 0)
            data = productsList.map(p => {
                const code = p.PROD_CD;
                return {
                    PROD_CD: code,
                    PROD_DES: p.PROD_DES || code,
                    UNIT_CD: p.UNIT || p.UNIT_CD || "PCS",
                    PROD_TYPE: TYPE_MAP[p.PROD_TYPE] || p.PROD_TYPE || "N/A",
                    QTY: balMap[code] || 0,
                    WH_CD: targetWH || "ALL",
                };
            });
        } else {
            // กรณีสำรอง (เสถียรภาพ): ถ้าดึง Master ไม่สำเร็จ ให้เอาข้อมูลรหัสและชื่อจากใบยอดยกมาแสดงเลย
            const uniqueCodes = Object.keys(balMap);
            data = uniqueCodes.map(code => {
                const b = balRows.find(r => (r.PROD_CD || r.PROD_CODE) === code) || {};
                return {
                    PROD_CD: code,
                    PROD_DES: b.PROD_DES || b.PROD_NAME || code,
                    UNIT_CD: b.UNIT || b.UNIT_CD || "PCS",
                    PROD_TYPE: "N/A",
                    QTY: balMap[code],
                    WH_CD: targetWH || "ALL",
                };
            });
        }

        // 5. กรองข้อมูลฝั่ง Server
        if (type && type !== "all") {
            data = data.filter(r => r.PROD_TYPE === type);
        }

        if (search) {
            const q = search.toLowerCase();
            data = data.filter(r =>
                r.PROD_CD.toLowerCase().includes(q) ||
                (r.PROD_DES && r.PROD_DES.toLowerCase().includes(q))
            );
        }

        // ถ้าผู้ใช้ไม่ได้สั่งให้แสดงยอด 0 ให้ตัดทิ้งเลยเพื่อลดปริมาณข้อมูล
        if (showZero !== 'true') {
             data = data.filter(r => r.QTY > 0 || r.QTY < 0);
        }

        // 6. เรียงลำดับ (ยอดเยอะสุดขึ้นก่อน)
        data.sort((a, b) => {
            if (b.QTY !== a.QTY) return b.QTY - a.QTY;
            return a.PROD_CD.localeCompare(b.PROD_CD);
        });

        return res.status(200).json({ 
            data, 
            count: data.length,
            debug: {
                host: hostUrl,
                productsMasterFetched: productsList.length > 0,
                balancesFetched: balRows.length
            }
        });
    } catch (err) {
        console.error("stock-balance error:", err);
        return res.status(500).json({ error: err.message });
    }
}
