// pages/api/warehouse/issue/approve.js
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { request_id, action = "approve", approved_by, approval_remarks, items = [] } = req.body;

    if (!request_id || !approved_by) {
        return res.status(400).json({ error: "กรุณาระบุ request_id และ approved_by" });
    }

    try {
        const newStatus = action === "reject" ? "rejected" : "approved";

        // 1. Update request header
        const { error: reqErr } = await supabaseAdmin
            .from("warehouse_issue_requests")
            .update({
                status: newStatus,
                approved_by,
                approved_at: new Date().toISOString(),
                approval_remarks: approval_remarks || null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", request_id);

        if (reqErr) throw reqErr;

        // 2. Update approved_qty for each item (approve only)
        if (action === "approve" && items.length > 0) {
            for (const item of items) {
                if (!item.id) continue;
                const { error: itemErr } = await supabaseAdmin
                    .from("warehouse_issue_items")
                    .update({ approved_qty: item.approved_qty })
                    .eq("id", item.id)
                    .eq("request_id", request_id);
                if (itemErr) throw itemErr;
            }
        }

        return res.status(200).json({ success: true, status: newStatus });
    } catch (err) {
        console.error("Approve error:", err);
        return res.status(500).json({ error: err.message });
    }
}
