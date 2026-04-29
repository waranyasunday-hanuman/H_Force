// pages/set-password.js
// หน้านี้รองรับ 2 กรณี:
// 1. type=invite  — พนักงานใหม่ที่ได้รับ Invitation Email
// 2. type=recovery — พนักงานที่ขอ Reset Password

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

export default function SetPasswordPage() {
    const router = useRouter();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const [type, setType] = useState("invite"); // invite | recovery

    // Supabase ส่ง access_token มาใน URL hash (#access_token=xxx&type=invite)
    // ต้อง handle onAuthStateChange เพื่อรับ session จาก link
    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if ((event === "USER_UPDATED" || event === "SIGNED_IN") && session) {
                setSessionReady(true);
                setUserEmail(session.user.email || "");
            }
        });

        // ตรวจสอบ URL hash แบบ manual (กรณี Next.js ไม่ trigger event)
        const hash = window.location.hash;
        if (hash.includes("type=invite")) setType("invite");
        else if (hash.includes("type=recovery")) setType("recovery");

        // พยายาม get session ที่มีอยู่แล้ว
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setSessionReady(true);
                setUserEmail(session.user.email || "");
            }
        });

        return () => authListener.subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) {
            setError("Password ต้องมีอย่างน้อย 6 ตัวอักษร");
            return;
        }
        if (password !== confirm) {
            setError("Password ไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง");
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;

            setSuccess(true);
            // รอ 2 วิ แล้ว redirect ไปหน้า login
            setTimeout(() => router.push("/login"), 2500);
        } catch (err) {
            setError(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่");
        } finally {
            setLoading(false);
        }
    };

    // ยังไม่มี session = link อาจหมดอายุหรือคลิกซ้ำ
    const isExpired = !sessionReady;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4 relative overflow-hidden">

            {/* Background blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-25"></div>
            <div className="absolute bottom-[-15%] right-[-5%] w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-25"></div>

            <div className="w-full max-w-md relative z-10">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden">

                    {/* Top Banner */}
                    <div className={`px-8 py-6 text-center ${type === "invite" ? "bg-gradient-to-r from-indigo-600 to-purple-600" : "bg-gradient-to-r from-blue-600 to-cyan-600"}`}>
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
                            <span className="text-3xl">{type === "invite" ? "👋" : "🔐"}</span>
                        </div>
                        <h1 className="text-2xl font-extrabold text-white">
                            {type === "invite" ? "ยินดีต้อนรับ!" : "ตั้ง Password ใหม่"}
                        </h1>
                        <p className="text-white/70 text-sm mt-1">
                            {type === "invite"
                                ? "กรุณาตั้ง Password เพื่อเริ่มใช้งานระบบ"
                                : "กรุณากรอก Password ใหม่ของคุณ"}
                        </p>
                        {userEmail && (
                            <div className="mt-3 px-4 py-2 bg-white/20 rounded-xl inline-block">
                                <span className="text-white text-sm font-semibold">📧 {userEmail}</span>
                            </div>
                        )}
                    </div>

                    <div className="p-8">
                        {/* สำเร็จ */}
                        {success ? (
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                                    <span className="text-4xl">✅</span>
                                </div>
                                <h2 className="text-xl font-bold text-gray-800">ตั้ง Password สำเร็จ!</h2>
                                <p className="text-gray-500 text-sm">กำลังพาไปหน้า Login...</p>
                                <div className="flex justify-center">
                                    <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            </div>
                        ) : isExpired && !sessionReady ? (
                            /* Link หมดอายุ */
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                                    <span className="text-4xl">⏳</span>
                                </div>
                                <h2 className="text-xl font-bold text-gray-800">กำลังตรวจสอบ Link...</h2>
                                <p className="text-gray-500 text-sm">
                                    หาก Link หมดอายุ กรุณาติดต่อ Manager เพื่อส่ง Invitation ใหม่
                                </p>
                                <button
                                    onClick={() => router.push("/login")}
                                    className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-all"
                                >
                                    ← กลับหน้า Login
                                </button>
                            </div>
                        ) : (
                            /* Form ตั้ง Password */
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Password ใหม่
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="อย่างน้อย 6 ตัวอักษร"
                                        required
                                        minLength={6}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        ยืนยัน Password
                                    </label>
                                    <input
                                        type="password"
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        placeholder="พิมพ์ Password อีกครั้ง"
                                        required
                                        className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm ${
                                            confirm && confirm !== password
                                                ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                                                : confirm && confirm === password
                                                ? "border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                                : "border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                        }`}
                                    />
                                    {confirm && confirm !== password && (
                                        <p className="text-xs text-red-500 mt-1 font-medium">⚠️ Password ไม่ตรงกัน</p>
                                    )}
                                    {confirm && confirm === password && (
                                        <p className="text-xs text-emerald-500 mt-1 font-medium">✅ Password ตรงกัน</p>
                                    )}
                                </div>

                                {/* Password strength hint */}
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                                    <p className="text-xs text-indigo-700 font-semibold mb-1">💡 คำแนะนำ Password:</p>
                                    <ul className="text-xs text-indigo-600 space-y-0.5">
                                        <li className={password.length >= 6 ? "text-emerald-600" : ""}>
                                            {password.length >= 6 ? "✅" : "○"} อย่างน้อย 6 ตัวอักษร
                                        </li>
                                        <li className={/[A-Z]/.test(password) ? "text-emerald-600" : ""}>
                                            {/[A-Z]/.test(password) ? "✅" : "○"} มีตัวพิมพ์ใหญ่ (A-Z)
                                        </li>
                                        <li className={/[0-9]/.test(password) ? "text-emerald-600" : ""}>
                                            {/[0-9]/.test(password) ? "✅" : "○"} มีตัวเลข (0-9)
                                        </li>
                                    </ul>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                                        ⚠️ {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || (confirm && confirm !== password)}
                                    className="w-full py-3.5 rounded-xl text-white font-bold text-lg transition-all shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            กำลังบันทึก...
                                        </>
                                    ) : "🔐 ยืนยัน Password"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <p className="text-center text-xs text-gray-400 mt-4">
                    หากมีปัญหา กรุณาติดต่อ Manager ของคุณ
                </p>
            </div>
        </div>
    );
}
