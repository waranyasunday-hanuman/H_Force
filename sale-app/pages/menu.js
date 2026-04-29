import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import Layout from "../components/Layout";

export default function MenuPage() {
    const router = useRouter();

    const allMenus = [
        { name: "แดชบอร์ด",           path: "/dashboard",        icon: "📊", desc: "ภาพรวมยอดขาย" },
        { name: "วางแผน",              path: "/planning",         icon: "🗓️", desc: "จัดตารางเส้นทาง" },
        { name: "Sale Work",           path: "/visits",           icon: "📍", desc: "Check-in ลูกค้า" },
        { name: "สร้าง SO",            path: "/create-so",        icon: "📝", desc: "ออเดอร์ใหม่" },
        { name: "Orders",              path: "/orders",           icon: "📋", desc: "อนุมัติ & ติดตาม" },
        { name: "สร้างลูกค้า",        path: "/create-customer",  icon: "🧑‍💼", desc: "ข้อมูลลูกค้า" },
        { name: "สินค้า",             path: "/inventory",        icon: "📦", desc: "คลังสินค้า" },
        { name: "จัดการผู้ใช้",       path: "/user-management",  icon: "👥", desc: "สิทธิ์และ Role" },
    ];

    const handleLogout = async () => {
        await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "SIGNED_OUT" }),
        });
        await supabase.auth.signOut();
    };

    return (
        <Layout>
            <div className="flex flex-col h-full w-full max-w-screen-md mx-auto animate-fade-up min-h-[calc(100vh-140px)]">
            {/* Header of page */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-extrabold text-indigo-900">เมนูทั้งหมด</h2>
                    <p className="text-sm text-indigo-500 font-medium mt-1">เลือกฟังก์ชันที่ต้องการใช้งาน</p>
                </div>
            </div>

            {/* Grid of Menus */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1 pb-10 content-start">
                {allMenus.map((item) => {
                    // For the menu page, we don't highlight itself in the grid
                    const isActive = false;
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`
                                flex flex-col items-center justify-center p-5 rounded-3xl transition-all duration-200 border glass
                                ${isActive 
                                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-300/40 scale-105" 
                                    : "bg-white/70 border-white/60 text-indigo-900 hover:bg-white hover:scale-105 shadow-sm hover:shadow-md"
                                }
                            `}
                        >
                            <div className={`text-4xl mb-3 ${isActive ? "drop-shadow-md" : ""}`}>{item.icon}</div>
                            <div className="font-bold text-sm text-center">{item.name}</div>
                            <div className={`text-[10px] mt-1 text-center font-medium ${isActive ? "text-indigo-200" : "text-indigo-400"}`}>
                                {item.desc}
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Bottom Actions (Logout) */}
            <div className="mt-auto pt-6 border-t border-indigo-900/10">
                <button
                    onClick={handleLogout}
                    className="w-full py-4 rounded-2xl bg-white/80 text-red-600 font-bold flex items-center justify-center gap-2 border border-red-100 hover:bg-red-50 transition-colors shadow-sm glass"
                >
                    <span className="text-xl">🚪</span>
                    ออกจากระบบ
                </button>
            </div>
            </div>
        </Layout>
    );
}
