import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import Layout from "../components/Layout";

export default function MenuPage() {
    const router = useRouter();
    const [now, setNow] = useState(null);

    useEffect(() => {
        setNow(new Date());
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formattedDate = now ? now.toLocaleDateString('th-TH', { 
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' 
    }) : '';
    const formattedTime = now ? now.toLocaleTimeString('th-TH', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
    }) : '--:--:--';

    const menuGroups = [
        {
            category: "ฝ่ายขาย (Sales)",
            icon: "💼",
            items: [
                { name: "วางแผน",              path: "/planning",         icon: "🗓️", desc: "จัดตารางเส้นทาง" },
                { name: "Sale Work",           path: "/visits",           icon: "📍", desc: "Check-in ลูกค้า" },
                { name: "สร้าง SO",            path: "/create-so",        icon: "📝", desc: "ออเดอร์ใหม่" },
                { name: "ลงทะเบียนลูกค้า",    path: "/create-customer",  icon: "🧑‍💼", desc: "ข้อมูลลูกค้า" },
            ]
        },
        {
            category: "ฝ่ายคลังสินค้า (Warehouse)",
            icon: "📦",
            items: [
                { name: "เบิก-จ่ายสินค้า",     path: "/warehouse/issue",        icon: "📤", desc: "ขอเบิกและจ่ายสินค้า" },
                { name: "Finish Goods",     path: "/warehouse/fg",       icon: "📦", desc: "รับ-โอน-ตัดจ่าย FG" },
                { name: "Raw Material",     path: "/warehouse/rm",       icon: "🏗️", desc: "รับ-โอน-ตัดจ่าย RM" },
                { name: "Report Center",    path: "/warehouse/reports",  icon: "📊", desc: "รายงานสต๊อก" },
            ]
        },
        {
            category: "ฝ่ายบริหาร / จัดการ",
            icon: "⚙️",
            items: [
                { name: "แดชบอร์ด",           path: "/dashboard",        icon: "📊", desc: "ภาพรวมสถิติ" },
                { name: "รายการ Orders",      path: "/orders",           icon: "📋", desc: "อนุมัติ & ติดตาม" },
                { name: "จัดการผู้ใช้",       path: "/user-management",  icon: "👥", desc: "สิทธิ์และ Role" },
            ]
        }
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
            {/* Sticky Header with Live Clock */}
            <div className="sticky top-0 z-50 bg-slate-50/80 backdrop-blur-xl -mx-4 px-4 py-3 mb-6 border-b border-slate-200/50 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <img src="/Logo.jpg" alt="Logo" className="w-10 h-10 object-contain rounded-xl border border-slate-100 bg-white p-0.5 shadow-sm"/>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter leading-tight">เมนูใช้งาน</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 uppercase tracking-tight">
                                {formattedTime}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {formattedDate}
                            </span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={handleLogout}
                    className="w-10 h-10 rounded-2xl bg-white text-rose-500 flex items-center justify-center text-lg shadow-md border border-slate-100 hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                    title="ออกจากระบบ"
                >
                    🚪
                </button>
            </div>

            {/* Render Groups */}
            <div className="space-y-10 pb-12">
                {menuGroups.map((group) => (
                    <div key={group.category} className="space-y-4">
                        <div className="flex items-center gap-3 px-1 border-l-[6px] border-rose-500 pl-4 py-1">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{group.category}</h3>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                            {group.items.map((item) => (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className="relative aspect-square flex flex-col items-center justify-center p-0.5 rounded-xl bg-white border border-slate-100 transition-all duration-300 group overflow-hidden shadow-sm hover:shadow-lg hover:shadow-rose-100 hover:-translate-y-0.5"
                                >
                                    {/* Red Hover Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-red-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    
                                    <div className="relative text-4xl leading-none transform group-hover:scale-105 transition-transform duration-300 z-10 drop-shadow-sm">{item.icon}</div>
                                    <div className="relative flex flex-col items-center z-10 text-center w-full px-0.5 -mt-0.5">
                                        <span className="font-black text-slate-900 text-[12px] group-hover:text-white transition-colors tracking-tighter leading-tight line-clamp-2">{item.name}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            </div>
        </Layout>
    );
}
