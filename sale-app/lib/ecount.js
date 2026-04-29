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
                headers: { "Content-Type": "application/json" },
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
                console.log(`Login successful via ${prefix === 'oapi' ? 'Production' : 'Sandbox'}`);
                lastUsedEndpoint = prefix; // จำไว้ว่าตัวนี้ใช้ได้
                return data.Data.Datas.SESSION_ID;
            } else {
                console.log(`Login via ${prefix} returned status ${data.Status}, Code: ${data.Data?.Code}, but no Session ID.`);
            }
        } catch (err) {
            console.warn(`Login failed for ${loginUrl}:`, err.message);
        }
    }

    throw new Error("Cannot login to Ecount on any endpoint. Please check your credentials.");
}

// -----------------------------------------------
// ฟังก์ชัน helper: สร้าง base URL สำหรับ API อื่นๆ
// -----------------------------------------------
async function getBaseUrl() {
    const zoneData = await getZone();
    return `https://${lastUsedEndpoint}${zoneData.ZONE}${zoneData.DOMAIN}/OAPI/V2`;
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
            headers: { "Content-Type": "application/json" },
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
        `${baseUrl}/AccountBasic/GetListCust?SESSION_ID=${sessionKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                COM_CODE: process.env.ECOUNT_COMPANY_CODE,
                IsPaging: false,
                Condition: ""
            }),
        }
    );

    const data = await response.json();
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
export async function getProducts(sessionKey) {
    const baseUrl = await getBaseUrl();

    const response = await fetch(
        `${baseUrl}/InventoryBasic/GetBasicProductsList?SESSION_ID=${sessionKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                COM_CODE: process.env.ECOUNT_COMPANY_CODE
            }),
        }
    );

    const data = await response.json();
    console.log("ECOUNT GetBasicProductsList Status:", data.Status);
    // สินค้าจะอยู่ใน data.Data.Result เป็น Array
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
            headers: { "Content-Type": "application/json" },
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
            headers: { "Content-Type": "application/json" },
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
// ดึงข้อมูลสินค้าคงคลัง (Inventory Balance)
// -----------------------------------------------
export async function getInventoryBalance(sessionKey, baseDate, warehouseCode) {
    const baseUrl = await getBaseUrl();
    
    // Ecount V2 GetListInventoryBalanceStatus
    const response = await fetch(
        `${baseUrl}/InventoryBalance/GetListInventoryBalanceStatus?SESSION_ID=${sessionKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                COM_CODE: process.env.ECOUNT_COMPANY_CODE,
                BASE_DATE: baseDate || new Date().toISOString().split('T')[0].replace(/-/g, ''),
                WH_CD: warehouseCode || process.env.ECOUNT_WH_CD || "ST002",
                IsPaging: false
            }),
        }
    );

    const data = await response.json();
    // ปกติ ข้อมูลรายการจะคืนมาเป็น Array อยู่ใน data.Data.Result
    return data.Data?.Result || [];
}

// -----------------------------------------------
// สร้างใบกำกับสินค้า II (ลงบัญชีอัตโนมัติ)
// invoiceData = { date, customerCode, totalAmt, vatAmt, remarks }
// -----------------------------------------------
export async function createInvoiceAuto(sessionKey, invoiceData) {
    const baseUrl = await getBaseUrl();
    
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
            headers: { "Content-Type": "application/json" },
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