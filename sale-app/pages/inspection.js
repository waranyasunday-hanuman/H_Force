import { useState } from "react";
import Layout from "../components/Layout";
import { useRouter } from "next/router";
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
import { supabase } from "../lib/supabase";

const MySwal = withReactContent(Swal);

export default function Inspection() {
    const router = useRouter();
    const { visitId, custCode, newCustName, custName } = router.query;
    
    const [loading, setLoading] = useState(false);
    const displayName = newCustName || custName || custCode;

    // Dummy 10 Checklist Items
    const [checklist, setChecklist] = useState([
        { id: 1, text: "ป้ายร้านเห็นชัดเจน ไม่ชำรุด", checked: false },
        { id: 2, text: "สินค้าจัดวางในจุดที่ลูกค้ามองเห็นง่าย", checked: false },
        { id: 3, text: "ความสะอาดของชั้นวางสินค้า", checked: false },
        { id: 4, text: "สินค้ามีป้ายบอกราคาชัดเจน", checked: false },
        { id: 5, text: "ไม่มีสินค้าหมดอายุ หรือเสื่อมสภาพบนเชลฟ์", checked: false },
        { id: 6, text: "สื่อโฆษณา (POSM) ติดตั้งถูกตำแหน่ง", checked: false },
        { id: 7, text: "พนักงานร้านค้ามีความรู้ความเข้าใจในสินค้า", checked: false },
        { id: 8, text: "พื้นที่จัดเก็บสต๊อกสินค้าหลังร้านเป็นระเบียบ", checked: false },
        { id: 9, text: "ความชัดเจนของแบรนด์คู่แข่งในพื้นที่เดียวกัน", checked: false },
        { id: 10, text: "สต๊อกสินค้าหลักมีจำนวนเพียงพอในการขาย", checked: false }
    ]);
    
    const [notes, setNotes] = useState("");

    const handleCheckboxChange = (id) => {
        setChecklist(checklist.map(item => 
            item.id === id ? { ...item, checked: !item.checked } : item
        ));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                type: 'inspection_checklist',
                checklist: checklist,
                notes: notes,
                score: checklist.filter(c => c.checked).length,
                total: checklist.length,
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
                title: 'บันทึกการตรวจร้านเรียบร้อย!',
                text: `คะแนนประเมิน: ${payload.score} / ${payload.total}`,
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
                        <span className="mr-3 text-4xl">📋</span> ตรวจความเรียบร้อยร้าน
                    </h1>
                    <p className="text-gray-500 font-medium mt-1">Checklist ประเมินคุณภาพร้านค้า {displayName ? <span className="text-purple-600 font-bold">{displayName}</span> : ''}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-600 w-full"></div>
                    
                    <form onSubmit={handleSave} className="p-6 md:p-8">
                        <div className="mb-6 flex justify-between items-center bg-purple-50 p-4 rounded-xl border border-purple-100">
                            <span className="font-semibold text-purple-800">แตะเพื่อทำเครื่องหมาย (Check) กรณีผ่านหลักเกณฑ์</span>
                            <span className="text-purple-600 font-bold text-xl">
                                {checklist.filter(c => c.checked).length} / 10
                            </span>
                        </div>

                        <div className="space-y-3 mb-8">
                            {checklist.map((item) => (
                                <div 
                                    key={item.id} 
                                    onClick={() => handleCheckboxChange(item.id)}
                                    className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all select-none ${
                                        item.checked ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-200'
                                    }`}
                                >
                                    <div className="flex-shrink-0 mr-4">
                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center border ${item.checked ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                                            {item.checked && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                    </div>
                                    <span className={`text-base flex-1 ${item.checked ? 'text-purple-900 font-medium' : 'text-gray-700'}`}>
                                        {item.id}. {item.text}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mb-8">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">ข้อเสนอแนะเพิ่มเติม / จุดที่ต้องปรับปรุง</label>
                            <textarea 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="พิมพ์ข้อเสนอแนะ..."
                                rows="3"
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none"
                            ></textarea>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex gap-4">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-6 py-4 rounded-xl text-purple-700 font-bold text-lg bg-purple-100 hover:bg-purple-200 transition-all flex items-center justify-center hidden sm:flex"
                            >
                                🖨️ พิมพ์รายการ
                            </button>
                            <button
                                type="submit" 
                                disabled={loading}
                                className="flex-1 py-4 rounded-xl text-white font-bold text-lg bg-purple-600 hover:bg-purple-700 transition-all shadow-md flex justify-center items-center"
                            >
                                {loading ? 'กำลังบันทึก...' : '✅ ส่งผลการตรวจร้าน'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
}
