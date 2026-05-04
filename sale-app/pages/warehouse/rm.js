// pages/warehouse/rm.js – คลัง Raw Material (RM) Approval Dashboard

import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { useRouter } from "next/router";
import Swal from "sweetalert2";

const STATUS_CFG = {
    pending:  { label: "รออนุมัติ",  badge: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-400 animate-pulse" },
    approved: { label: "อนุมัติแล้ว", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-400" },
    issued:   { label: "จ่ายแล้ว",   badge: "bg-blue-100 text-blue-700 border-blue-200",    dot: "bg-blue-400" },
    rejected: { label: "ปฏิเสธ",     badge: "bg-red-100 text-red-700 border-red-200",        dot: "bg-red-400" },
    cancelled:{ label: "ยกเลิก",     badge: "bg-slate-100 text-slate-400 border-slate-200",  dot: "bg-slate-300" },
};

const OP_CFG = {
    issue:    { label: "ขอเบิก",  icon: "📤", color: "bg-orange-50 text-orange-600" },
    transfer: { label: "ขอโอน",   icon: "🔄", color: "bg-violet-50 text-violet-600" },
    writeoff: { label: "ขอตัด",   icon: "✂️", color: "bg-rose-50 text-rose-600" },
};

export default function RMWarehousePage() {
    const router = useRouter();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("pending");
    const [search, setSearch] = useState("");
    const [approvingId, setApprovingId] = useState(null);

    useEffect(() => { fetchRequests(); }, []);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/warehouse/issue/list?type=RAW_MATERIAL");
            const data = await res.json();
            setRequests(data.requests || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const filtered = requests.filter(r => {
        if (filterStatus !== "all" && r.status !== filterStatus) return false;
        if (search && !r.request_no?.toLowerCase().includes(search.toLowerCase()) &&
            !r.requester_name?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const counts = {
        all:      requests.length,
        pending:  requests.filter(r => r.status === "pending").length,
        approved: requests.filter(r => r.status === "approved").length,
        issued:   requests.filter(r => r.status === "issued").length,
    };

    const handleApprove = async (req) => {
        const items = req.warehouse_issue_items || [];

        const itemRows = items.map((item, i) => `
            <tr>
                <td style="padding:6px 8px;text-align:left;font-size:12px;font-weight:600">${item.product_name || item.product_code}</td>
                <td style="padding:6px 8px;text-align:center;font-size:12px">${item.requested_qty} ${item.unit || ""}</td>
                <td style="padding:6px 4px">
                    <input id="aqty_${i}" type="number" value="${item.requested_qty}" min="0"
                        style="width:70px;padding:4px 6px;border:1.5px solid #d1d5db;border-radius:8px;text-align:center;font-weight:700;font-size:13px"/>
                </td>
            </tr>
        `).join("");

        const { value: formData } = await Swal.fire({
            title: `<span style="font-size:15px;font-weight:900">อนุมัติคำขอ</span><br><span style="font-size:12px;color:#6b7280;font-weight:600">${req.request_no}</span>`,
            html: `
                <div style="text-align:left">
                    <table style="width:100%;border-collapse:collapse;margin-bottom:12px">
                        <thead><tr>
                            <th style="padding:6px 8px;background:#f1f5f9;font-size:11px;text-align:left;border-radius:4px">สินค้า</th>
                            <th style="padding:6px 8px;background:#f1f5f9;font-size:11px;text-align:center">จำนวนขอ</th>
                            <th style="padding:6px 8px;background:#f1f5f9;font-size:11px;text-align:center">จำนวนอนุมัติ</th>
                        </tr></thead>
                        <tbody>${itemRows}</tbody>
                    </table>
                    <label style="font-size:11px;font-weight:700;color:#374151;display:block;margin-bottom:4px">หมายเหตุการอนุมัติ (ถ้ามี)</label>
                    <textarea id="approve_remark" rows="2" placeholder="ระบุหมายเหตุ..."
                        style="width:100%;padding:8px;border:1.5px solid #d1d5db;border-radius:8px;font-size:12px;resize:none;box-sizing:border-box"></textarea>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: "✅ อนุมัติ",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#059669",
            focusConfirm: false,
            width: 480,
            preConfirm: () => {
                const approvedQtys = items.map((_, i) => parseFloat(document.getElementById(`aqty_${i}`)?.value || 0));
                const remark = document.getElementById("approve_remark")?.value || "";
                return { approvedQtys, remark };
            },
        });

        if (!formData) return;

        setApprovingId(req.id);
        try {
            const res = await fetch("/api/warehouse/issue/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    request_id: req.id,
                    approved_by: "เจ้าหน้าที่คลัง RM",
                    approval_remarks: formData.remark,
                    items: items.map((item, i) => ({
                        id: item.id,
                        approved_qty: formData.approvedQtys[i],
                    })),
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "เกิดข้อผิดพลาด");

            await Swal.fire({
                icon: "success", title: "อนุมัติสำเร็จ!",
                text: `คำขอ ${req.request_no} ได้รับการอนุมัติเรียบร้อย`,
                timer: 2000, showConfirmButton: false,
            });
            fetchRequests();
        } catch (err) {
            Swal.fire("เกิดข้อผิดพลาด", err.message, "error");
        } finally {
            setApprovingId(null);
        }
    };

    const handleReject = async (req) => {
        const { value: reason } = await Swal.fire({
            title: "ปฏิเสธคำขอ",
            input: "textarea",
            inputLabel: "ระบุเหตุผลที่ปฏิเสธ *",
            inputPlaceholder: "กรุณาระบุเหตุผล...",
            showCancelButton: true,
            confirmButtonText: "❌ ปฏิเสธ",
            confirmButtonColor: "#dc2626",
            cancelButtonText: "ยกเลิก",
        });
        if (!reason) return;

        try {
            const res = await fetch("/api/warehouse/issue/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    request_id: req.id,
                    action: "reject",
                    approved_by: "เจ้าหน้าที่คลัง RM",
                    approval_remarks: reason,
                    items: [],
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            Swal.fire({ icon: "info", title: "ปฏิเสธคำขอแล้ว", timer: 1500, showConfirmButton: false });
            fetchRequests();
        } catch (err) {
            Swal.fire("เกิดข้อผิดพลาด", err.message, "error");
        }
    };

    return (
        <Layout>
            <div suppressHydrationWarning className="max-w-2xl mx-auto pb-24 animate-fade-up">

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => router.back()}
                        className="w-9 h-9 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-xl shadow-lg shadow-orange-200">
                            🏗️
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">คลัง Raw Material</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RM Warehouse Approval</p>
                        </div>
                    </div>
                    <button onClick={fetchRequests}
                        className="w-9 h-9 flex items-center justify-center bg-white rounded-xl border border-slate-100 text-slate-500 hover:bg-slate-50">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                    </button>
                </div>

                {/* Summary Counts */}
                <div className="grid grid-cols-4 gap-2 mb-5">
                    {[
                        { key: "all",      label: "ทั้งหมด",   count: counts.all,      bg: "bg-slate-900" },
                        { key: "pending",  label: "รออนุมัติ", count: counts.pending,  bg: "bg-amber-500" },
                        { key: "approved", label: "อนุมัติ",   count: counts.approved, bg: "bg-emerald-500" },
                        { key: "issued",   label: "จ่ายแล้ว",  count: counts.issued,   bg: "bg-blue-500" },
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

                {/* Search */}
                <div className="mb-4">
                    <input type="text" placeholder="ค้นหาเลขที่คำขอ / ผู้ขอ..." value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-orange-400 outline-none"/>
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"/>
                        <p className="text-xs text-slate-400 font-bold">กำลังโหลด...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <span className="text-5xl">📭</span>
                        <p className="font-black text-slate-400">ไม่มีรายการ{filterStatus === "pending" ? "รออนุมัติ" : ""}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map(req => {
                            const st  = STATUS_CFG[req.status] || STATUS_CFG.pending;
                            const op  = OP_CFG[req.operation_type] || OP_CFG.issue;
                            const its = req.warehouse_issue_items || [];
                            return (
                                <div key={req.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">

                                    {/* Top row */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className="font-black text-slate-900 text-sm">{req.request_no}</span>
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${op.color}`}>{op.icon} {op.label}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 font-bold">{req.requester_name} · {req.department || "ไม่ระบุแผนก"}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{req.purpose} · {its.length} รายการ · สร้าง {new Date(req.created_at).toLocaleDateString("th-TH", {day:"numeric", month:"short"})}</p>
                                        </div>
                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${st.badge} shrink-0`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>
                                            {st.label}
                                        </span>
                                    </div>

                                    {/* Items preview */}
                                    {its.length > 0 && (
                                        <div className="bg-slate-50 rounded-xl px-3 py-2 mb-3 space-y-1">
                                            {its.slice(0,3).map(item => (
                                                <div key={item.id} className="flex items-center justify-between text-xs">
                                                    <span className="text-slate-600 font-bold truncate flex-1">{item.product_name || item.product_code}</span>
                                                    <span className="font-black text-slate-800 ml-2 shrink-0">{item.requested_qty} {item.unit}</span>
                                                </div>
                                            ))}
                                            {its.length > 3 && (
                                                <p className="text-[10px] text-slate-400 font-bold">+ อีก {its.length - 3} รายการ</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button onClick={() => router.push(`/warehouse/issue/${req.id}`)}
                                            className="flex-1 py-2 bg-slate-100 text-slate-700 font-black text-xs rounded-xl hover:bg-slate-200 transition-colors">
                                            📋 ดูรายละเอียด
                                        </button>
                                        {req.status === "pending" && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(req)}
                                                    disabled={approvingId === req.id}
                                                    className="flex-1 py-2 bg-emerald-500 text-white font-black text-xs rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50">
                                                    ✅ อนุมัติ
                                                </button>
                                                <button
                                                    onClick={() => handleReject(req)}
                                                    className="px-4 py-2 bg-red-50 text-red-600 font-black text-xs rounded-xl hover:bg-red-100 transition-colors border border-red-100">
                                                    ❌
                                                </button>
                                            </>
                                        )}
                                        {req.status === "approved" && (
                                            <button onClick={() => router.push(`/warehouse/issue/${req.id}`)}
                                                className="flex-1 py-2 bg-blue-500 text-white font-black text-xs rounded-xl hover:bg-blue-600 transition-colors">
                                                📤 จ่ายสินค้า
                                            </button>
                                        )}
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
