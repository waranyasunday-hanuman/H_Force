import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Swal from 'sweetalert2';

const PURPOSE_CONFIG = {
    "นำเสนอสินค้า": { color: "bg-green-100 text-green-700 border-green-200",   dot: "bg-green-500",   label: "เสนอขาย" },
    "ตรวจเยี่ยม":    { color: "bg-purple-100 text-purple-700 border-purple-200", dot: "bg-purple-500", label: "ตรวจร้าน" },
    "เก็บเงิน":      { color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500", label: "เก็บหนี้" },
    "ส่งของ":         { color: "bg-blue-100 text-blue-700 border-blue-200",       dot: "bg-blue-500",   label: "ส่งของ" },
    "วันหยุดประจำสัปดาห์": { color: "bg-slate-200 text-slate-700 border-slate-300", dot: "bg-slate-500", label: "วันหยุด" },
    "ทั่วไป":         { color: "bg-slate-100 text-slate-600 border-slate-200",    dot: "bg-slate-400",  label: "ทั่วไป" },
};

export default function AddPlanModal({ isOpen, onClose, onSave, preselectedDate = "", userId }) {
    const [customers, setCustomers] = useState([]);
    const [form, setForm] = useState({
        customerType: "old",
        customerCode: "",
        customerName: "",
        purpose: "นำเสนอสินค้า",
        date: preselectedDate || new Date().toISOString().split('T')[0],
        time: "",
        contactName: "",
        phone: "",
        location: "",
        remarks: ""
    });

    useEffect(() => {
        if (isOpen) {
            fetchCustomers();
            if (preselectedDate) {
                setForm(prev => ({ ...prev, date: preselectedDate }));
            }
        }
    }, [isOpen, preselectedDate]);

    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/customers');
            const data = await res.json();
            if (data.customers) setCustomers(data.customers);
        } catch (e) { console.error(e); }
    };

    const handleSave = async () => {
        if (!userId) { Swal.fire('Error', 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง', 'error'); return; }
        if (!form.date) { Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุวันที่เข้าพบ', 'warning'); return; }
        
        let finalName = form.customerName, finalCode = null;
        
        if (form.purpose === "วันหยุดประจำสัปดาห์") {
            finalName = "วันหยุดประจำสัปดาห์";
        } else {
            if (!form.customerName) { Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุชื่อร้าน/ลูกค้า', 'warning'); return; }
            finalName = form.customerName;
            
            // Try to find matching code if it's an old customer
            if (form.customerType === "old") {
                const c = customers.find(c => c.CUST_NAME === form.customerName || c.CUST_CODE === form.customerCode);
                if (c) finalCode = c.CUST_CODE;
            }
        }

        const noteContent = `${form.remarks || ''}\n\n---CONTACT_INFO---\nผู้ติดต่อ: ${form.contactName || '-'}\nเบอร์โทร: ${form.phone || '-'}\nสถานที่: ${form.location || '-'}`;
        const { error } = await supabase.from('sales_plans').insert([{
            user_id: userId, customer_code: finalCode, customer_name: finalName,
            plan_date: form.date, plan_time: form.time || null,
            purpose: form.purpose, notes: noteContent
        }]);

        if (!error) {
            Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2500, icon: 'success', title: 'บันทึกแผนงานเรียบร้อย' });
            onSave();
            onClose();
            // Reset form
            setForm({
                customerType: "old",
                customerCode: "",
                customerName: "",
                purpose: "นำเสนอสินค้า",
                date: new Date().toISOString().split('T')[0],
                time: "",
                contactName: "",
                phone: "",
                location: "",
                remarks: ""
            });
        } else {
            Swal.fire('Error', error.message, 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl border border-white/50 max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-10 h-1 bg-slate-300 rounded-full"></div>
                </div>
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">เพิ่มแผนเข้าพบลูกค้า</h2>
                        <p className="text-xs text-indigo-500 font-semibold mt-0.5">📅 จัดตารางงานใหม่</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors text-sm">✕</button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">จุดประสงค์</label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(PURPOSE_CONFIG).map(([key, cfg]) => (
                                <button
                                    key={key}
                                    onClick={() => setForm({...form, purpose: key})}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-[11px] font-bold transition-all ${form.purpose === key ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-400' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                >
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${form.purpose === key ? 'bg-indigo-500' : 'bg-slate-300'}`}></span>
                                    {key}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">วันที่เข้าพบ</label>
                            <input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})}
                                className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-400 outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">ช่วงเวลา</label>
                            <input type="time" value={form.time} onChange={(e) => setForm({...form, time: e.target.value})}
                                className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-400 outline-none" />
                        </div>
                    </div>

                    {form.purpose !== "วันหยุดประจำสัปดาห์" && (
                        <>
                            <div className="flex bg-slate-100 p-1 rounded-2xl">
                                {["old", "new"].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setForm({...form, customerType: type})}
                                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${form.customerType === type ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                                    >
                                        {type === "old" ? "ลูกค้าเก่า" : "ลูกค้าใหม่"}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                                    ชื่อร้านค้า / บริษัท
                                </label>
                                <input
                                    type="text" 
                                    value={form.customerName} 
                                    onChange={(e) => setForm({...form, customerName: e.target.value})}
                                    placeholder="ระบุชื่อร้านค้า..."
                                    className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-400 outline-none"
                                />
                                
                                {form.customerType === "old" && (
                                    <div className="mt-2">
                                        <select
                                            value={form.customerCode}
                                            onChange={(e) => {
                                                const c = customers.find(x => x.CUST_CODE === e.target.value);
                                                if (c) setForm({...form, customerCode: c.CUST_CODE, customerName: c.CUST_NAME});
                                            }}
                                            className="w-full p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[11px] font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-400 outline-none"
                                        >
                                            <option value="">-- หรือค้นหาจากรายชื่อลูกค้าเดิม --</option>
                                            {customers.map(c => (
                                                <option key={c.CUST_CODE} value={c.CUST_CODE}>[{c.CUST_CODE}] {c.CUST_NAME}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">ชื่อผู้ติดต่อ</label>
                                    <input type="text" value={form.contactName} onChange={(e) => setForm({...form, contactName: e.target.value})}
                                        className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-400 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">เบอร์โทรศัพท์</label>
                                    <input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}
                                        className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-400 outline-none" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">หมายเหตุ (Notes)</label>
                                    <textarea 
                                        rows="3"
                                        value={form.remarks} 
                                        onChange={(e) => setForm({...form, remarks: e.target.value})}
                                        placeholder="รายละเอียดเพิ่มเติม..."
                                        className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-indigo-400 outline-none resize-none"
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="px-6 pb-6 pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl text-slate-500 font-bold bg-slate-100 hover:bg-slate-200 transition-colors">ยกเลิก</button>
                    <button onClick={handleSave} className="flex-1 py-3.5 rounded-2xl text-white font-bold bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5">บันทึกแผนงาน</button>
                </div>
            </div>
        </div>
    );
}
