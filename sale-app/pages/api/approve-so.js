import { supabase } from "../../lib/supabase";
import { getSessionKey, createSalesOrder } from "../../lib/ecount";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const soData = req.body;
        const id = soData.id;
        
        if (!id) {
            return res.status(400).json({ error: "Missing SO ID" });
        }

        // 1. Sync to Ecount (Bypassed for now)
        let ecountResult = null;
        try {
            // const sessionKey = await getSessionKey();
            // ecountResult = await createSalesOrder(sessionKey, soData);
            console.log("Bypassing Ecount sync for approval");
        } catch (e) {
            console.error("Ecount Sync Failed:", e);
            // throw new Error(`ส่งข้อมูลเข้า Ecount ล้มเหลว: ${e.message}`);
        }

        // 2. Update Supabase
        const totalAmount = soData.items.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0)), 0);
        
        const { data, error } = await supabase
            .from("sales_orders")
            .update({ 
                customer_code: soData.customerCode,
                items: soData.items,
                payment_type: soData.paymentType,
                payment_slip_url: soData.paymentSlipUrl,
                due_date: soData.dueDate,
                need_tax_invoice: soData.needTaxInvoice,
                tax_document_url: soData.taxDocumentUrl,
                total_amount: totalAmount,
                approval_status: 'approved' 
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return res.status(200).json({ success: true, result: data });
    } catch (err) {
        console.error("API Error approving order:", err);
        return res.status(500).json({ error: err.message || "Failed to approve order" });
    }
}
