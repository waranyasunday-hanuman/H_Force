// pages/api/warehouse/stock.js
// ดึง Stock คงเหลือแยกตามคลัง พร้อมกรอง PROD_TYPE
import { getSessionKey, getProducts, getInventoryBalance } from "../../../lib/ecount";

const TYPE_MAP = { "1": "FG", "2": "WIP", "3": "RM", "4": "RM", "5": "FG", "6": "SVC", "7": "OTHER" };

export default async function handler(req, res) {
    const { warehouse, type } = req.query;
    try {
        const session = await getSessionKey();
        const [products, balances] = await Promise.all([
            getProducts(session).catch(() => []),
            getInventoryBalance(session, null, warehouse || process.env.ECOUNT_WH_CD).catch(() => [])
        ]);

        const balMap = {};
        (balances || []).forEach(b => { if (b.PROD_CD) balMap[b.PROD_CD] = parseFloat(b.QTY || b.BAL_QTY || 0); });

        let result = (products || []).map(p => ({
            PROD_CD: p.PROD_CD,
            PROD_DES: p.PROD_DES || p.PROD_CD,
            UNIT_CD: p.UNIT_CD || "หน่วย",
            PROD_TYPE_CODE: TYPE_MAP[p.PROD_TYPE] || "FG",
            PROD_TYPE_LABEL: p.PROD_TYPE === "3" || p.PROD_TYPE === "4" ? "Raw Material" : "Finish Goods",
            QTY: balMap[p.PROD_CD] ?? 0,
            WAREHOUSE: warehouse || process.env.ECOUNT_WH_CD
        }));

        if (type === "FG") result = result.filter(p => p.PROD_TYPE_CODE === "FG" || p.PROD_TYPE_CODE === "WIP");
        if (type === "RM") result = result.filter(p => p.PROD_TYPE_CODE === "RM");

        res.status(200).json({ products: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
