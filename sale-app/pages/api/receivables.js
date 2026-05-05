
import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
    const { method } = req;

    try {
        if (method === "GET") {
            const { pic_code, range, customer_code } = req.query;
            
            let query = supabase.from('v_debt_aging').select('*');

            if (pic_code && pic_code !== 'all') query = query.eq('pic_code', pic_code);
            if (customer_code) query = query.eq('customer_code', customer_code);
            if (range && range !== 'all') query = query.eq('aging_range', range);

            const { data, error } = await query.order('invoice_date', { ascending: true });
            if (error) throw error;
            return res.status(200).json(data);
        }

        if (method === "POST") {
            const { invoice_nos, status, slip_url } = req.body; // รองรับ Bulk Update

            if (!invoice_nos || !Array.isArray(invoice_nos)) {
                return res.status(400).json({ error: "invoice_nos must be an array" });
            }

            const updateData = { 
                status: status || 'paid',
                updated_at: new Date().toISOString()
            };
            
            if (status === 'paid') {
                updateData.outstanding_amount = 0;
                updateData.paid_at = new Date().toISOString();
                if (slip_url) updateData.slip_url = slip_url;
            }

            const { data, error } = await supabase
                .from('invoices')
                .update(updateData)
                .in('invoice_no', invoice_nos);

            if (error) throw error;
            return res.status(200).json({ success: true, updated: invoice_nos.length });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        console.error("Receivables API Error:", error);
        res.status(500).json({ error: error.message });
    }
}
