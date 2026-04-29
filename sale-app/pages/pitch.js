import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useRouter } from "next/router";
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
import { supabase } from "../lib/supabase";

const MySwal = withReactContent(Swal);

export default function Pitch() {
    const router = useRouter();
    const { visitId, custCode, newCustName, custName } = router.query;
    
    const [topic, setTopic] = useState("");
    const [resultNotes, setResultNotes] = useState("");
    const [loading, setLoading] = useState(false);

    const displayName = newCustName || custName || custCode;

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Save Pitch to DB `visit_result` field
            const payload = {
                topic: topic,
                details: resultNotes,
                timestamp: new Date().toISOString()
            };

            await supabase
                .from('visits')
                .update({ visit_result: payload })
                .eq('id', visitId);

            setLoading(false);

            // Pop-up Sweet Alert ถามว่าขายได้ไหม
            const resultMsg = await MySwal.fire({
                title: 'สรุปผลการนำเสนอ',
                text: "คุณสามารถปิดการขายจากลูกค้ารายนี้ได้หรือไม่?",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#10B981', // green-500
                cancelButtonColor: '#EF4444',  // red-500
                confirmButtonText: '✅ ปิดการขายได้! (สร้าง SO)',
                cancelButtonText: '❌ ยังไม่ตกลงซื้อ'
            });

            if (resultMsg.isConfirmed) {
                // เด้งไปหน้า SO พร้อมส่งพารามิเตอร์ต่อ
                if (newCustName) {
                    router.push(`/create-so?visitId=${visitId}&newCustName=${encodeURIComponent(newCustName)}`);
                } else {
                    router.push(`/create-so?visitId=${visitId}&custCode=${custCode}`);
                }
            } else {
                // จบการทำงาน เด้งกลับ Dashboard
                await supabase.from('visits').update({ is_completed: true }).eq('id', visitId);
                
                await MySwal.fire({
                    title: 'บันทึกข้อมูลเรียบร้อย',
                    text: 'เยี่ยมมากครับ ถือเป็นการเก็บฐานลูกค้าไว้ในอนาคต!',
                    icon: 'success'
                });
                router.push('/dashboard');
            }

        } catch (err) {
            setLoading(false);
            MySwal.fire('Error!', err.message, 'error');
        }
    };

    return (
        <Layout>
            <div className="max-w-2xl mx-auto">
                <div className="mb-6 pb-4 border-b border-gray-200">
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
                        <span className="mr-3 text-4xl">🗣️</span> บันทึกเสนอขาย
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">สรุปการพูดคุยกับ {displayName ? <span className="text-blue-600 font-bold">{displayName}</span> : 'ลูกค้า'}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600 w-full"></div>
                    <form onSubmit={handleSave} className="p-6 md:p-8 space-y-6">
                        
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">หัวข้อที่นำเสนอ (Product / Topic) <span className="text-red-500">*</span></label>
                            <input 
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="เช่น เสนอโปรโมชั่นแพ็กเกจ A"
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">ผลตอบรับจากลูกค้า (Feedback) <span className="text-red-500">*</span></label>
                            <textarea 
                                value={resultNotes}
                                onChange={(e) => setResultNotes(e.target.value)}
                                placeholder="เช่น ลูกค้าสนใจแต่ขอปรึกษาหุ้นส่วนก่อน, สินค้าเดิมยังเหลือเยอะ ฯลฯ"
                                rows="4"
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none resize-none"
                                required
                            ></textarea>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <button
                                type="submit" 
                                disabled={loading}
                                className="w-full py-4 rounded-xl text-white font-bold text-lg bg-green-600 hover:bg-green-700 transition-all shadow-md flex justify-center items-center"
                            >
                                {loading ? 'กำลังบันทึก...' : '✅ บันทึกสรุปการเข้าพบ'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}
