// pages/api/warehouse/issue.js
import { getSessionKey, createGoodsIssue } from "../../../lib/ecount";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const issueData = req.body;
        // issueData = { date, outWarehouseCode, type, remarks, items: [...] }
        
        // เราสามารถเพิ่มข้อมูลประเภท (Raw Mat / Finish Goods) ลงใน Remarks เพื่อให้ฝ่ายคลังรู้
        const enhancedIssueData = {
            ...issueData,
            remarks: `[${issueData.type}] ${issueData.remarks || ""}`.trim()
        };

        const { sessionKey, hostUrl } = await getSessionKey();
        const result = await createGoodsIssue(sessionKey, hostUrl, enhancedIssueData);

        res.status(200).json({ success: true, result });
    } catch (error) {
        console.error("API Error Goods Issue:", error);
        res.status(500).json({ 
            error: "Cannot create goods issue", 
            details: error.message || error 
        });
    }
}
