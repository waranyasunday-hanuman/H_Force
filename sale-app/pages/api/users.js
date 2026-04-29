// pages/api/users.js
// Admin API: จัดการรายชื่อ User ทั้งหมดในระบบ
// ต้องใช้ SUPABASE_SERVICE_ROLE_KEY เพราะต้องเข้าถึง auth.users

import { createClient } from "@supabase/supabase-js";

// สร้าง service-role client (bypass RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    // GET: ดึงรายชื่อ users ทั้งหมด พร้อม profile
    if (req.method === "GET") {
        try {
            // ดึงรายชื่อ users จาก Supabase Auth
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();
            if (authError) throw authError;

            const users = authData?.users || [];

            // ดึง profiles ทั้งหมด
            const { data: profiles, error: profilesError } = await supabaseAdmin
                .from("profiles")
                .select("*");

            if (profilesError) {
                console.warn("profiles table error:", profilesError.message);
            }

            // Map profiles ให้กับ users แต่ละคน
            const profileMap = {};
            (profiles || []).forEach((p) => {
                profileMap[p.id] = p;
            });

            const result = users.map((u) => ({
                id: u.id,
                email: u.email,
                created_at: u.created_at,
                last_sign_in_at: u.last_sign_in_at,
                role: profileMap[u.id]?.role || "sale",
                display_name: profileMap[u.id]?.display_name || "",
                pic_code: profileMap[u.id]?.pic_code || "",
                pic_name: profileMap[u.id]?.pic_name || "",
                is_active: profileMap[u.id]?.is_active ?? true,
            }));

            return res.status(200).json({ users: result });
        } catch (err) {
            console.error("GET /api/users error:", err);
            return res.status(500).json({ error: err.message });
        }
    }

    // PATCH: อัพเดต profile ของ user (role, pic_code, pic_name, display_name, is_active)
    if (req.method === "PATCH") {
        const { id, role, display_name, pic_code, pic_name, is_active } = req.body;

        if (!id) return res.status(400).json({ error: "Missing user id" });

        try {
            // Upsert profile
            const { error: upsertError } = await supabaseAdmin
                .from("profiles")
                .upsert({
                    id,
                    role,
                    display_name,
                    pic_code,
                    pic_name,
                    is_active,
                    updated_at: new Date().toISOString(),
                });

            if (upsertError) throw upsertError;

            return res.status(200).json({ success: true });
        } catch (err) {
            console.error("PATCH /api/users error:", err);
            return res.status(500).json({ error: err.message });
        }
    }

    res.setHeader("Allow", ["GET", "PATCH"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}
