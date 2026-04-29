import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import Loading from "../components/Loading";
import { supabase } from "../lib/supabase";
import dynamic from 'next/dynamic';
import DashboardCalendar from "../components/DashboardCalendar";

const DashboardMap = dynamic(() => import('../components/DashboardMap'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-100 animate-pulse rounded-2xl flex items-center justify-center text-gray-400 min-h-[300px]">กำลังโหลดแผนที่...</div>
});

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // User & Role State
    const [userEmail, setUserEmail] = useState("");
    const [role, setRole] = useState(""); // 'sale', 'manager', 'admin'
    
    const [dateType, setDateType] = useState("monthly"); // 'daily', 'monthly', 'custom'
    const [activityTab, setActivityTab] = useState("calendar"); // 'timeline', 'calendar'
    
    // Modal State
    const [selectedVisit, setSelectedVisit] = useState(null);
    
    const getFirstOfThisMonth = () => {
        const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
    };
    const getToday = () => new Date().toISOString().split('T')[0];
    
    const [startDate, setStartDate] = useState(getFirstOfThisMonth());
    const [endDate, setEndDate] = useState(getToday());
    
    // Filter chosen by Manager
    const [selectedUser, setSelectedUser] = useState("all");

    useEffect(() => {
        const fetchUserAndRole = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserEmail(session.user.email);
                
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", session.user.id)
                    .single();
                    
                const r = profile?.role || "sale";
                setRole(r);

                // If sale, force selectedUser to their own email
                if (r === "sale") {
                    setSelectedUser(session.user.email);
                }
            } else {
                // If no session, redirect to login
                window.location.href = "/login";
            }
        };
        fetchUserAndRole();
    }, []);

    useEffect(() => {
        if (!userEmail || !role) return; // Wait until auth is resolved

        async function fetchDashboard() {
            setLoading(true);
            try {
                // If it's a sale, force filter string to their email. Else, use selectedUser (which could be 'all')
                const filterEmail = role === 'sale' ? userEmail : selectedUser;
                
                let url = `/api/dashboard-data?dateType=${dateType}`;
                if (filterEmail) url += `&user=${encodeURIComponent(filterEmail)}`;
                if (dateType === 'custom') url += `&startDate=${startDate}&endDate=${endDate}`;
                
                const res = await fetch(url);
                const json = await res.json();
                
                if (res.ok) {
                    setData(json);
                } else {
                    console.error("Dashboard error:", json.error);
                }
            } catch (err) {
                console.error("Failed to fetch dashboard data");
            }
            setLoading(false);
        }

        fetchDashboard();
    }, [dateType, startDate, endDate, userEmail, role, selectedUser]);

    const formatCurrency = (val) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val || 0);

    const getPurposeIconInfo = (type) => {
        if (type === 'pitch') return { icon: '🗣️', color: 'bg-green-100 text-green-700', label: 'เสนอขาย' };
        if (type === 'inspection') return { icon: '📋', color: 'bg-purple-100 text-purple-700', label: 'ตรวจร้าน' };
        if (type === 'collection') return { icon: '💰', color: 'bg-red-100 text-red-700', label: 'เก็บหนี้' };
        return { icon: '📍', color: 'bg-gray-100 text-gray-700', label: 'ทั่วไป' };
    };

    // Calculate Purpose Percentages
    const totalPurposes = data ? (data.purposes.pitch + data.purposes.inspection + data.purposes.collection + data.purposes.other) : 0;

    return (
        <Layout>
            <div className="flex flex-col xl:flex-row xl:items-start justify-between mb-8 pb-4 border-b border-gray-200 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center">
                        {role === 'sale' ? 'เป้าหมายของฉัน 🎯' : 'ภาพรวมผลงาน (Manager) 🚀'}
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">
                        {role === 'sale' ? `รหัสพนักงาน: ${userEmail}` : 'ศูนย์ควบคุมและสรุปผลประสิทธิภาพทีม'}
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                    {/* Manager User Filter */}
                    {(role === 'manager' || role === 'admin') && (
                        <select 
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                        >
                            <option value="all">👥 ดูยอดรวมทั้งทีม (All)</option>
                            {/* In a real app, you'd populate this with all team members. Here we just use the unique ones from salesByPerson as a quick hack context */}
                            {data?.salesByPerson?.map(p => (
                                <option key={p.name} value={p.name}>👤 {p.name}</option>
                            ))}
                        </select>
                    )}

                    {/* Quick Filters */}
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex items-center">
                        <button 
                            onClick={() => setDateType("daily")} 
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${dateType === "daily" ? "bg-blue-100 text-blue-700 shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}
                        >
                            ประจำวัน
                        </button>
                        <button 
                            onClick={() => setDateType("monthly")} 
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${dateType === "monthly" ? "bg-indigo-100 text-indigo-700 shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}
                        >
                            ประจำเดือน
                        </button>
                        <button 
                            onClick={() => setDateType("custom")} 
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${dateType === "custom" ? "bg-purple-100 text-purple-700 shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}
                        >
                            กำหนดเอง
                        </button>
                    </div>

                    {/* Custom Date Pickers */}
                    {dateType === 'custom' && (
                        <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-200 flex items-center space-x-2 animate-fade-in">
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-1.5 rounded-lg text-sm border-none bg-gray-50"
                            />
                            <span className="text-gray-400 text-sm">-</span>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-1.5 rounded-lg text-sm border-none bg-gray-50"
                            />
                        </div>
                    )}
                </div>
            </div>

            {loading || !data ? (
                <div className="min-h-[400px] flex items-center justify-center">
                    <Loading />
                </div>
            ) : (
                <div className="space-y-6 animate-fade-in">

                    {/* KPI Cards (Same layout for Sale & Manager, but different contextual meaning) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Card 1: Total Sales */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-md text-white relative overflow-hidden group">
                            <div className="absolute -right-4 -bottom-4 opacity-20 text-8xl">💰</div>
                            <div className="relative z-10">
                                <p className="text-sm font-medium text-blue-100 mb-1">ยอดขายสุทธิ</p>
                                <h3 className="text-3xl font-extrabold">{formatCurrency(data.totalAmount)}</h3>
                            </div>
                        </div>

                        {/* Card 2: SO Count */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute right-[-10px] top-[-10px] w-20 h-20 bg-indigo-50 rounded-full group-hover:scale-110 transition-transform"></div>
                            <div className="relative">
                                <p className="text-sm font-semibold text-gray-500 mb-1">ออเดอร์ที่สร้าง (SO)</p>
                                <h3 className="text-3xl font-bold text-gray-900">{data.soCount} <span className="text-base font-medium text-gray-500">ใบ</span></h3>
                            </div>
                        </div>

                        {/* Card 3: Check-in Count */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute right-[-10px] top-[-10px] w-20 h-20 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform"></div>
                            <div className="relative">
                                <p className="text-sm font-semibold text-gray-500 mb-1">จำนวนการลงพื้นที่</p>
                                <h3 className="text-3xl font-bold text-gray-900">{data.checkInCount} <span className="text-base font-medium text-gray-500">ครั้ง</span></h3>
                            </div>
                        </div>

                        {/* Card 4: Total Distance */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute right-[-10px] top-[-10px] w-20 h-20 bg-slate-50 rounded-full group-hover:scale-110 transition-transform"></div>
                            <div className="relative">
                                <p className="text-sm font-semibold text-gray-500 mb-1">ระยะทางที่เดินทาง</p>
                                <h3 className="text-3xl font-bold text-gray-900">{data.totalDistance?.toFixed(1) || 0} <span className="text-base font-medium text-gray-500">km</span></h3>
                                {data.fraudCount > 0 && (
                                    <div className="mt-2 flex items-center text-red-500 font-bold text-[10px] animate-pulse">
                                        🚩 พบความผิดปกติ {data.fraudCount} จุด
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Sales Summary */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center border-b border-gray-100 pb-3">
                            <span className="text-pink-500 mr-2">📊</span> สรุปผลงานเชิงลึก (Sale Performance)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Visit breakdown */}
                            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                <h4 className="text-sm font-bold text-gray-500 mb-2">🚗 การเข้าพบลูกค้า ({data.checkInCount} ราย)</h4>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-gray-600 text-sm">💡 ลูกค้าใหม่</span>
                                    <span className="font-bold text-gray-900">{data.visitNew || 0} ราย</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 text-sm">🏢 ลูกค้าเก่า (ฐานเดิม)</span>
                                    <span className="font-bold text-gray-900">{data.visitExisting || 0} ราย</span>
                                </div>
                            </div>
                            
                            {/* Sales breakdown */}
                            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                                <h4 className="text-sm font-bold text-blue-600 mb-2">📦 ยอดขายรวม ({formatCurrency(data.totalAmount)})</h4>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-gray-600 text-sm">💵 เงินสด</span>
                                    <span className="font-bold text-gray-900">{formatCurrency(data.saleCash || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-gray-600 text-sm">📱 โอนชำระ</span>
                                    <span className="font-bold text-gray-900">{formatCurrency(data.saleTransfer || 0)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 text-sm">⏳ ให้เครดิต</span>
                                    <span className="font-bold text-gray-900">{formatCurrency(data.saleCredit || 0)}</span>
                                </div>
                            </div>
                            
                            {/* Collection breakdown */}
                            <div className="p-4 rounded-xl bg-green-50/50 border border-green-100 flex flex-col justify-center">
                                <h4 className="text-sm font-bold text-green-600 mb-2 text-center">💰 ผลงานเก็บหนี้ (Collection)</h4>
                                <div className="text-center mt-2">
                                    <span className="text-3xl font-extrabold text-green-700">{formatCurrency(data.collectedAmount || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Team Radar View Map */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full animate-fade-in relative z-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
                            <span className="flex items-center"><span className="text-blue-500 mr-2">🌍</span> เรดาร์พื้นที่การเข้าพบ (Team Radar)</span>
                        </h3>
                        <div className="h-[400px] w-full bg-gray-50 rounded-xl overflow-hidden shadow-inner border border-gray-100">
                            <DashboardMap visits={data.recentVisits || []} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
                        
                        {/* First Column (Manager sees Sales Leaderboard, Sale sees Top Items) */}
                        <div className="col-span-1 lg:col-span-1 space-y-6">
                            {(role === 'manager' || role === 'admin') && selectedUser === 'all' && (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center">
                                        <span className="text-blue-500 mr-2">🥇</span> ยอดขายแยกตามพนักงาน
                                    </h3>
                                    <div className="space-y-4">
                                        {data.salesByPerson?.map((person, idx) => (
                                            <div key={idx} className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                                        {person.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="truncate w-24">
                                                        <p className="font-semibold text-sm text-gray-800 truncate" title={person.name}>{person.name.split('@')[0]}</p>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-gray-900 text-sm bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">{formatCurrency(person.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Purpose Breakdown Visual */}
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center">
                                    <span className="text-purple-500 mr-2">🎯</span> สัดส่วนการลงพื้นที่
                                </h3>
                                
                                {totalPurposes === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-4">ไม่มีข้อมูลการเข้าพบ</p>
                                ) : (
                                    <div>
                                        <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden flex mb-4">
                                            {data.purposes.pitch > 0 && <div style={{width: `${(data.purposes.pitch / totalPurposes) * 100}%`}} className="h-full bg-green-500"></div>}
                                            {data.purposes.inspection > 0 && <div style={{width: `${(data.purposes.inspection / totalPurposes) * 100}%`}} className="h-full bg-purple-500"></div>}
                                            {data.purposes.collection > 0 && <div style={{width: `${(data.purposes.collection / totalPurposes) * 100}%`}} className="h-full bg-red-500"></div>}
                                            {data.purposes.other > 0 && <div style={{width: `${(data.purposes.other / totalPurposes) * 100}%`}} className="h-full bg-gray-400"></div>}
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between items-center"><span className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>เสนอขาย</span> <span className="font-semibold">{data.purposes.pitch} ครั้ง</span></div>
                                            <div className="flex justify-between items-center"><span className="flex items-center"><span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>ตรวจร้าน</span> <span className="font-semibold">{data.purposes.inspection} ครั้ง</span></div>
                                            <div className="flex justify-between items-center"><span className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>เก็บหนี้</span> <span className="font-semibold">{data.purposes.collection} ครั้ง</span></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Middle/Right Column: Recent Visits Feed */}
                        <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-full min-h-[400px]">
                            <div className="flex border-b border-gray-100 mb-6 pb-2 space-x-6">
                                <button
                                    onClick={() => setActivityTab('timeline')}
                                    className={`pb-2 font-bold text-lg flex items-center transition-all border-b-2 ${activityTab === 'timeline' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    <span className="text-emerald-500 mr-2">📍</span> ไทม์ไลน์ล่าสุด
                                </button>
                                <button
                                    onClick={() => setActivityTab('calendar')}
                                    className={`pb-2 font-bold text-lg flex items-center transition-all border-b-2 ${activityTab === 'calendar' ? 'border-purple-500 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    <span className="text-purple-500 mr-2">📅</span> ปฏิทินปฏิบัติงาน
                                </button>
                            </div>

                            {activityTab === 'timeline' && (
                                <div className="animate-fade-in">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-sm text-gray-500">แสดงผลจากการลงพื้นที่ล่าสุด</span>
                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">{data.recentVisits?.length || 0} รายการล่าสุด</span>
                                    </div>
                                    
                                    {data.recentVisits?.length > 0 ? (
                                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent pt-2">
                                            {data.recentVisits.map((visit, idx) => {
                                                const pInfo = getPurposeIconInfo(visit.purpose);
                                                return (
                                                    <div key={idx} onClick={() => setSelectedVisit(visit)} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active cursor-pointer">
                                                        <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${pInfo.color} z-10 group-hover:scale-110 transition-transform`}>
                                                            {pInfo.icon}
                                                        </div>
                                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="font-bold text-gray-900 line-clamp-1">{visit.customer_name || visit.customer_code}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${pInfo.color}`}>{pInfo.label}</span>
                                                                <span className="text-xs text-gray-400 font-medium">{new Date(visit.created_at).toLocaleString('th-TH', {hour: '2-digit', minute:'2-digit', month: 'short', day: 'numeric'})}</span>
                                                            </div>
                                                            {visit.notes && <p className="text-sm text-gray-600 leading-snug line-clamp-2">{visit.notes}</p>}
                                                            {(role === 'manager' || role === 'admin') && visit.sales_person && (
                                                                <div className="mt-2 pt-2 border-t border-gray-50 flex items-center text-xs text-gray-400">
                                                                    <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold mr-1">{visit.sales_person.charAt(0).toUpperCase()}</div>
                                                                    {visit.sales_person}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="h-48 flex flex-col items-center justify-center text-gray-400">
                                            <span className="text-4xl mb-3 opacity-20">📭</span>
                                            <p>ยังไม่มีประวัติการลงพื้นที่ในระยะเวลานี้</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activityTab === 'calendar' && (
                                <DashboardCalendar visits={data.allVisits || []} filters={data.filters} onVisitClick={setSelectedVisit} />
                            )}
                        </div>

                    </div>
                </div>
            )}

            {/* Visit Details Modal */}
            {selectedVisit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedVisit(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className={`p-6 text-white ${getPurposeIconInfo(selectedVisit.purpose).color.split(' ')[0].replace('100', '600')}`}>
                            <div className="flex justify-between items-start">
                                <div className="text-4xl mb-3 shadow-sm inline-block rounded-full bg-white/20 p-3">
                                    {getPurposeIconInfo(selectedVisit.purpose).icon}
                                </div>
                                <button onClick={() => setSelectedVisit(null)} className="text-white hover:text-gray-200">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <h2 className="text-2xl font-bold mb-1 leading-tight">{selectedVisit.customer_name || selectedVisit.customer_code}</h2>
                            <p className="opacity-90 font-medium">จุดประสงค์: {getPurposeIconInfo(selectedVisit.purpose).label}</p>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between text-sm border-b border-gray-100 pb-3">
                                <span className="text-gray-500 font-semibold">พนักงานขาย</span>
                                <span className="text-gray-900 font-bold">{selectedVisit.sales_person || 'N/A'}</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm border-b border-gray-100 pb-3">
                                <span className="text-gray-500 font-semibold">เวลาที่เข้าพบ</span>
                                <span className="text-gray-900 font-bold">{new Date(selectedVisit.created_at).toLocaleString('th-TH')}</span>
                            </div>

                            <div className="text-sm">
                                <span className="text-gray-500 font-semibold block mb-1">บันทึกเพิ่มเติม</span>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-700 min-h-[60px]">
                                    {selectedVisit.notes || <span className="text-gray-400 italic">ไม่มีบันทึก</span>}
                                </div>
                            </div>

                            {selectedVisit.latitude && selectedVisit.longitude && (
                                <a 
                                    href={`https://maps.google.com/?q=${selectedVisit.latitude},${selectedVisit.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer" 
                                    className="mt-6 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center space-x-2 transition-colors shadow-md"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <span>เปิดระบบนำทาง (Google Maps)</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
