import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import Loading from "../components/Loading";
import { supabase } from "../lib/supabase";

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [userEmail, setUserEmail] = useState("");
    const [processingId, setProcessingId] = useState(null);

    // For invoice modal
    const [showModal, setShowModal] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

    // For Edit/Approve Order modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editOrderId, setEditOrderId] = useState(null);

    useEffect(() => {
        async function init() {
            setLoading(true);

            const { data: { session } } = await supabase.auth.getSession();
            let role = "sale";
            let email = "";

            if (session?.user) {
                email = session.user.email || "";
                setUserEmail(email);

                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", session.user.id)
                    .single();
                role = profile?.role || "sale";
                setUserRole(role);
            }

            await fetchOrders(role, email);
        }
        init();
    }, []);

    const fetchOrders = async (role, email) => {
        try {
            const params = new URLSearchParams();
            if (role) params.set("role", role);
            if (email) params.set("email", email);

            const res = await fetch(`/api/orders?${params.toString()}`);
            const data = await res.json();
            if (res.ok) setOrders(data);
        } catch (err) {
            console.error("Failed to load orders", err);
        }
        setLoading(false);
    };

    const handleApprove = async (id) => {
        if (!confirm("คุณต้องการอนุมัติออเดอร์นี้ใช่หรือไม่?")) return;
        setProcessingId(id);
        try {
            const res = await fetch("/api/approve-so", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                alert("✅ อนุมัติสำเร็จ");
                await fetchOrders(userRole, userEmail);
            } else {
                const error = await res.json();
                alert("❌ เกิดข้อผิดพลาด: " + error.error);
            }
        } catch (err) {
            alert("❌ ระบบขัดข้อง");
        }
        setProcessingId(null);
    };

    const openInvoiceModal = (id) => {
        setSelectedOrderId(id);
        setShowModal(true);
    };

    const openEditModal = (id) => {
        setEditOrderId(id);
        setShowEditModal(true);
    };

    const closeEditModal = () => {
        setEditOrderId(null);
        setShowEditModal(false);
        fetchOrders(userRole, userEmail); // Refresh data when modal closes
    };

    const submitInvoice = async () => {
        setProcessingId(selectedOrderId);
        setShowModal(false);
        try {
            const res = await fetch("/api/invoice-so", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: selectedOrderId, invoiceDate })
            });

            if (res.ok) {
                alert("✅ เปิดบิลบัญชีสำเร็จ ข้อมูลถูกส่งเข้า Ecount แล้ว");
                await fetchOrders(userRole, userEmail);
            } else {
                const error = await res.json();
                alert("❌ เกิดข้อผิดพลาดในการเปิดบิล: " + error.error);
            }
        } catch (err) {
            alert("❌ ระบบขัดข้อง");
        }
        setProcessingId(null);
    };

    const formatCurrency = (val) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val || 0);

    // manager = role สูงสุด
    const isManager = userRole === "manager";

    return (
        <Layout>
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200 flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">📝 รายการ Orders & อนุมัติ</h1>
                    <p className="text-gray-500 font-medium">ติดตามสถานะบิลขาย และจัดการส่งข้อมูลไปยังฝ่ายบัญชี</p>
                </div>
                {/* Badge แสดง scope */}
                {userRole === "sale" ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl">
                        <span>🧑‍💼</span>
                        <div className="text-sm">
                            <div className="font-semibold text-blue-700">ออเดอร์ของฉัน</div>
                            <div className="text-xs text-blue-500">{userEmail}</div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-xl">
                        <span>🏆</span>
                        <div className="text-sm">
                            <div className="font-semibold text-purple-700">ทุกออเดอร์ในระบบ</div>
                            <div className="text-xs text-purple-500">Manager view</div>
                        </div>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="min-h-[400px] flex items-center justify-center">
                    <Loading />
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">วันที่ / ลูกค้า</th>
                                    {/* Manager เห็น column Sale Person */}
                                    {isManager && <th className="px-6 py-4 font-semibold">Sale Person</th>}
                                    <th className="px-6 py-4 font-semibold text-right">ยอดรวม (฿)</th>
                                    <th className="px-6 py-4 font-semibold text-center">สถานะอนุมัติ</th>
                                    <th className="px-6 py-4 font-semibold text-center">สถานะบัญชี</th>
                                    <th className="px-6 py-4 font-semibold text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orders.map(order => (
                                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">{order.order_date}</div>
                                            <div className="text-sm text-gray-500">ลูกค้า: {order.customer_code}</div>
                                        </td>

                                        {/* Sale Person column — เฉพาะ Manager */}
                                        {isManager && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                        {(order.sales_person || "?")[0].toUpperCase()}
                                                    </div>
                                                    <span className="text-xs text-gray-600">{order.sales_person || "—"}</span>
                                                </div>
                                            </td>
                                        )}

                                        <td className="px-6 py-4 text-right">
                                            <span className="font-bold text-gray-800">{formatCurrency(order.total_amount)}</span>
                                        </td>

                                        <td className="px-6 py-4 text-center">
                                            {order.approval_status === "approved" ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    ✅ อนุมัติแล้ว
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                    ⌛ รอตรวจสอบ
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-center">
                                            {order.invoice_status === "invoiced" ? (
                                                <div>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        🧾 เปิดบิลแล้ว
                                                    </span>
                                                    <div className="text-xs text-gray-400 mt-1">วันที่บิล: {order.invoice_date}</div>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                    รอดำเนินการ
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col gap-2 items-center justify-center">
                                                {/* Manager only: Approve Button */}
                                                {order.approval_status !== "approved" && isManager && (
                                                    <button
                                                        onClick={() => openEditModal(order.id)}
                                                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded shadow-sm transition-colors w-full max-w-[120px]"
                                                    >
                                                        🔍 ตรวจสอบ
                                                    </button>
                                                )}

                                                {/* Manager only: Invoice Button */}
                                                {order.approval_status === "approved" && order.invoice_status !== "invoiced" && isManager && (
                                                    <button
                                                        onClick={() => openInvoiceModal(order.id)}
                                                        disabled={processingId === order.id}
                                                        className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded shadow-sm transition-colors w-full max-w-[120px] disabled:opacity-50"
                                                    >
                                                        {processingId === order.id ? "กำลังทำงาน..." : "👉 ส่งเข้าบัญชี"}
                                                    </button>
                                                )}

                                                {/* Sale view */}
                                                {!isManager && order.approval_status !== "approved" && (
                                                    <span className="text-xs text-gray-400 italic">รอหัวหน้าอนุมัติ</span>
                                                )}
                                                {!isManager && order.approval_status === "approved" && (
                                                    <span className="text-xs text-emerald-500 font-semibold">✅ อนุมัติแล้ว</span>
                                                )}

                                                {/* All users: Print Button */}
                                                <button
                                                    onClick={() => window.open(`/print-so?visitId=${order.plan_id || ''}&orderId=${order.id}`, '_blank')}
                                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded shadow-sm transition-colors border border-indigo-200 w-full max-w-[120px] flex items-center justify-center gap-1"
                                                >
                                                    📄 ดูใบสั่งขาย
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {orders.length === 0 && (
                                    <tr>
                                        <td colSpan={isManager ? "6" : "5"} className="px-6 py-12 text-center text-gray-500">
                                            {userRole === "sale" ? "คุณยังไม่มีบิลในระบบ" : "ไม่มีบิลจำหน่ายในระบบ ณ ขณะนี้"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal for Invoice Date */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">กำหนดวันที่ของ Invoice</h3>
                        <p className="text-sm text-gray-500 mb-4">ระบบจะสร้างใบกำกับสินค้าฝั่งบัญชีด้วยวันที่นี้</p>

                        <div className="mb-5">
                            <label className="block text-sm font-medium text-gray-700 mb-2">วันที่หัวบิล</label>
                            <input
                                type="date"
                                value={invoiceDate}
                                onChange={(e) => setInvoiceDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-medium transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={submitInvoice}
                                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                            >
                                ยืนยันส่งบัญชี
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Edit/Approve Order */}
            {showEditModal && editOrderId && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 sm:p-6">
                    <div className="bg-slate-50 w-full max-w-4xl h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
                        <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-100 shrink-0">
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">📝 ตรวจสอบและแก้ไขใบสั่งขาย</h2>
                            <button onClick={closeEditModal} className="w-10 h-10 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full flex items-center justify-center transition-colors">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 w-full bg-slate-50 relative">
                            <iframe 
                                src={`/create-so?orderId=${editOrderId}&embed=true`} 
                                className="w-full h-full border-none"
                                title="Edit Order"
                            />
                        </div>
                    </div>
                </div>
            )}

        </Layout>
    );
}
