import { createClient } from "@supabase/supabase-js";

// ใช้ service role เพื่อ bypass RLS และดึงข้อมูลตามสิทธิ์ได้เต็มที่
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // รับ role และ email จาก query string ที่ส่งมาจากหน้า
    const { role, email } = req.query;

    try {
        let query = supabaseAdmin
            .from("sales_orders")
            .select("*")
            .order("created_at", { ascending: false });

        // sale เห็นเฉพาะออเดอร์ของตัวเอง
        if (role === "sale" && email) {
            query = query.eq("sales_person", email);
        }

        const { data, error } = await query;
        if (error) throw error;

        return res.status(200).json(data);
    } catch (err) {
        console.error("API Error fetching orders:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch orders" });
    }
}
