import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import Loading from "../components/Loading";
import { supabase } from "../lib/supabase";

const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function FinancePage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [showDebtModal, setShowDebtModal] = useState(null);
    const [debtInvoices, setDebtInvoices] = useState([]);
    const [loadingDebt, setLoadingDebt] = useState(false);
    const [selectedPayInvoice, setSelectedPayInvoice] = useState(null);
    const [slipFile, setSlipFile] = useState(null);
    const [uploadingSlip, setUploadingSlip] = useState(false);
    const [syncingInvoices, setSyncingInvoices] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch overall aging stats
            const res = await fetch('/api/dashboard-data?dateType=monthly');
            const json = await res.json();
            if (res.ok) setData(json);
        } catch (err) {
            console.error("Finance error:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserEmail(session.user.email);
                const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
                setRole(profile?.role || "sale");
            }
        };
        fetchUser();
        fetchData();
    }, []);

    const fetchDebtDetail = async (range) => {
        setLoadingDebt(true);
        setShowDebtModal(range);
        try {
            const params = new URLSearchParams({ range });
            const res = await fetch(`/api/receivables?${params}`);
            const result = await res.json();
            setDebtInvoices(result);
        } catch (err) {
            console.error("Fetch debt detail error:", err);
        } finally {
            setLoadingDebt(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSyncingInvoices(true);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target.result.split(',')[1];
                const res = await fetch("/api/upload-invoices", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileData: base64 })
                });
                const result = await res.json();
                if (result.success) {
                    alert(`อัปโหลดสำเร็จ! นำเข้าข้อมูล ${result.count} รายการ`);
                    fetchData();
                } else {
                    alert(`เกิดข้อผิดพลาด: ${result.error}`);
                }
                setSyncingInvoices(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            alert(`Error: ${err.message}`);
            setSyncingInvoices(false);
        }
    };

    const handlePaymentSubmit = async () => {
        if (!selectedPayInvoice || !slipFile) {
            alert("กรุณาอัปโหลดหลักฐานการโอนเงิน (Slip)");
            return;
        }

        setUploadingSlip(true);
        try {
            const fileExt = slipFile.name.split('.').pop();
            const fileName = `${selectedPayInvoice.invoice_no}_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('slips')
                .upload(fileName, slipFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('slips').getPublicUrl(fileName);

            const res = await fetch("/api/receivables", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    invoice_nos: [selectedPayInvoice.invoice_no], 
                    status: 'paid',
                    slip_url: publicUrl 
                })
            });
            const result = await res.json();
            
            if (result.success) {
                alert("บันทึกการชำระเงินสำเร็จ");
                setSelectedPayInvoice(null);
                setSlipFile(null);
                fetchDebtDetail(showDebtModal);
                fetchData();
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setUploadingSlip(false);
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(val || 0);

    if (loading || !data) return <Layout><Loading /></Layout>;

    return (
        <Layout>
            <div className="min-h-screen bg-[#F8FAFF] pb-20 px-4 md:px-8">
                <div className="max-w-7xl mx-auto pt-8 mb-12">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="animate-slide-up">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-emerald-500/20 backdrop-blur-md">
                                    บัญชี การเงิน
                                </span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                                จัดการ <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">ลูกหนี้ค้างชำระ</span>
                            </h1>
                            <p className="text-slate-400 font-medium text-lg mt-2">
                                ตรวจสอบและบันทึกการชำระเงิน พร้อมระบบ Aging รายงานหนี้
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <input 
                                id="ecount-upload"
                                type="file" 
                                accept=".xlsx,.xls,.csv" 
                                className="hidden" 
                                onChange={handleFileUpload}
                            />
                            <button 
                                onClick={() => document.getElementById('ecount-upload').click()}
                                disabled={syncingInvoices}
                                className={`px-8 py-4 rounded-3xl text-sm font-black uppercase tracking-widest transition-all shadow-xl ${syncingInvoices ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-black hover:shadow-emerald-500/10 active:scale-95'}`}
                            >
                                {syncingInvoices ? '正在上传...' : '📤 อัปโหลดไฟล์ Ecount'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto space-y-12">
                    {/* Aging Section */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {[
                            { range: '0-30', label: '0 - 30 วัน', color: 'blue', grad: 'from-blue-600 to-blue-700', text: 'blue-100', desc: 'ยอดค้างชำระปกติ' },
                            { range: '31-60', label: '31 - 60 วัน', color: 'amber', grad: 'from-amber-500 to-amber-600', text: 'amber-50', desc: 'เริ่มค้างชำระ' },
                            { range: '61-90', label: '61 - 90 วัน', color: 'orange', grad: 'from-orange-500 to-orange-600', text: 'orange-50', desc: 'ค้างชำระเกินกำหนด' },
                            { range: '91+', label: '91 วันขึ้นไป', color: 'rose', grad: 'from-rose-600 to-rose-700', text: 'rose-50', desc: 'หนี้สงสัยจะสูญ' }
                        ].map((d, i) => {
                            const stats = data?.agingData?.[d.range] || { amount: 0, count: 0 };
                            return (
                                <div key={i} className="group cursor-pointer" onClick={() => fetchDebtDetail(d.range)}>
                                    <div className={`relative h-64 rounded-[3.5rem] bg-gradient-to-br ${d.grad} overflow-hidden shadow-2xl transition-all duration-700 hover:scale-[1.05]`}>
                                        <div className="relative z-10 h-full flex flex-col items-center justify-between p-8">
                                            <div className="text-center">
                                                <div className={`text-[10px] font-black text-${d.text} uppercase tracking-[0.3em] mb-1 opacity-80`}>{d.label}</div>
                                                <div className="text-2xl font-black text-white tracking-tight">{formatCurrency(stats.amount)}</div>
                                            </div>
                                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center text-xl shadow-inner">💸</div>
                                            <div className="w-full bg-white/10 backdrop-blur-md rounded-3xl p-2 flex items-center justify-between border border-white/10">
                                                <span className={`text-[10px] font-black text-${d.text} uppercase tracking-widest`}>{stats.count} รายการ</span>
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">คลิกดู</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 px-2">
                                        <h4 className="text-sm font-black text-slate-900">{d.label}</h4>
                                        <p className="text-xs text-slate-400 font-medium">{d.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Debt List Modal */}
                {showDebtModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowDebtModal(null)}></div>
                        <div className="relative bg-white w-full max-w-4xl max-h-[85vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-100">
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                <h3 className="text-xl font-black text-slate-900">รายการค้างชำระ ({showDebtModal} วัน)</h3>
                                <button onClick={() => setShowDebtModal(null)} className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all shadow-sm">✕</button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8">
                                {loadingDebt ? (
                                    <div className="flex flex-col items-center justify-center py-20"><Loading /></div>
                                ) : (
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                                                <th className="pb-4 text-left">เลขที่ / วันที่</th>
                                                <th className="pb-4 text-left">ลูกค้า / PIC</th>
                                                <th className="pb-4 text-right">ยอดค้างชำระ</th>
                                                <th className="pb-4 text-center">จัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {debtInvoices.map((inv, idx) => (
                                                <tr key={idx} className="group hover:bg-slate-50/50 transition-all">
                                                    <td className="py-4">
                                                        <div className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{inv.invoice_no}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{formatDate(inv.invoice_date)}</div>
                                                    </td>
                                                    <td className="py-4">
                                                        <div className="text-sm font-bold text-slate-700">{inv.customer_name}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">PIC: {inv.pic_name || inv.pic_code || '-'}</div>
                                                    </td>
                                                    <td className="py-4 text-right font-black text-slate-900">{formatCurrency(inv.outstanding_amount)}</td>
                                                    <td className="py-4 text-center">
                                                        <button 
                                                            onClick={() => setSelectedPayInvoice(inv)}
                                                            className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                        >
                                                            ยืนยันการชำระเงิน
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Payment Modal */}
                {selectedPayInvoice && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-lg" onClick={() => !uploadingSlip && setSelectedPayInvoice(null)}></div>
                        <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-zoom-in border border-white">
                            <div className="p-8 bg-emerald-600 text-white">
                                <h3 className="text-2xl font-black mb-1">ยืนยันการชำระเงิน</h3>
                                <p className="text-emerald-100 text-sm font-bold uppercase tracking-widest">{selectedPayInvoice.invoice_no}</p>
                            </div>
                            <div className="p-10 space-y-8">
                                <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                                    <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">ยอดที่ต้องชำระ</span>
                                    <span className="text-3xl font-black text-slate-900">{formatCurrency(selectedPayInvoice.outstanding_amount)}</span>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">อัปโหลดหลักฐานการโอนเงิน (Slip)</p>
                                    <div className="relative group">
                                        <input type="file" accept="image/*" onChange={(e) => setSlipFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
                                        <div className={`h-40 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${slipFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 group-hover:border-emerald-400 group-hover:bg-emerald-50'}`}>
                                            <span className="text-3xl">{slipFile ? '✅' : '📸'}</span>
                                            <p className={`text-xs font-black uppercase tracking-widest ${slipFile ? 'text-emerald-600' : 'text-slate-400'}`}>{slipFile ? slipFile.name : 'คลิกเพื่อเลือกไฟล์ภาพ Slip'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button onClick={() => setSelectedPayInvoice(null)} disabled={uploadingSlip} className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black text-sm uppercase tracking-widest">ยกเลิก</button>
                                    <button onClick={handlePaymentSubmit} disabled={uploadingSlip || !slipFile} className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${uploadingSlip || !slipFile ? 'bg-slate-200 text-slate-400' : 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 active:scale-95'}`}>{uploadingSlip ? 'กำลังบันทึก...' : 'ยืนยันการชำระ'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <style jsx global>{`
                    @keyframes slide-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                    @keyframes zoom-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                    .animate-slide-up { animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                    .animate-zoom-in { animation: zoom-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                `}</style>
            </div>
        </Layout>
    );
}
