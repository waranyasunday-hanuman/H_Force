import { useState, useEffect } from "react";
import Layout from "../../../components/Layout";
import { useRouter } from "next/router";
import PrintIssueDocument from "../../../components/PrintIssueDocument";
import Swal from "sweetalert2";

const STATUS_CONFIG = {
    pending:  { label: "รออนุมัติ",  color: "text-amber-600 bg-amber-50 border-amber-200",  dot: "bg-amber-400 animate-pulse" },
    approved: { label: "อนุมัติแล้ว", color: "text-emerald-600 bg-emerald-50 border-emerald-200", dot: "bg-emerald-400" },
    issued:   { label: "จ่ายแล้ว",   color: "text-blue-600 bg-blue-50 border-blue-200",    dot: "bg-blue-400" },
    rejected: { label: "ปฏิเสธ",     color: "text-red-600 bg-red-50 border-red-200",        dot: "bg-red-400" },
    cancelled:{ label: "ยกเลิก",     color: "text-slate-500 bg-slate-50 border-slate-200",  dot: "bg-slate-300" },
};

export default function IssueDetailPage() {
    const router = useRouter();
    const { id } = router.query;
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Issue Logic State
    const [issueData, setIssueData] = useState([]);
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => { if (id) fetchDetail(); }, [id]);

    const fetchDetail = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/warehouse/issue/list?id=${id}`);
            const data = await res.json();
            const found = (data.requests || []).find(r => r.id === id);
            if (!found) throw new Error("ไม่พบคำขอนี้");
            setRequest(found);

            if (found.status === "approved") {
                const initialLots = [];
                (found.warehouse_issue_items || []).forEach(item => {
                    if (item.approved_qty > 0) {
                        initialLots.push({
                            _ui_id: Math.random().toString(36).substr(2, 9),
                            original_item_id: item.id,
                            product_code: item.product_code,
                            product_name: item.product_name,
                            approved_qty: item.approved_qty,
                            issue_qty: item.approved_qty, 
                            lotNo: "",
                            item_remarks: item.item_remarks || ""
                        });
                    }
                });
                setIssueData(initialLots);
            }
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    const handleAddLot = (item) => {
        setIssueData(prev => {
            const idx = prev.findIndex(i => i._ui_id === item._ui_id);
            const newRow = { ...item, _ui_id: Math.random().toString(36).substr(2, 9), issue_qty: 0, lotNo: "" };
            const newArray = [...prev];
            newArray.splice(idx + 1, 0, newRow);
            return newArray;
        });
    };

    const handleRemoveLot = (ui_id, original_item_id) => {
        setIssueData(prev => {
            const remaining = prev.filter(i => i.original_item_id === original_item_id);
            if (remaining.length <= 1) return prev; // Do not remove if it's the last row for this item
            return prev.filter(i => i._ui_id !== ui_id);
        });
    };

    const updateIssueData = (ui_id, field, value) => {
        setIssueData(prev => prev.map(i => i._ui_id === ui_id ? { ...i, [field]: value } : i));
    };

    const handleSubmitIssue = async () => {
        // Validation
        let hasError = false;
        let errorMessage = "";
        const qtys = {};

        for (const lot of issueData) {
            if (!lot.lotNo && request.type === "FINISH_GOODS") {
                // FG should probably require Lot No, but we won't strictly block it, Ecount might.
                // Actually, if they requested Lot tracking, let's just warn or let ERP handle.
            }
            if (lot.issue_qty <= 0) {
                hasError = true;
                errorMessage = "จำนวนจ่ายต้องมากกว่า 0";
            }
            if (!qtys[lot.original_item_id]) qtys[lot.original_item_id] = 0;
            qtys[lot.original_item_id] += Number(lot.issue_qty);
        }

        request.warehouse_issue_items.forEach(item => {
            if (item.approved_qty > 0) {
                const totalIssue = qtys[item.id] || 0;
                if (totalIssue > item.approved_qty) {
                    hasError = true;
                    errorMessage = `จำนวนจ่ายของ ${item.product_code} เกินจำนวนที่อนุมัติ (${totalIssue} > ${item.approved_qty})`;
                }
            }
        });

        if (hasError) return Swal.fire("ตรวจสอบข้อมูล", errorMessage, "warning");

        const { isConfirmed } = await Swal.fire({
            title: "ยืนยันการจ่ายสินค้า?",
            text: "ระบบจะทำการตัดสต๊อกใน ERP ทันที",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ยืนยัน",
            cancelButtonText: "ยกเลิก",
            confirmButtonColor: "#059669"
        });

        if (!isConfirmed) return;

        setIsSubmitting(true);
        try {
            const res = await fetch("/api/warehouse/issue/execute", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    request_id: request.id,
                    issueDate,
                    items: issueData
                })
            });
            
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            Swal.fire({ icon: "success", title: "จ่ายสินค้าสำเร็จ", timer: 2000, showConfirmButton: false });
            fetchDetail();
        } catch (err) {
            Swal.fire("เกิดข้อผิดพลาด", err.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <Layout><div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"/>
            <p className="text-sm font-bold text-slate-400">กำลังโหลด...</p>
        </div></Layout>
    );

    if (error || !request) return (
        <Layout><div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <span className="text-6xl">📋</span>
            <p className="font-black text-slate-700">{error || "ไม่พบข้อมูล"}</p>
            <button onClick={() => router.push('/warehouse/issue')} className="px-6 py-3 bg-rose-500 text-white font-black rounded-2xl">กลับหน้ารายการ</button>
        </div></Layout>
    );

    const st    = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
    const typeLabel = request.type === "RAW_MATERIAL" ? "Raw Material (RM)" : "Finish Goods (FG)";
    const opLabel   = { issue:"ขอเบิก", transfer:"ขอโอน", writeoff:"ขอตัด" }[request.operation_type] || "ขอเบิก";
    const items     = request.warehouse_issue_items || [];

    const printData = {
        ...request,
        items: items.map(i => ({
            ...i,
            product_code: i.product_code,
            product_name: i.product_name,
            requested_qty: i.requested_qty,
            approved_qty:  i.approved_qty,
            issued_qty:    i.issued_qty,
            unit:          i.unit,
            item_remarks:  i.item_remarks,
        }))
    };

    return (
        <>
            <style>{`@media print { .no-print { display:none!important; } @page { size:A4; margin:0; } body { background:white; } }`}</style>

            {/* Screen View */}
            <div className="no-print">
                <Layout>
                    <div suppressHydrationWarning className="max-w-3xl mx-auto pb-10">

                        {/* Header */}
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <button onClick={() => router.push('/warehouse/issue')}
                                    className="w-9 h-9 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
                                </button>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">{request.request_no}</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{opLabel} · {typeLabel}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-black px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${st.color}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>
                                    {st.label}
                                </span>
                                <button onClick={() => window.print()}
                                    className="px-4 py-2 bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-slate-700 transition-colors flex items-center gap-2">
                                    🖨️ พิมพ์ ISO 9001
                                </button>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ข้อมูลผู้ขอ</p>
                                <InfoRow label="ผู้ขอเบิก"  value={request.requester_name} />
                                <InfoRow label="แผนก"       value={request.department || "—"} />
                                <InfoRow label="วัตถุประสงค์" value={request.purpose || "—"} />
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ข้อมูลการดำเนินการ</p>
                                <InfoRow label="วันที่ต้องการ" value={request.needed_date ? new Date(request.needed_date).toLocaleDateString('th-TH',{day:'numeric',month:'long',year:'numeric'}) : "—"} />
                                <InfoRow label="คลังต้นทาง"  value={request.from_warehouse || "—"} />
                                {request.to_warehouse   && <InfoRow label="คลังปลายทาง" value={request.to_warehouse} />}
                                {request.ecount_ref_no  && <InfoRow label="Ecount Ref"  value={request.ecount_ref_no} valueClass="text-blue-600 font-black" />}
                            </div>
                        </div>

                        {request.remarks && (
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mb-4">
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">หมายเหตุ</p>
                                <p className="text-sm font-bold text-amber-800">{request.remarks}</p>
                            </div>
                        )}

                        {/* Items Table (View Only) */}
                        {request.status !== "approved" && (
                            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden mb-4">
                                <div className="px-4 py-3 border-b border-slate-100">
                                    <p className="text-xs font-black text-slate-600 uppercase tracking-widest">รายการสินค้า ({items.length} รายการ)</p>
                                </div>
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            {["#","ชื่อสินค้า","ขอ","อนุมัติ","จ่ายจริง","หมายเหตุ"].map(h => (
                                                <th key={h} className="px-4 py-2.5 text-left font-black text-slate-500 first:w-8 [&:nth-child(3)]:text-center [&:nth-child(3)]:w-20 [&:nth-child(4)]:text-center [&:nth-child(4)]:w-20 [&:nth-child(5)]:text-center [&:nth-child(5)]:w-20">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, idx) => (
                                            <tr key={item.id} className={`border-t border-slate-50 ${idx%2===0?'bg-white':'bg-slate-50/50'}`}>
                                                <td className="px-4 py-3 text-slate-400 font-bold">{idx+1}</td>
                                                <td className="px-4 py-3">
                                                    <p className="font-black text-slate-900 text-xs">{item.product_name || item.product_code}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{item.product_code}</p>
                                                </td>
                                                <td className="px-4 py-3 text-center font-black text-slate-700">{item.requested_qty} <span className="text-[9px] text-slate-400">{item.unit}</span></td>
                                                <td className="px-4 py-3 text-center font-black text-emerald-600">{item.approved_qty ?? "—"}</td>
                                                <td className="px-4 py-3 text-center font-black text-blue-600">{item.issued_qty ?? "—"}</td>
                                                <td className="px-4 py-3 text-slate-500 text-[10px]">{item.item_remarks || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Issue Form - Display only if status is approved */}
                        {request.status === "approved" && (
                            <div className="bg-white rounded-[2rem] border border-blue-100 shadow-xl shadow-blue-50/50 overflow-hidden mb-4 mt-6">
                                <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
                                    <div>
                                        <h3 className="font-black text-lg">ดำเนินการเบิกจ่ายสินค้า</h3>
                                        <p className="text-xs text-blue-100">ระบุ Lot No. และตัดสต๊อก</p>
                                    </div>
                                    <input 
                                        type="date" 
                                        value={issueDate} 
                                        onChange={e => setIssueDate(e.target.value)}
                                        className="px-3 py-1.5 rounded-lg text-slate-900 text-sm font-bold border-0 focus:ring-2 focus:ring-white"
                                    />
                                </div>
                                <div className="p-2 space-y-2">
                                    {issueData.map((item, idx) => (
                                        <div key={item._ui_id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap gap-4 items-center">
                                            <div className="flex-1 min-w-[200px]">
                                                <p className="font-black text-slate-900 text-sm">{item.product_name}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{item.product_code} (อนุมัติ: {item.approved_qty})</p>
                                            </div>
                                            <div className="w-40">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Lot No. / Serial</label>
                                                <input 
                                                    type="text" 
                                                    value={item.lotNo}
                                                    onChange={e => updateIssueData(item._ui_id, "lotNo", e.target.value)}
                                                    placeholder="ไม่ระบุ = ตัดอัตโนมัติ"
                                                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold outline-none focus:border-blue-400"
                                                />
                                            </div>
                                            <div className="w-24">
                                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">จำนวนจ่าย</label>
                                                <input 
                                                    type="number" 
                                                    value={item.issue_qty}
                                                    onChange={e => updateIssueData(item._ui_id, "issue_qty", e.target.value)}
                                                    className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-black text-center outline-none focus:border-blue-400"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 mt-4">
                                                <button onClick={() => handleAddLot(item)}
                                                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-100">
                                                    +
                                                </button>
                                                <button onClick={() => handleRemoveLot(item._ui_id, item.original_item_id)}
                                                    className="w-8 h-8 flex items-center justify-center bg-white border border-red-100 text-red-500 rounded-lg hover:bg-red-50">
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 border-t border-slate-100 bg-white">
                                    <button 
                                        onClick={handleSubmitIssue}
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                                        {isSubmitting ? "กำลังดำเนินการ..." : "✅ ยืนยันการตัดสต๊อก"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Approval Info */}
                        {request.approved_by && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">ข้อมูลการอนุมัติ</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <InfoRow label="อนุมัติโดย" value={request.approved_by} />
                                    <InfoRow label="วันที่" value={request.approved_at ? new Date(request.approved_at).toLocaleDateString('th-TH') : "—"} />
                                    {request.approval_remarks && <InfoRow label="หมายเหตุ" value={request.approval_remarks} />}
                                </div>
                            </div>
                        )}

                    </div>
                </Layout>
            </div>

            {/* Print View - ISO 9001:2015 */}
            <div className="hidden print:block">
                <PrintIssueDocument data={printData} />
            </div>
        </>
    );
}

function InfoRow({ label, value, valueClass = "text-slate-800 font-bold" }) {
    return (
        <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
            <p className={`text-xs mt-0.5 ${valueClass}`}>{value}</p>
        </div>
    );
}
