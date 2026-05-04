import { useState, useEffect, useMemo } from 'react';
import Layout from '../../../components/Layout';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function ReceiptDashboard() {
    const router = useRouter();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("all");
    const [search, setSearch] = useState("");
    
    // Get type from URL ('FG' or 'RM')
    const type = router.query.type || 'FG';

    useEffect(() => {
        if (!router.isReady) return;
        async function fetchRequests() {
            try {
                const res = await fetch(`/api/warehouse/receipts?type=${type}`);
                const data = await res.json();
                if (data.requests) {
                    setRequests(data.requests);
                }
            } catch (err) {
                console.error("Failed to load receipts", err);
            } finally {
                setLoading(false);
            }
        }
        fetchRequests();
    }, [router.isReady, type]);

    const filtered = useMemo(() => {
        return requests.filter(r => {
            if (filterStatus !== "all" && r.status !== filterStatus) return false;
            if (search) {
                const s = search.toLowerCase();
                return (
                    (r.receipt_no && r.receipt_no.toLowerCase().includes(s)) ||
                    (r.remarks && r.remarks.toLowerCase().includes(s))
                );
            }
            return true;
        });
    }, [requests, filterStatus, search]);

    const counts = useMemo(() => ({
        all: requests.length,
        pending: requests.filter(r => r.status === 'draft').length,
        approved: requests.filter(r => r.status === 'approved').length,
        cancelled: requests.filter(r => r.status === 'cancelled').length,
    }), [requests]);

    return (
        <Layout>
            <Head>
                <title>รายการรับเข้าคลัง {type}</title>
            </Head>

            <div className="max-w-4xl mx-auto pb-20">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => router.push(`/warehouse/${type.toLowerCase()}`)} 
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors">
                        ⬅️
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                            📥 รายการรับเข้า {type === 'FG' ? 'สินค้าสำเร็จรูป (FG)' : 'วัตถุดิบ (RM)'}
                        </h1>
                        <p className="text-sm text-slate-500 font-medium">ภาพรวมการรับเข้าคลังทั้งหมด</p>
                    </div>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                    {[
                        { key: "all",      label: "ทั้งหมด",   count: counts.all,      bg: "bg-slate-900" },
                        { key: "draft",    label: "ฉบับร่าง",  count: counts.pending,  bg: "bg-amber-500" },
                        { key: "approved", label: "อนุมัติ",   count: counts.approved, bg: "bg-emerald-500" },
                        { key: "cancelled",label: "ยกเลิก",    count: counts.cancelled,bg: "bg-red-500" },
                    ].map(f => (
                        <button key={f.key} onClick={() => setFilterStatus(f.key)}
                            className={`p-2.5 rounded-2xl text-center border-2 transition-all ${
                                filterStatus === f.key ? `${f.bg} text-white border-transparent shadow-lg` : "bg-white border-slate-100 text-slate-600"
                            }`}>
                            <p className="text-lg font-black leading-none">{f.count}</p>
                            <p className="text-[9px] font-bold uppercase tracking-tight mt-0.5 opacity-80">{f.label}</p>
                        </button>
                    ))}
                </div>

                {/* Create Button & Search */}
                <div className="flex flex-col gap-3 mb-6">
                    <button onClick={() => router.push(`/goods-receipt?tab=${type}`)}
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
                        <span className="text-xl">➕</span> สร้างรายการรับเข้า {type}
                    </button>

                    <input type="text" placeholder="ค้นหาเลขที่เอกสาร / หมายเหตุ..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full px-4 py-3 bg-white rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-emerald-400 outline-none"/>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin"/>
                        <p className="text-xs text-slate-400 font-bold">กำลังโหลด...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-3xl border border-dashed border-slate-200">
                        <span className="text-5xl opacity-50">📦</span>
                        <p className="font-black text-slate-400">ยังไม่มีเอกสารรับเข้า</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(req => {
                            const statusColor = 
                                req.status === 'draft' ? "text-amber-600 bg-amber-50" :
                                req.status === 'approved' ? "text-emerald-600 bg-emerald-50" :
                                "text-red-600 bg-red-50";
                            const statusText = 
                                req.status === 'draft' ? "ฉบับร่าง" :
                                req.status === 'approved' ? "อนุมัติแล้ว" :
                                "ยกเลิก";

                            return (
                                <div key={req.id} onClick={() => router.push(`/goods-receipt?id=${req.id}&tab=${type}`)}
                                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all group relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl opacity-80">📥</span>
                                            <div>
                                                <h3 className="font-black text-slate-800 text-sm group-hover:text-emerald-600 transition-colors">{req.receipt_no}</h3>
                                                <p className="text-[10px] text-slate-400 font-bold">{new Date(req.receipt_date).toLocaleDateString('th-TH')}</p>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-md text-[10px] font-black ${statusColor}`}>
                                            {statusText}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-slate-500">หมายเหตุ:</span>
                                            <span className="font-bold text-slate-700">{req.remarks || "-"}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Layout>
    );
}
