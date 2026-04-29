import { supabase } from "../../lib/supabase";
import { getSessionKey, createInvoiceAuto, createGoodsIssue } from "../../lib/ecount";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { id, invoiceDate } = req.body;
    if (!id || !invoiceDate) {
        return res.status(400).json({ error: "Missing SO ID or Invoice Date" });
    }

    try {
        // 1. Fetch SO details
        const { data: order, error: fetchError } = await supabase
            .from("sales_orders")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !order) {
            throw new Error(fetchError?.message || "Order not found");
        }

        if (order.approval_status !== 'approved') {
            return res.status(400).json({ error: "Sales order must be approved before invoicing." });
        }

        // 2. Push to Ecount Invoice
        const sessionKey = await getSessionKey();
        
        // Ecount TRX_DATE requires YYYYMMDD format without hyphens
        const formattedEcountDate = invoiceDate.replace(/-/g, "");

        // --- PHASE 4: ตัดสต๊อกอัตโนมัติ (Goods Issue) ---
        // เราจะยิงใบจ่ายสินค้าเพื่อตัดสต๊อกก่อน หรือพร้อมๆ กับการเปิดบิล
        try {
            // เช็คว่ามี items ไหม
            const items = order.items || (order.metadata?.items) || [];
            
            if (items.length > 0) {
                const issueData = {
                    date: formattedEcountDate,
                    warehouseCode: "ST002", // คลังหลัก (สามารถเปลี่ยนให้อ่านจากข้อมูลเซลส์ได้)
                    custCode: order.customer_code,
                    remarks: `ตัดสต๊อกอัตโนมัติจากการเปิดบิล (Ref: ${id})`,
                    items: items.map(i => ({
                        productCode: i.productCode,
                        quantity: i.quantity,
                        price: i.price,
                        remarks: ""
                    }))
                };
                console.log("Auto-deducting stock for SO", id);
                await createGoodsIssue(sessionKey, issueData);
            }
        } catch (issueErr) {
            console.error("Auto Stock Deduct Failed:", issueErr);
            throw new Error("ตัดสต๊อกไม่สำเร็จ: " + (issueErr.message || "Unknown Error"));
        }

        // --- ลงบัญชีรายได้ (Invoice Auto) ---
        const invoiceData = {
            date: formattedEcountDate,
            customerCode: order.customer_code,
            totalAmt: order.total_amount,
            vatAmt: 0, 
            remarks: "สร้างอัตโนมัติจากแอปมือถือ (Sales App - อนุมัติแล้ว)"
        };

        await createInvoiceAuto(sessionKey, invoiceData);

        // 3. Update Supabase with invoiced status
        const { data: updatedOrder, error: updateError } = await supabase
            .from("sales_orders")
            .update({ 
                invoice_status: 'invoiced',
                invoice_date: invoiceDate
            })
            .eq("id", id)
            .select()
            .single();

        if (updateError) {
            console.error("Warning: Invoice successful but DB update failed", updateError);
            // We should still return success but maybe notify?
        }

        return res.status(200).json({ success: true, order: updatedOrder || order });
    } catch (err) {
        console.error("API Error invoicing order:", err);
        return res.status(500).json({ error: err.message || "Failed to push invoice to Ecount" });
    }
}
