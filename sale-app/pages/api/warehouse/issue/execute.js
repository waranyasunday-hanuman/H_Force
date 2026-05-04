import { createClient } from "@supabase/supabase-js";
import { getSessionKey, createGoodsIssue } from "../../../../lib/ecount";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { request_id, items = [], issueDate } = req.body;

    if (!request_id || items.length === 0) {
        return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน" });
    }

    try {
        // 1. Get request header from Supabase
        const { data: request, error: reqErr } = await supabaseAdmin
            .from("warehouse_issue_requests")
            .select("*")
            .eq("id", request_id)
            .single();

        if (reqErr || !request) throw new Error("ไม่พบข้อมูลใบขอเบิก");

        if (request.status !== "approved") {
            throw new Error("ใบขอเบิกยังไม่ได้รับการอนุมัติ หรือถูกจัดการไปแล้ว");
        }

        // 2. Format data for Ecount API
        // items here are already split by lotNo from the frontend
        const enhancedIssueData = {
            date: issueDate.replace(/-/g, ""), // YYYYMMDD
            warehouseCode: request.from_warehouse || "ST002",
            inWarehouseCode: request.operation_type === "transfer" ? request.to_warehouse : "",
            type: request.type,
            remarks: `[${request.type}] ${request.request_no} ${request.purpose}`,
            items: items.map(item => ({
                productCode: item.product_code,
                quantity: item.issue_qty,
                lotNo: item.lotNo || "", // From multi-lot input
                remarks: item.item_remarks || ""
            }))
        };

        const { sessionKey, hostUrl } = await getSessionKey();
        
        // 3. Call Ecount API
        const result = await createGoodsIssue(sessionKey, hostUrl, enhancedIssueData);

        // 4. Update request status in Supabase
        const { error: updateErr } = await supabaseAdmin
            .from("warehouse_issue_requests")
            .update({
                status: "issued",
                updated_at: new Date().toISOString(),
                ecount_ref_no: "SUCCESS" // Maybe store response ID if available
            })
            .eq("id", request_id);

        if (updateErr) throw updateErr;

        // Optional: Update issued_qty in warehouse_issue_items
        // Group by product_id or original item id to sum issued qty
        const issuedQtys = {};
        items.forEach(i => {
            if (!issuedQtys[i.original_item_id]) issuedQtys[i.original_item_id] = 0;
            issuedQtys[i.original_item_id] += Number(i.issue_qty);
        });

        for (const [itemId, qty] of Object.entries(issuedQtys)) {
            await supabaseAdmin
                .from("warehouse_issue_items")
                .update({ issued_qty: qty })
                .eq("id", itemId);
        }

        res.status(200).json({ success: true, result });
    } catch (err) {
        console.error("Execute Issue error:", err);
        return res.status(500).json({ error: err.message || "เกิดข้อผิดพลาดในการจ่ายสินค้า" });
    }
}
