import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import Loading from "../components/Loading";

const InputField = ({ label, name, value, onChange, type = "text", placeholder = "", required = false, indent = false }) => (
    <div className={indent ? "pl-4" : ""}>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input 
            type={type} name={name} value={value || ""} onChange={onChange} required={required}
            placeholder={placeholder}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all text-sm"
        />
    </div>
);

const SelectField = ({ label, name, value, onChange, options, indent = false }) => (
    <div className={indent ? "pl-4" : ""}>
        <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
        <select 
            name={name} value={value || ""} onChange={onChange}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all text-sm bg-white"
        >
            {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
    </div>
);

export default function CreateCustomer() {
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [showForm, setShowForm] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState("");
    const [customers, setCustomers] = useState([]);
    const [activeTab, setActiveTab] = useState("general");
    
    const generateCustCode = (type) => {
        const year = new Date().getFullYear();
        const prefix = type === "Supplier" ? "SP" : "CS";
        
        const yearPrefix = `${prefix}${year}`;
        const sameTypeAndYear = customers.filter(c => c.CUST_CODE?.startsWith(yearPrefix));
        let nextNum = 1;
        
        if (sameTypeAndYear.length > 0) {
            const lastNum = Math.max(...sameTypeAndYear.map(c => {
                const numPart = c.CUST_CODE.replace(yearPrefix, "");
                return parseInt(numPart) || 0;
            }));
            nextNum = lastNum + 1;
        }
        
        return `${yearPrefix}${nextNum.toString().padStart(4, '0')}`;
    };

    const initialFormData = {
        category: "Customer",
        custCode: "",
        businessNo: "",
        custName: "",
        bossName: "",
        uptae: "",
        jongmok: "",
        tel: "",
        hpNo: "",
        email: "",
        addr: "",
        remarks: "",
        fax: "",
        custGroup1: "",
        custGroup2: "",
        empCd: "",
        custLimit: "",
        priceGroup: "",
        priceGroup2: "",
        postNo: "",
        gGubun: "01",
        gBusinessType: "1",
        gBusinessCd: "",
        taxRegId: "",
        dmPost: "",
        dmAddr: "",
        remarksWin: "",
        gubun: "11",
        foreignFlag: "N",
        exchangeCode: "",
        urlPath: "",
        outorderYn: "N",
        ioCodeSlBaseYn: "Y",
        ioCodeSl: "",
        ioCodeByBaseYn: "Y",
        ioCodeBy: "",
        manageBondNo: "B",
        manageDebitNo: "B",
        oRate: "",
        iRate: "",
        custLimitTerm: "",
        cont1: "", cont2: "", cont3: "", cont4: "", cont5: "", cont6: "",
        noCustUser1: "", noCustUser2: "", noCustUser3: ""
    };

    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (showForm && !formData.custCode) {
            setFormData(prev => ({ ...prev, custCode: generateCustCode(prev.category) }));
        }
    }, [showForm, customers]);

    useEffect(() => {
        if (showForm) {
            setFormData(prev => ({ ...prev, custCode: generateCustCode(prev.category) }));
        }
    }, [formData.category]);

    const fetchCustomers = async () => {
        setLoadingData(true);
        try {
            const res = await fetch('/api/customers');
            const data = await res.json();
            if (data.customers) setCustomers(data.customers);
        } catch (e) {
            console.error(e);
        }
        setLoadingData(false);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? (checked ? 'Y' : 'N') : value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: "", type: "" });

        if (!formData.custCode || !formData.custName) {
            setMessage({ text: "กรุณากรอกรหัสลูกค้าและชื่อลูกค้า/บริษัทให้ครบถ้วน", type: "error" });
            setLoading(false);
            return;
        }

        try {
            const res = await fetch("/api/create-customer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            const result = await res.json();

            if (res.ok && result.success) {
                setMessage({ text: "สร้างลูกค้าใหม่สำเร็จ! ✅ เพิ่มลงในทะเบียนลูกค้าแล้ว", type: "success" });
                await fetchCustomers();
                
                setTimeout(() => {
                    setShowForm(false);
                    setMessage({ text: "", type: "" });
                    setFormData(initialFormData); 
                    setActiveTab("general");
                }, 1500);
            } else {
                setMessage({ text: `เกิดข้อผิดพลาด: ${result.error}`, type: "error" });
            }
        } catch (error) {
            setMessage({ text: "เกิดข้อผิดพลาดในการเชื่อมต่อ", type: "error" });
        }
        setLoading(false);
    };

    const handleSync = async () => {
        if (!confirm("คุณต้องการดึงข้อมูลลูกค้าทั้งหมดจาก Ecount มาบันทึกในระบบใช่หรือไม่?")) return;
        setLoading(true);
        setMessage({ text: "กำลังดึงข้อมูลจาก Ecount...", type: "" });
        try {
            const res = await fetch("/api/sync-customers", { method: "POST" });
            const result = await res.json();
            if (res.ok) {
                setMessage({ text: result.message + " ✅", type: "success" });
                await fetchCustomers();
            } else {
                setMessage({ text: "เกิดข้อผิดพลาด: " + result.error, type: "error" });
            }
        } catch (error) {
            console.error(error);
            setMessage({ text: "เชื่อมต่อล้มเหลว", type: "error" });
        }
        setLoading(false);
    };

    const handleImport = async () => {
        if (!importText.trim()) return;
        setLoading(true);
        try {
            const lines = importText.split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length < 2) throw new Error("ข้อมูลไม่เพียงพอ");

            const headerLine = lines[0];
            const delimiter = headerLine.includes('\t') ? '\t' : (headerLine.includes(',') ? ',' : '\t');
            const headers = headerLine.split(delimiter).map(h => h.trim());
            
            const data = lines.slice(1).map(line => {
                const cols = line.split(delimiter).map(c => c.trim());
                const obj = {};
                
                headers.forEach((h, i) => {
                    const val = cols[i] || "";
                    const key = h.toUpperCase();
                    
                    // Mapping Thai and English headers to DB fields
                    if (key === "รหัสลูกค้า" || key === "CODE" || key === "CUST_CODE") obj.custCode = val;
                    else if (key === "ชื่อลูกค้า" || key === "NAME" || key === "CUST_NAME") obj.custName = val;
                    else if (key === "เลขประจำตัวผู้เสียภาษี" || key === "BUSINESS NO" || key === "BUSINESS_NO") obj.businessNo = val;
                    else if (key === "ประเภทกิจการ" || key === "TYPE" || key === "CATEGORY") obj.category = val;
                    else if (key === "ชื่อผู้บริหาร" || key === "BOSS_NAME") obj.bossName = val;
                    else if (key === "ประเภทธุรกิจ" || key === "UPTAE") obj.uptae = val;
                    else if (key === "รายการธุรกิจ" || key === "JONGMOK") obj.jongmok = val;
                    else if (key === "เบอร์โทรศัพท์" || key === "TEL") obj.tel = val;
                    else if (key === "มือถือ" || key === "HP_NO") obj.hpNo = val;
                    else if (key === "แฟกซ์" || key === "FAX") obj.fax = val;
                    else if (key === "อีเมล" || key === "EMAIL") obj.email = val;
                    else if (key === "เว็บไซต์" || key === "URL_PATH") obj.urlPath = val;
                    else if (key === "รหัสไปรษณีย์" || key === "POST_NO") obj.postNo = val;
                    else if (key === "ที่อยู่" || key === "ADDR") obj.addr = val;
                    else if (key === "รหัสไปรษณีย์จัดส่ง" || key === "DM_POST") obj.dmPost = val;
                    else if (key === "ที่อยู่จัดส่ง" || key === "DM_ADDR") obj.dmAddr = val;
                    else if (key === "วงเงินเครดิต" || key === "CUST_LIMIT") obj.custLimit = val;
                    else if (key === "อายุลูกหนี้" || key === "CUST_LIMIT_TERM") obj.custLimitTerm = val;
                    else if (key === "กลุ่มราคาขาย" || key === "PRICE_GROUP") obj.priceGroup = val;
                    else if (key === "กลุ่มราคาซื้อ" || key === "PRICE_GROUP2") obj.priceGroup2 = val;
                    else if (key === "รหัสพนักงานผู้ดูแล" || key === "EMP_CD") obj.empCd = val;
                    else if (key === "กลุ่มลูกค้า 1" || key === "CUST_GROUP1") obj.custGroup1 = val;
                    else if (key === "กลุ่มลูกค้า 2" || key === "CUST_GROUP2") obj.custGroup2 = val;
                    else if (key === "ประเภทลูกค้า(GUBUN)" || key === "GUBUN") obj.gubun = val;
                    else if (key === "ประเภทคู่ค้า(G_GUBUN)" || key === "G_GUBUN") obj.gGubun = val;
                    else if (key === "การตั้งค่าภาษี" || key === "G_BUSINESS_TYPE") obj.gBusinessType = val;
                    else if (key === "รหัสภาษีเฉพาะ" || key === "G_BUSINESS_CD") obj.gBusinessCd = val;
                    else if (key === "รหัสย่อย" || key === "TAX_REG_ID") obj.taxRegId = val;
                    else if (key === "รหัสสกุลเงิน" || key === "EXCHANGE_CODE") obj.exchangeCode = val;
                    else if (key === "ใช้สกุลเงินต่างประเทศ" || key === "FOREIGN_FLAG") obj.foreignFlag = val;
                    else if (key === "การจัดการคำสั่งจัดส่ง" || key === "OUTORDER_YN") obj.outorderYn = val;
                    else if (key === "ใช้ค่าเริ่มต้นการขาย" || key === "IO_CODE_SL_BASE_YN") obj.ioCodeSlBaseYn = val;
                    else if (key === "รหัสภาษีขายเฉพาะ" || key === "IO_CODE_SL") obj.ioCodeSl = val;
                    else if (key === "ใช้ค่าเริ่มต้นการซื้อ" || key === "IO_CODE_BY_BASE_YN") obj.ioCodeByBaseYn = val;
                    else if (key === "รหัสภาษีซื้อเฉพาะ" || key === "IO_CODE_BY") obj.ioCodeBy = val;
                    else if (key === "การจัดการลูกหนี้" || key === "MANAGE_BOND_NO") obj.manageBondNo = val;
                    else if (key === "การจัดการเจ้าหนี้" || key === "MANAGE_DEBIT_NO") obj.manageDebitNo = val;
                    else if (key === "ขึ้น/ลง การขาย%" || key === "O_RATE") obj.oRate = val;
                    else if (key === "ขึ้น/ลง การซื้อ%" || key === "I_RATE") obj.iRate = val;
                    else if (key === "คีย์เวิร์ดค้นหา" || key === "REMARKS_WIN") obj.remarksWin = val;
                    else if (key === "หมายเหตุยาว" || key === "REMARKS") obj.remarks = val;
                    else if (key === "ข้อความเพิ่มเติม 1" || key === "CONT1") obj.cont1 = val;
                    else if (key === "ข้อความเพิ่มเติม 2" || key === "CONT2") obj.cont2 = val;
                    else if (key === "ข้อความเพิ่มเติม 3" || key === "CONT3") obj.cont3 = val;
                    else if (key === "ข้อความเพิ่มเติม 4" || key === "CONT4") obj.cont4 = val;
                    else if (key === "ข้อความเพิ่มเติม 5" || key === "CONT5") obj.cont5 = val;
                    else if (key === "ข้อความเพิ่มเติม 6" || key === "CONT6") obj.cont6 = val;
                    else if (key === "ตัวเลขเพิ่มเติม 1" || key === "NO_CUST_USER1") obj.noCustUser1 = val;
                    else if (key === "ตัวเลขเพิ่มเติม 2" || key === "NO_CUST_USER2") obj.noCustUser2 = val;
                    else if (key === "ตัวเลขเพิ่มเติม 3" || key === "NO_CUST_USER3") obj.noCustUser3 = val;
                });
                return obj;
            });

            const res = await fetch("/api/bulk-create-customers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customers: data })
            });
            const result = await res.json();
            
            if (res.ok) {
                setMessage({ text: `นำเข้าสำเร็จ ${result.success} รายการ (ล้มเหลว ${result.fail})`, type: result.fail > 0 ? "error" : "success" });
                await fetchCustomers();
                setShowImportModal(false);
                setImportText("");
            } else {
                setMessage({ text: "เกิดข้อผิดพลาดในการนำเข้า: " + (result.error || ""), type: "error" });
            }
        } catch (e) {
            console.error(e);
            setMessage({ text: "รูปแบบข้อมูลไม่ถูกต้อง หรือหัวคอลัมน์ไม่ตรงตามที่กำหนด", type: "error" });
        }
        setLoading(false);
    };

    const downloadTemplate = () => {
        const headers = [
            "รหัสลูกค้า", "ชื่อลูกค้า", "เลขประจำตัวผู้เสียภาษี", "ประเภทกิจการ", "ชื่อผู้บริหาร", "ประเภทธุรกิจ", "รายการธุรกิจ", 
            "เบอร์โทรศัพท์", "มือถือ", "แฟกซ์", "อีเมล", "เว็บไซต์", "รหัสไปรษณีย์", "ที่อยู่", 
            "รหัสไปรษณีย์จัดส่ง", "ที่อยู่จัดส่ง", "วงเงินเครดิต", "อายุลูกหนี้", "กลุ่มราคาขาย", "กลุ่มราคาซื้อ",
            "รหัสพนักงานผู้ดูแล", "กลุ่มลูกค้า 1", "กลุ่มลูกค้า 2", "ประเภทลูกค้า(GUBUN)", "ประเภทคู่ค้า(G_GUBUN)", "การตั้งค่าภาษี",
            "รหัสภาษีเฉพาะ", "รหัสย่อย", "รหัสสกุลเงิน", "ใช้สกุลเงินต่างประเทศ", "การจัดการคำสั่งจัดส่ง",
            "ใช้ค่าเริ่มต้นการขาย", "รหัสภาษีขายเฉพาะ", "ใช้ค่าเริ่มต้นการซื้อ", "รหัสภาษีซื้อเฉพาะ",
            "การจัดการลูกหนี้", "การจัดการเจ้าหนี้", "ขึ้น/ลง การขาย%", "ขึ้น/ลง การซื้อ%", "คีย์เวิร์ดค้นหา", "หมายเหตุยาว",
            "ข้อความเพิ่มเติม 1", "ข้อความเพิ่มเติม 2", "ข้อความเพิ่มเติม 3", "ข้อความเพิ่มเติม 4", "ข้อความเพิ่มเติม 5", "ข้อความเพิ่มเติม 6",
            "ตัวเลขเพิ่มเติม 1", "ตัวเลขเพิ่มเติม 2", "ตัวเลขเพิ่มเติม 3"
        ];
        const sampleData = [
            "CS20260001", "บริษัท ตัวอย่าง จำกัด", "0123456789012", "Customer", "นายสมชาย", "ขายปลีก", "เครื่องใช้ไฟฟ้า",
            "021234567", "0812345678", "021234568", "test@example.com", "https://example.com", "10110", "123 ถนนสุขุมวิท กรุงเทพฯ",
            "10110", "ที่อยู่จัดส่ง MD", "100000", "30", "A", "B",
            "EMP001", "GROUP_A", "GROUP_B", "11", "01", "1",
            "", "00000", "THB", "N", "N",
            "Y", "", "Y", "",
            "B", "B", "0", "0", "ค้นหาตัวอย่าง", "หมายเหตุเพิ่มเติม...",
            "ข้อความ 1", "ข้อความ 2", "", "", "", "",
            "100", "200", "0"
        ];
        const csvContent = "\uFEFF" + headers.join(",") + "\n" + sampleData.join(","); 
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "customer_import_template.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const tabs = [
        { id: "general", label: "ข้อมูลหลัก", icon: "🏢" },
        { id: "contact", label: "ข้อมูลติดต่อ", icon: "📞" },
        { id: "finance", label: "การเงิน/ราคา", icon: "💰" },
        { id: "group", label: "กลุ่ม/พนักงาน", icon: "👥" },
        { id: "tax", label: "ตั้งค่าภาษี", icon: "🧾" },
        { id: "extra", label: "ข้อมูลเพิ่มเติม", icon: "➕" }
    ];

    return (
        <Layout>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8 pb-4 border-b border-gray-200 flex flex-col md:flex-row md:items-end justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-1">ทะเบียนลูกค้า / ผู้ขาย 🧑‍💼</h1>
                        <p className="text-gray-500 font-medium">จัดการทะเบียนประวัติลูกค้า ระบบ Ecount ERP แบบละเอียดครบทุก Field</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleSync}
                            disabled={loading}
                            className={`bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-200/50 transition-all flex items-center space-x-2 active:scale-95 border border-indigo-400 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Sync from Ecount</span>
                        </button>
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200/50 transition-all flex items-center space-x-2 active:scale-95 border border-blue-400"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            <span>Import ข้อมูล</span>
                        </button>
                        <button
                            onClick={() => setShowForm(true)}
                            className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-green-200/50 transition-all flex items-center space-x-2 active:scale-95 border border-green-400"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            <span>สร้างลูกค้าใหม่</span>
                        </button>
                    </div>
                </div>

                {showForm ? (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden mb-12">
                        <div className="h-2 bg-gradient-to-r from-green-500 to-teal-500 w-full"></div>
                        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <span className="bg-green-100 text-green-600 p-1.5 rounded-lg text-lg">📝</span>
                                ลงทะเบียนลูกค้าฉบับสมบูรณ์
                            </h2>
                            <button onClick={() => setShowForm(false)} className="text-sm font-bold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                ยกเลิกและกลับหน้าแรก
                            </button>
                        </div>

                        <div className="flex overflow-x-auto bg-white border-b border-gray-100 scrollbar-hide">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-4 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${
                                        activeTab === tab.id 
                                        ? "border-green-600 text-green-600 bg-green-50/30" 
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    <span>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                            {message.text && (
                                <div className={`mb-6 p-4 rounded-xl border flex items-start space-x-3 animate-fade-in ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                                    <span className="text-xl mt-0.5">{message.type === 'error' ? '⚠️' : '✅'}</span>
                                    <p className="font-bold whitespace-pre-line">{message.text}</p>
                                </div>
                            )}

                            <div className="space-y-8 min-h-[400px]">
                                {activeTab === "general" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
                                        <div className="lg:col-span-1">
                                            <SelectField 
                                                label="ประเภทกิจการ" 
                                                name="category" 
                                                value={formData.category}
                                                onChange={handleChange}
                                                options={[
                                                    {label: "ลูกค้า (Customer)", value: "Customer"}, 
                                                    {label: "ผู้ขาย (Supplier)", value: "Supplier"}, 
                                                    {label: "ผู้ให้บริการ (Service Provider)", value: "Service"}
                                                ]} 
                                            />
                                        </div>
                                        <div className="lg:col-span-1">
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">รหัสอัตโนมัติ (CUST) <span className="text-red-500">*</span></label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" name="custCode" value={formData.custCode} onChange={handleChange} required
                                                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all text-sm font-bold uppercase bg-gray-50"
                                                    readOnly
                                                />
                                                <button type="button" onClick={() => setFormData(prev => ({...prev, custCode: generateCustCode(prev.category)}))} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 transition-colors">
                                                    🔄 รีเซ็ต
                                                </button>
                                            </div>
                                        </div>
                                        <div className="md:col-span-1 lg:col-span-1">
                                            <InputField label="เลขประจำตัวผู้เสียภาษี (BUSINESS_NO)" name="businessNo" value={formData.businessNo} onChange={handleChange} placeholder="เลข 13 หลัก" />
                                        </div>
                                        <div className="md:col-span-2 lg:col-span-3">
                                            <InputField label="ชื่อบริษัท/ลูกค้า (CUST_NAME)" name="custName" value={formData.custName} onChange={handleChange} required placeholder="ระบุชื่อเต็ม" />
                                        </div>
                                        <InputField label="ชื่อผู้บริหาร/CEO (BOSS_NAME)" name="bossName" value={formData.bossName} onChange={handleChange} />
                                        <InputField label="ประเภทธุรกิจ (UPTAE)" name="uptae" value={formData.uptae} onChange={handleChange} placeholder="เช่น บริการ, ผลิต" />
                                        <InputField label="รายการธุรกิจ (JONGMOK)" name="jongmok" value={formData.jongmok} onChange={handleChange} placeholder="เช่น ขายส่งเครื่องสำอาง" />
                                        <SelectField label="ประเภทลูกค้า (GUBUN)" name="gubun" value={formData.gubun} onChange={handleChange} options={[{label: "ทั่วไป (11)", value: "11"}, {label: "ตัวแทนออกของ (13)", value: "13"}]} />
                                        <InputField label="รหัสย่อย (TAX_REG_ID)" name="taxRegId" value={formData.taxRegId} onChange={handleChange} type="number" />
                                        <InputField label="คีย์เวิร์ดค้นหา (REMARKS_WIN)" name="remarksWin" value={formData.remarksWin} onChange={handleChange} />
                                    </div>
                                )}

                                {activeTab === "contact" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
                                        <InputField label="เบอร์โทรศัพท์ (TEL)" name="tel" value={formData.tel} onChange={handleChange} />
                                        <InputField label="มือถือ (HP_NO)" name="hpNo" value={formData.hpNo} onChange={handleChange} />
                                        <InputField label="แฟกซ์ (FAX)" name="fax" value={formData.fax} onChange={handleChange} />
                                        <InputField label="อีเมล (EMAIL)" name="email" value={formData.email} onChange={handleChange} type="email" placeholder="example@mail.com" />
                                        <InputField label="เว็บไซต์ (URL_PATH)" name="urlPath" value={formData.urlPath} onChange={handleChange} placeholder="https://..." />
                                        <InputField label="รหัสไปรษณีย์ (POST_NO)" name="postNo" value={formData.postNo} onChange={handleChange} />
                                        <div className="md:col-span-2 lg:col-span-3">
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">ที่อยู่ (ADDR)</label>
                                            <textarea name="addr" value={formData.addr} onChange={handleChange} rows="2" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all text-sm resize-none" />
                                        </div>
                                        <div className="md:col-span-1">
                                            <InputField label="รหัสไปรษณีย์ MD (DM_POST)" name="dmPost" value={formData.dmPost} onChange={handleChange} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <InputField label="ที่อยู่ MD (DM_ADDR)" name="dmAddr" value={formData.dmAddr} onChange={handleChange} />
                                        </div>
                                    </div>
                                )}

                                {activeTab === "finance" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
                                        <InputField label="วงเงินเครดิต (CUST_LIMIT)" name="custLimit" value={formData.custLimit} onChange={handleChange} type="number" />
                                        <InputField label="อายุลูกหนี้/วัน (CUST_LIMIT_TERM)" name="custLimitTerm" value={formData.custLimitTerm} onChange={handleChange} type="number" />
                                        <InputField label="กลุ่มราคาขาย (PRICE_GROUP)" name="priceGroup" value={formData.priceGroup} onChange={handleChange} />
                                        <InputField label="กลุ่มราคาซื้อ (PRICE_GROUP2)" name="priceGroup2" value={formData.priceGroup2} onChange={handleChange} />
                                        <InputField label="ขึ้น/ลง การขาย% (O_RATE)" name="oRate" value={formData.oRate} onChange={handleChange} type="number" />
                                        <InputField label="ขึ้น/ลง การซื้อ% (I_RATE)" name="iRate" value={formData.iRate} onChange={handleChange} type="number" />
                                        <SelectField label="การจัดการลูกหนี้ (MANAGE_BOND)" name="manageBondNo" value={formData.manageBondNo} onChange={handleChange} options={[{label:"เริ่มต้น (B)", value:"B"}, {label:"จำเป็น (M)", value:"M"}, {label:"เลือกได้ (Y)", value:"Y"}, {label:"ไม่ใช้ (N)", value:"N"}]} />
                                        <SelectField label="การจัดการเจ้าหนี้ (MANAGE_DEBIT)" name="manageDebitNo" value={formData.manageDebitNo} onChange={handleChange} options={[{label:"เริ่มต้น (B)", value:"B"}, {label:"จำเป็น (M)", value:"M"}, {label:"เลือกได้ (Y)", value:"Y"}, {label:"ไม่ใช้ (N)", value:"N"}]} />
                                        <InputField label="รหัสสกุลเงิน (EXCHANGE_CODE)" name="exchangeCode" value={formData.exchangeCode} onChange={handleChange} />
                                        <SelectField label="ใช้สกุลเงินต่างประเทศ" name="foreignFlag" value={formData.foreignFlag} onChange={handleChange} options={[{label:"ไม่ใช้ (N)", value:"N"}, {label:"ใช้ (Y)", value:"Y"}]} />
                                    </div>
                                )}

                                {activeTab === "group" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up">
                                        <SelectField 
                                            label="รหัสพนักงานผู้ดูแล (EMP_CD)" 
                                            name="empCd" 
                                            value={formData.empCd} 
                                            onChange={handleChange} 
                                            options={[
                                                { label: "ไม่ระบุ", value: "" },
                                                { label: "คณารัตน์ (OFFICE001)", value: "OFFICE001" },
                                                { label: "ส้ม (OFFICE002)", value: "OFFICE002" },
                                                { label: "พิ๊ง (OnLine00001)", value: "OnLine00001" },
                                                { label: "วุฒิชัย สป. (S00001)", value: "S00001" },
                                                { label: "ชัยวัณรินทร์ / โบ๊ท (S00002)", value: "S00002" },
                                                { label: "ทรงพล (S00003)", value: "S00003" },
                                                { label: "วีรพันธ์/หน่อง (S00004)", value: "S00004" },
                                                { label: "วุฒิชัย/อีสาน (S00005)", value: "S00005" },
                                                { label: "เอกศักดิ์/เอ็ก (S00006)", value: "S00006" },
                                                { label: "จักรพงษ์ / บิน (S00007)", value: "S00007" },
                                                { label: "ธนัญพรรธน์/เมย์ (S00008)", value: "S00008" },
                                                { label: "ชัช (S00009)", value: "S00009" },
                                                { label: "ปภังกร / แบงค์ (S00010)", value: "S00010" }
                                            ]}
                                        />
                                        <InputField label="กลุ่มลูกค้า 1 (CUST_GROUP1)" name="custGroup1" value={formData.custGroup1} onChange={handleChange} />
                                        <InputField label="กลุ่มลูกค้า 2 (CUST_GROUP2)" name="custGroup2" value={formData.custGroup2} onChange={handleChange} />
                                        <SelectField label="การจัดการคำสั่งจัดส่ง (OUTORDER_YN)" name="outorderYn" value={formData.outorderYn} onChange={handleChange} options={[{label:"ไม่ใช้ (N)", value:"N"}, {label:"ใช้ (Y)", value:"Y"}]} />
                                    </div>
                                )}

                                {activeTab === "tax" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
                                        <SelectField label="ประเภทคู่ค้า (G_GUBUN)" name="gGubun" value={formData.gGubun} onChange={handleChange} options={[{label:"เลขธุรกิจ (01)", value:"01"}, {label:"บุคคลทั่วไป (02)", value:"02"}, {label:"ต่างชาติ (03)", value:"03"}]} />
                                        <SelectField label="การตั้งค่าภาษี (G_BUSINESS_TYPE)" name="gBusinessType" value={formData.gBusinessType} onChange={handleChange} options={[{label:"รหัสเดียวกัน (1)", value:"1"}, {label:"ค้นหา (2)", value:"2"}, {label:"ระบุเอง (3)", value:"3"}]} />
                                        <InputField label="รหัสภาษีเฉพาะ (G_BUSINESS_CD)" name="gBusinessCd" value={formData.gBusinessCd} onChange={handleChange} />
                                        <div className="border-t pt-6 lg:col-span-3">
                                            <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                                <span className="w-1 h-4 bg-green-500 rounded-full"></span>
                                                ตั้งค่าประเภทธุรกรรม (VAT Default)
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                    <SelectField label="ใช้ค่าเริ่มต้นการขาย (SL_BASE)" name="ioCodeSlBaseYn" value={formData.ioCodeSlBaseYn} onChange={handleChange} options={[{label:"ใช่ (Y)", value:"Y"}, {label:"ไม่ (N)", value:"N"}]} />
                                                    <div className="mt-4">
                                                        <InputField label="รหัสภาษีขายเฉพาะ (IO_CODE_SL)" name="ioCodeSl" value={formData.ioCodeSl} onChange={handleChange} indent={true} />
                                                    </div>
                                                </div>
                                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                    <SelectField label="ใช้ค่าเริ่มต้นการซื้อ (BY_BASE)" name="ioCodeByBaseYn" value={formData.ioCodeByBaseYn} onChange={handleChange} options={[{label:"ใช่ (Y)", value:"Y"}, {label:"ไม่ (N)", value:"N"}]} />
                                                    <div className="mt-4">
                                                        <InputField label="รหัสภาษีซื้อเฉพาะ (IO_CODE_BY)" name="ioCodeBy" value={formData.ioCodeBy} onChange={handleChange} indent={true} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "extra" && (
                                    <div className="space-y-8 animate-slide-up">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <InputField label="ข้อความเพิ่มเติม 1 (CONT1)" name="cont1" value={formData.cont1} onChange={handleChange} />
                                            <InputField label="ข้อความเพิ่มเติม 2 (CONT2)" name="cont2" value={formData.cont2} onChange={handleChange} />
                                            <InputField label="ข้อความเพิ่มเติม 3 (CONT3)" name="cont3" value={formData.cont3} onChange={handleChange} />
                                            <InputField label="ข้อความเพิ่มเติม 4 (CONT4)" name="cont4" value={formData.cont4} onChange={handleChange} />
                                            <InputField label="ข้อความเพิ่มเติม 5 (CONT5)" name="cont5" value={formData.cont5} onChange={handleChange} />
                                            <InputField label="ข้อความเพิ่มเติม 6 (CONT6)" name="cont6" value={formData.cont6} onChange={handleChange} />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-6">
                                            <InputField label="ตัวเลขเพิ่มเติม 1 (NO1)" name="noCustUser1" value={formData.noCustUser1} onChange={handleChange} type="number" />
                                            <InputField label="ตัวเลขเพิ่มเติม 2 (NO2)" name="noCustUser2" value={formData.noCustUser2} onChange={handleChange} type="number" />
                                            <InputField label="ตัวเลขเพิ่มเติม 3 (NO3)" name="noCustUser3" value={formData.noCustUser3} onChange={handleChange} type="number" />
                                        </div>
                                        <div className="border-t pt-6">
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">หมายเหตุยาว (REMARKS)</label>
                                            <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows="3" className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all text-sm" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-12 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
                                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors order-2 sm:order-1">
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`px-10 py-3 rounded-xl text-white font-bold text-lg transition-all shadow-lg transform active:scale-95 flex items-center justify-center gap-2 order-1 sm:order-2 ${
                                        loading 
                                        ? "bg-green-400 cursor-not-allowed" 
                                        : "bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 shadow-green-200/50"
                                    }`}
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            <span>กำลังบันทึกข้อมูล...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                            <span>ลงทะเบียนลูกค้าเข้า Ecount ERP</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <>
                        {loadingData ? (
                            <div className="py-20"><Loading /></div>
                        ) : (
                            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-10">
                                {customers.length === 0 ? (
                                    <div className="p-20 text-center">
                                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 mb-6">
                                            <span className="text-4xl text-green-500">🏢</span>
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-800 mb-2">ยังไม่มีทะเบียนลูกค้า</h3>
                                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">คุณสามารถเริ่มสร้างประวัติลูกค้าใหม่ที่นี่ เพื่อเชื่อมโยงข้อมูลกับระบบ Ecount ERP โดยตรง</p>
                                        <button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-green-200 transition-all active:scale-95">
                                            + เริ่มลงทะเบียนลูกค้าคนแรก
                                        </button>
                                    </div> 
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-400 text-xs uppercase tracking-widest">
                                                    <th className="px-6 py-4 font-bold">รหัส (CODE)</th>
                                                    <th className="px-6 py-4 font-bold">ข้อมูลบริษัท / ลูกค้า</th>
                                                    <th className="px-6 py-4 font-bold">การติดต่อ</th>
                                                    <th className="px-6 py-4 font-bold hidden lg:table-cell">หมวดหมู่ / ประเภท</th>
                                                    <th className="px-6 py-4 font-bold text-center">แอคชั่น</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {customers.map((c) => (
                                                    <tr key={c.CUST_CODE} className="hover:bg-green-50/30 transition-colors group">
                                                        <td className="px-6 py-5">
                                                            <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded text-sm">{c.CUST_CODE}</span>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="font-extrabold text-gray-800 text-base">{c.CUST_DES || c.CUST_NAME}</div>
                                                            <div className="text-xs font-medium text-gray-400 mt-1 flex items-center gap-1">
                                                                <span className="bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">TAX ID:</span>
                                                                {c.BUSINESS_NO || c.business_no || '-'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            <div className="text-sm text-gray-700 font-bold">{c.TEL || c.tel || '-'}</div>
                                                            <div className="text-xs text-gray-400 truncate max-w-[150px]">{c.EMAIL || c.email || '-'}</div>
                                                        </td>
                                                        <td className="px-6 py-5 hidden lg:table-cell">
                                                            <div className="text-sm font-bold text-gray-600">{c.JONGMOK || c.jongmok || '-'}</div>
                                                            <div className="text-xs text-gray-400 italic">{c.UPTAE || c.uptae || '-'}</div>
                                                        </td>
                                                        <td className="px-6 py-5 text-center">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    window.location.href = `/visits?custCode=${c.CUST_CODE}&custName=${encodeURIComponent(c.CUST_DES || c.CUST_NAME)}`;
                                                                }}
                                                                className="px-4 py-2 bg-white text-green-600 hover:bg-green-600 hover:text-white border border-green-200 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow-green-100 flex items-center gap-2 mx-auto"
                                                            >
                                                                <span>📍 ลงพื้นที่</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {showImportModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-50/50">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <span>📥</span> Import ข้อมูลจาก Ecount / Excel
                                </h3>
                                <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-700">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <p className="text-sm text-gray-500">
                                        วางข้อมูลที่คัดลอกมาจาก Excel หรือ CSV โดยมีหัวข้อ (Header) เป็นรหัสหรือชื่อ
                                    </p>
                                    <button 
                                        type="button"
                                        onClick={downloadTemplate}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0L8 8m4-4v12" /></svg>
                                        ดาวน์โหลด Template CSV
                                    </button>
                                </div>
                                <textarea 
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                    placeholder="วางข้อมูลที่นี่..."
                                    className="w-full h-64 px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none font-mono text-xs resize-none"
                                />
                                <div className="flex justify-end gap-3">
                                    <button onClick={() => setShowImportModal(false)} className="px-6 py-2 rounded-xl bg-gray-100 font-bold text-gray-600">ยกเลิก</button>
                                    <button 
                                        onClick={handleImport}
                                        disabled={loading}
                                        className="px-8 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
                                    >
                                        {loading ? "กำลังประมวลผล..." : "ยืนยันนำเข้าข้อมูล"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
            `}</style>
        </Layout>
    );
}
