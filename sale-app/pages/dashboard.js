import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import Loading from "../components/Loading";
import { supabase } from "../lib/supabase";
import dynamic from 'next/dynamic';
import DashboardCalendar from "../components/DashboardCalendar";

const DashboardMap = dynamic(() => import('../components/DashboardMap'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-100/50 backdrop-blur-md animate-pulse rounded-[2.5rem] flex items-center justify-center text-slate-400 min-h-[400px]">กำลังโหลดข้อมูลพื้นที่...</div>
});

const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userEmail, setUserEmail] = useState("");
    const [role, setRole] = useState(""); 
    const [dateType, setDateType] = useState("monthly"); 
    const [activityTab, setActivityTab] = useState("timeline"); 
    const [selectedVisit, setSelectedVisit] = useState(null);
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedUser, setSelectedUser] = useState("all");
    const [teamStock, setTeamStock] = useState([]);
    const [loadingStock, setLoadingStock] = useState(false);
    const [showStockDetail, setShowStockDetail] = useState(null);

    useEffect(() => {
        const fetchUserAndRole = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserEmail(session.user.email);
                const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
                const r = profile?.role || "sale";
                setRole(r);
                if (r === "sale") setSelectedUser(session.user.email);
            } else {
                window.location.href = "/login";
            }
        };
        fetchUserAndRole();
    }, []);

    const fetchTeamStock = async () => {
        if (role === 'sale') return;
        setLoadingStock(true);
        try {
            const res = await fetch('/api/team-stock');
            const json = await res.json();
            if (res.ok) setTeamStock(json.teamStock || []);
        } catch (err) {
            console.error("Fetch team stock error:", err);
        }
        setLoadingStock(false);
    };

    useEffect(() => {
        if (role === 'manager' || role === 'admin') {
            fetchTeamStock();
        }
    }, [role]);

    useEffect(() => {
        if (!userEmail || !role) return;
        async function fetchDashboard() {
            setLoading(true);
            try {
                const filterEmail = role === 'sale' ? userEmail : selectedUser;
                let url = `/api/dashboard-data?dateType=${dateType}`;
                if (filterEmail) url += `&user=${encodeURIComponent(filterEmail)}`;
                if (dateType === 'custom') url += `&startDate=${startDate}&endDate=${endDate}`;
                const res = await fetch(url);
                const json = await res.json();
                if (res.ok) setData(json);
            } catch (err) {
                console.error("Dashboard error:", err);
            }
            setLoading(false);
        }
        fetchDashboard();
    }, [dateType, startDate, endDate, userEmail, role, selectedUser]);

    const formatCurrency = (val) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val || 0);

    if (loading || !data) return <Layout><div className="min-h-screen flex items-center justify-center bg-[#F2F5FF]"><Loading /></div></Layout>;

    const totalPurposes = data.purposes.pitch + data.purposes.inspection + data.purposes.collection + data.purposes.other;

    return (
        <Layout>
            <div className="min-h-screen bg-[#F8FAFF] pb-20 px-4 md:px-8">
                {/* Header Section - Glassmorphism */}
                <div className="max-w-7xl mx-auto pt-8 mb-12">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="animate-slide-up">
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                                {role === 'sale' ? 'Personal' : 'Team'} <span className="text-blue-600">Insights</span>
                            </h1>
                            <p className="text-slate-400 font-medium text-lg mt-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                วิเคราะห์ประสิทธิภาพและเป้าหมายเชิงลึก
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 bg-white/50 backdrop-blur-xl p-3 rounded-[2rem] border border-white shadow-xl shadow-blue-100/50">
                            {(role === 'manager' || role === 'admin') && (
                                <select 
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    className="bg-white border-none text-slate-700 px-6 py-3 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-blue-100 outline-none shadow-sm min-w-[200px]"
                                >
                                    <option value="all">👥 สมาชิกทั้งหมด ({data.allStaff?.length || 0})</option>
                                    {data.allStaff?.map(p => (
                                        <option key={p.email} value={p.email}>👤 {p.full_name || p.email.split('@')[0]}</option>
                                    ))}
                                </select>
                            )}

                            <div className="flex bg-slate-100/80 p-1 rounded-2xl">
                                {['daily', 'monthly', 'custom'].map((type) => (
                                    <button 
                                        key={type}
                                        onClick={() => setDateType(type)} 
                                        className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all ${dateType === type ? "bg-white text-blue-600 shadow-md scale-105" : "text-slate-400 hover:text-slate-600"}`}
                                    >
                                        {type === 'daily' ? 'รายวัน' : type === 'monthly' ? 'รายเดือน' : 'กำหนดเอง'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto space-y-10">
                    
                    {/* KPI 3D Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {/* Main Sales Card - Ultra 3D */}
                        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-[2.5rem] p-8 shadow-2xl shadow-blue-300 relative overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                            <div className="relative z-10">
                                <p className="text-blue-100 font-bold text-sm uppercase tracking-widest mb-2 opacity-80">ยอดขายรวม</p>
                                <h3 className="text-4xl font-black text-white mb-4">{formatCurrency(data.totalAmount)}</h3>
                                <div className="flex items-center gap-2 text-xs font-bold bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full text-white w-fit">
                                    <span>↑ 12% vs last month</span>
                                </div>
                            </div>
                            <div className="absolute right-6 bottom-6 text-6xl opacity-20 group-hover:scale-125 transition-transform duration-700">💰</div>
                        </div>

                        {/* Visit Card */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200 border border-white relative overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                            <div className="relative z-10">
                                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-2">Check-in</p>
                                <h3 className="text-4xl font-black text-slate-900 mb-4">{data.checkInCount} <span className="text-lg text-slate-400">ครั้ง</span></h3>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[75%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                </div>
                            </div>
                            <div className="absolute right-6 bottom-6 text-6xl opacity-10 group-hover:scale-125 transition-transform duration-700">📍</div>
                        </div>

                        {/* Order Card */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200 border border-white relative overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                            <div className="relative z-10">
                                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-2">ใบสั่งขาย (SO)</p>
                                <h3 className="text-4xl font-black text-slate-900 mb-4">{data.soCount} <span className="text-lg text-slate-400">ใบ</span></h3>
                                <p className="text-xs font-bold text-indigo-500 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                    เฉลี่ย {formatCurrency(data.totalAmount / (data.soCount || 1))} / ใบ
                                </p>
                            </div>
                            <div className="absolute right-6 bottom-6 text-6xl opacity-10 group-hover:scale-125 transition-transform duration-700">📄</div>
                        </div>

                        {/* Customer Card */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200 border border-white relative overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                            <div className="relative z-10">
                                <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mb-2">ลูกค้าใหม่</p>
                                <h3 className="text-4xl font-black text-slate-900 mb-4">{data.visitNew} <span className="text-lg text-slate-400">ราย</span></h3>
                                <div className="flex -space-x-3">
                                    {[1,2,3,4].map(i => (
                                        <div key={i} className={`w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400`}>{i}</div>
                                    ))}
                                    <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">+</div>
                                </div>
                            </div>
                            <div className="absolute right-6 bottom-6 text-6xl opacity-10 group-hover:scale-125 transition-transform duration-700">👤</div>
                        </div>
                    </div>

                    {/* Team Stock in Hand - NEW FUNCTION */}
                    {(role === 'manager' || role === 'admin') && (
                        <div className="bg-white rounded-[3rem] p-8 shadow-xl shadow-blue-100 border border-white">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-500 flex items-center justify-center">📦</span>
                                    สต็อกคงค้างรายบุคคล (Team Stock)
                                </h3>
                                <button 
                                    onClick={fetchTeamStock}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${loadingStock ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                >
                                    {loadingStock ? '🔄 กำลังอัปเดต...' : '🔄 รีเฟรชสต็อก'}
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {teamStock.map((s, i) => (
                                    <div key={i} className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-xl transition-all duration-300 group">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black">
                                                {s.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 text-sm truncate w-24">{s.name}</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.warehouseCode}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mb-4">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">จำนวนรวม</span>
                                                <span className="font-black text-slate-900">{s.totalQty.toLocaleString()} Unit</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-500">รายการสินค้า</span>
                                                <span className="font-black text-slate-900">{s.totalItems} SKU</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setShowStockDetail(s)}
                                            className="w-full py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600 group-hover:border-blue-200 transition-all"
                                        >
                                            View SKUs
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Debt Aging Section */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="col-span-full mb-2">
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center text-sm">⚠️</span>
                                วิเคราะห์หนี้คงค้าง (Debt Aging)
                            </h3>
                        </div>
                        {[
                            { range: '0 - 30 วัน', color: 'blue', amt: 1250000 },
                            { range: '31 - 60 วัน', color: 'amber', amt: 450000 },
                            { range: '61 - 90 วัน', color: 'orange', amt: 180000 },
                            { range: '91 วันขึ้นไป', color: 'rose', amt: 85000 }
                        ].map((d, i) => (
                            <div key={i} className={`bg-white p-6 rounded-[2rem] shadow-lg shadow-slate-200 border-l-8 border-${d.color}-500 group hover:scale-105 transition-transform duration-300`}>
                                <p className={`text-[10px] font-black text-${d.color}-500 uppercase tracking-widest mb-1`}>{d.range}</p>
                                <h4 className="text-2xl font-black text-slate-800">{formatCurrency(d.amt)}</h4>
                                <div className="mt-3 flex justify-between items-center text-[10px] font-bold text-slate-400">
                                    <span>24 รายการ</span>
                                    <span className={`text-${d.color}-600`}>รอเก็บหนี้</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* SKU Analysis & Radar Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* SKU Sales Table */}
                        <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl rounded-[3rem] p-8 shadow-2xl shadow-blue-100 border border-white">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black text-slate-900">ยอดขายราย <span className="text-blue-600">SKU</span></h3>
                                <button className="text-sm font-bold text-blue-600 hover:underline">ดูทั้งหมด</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-slate-400 text-xs font-black uppercase tracking-widest border-b border-slate-100">
                                            <th className="pb-4">สินค้า</th>
                                            <th className="pb-4">จำนวน (Unit)</th>
                                            <th className="pb-4 text-right">มูลค่ารวม (THB)</th>
                                            <th className="pb-4 text-center">สัดส่วน</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {data.bestSellingProducts?.map((sku, i) => (
                                            <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform">📦</div>
                                                        <span className="font-bold text-slate-800 text-sm line-clamp-1">{sku.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-5 font-black text-slate-600">{sku.qty.toLocaleString()}</td>
                                                <td className="py-5 text-right font-black text-slate-900">{formatCurrency(sku.amount)}</td>
                                                <td className="py-5">
                                                    <div className="flex items-center justify-center">
                                                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (sku.amount / data.totalAmount) * 200)}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Purpose Breakdown - IOS 26 Style */}
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[3rem] p-8 shadow-2xl text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full"></div>
                            <h3 className="text-2xl font-black mb-8">Visit <span className="text-blue-400">Activity</span></h3>
                            
                            <div className="flex flex-col items-center justify-center py-6">
                                <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-700" />
                                        <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" 
                                            strokeDasharray={2 * Math.PI * 80}
                                            strokeDashoffset={2 * Math.PI * 80 * (1 - (data.purposes.pitch / (totalPurposes || 1)))}
                                            className="text-emerald-400 transition-all duration-1000 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-4xl font-black">{totalPurposes}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Visits</span>
                                    </div>
                                </div>
                                
                                <div className="w-full space-y-4">
                                    {[
                                        { label: 'เสนอขาย', val: data.purposes.pitch, color: 'emerald' },
                                        { label: 'ตรวจร้าน', val: data.purposes.inspection, color: 'purple' },
                                        { label: 'เก็บหนี้', val: data.purposes.collection, color: 'rose' }
                                    ].map((p, i) => (
                                        <div key={i} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-2 h-2 rounded-full bg-${p.color}-400 shadow-[0_0_8px_rgba(0,0,0,0.5)]`}></span>
                                                <span className="text-sm font-bold text-slate-300">{p.label}</span>
                                            </div>
                                            <span className="font-black text-white">{p.val} <span className="text-[10px] text-slate-500">ครั้ง</span></span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Team Radar Map - Premium */}
                    <div className="bg-white rounded-[3.5rem] p-4 shadow-2xl shadow-blue-100 border border-white relative z-0">
                        <div className="absolute top-8 left-8 z-10 flex items-center gap-3 bg-white/80 backdrop-blur-md px-6 py-3 rounded-2xl shadow-lg border border-white/50">
                            <span className="text-2xl animate-pulse">📡</span>
                            <div>
                                <h4 className="text-lg font-black text-slate-900 leading-tight">Live Coverage</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">อัปเดตเรียลไทม์ล่าสุด</p>
                            </div>
                        </div>
                        <div className="h-[500px] w-full rounded-[2.5rem] overflow-hidden shadow-inner border border-slate-100">
                            <DashboardMap visits={data.recentVisits || []} />
                        </div>
                    </div>

                    {/* Activity Feed & Timeline */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                        <div className="lg:col-span-3 bg-white rounded-[3rem] p-10 shadow-2xl shadow-blue-100 border border-white min-h-[600px]">
                            <div className="flex items-center gap-8 mb-10 border-b border-slate-50">
                                <button 
                                    onClick={() => setActivityTab('timeline')}
                                    className={`pb-4 text-xl font-black transition-all relative ${activityTab === 'timeline' ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'}`}
                                >
                                    Activity Feed
                                    {activityTab === 'timeline' && <span className="absolute bottom-0 left-0 w-1/2 h-1 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"></span>}
                                </button>
                                <button 
                                    onClick={() => setActivityTab('calendar')}
                                    className={`pb-4 text-xl font-black transition-all relative ${activityTab === 'calendar' ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'}`}
                                >
                                    Calendar
                                    {activityTab === 'calendar' && <span className="absolute bottom-0 left-0 w-1/2 h-1 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"></span>}
                                </button>
                            </div>

                            {activityTab === 'timeline' ? (
                                <div className="space-y-8 animate-fade-in">
                                    {data.recentVisits?.map((visit, idx) => (
                                        <div key={idx} onClick={() => setSelectedVisit(visit)} className="flex gap-6 group cursor-pointer">
                                            <div className="flex flex-col items-center">
                                                <div className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-500 group-hover:rotate-6">
                                                    {visit.purpose === 'sales' ? '💰' : visit.purpose === 'inspection' ? '📋' : '📍'}
                                                </div>
                                                <div className="w-0.5 h-full bg-slate-100 my-2"></div>
                                            </div>
                                            <div className="flex-1 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 group-hover:bg-white group-hover:shadow-xl transition-all duration-500">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <h4 className="font-black text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{visit.customer_name}</h4>
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{visit.sales_person}</p>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-300">{new Date(visit.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                                                </div>
                                                <p className="text-sm text-slate-600 line-clamp-2 mt-2 font-medium">{visit.notes || 'เยี่ยมเยียนและพูดคุยกับลูกค้าทั่วไป'}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <DashboardCalendar visits={data.allVisits || []} filters={data.filters} onVisitClick={setSelectedVisit} />
                            )}
                        </div>

                        {/* Team Leaderboard - IOS Style */}
                        <div className="lg:col-span-2 space-y-10">
                            <div className="bg-white rounded-[3rem] p-8 shadow-2xl shadow-blue-100 border border-white">
                                <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-500 flex items-center justify-center">🏆</span>
                                    Leaderboard
                                </h3>
                                <div className="space-y-6">
                                    {data.salesByPerson?.map((person, idx) => (
                                        <div key={idx} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${idx === 0 ? 'from-amber-400 to-amber-600 shadow-amber-200' : idx === 1 ? 'from-slate-300 to-slate-400 shadow-slate-200' : 'from-indigo-100 to-indigo-200 shadow-indigo-100'} shadow-lg flex items-center justify-center text-white font-black text-xl group-hover:rotate-6 transition-transform`}>
                                                        {person.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-white rounded-xl shadow-md flex items-center justify-center text-xs font-black text-slate-800">
                                                        #{idx + 1}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-800">{person.name.split('@')[0]}</h4>
                                                    <p className="text-xs font-bold text-slate-400 uppercase">{person.count} ออเดอร์</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-black text-slate-900">{formatCurrency(person.amount)}</p>
                                                <div className="h-1 w-20 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                    <div className="h-full bg-blue-500" style={{ width: `${(person.amount / data.totalAmount) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Additional Info Cards */}
                            <div className="bg-blue-600 rounded-[3rem] p-8 shadow-2xl shadow-blue-300 text-white relative overflow-hidden group">
                                <div className="absolute -right-4 -bottom-4 text-9xl opacity-10 group-hover:scale-110 transition-transform">📊</div>
                                <h3 className="text-xl font-black mb-4">ประสิทธิภาพโดยรวม</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                        <p className="text-[10px] font-bold text-blue-200 uppercase mb-1">ระยะทางรวม</p>
                                        <p className="text-2xl font-black">{data.totalDistance?.toFixed(0)} <span className="text-xs opacity-60">km</span></p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                                        <p className="text-[10px] font-bold text-blue-200 uppercase mb-1">ความเสี่ยง</p>
                                        <p className="text-2xl font-black text-rose-300">{data.fraudCount} <span className="text-xs opacity-60">จุด</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Details Modal */}
            {selectedVisit && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-fade-in" onClick={() => setSelectedVisit(null)}>
                    <div className="bg-white rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.3)] max-w-lg w-full overflow-hidden animate-zoom-in" onClick={(e) => e.stopPropagation()}>
                        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
                            <div className="absolute -bottom-8 left-10 w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center text-4xl border-4 border-white">
                                {selectedVisit.purpose === 'sales' ? '💰' : '📍'}
                            </div>
                            <button onClick={() => setSelectedVisit(null)} className="absolute top-6 right-6 w-10 h-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-2xl flex items-center justify-center text-white transition-all">✕</button>
                        </div>
                        <div className="px-10 pt-12 pb-10 space-y-6">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 leading-tight">{selectedVisit.customer_name}</h2>
                                <p className="text-blue-600 font-black uppercase tracking-widest text-xs mt-1">Visit ID: #{selectedVisit.id.toString().slice(-6)}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">เจ้าหน้าที่</p>
                                    <p className="font-bold text-slate-800">{selectedVisit.sales_person}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">เวลาบันทึก</p>
                                    <p className="font-bold text-slate-800">{new Date(selectedVisit.created_at).toLocaleTimeString('th-TH')}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">บันทึกหน้างาน</p>
                                <div className="bg-slate-50 p-6 rounded-[2rem] text-slate-700 font-medium leading-relaxed italic border border-slate-100 shadow-inner min-h-[100px]">
                                    "{selectedVisit.notes || 'เยี่ยมเยียนและอัปเดตสถานะทั่วไป ไม่มีความเห็นเพิ่มเติมจากพนักงาน'}"
                                </div>
                            </div>

                            <div className="pt-4">
                                <a 
                                    href={`https://maps.google.com/?q=${selectedVisit.latitude},${selectedVisit.longitude}`}
                                    target="_blank" rel="noreferrer"
                                    className="w-full h-16 bg-slate-900 hover:bg-black text-white rounded-[2rem] font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-200 active:scale-95"
                                >
                                    <span>🌐</span>
                                    เปิดตำแหน่งบนแผนที่
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Stock Detail Modal - NEW */}
            {showStockDetail && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-xl p-4 animate-fade-in" onClick={() => setShowStockDetail(null)}>
                    <div className="bg-white rounded-[3.5rem] shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-zoom-in" onClick={(e) => e.stopPropagation()}>
                        <div className="p-8 bg-gradient-to-r from-blue-600 to-indigo-700 text-white shrink-0">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-3xl font-black mb-1">{showStockDetail.name}</h3>
                                    <p className="text-blue-100 font-bold uppercase tracking-widest text-xs">Warehouse: {showStockDetail.warehouseCode}</p>
                                </div>
                                <button onClick={() => setShowStockDetail(null)} className="w-12 h-12 bg-white/20 hover:bg-white/40 rounded-2xl flex items-center justify-center transition-all">✕</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100">
                                    <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Total Stock Quantity</p>
                                    <p className="text-3xl font-black text-blue-700">{showStockDetail.totalQty.toLocaleString()}</p>
                                </div>
                                <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Active SKUs</p>
                                    <p className="text-3xl font-black text-indigo-700">{showStockDetail.totalItems}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">SKU Breakdown</h4>
                                {showStockDetail.items?.map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-sm">📦</div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{item.PROD_DES}</p>
                                                <p className="text-[10px] text-slate-400 font-mono">{item.PROD_CD}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="px-3 py-1 bg-white rounded-full text-blue-600 font-black text-sm border border-blue-50 shadow-sm">
                                                {parseFloat(item.QTY).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50 border-t border-slate-100 text-center shrink-0">
                            <button onClick={() => setShowStockDetail(null)} className="px-8 py-3 bg-white border border-slate-200 rounded-2xl font-black text-sm text-slate-500 hover:text-slate-700 transition-all">Close Details</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes slide-up {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes zoom-in {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-slide-up { animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-zoom-in { animation: zoom-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
            `}</style>
        </Layout>
    );
}
