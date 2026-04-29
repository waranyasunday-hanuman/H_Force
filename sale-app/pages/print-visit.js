import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import Head from "next/head";

export default function PrintVisitReport() {
    const router = useRouter();
    const { visitId } = router.query;
    const [visit, setVisit] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!visitId) return;

        async function fetchVisit() {
            setLoading(true);
            try {
                // First try to find by plan_id
                let { data: visitData, error } = await supabase
                    .from('visits')
                    .select('*, sales_plans(customer_name, customer_code)')
                    .eq('plan_id', visitId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (error || !visitData) {
                    // Fallback: try to find by visit id itself
                    const res = await supabase
                        .from('visits')
                        .select('*, sales_plans(customer_name, customer_code)')
                        .eq('id', visitId)
                        .single();
                    visitData = res.data;
                }

                if (visitData) {
                    // Process photos
                    let photos = [];
                    try {
                        photos = JSON.parse(visitData.photo_url);
                        if (!Array.isArray(photos)) photos = visitData.photo_url ? [visitData.photo_url] : [];
                    } catch(e) {
                        if (visitData.photo_url) photos = [visitData.photo_url];
                    }
                    visitData.parsedPhotos = photos;
                    setVisit(visitData);
                }
            } catch (err) {
                console.error("Failed to load visit data:", err);
            }
            setLoading(false);
        }

        fetchVisit();
    }, [visitId]);

    if (loading) return <div className="p-10 text-center font-bold text-gray-500">กำลังโหลดเอกสาร...</div>;
    if (!visit) return <div className="p-10 text-center font-bold text-red-500">ไม่พบข้อมูลการเข้าพบลูกค้า</div>;

    const customerName = visit.sales_plans?.customer_name || visit.customer_name || "ไม่ระบุชื่อลูกค้า";
    const customerCode = visit.sales_plans?.customer_code || visit.customer_code || "-";
    const checkInTime = visit.check_in_time ? new Date(visit.check_in_time) : new Date(visit.created_at);
    const checkOutTime = visit.check_out_time ? new Date(visit.check_out_time) : null;

    const formatDate = (date) => {
        if (!date) return '-';
        return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatTime = (date) => {
        if (!date) return '-';
        return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    };

    const purposeMap = {
        'sales': 'เสนอขายสินค้า',
        'collection': 'เก็บเงิน/วางบิล',
        'inspection': 'ตรวจสอบหน้าร้าน',
        'other': 'อื่นๆ'
    };

    return (
        <div className="bg-white min-h-screen font-sans" style={{ color: '#111' }}>
            <Head>
                <title>Visit Report - {customerName}</title>
            </Head>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700&display=swap');
                body { font-family: 'Noto Sans Thai', sans-serif; background: #fff; margin: 0; padding: 20px; font-size: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .page { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                .header { border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
                .header-title { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
                .header-subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
                .section { margin-bottom: 30px; }
                .section-title { font-size: 16px; font-weight: 700; color: #1e293b; background: #f1f5f9; padding: 8px 12px; border-left: 4px solid #3b82f6; margin-bottom: 15px; }
                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .info-group { margin-bottom: 15px; }
                .info-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
                .info-value { font-size: 15px; font-weight: 600; color: #0f172a; }
                .notes-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; min-height: 100px; white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
                .photo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
                .photo-item { border: 1px solid #e2e8f0; border-radius: 6px; padding: 5px; background: #fff; }
                .photo-item img { width: 100%; aspect-ratio: 4/3; object-fit: contain; background: #f1f5f9; }
                
                @media print {
                    body { background: #fff; padding: 0; }
                    .page { border: none; box-shadow: none; padding: 0; max-width: 100%; }
                    .no-print { display: none !important; }
                    .photo-grid { grid-template-columns: repeat(2, 1fr); }
                    .photo-item { break-inside: avoid; }
                }
            `}</style>

            <div className="no-print mb-6 text-center">
                <button 
                    onClick={() => window.print()}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-sm"
                >
                    🖨️ พิมพ์รายงาน (Print)
                </button>
            </div>

            <div className="page">
                <div className="header">
                    <div>
                        <h1 className="header-title">รายงานการเข้าพบลูกค้า</h1>
                        <div className="header-subtitle">Customer Visit Report</div>
                    </div>
                    <div className="text-right">
                        <div className="info-label">วันที่เข้าพบ</div>
                        <div className="info-value text-lg">{formatDate(checkInTime)}</div>
                    </div>
                </div>

                <div className="grid-2">
                    <div className="section">
                        <div className="section-title">ข้อมูลลูกค้า</div>
                        <div className="info-group">
                            <div className="info-label">ชื่อลูกค้า / ร้านค้า</div>
                            <div className="info-value">{customerName}</div>
                        </div>
                        <div className="info-group">
                            <div className="info-label">รหัสลูกค้า</div>
                            <div className="info-value">{customerCode}</div>
                        </div>
                        <div className="info-group">
                            <div className="info-label">วัตถุประสงค์</div>
                            <div className="info-value text-blue-600">{purposeMap[visit.purpose] || visit.purpose || 'ทั่วไป'}</div>
                        </div>
                    </div>

                    <div className="section">
                        <div className="section-title">ข้อมูลผู้ปฏิบัติงาน</div>
                        <div className="info-group">
                            <div className="info-label">พนักงานขาย (Sales Person)</div>
                            <div className="info-value">{visit.sales_person || '-'}</div>
                        </div>
                        <div className="info-group">
                            <div className="info-label">สถานะงาน</div>
                            <div className="info-value">
                                {visit.is_completed ? '✅ ปิดงานเรียบร้อย' : '⌛ อยู่ระหว่างดำเนินการ'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="section">
                    <div className="section-title">รายละเอียดเวลาและสถานที่</div>
                    <div className="grid-2">
                        <div>
                            <div className="info-group">
                                <div className="info-label">เวลา Check-in</div>
                                <div className="info-value text-emerald-600">{formatTime(checkInTime)}</div>
                            </div>
                            <div className="info-group">
                                <div className="info-label">พิกัด Check-in</div>
                                <div className="info-value text-xs font-normal">
                                    {visit.latitude && visit.longitude ? (
                                        <a href={`https://maps.google.com/?q=${visit.latitude},${visit.longitude}`} className="text-blue-500 no-underline" target="_blank" rel="noreferrer">
                                            {visit.latitude.toFixed(6)}, {visit.longitude.toFixed(6)}
                                        </a>
                                    ) : 'ไม่ระบุพิกัด'}
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="info-group">
                                <div className="info-label">เวลา Check-out</div>
                                <div className="info-value text-rose-600">{formatTime(checkOutTime)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="section">
                    <div className="section-title">ผลการปฏิบัติงาน / หมายเหตุ</div>
                    <div className="notes-box">
                        {visit.notes || <span className="text-gray-400 italic">ไม่มีการบันทึกข้อมูลเพิ่มเติม</span>}
                    </div>
                </div>

                {visit.parsedPhotos && visit.parsedPhotos.length > 0 && (
                    <div className="section" style={{ breakInside: 'avoid' }}>
                        <div className="section-title">รูปภาพหลักฐาน ({visit.parsedPhotos.length} รูป)</div>
                        <div className="photo-grid">
                            {visit.parsedPhotos.map((url, idx) => (
                                <div key={idx} className="photo-item">
                                    <img src={url} alt={`Visit Photo ${idx+1}`} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="mt-16 pt-8 border-t border-gray-200 grid-2 text-center" style={{ breakInside: 'avoid' }}>
                    <div>
                        <div className="mb-8">ลงชื่อ.......................................................</div>
                        <div className="info-value">({visit.sales_person || '........................................'})</div>
                        <div className="info-label mt-1">ผู้เข้าพบ / พนักงานขาย</div>
                    </div>
                    <div>
                        <div className="mb-8">ลงชื่อ.......................................................</div>
                        <div className="info-value">(........................................)</div>
                        <div className="info-label mt-1">ผู้ตรวจสอบ / หัวหน้างาน</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
