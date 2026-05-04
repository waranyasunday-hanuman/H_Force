// pages/api/users/create.js
// Admin API: Create user ใหม่เข้าระบบโดยตรง (ไม่ต้องรอ Email Invitation)

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

    const { email, password, role, display_name, pic_code, pic_name, warehouse_code } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "กรุณาระบุ Email และ Password" });
    }

    try {
        // 1. สร้าง user ใน Supabase Auth โดยใช้ admin.createUser
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // คอนเฟิร์มเมลให้เลย
            user_metadata: { display_name },
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
                warehouse_code: warehouse_code || "",
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

        if (profileError) {
            console.error("Profile creation error:", profileError.message);
            // พยายามสร้าง profile ต่อไป (User ถูกสร้างแล้วใน Auth)
        }

        return res.status(200).json({
            success: true,
            user: { id: userId, email },
            message: `สร้างผู้ใช้ ${email} สำเร็จแล้ว`,
        });
    } catch (err) {
        console.error("Create user error:", err);
        return res.status(500).json({ error: err.message });
    }
}
