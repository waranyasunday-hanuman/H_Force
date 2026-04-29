import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function PrintSO() {
    const router = useRouter();
    const { visitId, orderId } = router.query;
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!visitId && !orderId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const queryParam = visitId ? `planId=${visitId}` : `orderId=${orderId}`;
                const res = await fetch(`/api/get-so?${queryParam}`);
                const result = await res.json();
                if (res.ok) {
                    setData(result);
                } else {
                    setError(result.error || "เกิดข้อผิดพลาดในการดึงข้อมูลใบสั่งขาย");
                }
            } catch (err) {
                setError(err.message);
            }
            setLoading(false);
        };
        fetchData();
    }, [visitId, orderId]);

    if (!visitId && !orderId) return <div className="p-10 text-center font-bold text-gray-500">กำลังโหลด...</div>;
    if (loading) return <div className="p-10 text-center font-bold text-gray-500">กำลังโหลดข้อมูลใบสั่งขาย...</div>;
    if (error) return <div className="p-10 text-center font-bold text-red-500">{error}</div>;
    if (!data) return null;
    if (!data.order) return (
        <div className="p-10 text-center">
            <div className="text-6xl mb-4">📋</div>
            <div className="font-bold text-slate-700 text-xl mb-2">ยังไม่มีใบสั่งขาย</div>
            <div className="text-slate-400 text-sm">แผนงานนี้ยังไม่มี SO ที่บันทึกไว้ กรุณาสร้าง SO ก่อนแล้วจึงพิมพ์</div>
        </div>
    );

    const { order, customer } = data;
    const items = order.items || [];
    let metadata = {};
    const validItems = [];
    items.forEach(it => {
        if (it.isMetadata) metadata = it;
        else validItems.push(it);
    });
    
    // Calculate totals
    const subTotal = validItems.reduce((s, it) => s + (parseFloat(it.price) || 0) * (parseInt(it.quantity) || 0), 0);
    const totalAmount = parseFloat(order.total_amount) || subTotal; // In case total_amount is stored
    const discAmt = subTotal - totalAmount; // Infer discount if total_amount < subTotal
    const depositAmt = 0; // Not strictly stored in DB right now, assume 0
    const netPayable = totalAmount - depositAmt;

    const fmtCurr = (v) => new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
    const paymentLabel = { cash: "💵 เงินสด", transfer: "📱 โอนเงิน", credit: "💳 เครดิต" }[order.payment_type] || order.payment_type || "—";
    
    const needTax = order.need_tax_invoice || metadata.needTaxInvoice;
    const sigUrl = order.customer_signature_url || metadata.signatureUrl;
    
    const now = new Date();
    const printDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543}`;
    
    let soDate = printDate;
    if (order.order_date) {
        const d = new Date(order.order_date);
        soDate = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`;
    }

    return (
        <div className="bg-white min-h-screen font-sans" style={{ color: '#111' }}>
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700&display=swap');
                body { font-family: 'Noto Sans Thai', sans-serif; background: #fff; margin: 0; padding: 20px; font-size: 13px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .page { max-width: 100%; margin: 0; border: none; border-radius: 0; overflow: hidden; padding: 20px; min-height: 100vh; display: flex; flex-direction: column; }
                .flex-1 { flex: 1; }
                .header { background: linear-gradient(135deg,#6366f1,#8b5cf6); color: #fff; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
                .header h1 { font-size: 22px; font-weight: 700; margin: 0; }
                .header .meta { font-size: 12px; opacity: .85; text-align: right; }
                .section { padding: 16px 24px; border-bottom: 1px solid #e5e7eb; }
                .section:last-child { border-bottom: none; }
                .section-title { font-size: 11px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
                .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .field label { font-size: 11px; color: #6b7280; font-weight: 600; display: block; margin-bottom: 2px; }
                .field span { font-size: 13px; font-weight: 600; color: #111; }
                table { width: 100%; border-collapse: collapse; }
                thead th { background: #f5f3ff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #6366f1; padding: 8px 10px; text-align: left; border-bottom: 2px solid #e0e7ff; }
                tbody td { padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
                tbody tr:nth-child(even) td { background: #fafafa; }
                .text-right { text-align: right; }
                .total-row { display: flex; justify-content: flex-end; padding: 12px 24px; }
                .total-box { background: #f5f3ff; border: 1px solid #e0e7ff; border-radius: 10px; padding: 12px 20px; min-width: 240px; }
                .payment-badge { display: inline-block; background: #ede9fe; color: #6366f1; border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 700; }
                .footer { background: #f9fafb; padding: 14px 24px; display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; }
                .sign-area { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #d1d5db; display: flex; gap: 40px; }
                .sign-box { flex: 1; text-align: center; }
                .sign-box .line { border-top: 1px solid #374151; margin: 24px 8px 4px; }
                .sign-box .role { font-size: 11px; color: #6b7280; }
                @media print { 
                    @page { size: A4; margin: 0; }
                    body { padding: 0; } 
                    .no-print { display: none !important; } 
                }
            `}</style>

            <div className="no-print" style={{ textAlign: 'right', marginBottom: '20px', padding: '20px' }}>
                <button onClick={() => window.print()} style={{ padding: '10px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 6px rgba(99,102,241,0.2)' }}>
                    🖨️ พิมพ์เอกสาร
                </button>
            </div>

            <div className="page">
                {/* Header */}
                <div className="header">
                    <div>
                        <div style={{ fontSize: '12px', opacity: .8, marginBottom: '4px', fontWeight: 'bold' }}>ใบสั่งของชั่วคราว / ใบสั่งขาย / ใบกำกับภาษี / ใบเสร็จอย่างย่อ</div>
                        <h1>บริษัท สมุนไพร หนุมาน จำกัด</h1>
                    </div>
                    <div className="meta">
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>วันที่พิมพ์: {printDate}</div>
                        <div>วันที่เอกสาร: {soDate}</div>
                        <div>พนักงานขาย (SALE): {order.sales_person || "Seller"}</div>
                        <div style={{ marginTop: '4px', fontWeight: 'bold', color: '#fbbf24' }}>
                            เล่มที่: _______ เลขที่: {order.so_number || order.id || '—'}
                        </div>
                    </div>
                </div>

                {/* Customer */}
                <div className="section">
                    <div className="section-title">ข้อมูลลูกค้า</div>
                    <div className="row2">
                        <div className="field"><label>รหัสลูกค้า</label><span>{customer?.code || "—"}</span></div>
                        <div className="field"><label>ชื่อลูกค้า</label><span>{customer?.name || "—"}</span></div>
                    </div>
                </div>

                {/* Items */}
                <div className="section">
                    <div className="section-title">รายการสินค้า</div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>รหัสสินค้า</th>
                                <th>ชื่อสินค้า</th>
                                <th>หน่วย</th>
                                <th className="text-right">จำนวน</th>
                                <th className="text-right">ราคา/หน่วย</th>
                                <th className="text-right">รวม</th>
                            </tr>
                        </thead>
                        <tbody>
                            {validItems.map((it, i) => (
                                <tr key={i}>
                                    <td>{i + 1}</td>
                                    <td>{it.productCode}</td>
                                    <td>{it.productName || ""}</td>
                                    <td>{it.unit || ""}</td>
                                    <td className="text-right">{it.quantity}</td>
                                    <td className="text-right">{fmtCurr(it.price)}</td>
                                    <td className="text-right">{fmtCurr(it.price * it.quantity)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Total Summary */}
                <div className="total-row">
                    <div className="total-box" style={{ minWidth: '280px' }}>
                        <table style={{ width: '100%', fontSize: '13px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ color: '#6b7280', padding: '3px 0' }}>ยอดรวมก่อนส่วนลด</td>
                                    <td className="text-right" style={{ fontWeight: 600 }}>{fmtCurr(subTotal)}</td>
                                </tr>
                                {discAmt > 0 && (
                                    <tr>
                                        <td style={{ color: '#ef4444', padding: '3px 0' }}>ส่วนลดท้ายบิล</td>
                                        <td className="text-right" style={{ color: '#ef4444', fontWeight: 600 }}>- {fmtCurr(discAmt)}</td>
                                    </tr>
                                )}
                                <tr style={{ borderTop: '1px solid #e0e7ff' }}>
                                    <td style={{ fontWeight: 700, padding: '6px 0 3px' }}>ยอดหลังส่วนลด</td>
                                    <td className="text-right" style={{ fontWeight: 700, fontSize: '16px', color: '#6366f1' }}>{fmtCurr(totalAmount)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Payment */}
                <div className="section" style={{ borderBottom: 'none' }}>
                    <div className="section-title">การชำระเงิน</div>
                    <div className="row2">
                        <div className="field">
                            <label>วิธีชำระเงิน</label>
                            <div><span className="payment-badge">{paymentLabel}</span></div>
                        </div>
                        <div className="field">
                            <label>หมายเหตุ / ภาษี</label>
                            <div><span style={{ fontSize: '12px', color: needTax ? '#059669' : '#6b7280' }}>
                                {needTax ? '✅ ต้องการใบกำกับภาษีเต็มรูปแบบ' : '— ไม่ต้องการใบกำกับภาษี —'}
                            </span></div>
                            {metadata.managerRemarks && <div style={{ marginTop: '6px', fontSize: '12px', color: '#b45309', background: '#fffbeb', padding: '4px 8px', borderRadius: '4px', borderLeft: '2px solid #f59e0b' }}>💬 อนุมัติ: {metadata.managerRemarks}</div>}
                        </div>
                        {order.due_date && (
                            <div className="field"><label>วันกำหนดชำระ / Due Date</label><span>{order.due_date}</span></div>
                        )}
                    </div>
                </div>

                <div className="flex-1"></div>

                {/* Signatures */}
                <div className="section" style={{ borderBottom: 'none' }}>
                    <div className="sign-area">
                        <div className="sign-box">
                            <div style={{ height: '60px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                <div style={{ fontFamily: 'cursive', fontSize: '16px', color: '#4f46e5' }}>{(order.sales_person || "Seller").split('@')[0]}</div>
                            </div>
                            <div className="line"></div>
                            <div>ลายมือชื่อผู้ขาย</div>
                            <div className="role" style={{ marginTop: '2px' }}>( {order.sales_person || "Seller"} )</div>
                        </div>
                        <div className="sign-box">
                            <div style={{ height: '60px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                {sigUrl && <img src={sigUrl} style={{ maxHeight: '60px', maxWidth: '100%', objectFit: 'contain' }} alt="Customer Signature" />}
                            </div>
                            <div className="line"></div>
                            <div>ลายมือชื่อลูกค้า</div>
                            <div className="role" style={{ marginTop: '2px' }}>( Customer )</div>
                        </div>
                        <div className="sign-box">
                            <div style={{ height: '60px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                <div style={{ fontFamily: 'cursive', fontSize: '16px', color: '#4f46e5' }}>{metadata.approverName || (order.approval_status === 'approved' ? 'Approved' : '')}</div>
                            </div>
                            <div className="line"></div>
                            <div>ลายมือชื่อผู้อนุมัติ</div>
                            <div className="role" style={{ marginTop: '2px' }}>( {metadata.approverName || 'Manager'} )</div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="footer">
                    <span>พิมพ์จากระบบ H Force · {printDate}</span>
                    <span>*เอกสารนี้ออกโดยระบบอัตโนมัติ</span>
                </div>
            </div>
        </div>
    );
}
