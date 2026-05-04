// pages/api/warehouse/issue/create.js
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { type, purpose, department, requesterName, requester_id, neededDate, remarks, items } = req.body;

    if (!type || !requesterName || !items || items.length === 0) {
        return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน: กรุณาระบุประเภท ชื่อผู้ขอ และรายการสินค้า" });
    }

    try {
        // 1. สร้าง Running No. โดยเรียก Postgres Function
        const { data: noData, error: noError } = await supabaseAdmin
            .rpc("generate_issue_request_no", { p_type: type });

        if (noError) throw new Error("ไม่สามารถสร้างเลขที่เอกสารได้: " + noError.message);

        const requestNo = noData;

        // 2. บันทึกหัวเอกสาร
        const { data: requestData, error: requestError } = await supabaseAdmin
            .from("warehouse_issue_requests")
            .insert({
                request_no: requestNo,
                type,
                purpose: purpose || "",
                department: department || "",
                requester_id: requester_id || null,
                requester_name: requesterName,
                needed_date: neededDate || null,
                remarks: remarks || "",
                status: "pending"
            })
            .select()
            .single();

        if (requestError) throw new Error("บันทึกคำขอไม่สำเร็จ: " + requestError.message);

        // 3. บันทึกรายการสินค้า
        const itemsToInsert = items.map(item => ({
            request_id: requestData.id,
            product_code: item.productCode,
            product_name: item.productName || "",
            unit: item.unit || "หน่วย",
            requested_qty: parseFloat(item.quantity) || 0,
            item_remarks: item.remarks || ""
        }));

        const { error: itemsError } = await supabaseAdmin
            .from("warehouse_issue_items")
            .insert(itemsToInsert);

        if (itemsError) throw new Error("บันทึกรายการสินค้าไม่สำเร็จ: " + itemsError.message);

        return res.status(200).json({ 
            success: true, 
            request_no: requestNo,
            request_id: requestData.id,
            data: requestData
        });

    } catch (err) {
        console.error("Error creating issue request:", err);
        return res.status(500).json({ error: err.message });
    }
}
