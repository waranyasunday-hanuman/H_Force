export const WAREHOUSES = [
    // --- คลังสินค้าหลัก (Main Warehouse) ---
    { code: "ST002", name: "คลังสินค้าสำเร็จรูป", type: "Main" },
    { code: "ST001", name: "คลังวัตถุดิบ", type: "Main" },
    { code: "ST003", name: "คลังแพ็คเกจจิ้ง", type: "Main" },
    { code: "FG001", name: "คลังสินค้า-OEM", type: "Main" },
    { code: "ST006", name: "สถานที่สินค้าตัวอย่าง", type: "Main" },
    { code: "100", name: "สถานที่ตัวอย่าง", type: "Main" },
    { code: "ST007", name: "สถานที่เก็บของเสีย", type: "Main" },
    { code: "ST008", name: "คลังสินค้าหมดอายุ", type: "Main" },
    { code: "00005", name: "จัดส่ง", type: "Main" },
    { code: "00006", name: "INNO", type: "Main" },
    { code: "00007", name: "ทดสอบ", type: "Main" },
    { code: "ST004", name: "ทรัพย์สินและค่าใช้จ่าย", type: "Main" },
    { code: "ST005", name: "อุปกรณ์และเครื่องใช้สำนักงาน", type: "Main" },
    
    // --- คลังรถเซลส์ (Van Sales) ---
    { code: "SFG01", name: "SALES - ชัยวัณรินทร์-โบ๊ท", type: "Van" },
    { code: "SFG02", name: "SALES - ทรงพล-พล", type: "Van" },
    { code: "SFG03", name: "SALES - วีรพันธ์-หน่อง", type: "Van" },
    { code: "SFG04", name: "SALES - เอกศักดิ์-เอ๊ก", type: "Van" },
    { code: "SFG05", name: "SALE - วุฒิชัย-กอล์ฟ สป.", type: "Van" },
    { code: "SFG06", name: "SALES - วุฒิชัย-กอล์ฟ อส.", type: "Van" },
    { code: "SFG07", name: "SALES - จักรพงษ์-บิน", type: "Van" },
    { code: "SFG08", name: "SALES - ชัช", type: "Van" },
    { code: "SFG09", name: "SALES - ธนัญพรรธน์-เมย์", type: "Van" },
    { code: "SFG10", name: "SALES - ปภังกร-แบงค์", type: "Van" },

    // --- โรงงาน (Factory) ---
    { code: "00001", name: "บริษัท สมุนไพร หนุมาน จำกัด - OEM", type: "Factory" },
    { code: "00002", name: "บริษัท สมุนไพร หนุมาน จำกัด - จัดเซ็ตสินค้า", type: "Factory" },
    { code: "00003", name: "บริษัท สมุนไพร หนุมาน จำกัด - ผลิต", type: "Factory" },
    { code: "AFac1", name: "1.ห้องอบ-บด-ร่อน", type: "Factory" },
    { code: "AFac3", name: "3.ห้องผสมลูกเต๋า", type: "Factory" },
    { code: "AFac4", name: "4.ห้องบรรจุสมุนไพรลงกระปุก", type: "Factory" },
    { code: "AFac5", name: "5.ห้องติดสติ๊กเกอร์", type: "Factory" },
    { code: "AFac6", name: "โรงตัดผ้า", type: "Factory" },
    { code: "AFac7", name: "โรงทำ OEM", type: "Factory" },
];

export function getLocationName(code) {
    const loc = WAREHOUSES.find(w => w.code === code);
    return loc ? loc.name : code;
}
