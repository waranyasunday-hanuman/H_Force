import { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import Loading from "../components/Loading";
import { useRouter } from "next/router";
import { WAREHOUSES } from "../lib/locations";

export default function GoodsReceipt() {
    const router = useRouter();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("FG"); // "FG" or "RM"
    
    const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
    const [inWarehouseCode, setInWarehouseCode] = useState("ST002");
    const [custCode, setCustCode] = useState("");
    const [empCode, setEmpCode] = useState("");
    const [pjtCode, setPjtCode] = useState("");
    const [remarks, setRemarks] = useState("");
    const [selectedItems, setSelectedItems] = useState([]);
    
    // For product search
    const [searchTerm, setSearchTerm] = useState("");
    const [showProductList, setShowProductList] = useState(false);
    
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        async function fetchProducts() {
            try {
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

        if (!searchTerm) return currentProducts.slice(0, 50);
        const s = searchTerm.toLowerCase();
        return currentProducts.filter(p => 
            (p.PROD_CD || "").toLowerCase().includes(s) || 
            (p.PROD_DES || "").toLowerCase().includes(s)
        ).slice(0, 50);
    }, [products, searchTerm, activeTab]);

    const addItem = (prod) => {
        const existing = selectedItems.find(i => i.productCode === prod.PROD_CD);
        if (existing) {
            updateItemQuantity(prod.PROD_CD, (parseFloat(existing.quantity) || 0) + 1);
        } else {
            setSelectedItems([...selectedItems, {
                productCode: prod.PROD_CD,
                productName: prod.PROD_DES,
                quantity: 1,
                price: "",
                remarks: ""
            }]);
        }
        setSearchTerm("");
        setShowProductList(false);
    };

    const updateItemQuantity = (code, qty) => {
        const num = parseFloat(qty) || 0;
        if (qty === "" || num <= 0) {
            setSelectedItems(selectedItems.filter(i => i.productCode !== code));
            return;
        }
        setSelectedItems(selectedItems.map(i => 
            i.productCode === code ? { ...i, quantity: qty } : i
        ));
    };

    const updateItemField = (code, field, value) => {
        setSelectedItems(selectedItems.map(i => 
            i.productCode === code ? { ...i, [field]: value } : i
        ));
    };

    const removeItem = (code) => {
        setSelectedItems(selectedItems.filter(i => i.productCode !== code));
    };

    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            alert("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");
            return;
        }

        if (!confirm("คุณยืนยันที่จะทำรายการรับสินค้าเข้าคลังนี้ใช่หรือไม่?")) return;

        setSubmitting(true);
        try {
            const formattedDate = receiptDate.replace(/-/g, ""); // "20240416"
            
            const payload = {
                date: formattedDate,
                inWarehouseCode,
                custCode,
                empCode,
                pjtCode,
                remarks,
                items: selectedItems
            };

            const res = await fetch("/api/goods-receipt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("✅ ทำรายการรับสินค้าเข้าคลังสำเร็จ สต๊อกใน Ecount เพิ่มขึ้นแล้ว");
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

    return (
        <Layout>
            <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-green-700 mb-1">📥 รับสินค้าเข้าคลัง (Goods Receipt)</h1>
                    <p className="text-sm text-gray-500">บันทึกการรับสินค้าจากซัพพลายเออร์ หรือรับสินค้าเข้าคลัง</p>
                </div>
            </div>

            {/* TABS (FG vs Raw Mat) */}
            <div className="flex mb-6 space-x-2 bg-gray-100 p-1.5 rounded-xl w-full max-w-md">
                <button 
                    onClick={() => setActiveTab("FG")} 
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "FG" ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                    📦 สินค้าสำเร็จรูป (FG)
                </button>
                <button 
                    onClick={() => setActiveTab("RM")} 
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === "RM" ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                    🏭 วัตถุดิบ (Raw Mat)
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
                        <div className="bg-green-50/30 rounded-2xl p-5 shadow-sm border border-green-100">
                            <h2 className="text-lg font-bold text-green-800 mb-4 border-b border-green-200 pb-2">รายละเอียดใบรับสินค้า</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">วันที่รับเข้า</label>
                                    <input 
                                        type="date" 
                                        value={receiptDate}
                                        onChange={e => setReceiptDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">คลังที่รับเข้า (IN_WH)</label>
                                    <select 
                                        value={inWarehouseCode}
                                        onChange={e => setInWarehouseCode(e.target.value)}
                                        className="w-full px-3 py-2 border border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-bold text-green-800 bg-white"
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
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">รหัสผู้จำหน่าย/ลูกค้า</label>
                                        <input 
                                            type="text" 
                                            value={custCode}
                                            onChange={e => setCustCode(e.target.value)}
                                            placeholder="ไม่บังคับ"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1">พนักงาน (EMP_CD)</label>
                                        <input 
                                            type="text" 
                                            value={empCode}
                                            onChange={e => setEmpCode(e.target.value)}
                                            placeholder="ไม่บังคับ"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">โปรเจกต์ (PJT_CD)</label>
                                    <input 
                                        type="text" 
                                        value={pjtCode}
                                        onChange={e => setPjtCode(e.target.value)}
                                        placeholder="ไม่บังคับ"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">หมายเหตุเอกสาร</label>
                                    <textarea 
                                        value={remarks}
                                        onChange={e => setRemarks(e.target.value)}
                                        placeholder="เช่น รับของจากโรงงานผลิต, รับคืนสินค้า"
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm resize-none"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* รายการสินค้า */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                            <div className="p-5 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <h2 className="text-lg font-bold text-gray-800">รายการสินค้าที่รับเข้า</h2>
                                
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
                                        className="w-full pl-9 pr-3 py-2 border border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm"
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
                                                            className="px-4 py-2 border-b border-gray-100 hover:bg-green-50 cursor-pointer flex justify-between items-center"
                                                        >
                                                            <div className="overflow-hidden">
                                                                <div className="text-xs font-bold text-green-700">{p.PROD_CD}</div>
                                                                <div className="text-sm text-gray-800 truncate">{p.PROD_DES}</div>
                                                            </div>
                                                            <div className="text-xl text-green-500 ml-2">+</div>
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
                                            <th className="px-4 py-3 font-semibold w-1/3">สินค้า</th>
                                            <th className="px-4 py-3 font-semibold text-center w-28">จำนวน</th>
                                            <th className="px-4 py-3 font-semibold text-center w-28">ราคา/ต้นทุน</th>
                                            <th className="px-4 py-3 font-semibold text-center w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {selectedItems.length > 0 ? (
                                            selectedItems.map(item => (
                                                <tr key={item.productCode} className="hover:bg-gray-50/50">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-gray-700 text-sm">{item.productCode}</div>
                                                        <div className="text-xs text-gray-500 truncate mb-1">{item.productName}</div>
                                                        <input 
                                                            type="text" 
                                                            value={item.remarks}
                                                            onChange={e => updateItemField(item.productCode, "remarks", e.target.value)}
                                                            placeholder="หมายเหตุรายการ"
                                                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-green-400"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center align-top">
                                                        <div className="flex items-center justify-center border border-gray-200 rounded-lg overflow-hidden h-8">
                                                            <button 
                                                                onClick={() => updateItemQuantity(item.productCode, (parseFloat(item.quantity) || 0) - 1)}
                                                                className="w-8 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center font-bold transition-colors"
                                                            >-</button>
                                                            <input 
                                                                type="text" 
                                                                value={item.quantity}
                                                                onChange={e => updateItemQuantity(item.productCode, e.target.value)}
                                                                className="w-10 h-full text-center bg-white text-sm font-semibold outline-none border-x border-gray-200"
                                                            />
                                                            <button 
                                                                onClick={() => updateItemQuantity(item.productCode, (parseFloat(item.quantity) || 0) + 1)}
                                                                className="w-8 h-full bg-gray-50 hover:bg-gray-100 text-gray-600 flex items-center justify-center font-bold transition-colors"
                                                            >+</button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center align-top">
                                                        <input 
                                                            type="number" 
                                                            value={item.price}
                                                            onChange={e => updateItemField(item.productCode, "price", e.target.value)}
                                                            placeholder="ไม่ระบุ"
                                                            className="w-full px-2 py-1 h-8 text-center border border-gray-200 rounded-lg outline-none text-sm focus:border-green-400"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-center align-top">
                                                        <button 
                                                            onClick={() => removeItem(item.productCode)}
                                                            className="text-red-400 hover:text-red-600 p-1"
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
                                    className="w-full py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <span>กำลังบันทึกและเพิ่มสต๊อก...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>📥 ยืนยันการรับสินค้าเข้าคลัง</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
