import { useState, useEffect, useRef } from "react";
import Layout from "../../../components/Layout";
import { useRouter } from "next/router";
import { supabase } from "../../../lib/supabase";
import Swal from 'sweetalert2';
import { WAREHOUSES } from "../../../lib/locations";

const PURPOSES = ["ผลิตสินค้า", "ซ่อมแซม", "ทดสอบคุณภาพ", "ส่งมอบลูกค้า", "ใช้ภายใน", "อื่นๆ"];

const OP_TYPES = [
    { key: "issue",    label: "ขอเบิก",  icon: "📤", desc: "เบิกสินค้าออกจากคลัง" },
    { key: "transfer", label: "ขอโอน",   icon: "🔄", desc: "โอนระหว่างคลัง" },
    { key: "writeoff", label: "ขอตัด",   icon: "✂️", desc: "ตัดจ่ายออกจากระบบ" },
];

export default function WarehouseIssueNewPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [user, setUser] = useState(null);
    const [operationType, setOperationType] = useState("issue");
    const [fromWh, setFromWh] = useState("ST002");
    const [toWh, setToWh] = useState("ST001");
    const [selectedType, setSelectedType] = useState("FINISH_GOODS");
    const [purpose, setPurpose] = useState("");
    const [purposeRemark, setPurposeRemark] = useState("");
    const [department, setDepartment] = useState("");
    const [neededDate, setNeededDate] = useState("");
    const [remarks, setRemarks] = useState("");
    const [requesterName, setRequesterName] = useState("");

    // Items State
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef(null);

    // Submitted State (for print)
    const [submitted, setSubmitted] = useState(null);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("display_name")
                    .eq("id", session.user.id)
                    .single();
                setRequesterName(profile?.display_name || session.user.email || "");
            }
        };
        init();
    }, []);

    useEffect(() => { fetchProducts(); }, [selectedType, fromWh]);

    const fetchProducts = async () => {
        try {
            const typeParam = selectedType === "FINISH_GOODS" ? "FG" : "RM";
            const res = await fetch(`/api/warehouse/stock?type=${typeParam}&warehouse=${fromWh}`);
            const data = await res.json();
            if (data.products) setProducts(data.products);
        } catch (e) { console.error(e); }
    };

    const filteredProducts = search.length > 0
        ? products.filter(p =>
            p.PROD_DES?.toLowerCase().includes(search.toLowerCase()) ||
            p.PROD_CD?.toLowerCase().includes(search.toLowerCase())
        ).slice(0, 8)
        : [];

    const addItem = (prod) => {
        if (items.find(i => i.productCode === prod.PROD_CD)) {
            Swal.fire({ toast: true, icon: 'info', title: 'สินค้านี้มีในรายการแล้ว', timer: 1500, showConfirmButton: false, position: 'top' });
            return;
        }
        setItems(prev => [...prev, {
            productCode: prod.PROD_CD,
            productName: prod.PROD_DES || prod.PROD_CD,
            unit: prod.UNIT_CD || prod.UNIT_CD || "หน่วย",
            quantity: 1,
            currentQty: prod.QTY ?? undefined,
            remarks: ""
        }]);
        setSearch("");
        setShowDropdown(false);
    };

    const removeItem = (code) => setItems(items.filter(i => i.productCode !== code));
    const updateItem = (code, field, val) => setItems(items.map(i => i.productCode === code ? { ...i, [field]: val } : i));

    const handleSubmit = async () => {
        if (!requesterName.trim()) return Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อผู้ขอ', 'warning');
        if (!purpose) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกวัตถุประสงค์', 'warning');
        if (items.length === 0) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ', 'warning');

        setLoading(true);
        try {
            const res = await fetch('/api/warehouse/issue/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: selectedType,
                    operationType,
                    fromWarehouse: fromWh,
                    toWarehouse: operationType === "transfer" ? toWh : null,
                    purpose: purpose === "อื่นๆ" ? `อื่นๆ: ${purposeRemark}` : purpose,
                    department,
                    requesterName,
                    requester_id: user?.id,
                    neededDate,
                    remarks,
                    items
                })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            setSubmitted({
                request_no: data.request_no,
                request_id: data.request_id,
                type: selectedType,
                purpose,
                department,
                requesterName,
                neededDate,
                remarks,
                items: [...items],
                created_at: new Date().toLocaleString('th-TH', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            });
        } catch (err) {
            Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => window.print();

    // ─── Print View ───────────────────────────────────────────────────────────
    if (submitted) {
        const typeLabel = submitted.type === "RAW_MATERIAL" ? "Raw Material (RM)" : "Finish Goods (FG)";
        const opLabel = { issue: "ขอเบิก", transfer: "ขอโอน", writeoff: "ขอตัด" }[submitted.operationType || "issue"];
        const docCode = submitted.type === "RAW_MATERIAL" ? "WH-FM-001" : "WH-FM-002";

        return (
            <>
                <style>{`
                    @media print {
                        .no-print { display: none !important; }
                        @page { size: A4; margin: 15mm; }
                        body { background: white !important; font-size: 11pt; }
                        .print-doc { box-shadow: none !important; }
                    }
                    .print-doc { font-family: 'Sarabun', 'TH Sarabun', sans-serif; }
                `}</style>

                {/* Toolbar */}
                <div className="no-print fixed top-0 left-0 right-0 bg-slate-900 text-white px-6 py-3 flex items-center justify-between z-50 shadow-xl">
                    <div className="flex items-center gap-3">
                        <span className="text-lg">✅</span>
                        <div>
                            <p className="font-black text-sm">บันทึกสำเร็จ! เลขที่: <span className="text-rose-400">{submitted.request_no}</span></p>
                            <p className="text-[10px] text-slate-400">กรุณาพิมพ์เอกสารและนำส่งฝ่ายคลัง</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handlePrint}
                            className="px-5 py-2 bg-rose-500 text-white font-black text-sm rounded-xl hover:bg-rose-600 transition-colors flex items-center gap-2">
                            🖨️ พิมพ์เอกสาร
                        </button>
                        <button onClick={() => router.push('/warehouse/issue')}
                            className="px-5 py-2 bg-white/10 text-white font-black text-sm rounded-xl hover:bg-white/20 transition-colors">
                            📋 รายการทั้งหมด
                        </button>
                        <button onClick={() => router.push('/warehouse/issue/new')}
                            className="px-5 py-2 bg-white/10 text-white font-black text-sm rounded-xl hover:bg-white/20 transition-colors">
                            + สร้างใบใหม่
                        </button>
                    </div>
                </div>

                {/* Document */}
                <div className="min-h-screen bg-slate-200 flex items-start justify-center pt-20 pb-10 px-4 print:pt-0 print:bg-white print:px-0">
                    <div className="print-doc bg-white w-full max-w-3xl shadow-2xl print:shadow-none">

                        {/* ═══ ISO DOCUMENT HEADER ═══ */}
                        <table className="w-full border-collapse border border-slate-800 text-xs">
                            <tbody>
                                <tr>
                                    {/* Logo / Company */}
                                    <td className="border border-slate-800 p-3 w-1/3 align-middle">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center text-white text-2xl">🌿</div>
                                            <p className="font-black text-slate-900 text-center text-[11px] leading-tight">บริษัท สมุนไพร หนุมาน จำกัด</p>
                                            <p className="text-slate-500 text-[9px] text-center">Hanuman Herb Co., Ltd.</p>
                                        </div>
                                    </td>
                                    {/* Title */}
                                    <td className="border border-slate-800 p-3 text-center w-1/3 align-middle">
                                        <p className="font-black text-slate-900 text-base leading-tight">ใบขอเบิกสินค้า</p>
                                        <p className="text-slate-600 text-[10px] mt-1">Material / Goods Requisition Form</p>
                                        <p className="mt-2 text-[10px] font-bold text-slate-500">ประเภท: {opLabel} — {typeLabel}</p>
                                    </td>
                                    {/* Document Control */}
                                    <td className="border border-slate-800 p-0 w-1/3 align-top">
                                        <table className="w-full border-collapse text-[9px]">
                                            <tbody>
                                                <tr>
                                                    <td className="border border-slate-200 px-2 py-1 bg-slate-50 font-black text-slate-600 w-20">รหัสเอกสาร</td>
                                                    <td className="border border-slate-200 px-2 py-1 font-bold">{docCode}</td>
                                                </tr>
                                                <tr>
                                                    <td className="border border-slate-200 px-2 py-1 bg-slate-50 font-black text-slate-600">ฉบับที่ (Rev.)</td>
                                                    <td className="border border-slate-200 px-2 py-1 font-bold">01</td>
                                                </tr>
                                                <tr>
                                                    <td className="border border-slate-200 px-2 py-1 bg-slate-50 font-black text-slate-600">วันที่บังคับใช้</td>
                                                    <td className="border border-slate-200 px-2 py-1 font-bold">01/01/2568</td>
                                                </tr>
                                                <tr>
                                                    <td className="border border-slate-200 px-2 py-1 bg-slate-50 font-black text-slate-600">หน้า</td>
                                                    <td className="border border-slate-200 px-2 py-1 font-bold">1 / 1</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* ═══ REQUEST INFO ═══ */}
                        <table className="w-full border-collapse border border-t-0 border-slate-800 text-xs">
                            <tbody>
                                <tr>
                                    <td className="border border-slate-200 px-3 py-1.5 bg-slate-50 font-black text-slate-700 w-28">เลขที่คำขอ</td>
                                    <td className="border border-slate-200 px-3 py-1.5 font-black text-rose-700 text-sm w-40">{submitted.request_no}</td>
                                    <td className="border border-slate-200 px-3 py-1.5 bg-slate-50 font-black text-slate-700 w-28">วันที่สร้าง</td>
                                    <td className="border border-slate-200 px-3 py-1.5 font-bold">{submitted.created_at}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-200 px-3 py-1.5 bg-slate-50 font-black text-slate-700">ผู้ขอเบิก</td>
                                    <td className="border border-slate-200 px-3 py-1.5 font-bold">{submitted.requesterName}</td>
                                    <td className="border border-slate-200 px-3 py-1.5 bg-slate-50 font-black text-slate-700">แผนก / ฝ่าย</td>
                                    <td className="border border-slate-200 px-3 py-1.5 font-bold">{submitted.department || "—"}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-200 px-3 py-1.5 bg-slate-50 font-black text-slate-700">วัตถุประสงค์</td>
                                    <td className="border border-slate-200 px-3 py-1.5 font-bold">{submitted.purpose}</td>
                                    <td className="border border-slate-200 px-3 py-1.5 bg-slate-50 font-black text-slate-700">วันที่ต้องการ</td>
                                    <td className="border border-slate-200 px-3 py-1.5 font-bold">
                                        {submitted.neededDate ? new Date(submitted.neededDate).toLocaleDateString('th-TH', {day:'numeric', month:'long', year:'numeric'}) : "—"}
                                    </td>
                                </tr>
                                {(submitted.fromWarehouse || submitted.toWarehouse) && (
                                    <tr>
                                        <td className="border border-slate-200 px-3 py-1.5 bg-slate-50 font-black text-slate-700">คลังต้นทาง</td>
                                        <td className="border border-slate-200 px-3 py-1.5 font-bold">{submitted.fromWarehouse || "—"}</td>
                                        <td className="border border-slate-200 px-3 py-1.5 bg-slate-50 font-black text-slate-700">คลังปลายทาง</td>
                                        <td className="border border-slate-200 px-3 py-1.5 font-bold">{submitted.toWarehouse || "—"}</td>
                                    </tr>
                                )}
                                {submitted.remarks && (
                                    <tr>
                                        <td className="border border-slate-200 px-3 py-1.5 bg-slate-50 font-black text-slate-700">หมายเหตุ</td>
                                        <td className="border border-slate-200 px-3 py-1.5 font-bold" colSpan={3}>{submitted.remarks}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* ═══ ITEMS TABLE ═══ */}
                        <table className="w-full border-collapse border border-t-0 border-slate-800 text-xs mt-0">
                            <thead>
                                <tr className="bg-slate-800 text-white">
                                    <th className="border border-slate-600 px-2 py-2 text-center font-black w-8">ลำดับ</th>
                                    <th className="border border-slate-600 px-2 py-2 text-left font-black w-24">รหัสสินค้า</th>
                                    <th className="border border-slate-600 px-2 py-2 text-left font-black">ชื่อสินค้า / รายละเอียด</th>
                                    <th className="border border-slate-600 px-2 py-2 text-center font-black w-16">หน่วย</th>
                                    <th className="border border-slate-600 px-2 py-2 text-center font-black w-20">จำนวนขอ</th>
                                    <th className="border border-slate-600 px-2 py-2 text-center font-black w-20">จำนวนอนุมัติ</th>
                                    <th className="border border-slate-600 px-2 py-2 text-center font-black w-20">จ่ายจริง</th>
                                    <th className="border border-slate-600 px-2 py-2 text-left font-black w-32">หมายเหตุ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submitted.items.map((item, idx) => (
                                    <tr key={item.productCode} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                        <td className="border border-slate-200 px-2 py-2 text-center text-slate-500 font-bold">{idx + 1}</td>
                                        <td className="border border-slate-200 px-2 py-2 font-black text-slate-700 text-[10px]">{item.productCode}</td>
                                        <td className="border border-slate-200 px-2 py-2 font-bold text-slate-900">{item.productName}</td>
                                        <td className="border border-slate-200 px-2 py-2 text-center text-slate-600">{item.unit}</td>
                                        <td className="border border-slate-200 px-2 py-2 text-center font-black text-slate-900">{item.quantity}</td>
                                        <td className="border border-slate-200 px-2 py-2 text-center"><div className="border-b border-slate-300 h-5 mx-1"/></td>
                                        <td className="border border-slate-200 px-2 py-2 text-center"><div className="border-b border-slate-300 h-5 mx-1"/></td>
                                        <td className="border border-slate-200 px-2 py-2 text-slate-500 text-[10px]">{item.remarks || ""}</td>
                                    </tr>
                                ))}
                                {/* Blank rows */}
                                {Array.from({ length: Math.max(0, 5 - submitted.items.length) }).map((_, i) => (
                                    <tr key={`blank-${i}`} className={((submitted.items.length + i) % 2 === 0) ? "bg-white" : "bg-slate-50"}>
                                        {[...Array(8)].map((_, j) => <td key={j} className="border border-slate-200 px-2 py-2 h-8"/>)}
                                    </tr>
                                ))}
                                <tr className="bg-slate-50 font-black">
                                    <td colSpan={4} className="border border-slate-300 px-3 py-1.5 text-right text-xs">รวมทั้งหมด</td>
                                    <td className="border border-slate-300 px-2 py-1.5 text-center text-xs text-rose-700">
                                        {submitted.items.reduce((s, i) => s + (i.quantity || 0), 0)} รายการ
                                    </td>
                                    <td colSpan={3} className="border border-slate-300"/>
                                </tr>
                            </tbody>
                        </table>

                        {/* ═══ SIGNATURES ═══ */}
                        <table className="w-full border-collapse border border-t-0 border-slate-800 text-xs">
                            <tbody>
                                <tr>
                                    {[
                                        { role: "ผู้ขอเบิก", en: "Requester", name: submitted.requesterName },
                                        { role: "หัวหน้าแผนก", en: "Supervisor", name: "" },
                                        { role: "ผู้อนุมัติ (คลัง)", en: "Warehouse Approver", name: "" },
                                        { role: "ผู้จ่ายสินค้า", en: "Issued By", name: "" },
                                    ].map(s => (
                                        <td key={s.role} className="border border-slate-200 p-3 text-center align-bottom w-1/4">
                                            <div className="h-12 flex items-end justify-center pb-1">
                                                {s.name && <span className="text-[10px] font-bold text-slate-700">{s.name}</span>}
                                            </div>
                                            <div className="border-t border-slate-800 pt-1.5">
                                                <p className="font-black text-slate-800 text-[10px]">{s.role}</p>
                                                <p className="text-slate-400 text-[9px]">({s.en})</p>
                                                <p className="text-slate-400 text-[9px] mt-1">วันที่ ................................</p>
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>

                        {/* ═══ ISO FOOTER ═══ */}
                        <div className="border border-t-0 border-slate-800 px-3 py-1.5 flex justify-between items-center bg-slate-50">
                            <p className="text-[8px] text-slate-400">เอกสารนี้ควบคุมภายใต้ระบบ ISO 9001:2015 · ห้ามดัดแปลงหรือทำสำเนาโดยไม่ได้รับอนุญาต</p>
                            <p className="text-[8px] text-slate-400">FM-WH-001 Rev.01 · พิมพ์: {new Date().toLocaleString('th-TH')}</p>
                        </div>

                    </div>
                </div>
            </>
        );
    }

    // ─── Request Form View ────────────────────────────────────────────────────
    return (
        <Layout>
            <div className="max-w-2xl mx-auto pb-24 animate-fade-up">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 hover:bg-slate-50 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">สร้างใบขอเบิกสินค้า</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">New Issue Request</p>
                    </div>
                </div>

                {/* Operation Type */}
                <div className="mb-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ประเภทคำขอ *</label>
                    <div className="grid grid-cols-3 gap-2">
                        {OP_TYPES.map(op => (
                            <button key={op.key} onClick={() => setOperationType(op.key)}
                                className={`px-3 py-2.5 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                    operationType === op.key ? "border-rose-500 bg-rose-50" : "border-slate-100 bg-white"
                                }`}>
                                <span className="text-lg">{op.icon}</span>
                                <div className="text-left">
                                    <p className={`font-black text-xs ${operationType === op.key ? "text-rose-600" : "text-slate-700"}`}>{op.label}</p>
                                    <p className="text-[9px] text-slate-400 leading-tight">{op.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Warehouse Selector */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                {operationType === "transfer" ? "จากคลัง" : "ตัด/เบิกจากคลัง"}
                            </label>
                            <select value={fromWh} onChange={e => setFromWh(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none">
                                {WAREHOUSES.map(w => <option key={w.code} value={w.code}>{w.code} — {w.name}</option>)}
                            </select>
                        </div>
                        {operationType === "transfer" && (
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">ไปคลัง</label>
                                <select value={toWh} onChange={e => setToWh(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-rose-500 outline-none">
                                    {WAREHOUSES.filter(w => w.code !== fromWh).map(w => <option key={w.code} value={w.code}>{w.code} — {w.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Type Selection */}
                <div className="mb-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ประเภทสินค้า *</label>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { key: "FINISH_GOODS", label: "Finish Goods", sub: "สำเร็จรูป", icon: "📦" },
                            { key: "RAW_MATERIAL", label: "Raw Material", sub: "วัตถุดิบ", icon: "🏗️" }
                        ].map(t => (
                            <button key={t.key} onClick={() => setSelectedType(t.key)}
                                className={`px-4 py-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                                    selectedType === t.key ? "border-rose-500 bg-rose-50" : "border-slate-100 bg-white"
                                }`}>
                                <span className="text-2xl">{t.icon}</span>
                                <div>
                                    <p className={`font-black text-sm ${selectedType === t.key ? "text-rose-600" : "text-slate-700"}`}>{t.label}</p>
                                    <p className="text-[9px] text-slate-400 uppercase tracking-wide">{t.sub}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Requester Info */}
                <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 mb-5 space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1 h-3 bg-rose-500 rounded-full" /> ข้อมูลผู้ขอ
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ชื่อผู้ขอ *</label>
                            <input
                                type="text"
                                value={requesterName}
                                onChange={e => setRequesterName(e.target.value)}
                                placeholder="ระบุชื่อ-นามสกุล"
                                className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold focus:ring-4 focus:ring-rose-100 focus:bg-white outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">แผนก / ฝ่าย</label>
                            <input
                                type="text"
                                value={department}
                                onChange={e => setDepartment(e.target.value)}
                                placeholder="เช่น ฝ่ายผลิต"
                                className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold focus:ring-4 focus:ring-rose-100 focus:bg-white outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">วันที่ต้องใช้</label>
                            <input
                                type="date"
                                value={neededDate}
                                onChange={e => setNeededDate(e.target.value)}
                                className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold focus:ring-4 focus:ring-rose-100 focus:bg-white outline-none transition-all"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">วัตถุประสงค์ *</label>
                            <div className="flex flex-wrap gap-2">
                                {PURPOSES.map(p => (
                                    <button key={p} onClick={() => setPurpose(p)}
                                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                                            purpose === p ? "bg-rose-500 text-white border-rose-500" : "bg-slate-50 text-slate-600 border-slate-200"
                                        }`}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                            {purpose === "อื่นๆ" && (
                                <input type="text" value={purposeRemark}
                                    onChange={e => setPurposeRemark(e.target.value)}
                                    placeholder="ระบุวัตถุประสงค์..."
                                    className="mt-2 w-full p-3 bg-slate-50 rounded-2xl border border-rose-200 text-sm font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Product Search */}
                <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 mb-5">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <div className="w-1 h-3 bg-rose-500 rounded-full" /> ค้นหาและเลือกสินค้า
                    </h4>
                    <div className="relative" ref={searchRef}>
                        <div className="relative">
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            <input
                                type="text"
                                placeholder="พิมพ์ชื่อหรือรหัสสินค้า..."
                                value={search}
                                onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                                onFocus={() => setShowDropdown(true)}
                                className="w-full pl-10 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold focus:ring-4 focus:ring-rose-100 focus:bg-white outline-none transition-all"
                            />
                        </div>
                        {showDropdown && filteredProducts.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-30 max-h-64 overflow-y-auto">
                                {filteredProducts.map(p => (
                                    <button key={p.PROD_CD} onMouseDown={() => addItem(p)}
                                        className="w-full p-4 text-left hover:bg-rose-50 border-b border-slate-50 last:border-0 flex justify-between items-center group transition-colors">
                                        <div>
                                            <p className="font-black text-slate-900 text-sm group-hover:text-rose-600">{p.PROD_DES}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{p.PROD_CD}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xs font-black ${p.QTY > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {p.QTY ?? 0} {p.UNIT_CD || 'หน่วย'}
                                            </p>
                                            <p className="text-[9px] text-slate-400">{fromWh}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Items List */}
                    {items.length > 0 && (
                        <div className="mt-4 space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">รายการที่เลือก ({items.length})</p>
                            {items.map((item, idx) => (
                                <div key={item.productCode} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-black text-slate-300 w-5">{idx + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-slate-900 text-sm truncate">{item.productName}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{item.productCode} · {item.unit}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="text-[9px] font-black text-slate-400 uppercase">จำนวน</label>
                                            <input type="number" min="0.01" step="0.01" value={item.quantity}
                                                onChange={e => updateItem(item.productCode, 'quantity', parseFloat(e.target.value) || 0)}
                                                className="w-20 p-2 bg-white rounded-xl border border-slate-200 text-center text-sm font-black focus:ring-2 focus:ring-rose-500 outline-none"
                                            />
                                            {item.currentQty !== undefined && (
                                                <span className={`text-[9px] font-black ${item.currentQty >= item.quantity ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    /{item.currentQty}
                                                </span>
                                            )}
                                            <button onClick={() => removeItem(item.productCode)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                                            </button>
                                        </div>
                                    </div>
                                    <input type="text" value={item.remarks || ""}
                                        onChange={e => updateItem(item.productCode, 'remarks', e.target.value)}
                                        placeholder="หมายเหตุสินค้า (ถ้ามี)..."
                                        className="w-full p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-rose-100 outline-none text-slate-600"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Remarks */}
                <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 mb-8">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <div className="w-1 h-3 bg-rose-500 rounded-full" /> หมายเหตุเพิ่มเติม
                    </h4>
                    <textarea
                        value={remarks}
                        onChange={e => setRemarks(e.target.value)}
                        placeholder="ระบุรายละเอียดเพิ่มเติม..."
                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold h-24 resize-none focus:ring-4 focus:ring-rose-100 focus:bg-white outline-none transition-all"
                    />
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={loading || items.length === 0}
                    className={`w-full py-5 rounded-[2rem] font-black text-lg shadow-xl transition-all flex items-center justify-center gap-3 ${
                        loading || items.length === 0
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-rose-500 to-red-600 text-white hover:scale-[1.02] active:scale-95 shadow-rose-200"
                    }`}
                >
                    {loading ? (
                        <>
                            <span className="w-6 h-6 border-4 border-rose-300 border-t-white rounded-full animate-spin" />
                            <span>กำลังบันทึก...</span>
                        </>
                    ) : (
                        <>
                            <span>ส่งคำขอเบิก</span>
                            <span className="text-2xl">📤</span>
                        </>
                    )}
                </button>
            </div>
        </Layout>
    );
}

function InfoRow({ label, value, valueClass = "text-slate-900" }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <span className={`text-sm font-bold ${valueClass}`}>{value}</span>
        </div>
    );
}
