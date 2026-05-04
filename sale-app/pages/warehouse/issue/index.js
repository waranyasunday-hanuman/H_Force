import { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { useRouter } from "next/router";
import Link from "next/link";

const STATUS_CONFIG = {
    pending:  { label: "รออนุมัติ",  color: "bg-amber-100 text-amber-700 border-amber-200" },
    approved: { label: "อนุมัติแล้ว", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    issued:   { label: "จ่ายแล้ว",   color: "bg-blue-100 text-blue-700 border-blue-200" },
    rejected: { label: "ปฏิเสธ",     color: "bg-red-100 text-red-700 border-red-200" },
    cancelled:{ label: "ยกเลิก",     color: "bg-slate-100 text-slate-500 border-slate-200" },
};
const TYPE_CONFIG = {
    FINISH_GOODS: { label: "FG", color: "bg-indigo-100 text-indigo-700", icon: "📦" },
    RAW_MATERIAL: { label: "RM", color: "bg-orange-100 text-orange-700", icon: "🏗️" },
};
const OP_CONFIG = {
    issue:    { label: "เบิก",  icon: "📤" },
    transfer: { label: "โอน",   icon: "🔄" },
    writeoff: { label: "ตัด",   icon: "✂️" },
};

export default function WarehouseIssueIndexPage() {
    const router = useRouter();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterType, setFilterType] = useState("all");
    const [search, setSearch] = useState("");

    useEffect(() => { fetchRequests(); }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/warehouse/issue/list');
            const data = await res.json();
            setRequests(data.requests || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const filtered = requests.filter(r => {
        if (filterStatus !== "all" && r.status !== filterStatus) return false;
        if (filterType !== "all" && r.type !== filterType) return false;
        if (search && !r.request_no?.toLowerCase().includes(search.toLowerCase()) &&
            !r.requester_name?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const counts = {
        all: requests.length,
        pending: requests.filter(r => r.status === "pending").length,
        approved: requests.filter(r => r.status === "approved").length,
        issued: requests.filter(r => r.status === "issued").length,
    };

    return (
        <Layout>
            <div suppressHydrationWarning className="max-w-2xl mx-auto pb-24 animate-fade-up">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()}
                            className="w-9 h-9 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
                        </button>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">ใบขอเบิกสินค้า</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Issue Requests</p>
                        </div>
                    </div>
                    <Link href="/warehouse/issue/new"
                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-rose-200 hover:scale-105 active:scale-95 transition-all">
                        <span>+</span> สร้างใบขอเบิก
                    </Link>
                </div>

                {/* Summary Badges */}
                <div className="grid grid-cols-4 gap-2 mb-5">
                    {[
                        { key: "all", label: "ทั้งหมด", count: counts.all, color: "bg-slate-900 text-white" },
                        { key: "pending", label: "รออนุมัติ", count: counts.pending, color: "bg-amber-500 text-white" },
                        { key: "approved", label: "อนุมัติ", count: counts.approved, color: "bg-emerald-500 text-white" },
                        { key: "issued", label: "จ่ายแล้ว", count: counts.issued, color: "bg-blue-500 text-white" },
                    ].map(f => (
                        <button key={f.key} onClick={() => setFilterStatus(f.key)}
                            className={`p-2.5 rounded-2xl transition-all text-center border-2 ${
                                filterStatus === f.key ? `${f.color} border-transparent shadow-lg` : "bg-white border-slate-100 text-slate-600"
                            }`}>
                            <p className="text-lg font-black leading-none">{f.count}</p>
                            <p className="text-[9px] font-bold uppercase tracking-tight mt-0.5 opacity-80">{f.label}</p>
                        </button>
                    ))}
                </div>

                {/* Filters Row */}
                <div className="flex gap-2 mb-4">
                    <input type="text" placeholder="ค้นหาเลขที่ / ผู้ขอ..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="flex-1 px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none"/>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                        className="px-3 py-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none">
                        <option value="all">ทุกประเภท</option>
                        <option value="FINISH_GOODS">FG</option>
                        <option value="RAW_MATERIAL">RM</option>
                    </select>
                    <button onClick={fetchRequests}
                        className="px-3 py-2.5 bg-white rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    </button>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"/>
                        <p className="text-xs text-slate-400 font-bold">กำลังโหลด...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <span className="text-5xl">📋</span>
                        <p className="font-black text-slate-400">ยังไม่มีรายการ</p>
                        <Link href="/warehouse/issue/new"
                            className="px-6 py-3 bg-rose-500 text-white font-black text-sm rounded-2xl hover:bg-rose-600 transition-colors">
                            + สร้างใบขอเบิกแรก
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(req => {
                            const st = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                            const tp = TYPE_CONFIG[req.type] || TYPE_CONFIG.FINISH_GOODS;
                            const op = OP_CONFIG[req.operation_type] || OP_CONFIG.issue;
                            const itemCount = req.warehouse_issue_items?.length || 0;
                            return (
                                <div key={req.id}
                                    onClick={() => router.push(`/warehouse/issue/${req.id}`)}
                                    className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-rose-100 transition-all cursor-pointer">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                <span className="font-black text-slate-900 text-sm">{req.request_no}</span>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${tp.color}`}>
                                                    {tp.icon} {tp.label}
                                                </span>
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                    {op.icon} {op.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-bold truncate">
                                                {req.requester_name} · {req.department || "ไม่ระบุแผนก"}
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                {req.purpose} · {itemCount} รายการ
                                                {req.needed_date && ` · ต้องการ ${new Date(req.needed_date).toLocaleDateString('th-TH', {day:'numeric', month:'short'})}`}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border ${st.color}`}>
                                                {st.label}
                                            </span>
                                            <p className="text-[9px] text-slate-300 font-bold">
                                                {new Date(req.created_at).toLocaleDateString('th-TH', {day:'numeric', month:'short', year:'2-digit'})}
                                            </p>
                                        </div>
                                    </div>
                                    {req.status === "pending" && (
                                        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"/>
                                            <p className="text-[10px] font-bold text-amber-600">รอฝ่ายคลังอนุมัติ</p>
                                        </div>
                                    )}
                                    {req.ecount_ref_no && (
                                        <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"/>
                                            <p className="text-[10px] font-bold text-blue-600">Ecount Ref: {req.ecount_ref_no}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Layout>
    );
}
