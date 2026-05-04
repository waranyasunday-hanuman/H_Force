import { useState, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import Loading from "../components/Loading";
import { WAREHOUSES } from "../lib/locations";

export default function Inventory() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);

    // New Filter States
    const [filterType, setFilterType] = useState("ทั้งหมด");
    const [hideZero, setHideZero] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState("ST002"); // Default to Main
    
    // Sort State
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const url = selectedWarehouse 
                ? `/api/inventory?warehouse=${selectedWarehouse}` 
                : `/api/inventory`;
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok) {
                setItems(data.inventory || []);
                setLastUpdated(new Date());
            } else {
                console.error("Failed to fetch inventory:", data.error);
            }
        } catch (error) {
            console.error("Network error fetching inventory:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchInventory();
    }, [selectedWarehouse]); // Re-fetch when warehouse changes

    // Helper: format numbers
    const formatNumber = (num) => {
        return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 2 }).format(parseFloat(num) || 0);
    };

    // Extract Unique Types dynamically
    const uniqueTypes = useMemo(() => {
        const types = new Set(items.map(i => i.PROD_TYPE || "ทั่วไป"));
        return ["ทั้งหมด", ...Array.from(types)];
    }, [items]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            key = null; // Unsort if cliked again
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    // Derived State: filtered and sorted items
    const displayItems = useMemo(() => {
        // 1. Filter
        let filtered = items.filter(item => {
            // Check Hide Zero
            if (hideZero && parseFloat(item.QTY) === 0) return false;

            // Check Type filter
            const type = item.PROD_TYPE || "ทั่วไป";
            if (filterType !== "ทั้งหมด" && type !== filterType) return false;

            // Check Search
            if (searchTerm) {
                const s = searchTerm.toLowerCase();
                const code = (item.PROD_CD || "").toLowerCase();
                const name = (item.PROD_DES || "").toLowerCase();
                if (!code.includes(s) && !name.includes(s)) return false;
            }

            return true;
        });

        // 2. Sort
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (sortConfig.key === "QTY") {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                } else {
                    aVal = String(aVal || "").toLowerCase();
                    bVal = String(bVal || "").toLowerCase();
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [items, searchTerm, filterType, hideZero, sortConfig]);

    // Sorting Icon helper
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <span className="text-gray-300 ml-1">↕</span>;
        return sortConfig.direction === 'asc' 
            ? <span className="text-blue-500 ml-1 font-bold">↑</span> 
            : <span className="text-blue-500 ml-1 font-bold">↓</span>;
    };

    return (
        <Layout>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-gray-200">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">สินค้าคงคลัง 📦</h1>
                    <p className="text-gray-500 font-medium">ดูยอดคงเหลือของสต็อกสินค้าดึงตรงจาก Ecount ERP แบบเรียลไทม์</p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center space-x-4">
                    {lastUpdated && (
                        <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                            อัปเดตล่าสุด: {lastUpdated.toLocaleTimeString('th-TH')}
                        </span>
                    )}
                    <button 
                        onClick={fetchInventory}
                        disabled={loading}
                        className="flex items-center space-x-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
                    >
                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="whitespace-nowrap">รีเฟรชข้อมูล</span>
                    </button>
                    <div className="flex flex-wrap items-center gap-2">
                        <button 
                            onClick={() => window.location.href = '/transfer'}
                            className="flex items-center space-x-2 bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
                        >
                            <span>🚚 โอนย้าย</span>
                        </button>
                        <button 
                            onClick={() => window.location.href = '/goods-receipt'}
                            className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-teal-600 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                        >
                            <span>📥 รับเข้า</span>
                        </button>
                        <button 
                            onClick={() => window.location.href = '/goods-issue'}
                            className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-orange-600 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                        >
                            <span>📤 จ่ายออก</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* TOOLBAR */}
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    {/* Search Input */}
                    <div className="relative w-full xl:max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-400">🔍</span>
                        </div>
                        <input 
                            type="text" 
                            placeholder="ค้นหารหัสสินค้า หรือ ชื่อสินค้า..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm transition-all shadow-sm"
                        />
                    </div>
                    
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center space-x-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
                            <span className="text-xs font-semibold text-gray-500">คลัง:</span>
                            <select 
                                value={selectedWarehouse} 
                                onChange={(e) => setSelectedWarehouse(e.target.value)}
                                className="text-sm border-none bg-transparent font-bold text-blue-700 outline-none cursor-pointer max-w-[150px] truncate"
                            >
                                <option value="">รวมทุกคลัง (ทั้งหมด)</option>
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
                        <div className="flex items-center space-x-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm hidden md:flex">
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
                        
                        <label className="flex items-center space-x-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
                            <input 
                                type="checkbox" 
                                checked={hideZero}
                                onChange={(e) => setHideZero(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-sm font-semibold text-gray-700 select-none">เฉพาะสินค้าที่มียอดอยู่ (&gt; 0)</span>
                        </label>
                    </div>
                </div>

                {/* DATA TABLE */}
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
                                    <th 
                                        className="p-4 font-bold cursor-pointer hover:bg-gray-50 select-none transition-colors"
                                        onClick={() => requestSort("PROD_CD")}
                                    >
                                        รหัสสินค้า {getSortIcon("PROD_CD")}
                                    </th>
                                    <th 
                                        className="p-4 font-bold cursor-pointer hover:bg-gray-50 select-none transition-colors"
                                        onClick={() => requestSort("PROD_DES")}
                                    >
                                        ชื่อสินค้า {getSortIcon("PROD_DES")}
                                    </th>
                                    <th 
                                        className="p-4 font-bold cursor-pointer hover:bg-gray-50 select-none transition-colors"
                                        onClick={() => requestSort("PROD_TYPE")}
                                    >
                                        ประเภท {getSortIcon("PROD_TYPE")}
                                    </th>
                                    <th 
                                        className="p-4 font-bold text-right cursor-pointer hover:bg-gray-50 select-none transition-colors"
                                        onClick={() => requestSort("QTY")}
                                    >
                                        ยอดคงเหลือ (QTY) {getSortIcon("QTY")}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {displayItems.length > 0 ? (
                                    displayItems.map((item, idx) => (
                                        <tr key={`${item.PROD_CD}-${idx}`} className="hover:bg-blue-50/50 transition-colors group">
                                            <td className="p-4 text-sm text-gray-400 font-medium">{idx + 1}</td>
                                            <td className="p-4 text-sm font-semibold text-gray-800 tracking-wide">
                                                {item.PROD_CD}
                                            </td>
                                            <td className="p-4 text-sm text-gray-600">
                                                {item.PROD_DES || "-"}
                                            </td>
                                            <td className="p-4 text-sm text-gray-500">
                                                <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap">
                                                    {item.PROD_TYPE || "ทั่วไป"}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold shadow-sm ${
                                                    parseFloat(item.QTY) > 0 
                                                    ? "bg-green-100 text-green-700 border border-green-200" 
                                                    : parseFloat(item.QTY) < 0 
                                                        ? "bg-red-100 text-red-700 border border-red-200" 
                                                        : "bg-gray-100 text-gray-500 border border-gray-200"
                                                }`}>
                                                    {formatNumber(item.QTY)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="p-16 text-center text-gray-500">
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
                            <span className="font-semibold text-gray-700 mx-1">{displayItems.length}</span>
                            <span> จากทั้งหมด </span>
                            <span className="font-semibold text-gray-700 mx-1">{items.length}</span>
                            <span> รายการ</span>
                        </div>
                        {hideZero && <span className="text-blue-600 font-semibold">*ซ่อนรายการที่เป็น 0</span>}
                    </div>
                )}
            </div>
        </Layout>
    );
}
