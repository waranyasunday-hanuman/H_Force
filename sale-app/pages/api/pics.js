// pages/api/pics.js
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method === "GET") {
        try {
            const { data, error } = await supabaseAdmin
                .from("pics")
                .select("*")
                .order("pic_code");

            if (error) throw error;
            return res.status(200).json({ pics: data });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }
    return res.status(405).end();
}
