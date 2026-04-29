import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../lib/supabase";

const HIDE_PATHS = ["/login", "/set-password"];

export default function Layout({ children }) {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [displayName, setDisplayName] = useState("");

    useEffect(() => {
        async function fetchUser() {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role, display_name")
                    .eq("id", session.user.id)
                    .single();
                setRole(profile?.role || "sale");
                setDisplayName(profile?.display_name || session.user.email || "");
            }
        }
        fetchUser();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === "SIGNED_OUT") {
                    setUser(null); setRole(null);
                    router.push("/login");
                }
            }
        );
        return () => authListener.subscription.unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "SIGNED_OUT" }),
        });
        await supabase.auth.signOut();
    };

    const isManager = role === "manager";

    const DOCK_ITEMS_MANAGER = [
        { name: "แดชบอร์ด", path: "/dashboard", icon: "📊" },
        { name: "Orders", path: "/orders", icon: "📋" },
        { name: "เมนู", path: "/menu", icon: "🗂️", isCenter: true },
        { name: "สร้าง SO", path: "/create-so", icon: "📝" },
        { name: "ลูกค้า", path: "/create-customer", icon: "🧑‍💼" },
    ];

    const DOCK_ITEMS_SALE = [
        { name: "แดชบอร์ด", path: "/dashboard", icon: "📊" },
        { name: "Sale Work", path: "/visits", icon: "📍" },
        { name: "เมนู", path: "/menu", icon: "🗂️", isCenter: true },
        { name: "สร้าง SO", path: "/create-so", icon: "📝" },
        { name: "สินค้า", path: "/inventory", icon: "📦" },
    ];

    if (HIDE_PATHS.some(p => router.pathname.startsWith(p))) {
        return <>{children}</>;
    }

    const ROLE_BADGE = {
        manager: { label: "Manager", color: "bg-violet-500" },
        sale:    { label: "Sale",    color: "bg-blue-500" },
    };
    const badge = ROLE_BADGE[role] || ROLE_BADGE.sale;
    const avatar = (displayName || "U")[0].toUpperCase();

    const currentDockItems = isManager ? DOCK_ITEMS_MANAGER : DOCK_ITEMS_SALE;

    return (
        <div className="min-h-screen w-full flex flex-col relative overflow-x-hidden bg-slate-50 pb-[calc(72px+env(safe-area-inset-bottom))]">
            {/* ─────────────────────────── MINIMAL HEADER ─────────────────────────── */}
            <header className="shrink-0 bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/50 shadow-sm">
                <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl glass-accent flex items-center justify-center text-white font-extrabold text-base shadow-md">
                            H
                        </div>
                        <span className="text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 tracking-tight">
                            H Force
                        </span>
                    </Link>

                    {user && (
                        <div className="flex items-center gap-2">
                            <div className="text-right leading-tight mr-1">
                                <div className="text-xs font-bold text-indigo-900">{displayName}</div>
                                <div className="text-[9px] text-indigo-400 uppercase font-semibold">{badge.label}</div>
                            </div>
                            <div className={`w-8 h-8 rounded-full ${badge.color} text-white flex items-center justify-center font-bold text-sm shadow-md`}>
                                {avatar}
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* ─────────────────────────── MAIN CONTENT ─────────────────────────── */}
            <main className="flex-1 w-full">
                <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 animate-fade-up">
                    {children}
                </div>
            </main>

            {/* ─────────────────────────── BOTTOM DOCK ─────────────────────────── */}
            {user && (
                <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.06)]">
                    <nav className="flex items-center justify-around px-2 sm:px-6 h-[72px] max-w-md mx-auto w-full relative">
                        {currentDockItems.map((item) => {
                            if (item.isCenter) {
                                const isActive = router.pathname === "/menu";
                                return (
                                    <Link
                                        key="menu"
                                        href="/menu"
                                        className={`relative -top-6 w-16 h-16 rounded-[1.25rem] bg-gradient-to-tr from-indigo-500 to-violet-600 flex flex-col items-center justify-center text-white shadow-xl shadow-indigo-300/50 transition-transform z-10 border-[3px] border-white ${isActive ? "scale-105 ring-2 ring-indigo-200 ring-offset-1" : "hover:scale-105"}`}
                                    >
                                        <span className="text-3xl leading-none" style={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.2))' }}>{item.icon}</span>
                                    </Link>
                                );
                            }

                            const isActive = router.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`
                                        flex flex-col items-center justify-center w-16 h-full transition-all duration-200
                                        ${isActive ? "text-indigo-600" : "text-slate-400 hover:text-indigo-400"}
                                    `}
                                >
                                    <div className={`flex flex-col items-center justify-center transition-transform ${isActive ? "-translate-y-1" : ""}`}>
                                        <span className={`text-[26px] mb-1 leading-none ${isActive ? "drop-shadow-md scale-110" : "opacity-80"}`}>{item.icon}</span>
                                        <span className={`text-[11px] tracking-tight whitespace-nowrap ${isActive ? "font-extrabold" : "font-semibold"}`}>{item.name}</span>
                                    </div>
                                    {isActive && <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.8)]"></div>}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            )}

            {/* Decorative blobs */}
            <div className="fixed top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-violet-300/20 blur-3xl pointer-events-none -z-10 animate-float" />
            <div className="fixed bottom-[-15%] left-[-10%]  w-[400px] h-[400px] rounded-full bg-indigo-300/20 blur-3xl pointer-events-none -z-10 animate-float" style={{ animationDelay: "1.5s" }} />
        </div>
    );
}
