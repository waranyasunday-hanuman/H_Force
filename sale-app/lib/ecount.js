// lib/ecount.js
// ไฟล์นี้รวมฟังก์ชันทั้งหมดที่ใช้คุยกับ Ecount OAPI

// -----------------------------------------------
// ขั้นตอนที่ 1: ดึง Zone
// ต้องทำก่อนเสมอ เพื่อรู้ว่า server อยู่ที่ไหน
// ใช้ sboapi = server ทดสอบ
// ใช้ oapi = server จริง (ต้องมี Production Key)
// -----------------------------------------------
async function getZone() {
    const response = await fetch("https://oapi.ecount.com/OAPI/V2/Zone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            COM_CODE: process.env.ECOUNT_COMPANY_CODE,
        }),
    });

    const data = await response.json();

    // ถ้าไม่มี Data กลับมา = มีปัญหา
    if (!data.Data) {
        throw new Error(`Zone Error: ${JSON.stringify(data)}`);
    }

    return data.Data; // { ZONE: "IA", DOMAIN: ".ecount.com" }
}

// เราจะเก็บว่าใช้ oapi หรือ sboapi ไว้ที่นี่หลังจาก Login สำเร็จ
let lastUsedEndpoint = "oapi"; 
let lastUsedHost = ""; 
let lastUsedCookie = ""; // Store session cookie

// -----------------------------------------------
// ขั้นตอนที่ 2: Login ขอ Session ID
// Session ID ใช้แทน password ในการเรียก API อื่นๆ
// -----------------------------------------------
export async function getSessionKey() {
    const zoneData = await getZone();
    const zone = zoneData.ZONE;
    const domain = zoneData.DOMAIN;

    // เราจะลองทั้ง oapi (จริง) และ sboapi (ทดสอบ/Trial) เพื่อความชัวร์
    const prefixes = ["oapi", "sboapi"];
    
    for (const prefix of prefixes) {
        const loginUrl = `https://${prefix}${zone}${domain}/OAPI/V2/OAPILogin`;
        try {
            console.log(`Attempting login at: ${loginUrl}`);
            const response = await fetch(loginUrl, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                },
                body: JSON.stringify({
                    COM_CODE: process.env.ECOUNT_COMPANY_CODE,
                    USER_ID: process.env.ECOUNT_USER_ID,
                    API_CERT_KEY: process.env.ECOUNT_API_KEY,
                    LAN_TYPE: "th-TH",
                    ZONE: zone,
                }),
            });

            const data = await response.json();
            
            // ตรวจสอบว่าได้ Session ID หรือไม่
            if (data.Status == 200 && data.Data?.Datas?.SESSION_ID) {
                // บันทึก host ล่าสุดไว้ใช้
                const hostUrl = data.Data.Datas.HOST_URL || "oapiia.ecount.com";
                lastUsedHost = hostUrl;
                lastUsedEndpoint = hostUrl.split('.')[0];
                lastUsedCookie = (data.Data.Datas.SET_COOKIE || "").trim(); // Store the cookie and TRIM IT!
                
                console.log("ECOUNT Login Successful:", data.Data.Datas.SESSION_ID, "Host:", hostUrl);
                return {
                    sessionKey: data.Data.Datas.SESSION_ID,
                    hostUrl: hostUrl
                };
            } else {
                console.warn(`Login via ${prefix} failed. Status: ${data.Status}, Error: ${JSON.stringify(data.Errors || data.Data)}`);
            }
        } catch (err) {
            console.error(`CRITICAL: Login fetch error for ${loginUrl}:`, err.message);
        }
    }

    throw new Error("Ecount Login Failed on both Production and Sandbox. Please check COM_CODE, USER_ID, and API_CERT_KEY in .env.local");
}

// -----------------------------------------------
// ฟังก์ชัน helper: สร้าง base URL สำหรับ API อื่นๆ
// -----------------------------------------------
async function getBaseUrl(explicitHost) {
    const host = explicitHost || lastUsedHost || "oapiia.ecount.com";
    return `https://${host.toLowerCase()}/OAPI/V2`;
}

// -----------------------------------------------
// สร้างลูกค้าใหม่
// -----------------------------------------------
export async function createCustomer(sessionKey, custData) {
    const baseUrl = await getBaseUrl();

    const response = await fetch(
        `${baseUrl}/AccountBasic/SaveBasicCust?SESSION_ID=${sessionKey}`,
        {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Cookie": lastUsedCookie,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            },
            body: JSON.stringify({
                CustList: [
                    {
                        BulkDatas: {
                            CUST: custData.custCode || "",
                            CUST_NAME: custData.custName || "",
                            BUSINESS_NO: custData.businessNo || "",
                            BOSS_NAME: custData.bossName || "",
                            UPTAE: custData.uptae || "",
                            JONGMOK: custData.jongmok || "",
                            TEL: custData.tel || "",
                            HP_NO: custData.hpNo || "",
                            EMAIL: custData.email || "",
                            ADDR: custData.addr || "",
                            REMARKS: custData.remarks || "",
                            FAX: custData.fax || "",
                            CUST_GROUP1: custData.custGroup1 || "",
                            CUST_GROUP2: custData.custGroup2 || "",
                            EMP_CD: custData.empCd || "",
                            CUST_LIMIT: custData.custLimit ? String(custData.custLimit) : "",
                            PRICE_GROUP: custData.priceGroup || "",
                            PRICE_GROUP2: custData.priceGroup2 || "",
                            POST_NO: custData.postNo || "",
                            G_GUBUN: custData.gGubun || "01",
                            G_BUSINESS_TYPE: custData.gBusinessType || "",
                            G_BUSINESS_CD: custData.gBusinessCd || "",
                            TAX_REG_ID: custData.taxRegId || "",
                            DM_POST: custData.dmPost || "",
                            DM_ADDR: custData.dmAddr || "",
                            REMARKS_WIN: custData.remarksWin || "",
                            GUBUN: custData.gubun || "11",
                            FOREIGN_FLAG: custData.foreignFlag || "N",
                            EXCHANGE_CODE: custData.exchangeCode || "",
                            URL_PATH: custData.urlPath || "",
                            OUTORDER_YN: custData.outorderYn || "N",
                            IO_CODE_SL_BASE_YN: custData.ioCodeSlBaseYn || "Y",
                            IO_CODE_SL: custData.ioCodeSl || "",
                            IO_CODE_BY_BASE_YN: custData.ioCodeByBaseYn || "Y",
                            IO_CODE_BY: custData.ioCodeBy || "",
                            MANAGE_BOND_NO: custData.manageBondNo || "B",
                            MANAGE_DEBIT_NO: custData.manageDebitNo || "B",
                            O_RATE: custData.oRate ? String(custData.oRate) : "",
                            I_RATE: custData.iRate ? String(custData.iRate) : "",
                            CUST_LIMIT_TERM: custData.custLimitTerm ? String(custData.custLimitTerm) : "",
                            CONT1: custData.cont1 || "",
                            CONT2: custData.cont2 || "",
                            CONT3: custData.cont3 || "",
                            CONT4: custData.cont4 || "",
                            CONT5: custData.cont5 || "",
                            CONT6: custData.cont6 || "",
                            NO_CUST_USER1: custData.noCustUser1 ? String(custData.noCustUser1) : "",
                            NO_CUST_USER2: custData.noCustUser2 ? String(custData.noCustUser2) : "",
                            NO_CUST_USER3: custData.noCustUser3 ? String(custData.noCustUser3) : ""
                        }
                    }
                ]
            }),
        }
    );

    const data = await response.json();
    if (data.Status !== "200") {
        throw new Error(JSON.stringify(data));
    }
    
    const dataObj = Array.isArray(data.Data) ? data.Data[0] : data.Data;
    if (dataObj && dataObj.FailCnt > 0) {
        let errMsg = "Unknown Ecount ERP Error (Customer)";
        if (dataObj.ResultDetails && dataObj.ResultDetails.length > 0) {
            errMsg = dataObj.ResultDetails[0].TotalError || JSON.stringify(dataObj.ResultDetails);
        }
        throw new Error(`Ecount Error: ${errMsg}`);
    }

    return data.Data;
}

// -----------------------------------------------
// ดึงรายการลูกค้า (ดึงจริงจาก Ecount)
// -----------------------------------------------
export async function getCustomers(sessionKey) {
    const baseUrl = await getBaseUrl();

    const response = await fetch(
        `${baseUrl}/AccountBasic/GetListCust`,
        {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Cookie": lastUsedCookie,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            },
            body: JSON.stringify({
                COM_CODE: process.env.ECOUNT_COMPANY_CODE,
                SESSION_ID: sessionKey,
                IsPaging: false,
                Condition: ""
            }),
        }
    );

    const data = await response.json();
    
    if (data.Status !== "200" && data.Status !== 200) {
        throw new Error(`Ecount GetListCust Error: ${data.Status} - ${JSON.stringify(data.Errors || data)}`);
    }

    // คืนค่ารายการลูกค้ากลับไป (ใช้ค่า CUST_NAME หรือ CUST_DES ตามลำดับ)
    return (data.Data?.Result || []).map(c => ({
        ...c,
        CUST_CODE: c.CUST || c.CUST_CD || "",
        CUST_NAME: c.CUST_NAME || c.CUST_DES || ""
    }));
}

// -----------------------------------------------
// ดึงรายการสินค้า
// -----------------------------------------------
export async function getProducts(sessionKey, hostUrl) {
    const baseUrl = await getBaseUrl(hostUrl);
    const url = `${baseUrl}/InventoryBasic/GetBasicProductsList?SESSION_ID=${sessionKey}`;
    
    const response = await fetch(url, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json", 
            "Accept": "application/json",
            "Cookie": lastUsedCookie,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        body: JSON.stringify({ 
            COM_CODE: String(process.env.ECOUNT_COMPANY_CODE || "917158")
        }),
    });

    const data = await response.json().catch(() => null);
    if (!data || (data.Status !== "200" && data.Status !== 200)) {
        console.error("Ecount GetBasicProductsList failed", data);
        return [];
    }
    return data.Data?.Result || [];
}

// -----------------------------------------------
// สร้าง Sales Order (SO)
// soData = { date, customerCode, items: [{ productCode, quantity, price }] }
// -----------------------------------------------
export async function createSalesOrder(sessionKey, soData) {
    const baseUrl = await getBaseUrl();

    const saleOrderList = soData.items.map((item) => ({
        BulkDatas: {
            UPLOAD_SER_NO: "1",             // เอกสารเดียวกันใช้เลขเดียวกัน
            IO_DATE: soData.date,           // วันที่ เช่น "20240416"
            CUST: soData.customerCode,      // รหัสลูกค้า ERP
            WH_CD: process.env.ECOUNT_WH_CD || "ST002", // รหัสสถานที่จ่ายสินค้า
            PROD_CD: item.productCode,      // รหัสสินค้า
            QTY: String(item.quantity || 1),// จำนวน
            PRICE: String(item.price || 0), // ราคา
        }
    }));

    const response = await fetch(
        `${baseUrl}/SaleOrder/SaveSaleOrder?SESSION_ID=${sessionKey}`,
        {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Cookie": lastUsedCookie,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            },
            body: JSON.stringify({
                SaleOrderList: saleOrderList
            }),
        }
    );

    const data = await response.json();

    if (data.Status !== "200") {
        throw new Error(JSON.stringify(data));
    }

    const dataObj = Array.isArray(data.Data) ? data.Data[0] : data.Data;
    if (dataObj && dataObj.FailCnt > 0) {
        let errMsg = "Unknown Ecount ERP Error (SaleOrder)";
        if (dataObj.ResultDetails && dataObj.ResultDetails.length > 0) {
            errMsg = dataObj.ResultDetails[0].TotalError || JSON.stringify(dataObj.ResultDetails);
        }
        throw new Error(`Ecount Error: ${errMsg}`);
    }

    return data.Data;
}

// -----------------------------------------------
// ดึงยอดขายสำหรับ Dashboard
// -----------------------------------------------
export async function getSalesReport(sessionKey, startDate, endDate) {
    const baseUrl = await getBaseUrl();

    const response = await fetch(
        `${baseUrl}/Sale/GetSaleListPost?SESSION_ID=${sessionKey}`,
        {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Cookie": lastUsedCookie,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            },
            body: JSON.stringify({
                COM_CODE: process.env.ECOUNT_COMPANY_CODE,
                START_DATE: startDate, // เช่น "20240401"
                END_DATE: endDate,     // เช่น "20240416"
            }),
        }
    );

    const data = await response.json();
    return data.Data?.Datas || [];
}

// -----------------------------------------------
// ข้อมูลสินค้าคงคลัง (Inventory Balance)
// -----------------------------------------------
export async function getInventoryBalance(sessionKey, hostUrl, baseDate, warehouseCode) {
    const baseUrl = await getBaseUrl(hostUrl);
    const url = `${baseUrl}/InventoryBalance/GetListInventoryBalanceStatus?SESSION_ID=${sessionKey}`;
    
    const response = await fetch(url, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Cookie": lastUsedCookie,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        body: JSON.stringify({
            COM_CODE: String(process.env.ECOUNT_COMPANY_CODE || "917158"),
            BASE_DATE: String(baseDate || new Date().toISOString().split('T')[0].replace(/-/g, '')),
            WH_CD: warehouseCode || "",
            IsPaging: false
        }),
    });

    const data = await response.json().catch(() => null);
    if (!data || (data.Status !== "200" && data.Status !== 200)) {
        console.error("Ecount GetListInventoryBalanceStatus failed", data);
        return [];
    }
    return data.Data?.Result || [];
}

// -----------------------------------------------
// สร้างใบจ่ายสินค้า (Goods Issue)
// issueData = { date, warehouseCode, toLocation, remarks, items: [{ productCode, quantity }] }
// -----------------------------------------------
export async function createGoodsIssue(sessionKey, hostUrl, issueData) {
    const baseUrl = await getBaseUrl(hostUrl);
    
    const goodsIssueList = issueData.items.map(item => ({
        BulkDatas: {
            UPLOAD_SER_NO: "1",                     // รวมรายการในเอกสารเดียวกัน
            IO_DATE: issueData.date,                // วันที่ (YYYYMMDD)
            WH_CD: issueData.warehouseCode || process.env.ECOUNT_WH_CD || "ST002", // คลังต้นทาง
            IN_WH_CD: issueData.inWarehouseCode || "", // คลังปลายทาง (สำหรับโอน)
            PROD_CD: item.productCode,              // รหัสสินค้า
            QTY: String(item.quantity || 1),        // จำนวนที่จ่ายออก
            PRICE: item.price ? String(item.price) : "", // ราคา
            REMARKS: issueData.remarks || "",       // หมายเหตุหัวเอกสาร
            REMARKS_WIN: item.remarks || "",        // หมายเหตุรายบรรทัด (Ecount ใช้ REMARKS_WIN)
            CUST: issueData.custCode || "",         // รหัสลูกค้า/ผู้จำหน่าย
            EMP_CD: issueData.empCode || "",        // รหัสพนักงาน (PIC)
            PJT_CD: issueData.pjtCode || "",        // รหัสโปรเจกต์
        }
    }));

    const response = await fetch(
        `${baseUrl}/Inventory/SaveGoodsIssue?SESSION_ID=${sessionKey}`,
        {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Cookie": lastUsedCookie,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            },
            body: JSON.stringify({
                GoodsIssueList: goodsIssueList
            }),
        }
    );

    const data = await response.json();

    if (data.Status !== "200") {
        throw new Error(JSON.stringify(data));
    }

    const dataObj = Array.isArray(data.Data) ? data.Data[0] : data.Data;
    if (dataObj && dataObj.FailCnt > 0) {
        let errMsg = "Unknown Ecount ERP Error (Goods Issue)";
        if (dataObj.ResultDetails && dataObj.ResultDetails.length > 0) {
            errMsg = dataObj.ResultDetails[0].TotalError || JSON.stringify(dataObj.ResultDetails);
        }
        throw new Error(`Ecount Error: ${errMsg}`);
    }

    return data.Data;
}

// -----------------------------------------------
// สร้างใบรับสินค้า (Goods Receipt I)
// receiptData = { date, inWarehouseCode, custCode, empCode, pjtCode, remarks, items: [{ productCode, quantity, price, remarks }] }
// -----------------------------------------------
export async function createGoodsReceipt(sessionKey, hostUrl, receiptData) {
    const baseUrl = await getBaseUrl(hostUrl);
    
    const goodsReceiptList = receiptData.items.map(item => ({
        BulkDatas: {
            UPLOAD_SER_NO: "1",                     // รวมรายการในเอกสารเดียวกัน
            IO_DATE: receiptData.date,              // วันที่ (YYYYMMDD)
            WH_CD: receiptData.inWarehouseCode || process.env.ECOUNT_WH_CD || "ST002", // คลังที่รับเข้า
            PROD_CD: item.productCode,              // รหัสสินค้า
            QTY: String(item.quantity || 1),        // จำนวนที่รับเข้า
            PRICE: item.price ? String(item.price) : "", // ราคา
            REMARKS: receiptData.remarks || "",     // หมายเหตุหัวเอกสาร
            REMARKS_WIN: item.remarks || "",        // หมายเหตุรายบรรทัด
            CUST: receiptData.custCode || "",       // รหัสผู้จำหน่าย
            EMP_CD: receiptData.empCode || "",      // รหัสพนักงาน
            PJT_CD: receiptData.pjtCode || "",      // รหัสโปรเจกต์
        }
    }));

    const response = await fetch(
        `${baseUrl}/Inventory/SaveGoodsReceipt?SESSION_ID=${sessionKey}`,
        {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Cookie": lastUsedCookie,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            },
            body: JSON.stringify({
                GoodsReceiptList: goodsReceiptList
            }),
        }
    );

    const data = await response.json();

    if (data.Status !== "200") {
        throw new Error(JSON.stringify(data));
    }

    const dataObj = Array.isArray(data.Data) ? data.Data[0] : data.Data;
    if (dataObj && dataObj.FailCnt > 0) {
        let errMsg = "Unknown Ecount ERP Error (Goods Receipt)";
        if (dataObj.ResultDetails && dataObj.ResultDetails.length > 0) {
            errMsg = dataObj.ResultDetails[0].TotalError || JSON.stringify(dataObj.ResultDetails);
        }
        throw new Error(`Ecount Error: ${errMsg}`);
    }

    return data.Data;
}

// -----------------------------------------------
// สร้างใบกำกับสินค้า II (ลงบัญชีอัตโนมัติ)
// invoiceData = { date, customerCode, totalAmt, vatAmt, remarks }
// -----------------------------------------------
export async function createInvoiceAuto(sessionKey, hostUrl, invoiceData) {
    const baseUrl = await getBaseUrl(hostUrl);
    
    const invoiceAutoList = [
        {
            BulkDatas: {
                TRX_DATE: invoiceData.date,           // วันที่ (YYYYMMDD)
                TAX_GUBUN: "11",                      // 11 = การขาย (Sales VAT)
                CUST: invoiceData.customerCode,       // รหัสลูกค้า
                SUPPLY_AMT: String(invoiceData.totalAmt || 0), // ยอดเงินก่อน VAT
                VAT_AMT: String(invoiceData.vatAmt || 0),      // ยอด VAT
                CR_CODE: "4019",                      // รหัสบัญชีรายได้จากการขาย (ตัวอย่างมาตรฐาน)
                REMARKS: invoiceData.remarks || ""    // หมายเหตุ
            }
        }
    ];

    const response = await fetch(
        `${baseUrl}/InvoiceAuto/SaveInvoiceAuto?SESSION_ID=${sessionKey}`,
        {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Cookie": lastUsedCookie,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            },
            body: JSON.stringify({
                InvoiceAutoList: invoiceAutoList
            }),
        }
    );

    const data = await response.json();

    if (data.Status !== "200") {
        throw new Error(JSON.stringify(data));
    }

    // Ecount might return Data as an array or object
    const dataObj = Array.isArray(data.Data) ? data.Data[0] : data.Data;
    
    if (dataObj && dataObj.FailCnt > 0) {
        let errMsg = "Unknown Ecount ERP Error";
        if (dataObj.ResultDetails && dataObj.ResultDetails.length > 0) {
            errMsg = dataObj.ResultDetails[0].TotalError || JSON.stringify(dataObj.ResultDetails);
        }
        throw new Error(`Ecount Error: ${errMsg}`);
    }

    return data.Data;
}