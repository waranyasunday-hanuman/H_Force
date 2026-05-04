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
        
        const updatePayload = { 
            customer_code: soData.customerCode,
            items: soData.items,
            payment_type: soData.paymentType,
            payment_slip_url: soData.paymentSlipUrl,
            due_date: soData.dueDate,
            need_tax_invoice: soData.needTaxInvoice,
            tax_document_url: soData.taxDocumentUrl,
            total_amount: totalAmount,
            approval_status: 'approved' 
        };

        let { data, error } = await supabase
            .from("sales_orders")
            .update(updatePayload)
            .eq("id", id)
            .select()
            .single();

        // If missing column error (PGRST204 or similar message)
        if (error && (error.code === 'PGRST204' || error.message.includes('need_tax_invoice'))) {
            console.warn("Falling back to safe update due to missing columns");
            
            // Move problematic fields into metadata within items
            const safeItems = Array.isArray(soData.items) ? [...soData.items] : [soData.items];
            safeItems.push({
                isMetadata: true,
                needTaxInvoice: soData.needTaxInvoice,
                taxDocumentUrl: soData.taxDocumentUrl,
                paymentType: soData.paymentType,
                dueDate: soData.dueDate,
                updatedAt: new Date().toISOString()
            });

            const safePayload = {
                customer_code: soData.customerCode,
                items: safeItems,
                total_amount: totalAmount,
                approval_status: 'approved'
            };

            const retry = await supabase
                .from("sales_orders")
                .update(safePayload)
                .eq("id", id)
                .select()
                .single();
            
            data = retry.data;
            error = retry.error;
        }

        if (error) {
            throw error;
        }

        return res.status(200).json({ success: true, result: data });
    } catch (err) {
        console.error("API Error approving order:", err);
        return res.status(500).json({ error: err.message || "Failed to approve order" });
    }
}
