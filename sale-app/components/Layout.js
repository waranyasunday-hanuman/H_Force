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
        { name: "เมนู", path: "/menu", icon: "🗂️" },
        { name: "สร้าง SO", path: "/create-so", icon: "📝" },
        { name: "ลูกค้า", path: "/create-customer", icon: "🧑‍💼" },
    ];

    const DOCK_ITEMS_SALE = [
        { name: "แดชบอร์ด", path: "/dashboard", icon: "📊" },
        { name: "Sale Work", path: "/visits", icon: "📍" },
        { name: "เมนู", path: "/menu", icon: "🗂️" },
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
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-gray-50/50">
            {/* ─────────────────────────── MINIMAL HEADER ─────────────────────────── */}
            <header className="glass-heavy sticky top-0 z-40 border-b border-white/60">
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
            <main className="flex-1 w-full overflow-x-hidden pb-28">
                <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-4 animate-fade-up">
                    {children}
                </div>
            </main>

            {/* ─────────────────────────── BOTTOM DOCK ─────────────────────────── */}
            {user && (
                <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
                    <nav className="dock-glass rounded-[2rem] px-2 py-2 flex items-center gap-1 sm:gap-2 pointer-events-auto max-w-md w-full justify-between">
                        {currentDockItems.map((item) => {
                            if (item.isCenter) {
                                const isActive = router.pathname === "/menu";
                                return (
                                    <Link
                                        key="menu"
                                        href="/menu"
                                        className={`relative -top-4 w-14 h-14 rounded-full glass-accent flex flex-col items-center justify-center text-white shadow-xl transition-transform border-4 border-white/40 z-10 ${isActive ? "scale-110 shadow-indigo-400/50" : "hover:scale-105"}`}
                                    >
                                        <span className="text-2xl leading-none">{item.icon}</span>
                                    </Link>
                                );
                            }

                            const isActive = router.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`
                                        flex flex-col items-center justify-center w-[4.5rem] h-12 rounded-2xl transition-all duration-200
                                        ${isActive ? "dock-item-active scale-105" : "text-slate-500 hover:text-rose-500 hover:bg-rose-50/50"}
                                    `}
                                >
                                    <span className="text-xl mb-0.5 leading-none">{item.icon}</span>
                                    <span className="text-[10px] font-bold tracking-tight whitespace-nowrap">{item.name}</span>
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
