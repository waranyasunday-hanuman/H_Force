import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import Loading from "../components/Loading";

export default function CreateCustomer() {
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [showForm, setShowForm] = useState(false);
    const [customers, setCustomers] = useState([]);
    
    // Generator for default Customer Code
    const generateCustCode = () => `C${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;

    const [formData, setFormData] = useState({
        custCode: "",
        businessNo: "",
        custName: "",
        bossName: "",
        uptae: "",
        jongmok: "",
        tel: "",
        hpNo: "",
        email: "",
        addr: "",
        remarks: ""
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (showForm && !formData.custCode) {
            setFormData(prev => ({ ...prev, custCode: generateCustCode() }));
        }
    }, [showForm]); // Only generate when opening form if blank

    const fetchCustomers = async () => {
        setLoadingData(true);
        try {
            const res = await fetch('/api/customers');
            const data = await res.json();
            if (data.customers) setCustomers(data.customers);
        } catch (e) {
            console.error(e);
        }
        setLoadingData(false);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: "", type: "" });

        if (!formData.custCode || !formData.custName) {
            setMessage({ text: "กรุณากรอกรหัสลูกค้าและชื่อลูกค้า/บริษัทให้ครบถ้วน", type: "error" });
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/create-customer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const result = await res.json();

            if (res.ok && result.success) {
                setMessage({ text: "สร้างลูกค้าใหม่สำเร็จ! ✅ เพิ่มลงในทะเบียนลูกค้าแล้ว", type: "success" });
                await fetchCustomers(); // Refresh list immediately
                
                // Hide form after success
                setTimeout(() => {
                    setShowForm(false);
                    setMessage({ text: "", type: "" });
                    setFormData({ 
                        custCode: generateCustCode(), businessNo: "", custName: "", bossName: "", uptae: "", jongmok: "", tel: "", hpNo: "", email: "", addr: "", remarks: "" 
                    }); 
                }, 1500);
            } else {
                setMessage({ text: `เกิดข้อผิดพลาด: ${result.error}`, type: "error" });
            }
        } catch (error) {
            setMessage({ text: "เกิดข้อผิดพลาดในการเชื่อมต่อ", type: "error" });
        }
        setLoading(false);
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto">
                {/* Header Header */}
                <div className="mb-8 pb-4 border-b border-gray-200 flex flex-col md:flex-row md:items-end justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">ทะเบียนลูกค้า / ผู้ขาย 🧑‍💼</h1>
                        <p className="text-gray-500 font-medium">จัดการทะเบียนประวัติลูกค้า ระบบ Ecount ERP</p>
                    </div>
                    {!showForm && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md transition-all flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            <span>สร้างลูกค้าใหม่</span>
                        </button>
                    )}
                </div>

                {showForm ? (
                    /* ======== FORM VIEW ======== */
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                        <div className="h-2 bg-gradient-to-r from-green-500 to-teal-500 w-full"></div>
                        
                        <div className="flex justify-between items-center p-6 pb-0">
                            <h2 className="text-xl font-bold text-gray-800">กรอกประวัติลูกค้าใหม่</h2>
                            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700">
                                ยกเลิก / กลับหน้าทะเบียน
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {message.text && (
                                <div className={`p-4 rounded-xl border flex items-start space-x-3 ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                                    <span className="text-xl mt-0.5">{message.type === 'error' ? '⚠️' : '✅'}</span>
                                    <p className="font-medium whitespace-pre-line">{message.text}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* กรอบข้อมูลหลัก */}
                                <div className="space-y-5">
                                    <h3 className="text-lg font-bold text-gray-900 border-b pb-2">ข้อมูลหลัก (필수/일반)</h3>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">รหัสลูกค้า/ผู้ขาย (CUST) <span className="text-red-500">*</span></label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" name="custCode" value={formData.custCode} onChange={handleChange} required
                                                placeholder="เช่น C001, V001"
                                                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all uppercase"
                                            />
                                            <button type="button" onClick={() => setFormData(prev => ({...prev, custCode: generateCustCode()}))} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-gray-700 text-sm font-medium transition-colors">
                                                สุ่มรหัสใหม่
                                            </button>
                                        </div>
                                        <p className="text-xs text-blue-600 mt-1.5">* นี่คือรหัสที่จะถูกใช้อ้างอิงใน Ecount</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">ชื่อลูกค้า / บริษัท <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" name="custName" value={formData.custName} onChange={handleChange} required
                                            placeholder="เช่น บริษัท ตัวอย่าง จำกัด"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">เลขประจําตัวผู้เสียภาษี</label>
                                            <input 
                                                type="text" name="businessNo" value={formData.businessNo} onChange={handleChange}
                                                placeholder="13 หลัก"
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">ผู้แต่งตั้ง / CEO</label>
                                            <input 
                                                type="text" name="bossName" value={formData.bossName} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">ประเภทธุรกิจ (UPTAE)</label>
                                            <input 
                                                type="text" name="uptae" value={formData.uptae} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">หมวดหมู่ลักษณะ (JONGMOK)</label>
                                            <input 
                                                type="text" name="jongmok" value={formData.jongmok} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* กรอบข้อมูลติดต่อ */}
                                <div className="space-y-5">
                                    <h3 className="text-lg font-bold text-gray-900 border-b pb-2">ข้อมูลการติดต่อ (연락처)</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">เบอร์โทรศัพท์ (TEL)</label>
                                            <input 
                                                type="text" name="tel" value={formData.tel} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">มือถือ (HP_NO)</label>
                                            <input 
                                                type="text" name="hpNo" value={formData.hpNo} onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">อีเมล (EMAIL)</label>
                                        <input 
                                            type="email" name="email" value={formData.email} onChange={handleChange}
                                            placeholder="email@example.com"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">ที่อยู่ (ADDR)</label>
                                        <textarea 
                                            name="addr" value={formData.addr} onChange={handleChange} rows="3"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all resize-none"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">หมายเหตุ (REMARKS)</label>
                                <input 
                                    type="text" name="remarks" value={formData.remarks} onChange={handleChange}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors">
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`px-8 py-3.5 rounded-xl text-white font-semibold text-lg transition-all shadow-md transform active:scale-95 flex items-center justify-center space-x-2 ${
                                        loading 
                                        ? "bg-green-400 cursor-not-allowed shadow-none" 
                                        : "bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                                    }`}
                                >
                                    {loading ? (
                                        <span>กำลังบันทึก...</span>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            <span>บันทึกข้อมูลลูกค้า</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    /* ======== LIST VIEW ======== */
                    <>
                        {loadingData ? (
                            <Loading />
                        ) : (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                                {customers.length === 0 ? (
                                    <div className="p-12 text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                            <span className="text-2xl">📦</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">ยังไม่มีทะเบียนลูกค้าในระบบ</h3>
                                        <p className="text-gray-500 mb-6">เริ่มสร้างข้อมูลลูกค้าเพื่อนำไปใช้เปิด Sale Order</p>
                                        <button onClick={() => setShowForm(true)} className="bg-green-600 text-white px-6 py-2.5 rounded-lg active:scale-95 transition-all w-full max-w-xs font-semibold">
                                            + เพิ่มลูกค้าใหม่ทันที
                                        </button>
                                    </div> 
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm">
                                                    <th className="p-4 font-semibold w-1/4">รหัสลูกค้า / ผู้ขาย</th>
                                                    <th className="p-4 font-semibold w-1/3">ชื่อบริษัท / ลูกค้า</th>
                                                    <th className="p-4 font-semibold">เลขภาษี / ผู้ติดต่อ</th>
                                                    <th className="p-4 font-semibold hidden md:table-cell">หมวดหมู่</th>
                                                    <th className="p-4 font-semibold text-center">จัดการ</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-sm">
                                                {customers.map((c) => (
                                                    <tr key={c.CUST_CODE} className="hover:bg-gray-50 transition-colors group">
                                                        <td className="p-4">
                                                            <div className="font-bold text-gray-900">{c.CUST_CODE}</div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="font-bold text-gray-800">{c.CUST_DES || c.CUST_NAME}</div>
                                                            {c.TEL && <div className="text-xs font-medium text-gray-500 mt-0.5">📞 {c.TEL}</div>}
                                                        </td>
                                                        <td className="p-4">
                                                            <div>{c.BUSINESS_NO || c.business_no || '-'}</div>
                                                            {(c.BOSS_NAME || c.boss_name || c.EMAIL || c.email) && (
                                                                <div className="text-xs text-gray-500 mt-1">👤 {c.BOSS_NAME || c.boss_name} {(c.EMAIL || c.email) ? `(${(c.EMAIL || c.email)})` : ''}</div>
                                                            )}
                                                        </td>
                                                        <td className="p-4 hidden md:table-cell">
                                                            <div>{c.JONGMOK || c.jongmok || c.UPTAE || c.uptae || '-'}</div>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    window.location.href = `/visits?custCode=${c.CUST_CODE}&custName=${encodeURIComponent(c.CUST_DES || c.CUST_NAME)}`;
                                                                }}
                                                                className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg text-xs font-bold transition-all shadow-sm"
                                                            >
                                                                ลงพื้นที่ 📍
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
}
