import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import Loading from "../components/Loading";
import { supabase } from "../lib/supabase";

export default function VisitReport() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({ start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] });

    useEffect(() => {
        fetchReports();
    }, [dateRange]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            // Get visits within date range
            const start = `${dateRange.start} 00:00:00`;
            const end = `${dateRange.end} 23:59:59`;

            const { data: visitsData, error } = await supabase
                .from('visits')
                .select('*')
                .gte('created_at', start)
                .lte('created_at', end)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setReports(visitsData || []);
        } catch (err) {
            console.error("Failed to load visit reports:", err);
        }
        setLoading(false);
    };

    const getPurposeBadge = (purpose) => {
        const config = {
            'sales': { label: "เสนอขายสินค้า", color: "bg-blue-100 text-blue-700 border-blue-200" },
            'collection': { label: "เก็บเงิน/วางบิล", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
            'inspection': { label: "ตรวจสอบหน้าร้าน", color: "bg-amber-100 text-amber-700 border-amber-200" },
            'other': { label: "อื่นๆ", color: "bg-slate-100 text-slate-700 border-slate-200" }
        };
        const cfg = config[purpose] || config['other'];
        return <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md border ${cfg.color}`}>{cfg.label}</span>;
    };

    return (
        <Layout>
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-indigo-900 tracking-tight flex items-center gap-2">
                        <span>📊</span> รายงานการเข้าพบลูกค้า
                    </h1>
                    <p className="text-sm text-indigo-500 mt-1">สรุปข้อมูล Check-in / Out และผลการปฏิบัติงานของเซลส์</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                    <input 
                        type="date" 
                        value={dateRange.start}
                        onChange={e => setDateRange({...dateRange, start: e.target.value})}
                        className="px-3 py-1.5 text-sm border-none bg-slate-50 rounded-lg outline-none text-slate-700 font-semibold cursor-pointer"
                    />
                    <span className="text-slate-400 font-bold">-</span>
                    <input 
                        type="date" 
                        value={dateRange.end}
                        onChange={e => setDateRange({...dateRange, end: e.target.value})}
                        className="px-3 py-1.5 text-sm border-none bg-slate-50 rounded-lg outline-none text-slate-700 font-semibold cursor-pointer"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center min-h-[300px]">
                    <Loading />
                </div>
            ) : (
                <div className="space-y-4">
                    {reports.length === 0 && (
                        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center text-slate-500 font-medium">
                            ไม่พบข้อมูลการเข้าพบในช่วงวันที่เลือก
                        </div>
                    )}
                    
                    {reports.map((report) => (
                        <div key={report.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row gap-6">
                                
                                {/* Info Section */}
                                <div className="flex-1 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 leading-tight">
                                                {report.customer_name || report.customer_code || "ไม่ระบุชื่อลูกค้า"}
                                            </h3>
                                            <p className="text-xs text-slate-500 font-mono mt-1">รหัส: {report.customer_code || "-"}</p>
                                        </div>
                                        <div>
                                            {getPurposeBadge(report.purpose)}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">📍 Check-in</div>
                                            <div className="text-sm font-semibold text-slate-700">
                                                {report.check_in_time ? new Date(report.check_in_time).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.' : '-'}
                                            </div>
                                            <div className="text-[10px] text-slate-500 truncate" title={report.check_in_location}>{report.check_in_location || "ไม่มีพิกัด"}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">📍 Check-out</div>
                                            <div className="text-sm font-semibold text-slate-700">
                                                {report.check_out_time ? new Date(report.check_out_time).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.' : (report.is_completed ? 'ปิดงานแล้ว' : 'ยังไม่ Check-out')}
                                            </div>
                                            {report.check_out_location && (
                                                <div className="text-[10px] text-slate-500 truncate" title={report.check_out_location}>{report.check_out_location}</div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">📝 ผลการดำเนินการ / หมายเหตุ</div>
                                        <div className="text-sm text-slate-700 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50 min-h-[60px]">
                                            {report.notes ? report.notes : <span className="text-slate-400 italic">ไม่มีการบันทึกหมายเหตุ</span>}
                                        </div>
                                    </div>
                                    
                                    {report.is_out_of_range && (
                                        <div className="inline-flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md font-semibold">
                                            ⚠️ มีการบันทึกงานนอกระยะที่กำหนด
                                        </div>
                                    )}
                                </div>

                                {/* Photo Section */}
                                {report.photo_url && (
                                    <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">📸 รูปภาพหลักฐาน</div>
                                        <a href={report.photo_url} target="_blank" rel="noreferrer" className="block w-full aspect-video md:aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group relative">
                                            <img src={report.photo_url} alt="Visit Photo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <span className="text-white text-xs font-bold px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-md">ดูรูปใหญ่</span>
                                            </div>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Layout>
    );
}
