import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import Loading from "../components/Loading";
import { supabase } from "../lib/supabase";
import dynamic from 'next/dynamic';
import DashboardCalendar from "../components/DashboardCalendar";

// Map removed as requested

const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatThaiMonth = (date) => {
    return new Date(date).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
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
    const [showDebtModal, setShowDebtModal] = useState(null);
    const [debtInvoices, setDebtInvoices] = useState([]);
    const [loadingDebt, setLoadingDebt] = useState(false);
    const [syncingInvoices, setSyncingInvoices] = useState(false);
    const [selectedPayInvoice, setSelectedPayInvoice] = useState(null);
    const [selectedPrintInvoice, setSelectedPrintInvoice] = useState(null);
    const [slipFile, setSlipFile] = useState(null);
    const [uploadingSlip, setUploadingSlip] = useState(false);
    const [selectedInvoices, setSelectedInvoices] = useState([]);

    const fetchData = async () => {
        if (!userEmail || !role) return;
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
    };

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

    const handlePrintPOS = (inv) => {
        setSelectedPrintInvoice(inv);
        setTimeout(() => {
            let iframe = document.getElementById('print-pos-iframe');
            if (!iframe) {
                iframe = document.createElement('iframe');
                iframe.id = 'print-pos-iframe';
                iframe.style.display = 'none';
                document.body.appendChild(iframe);
            }

            const doc = iframe.contentWindow.document;
            const content = document.getElementById('pos-receipt-content').innerHTML;
            
            doc.open();
            doc.write(`
                <html>
                <head>
                    <meta charset="utf-8"/>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;700&display=swap');
                        body { font-family: 'Prompt', sans-serif; width: 80mm; margin: 0; padding: 4mm; font-size: 11px; color: black; }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .font-bold { font-weight: bold; }
                        .divider { border-top: 1px dashed black; margin: 2mm 0; }
                        .receipt-row { display: flex; justify-content: space-between; margin-bottom: 1mm; }
                        .receipt-total { font-size: 14px; font-weight: bold; display: flex; justify-content: space-between; margin-top: 2mm; }
                        @media print { @page { margin: 0; size: 80mm auto; } }
                    </style>
                </head>
                <body onload="window.print()">
                    ${content}
                </body>
                </html>
            `);
            doc.close();
        }, 500);
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

    const fetchDebtDetail = async (range) => {
        setLoadingDebt(true);
        setShowDebtModal(range);
        try {
            const params = new URLSearchParams({ 
                range, 
                pic_code: role === 'sale' ? userEmail : selectedUser 
            });
            const res = await fetch(`/api/receivables?${params}`);
            const result = await res.json();
            setDebtInvoices(result);
            setSelectedInvoices([]);
        } catch (err) {
            console.error("Fetch debt detail error:", err);
        } finally {
            setLoadingDebt(false);
        }
    };

    useEffect(() => {
        fetchData();
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
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-blue-500/20 backdrop-blur-md">
                                    {dateType === 'daily' ? 'รายวัน' : dateType === 'monthly' ? 'รายเดือน' : 'กำหนดเอง'}
                                </span>
                                <span className="text-slate-300">/</span>
                                <span className="text-slate-900 font-bold text-sm">
                                    {dateType === 'daily' ? formatDate(new Date()) : dateType === 'monthly' ? formatThaiMonth(new Date()) : `${formatDate(startDate)} - ${formatDate(endDate)}`}
                                </span>
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                                แดชบอร์ด <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">การขาย</span>
                            </h1>
                            <p className="text-slate-400 font-medium text-lg mt-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                วิเคราะห์ประสิทธิภาพและเป้าหมายเชิงลึกประจำชุดข้อมูลนี้
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

                            <div className="flex bg-slate-200/50 backdrop-blur-md p-1.5 rounded-[1.5rem] border border-white/50 shadow-inner">
                                {['daily', 'monthly', 'custom'].map((type) => (
                                    <button 
                                        key={type}
                                        onClick={() => setDateType(type)} 
                                        className={`px-8 py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all duration-500 ${dateType === type ? "bg-white text-blue-600 shadow-xl shadow-blue-500/10 scale-105" : "text-slate-500 hover:text-slate-800"}`}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                        {/* Revenue Card - Inspired by the Vibrant Apple Intelligence Card */}
                        <div className="group cursor-pointer">
                            <div className="relative h-80 rounded-[3.5rem] bg-gradient-to-br from-[#1d1d1f] to-[#434344] overflow-hidden shadow-2xl transition-all duration-700 hover:scale-[1.02] hover:shadow-blue-500/10">
                                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-transparent to-indigo-500/20 opacity-60"></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/30 rounded-full blur-[80px] group-hover:bg-blue-400/40 transition-all duration-700"></div>
                                
                                <div className="relative z-10 h-full flex flex-col items-center justify-between p-8">
                                    <div className="text-center">
                                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-1">ยอดขายทั้งหมด</div>
                                        <div className="text-3xl font-black text-white tracking-tight">{formatCurrency(data.totalAmount)}</div>
                                    </div>
                                    
                                    {/* Central Visual */}
                                    <div className="text-7xl group-hover:scale-110 transition-transform duration-700">💰</div>

                                    {/* Pill UI element from the image */}
                                    <div className="w-full bg-white/10 backdrop-blur-2xl rounded-3xl p-1.5 flex gap-1 border border-white/10 shadow-lg">
                                        <div className="flex-1 py-2 rounded-2xl bg-white/10 text-white text-[10px] font-black text-center uppercase tracking-widest">เติบโต</div>
                                        <div className="flex-1 py-2 rounded-2xl bg-blue-600 text-white text-[10px] font-black text-center uppercase tracking-widest">+12%</div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 px-2">
                                <h4 className="text-sm font-black text-slate-900">ยอดขายรวมรายเดือน</h4>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed">วิเคราะห์ผลประกอบการจากทุกช่องทางแบบ Real-time</p>
                            </div>
                        </div>

                        {/* Visits Card - Clean White Style */}
                        <div className="group cursor-pointer">
                            <div className="relative h-80 rounded-[3.5rem] bg-[#F5F5F7] overflow-hidden shadow-xl transition-all duration-700 hover:scale-[1.02]">
                                <div className="relative z-10 h-full flex flex-col items-center justify-between p-8">
                                    <div className="text-center">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">การเข้าพบลูกค้า</div>
                                        <div className="text-4xl font-black text-slate-900 tracking-tight">{data.checkInCount}</div>
                                    </div>

                                    {/* Message Bubble Visual from the image */}
                                    <div className="w-40 h-24 bg-blue-500 rounded-[2rem] flex items-center justify-center p-4 relative shadow-lg shadow-blue-500/20 group-hover:rotate-3 transition-transform duration-700">
                                        <div className="text-white text-xs font-bold text-center leading-tight">พนักงานขายได้มีการเข้าพบลูกค้าในช่วงเวลาที่เลือก</div>
                                        <div className="absolute -bottom-2 right-6 w-6 h-6 bg-blue-500 rotate-45"></div>
                                    </div>

                                    <div className="w-full bg-slate-200/50 backdrop-blur-md rounded-3xl p-1.5 flex gap-1 border border-white/50">
                                        <div className="flex-1 py-2 rounded-2xl bg-white text-slate-900 text-[10px] font-black text-center uppercase tracking-widest">เป้าหมาย</div>
                                        <div className="flex-1 py-2 rounded-2xl text-slate-400 text-[10px] font-black text-center uppercase tracking-widest">80%</div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 px-2">
                                <h4 className="text-sm font-black text-slate-900">การเข้าพบลูกค้า</h4>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed">สรุปจำนวนการ Check-in และกิจกรรมหน้างานของทีมขาย</p>
                            </div>
                        </div>

                        {/* Order Card - Image Focused Style */}
                        <div className="group cursor-pointer">
                            <div className="relative h-80 rounded-[3.5rem] bg-gradient-to-br from-indigo-50 to-white overflow-hidden shadow-xl transition-all duration-700 hover:scale-[1.02]">
                                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=400')] bg-cover bg-center opacity-10 group-hover:scale-110 transition-transform duration-[2s]"></div>
                                
                                <div className="relative z-10 h-full flex flex-col items-center justify-between p-8">
                                    <div className="text-center">
                                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">ใบสั่งขาย (SO)</div>
                                        <div className="text-4xl font-black text-slate-900 tracking-tight">{data.soCount}</div>
                                    </div>

                                    <div className="text-6xl group-hover:translate-y-[-10px] transition-transform duration-700">📄</div>

                                    <div className="w-full bg-white/80 backdrop-blur-md rounded-3xl p-3 flex items-center justify-between border border-white shadow-lg">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">เฉลี่ย / SO</span>
                                        <span className="text-xs font-black text-indigo-600">{formatCurrency(data.totalAmount / (data.soCount || 1))}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 px-2">
                                <h4 className="text-sm font-black text-slate-900">รายการใบสั่งขาย</h4>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed">ข้อมูลสรุปจำนวนออเดอร์และยอดขายเฉลี่ยต่อบิล</p>
                            </div>
                        </div>

                        {/* Leads Card - Minimalist Style */}
                        <div className="group cursor-pointer">
                            <div className="relative h-80 rounded-[3.5rem] bg-white overflow-hidden shadow-xl border border-slate-100 transition-all duration-700 hover:scale-[1.02] hover:border-blue-100">
                                <div className="relative z-10 h-full flex flex-col items-center justify-between p-8">
                                    <div className="text-center">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">ลูกค้าใหม่</div>
                                        <div className="text-4xl font-black text-slate-900 tracking-tight">{data.visitNew}</div>
                                    </div>

                                    <div className="flex -space-x-4">
                                        {[1,2,3,4].map(i => (
                                            <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-xl shadow-md transition-transform group-hover:translate-x-2">👤</div>
                                        ))}
                                    </div>

                                    <div className="w-full py-3 rounded-3xl bg-slate-900 text-white text-[10px] font-black text-center uppercase tracking-[0.2em] shadow-lg shadow-slate-200">
                                        ดูรายละเอียด
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 px-2">
                                <h4 className="text-sm font-black text-slate-900">ฐานลูกค้าใหม่</h4>
                                <p className="text-xs text-slate-400 font-medium leading-relaxed">จำนวนลูกค้าใหม่ที่เพิ่มขึ้นในฐานข้อมูลระบบ</p>
                            </div>
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
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center text-lg">⚠️</span>
                                <h3 className="text-2xl font-black text-slate-900">วิเคราะห์หนี้คงค้าง <span className="text-rose-500">(Debt Aging)</span></h3>
                            </div>
                            <div className="flex gap-4">
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
                                    className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${syncingInvoices ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-black active:scale-95'}`}
                                >
                                    {syncingInvoices ? 'กำลังอัปโหลด...' : 'อัปโหลดไฟล์ Ecount'}
                                </button>
                            </div>
                        </div>
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
                                        <div className={`relative h-64 rounded-[3.5rem] bg-gradient-to-br ${d.grad} overflow-hidden shadow-2xl transition-all duration-700 hover:scale-[1.05] hover:shadow-${d.color}-500/20`}>
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full translate-x-10 -translate-y-10"></div>
                                            <div className="relative z-10 h-full flex flex-col items-center justify-between p-8">
                                                <div className="text-center">
                                                    <div className={`text-[10px] font-black text-${d.text} uppercase tracking-[0.3em] mb-1 opacity-80`}>{d.label}</div>
                                                    <div className="text-2xl font-black text-white tracking-tight">{formatCurrency(stats.amount)}</div>
                                                </div>
                                                
                                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center text-xl shadow-inner">💰</div>

                                                <div className="w-full bg-white/10 backdrop-blur-md rounded-3xl p-2 flex items-center justify-between border border-white/10 shadow-sm">
                                                    <span className={`text-[10px] font-black text-${d.text} uppercase tracking-widest`}>{stats.count} รายการ</span>
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">ดูรายละเอียด</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 px-2">
                                            <h4 className="text-sm font-black text-slate-900">{d.label}</h4>
                                            <p className="text-xs text-slate-400 font-medium leading-relaxed">{d.desc}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>


                    {/* SKU Analysis & Radar Section - Redesigned to Apple Style */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* SKU Sales Table */}
                        <div className="lg:col-span-2 group">
                            <div className="bg-white rounded-[3.5rem] p-10 shadow-xl border border-slate-100 transition-all duration-700 hover:shadow-2xl">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-2xl font-black text-slate-900">ยอดขายราย <span className="text-blue-600">SKU</span></h3>
                                    <button className="text-sm font-bold text-blue-600 hover:underline">ดูทั้งหมด</button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                                                <th className="pb-6">สินค้า</th>
                                                <th className="pb-6">จำนวน (Unit)</th>
                                                <th className="pb-6 text-right">มูลค่ารวม (THB)</th>
                                                <th className="pb-6 text-center">สัดส่วน</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {data.bestSellingProducts?.map((sku, i) => (
                                                <tr key={i} className="group/row hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-[1.25rem] bg-slate-50 flex items-center justify-center text-xl shadow-inner group-hover/row:scale-110 transition-transform">📦</div>
                                                            <span className="font-bold text-slate-800 text-sm line-clamp-1">{sku.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-6 font-black text-slate-600">{sku.qty.toLocaleString()}</td>
                                                    <td className="py-6 text-right font-black text-slate-900">{formatCurrency(sku.amount)}</td>
                                                    <td className="py-6">
                                                        <div className="flex items-center justify-center">
                                                            <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]" style={{ width: `${Math.min(100, (sku.amount / data.totalAmount) * 200)}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="mt-4 px-4">
                                <h4 className="text-sm font-black text-slate-900">การจัดอันดับสินค้า</h4>
                                <p className="text-xs text-slate-400 font-medium">วิเคราะห์สินค้าที่มียอดขายสูงสุดและสัดส่วนในพอร์ตโฟลิโอ</p>
                            </div>
                        </div>

                        {/* Visit Activity - Apple Intelligence Dark Style */}
                        <div className="group">
                            <div className="relative h-full min-h-[500px] rounded-[3.5rem] bg-slate-900 overflow-hidden shadow-2xl transition-all duration-700 hover:scale-[1.01]">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
                                <div className="relative z-10 h-full flex flex-col items-center justify-between p-10">
                                    <div className="text-center">
                                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-2">สรุปกิจกรรม</div>
                                        <h3 className="text-3xl font-black text-white">กิจกรรม <span className="text-blue-400">การพบลูกค้า</span></h3>
                                    </div>
                                    
                                    <div className="relative w-56 h-56 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="112" cy="112" r="90" stroke="currentColor" strokeWidth="16" fill="transparent" className="text-slate-800" />
                                            <circle cx="112" cy="112" r="90" stroke="currentColor" strokeWidth="16" fill="transparent" 
                                                strokeDasharray={2 * Math.PI * 90}
                                                strokeDashoffset={2 * Math.PI * 90 * (1 - (data.purposes.pitch / (totalPurposes || 1)))}
                                                className="text-blue-500 transition-all duration-1000 shadow-[0_0_20px_rgba(37,99,235,0.5)]"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute flex flex-col items-center">
                                            <span className="text-5xl font-black text-white tracking-tight">{totalPurposes}</span>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ครั้งทั้งหมด</span>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full space-y-3">
                                        {[
                                            { label: 'เสนอขาย', val: data.purposes.pitch, color: 'blue', icon: '💰' },
                                            { label: 'ตรวจร้าน', val: data.purposes.inspection, color: 'indigo', icon: '📋' },
                                            { label: 'เก็บหนี้', val: data.purposes.collection, color: 'rose', icon: '💸' }
                                        ].map((p, i) => (
                                            <div key={i} className="flex items-center justify-between bg-white/5 backdrop-blur-md p-4 rounded-[1.5rem] border border-white/5 hover:bg-white/10 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg">{p.icon}</span>
                                                    <span className="text-sm font-bold text-slate-300">{p.label}</span>
                                                </div>
                                                <span className="font-black text-white">{p.val} <span className="text-[10px] text-slate-500">ครั้ง</span></span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 px-4">
                                <h4 className="text-sm font-black text-slate-900">สัดส่วนกิจกรรมการตลาด</h4>
                                <p className="text-xs text-slate-400 font-medium">ภาพรวมจุดประสงค์ของการเข้าพบลูกค้าในแต่ละครั้ง</p>
                            </div>
                        </div>
                    </div>

                    {/* Team Radar Map - Premium */}
                    {/* Map Section Removed */}

                    {/* Full Page Calendar Section */}
                    <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-slate-100">
                        <div className="flex items-center justify-between mb-10">
                            <h3 className="text-3xl font-black text-slate-900 flex items-center gap-4">
                                <span className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">📅</span>
                                ปฏิทิน <span className="text-blue-600">งานขาย</span>
                            </h3>
                            <div className="flex bg-slate-100 p-1 rounded-2xl">
                                <button className="px-6 py-2 rounded-xl bg-white shadow-sm text-xs font-black text-blue-600 uppercase">มุมมองปฏิทิน</button>
                            </div>
                        </div>
                        <div className="min-h-[700px]">
                            <DashboardCalendar visits={data.allVisits || []} filters={data.filters} onVisitClick={setSelectedVisit} />
                        </div>
                    </div>

                    {/* Activity Feed & Team Insights Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                        {/* Activity Feed */}
                        <div className="lg:col-span-3 space-y-8">
                            <div className="flex items-center justify-between mb-4 px-2">
                                <h3 className="text-2xl font-black text-slate-900">กิจกรรม <span className="text-blue-600">ล่าสุด</span></h3>
                                <button className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">ย้อนหลังทั้งหมด</button>
                            </div>
                            <div className="space-y-6">
                                {data.recentVisits?.map((visit, idx) => (
                                    <div key={idx} onClick={() => setSelectedVisit(visit)} className="group cursor-pointer flex gap-6">
                                        <div className="flex flex-col items-center">
                                            <div className="w-14 h-14 rounded-[1.5rem] bg-white shadow-xl border border-slate-50 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                                {visit.purpose === 'sales' ? '💰' : visit.purpose === 'inspection' ? '📋' : '📍'}
                                            </div>
                                            <div className="w-0.5 h-full bg-slate-100/50 my-2"></div>
                                        </div>
                                        <div className="flex-1 bg-white p-6 rounded-[2.5rem] border border-slate-100 group-hover:shadow-2xl group-hover:-translate-y-1 transition-all duration-500">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-black text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{visit.customer_name}</h4>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{visit.sales_person}</p>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-300">{new Date(visit.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                                            </div>
                                            <p className="text-sm text-slate-500 line-clamp-2 mt-2 font-medium leading-relaxed">{visit.notes || 'บันทึกการเข้าพบลูกค้าและพูดคุยสถานะทั่วไป'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Leaderboard & Performance - Moved Below Calendar as requested */}
                        <div className="lg:col-span-2 space-y-10">
                            {/* Team Leaderboard */}
                            <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-slate-100">
                                <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-500 flex items-center justify-center">🏆</span>
                                    อันดับพนักงานขาย
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

                            {/* Overall Performance */}
                            <div className="group">
                                <div className="relative bg-blue-600 rounded-[3.5rem] p-10 shadow-2xl shadow-blue-300 text-white overflow-hidden transition-all duration-700 hover:scale-[1.02]">
                                    <div className="absolute -right-4 -bottom-4 text-9xl opacity-10 group-hover:scale-110 transition-transform">📊</div>
                                    <h3 className="text-2xl font-black mb-8">ประสิทธิภาพทีมงาน</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/10">
                                            <p className="text-[10px] font-bold text-blue-200 uppercase mb-2 tracking-widest">ระยะทางรวม</p>
                                            <p className="text-3xl font-black">{data.totalDistance?.toFixed(0)} <span className="text-sm opacity-60">km</span></p>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/10">
                                            <p className="text-[10px] font-bold text-blue-200 uppercase mb-2 tracking-widest">จุดที่มีความเสี่ยง</p>
                                            <p className="text-3xl font-black text-rose-300">{data.fraudCount} <span className="text-sm opacity-60">จุด</span></p>
                                        </div>
                                    </div>
                                    <div className="mt-8 py-4 px-6 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-center border border-white/5">
                                        ดูรายงานฉบับเต็ม
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

            {/* Debt Detail Modal */}
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
                                                    <div className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{inv.invoice_no}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{formatDate(inv.invoice_date)}</div>
                                                </td>
                                                <td className="py-4">
                                                    <div className="text-sm font-bold text-slate-700">{inv.customer_name}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">PIC: {inv.pic_name || inv.pic_code || '-'}</div>
                                                </td>
                                                <td className="py-4 text-right font-black text-slate-900">{formatCurrency(inv.outstanding_amount)}</td>
                                                 <td className="py-4 text-center">
                                                    <div className="flex gap-2 justify-center">
                                                        <button 
                                                            onClick={() => setSelectedPayInvoice(inv)}
                                                            className="px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                        >
                                                            ชำระเงิน
                                                        </button>
                                                        <button 
                                                            onClick={() => handlePrintPOS(inv)}
                                                            className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                                        >
                                                            พิมพ์ (POS)
                                                        </button>
                                                    </div>
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
                        <div className="p-8 bg-blue-600 text-white">
                            <h3 className="text-2xl font-black mb-1">ยืนยันการชำระเงิน</h3>
                            <p className="text-blue-100 text-sm font-bold uppercase tracking-widest">{selectedPayInvoice.invoice_no}</p>
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
                                    <div className={`h-40 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${slipFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 group-hover:border-blue-400 group-hover:bg-blue-50'}`}>
                                        <span className="text-3xl">{slipFile ? '✅' : '📸'}</span>
                                        <p className={`text-xs font-black uppercase tracking-widest ${slipFile ? 'text-emerald-600' : 'text-slate-400'}`}>{slipFile ? slipFile.name : 'คลิกเพื่อเลือกไฟล์ภาพ Slip'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button onClick={() => setSelectedPayInvoice(null)} disabled={uploadingSlip} className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all">ยกเลิก</button>
                                <button onClick={handlePaymentSubmit} disabled={uploadingSlip || !slipFile} className={`flex-1 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl ${uploadingSlip || !slipFile ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 active:scale-95'}`}>{uploadingSlip ? 'กำลังบันทึก...' : 'ยืนยันการชำระ'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .glass-card {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.05);
                }
                
                .glass-card:hover {
                    background: rgba(255, 255, 255, 0.85);
                    border: 1px solid rgba(255, 255, 255, 0.6);
                }

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

                /* Premium Hover Effects */
                .glass-card::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    padding: 2px;
                    background: linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.2), rgba(37,99,235,0.1));
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                    opacity: 0.5;
                    transition: opacity 0.5s ease;
                }
                .glass-card:hover::before {
                    opacity: 1;
                }

                @media print {
                    @page {
                        margin: 0;
                        size: 80mm auto;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #pos-receipt, #pos-receipt * {
                        visibility: visible;
                    }
                    #pos-receipt {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 80mm;
                        padding: 0;
                        margin: 0;
                        background: white;
                        color: black !important;
                    }
                    nav, footer, button, .no-print {
                        display: none !important;
                    }
                }

                .receipt-container {
                    font-family: 'Inter', 'Prompt', sans-serif;
                    padding: 5mm;
                    width: 80mm;
                    box-sizing: border-box;
                }
                .receipt-header {
                    text-align: center;
                    margin-bottom: 5mm;
                }
                .receipt-divider {
                    border-top: 1px dashed #000;
                    margin: 3mm 0;
                }
                .receipt-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 12px;
                    margin-bottom: 1mm;
                }
                .receipt-total {
                    font-size: 18px;
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                    margin-top: 2mm;
                }
            `}</style>

            {/* POS Receipt Data (Used by iframe) */}
            <div id="pos-receipt-content" className="hidden">
                {selectedPrintInvoice && (
                    <div className="receipt-container">
                        <div className="receipt-header text-center" style={{marginBottom: '4mm'}}>
                            <h2 style={{margin:0, fontSize: '18px'}}>H FORCE</h2>
                            <div style={{fontSize: '10px'}}>ใบกำกับภาษีอย่างย่อ (POS)</div>
                        </div>
                        
                        <div className="divider"></div>
                        
                        <div className="receipt-row">
                            <span>No:</span>
                            <span className="font-bold">{selectedPrintInvoice.invoice_no}</span>
                        </div>
                        <div className="receipt-row">
                            <span>Date:</span>
                            <span>{formatDate(selectedPrintInvoice.invoice_date)}</span>
                        </div>
                        <div className="receipt-row">
                            <span>Cust:</span>
                            <span>{selectedPrintInvoice.customer_name}</span>
                        </div>
                        
                        <div className="divider"></div>
                        
                        <div className="receipt-row font-bold">
                            <span>รายการ</span>
                            <span>ยอดรวม</span>
                        </div>
                        
                        <div className="receipt-row py-2">
                            <span>สินค้ารวมตามรายการ</span>
                            <span>{formatCurrency(selectedPrintInvoice.total_amount)}</span>
                        </div>
                        
                        <div className="divider"></div>
                        
                        <div className="receipt-total">
                            <span>ยอดรวมสุทธิ:</span>
                            <span>{formatCurrency(selectedPrintInvoice.total_amount)}</span>
                        </div>
                        
                        <div className="divider"></div>
                        
                        <div className="text-center" style={{marginTop: '5mm'}}>
                            <p style={{margin:0}}>*** ขอบคุณที่ใช้บริการ ***</p>
                            <p style={{marginTop: '4mm', opacity: 0.5, fontSize: '9px'}}>Powered by H Force Sales System</p>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
