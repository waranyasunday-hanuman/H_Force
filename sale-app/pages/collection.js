import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useRouter } from "next/router";
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
import { supabase } from "../lib/supabase";

const MySwal = withReactContent(Swal);

export default function Collection() {
    const router = useRouter();
    const { visitId, custCode, newCustName, custName } = router.query;
    
    const [loading, setLoading] = useState(false);
    const displayName = newCustName || custName || custCode;

    // Mock Invoices
    const [invoices, setInvoices] = useState([
        { id: 'INV-20240315-01', date: '2024-03-15', amount: 15400.00, selected: false },
        { id: 'INV-20240401-05', date: '2024-04-01', amount: 8250.50, selected: false },
        { id: 'INV-20240410-12', date: '2024-04-10', amount: 3100.00, selected: false }
    ]);

    const handleCheckboxChange = (id) => {
        setInvoices(invoices.map(inv => 
            inv.id === id ? { ...inv, selected: !inv.selected } : inv
        ));
    };

    const selectedTotal = invoices
        .filter(inv => inv.selected)
        .reduce((sum, inv) => sum + inv.amount, 0);

    const handleSave = async (e) => {
        e.preventDefault();
        
        const selectedInvoices = invoices.filter(inv => inv.selected);
        if (selectedInvoices.length === 0) {
            MySwal.fire('แจ้งเตือน', 'กรุณาเลือกบิลที่ต้องการรับชำระอย่างน้อย 1 รายการ', 'warning');
            return;
        }

        // 1. Popup ถามวิธีรับชำระ
        const { value: paymentMethod } = await MySwal.fire({
            title: 'รูปแบบการรับชำระ',
            text: `ยอดรวมที่ต้องชำระ: ฿${selectedTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`,
            icon: 'info',
            input: 'radio',
            inputOptions: {
                'cash': '💵 เงินสด',
                'transfer': '📱 โอนเงินบัญชีบริษัท'
            },
            inputValidator: (value) => {
                if (!value) {
                    return 'กรุณาเลือกรูปแบบการชำระเงิน!'
                }
            },
            showCancelButton: true,
            confirmButtonText: 'ถัดไป ➔',
            cancelButtonText: 'ยกเลิก'
        });

        if (!paymentMethod) return;

        let paymentSlip = null;
        let depositDate = null;

        // 2. ถ้าโอน ให้แนบสลิป / ถ้าเงินสด ใส่วันเอาเงินเข้า
        if (paymentMethod === 'transfer') {
            const { value: file } = await MySwal.fire({
                title: 'อัปโหลดสลิปโอนเงิน',
                input: 'file',
                inputAttributes: {
                    'accept': 'image/*',
                    'aria-label': 'Upload your payment slip'
                },
                showCancelButton: true,
                confirmButtonText: 'ยืนยันรับชำระ'
            });
            if (!file) return; // cancelled
            
            // Upload to Supabase Storage
            MySwal.fire({ title: 'กำลังอัปโหลด...', allowOutsideClick: false });
            MySwal.showLoading();
            
            const fileName = `slip_collect_${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
            if (uploadError) {
                MySwal.fire('Error!', 'อัปโหลดรูปสลิปล้มเหลว', 'error');
                return;
            }
            const { data: publicUrlData } = supabase.storage.from('images').getPublicUrl(fileName);
            paymentSlip = publicUrlData.publicUrl;

        } else if (paymentMethod === 'cash') {
            const { value: date } = await MySwal.fire({
                title: 'กำหนดวันนำเงินสดเข้าธนาคาร',
                input: 'date',
                showCancelButton: true,
                confirmButtonText: 'ยืนยันรับชำระ'
            });
            if (!date) return;
            depositDate = date;
        }

        // 3. Save Payload
        setLoading(true);
        MySwal.fire({ title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false });
        MySwal.showLoading();

        try {
            const payload = {
                type: 'debt_collection',
                invoices: selectedInvoices.map(i => i.id),
                total_amount: selectedTotal,
                payment_method: paymentMethod,
                payment_slip_url: paymentSlip,
                deposit_due_date: depositDate,
                timestamp: new Date().toISOString()
            };

            await supabase
                .from('visits')
                .update({ 
                    visit_result: payload,
                    is_completed: true // Mark visit as done
                })
                .eq('id', visitId);

            setLoading(false);

            await MySwal.fire({
                title: 'รับชำระเงินเรียบร้อย!',
                text: `บันทึกการเก็บหนี้จำนวน ฿${selectedTotal.toLocaleString()} สำเร็จ`,
                icon: 'success'
            });

            router.push('/dashboard');

        } catch (err) {
            setLoading(false);
            MySwal.fire('Error!', err.message, 'error');
        }
    };

    return (
        <Layout>
            <div className="max-w-3xl mx-auto">
                <div className="mb-6 pb-4 border-b border-gray-200">
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
                        <span className="mr-3 text-4xl">💰</span> เก็บหนี้ / ทวงถาม
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">บันทึกการรับชำระบิลคงค้างสำหรับ {displayName ? <span className="text-red-600 font-bold">{displayName}</span> : ''}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-red-500 to-rose-600 w-full"></div>
                    
                    <form onSubmit={handleSave} className="p-6 md:p-8">
                        <div className="mb-6 bg-red-50 p-4 rounded-xl border border-red-100 flex items-start">
                            <span className="text-2xl mr-3 mt-0.5">ℹ️</span>
                            <div>
                                <h3 className="font-bold text-red-800">รายการใบแจ้งหนี้ค้างชำระ (จำลอง)</h3>
                                <p className="text-sm text-red-600 mt-1">นี่คือข้อมูล Mock Data เพื่อใช้ทดสอบการทำงานของระบบประเมินเบื้องต้น</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="grid grid-cols-12 gap-4 px-4 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                                <div className="col-span-1 text-center">เลือก</div>
                                <div className="col-span-5">เลขที่บิล (Invoice)</div>
                                <div className="col-span-3">วันที่ออกบิล</div>
                                <div className="col-span-3 text-right">ยอดเงิน (฿)</div>
                            </div>
                            
                            {invoices.map((inv) => (
                                <label 
                                    key={inv.id} 
                                    className={`grid grid-cols-12 gap-4 items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                        inv.selected ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-100'
                                    }`}
                                >
                                    <div className="col-span-1 flex justify-center">
                                        <input 
                                            type="checkbox"
                                            checked={inv.selected}
                                            onChange={() => handleCheckboxChange(inv.id)}
                                            className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                        />
                                    </div>
                                    <div className={`col-span-5 font-semibold ${inv.selected ? 'text-red-900' : 'text-gray-800'}`}>
                                        {inv.id}
                                    </div>
                                    <div className="col-span-3 text-sm text-gray-500">
                                        {new Date(inv.date).toLocaleDateString('th-TH')}
                                    </div>
                                    <div className={`col-span-3 text-right font-bold ${inv.selected ? 'text-red-700' : 'text-gray-900'}`}>
                                        {inv.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </div>
                                </label>
                            ))}
                        </div>

                        <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 mb-8 flex justify-between items-center">
                            <span className="text-gray-600 font-medium">ยอดรวมที่เลือกรับชำระ:</span>
                            <span className="text-3xl font-extrabold text-red-600">
                                ฿{selectedTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                            </span>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex gap-4">
                            <button
                                type="submit" 
                                disabled={loading || selectedTotal === 0}
                                className={`flex-1 py-4 rounded-xl text-white font-bold text-lg transition-all shadow-md flex justify-center items-center ${
                                    selectedTotal === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                {loading ? 'กำลังดำเนินการ...' : '💳 ดำเนินการรับชำระเงิน'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}
