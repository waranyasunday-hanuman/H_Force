// pages/api/test-ecount.js
// ทดสอบการเชื่อมต่อ Ecount
// เปิด http://localhost:3000/api/test-ecount

import { getSessionKey } from "../../lib/ecount";

export default async function handler(req, res) {
    try {
        const sessionKey = await getSessionKey();
        res.status(200).json({
            success: true,
            message: "เชื่อมต่อ Ecount สำเร็จ!",
            sessionKey: sessionKey,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}