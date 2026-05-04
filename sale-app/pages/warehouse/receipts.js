import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { useRouter } from "next/router";
import Swal from "sweetalert2";

const STATUS_CFG = {
    EDITING: { label: "สร้างใหม่", badge: "bg-blue-100 text-blue-700 border-blue-200" },
    DRAFT:   { label: "รออนุมัติ", badge: "bg-amber-100 text-amber-700 border-amber-200" },
    APPROVED:{ label: "อนุมัติแล้ว", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    CANCELLED:{ label: "ยกเลิก", badge: "bg-red-100 text-red-700 border-red-200" },
};

export default function WarehouseReceiptsList() {
    const router = useRouter();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    
    // Type can be "FG" or "RM" based on query param
    const { type } = router.query;
    const isFG = type === "FG" || !type; // default to FG
    const displayType = isFG ? "Finish Goods (FG)" : "วัตถุดิบ (RM)";

    useEffect(() => { 
        if (router.isReady) fetchReceipts(); 
    }, [router.isReady, type]);

    const fetchReceipts = async () => {
        setLoading(true);
        try {
            const t = isFG ? "FG" : "RM";
            const res = await fetch(`/api/warehouse/receipt/list?type=${t}`);
            const data = await res.json();
            if (data.success) {
                setRequests(data.receipts || []);
            }
        } catch (e) { 
            console.error(e); 
        } finally { 
            setLoading(false); 
        }
    };

    const filtered = requests.filter(r => {
        if (search && !r.receipt_no?.toLowerCase().includes(search.toLowerCase()) &&
            !r.remarks?.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const handleCreateNew = () => {
        router.push(`/goods-receipt?tab=${isFG ? "FG" : "RM"}`);
    };

    return (
        <Layout>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-green-700 mb-1">
                        📥 รายการรับเข้าคลัง {displayType}
                    </h1>
                    <p className="text-sm text-gray-500">ประวัติและเอกสารการรับสินค้าเข้าคลังทั้งหมด</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => router.push(isFG ? "/warehouse/fg" : "/warehouse/rm")}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-all text-sm"
                    >
                        ◀ กลับไปหน้าคลัง
                    </button>
                    <button 
                        onClick={handleCreateNew}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm flex items-center gap-2"
                    >
                        ➕ สร้างการรับเข้า
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <div className="relative w-full max-w-sm">
                        <input
                            type="text"
                            placeholder="🔍 ค้นหาเลขที่เอกสาร หรือหมายเหตุ..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase whitespace-nowrap">
                                <th className="px-6 py-4 font-bold">วันที่เอกสาร</th>
                                <th className="px-6 py-4 font-bold">เลขที่เอกสาร</th>
                                <th className="px-6 py-4 font-bold">หมายเหตุ</th>
                                <th className="px-6 py-4 font-bold text-center">สถานะ</th>
                                <th className="px-6 py-4 font-bold text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-400">กำลังโหลดข้อมูล...</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-400 bg-gray-50/50">
                                        ยังไม่มีประวัติการรับเข้าคลัง {displayType}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(req => {
                                    const st = STATUS_CFG[req.status.toUpperCase()] || { label: req.status, badge: "bg-gray-100 text-gray-700" };
                                    return (
                                        <tr key={req.id} className="hover:bg-green-50/50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-700">{new Date(req.receipt_date).toLocaleDateString("th-TH")}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-green-700">{req.receipt_no}</div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs" title={req.remarks}>{req.remarks || "-"}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${st.badge}`}>
                                                    {st.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => router.push(`/goods-receipt?id=${req.id}&tab=${isFG ? "FG" : "RM"}`)}
                                                    className="px-3 py-1.5 text-xs font-bold text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition-all shadow-sm"
                                                >
                                                    ดูรายละเอียด
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Layout>
    );
}
