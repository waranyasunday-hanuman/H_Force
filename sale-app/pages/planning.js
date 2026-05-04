import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabase";
import Swal from 'sweetalert2';
import AddPlanModal from "../components/AddPlanModal";

const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

const PURPOSE_CONFIG = {
    "นำเสนอสินค้า": { color: "bg-green-100 text-green-700 border-green-200",   dot: "bg-green-500",   label: "เสนอขาย" },
    "ตรวจเยี่ยม":    { color: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-500", label: "ตรวจร้าน" },
    "เก็บเงิน":      { color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500", label: "เก็บหนี้" },
    "ส่งของ":         { color: "bg-blue-100 text-blue-700 border-blue-200",       dot: "bg-blue-500",   label: "ส่งของ" },
    "วันหยุดประจำสัปดาห์": { color: "bg-slate-200 text-slate-700 border-slate-300", dot: "bg-slate-500", label: "วันหยุด" },
    "ทั่วไป":         { color: "bg-slate-100 text-slate-600 border-slate-200",    dot: "bg-slate-400",  label: "ทั่วไป" },
};
const DEFAULT_CFG = { color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400", label: "อื่นๆ" };

const THAI_MONTHS = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const THAI_DAYS_SHORT = ["อา.","จ.","อ.","พ.","พฤ.","ศ.","ส."];

export default function PlanningPage() {
    const toLocalDateStr = (date) => {
        if (!date) return null;
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const [user, setUser] = useState(null);
    const [plans, setPlans] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [viewingPlan, setViewingPlan] = useState(null);
    const [preselectedDate, setPreselectedDate] = useState("");
    const [planSOs, setPlanSOs] = useState({});

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
                fetchPlans(session.user.id);
            }
        };
        init();
    }, []);

    const fetchPlans = async (userId) => {
        const { data } = await supabase
            .from('sales_plans')
            .select('*')
            .eq('user_id', userId)
            .order('plan_time', { ascending: true });
        if (data) {
            setPlans(data);
            const planIds = data.map(p => p.id);
            if (planIds.length > 0) {
                // Fetch directly
                const { data: soData } = await supabase
                    .from('sales_orders')
                    .select('plan_id, so_number')
                    .in('plan_id', planIds);
                
                const soMap = {};
                (soData || []).forEach(so => {
                    if (so.plan_id && so.so_number) {
                        if (!soMap[so.plan_id]) soMap[so.plan_id] = [];
                        soMap[so.plan_id].push(so.so_number);
                    }
                });
                setPlanSOs(soMap);
            }
        }
    };

    const openModal = (dateStr = "") => {
        setPreselectedDate(dateStr);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const openDetailModal = async (plan) => {
        setViewingPlan(plan);
        setIsDetailModalOpen(true);
        
        // Fetch SO numbers for this plan (direct column or JSON fallback)
        try {
            const { data: directData } = await supabase
                .from('sales_orders')
                .select('so_number')
                .eq('plan_id', plan.id);
            
            // Fallback for stale cache (PGRST204) where plan_id is in JSON metadata
            const { data: jsonData } = await supabase
                .from('sales_orders')
                .select('so_number')
                .contains('items', [{ _metadata: { plan_id: plan.id } }]);

            const allSOs = [...(directData || []), ...(jsonData || [])];
            const uniqueSoNums = [...new Set(allSOs.map(s => s.so_number).filter(Boolean))];
            
            setPlanSOs(prev => ({ ...prev, [plan.id]: uniqueSoNums }));
        } catch (e) {
            console.error("Error fetching SOs for plan:", e);
        }
    };

    const closeDetailModal = () => {
        setIsDetailModalOpen(false);
        setViewingPlan(null);
    };

    const handleDeletePlan = async (planId) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "คุณต้องการลบแผนงานนี้ใช่หรือไม่",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'ลบแผนงาน',
            cancelButtonText: 'ยกเลิก',
            customClass: { popup: 'rounded-3xl' }
        });

        if (result.isConfirmed) {
            if (!user) { Swal.fire('Error', 'ไม่พบข้อมูลผู้ใช้', 'error'); return; }
            const { error } = await supabase.from('sales_plans').delete().eq('id', planId);
            if (!error) {
                setPlans(plans.filter(p => p.id !== planId));
                closeDetailModal();
                Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, icon: 'success', title: 'ลบแผนงานแล้ว' });
            }
        }
    };

    // handleSaveNewPlan logic is now in AddPlanModal component

    const onDragStart = (e, planId, oldDate) => {
        e.dataTransfer.setData("planId", planId);
        e.dataTransfer.setData("oldDate", oldDate);
    };

    const onDrop = async (e, date) => {
        e.preventDefault();
        const planId = e.dataTransfer.getData("planId");
        const oldDate = e.dataTransfer.getData("oldDate");
        const formattedDate = toLocalDateStr(date);
        if (oldDate === formattedDate) return;
        const planToUpdate = plans.find(p => p.id === planId);
        if (!planToUpdate) return;
        const currentHistory = planToUpdate.reschedule_history || [];
        const newHistory = [...currentHistory, { from: oldDate, to: formattedDate, changed_at: new Date().toISOString() }];
        setPlans(plans.map(p => p.id === planId ? { ...p, plan_date: formattedDate, reschedule_history: newHistory } : p));
        await supabase.from('sales_plans').update({ plan_date: formattedDate, reschedule_history: newHistory }).eq('id', planId);
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear(), month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const days = new Date(year, month + 1, 0).getDate();
        const arr = [];
        for (let i = 0; i < firstDay; i++) arr.push(null);
        for (let i = 1; i <= days; i++) arr.push(new Date(year, month, i));
        return arr;
    };

    const formatTime = (time) => {
        if (!time) return "";
        return time.substring(0, 5);
    };

    const todayStr = toLocalDateStr(new Date());
    const days = getDaysInMonth(currentMonth);
    const monthLabel = `${THAI_MONTHS[currentMonth.getMonth()]} ${currentMonth.getFullYear() + 543}`;

    const legendPurposes = ["นำเสนอสินค้า", "ตรวจเยี่ยม", "เก็บเงิน"];

    return (
        <Layout>
            <div className="pb-28 animate-fade-up">
                {/* ─── Header ─── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-1 pt-2">
                    <div className="flex items-center gap-4">
                        <div className="flex gap-1 bg-white/60 backdrop-blur-md p-1 rounded-full border border-slate-200/60 shadow-sm">
                            <button
                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors font-bold"
                            >‹</button>
                            <button
                                onClick={() => setCurrentMonth(new Date())}
                                className="px-3 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors text-xs font-bold"
                            >วันนี้</button>
                            <button
                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-600 transition-colors font-bold"
                            >›</button>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{monthLabel}</h2>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Legend */}
                        <div className="hidden sm:flex items-center gap-3">
                            {legendPurposes.map(p => {
                                const cfg = PURPOSE_CONFIG[p] || DEFAULT_CFG;
                                return (
                                    <div key={p} className="flex items-center gap-1.5">
                                        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`}></span>
                                        <span className="text-xs text-slate-500 font-medium">{cfg.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            onClick={() => openModal()}
                            className="text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-5 py-2.5 rounded-full hover:bg-indigo-100 transition-all shadow-sm hover:shadow-md transform hover:-translate-y-0.5 whitespace-nowrap flex items-center gap-2"
                        >
                            <span className="text-lg leading-none">+</span> เพิ่มแผนงาน
                        </button>
                    </div>
                </div>

                {/* ─── Calendar Grid ─── */}
                <div className="bg-white/70 backdrop-blur-md rounded-[1.5rem] border border-slate-200/60 shadow-lg overflow-hidden">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 border-b border-slate-100">
                        {THAI_DAYS_SHORT.map((d, i) => (
                            <div key={d} className={`py-3 text-center text-xs font-bold uppercase tracking-widest ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-indigo-400' : 'text-slate-400'}`}>
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Day cells */}
                    <div className="grid grid-cols-7">
                        {days.map((day, idx) => {
                            const dateStr = toLocalDateStr(day);
                            const dayPlans = dateStr ? plans
                                .filter(p => p.plan_date === dateStr && p.status !== 'cancelled')
                                .sort((a, b) => (a.plan_time || "99:99").localeCompare(b.plan_time || "99:99"))
                                : [];
                            const isToday = dateStr === todayStr;
                            const isCurrentMonth = day && day.getMonth() === currentMonth.getMonth();
                            const isSun = day && day.getDay() === 0;
                            const isSat = day && day.getDay() === 6;

                            return (
                                <div
                                    key={idx}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => day && onDrop(e, day)}
                                    onClick={() => day && openModal(dateStr)}
                                    className={`min-h-[110px] p-1.5 border-b border-r border-slate-100/80 transition-colors cursor-pointer group
                                        ${!day ? 'bg-slate-50/40' : isCurrentMonth ? 'hover:bg-indigo-50/40' : 'bg-slate-50/60'}
                                        ${idx % 7 === 6 ? 'border-r-0' : ''}
                                    `}
                                >
                                    {day && (
                                        <>
                                            {/* Date number */}
                                            <div className="flex justify-end mb-1.5 pr-0.5 pt-0.5">
                                                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all
                                                    ${isToday ? 'bg-indigo-600 text-white shadow-md' : ''}
                                                    ${!isToday && isSun ? 'text-rose-400' : ''}
                                                    ${!isToday && isSat ? 'text-indigo-400' : ''}
                                                    ${!isToday && !isSun && !isSat ? (isCurrentMonth ? 'text-slate-600' : 'text-slate-300') : ''}
                                                `}>
                                                    {day.getDate()}
                                                </span>
                                            </div>

                                            {/* Events */}
                                            <div className="space-y-0.5">
                                                {dayPlans.slice(0, 4).map(plan => {
                                                    const cfg = PURPOSE_CONFIG[plan.purpose] || DEFAULT_CFG;
                                                    return (
                                                        <div
                                                            key={plan.id}
                                                            draggable
                                                            onDragStart={(e) => { e.stopPropagation(); onDragStart(e, plan.id, plan.plan_date); }}
                                                            onClick={(e) => { e.stopPropagation(); openDetailModal(plan); }}
                                                            title={`${plan.customer_name} | ${plan.purpose}`}
                                                            className={`text-[9px] leading-tight px-1.5 py-1 rounded-md border font-bold cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-indigo-300 transition-all ${cfg.color}`}
                                                        >
                                                            <div className="flex flex-col">
                                                                {plan.plan_time && <span className="opacity-60 text-[8px]">{formatTime(plan.plan_time)}</span>}
                                                                <span className="truncate block">{plan.customer_name}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {dayPlans.length > 4 && (
                                                    <div className="text-[10px] text-slate-400 font-bold px-1.5">
                                                        +{dayPlans.length - 4} เพิ่มเติม
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-3 text-center font-medium">
                    ✨ ลากและวางเพื่อเลื่อนวันที่ได้เลย (Drag & Drop) · กดที่วันเพื่อเพิ่มแผนงาน
                </p>
            </div>

            {/* ─── Premium Modal ─── */}
            <AddPlanModal 
                isOpen={isModalOpen}
                onClose={closeModal}
                onSave={() => user && fetchPlans(user.id)}
                preselectedDate={preselectedDate}
                userId={user?.id}
            />

            {/* ─── Detail Modal ─── */}
            {isDetailModalOpen && viewingPlan && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm" onClick={closeDetailModal}>
                    <div className="bg-white w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl border border-white/50 overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-center pt-3 pb-1 sm:hidden">
                            <div className="w-10 h-1 bg-slate-200 rounded-full"></div>
                        </div>
                        
                        {/* Header Image/Pattern */}
                        <div className={`h-24 shrink-0 ${(PURPOSE_CONFIG[viewingPlan.purpose] || DEFAULT_CFG).color} flex items-center justify-center relative`}>
                            <div className="absolute top-4 right-4">
                                <button onClick={closeDetailModal} className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors">✕</button>
                            </div>
                            <span className="text-4xl">🗓️</span>
                        </div>

                        <div className="p-8 pt-6 space-y-6 flex-1 overflow-y-auto">
                            <div className="text-center">
                                <div className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-current opacity-70">
                                    {viewingPlan.purpose}
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 leading-tight mb-1">{viewingPlan.customer_name}</h2>
                                <p className="text-sm font-bold text-indigo-600">
                                    {formatDate(viewingPlan.plan_date)}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-3xl">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">เวลาเข้าพบ</p>
                                    <p className="text-sm font-black text-slate-700">{viewingPlan.plan_time ? formatTime(viewingPlan.plan_time) + ' น.' : 'ไม่ระบุเวลา'}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-3xl">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">สถานะ</p>
                                    <p className="text-sm font-black text-emerald-600">แผนงานปกติ</p>
                                </div>
                            </div>

                            {viewingPlan.notes && (
                                <div className="bg-slate-50 p-5 rounded-3xl">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">รายละเอียด / บันทึก</p>
                                    <p className="text-sm text-slate-600 font-medium whitespace-pre-wrap leading-relaxed">{viewingPlan.notes}</p>
                                </div>
                            )}

                            {viewingPlan.reschedule_history && viewingPlan.reschedule_history.length > 0 && (
                                <div className="p-1">
                                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> ประวัติการเลื่อนนัด
                                    </p>
                                    <div className="space-y-2">
                                        {viewingPlan.reschedule_history.map((hist, idx) => (
                                            <div key={idx} className="text-xs text-slate-400 font-bold bg-amber-50/50 p-3 rounded-2xl border border-amber-100/50">
                                                เลื่อนมาจากวันที่ {formatDate(hist.from)} → {formatDate(hist.to)}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(!planSOs[viewingPlan.id] || planSOs[viewingPlan.id].length === 0) ? null : (
                                <div className="bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100">
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <span className="text-sm">📝</span> ใบกำกับภาษีอย่างย่อที่เปิดไว้
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {planSOs[viewingPlan.id].map(soNum => (
                                            <span key={soNum} className="px-3 py-1 bg-white text-indigo-700 text-xs font-black rounded-lg border border-indigo-200 shadow-sm">
                                                {soNum}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-8 pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                            <button 
                                onClick={() => handleDeletePlan(viewingPlan.id)}
                                className="flex-1 py-4 rounded-2xl text-rose-500 font-black text-sm bg-rose-50 hover:bg-rose-100 transition-colors"
                            >
                                ลบแผนงาน
                            </button>
                            <button 
                                onClick={closeDetailModal}
                                className="flex-1 py-4 rounded-2xl text-white font-black text-sm bg-slate-800 hover:bg-slate-900 shadow-xl shadow-slate-200 transition-all transform hover:-translate-y-0.5"
                            >
                                ตกลง
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
