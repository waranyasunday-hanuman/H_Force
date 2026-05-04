import { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import Loading from "../components/Loading";

export default function ProductsMaster() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("ทั้งหมด");

    useEffect(() => {
        const fetchProducts = async () => {
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
        };
        fetchProducts();
    }, []);

    // Extract Unique Types dynamically
    const uniqueTypes = useMemo(() => {
        const typeMapping = {
            "1": "สินค้าสำเร็จรูป (FG)",
            "2": "สินค้ากึ่งสำเร็จรูป (WIP)",
            "3": "วัตถุดิบ (RM)",
            "4": "วัสดุประกอบ",
            "5": "สินค้าซื้อมาขายไป",
            "6": "บริการ",
            "7": "อื่นๆ"
        };
        const types = new Set(products.map(i => typeMapping[i.PROD_TYPE] || i.PROD_TYPE || "ทั่วไป"));
        return ["ทั้งหมด", ...Array.from(types)];
    }, [products]);

    const displayProducts = useMemo(() => {
        let current = products;
        
        const typeMapping = {
            "1": "สินค้าสำเร็จรูป (FG)",
            "2": "สินค้ากึ่งสำเร็จรูป (WIP)",
            "3": "วัตถุดิบ (RM)",
            "4": "วัสดุประกอบ",
            "5": "สินค้าซื้อมาขายไป",
            "6": "บริการ",
            "7": "อื่นๆ"
        };

        if (filterType !== "ทั้งหมด") {
            current = current.filter(p => {
                const mappedType = typeMapping[p.PROD_TYPE] || p.PROD_TYPE || "ทั่วไป";
                return mappedType === filterType;
            });
        }

        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            current = current.filter(p => 
                (p.PROD_CD || "").toLowerCase().includes(s) || 
                (p.PROD_DES || "").toLowerCase().includes(s) ||
                (p.BAR_CODE || "").toLowerCase().includes(s)
            );
        }

        return current;
    }, [products, searchTerm, filterType]);

    const formatNumber = (num) => {
        return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(num) || 0);
    };

    const getTypeColor = (typeCode) => {
        switch(String(typeCode)) {
            case "1": return "bg-green-100 text-green-700 border-green-200"; // FG
            case "3": return "bg-blue-100 text-blue-700 border-blue-200"; // RM
            case "6": return "bg-purple-100 text-purple-700 border-purple-200"; // Service
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    const getTypeName = (typeCode) => {
        const map = {
            "1": "สินค้าสำเร็จรูป (FG)",
            "2": "สินค้ากึ่งสำเร็จรูป (WIP)",
            "3": "วัตถุดิบ (RM)",
            "4": "วัสดุประกอบ",
            "5": "สินค้าซื้อมาขายไป",
            "6": "บริการ",
            "7": "อื่นๆ"
        };
        return map[typeCode] || typeCode || "ทั่วไป";
    };

    return (
        <Layout>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-gray-200">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">ทะเบียนสินค้า (Product Master) 📦</h1>
                    <p className="text-gray-500 font-medium">ดูรายละเอียดข้อมูลสินค้าและวัตถุดิบ ดึงตรงจาก Ecount ERP</p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center space-x-4">
                    <button 
                        onClick={() => window.location.reload()}
                        className="flex items-center space-x-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm"
                    >
                        <span>รีเฟรชข้อมูล</span>
                    </button>
                    <a 
                        href="/inventory"
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-md"
                    >
                        <span>ดูสต๊อกคงเหลือ</span>
                    </a>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                {/* TOOLBAR */}
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative w-full md:max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-400">🔍</span>
                        </div>
                        <input 
                            type="text" 
                            placeholder="ค้นหารหัสสินค้า, ชื่อสินค้า, หรือบาร์โค้ด..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm transition-all shadow-sm bg-white"
                        />
                    </div>
                    
                    <div className="flex items-center space-x-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
                        <span className="text-xs font-semibold text-gray-500">ประเภท:</span>
                        <select 
                            value={filterType} 
                            onChange={(e) => setFilterType(e.target.value)}
                            className="text-sm border-none bg-transparent font-medium text-gray-800 outline-none cursor-pointer"
                        >
                            {uniqueTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="min-h-[400px] flex items-center justify-center">
                        <Loading />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                                    <th className="p-4 font-bold text-gray-400 w-16">ลำดับ</th>
                                    <th className="p-4 font-bold">รหัสสินค้า / บาร์โค้ด</th>
                                    <th className="p-4 font-bold">ชื่อสินค้า / คำอธิบาย</th>
                                    <th className="p-4 font-bold">ประเภท / หน่วย</th>
                                    <th className="p-4 font-bold text-right">ราคาซื้อ (IN)</th>
                                    <th className="p-4 font-bold text-right">ราคาขาย (OUT)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayProducts.length > 0 ? (
                                    displayProducts.map((item, idx) => (
                                        <tr key={item.PROD_CD} className="hover:bg-blue-50/50 transition-colors group">
                                            <td className="p-4 text-sm text-gray-400 font-medium">{idx + 1}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-gray-900 tracking-wide">{item.PROD_CD}</div>
                                                {item.BAR_CODE && (
                                                    <div className="text-xs text-gray-500 mt-1 font-mono">
                                                        <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                                            🏷️ {item.BAR_CODE}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm font-semibold text-gray-800">
                                                {item.PROD_DES || "-"}
                                                {item.REMARKS && <div className="text-xs text-gray-500 font-normal mt-1">{item.REMARKS}</div>}
                                            </td>
                                            <td className="p-4 text-sm">
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border ${getTypeColor(item.PROD_TYPE)}`}>
                                                        {getTypeName(item.PROD_TYPE)}
                                                    </span>
                                                    {item.UNIT && <span className="text-gray-500 text-xs font-medium">หน่วย: {item.UNIT}</span>}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="font-semibold text-gray-600">
                                                    {parseFloat(item.IN_PRICE) > 0 ? `฿${formatNumber(item.IN_PRICE)}` : "-"}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="font-bold text-blue-700">
                                                    {parseFloat(item.OUT_PRICE) > 0 ? `฿${formatNumber(item.OUT_PRICE)}` : "-"}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="p-16 text-center text-gray-500">
                                            <div className="text-4xl mb-4">📭</div>
                                            <p className="font-medium text-lg text-gray-700 mb-1">ไม่พบข้อมูลสินค้า</p>
                                            <p className="text-sm">ไม่มีข้อมูลตรงกับเงื่อนไขการกรอง หรือคำค้นหาของคุณ</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {!loading && (
                    <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs text-center text-gray-500 flex justify-between items-center">
                        <div>
                            <span>แสดงผล </span>
                            <span className="font-semibold text-gray-700 mx-1">{displayProducts.length}</span>
                            <span> จากทั้งหมด </span>
                            <span className="font-semibold text-gray-700 mx-1">{products.length}</span>
                            <span> รายการ</span>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
