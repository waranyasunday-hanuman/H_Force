// pages/api/users/invite.js
// Admin API: Invite user ใหม่เข้าระบบผ่าน Supabase Auth

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { email, role, display_name, pic_code, pic_name } = req.body;

    if (!email) return res.status(400).json({ error: "กรุณาระบุ Email" });

    try {
        // 1. สร้าง user ใน Supabase Auth (ส่ง invitation email อัตโนมัติ)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: { display_name },
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/set-password`,
        });

        if (authError) throw authError;

        const userId = authData.user?.id;
        if (!userId) throw new Error("ไม่สามารถสร้าง user ได้");

        // 2. สร้าง profile ทันที
        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .upsert({
                id: userId,
                role: role || "sale",
                display_name: display_name || "",
                pic_code: pic_code || "",
                pic_name: pic_name || "",
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

        if (profileError) {
            console.warn("Profile create warning:", profileError.message);
        }

        return res.status(200).json({
            success: true,
            user: { id: userId, email },
            message: `ส่ง Email เชิญไปยัง ${email} แล้ว`,
        });
    } catch (err) {
        console.error("Invite user error:", err);
        return res.status(500).json({ error: err.message });
    }
}
