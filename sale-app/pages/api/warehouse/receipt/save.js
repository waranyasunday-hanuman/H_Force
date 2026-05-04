import { createClient } from "@supabase/supabase-js";
import { getSessionKey, createGoodsReceipt } from "../../../../lib/ecount";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { 
            id, // if editing
            documentNo, 
            status, // 'draft', 'approved', 'cancelled'
            type, // 'FG' or 'RM'
            receiptDate, 
            custCode, 
            empCode, 
            pjtCode, 
            remarks, 
            items 
        } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: "ไม่มีรายการสินค้า" });
        }

        // 1. Save to Supabase (warehouse_receipt_requests)
        let requestId = id;
        
        if (!requestId) {
            // Create new
            const { data: requestData, error: requestError } = await supabase
                .from("warehouse_receipt_requests")
                .insert({
                    receipt_no: documentNo,
                    status: status,
                    type: type,
                    receipt_date: receiptDate,
                    cust_code: custCode,
                    emp_code: empCode,
                    pjt_code: pjtCode,
                    remarks: remarks
                })
                .select()
                .single();
                
            if (requestError) {
                // If table doesn't exist, we skip saving to DB (for testing env without migrations)
                if (requestError.code !== '42P01') throw requestError;
            } else {
                requestId = requestData.id;
            }
        } else {
            // Update existing
            const { error: updateError } = await supabase
                .from("warehouse_receipt_requests")
                .update({
                    status: status,
                    receipt_date: receiptDate,
                    cust_code: custCode,
                    emp_code: empCode,
                    pjt_code: pjtCode,
                    remarks: remarks,
                    updated_at: new Date().toISOString()
                })
                .eq("id", requestId);
                
            if (updateError && updateError.code !== '42P01') throw updateError;
            
            // Delete old items
            await supabase.from("warehouse_receipt_items").delete().eq("receipt_id", requestId);
        }

        // Save Items to Supabase
        if (requestId) {
            const itemsToInsert = items.map(item => ({
                receipt_id: requestId,
                product_code: item.productCode,
                product_name: item.productName,
                in_warehouse_code: item.inWarehouseCode,
                receipt_type: item.receiptType,
                lot_no: item.lotNo,
                expire_date: item.expireDate,
                quantity: item.quantity,
                price: item.price || 0,
                remarks: item.remarks
            }));
            
            const { error: itemsError } = await supabase
                .from("warehouse_receipt_items")
                .insert(itemsToInsert);
                
            if (itemsError && itemsError.code !== '42P01') throw itemsError;
        }

        // 2. If status is 'approved', submit to Ecount
        if (status === 'approved') {
            const { sessionKey, hostUrl } = await getSessionKey();
            
            const ecountItems = items.map(item => ({
                ...item,
                remarks: `[${item.receiptType}] ${item.remarks || ''}`.trim()
            }));

            const result = await createGoodsReceipt(sessionKey, hostUrl, {
                date: receiptDate.replace(/-/g, ""),
                inWarehouseCode: items[0]?.inWarehouseCode || "ST002",
                custCode,
                empCode,
                pjtCode,
                remarks: remarks || `รับเข้าสินค้า ${type}`,
                items: ecountItems
            });
            
            return res.status(200).json({ success: true, result, requestId });
        }

        res.status(200).json({ success: true, requestId });
    } catch (error) {
        console.error("API Error warehouse receipt save:", error);
        res.status(500).json({ error: error.message || "Failed to save goods receipt" });
    }
}
