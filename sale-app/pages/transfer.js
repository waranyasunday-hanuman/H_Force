import { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import Loading from "../components/Loading";
import { useRouter } from "next/router";
import { WAREHOUSES } from "../lib/locations";

export default function TransferStock() {
    const router = useRouter();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
    const [warehouseCode, setWarehouseCode] = useState("ST002"); // คลังต้นทาง
    const [inWarehouseCode, setInWarehouseCode] = useState("VS001"); // คลังรถตู้
    const [remarks, setRemarks] = useState("โอนย้ายขึ้นรถเซลส์");
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
        if (!searchTerm) return products.slice(0, 50);
        const s = searchTerm.toLowerCase();
        return products.filter(p => 
            (p.PROD_CD || "").toLowerCase().includes(s) || 
            (p.PROD_DES || "").toLowerCase().includes(s)
        ).slice(0, 50);
    }, [products, searchTerm]);

    const addItem = (prod) => {
        const existing = selectedItems.find(i => i.productCode === prod.PROD_CD);
        if (existing) {
            updateItemQuantity(prod.PROD_CD, (parseFloat(existing.quantity) || 0) + 1);
        } else {
            setSelectedItems([...selectedItems, {
                productCode: prod.PROD_CD,
                productName: prod.PROD_DES,
                quantity: 1,
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

    const removeItem = (code) => {
        setSelectedItems(selectedItems.filter(i => i.productCode !== code));
    };

    const handleSubmit = async () => {
        if (selectedItems.length === 0) {
            alert("กรุณาเลือกสินค้าอย่างน้อย 1 รายการ");
            return;
        }
        
        if (!inWarehouseCode) {
            alert("กรุณาระบุคลังปลายทาง (คลังรถเซลส์)");
            return;
        }

        if (!confirm(`ยืนยันการโอนย้ายสินค้าจาก ${warehouseCode} ไปยัง ${inWarehouseCode} ใช่หรือไม่?`)) return;

        setSubmitting(true);
        try {
            const formattedDate = transferDate.replace(/-/g, "");
            
            const payload = {
                date: formattedDate,
                warehouseCode,
                inWarehouseCode,
                remarks,
                items: selectedItems
            };

            const res = await fetch("/api/goods-issue", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("✅ ทำรายการโอนย้ายสำเร็จ สต๊อกอัปเดตแล้ว");
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
                    <h1 className="text-2xl font-extrabold text-blue-900 mb-1">🚚 โอนย้ายสต๊อก (Location Transfer)</h1>
                    <p className="text-sm text-gray-500">โอนสินค้าจากคลังหลัก ขึ้นรถตู้เซลส์ (Van Sales)</p>
                </div>
            </div>

            {loading ? (
                <div className="min-h-[400px] flex items-center justify-center">
                    <Loading />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-blue-50/50 rounded-2xl p-5 shadow-sm border border-blue-100">
                            <h2 className="text-lg font-bold text-blue-800 mb-4 border-b border-blue-200 pb-2">เส้นทางการโอนย้าย</h2>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">วันที่โอน</label>
                                    <input 
                                        type="date" 
                                        value={transferDate}
                                        onChange={e => setTransferDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                    />
                                </div>
                                
                                <div className="p-3 bg-white border border-gray-200 rounded-xl">
                                    <div className="mb-3">
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">จากคลัง (Out Location)</label>
                                        <select 
                                            value={warehouseCode}
                                            onChange={e => setWarehouseCode(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm font-bold text-gray-800 focus:border-blue-500 bg-gray-50"
                                        >
                                            <optgroup label="คลังหลัก">
                                                {WAREHOUSES.filter(w => w.type === 'Main').map(w => (
                                                    <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </div>
                                    <div className="flex justify-center my-1 text-blue-400">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                        </svg>
                                    </div>
                                    <div className="mt-2">
                                        <label className="block text-xs font-bold text-blue-500 mb-1 uppercase tracking-wider">เข้าคลัง (In Location)</label>
                                        <select 
                                            value={inWarehouseCode}
                                            onChange={e => setInWarehouseCode(e.target.value)}
                                            className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg outline-none text-sm font-bold text-blue-900 focus:border-blue-500 bg-white"
                                        >
                                            <option value="">-- ระบุคลังรถเซลส์ --</option>
                                            <optgroup label="คลังรถเซลส์ (Van)">
                                                {WAREHOUSES.filter(w => w.type === 'Van').map(w => (
                                                    <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">หมายเหตุ</label>
                                    <textarea 
                                        value={remarks}
                                        onChange={e => setRemarks(e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
                            <div className="p-5 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <h2 className="text-lg font-bold text-gray-800">เลือกสินค้าขึ้นรถ</h2>
                                
                                <div className="relative flex-1 max-w-sm">
                                    <input 
                                        type="text"
                                        placeholder="🔍 ค้นหารหัส หรือชื่อสินค้า..."
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
                                            <th className="px-4 py-3 font-semibold">รายการสินค้า</th>
                                            <th className="px-4 py-3 font-semibold text-center w-32">จำนวนโอน</th>
                                            <th className="px-4 py-3 font-semibold text-center w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {selectedItems.length > 0 ? (
                                            selectedItems.map(item => (
                                                <tr key={item.productCode} className="hover:bg-gray-50/50">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-gray-700 text-sm">{item.productCode}</div>
                                                        <div className="text-xs text-gray-500 truncate mb-1">{item.productName}</div>
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
                                                <td colSpan="3" className="px-4 py-16 text-center text-gray-400">
                                                    <div className="text-3xl mb-2">📦</div>
                                                    ยังไม่มีสินค้า ค้นหาและเลือกสินค้าเพื่อโอนขึ้นรถ
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
                                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <span>กำลังประมวลผล...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>🚚 ยืนยันการโอนย้ายสต๊อก</span>
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
