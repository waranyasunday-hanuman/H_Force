import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import Loading from "../../components/Loading";
import { supabase } from "../../lib/supabase";
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('../../components/MapComponent'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 font-medium">📍 กำลังโหลดแผนที่...</div>
});

const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

export default function TripReport() {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [salesUsers, setSalesUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState("all");
    const [dateRange, setDateRange] = useState({ 
        start: new Date().toISOString().split('T')[0], 
        end: new Date().toISOString().split('T')[0] 
    });
    
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        totalVisits: 0,
        totalDistance: 0,
        avgDistance: 0,
        outOfRangeCount: 0
    });

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
                const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
                const r = profile?.role || "sale";
                setRole(r);
                if (r === "sale") {
                    setSelectedUser(session.user.email);
                } else {
                    fetchSalesUsers();
                }
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            fetchTrips();
        }
    }, [selectedUser, dateRange]);

    const fetchSalesUsers = async () => {
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (data.users) setSalesUsers(data.users.filter(u => u.email));
        } catch (e) {
            console.error("Failed to fetch users", e);
        }
    };

    const fetchTrips = async () => {
        setLoading(true);
        try {
            const start = `${dateRange.start} 00:00:00`;
            const end = `${dateRange.end} 23:59:59`;

            let query = supabase
                .from('visits')
                .select('*')
                .gte('created_at', start)
                .lte('created_at', end)
                .order('created_at', { ascending: true });

            if (selectedUser !== "all") {
                query = query.eq('sales_person', selectedUser);
            }

            const { data, error } = await query;
            if (error) throw error;

            setTrips(data || []);
            
            // Calculate summary
            let dist = 0;
            let outRange = 0;
            (data || []).forEach(v => {
                dist += parseFloat(v.distance_km || 0);
                if (v.is_out_of_range) outRange++;
            });

            setSummary({
                totalVisits: data?.length || 0,
                totalDistance: dist,
                avgDistance: data?.length > 0 ? dist / data.length : 0,
                outOfRangeCount: outRange
            });

        } catch (err) {
            console.error("Failed to load trip reports:", err);
        }
        setLoading(false);
    };

    return (
        <Layout>
            <div className="pb-24">
                {/* Header & Filters */}
                <div className="mb-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <span className="p-2 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-200">🛣️</span> 
                            รายงานการเดินทาง (Trips)
                        </h1>
                        <p className="text-slate-500 font-medium mt-1.5">ตรวจสอบเส้นทางการวิ่งงานและระยะทางของทีมเซลส์</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/50">
                        {role !== "sale" && (
                            <div className="flex flex-col px-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">พนักงาน</span>
                                <select 
                                    value={selectedUser}
                                    onChange={e => setSelectedUser(e.target.value)}
                                    className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500"
                                >
                                    <option value="all">ทั้งหมด</option>
                                    {salesUsers.map(u => (
                                        <option key={u.email} value={u.email}>{u.pic_name || (u.email ? u.email.split('@')[0] : 'Unknown')}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        
                        <div className="flex flex-col px-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">ช่วงวันที่</span>
                            <div className="flex items-center gap-2">
                                <input 
                                    type="date" 
                                    value={dateRange.start}
                                    onChange={e => setDateRange({...dateRange, start: e.target.value})}
                                    className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                                />
                                <span className="text-slate-300 font-black">-</span>
                                <input 
                                    type="date" 
                                    value={dateRange.end}
                                    onChange={e => setDateRange({...dateRange, end: e.target.value})}
                                    className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/30">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Visits</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">{summary.totalVisits}</span>
                            <span className="text-xs font-bold text-slate-400">ครั้ง</span>
                        </div>
                    </div>
                    <div className="bg-indigo-600 p-6 rounded-[2.5rem] shadow-xl shadow-indigo-200 text-white">
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-2">Total Distance</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black">{summary.totalDistance.toFixed(1)}</span>
                            <span className="text-xs font-bold text-white/60">km</span>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-100/30">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Avg. Distance</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900">{summary.avgDistance.toFixed(1)}</span>
                            <span className="text-xs font-bold text-slate-400">km/visit</span>
                        </div>
                    </div>
                    <div className="bg-rose-50 p-6 rounded-[2.5rem] border border-rose-100 shadow-xl shadow-rose-100/20">
                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-2">Out of Range</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-rose-600">{summary.outOfRangeCount}</span>
                            <span className="text-xs font-bold text-rose-400">ครั้ง</span>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center min-h-[400px]">
                        <Loading />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Timeline List */}
                        <div className="lg:col-span-1 space-y-4 max-h-[700px] overflow-y-auto pr-2 scrollbar-hide">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-2 h-6 bg-rose-500 rounded-full"></span> Timeline การเดินทาง
                            </h3>
                            
                            {trips.length === 0 ? (
                                <div className="bg-slate-50 rounded-3xl p-10 text-center border border-dashed border-slate-200">
                                    <p className="text-xs font-bold text-slate-400">ไม่พบข้อมูลในช่วงเวลาที่กำหนด</p>
                                </div>
                            ) : (
                                trips.map((visit, idx) => (
                                    <div key={visit.id} className="relative pl-6 pb-2 group">
                                        {/* Connector Line */}
                                        {idx !== trips.length - 1 && (
                                            <div className="absolute left-[7px] top-4 bottom-0 w-0.5 bg-slate-100 group-hover:bg-rose-200 transition-colors"></div>
                                        )}
                                        {/* Dot */}
                                        <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-md z-10 ${visit.is_out_of_range ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                                        
                                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all cursor-default">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-black text-slate-400">
                                                    {formatDate(visit.created_at)} | {new Date(visit.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                                </span>
                                                {visit.distance_km > 0 && (
                                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                                        +{visit.distance_km.toFixed(1)} km
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="text-sm font-black text-slate-800 line-clamp-1">{visit.customer_name || 'ไม่ระบุร้าน'}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{visit.purpose || 'ทั่วไป'}</p>
                                            
                                            <div className="mt-3 flex items-center gap-2">
                                                <a 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${visit.latitude},${visit.longitude}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[9px] font-black text-white bg-slate-800 px-3 py-1.5 rounded-full hover:bg-black transition-colors"
                                                >
                                                    📍 เปิด Google Maps
                                                </a>
                                                {visit.is_out_of_range && (
                                                    <span className="text-[9px] font-black text-rose-500">⚠️ นอกระยะ</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Map View */}
                        <div className="lg:col-span-2">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="w-2 h-6 bg-indigo-500 rounded-full"></span> เส้นทางบนแผนที่
                            </h3>
                            <div className="bg-white p-2 rounded-[3rem] shadow-2xl border border-slate-100 h-[600px] overflow-hidden relative">
                                {trips.length > 0 ? (
                                    <MapComponent 
                                        lat={trips[0].latitude} 
                                        lng={trips[0].longitude}
                                        markers={trips.map(v => ({
                                            lat: v.latitude,
                                            lng: v.longitude,
                                            title: v.customer_name,
                                            label: new Date(v.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                                        }))}
                                    />
                                ) : (
                                    <div className="h-full w-full bg-slate-50 flex items-center justify-center flex-col text-slate-400 rounded-[2.5rem]">
                                        <span className="text-5xl mb-4">🗺️</span>
                                        <p className="font-black text-xs uppercase tracking-widest">เลือกพนักงานและวันที่เพื่อแสดงแผนที่</p>
                                    </div>
                                )}
                                
                                {trips.length > 0 && (
                                    <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-white shadow-2xl flex items-center justify-between">
                                        <div className="flex gap-4">
                                            <div className="text-center">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">จุดเริ่ม</p>
                                                <p className="text-[10px] font-black text-slate-900">{new Date(trips[0].created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                            <div className="w-px h-8 bg-slate-200"></div>
                                            <div className="text-center">
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">จุดสิ้นสุด</p>
                                                <p className="text-[10px] font-black text-slate-900">{new Date(trips[trips.length-1].created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-indigo-600">Route Identified</p>
                                            <p className="text-[8px] font-bold text-slate-400">สถิติการเดินทางในระบบ</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
