// pages/api/warehouse/issue/list.js
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const { type, status, requester_id, id } = req.query;

    try {
        let query = supabaseAdmin
            .from("warehouse_issue_requests")
            .select(`*, warehouse_issue_items (*)`)
            .order("created_at", { ascending: false });

        if (id)           query = query.eq("id", id);
        if (type)         query = query.eq("type", type);
        if (status)       query = query.eq("status", status);
        if (requester_id) query = query.eq("requester_id", requester_id);

        const { data, error } = await query;
        if (error) throw error;

        return res.status(200).json({ requests: data || [] });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
