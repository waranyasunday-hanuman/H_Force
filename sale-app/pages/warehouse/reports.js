import { useState, useCallback, useEffect } from "react";
import Layout from "../../components/Layout";
import { useRouter } from "next/router";
import { WAREHOUSES } from "../../lib/locations";

export default function StockReportPage() {
    const router = useRouter();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Filters
    const [search, setSearch] = useState("");
    const [warehouse, setWarehouse] = useState("all");
    const [type, setType] = useState("all");
    const [showZero, setShowZero] = useState(false);
    
    // Unique categories for the dropdown
    const [availableTypes, setAvailableTypes] = useState([]);

    const fetchData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (warehouse !== "all") params.set("warehouse", warehouse);
            if (search) params.set("search", search);
            if (type !== "all") params.set("type", type);
            if (showZero) params.set("showZero", "true");
            params.set("t", Date.now());

            const res = await fetch(`/api/warehouse/stock-balance?${params}`);
            const json = await res.json();
            
            if (!res.ok) throw new Error(json.error || "ดึงข้อมูลไม่สำเร็จ");
            
            const fetchedData = json.data || [];
            setData(fetchedData);
            
            // Extract unique types if they haven't been set yet
            if (availableTypes.length === 0 && fetchedData.length > 0) {
                const types = Array.from(new Set(fetchedData.map(item => item.PROD_TYPE).filter(t => t && t !== "N/A"))).sort();
                setAvailableTypes(types);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [warehouse, search, type, showZero]);

    // Fetch on mount and when filters change (except search which requires Enter)
    useEffect(() => {
        fetchData(true);
    }, [warehouse, type, showZero]);

    return (
        <Layout>
            <div suppressHydrationWarning className="max-w-6xl mx-auto pb-24 animate-fade-up">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()}
                            className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all active:scale-95">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/></svg>
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 tracking-tight">รายงานสินค้าคงคลัง (Real-time)</h2>
                            <p className="text-xs font-bold text-slate-400">ดึงข้อมูลล่าสุดจาก Ecount ERP (ระบบเชื่อม Master & Balance อัตโนมัติ)</p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => fetchData()} 
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        รีเฟรชข้อมูล
                    </button>
                </div>

                {/* Main Container */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    
                    {/* Top Search Bar */}
                    <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="p-5 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative flex gap-3">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                    </svg>
                                </div>
                                <input 
                                    type="text" 
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="ค้นหารหัสสินค้า หรือ ชื่อสินค้า..." 
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-blue-600 text-white font-bold text-sm rounded-2xl shadow-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 whitespace-nowrap"
                            >
                                ค้นหา
                            </button>
                        </div>
                    </form>

                    {/* Filter Controls Row */}
                    <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-4 bg-white">
                        
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-400 uppercase">หมวดหมู่:</span>
                            <select 
                                value={type} 
                                onChange={e => setType(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-blue-600 font-black text-sm rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px] cursor-pointer"
                            >
                                <option value="all">📂 รวมทุกหมวดหมู่</option>
                                {availableTypes.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                                {/* Add common hardcoded options if availableTypes is empty on first load */}
                                {availableTypes.length === 0 && (
                                    <>
                                        <option value="Finish Goods (FG)">Finish Goods (FG)</option>
                                        <option value="Raw Material (RM)">Raw Material (RM)</option>
                                        <option value="Sub-material">Sub-material</option>
                                        <option value="Merchandise">Merchandise</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 border-l pl-4 border-slate-200">
                            <span className="text-xs font-black text-slate-400 uppercase">คลังสินค้า:</span>
                            <select 
                                value={warehouse} 
                                onChange={e => setWarehouse(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-slate-600 font-black text-sm rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px] cursor-pointer"
                            >
                                <option value="all">🌐 รวมทุกคลังสินค้า</option>
                                <optgroup label="คลังหลัก / โรงงาน">
                                    {WAREHOUSES.filter(w => w.type === "Main" || w.type === "Factory").map(w => (
                                        <option key={w.code} value={w.code}>
                                            📦 {w.code} - {w.name}
                                        </option>
                                    ))}
                                </optgroup>
                                <optgroup label="คลังรถเซลส์ (Van)">
                                    {WAREHOUSES.filter(w => w.type === "Van").map(w => (
                                        <option key={w.code} value={w.code}>
                                            🚚 {w.code} - {w.name}
                                        </option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 hover:bg-white transition-all select-none ml-auto">
                            <input 
                                type="checkbox" 
                                checked={showZero} 
                                onChange={e => setShowZero(e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-xs font-black text-slate-700 uppercase tracking-tight">แสดงรายการที่ยอดเป็น 0 ด้วย</span>
                        </label>
                    </div>

                    {/* Error State */}
                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 font-bold text-sm text-center border-b border-red-100 flex flex-col items-center gap-2">
                            <span>พบข้อผิดพลาด: {error}</span>
                            <button onClick={() => fetchData()} className="px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-xs transition-colors">
                                ลองใหม่อีกครั้ง
                            </button>
                        </div>
                    )}

                    {/* Table Area */}
                    <div className="w-full overflow-x-auto min-h-[500px] relative">
                        {loading && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
                                <div className="w-10 h-10 border-[3px] border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                <p className="mt-4 font-black text-blue-600 text-[10px] uppercase tracking-[0.2em] animate-pulse">กำลังซิงค์ Master & Balance จาก Ecount...</p>
                            </div>
                        )}

                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-black text-[10px] uppercase tracking-[0.15em]">
                                    <th className="px-6 py-5 w-16 text-center">#</th>
                                    <th className="px-6 py-5">รหัสสินค้า</th>
                                    <th className="px-6 py-5">ชื่อสินค้า</th>
                                    <th className="px-6 py-5">หมวดหมู่</th>
                                    <th className="px-6 py-5 text-right">ยอดคงเหลือ (QTY)</th>
                                </tr>
                            </thead>
                            
                            {!loading && data.length === 0 && !error ? (
                                <tbody>
                                    <tr>
                                        <td colSpan="5" className="py-32 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-4xl mb-6 border border-slate-100 grayscale opacity-50">
                                                    🔍
                                                </div>
                                                <p className="text-lg font-black text-slate-800 uppercase tracking-wide">ไม่พบข้อมูลสินค้า</p>
                                                <p className="text-sm font-bold text-slate-400 mt-2 max-w-[320px] leading-relaxed">
                                                    {search ? `ไม่พบรายการที่ตรงกับ "${search}"` : 'ยังไม่มีข้อมูลในเงื่อนไขที่เลือก'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            ) : (
                                <tbody className="divide-y divide-slate-100">
                                    {data.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50/30 transition-all">
                                            <td className="px-6 py-4 text-center text-[11px] font-black text-slate-300">{idx + 1}</td>
                                            <td className="px-6 py-4 text-sm font-black text-slate-900 tracking-tight">{item.PROD_CD}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-600">{item.PROD_DES}</td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-400">
                                                {item.PROD_TYPE && item.PROD_TYPE !== "N/A" ? (
                                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md whitespace-nowrap">{item.PROD_TYPE}</span>
                                                ) : "-"}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-base font-black tabular-nums ${
                                                        item.QTY <= 0 ? 'text-red-500' : 'text-slate-900'
                                                    }`}>
                                                        {item.QTY.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                    </span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">{item.UNIT_CD || 'หน่วย'}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            )}
                        </table>
                    </div>
                    
                    {/* Footer Stats Area */}
                    <div className="bg-slate-50/80 backdrop-blur-md px-8 py-6 border-t border-slate-200 flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">รายการทั้งหมด</span>
                            <span className="text-lg font-black text-slate-800">{data.length}</span>
                        </div>
                    </div>

                </div>
            </div>
        </Layout>
    );
}
