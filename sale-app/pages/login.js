// pages/login.js
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/router";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin(e) {
        e.preventDefault();
        setLoading(true);
        setError("");

        // 1. Authenticate with Supabase
        const { data, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError || !data.session) {
            setError("อีเมลหรือรหัสผ่านไม่ถูกต้องครับ");
            setLoading(false);
            return;
        }

        // 2. Set HttpOnly Cookie via our proxy for edge middleware
        try {
            await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event: "SIGNED_IN",
                    session: data.session,
                }),
            });
        } catch (err) {
            console.error("Failed to set auth cookie", err);
        }

        // 3. Fetch User Role
        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();

        const userRole = profile?.role || "sale";

        // 4. Redirect to Menu
        router.push("/menu");
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4 relative overflow-hidden">
            
            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute top-[20%] right-[-10%] w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-[-20%] left-[20%] w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

            {/* Login Card */}
            <div className="w-full max-w-md relative z-10">
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
                    
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center mb-4">
                            <img src="/logo.jpg" alt="Hanuman Logo" className="w-32 h-32 object-contain rounded-full shadow-2xl" />
                        </div>
                        <h1 className="text-4xl font-black text-indigo-800 tracking-tighter">H Force</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">ยินดีต้อนรับเข้าสู่ระบบจัดการรายการขาย</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white/50 backdrop-blur-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white/50 backdrop-blur-sm"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-center space-x-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3.5 rounded-xl text-white font-semibold text-lg transition-all shadow-lg transform active:scale-95 ${
                                loading 
                                ? "bg-blue-400 cursor-not-allowed shadow-none" 
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-blue-500/30"
                            }`}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>กำลังเข้าสู่ระบบ...</span>
                                </div>
                            ) : "เข้าสู่ระบบ"}
                        </button>

                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">หรือติดตั้งแอป</span></div>
                        </div>

                        <a
                            href="/h-force.apk"
                            className="w-full py-3 rounded-xl bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-100 transition-all shadow-sm"
                        >
                            <span>🤖</span>
                            ดาวน์โหลดแอป Android (APK)
                        </a>
                    </form>
                </div>
                
                {/* Footer link */}
                <p className="text-center text-sm text-gray-500 mt-6 font-medium">
                    &copy; {new Date().getFullYear()} H Force. All rights reserved.
                </p>
            </div>
            
        </div>
    );
}