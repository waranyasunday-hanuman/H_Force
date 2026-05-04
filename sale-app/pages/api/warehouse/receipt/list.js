import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { type } = req.query; // 'FG' or 'RM'

        let query = supabase
            .from("warehouse_receipt_requests")
            .select("*")
            .order('created_at', { ascending: false });
            
        if (type) {
            query = query.eq('type', type);
        }

        const { data, error } = await query;

        if (error) {
            // Check if table exists
            if (error.code === '42P01') {
                return res.status(200).json({ success: true, receipts: [] });
            }
            throw error;
        }

        res.status(200).json({ success: true, receipts: data });
    } catch (error) {
        console.error("API Error fetch receipt list:", error);
        res.status(500).json({ error: error.message });
    }
}
