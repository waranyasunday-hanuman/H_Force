import { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import Layout from "../components/Layout";
import Loading from "../components/Loading";
import { useRouter } from "next/router";
import { WAREHOUSES } from "../lib/locations";

export default function GoodsReceipt() {
    const router = useRouter();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("FG"); // "FG" or "RM"
    
    const hasTabParam = !!router.query.tab;
    useEffect(() => {
        if (router.query.tab === "RM") setActiveTab("RM");
        else if (router.query.tab === "FG") setActiveTab("FG");
    }, [router.query.tab]);
    
    const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0]);
    const [documentNo, setDocumentNo] = useState("");
    const [custCode, setCustCode] = useState("");
    const [empCode, setEmpCode] = useState("");
    const [pjtCode, setPjtCode] = useState("");
    const [remarks, setRemarks] = useState("");
    const [selectedItems, setSelectedItems] = useState([]);
    const [docStatus, setDocStatus] = useState("EDITING"); // "EDITING", "DRAFT", "APPROVED", "CANCELLED"
    const [requestId, setRequestId] = useState(null);

    // Load existing request
    useEffect(() => {
        if (router.query.id) {
            setRequestId(router.query.id);
            // Fetch request details... (Implementation could be added here later)
            // For now, it will at least pass the ID to updates
        }
    }, [router.query.id]);
    
    
    // Fetch Sequential Document No
    useEffect(() => {
        async function fetchNextNo() {
            try {
                const res = await fetch(`/api/warehouse/receipt/next-no?date=${receiptDate}`);
                const data = await res.json();
                if (data && data.documentNo) {
                    setDocumentNo(data.documentNo);
                }
            } catch (err) {
                console.error("Failed to fetch next document number:", err);
            }
        }

        if (docStatus === "EDITING") {
            fetchNextNo();
        }
    }, [receiptDate, docStatus]);
    
    // For product search
    const [searchTerm, setSearchTerm] = useState("");
    const [showProductList, setShowProductList] = useState(false);
    const [productLoadError, setProductLoadError] = useState(false);
    
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        async function fetchProducts() {
            try {
                const res = await fetch("/api/products");
                const data = await res.json();
                if (res.ok && data.products) {
                    setProducts(data.products);
                    setProductLoadError(false);
                } else {
                    setProductLoadError(true);
                }
            } catch (err) {
                console.error("Failed to load products", err);
                setProductLoadError(true);
            }
            setLoading(false);
        }
        fetchProducts();
    }, []);

    const filteredProducts = useMemo(() => {
        let currentProducts = products;
        
        // Filter by Tab (Ecount Type: 1 = FG, 3 = RM)
        // เพิ่ม fallback เป็น string หรือ number
        if (activeTab === "FG") {
            currentProducts = currentProducts.filter(p => String(p.PROD_TYPE) === "1");
        } else if (activeTab === "RM") {
            currentProducts = currentProducts.filter(p => String(p.PROD_TYPE) === "3");
        }

        // ถ้าไม่มีสินค้าใน Type นั้นเลย ให้แสดงทั้งหมดแทนชั่วคราว (กันปัญหาหาไม่เจอ)
        if (currentProducts.length === 0 && products.length > 0) {
            currentProducts = products;
        }

        if (!searchTerm) return currentProducts.slice(0, 50);
        const s = searchTerm.toLowerCase();
        return currentProducts.filter(p => 
            (p.PROD_CD || "").toLowerCase().includes(s) || 
            (p.PROD_DES || "").toLowerCase().includes(s)
        ).slice(0, 50);
    }, [products, searchTerm, activeTab]);

    const addItem = (prod) => {
        // Allow adding the same product multiple times for different Lots
        const exp = new Date(receiptDate);
        exp.setFullYear(exp.getFullYear() + 2);
        
        setSelectedItems([...selectedItems, {
            id: Date.now() + Math.random(),
            productCode: prod.PROD_CD,
            productName: prod.PROD_DES,
            quantity: 1,
            price: "",
            remarks: "",
            lotNo: "",
            expireDate: exp.toISOString().split('T')[0],
            inWarehouseCode: "ST002",
            receiptType: "รับเข้าสินค้า"
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
            Swal.fire({ icon: 'warning', title: 'กรุณาเลือกสินค้า', text: 'ต้องมีสินค้าอย่างน้อย 1 รายการ' });
            return;
        }

        const confirmRes = await Swal.fire({
            title: 'ยืนยันการรับเข้าคลัง?',
            text: "สต๊อกจะถูกเพิ่มเข้าไปในระบบ Ecount ทันที ไม่สามารถแก้ไขได้หลังจากนี้",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#d33',
            confirmButtonText: 'ยืนยัน',
            cancelButtonText: 'ยกเลิก'
        });
        
        if (!confirmRes.isConfirmed) return;

        // Validation
        const invalidItem = selectedItems.find(item => !item.inWarehouseCode || !item.receiptType || !item.lotNo || !item.expireDate || !item.quantity);
        if (invalidItem) {
            Swal.fire({ icon: 'error', title: 'ข้อมูลไม่ครบถ้วน', text: `กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบสำหรับสินค้า: ${invalidItem.productCode}` });
            return;
        }

        setSubmitting(true);
        
        try {
            const res = await fetch("/api/warehouse/receipt/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: requestId,
                    documentNo,
                    status: 'approved',
                    type: activeTab,
                    receiptDate,
                    custCode,
                    empCode,
                    pjtCode,
                    remarks,
                    items: selectedItems
                })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                if (data.requestId) setRequestId(data.requestId);
                Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', text: 'เพิ่มสต๊อกเข้าสู่ระบบ Ecount และบันทึกประวัติแล้ว' });
                setDocStatus("APPROVED"); // เปลี่ยนสถานะเป็น อนุมัติแล้ว
            } else {
                throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึก");
            }
        } catch (error) {
            console.error("Submit Error:", error);
            Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: `ไม่สามารถบันทึกรับเข้าได้: ${error.message}` });
        }
        setSubmitting(false);
    };

    const handleSaveDraft = async () => {
        if (selectedItems.length === 0) {
            Swal.fire({ icon: 'warning', title: 'กรุณาเลือกสินค้า', text: 'ต้องมีสินค้าอย่างน้อย 1 รายการก่อนบันทึก' });
            return;
        }

        const invalidItem = selectedItems.find(item => !item.inWarehouseCode || !item.receiptType || !item.lotNo || !item.expireDate || !item.quantity);
        if (invalidItem) {
            Swal.fire({ icon: 'error', title: 'ข้อมูลไม่ครบถ้วน', text: `กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบสำหรับสินค้า: ${invalidItem.productCode}` });
            return;
        }
        
        setSubmitting(true);
        try {
            const res = await fetch("/api/warehouse/receipt/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: requestId,
                    documentNo,
                    status: 'draft',
                    type: activeTab,
                    receiptDate,
                    custCode,
                    empCode,
                    pjtCode,
                    remarks,
                    items: selectedItems
                })
            });
            
            const data = await res.json();
            if (res.ok) {
                if (data.requestId) setRequestId(data.requestId);
                setDocStatus("DRAFT");
                Swal.fire({
                    icon: 'success',
                    title: 'บันทึกฉบับร่างแล้ว',
                    text: 'สามารถแก้ไขหรือกดยืนยันรับเข้าได้ในภายหลัง',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                throw new Error(data.error || "บันทึกร่างไม่สำเร็จ");
            }
        } catch (error) {
            console.error("Draft Error:", error);
            Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: error.message });
        }
        setSubmitting(false);
    };

    const handleEdit = () => {
        setDocStatus("EDITING");
    };

    const handleCancel = async () => {
        const confirmCancel = await Swal.fire({
            title: 'ยืนยันการยกเลิก?',
            text: "ระบบจะทำการตรวจสอบว่าสินค้า Lot นี้มีการเคลื่อนไหว (Transaction) อื่นๆ หรือไม่",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'ยืนยันยกเลิก',
            cancelButtonText: 'ปิด'
        });

        if (confirmCancel.isConfirmed) {
            Swal.fire({
                title: 'กำลังตรวจสอบ...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // จำลองการเช็ค Transaction ของ Lot
            setTimeout(async () => {
                const hasTransaction = false; // สมมติว่ายังไม่มี transaction (ถ้ามีเปลี่ยนเป็น true)
                
                if (hasTransaction) {
                    Swal.fire({
                        icon: 'error',
                        title: 'ยกเลิกไม่ได้!',
                        text: 'สินค้า Lot นี้ถูกนำไปเบิก-จ่ายหรือมี Transaction อื่นในระบบแล้ว ไม่สามารถยกเลิกการรับเข้าได้'
                    });
                } else {
                    try {
                        const res = await fetch("/api/warehouse/receipt/save", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                id: requestId,
                                documentNo,
                                status: 'cancelled',
                                type: activeTab,
                                receiptDate,
                                custCode,
                                empCode,
                                pjtCode,
                                remarks,
                                items: selectedItems
                            })
                        });
                        if (!res.ok) throw new Error("ไม่สามารถอัปเดตสถานะในระบบได้");
                        
                        Swal.fire({
                            icon: 'success',
                            title: 'ยกเลิกสำเร็จ',
                            text: 'ยกเลิกเอกสารรับเข้าเรียบร้อยแล้ว'
                        });
                        setDocStatus("CANCELLED");
                    } catch (err) {
                        Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: err.message });
                    }
                }
            }, 1000);
        }
    };

    const handleNew = () => {
        setDocStatus("EDITING");
        setSelectedItems([]);
        setRemarks("");
        setRequestId(null);
        // เลขที่จะถูกดึงใหม่โดยอัตโนมัติจาก useEffect
    };

    const isReadOnly = docStatus !== "EDITING";

    return (
        <Layout>
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; background: white !important; }
                    @page { size: A4; margin: 15mm; }
                }
                .print-doc { font-family: 'Sarabun', 'TH Sarabun', sans-serif; }
            `}</style>

            <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-extrabold text-green-700 mb-1">📥 รับสินค้าเข้าคลัง (Goods Receipt)</h1>
                    <p className="text-sm text-gray-500">บันทึกการรับสินค้าจากซัพพลายเออร์ หรือรับสินค้าเข้าคลัง</p>
                </div>
            </div>

            {/* TABS (FG vs Raw Mat) */}
            {!hasTabParam && (
                <div className="flex mb-6 space-x-2 bg-gray-100 p-1.5 rounded-xl w-full max-w-md print:hidden">
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
            )}

            {loading ? (
                <div className="min-h-[400px] flex items-center justify-center print:hidden">
                    <Loading />
                </div>
            ) : (
                <div className="flex flex-col gap-6 print:hidden">
                    {/* ฟอร์มข้อมูลหลัก (Top Panel) */}
                    <div className="w-full">
                        <div className="bg-green-50/30 rounded-2xl p-4 shadow-sm border border-green-100 relative">
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                                {docStatus === "EDITING" && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold">สร้างใหม่</span>}
                                {docStatus === "DRAFT" && <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-[10px] font-bold">รออนุมัติ (ฉบับร่าง)</span>}
                                {docStatus === "APPROVED" && <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold">✅ อนุมัติแล้ว</span>}
                                {docStatus === "CANCELLED" && <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold">❌ ยกเลิกแล้ว</span>}
                                <div className="bg-white border border-green-200 px-2 py-1 rounded-lg text-xs font-black text-green-700 shadow-sm">
                                    เลขที่: {documentNo}
                                </div>
                            </div>
                            <h2 className="text-base font-bold text-green-800 mb-3 border-b border-green-200 pb-1.5">รายละเอียดใบรับสินค้า</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">วันที่รับเข้า</label>
                                    <input 
                                        type="date" 
                                        value={receiptDate}
                                        onChange={e => setReceiptDate(e.target.value)}
                                        disabled={isReadOnly}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded-xl focus:ring-1 focus:ring-green-500 outline-none text-xs bg-white disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>
                                
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">รหัสผู้จำหน่าย/ลูกค้า</label>
                                    <input 
                                        type="text" 
                                        value={custCode}
                                        onChange={e => setCustCode(e.target.value)}
                                        placeholder="ไม่บังคับ"
                                        disabled={isReadOnly}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded-xl focus:ring-1 focus:ring-green-500 outline-none text-xs disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">พนักงาน (EMP_CD)</label>
                                    <input 
                                        type="text" 
                                        value={empCode}
                                        onChange={e => setEmpCode(e.target.value)}
                                        placeholder="ไม่บังคับ"
                                        disabled={isReadOnly}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded-xl focus:ring-1 focus:ring-green-500 outline-none text-xs disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">โปรเจกต์ (PJT_CD)</label>
                                    <input 
                                        type="text" 
                                        value={pjtCode}
                                        onChange={e => setPjtCode(e.target.value)}
                                        placeholder="ไม่บังคับ"
                                        disabled={isReadOnly}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded-xl focus:ring-1 focus:ring-green-500 outline-none text-xs disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>

                                <div className="md:col-span-4">
                                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">หมายเหตุเอกสาร</label>
                                    <textarea 
                                        value={remarks}
                                        onChange={e => setRemarks(e.target.value)}
                                        placeholder="เช่น รับของจากโรงงานผลิต, รับคืนสินค้า"
                                        rows={1}
                                        disabled={isReadOnly}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded-xl focus:ring-1 focus:ring-green-500 outline-none text-xs resize-none disabled:bg-gray-100 disabled:text-gray-500"
                                    ></textarea>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* รายการสินค้า (Bottom Panel) */}
                    <div className="w-full space-y-6">
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
                                        disabled={isReadOnly}
                                        className="w-full pl-9 pr-3 py-2 border border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm disabled:bg-gray-100 disabled:border-gray-200 disabled:text-gray-500"
                                    />
                                    
                                    {showProductList && !isReadOnly && (
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
                                                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                        {productLoadError ? (
                                                            <span className="text-red-500 font-bold">⚠️ โหลดข้อมูลสินค้าล้มเหลว (Session Ecount อาจจะหมดอายุ ลองกด F5 หรือ Login ใหม่)</span>
                                                        ) : products.length === 0 ? (
                                                            <span className="text-amber-500">⏳ กำลังโหลด หรือ ไม่มีข้อมูลสินค้าในระบบ</span>
                                                        ) : (
                                                            "ไม่พบสินค้า"
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="p-0 overflow-x-auto flex-1">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white border-b border-gray-100 text-xs text-gray-500 uppercase whitespace-nowrap">
                                            <th className="px-4 py-4 font-bold min-w-[220px]">สินค้า</th>
                                            <th className="px-3 py-4 font-bold min-w-[150px]">คลังเข้า <span className="text-red-500">*</span></th>
                                            <th className="px-3 py-4 font-bold min-w-[140px]">ประเภทรับเข้า <span className="text-red-500">*</span></th>
                                            <th className="px-3 py-4 font-bold min-w-[120px]">Lot No. <span className="text-red-500">*</span></th>
                                            <th className="px-3 py-4 font-bold min-w-[130px]">วันหมดอายุ <span className="text-red-500">*</span></th>
                                            <th className="px-3 py-4 font-bold text-center w-28">จำนวน <span className="text-red-500">*</span></th>
                                            <th className="px-3 py-4 font-bold min-w-[160px]">หมายเหตุ</th>
                                            <th className="px-3 py-4 font-bold text-center w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {selectedItems.length > 0 ? (
                                            selectedItems.map(item => (
                                                <tr key={item.id} className={`transition-colors group ${isReadOnly ? 'bg-gray-50' : 'hover:bg-green-50/50'}`}>
                                                    <td className="px-4 py-3 align-middle">
                                                        <div className="font-bold text-gray-900 text-sm">{item.productCode}</div>
                                                        <div className="text-xs text-gray-500 truncate max-w-[220px]" title={item.productName}>{item.productName}</div>
                                                    </td>
                                                    <td className="px-2 py-3 align-middle">
                                                        <select 
                                                            value={item.inWarehouseCode || "ST002"}
                                                            onChange={e => updateItemField(item.id, "inWarehouseCode", e.target.value)}
                                                            disabled={isReadOnly}
                                                            className={`w-full px-3 py-2 text-sm border border-transparent rounded-lg outline-none transition-all ${!item.inWarehouseCode ? 'border-red-300 bg-red-50' : ''} ${isReadOnly ? 'bg-transparent text-gray-600 appearance-none' : 'group-hover:border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-400 bg-transparent hover:bg-white'}`}
                                                        >
                                                            {WAREHOUSES.map(w => (
                                                                <option key={w.code} value={w.code}>{w.code} - {w.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-3 align-middle">
                                                        <select 
                                                            value={item.receiptType || "รับเข้าสินค้า"}
                                                            onChange={e => updateItemField(item.id, "receiptType", e.target.value)}
                                                            disabled={isReadOnly}
                                                            className={`w-full px-3 py-2 text-sm border border-transparent rounded-lg outline-none transition-all ${!item.receiptType ? 'border-red-300 bg-red-50' : ''} ${isReadOnly ? 'bg-transparent text-gray-600 appearance-none' : 'group-hover:border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-400 bg-transparent hover:bg-white'}`}
                                                        >
                                                            <option value="รับเข้าสินค้า">รับเข้าสินค้า</option>
                                                            <option value="คืนขายช้า">คืนขายช้า</option>
                                                            <option value="คืนสินค้าหมดอายุ">คืนสินค้าหมดอายุ</option>
                                                            <option value="สินค้า NG">สินค้า NG</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-3 align-middle">
                                                        <input 
                                                            type="text" 
                                                            value={item.lotNo}
                                                            onChange={e => updateItemField(item.id, "lotNo", e.target.value)}
                                                            placeholder="ระบุ Lot No."
                                                            disabled={isReadOnly}
                                                            className={`w-full px-3 py-2 text-sm border border-transparent rounded-lg outline-none transition-all ${!item.lotNo ? 'border-red-300 bg-red-50' : ''} ${isReadOnly ? 'bg-transparent text-gray-600' : 'group-hover:border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-400 bg-transparent hover:bg-white'}`}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3 align-middle">
                                                        <input 
                                                            type="date" 
                                                            value={item.expireDate}
                                                            onChange={e => updateItemField(item.id, "expireDate", e.target.value)}
                                                            disabled={isReadOnly}
                                                            className={`w-full px-3 py-2 text-sm border border-transparent rounded-lg outline-none transition-all ${!item.expireDate ? 'border-red-300 bg-red-50' : ''} ${isReadOnly ? 'bg-transparent text-gray-600' : 'group-hover:border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-400 bg-transparent hover:bg-white'}`}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3 align-middle text-center">
                                                        <input 
                                                            type="number" 
                                                            value={item.quantity}
                                                            onChange={e => updateItemQuantity(item.id, e.target.value)}
                                                            disabled={isReadOnly}
                                                            className={`w-20 mx-auto px-2 py-2 text-center text-sm font-bold text-green-700 border border-gray-200 rounded-lg outline-none ${!item.quantity ? 'border-red-400 bg-red-50' : ''} ${isReadOnly ? 'bg-transparent border-transparent' : 'focus:border-green-400 focus:ring-2 focus:ring-green-400 bg-white'}`}
                                                        />
                                                    </td>
                                                    <td className="px-2 py-3 align-middle">
                                                        <input 
                                                            type="text" 
                                                            value={item.remarks}
                                                            onChange={e => updateItemField(item.id, "remarks", e.target.value)}
                                                            placeholder="หมายเหตุเพิ่มเติม"
                                                            disabled={isReadOnly}
                                                            className={`w-full px-3 py-2 text-sm border border-transparent rounded-lg outline-none transition-all ${isReadOnly ? 'bg-transparent text-gray-600' : 'group-hover:border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-400 bg-transparent hover:bg-white'}`}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-3 align-middle text-center">
                                                        {!isReadOnly && (
                                                            <button 
                                                                onClick={() => removeItem(item.id)}
                                                                className="text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full w-8 h-8 flex items-center justify-center transition-all"
                                                                title="ลบรายการ"
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="px-4 py-16 text-center text-gray-400 bg-gray-50/50">
                                                    ยังไม่มีสินค้า ค้นหาและเลือกสินค้าจากช่องด้านบน
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="p-4 border-t border-gray-100 bg-white flex flex-wrap gap-4">
                                {docStatus === "EDITING" && (
                                    <>
                                        <button
                                            onClick={handleSaveDraft}
                                            disabled={submitting}
                                            className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2 min-w-[200px]"
                                        >
                                            💾 บันทึกฉบับร่าง
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={selectedItems.length === 0 || submitting}
                                            className="flex-1 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[200px]"
                                        >
                                            {submitting ? (
                                                <>
                                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                    <span>กำลังยืนยัน...</span>
                                                </>
                                            ) : (
                                                <span>📥 ยืนยันรับเข้าสต๊อก Ecount</span>
                                            )}
                                        </button>
                                    </>
                                )}

                                {docStatus === "DRAFT" && (
                                    <>
                                        <button
                                            onClick={handleEdit}
                                            className="flex-1 py-3 bg-white border border-blue-300 text-blue-700 font-bold rounded-xl shadow-sm hover:bg-blue-50 transition-all flex items-center justify-center gap-2 min-w-[120px]"
                                        >
                                            ✏️ แก้ไขข้อมูล
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            className="flex-1 py-3 bg-white border border-red-300 text-red-600 font-bold rounded-xl shadow-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2 min-w-[120px]"
                                        >
                                            ❌ ขอยกเลิก
                                        </button>
                                        <button
                                            onClick={() => window.print()}
                                            className="flex-1 py-3 bg-gray-800 text-white font-bold rounded-xl shadow-sm hover:bg-gray-900 transition-all flex items-center justify-center gap-2 min-w-[150px]"
                                        >
                                            🖨️ พิมพ์เอกสาร
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            className="flex-1 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 min-w-[180px]"
                                        >
                                            {submitting ? 'กำลังยืนยัน...' : '📥 ยืนยันรับเข้า Ecount'}
                                        </button>
                                    </>
                                )}

                                {docStatus === "APPROVED" && (
                                    <>
                                        <button
                                            onClick={handleNew}
                                            className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2 min-w-[150px]"
                                        >
                                            📝 สร้างรายการใหม่
                                        </button>
                                        <button
                                            onClick={() => window.print()}
                                            className="flex-1 py-3 bg-gray-800 text-white font-bold rounded-xl shadow-sm hover:bg-gray-900 transition-all flex items-center justify-center gap-2 min-w-[150px]"
                                        >
                                            🖨️ พิมพ์เอกสาร
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            className="flex-1 py-3 bg-white border border-red-300 text-red-600 font-bold rounded-xl shadow-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2 min-w-[150px]"
                                        >
                                            ❌ ขอยกเลิกรายการ
                                        </button>
                                    </>
                                )}

                                {docStatus === "CANCELLED" && (
                                    <button
                                        onClick={handleNew}
                                        className="w-full py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        📝 สร้างรายการใหม่
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PRINT VIEW (ISO DOCUMENT) */}
            {isReadOnly && (
                <div id="print-area" className="hidden print:block print-doc bg-white text-black p-4">
                    {/* ═══ ISO DOCUMENT HEADER ═══ */}
                    <table className="w-full border-collapse border border-black text-sm mb-4">
                        <tbody>
                            <tr>
                                {/* Logo / Company */}
                                <td className="border border-black p-3 w-1/3 align-middle text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center text-white text-3xl">🌿</div>
                                        <p className="font-bold text-black text-sm leading-tight mt-2">บริษัท สมุนไพร หนุมาน จำกัด</p>
                                        <p className="text-gray-600 text-[10px]">Hanuman Herb Co., Ltd.</p>
                                    </div>
                                </td>
                                {/* Title */}
                                <td className="border border-black p-3 text-center w-1/3 align-middle">
                                    <p className="font-bold text-black text-xl leading-tight">ใบรับสินค้าเข้าคลัง</p>
                                    <p className="text-gray-600 text-xs mt-1">Goods Receipt Form</p>
                                    {docStatus === "CANCELLED" && <p className="mt-2 text-red-600 font-bold text-lg border-2 border-red-600 inline-block px-2 py-1 transform -rotate-12">ยกเลิก / CANCELLED</p>}
                                </td>
                                {/* Document Control */}
                                <td className="border border-black p-0 w-1/3 align-top">
                                    <table className="w-full border-collapse text-xs">
                                        <tbody>
                                            <tr>
                                                <td className="border border-black px-2 py-1.5 font-bold w-24">รหัสเอกสาร</td>
                                                <td className="border border-black px-2 py-1.5">FM-WH-02</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-black px-2 py-1.5 font-bold">ฉบับที่ (Rev.)</td>
                                                <td className="border border-black px-2 py-1.5">01</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-black px-2 py-1.5 font-bold">วันที่บังคับใช้</td>
                                                <td className="border border-black px-2 py-1.5">01/01/2568</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-black px-2 py-1.5 font-bold">สถานะ</td>
                                                <td className="border border-black px-2 py-1.5">{docStatus === "DRAFT" ? "รออนุมัติ (Draft)" : docStatus === "APPROVED" ? "อนุมัติแล้ว" : "ยกเลิก"}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* ═══ RECEIPT INFO ═══ */}
                    <table className="w-full border-collapse border border-black text-sm mb-4">
                        <tbody>
                            <tr>
                                <td className="border border-black px-3 py-2 font-bold w-32">เลขที่เอกสาร:</td>
                                <td className="border border-black px-3 py-2 text-blue-700 font-bold w-1/3">{documentNo}</td>
                                <td className="border border-black px-3 py-2 font-bold w-32">วันที่รับเข้า:</td>
                                <td className="border border-black px-3 py-2">{receiptDate}</td>
                            </tr>
                            <tr>
                                <td className="border border-black px-3 py-2 font-bold">ผู้จำหน่าย/ลูกค้า:</td>
                                <td className="border border-black px-3 py-2">{custCode || "-"}</td>
                                <td className="border border-black px-3 py-2 font-bold">พนักงาน:</td>
                                <td className="border border-black px-3 py-2">{empCode || "-"}</td>
                            </tr>
                            <tr>
                                <td className="border border-black px-3 py-2 font-bold">หมายเหตุเอกสาร:</td>
                                <td className="border border-black px-3 py-2" colSpan="3">{remarks || "-"}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* ═══ ITEMS TABLE ═══ */}
                    <table className="w-full border-collapse border border-black text-sm mb-8">
                        <thead>
                            <tr className="bg-gray-100 text-center font-bold">
                                <td className="border border-black px-2 py-2 w-10">ลำดับ</td>
                                <td className="border border-black px-2 py-2">รหัสสินค้า / ชื่อสินค้า</td>
                                <td className="border border-black px-2 py-2">คลังเข้า</td>
                                <td className="border border-black px-2 py-2">ประเภท</td>
                                <td className="border border-black px-2 py-2">Lot No.</td>
                                <td className="border border-black px-2 py-2">วันหมดอายุ</td>
                                <td className="border border-black px-2 py-2 w-20">จำนวน</td>
                                <td className="border border-black px-2 py-2">หมายเหตุ</td>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedItems.map((item, index) => (
                                <tr key={item.id}>
                                    <td className="border border-black px-2 py-2 text-center">{index + 1}</td>
                                    <td className="border border-black px-2 py-2">
                                        <div className="font-bold">{item.productCode}</div>
                                        <div className="text-xs">{item.productName}</div>
                                    </td>
                                    <td className="border border-black px-2 py-2 text-center">{item.inWarehouseCode}</td>
                                    <td className="border border-black px-2 py-2 text-center">{item.receiptType}</td>
                                    <td className="border border-black px-2 py-2 text-center">{item.lotNo}</td>
                                    <td className="border border-black px-2 py-2 text-center">{item.expireDate}</td>
                                    <td className="border border-black px-2 py-2 text-center font-bold">{item.quantity}</td>
                                    <td className="border border-black px-2 py-2 text-xs">{item.remarks}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* ═══ SIGNATURES ═══ */}
                    <div className="grid grid-cols-3 gap-4 text-center text-sm mt-16 page-break-inside-avoid">
                        <div className="flex flex-col items-center">
                            <div className="border-b border-black w-48 mb-2 border-dotted h-8"></div>
                            <p>(........................................................)</p>
                            <p className="mt-1 font-bold">ผู้ส่งมอบสินค้า (Deliverer)</p>
                            <p className="text-xs text-gray-500 mt-1">วันที่: ....../....../..........</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="border-b border-black w-48 mb-2 border-dotted h-8"></div>
                            <p>(........................................................)</p>
                            <p className="mt-1 font-bold">ผู้รับเข้าคลัง (Receiver)</p>
                            <p className="text-xs text-gray-500 mt-1">วันที่: ....../....../..........</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="border-b border-black w-48 mb-2 border-dotted h-8"></div>
                            <p>(........................................................)</p>
                            <p className="mt-1 font-bold">ผู้อนุมัติ (Approver)</p>
                            <p className="text-xs text-gray-500 mt-1">วันที่: ....../....../..........</p>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
