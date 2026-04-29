// pages/api/auth.js
import { serialize } from "cookie";

export default function handler(req, res) {
    if (req.method === "POST") {
        const { event, session } = req.body;

        if (event === "SIGNED_IN" && session) {
            // Set cookie for 7 days
            const cookie = serialize("sb_auth_token", session.access_token, {
                path: "/",
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24 * 7, // 1 week
            });
            res.setHeader("Set-Cookie", cookie);
            res.status(200).json({ message: "Successfully set cookie!" });
            return;
        }

        if (event === "SIGNED_OUT") {
            const cookie = serialize("sb_auth_token", "", {
                path: "/",
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: -1, // Expire immediately
            });
            res.setHeader("Set-Cookie", cookie);
            res.status(200).json({ message: "Successfully removed cookie!" });
            return;
        }

        res.status(400).json({ error: "Invalid event" });
    } else {
        res.setHeader("Allow", ["POST"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
