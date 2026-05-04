import { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import Loading from "../components/Loading";
import { useRouter } from "next/router";
import { WAREHOUSES } from "../lib/locations";

export default function GoodsIssue() {
    const router = useRouter();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("FG"); // "FG" or "RM"
    
    useEffect(() => {
        if (router.query.tab === "RM") setActiveTab("RM");
        else if (router.query.tab === "FG") setActiveTab("FG");
    }, [router.query.tab]);
    
    const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
    const [warehouseCode, setWarehouseCode] = useState("ST002");
    const [inWarehouseCode, setInWarehouseCode] = useState("");
    const [custCode, setCustCode] = useState("");
    const [empCode, setEmpCode] = useState("");
    const [pjtCode, setPjtCode] = useState("");
    const [remarks, setRemarks] = useState("");
    const [selectedItems, setSelectedItems] = useState([]);
    
    // For loading requests
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [approvedRequests, setApprovedRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [loadedRequestId, setLoadedRequestId] = useState(null);
    
    // For product search
    const [searchTerm, setSearchTerm] = useState("");
    const [showProductList, setShowProductList] = useState(false);
    
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        async function fetchProducts() {
            try {
                // ดึงสินค้าจาก /api/products หรือ inventory ก็ได้
                // ในที่นี้ดึงจาก products เพราะเราต้องการแค่ PROD_CD, PROD_DES
                const res = await fetch("/api/products");
                const data = await res.json();
                if (res.ok) {
                    setProducts(data.products || []);
                }
            } catch (err) {
                console.error("Failed to load products", err);
            }
            setLoading(false);
        }
        fetchProducts();
    }, []);

    const filteredProducts = useMemo(() => {
        let currentProducts = products;
        
        // Filter by Tab (Ecount Type: 1 = FG, 3 = RM)
        if (activeTab === "FG") {
            currentProducts = currentProducts.filter(p => p.PROD_TYPE === "1");
        } else if (activeTab === "RM") {
            currentProducts = currentProducts.filter(p => p.PROD_TYPE === "3");
        }

        if (!searchTerm) return currentProducts.slice(0, 50); // Show max 50 initially
        const s = searchTerm.toLowerCase();
        return currentProducts.filter(p => 
            (p.PROD_CD || "").toLowerCase().includes(s) || 
            (p.PROD_DES || "").toLowerCase().includes(s)
        ).slice(0, 50);
    }, [products, searchTerm, activeTab]);

    const addItem = (prod) => {
        // Allow adding the same product multiple times for different Lots
        setSelectedItems([...selectedItems, {
            id: Date.now() + Math.random(),
            productCode: prod.PROD_CD,
            productName: prod.PROD_DES,
            quantity: 1,
            price: "",
            remarks: "",
            lotNo: ""
        }]);
        setSearchTerm("");
        setShowProductList(false);
    };

    const updateItemQuantity = (id, qty) => {
        const num = parseFloat(qty) || 0;
        if (qty === "" || num <= 0) {
            setSelectedItems(selectedItems.filter(i => i.id !== id));
            return;
        }
        setSelectedItems(selectedItems.map(i => 
            i.id === id ? { ...i, quantity: qty } : i
        ));
    };

    const updateItemField = (id, field, value) => {
        setSelectedItems(selectedItems.map(i => 
            i.id === id ? { ...i, [field]: value } : i
        ));
    };

    const removeItem = (id) => {
        setSelectedItems(selectedItems.filter(i => i.id !== id));
    };

    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            alert("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");
            return;
        }

        if (!confirm("คุณยืนยันที่จะทำรายการเบิก/จ่ายสินค้านี้ใช่หรือไม่?")) return;

        setSubmitting(true);
        try {
            const formattedDate = issueDate.replace(/-/g, ""); // "20240416"
            
            const payload = {
                date: formattedDate,
                warehouseCode,
                inWarehouseCode,
                custCode,
                empCode,
                pjtCode,
                remarks,
                items: selectedItems
            };

            const res = await fetch("/api/goods-issue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("✅ ทำรายการเบิก/จ่ายสำเร็จ สต๊อกใน Ecount ถูกตัดแล้ว");
                router.push("/inventory");
            } else {
                const errorData = await res.json();
                alert("❌ เกิดข้อผิดพลาด: " + (errorData.error || "Unknown"));
            }
        } catch (error) {
            console.error(error);
            alert("❌ ระบบขัดข้อง");
        }
        setSubmitting(false);
    };

    const loadRequests = async () => {
        setLoadingRequests(true);
        setShowRequestModal(true);
        try {
            const type = activeTab === "FG" ? "FINISH_GOODS" : "RAW_MATERIAL";
            const res = await fetch(`/api/warehouse/issue/list?type=${type}`);
            const data = await res.json();
            setApprovedRequests((data.requests || []).filter(r => r.status === "approved"));
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingRequests(false);
        }
    };

    const selectRequest = (req) => {
        setWarehouseCode(req.from_warehouse || "ST002");
        if (req.to_warehouse) setInWarehouseCode(req.to_warehouse);
        setRemarks(`อ้างอิงใบขอเบิก: ${req.request_no} - ${req.purpose}`);
        setLoadedRequestId(req.id);
        
        const newItems = [];
        (req.warehouse_issue_items || []).forEach(item => {
            if (item.approved_qty > 0) {
                newItems.push({
                    id: Date.now() + Math.random(),
                    original_item_id: item.id,
                    productCode: item.product_code,
                    productName: item.product_name,
                    quantity: item.approved_qty,
                    price: "",
                    remarks: item.item_remarks || "",
                    lotNo: ""
                });
            }
        });
        setSelectedItems(newItems);
        setShowRequestModal(false);
    };

    return (
        <Layout>
            <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 mb-1">📤 เบิกจ่ายสินค้า (Goods Issued)</h1>
                    <p className="text-sm text-gray-500">ทำรายการเบิกของ แจกแถม หรือตัดสต๊อก</p>
                </div>
            </div>

            {/* TABS (FG vs Raw Mat) */}
            <div className="flex mb-6 space-x-2 bg-gray-100 p-1.5 rounded-xl w-full max-w-md">
                <button 
                    onClick={() => { setActiveTab("FG"); setSelectedItems([]); setLoadedRequestId(null); }} 
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "FG" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                    📦 สินค้าสำเร็จรูป (FG)
                </button>
                <button 
                    onClick={() => { setActiveTab("RM"); setSelectedItems([]); setLoadedRequestId(null); }} 
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "RM" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                    🏭 วัตถุดิบ (Raw Mat)
                </button>
            </div>

            <div className="mb-6 bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm font-bold text-blue-900">ดึงข้อมูลจากเอกสารขอเบิก</h3>
                    <p className="text-xs text-blue-600">ไม่ต้องกรอกเอง เลือกจากใบขอเบิกที่อนุมัติแล้ว</p>
                </div>
                <button onClick={loadRequests} className="px-5 py-2.5 bg-blue-600 text-white font-black text-xs rounded-xl hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap">
                    📋 เลือกใบขอเบิกที่อนุมัติแล้ว
                </button>
            </div>

            {loading ? (
                <div className="min-h-[400px] flex items-center justify-center">
                    <Loading />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ฟอร์มข้อมูลหลัก */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">รายละเอียดใบเบิก</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">วันที่เบิก/จ่าย</label>
                                    <input 
                                        type="date" 
                                        value={issueDate}
                                        onChange={e => setIssueDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-gray-50"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">คลังต้นทาง (WH_CD)</label>
                                    <select 
                                        value={warehouseCode}
                                        onChange={e => setWarehouseCode(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-700 bg-white"
                                    >
                                        <optgroup label="คลังหลัก">
                                            {WAREHOUSES.filter(w => w.type === 'Main').map(w => (
                                                <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="คลังรถเซลส์ (Van)">
                                            {WAREHOUSES.filter(w => w.type === 'Van').map(w => (
                                                <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                                            ))}
                                        </optgroup>
                                        {WAREHOUSES.filter(w => w.type === 'Factory').length > 0 && (
                                            <optgroup label="โรงงาน">
                                                {WAREHOUSES.filter(w => w.type === 'Factory').map(w => (
                                                    <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                                                ))}
                                            </optgroup>
                                        )}
                                        {WAREHOUSES.filter(w => w.type === 'Other').length > 0 && (
                                            <optgroup label="อื่นๆ">
                                                {WAREHOUSES.filter(w => w.type === 'Other').map(w => (
                                                    <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">รหัสลูกค้า (CUST)</label>
                                        <input 
                                            type="text" 
                                            value={custCode}
                                            onChange={e => setCustCode(e.target.value)}
                                            placeholder="ไม่บังคับ"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">พนักงาน (EMP_CD)</label>
                                        <input 
                                            type="text" 
                                            value={empCode}
                                            onChange={e => setEmpCode(e.target.value)}
                                            placeholder="ไม่บังคับ"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">คลังปลายทาง (IN_WH)</label>
                                        <select 
                                            value={inWarehouseCode}
                                            onChange={e => setInWarehouseCode(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                        >
                                            <option value="">-- ไม่ระบุ --</option>
                                            <optgroup label="คลังหลัก">
                                                {WAREHOUSES.filter(w => w.type === 'Main').map(w => (
                                                    <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="คลังรถเซลส์ (Van)">
                                                {WAREHOUSES.filter(w => w.type === 'Van').map(w => (
                                                    <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                                                ))}
                                            </optgroup>
                                            {WAREHOUSES.filter(w => w.type === 'Factory').length > 0 && (
                                                <optgroup label="โรงงาน">
                                                    {WAREHOUSES.filter(w => w.type === 'Factory').map(w => (
                                                        <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {WAREHOUSES.filter(w => w.type === 'Other').length > 0 && (
                                                <optgroup label="อื่นๆ">
                                                    {WAREHOUSES.filter(w => w.type === 'Other').map(w => (
                                                        <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">โปรเจกต์ (PJT_CD)</label>
                                        <input 
                                            type="text" 
                                            value={pjtCode}
                                            onChange={e => setPjtCode(e.target.value)}
                                            placeholder="ไม่บังคับ"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">เหตุผล / หมายเหตุ</label>
                                    <textarea 
                                        value={remarks}
                                        onChange={e => setRemarks(e.target.value)}
                                        placeholder="เช่น เบิกไปแจกฟรี, สินค้าชำรุดเคลมทิ้ง"
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* รายการสินค้า */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                            <div className="p-5 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <h2 className="text-lg font-bold text-gray-800">รายการสินค้าที่จะตัดสต๊อก</h2>
                                
                                <div className="relative flex-1 max-w-sm">
                                    <input 
                                        type="text"
                                        placeholder="🔍 ค้นหาสินค้าเพื่อเพิ่ม..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setShowProductList(true);
                                        }}
                                        onFocus={() => setShowProductList(true)}
                                        className="w-full pl-9 pr-3 py-2 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                    
                                    {showProductList && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setShowProductList(false)}></div>
                                            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 shadow-xl rounded-xl max-h-60 overflow-y-auto">
                                                {filteredProducts.length > 0 ? (
                                                    filteredProducts.map(p => (
                                                        <div 
                                                            key={p.PROD_CD}
                                                            onClick={() => addItem(p)}
                                                            className="px-4 py-2 border-b border-gray-100 hover:bg-blue-50 cursor-pointer flex justify-between items-center"
                                                        >
                                                            <div className="overflow-hidden">
                                                                <div className="text-xs font-bold text-blue-700">{p.PROD_CD}</div>
                                                                <div className="text-sm text-gray-800 truncate">{p.PROD_DES}</div>
                                                            </div>
                                                            <div className="text-xl text-blue-500 ml-2">+</div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-3 text-sm text-gray-500 text-center">ไม่พบสินค้า</div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="p-0 overflow-x-auto flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white border-b border-gray-100 text-xs text-gray-500 uppercase">
                                            <th className="px-4 py-3 font-semibold w-1/3">สินค้า / รายละเอียด Lot</th>
                                            <th className="px-4 py-3 font-semibold text-center w-28">จำนวน</th>
                                            <th className="px-4 py-3 font-semibold text-center w-28">ราคา</th>
                                            <th className="px-4 py-3 font-semibold text-center w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {selectedItems.length > 0 ? (
                                            selectedItems.map(item => (
                                                <tr key={item.id} className="hover:bg-gray-50/50">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-gray-700 text-sm">{item.productCode}</div>
                                                        <div className="text-xs text-gray-500 truncate mb-2">{item.productName}</div>
                                                        <div className="mb-2">
                                                            <label className="text-[10px] text-gray-400">Lot No. ที่ต้องการเบิกจ่าย</label>
                                                            <input 
                                                                type="text" 
                                                                value={item.lotNo}
                                                                onChange={e => updateItemField(item.id, "lotNo", e.target.value)}
                                                                placeholder="รหัส Lot"
                                                                className="w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-blue-400"
                                                            />
                                                        </div>
                                                        <input 
                                                            type="text" 
                                                            value={item.remarks}
                                                            onChange={e => updateItemField(item.id, "remarks", e.target.value)}
                                                            placeholder="หมายเหตุรายการ"
                                                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-blue-400"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center align-top">
                                                        <div className="flex items-center justify-center border border-gray-200 rounded-lg overflow-hidden h-8 mt-4">
                                                            <button 
                                                                onClick={() => updateItemQuantity(item.id, (parseFloat(item.quantity) || 0) - 1)}
                                                                className="w-8 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center font-bold transition-colors"
                                                            >-</button>
                                                            <input 
                                                                type="text" 
                                                                value={item.quantity}
                                                                onChange={e => updateItemQuantity(item.id, e.target.value)}
                                                                className="w-10 h-full text-center bg-white text-sm font-semibold outline-none border-x border-gray-200"
                                                            />
                                                            <button 
                                                                onClick={() => updateItemQuantity(item.id, (parseFloat(item.quantity) || 0) + 1)}
                                                                className="w-8 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center font-bold transition-colors"
                                                            >+</button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center align-top">
                                                        <input 
                                                            type="number" 
                                                            value={item.price}
                                                            onChange={e => updateItemField(item.id, "price", e.target.value)}
                                                            placeholder="ไม่บังคับ"
                                                            className="w-full px-2 py-1 h-8 mt-4 text-center border border-gray-200 rounded-lg outline-none text-sm focus:border-blue-400"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center align-top">
                                                        <button 
                                                            onClick={() => removeItem(item.id)}
                                                            className="text-red-400 hover:text-red-600 p-1 mt-4"
                                                            title="ลบรายการ"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="px-4 py-12 text-center text-gray-400">
                                                    ยังไม่มีสินค้า ค้นหาและเลือกสินค้าจากช่องด้านบน
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="p-4 border-t border-gray-100 bg-white">
                                <button
                                    onClick={handleSubmit}
                                    disabled={selectedItems.length === 0 || submitting}
                                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <span>กำลังบันทึกและตัดสต๊อก...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>📤 ยืนยันการเบิก/จ่ายสินค้า</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showRequestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-fade-up">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="font-black text-slate-800 text-lg">เลือกใบขอเบิกที่อนุมัติแล้ว ({activeTab})</h3>
                                <p className="text-xs text-slate-500 font-bold">เลือกเอกสารเพื่อดึงรายการสินค้ามาจ่ายออก</p>
                            </div>
                            <button onClick={() => setShowRequestModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-slate-500 hover:bg-slate-200 font-bold">✕</button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 bg-slate-50/50">
                            {loadingRequests ? (
                                <div className="text-center py-10 text-slate-500 font-bold text-sm">กำลังโหลดข้อมูล...</div>
                            ) : approvedRequests.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 font-bold">ไม่มีใบขอเบิกที่รอจ่ายสินค้า</div>
                            ) : (
                                <div className="space-y-3">
                                    {approvedRequests.map(req => (
                                        <div key={req.id} onClick={() => selectRequest(req)} className="bg-white p-4 rounded-2xl border border-slate-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="font-black text-slate-800 group-hover:text-blue-700">{req.request_no}</div>
                                                    <div className="text-xs text-slate-500 font-bold mt-0.5">{req.requester_name} · {req.department}</div>
                                                </div>
                                                <div className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase">เลือกเอกสารนี้</div>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold">{req.purpose} · มี {req.warehouse_issue_items?.length || 0} รายการ</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
