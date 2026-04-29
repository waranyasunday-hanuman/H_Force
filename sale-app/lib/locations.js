export const WAREHOUSES = [
    // คลังหลัก / คลังสินค้า
    { code: "ST002", name: "คลังสินค้าสำเร็จรูป", type: "Main" },
    { code: "ST001", name: "คลังวัตถุดิบ", type: "Main" },
    { code: "ST003", name: "คลังแพ็คเกจจิ้ง", type: "Main" },
    { code: "FG001", name: "คลังสินค้า-OEM", type: "Main" },
    { code: "ST006", name: "สถานที่สินค้าตัวอย่าง", type: "Main" },
    { code: "ST007", name: "สถานที่เก็บของเสีย", type: "Main" },
    { code: "ST008", name: "คลังสินค้าหมดอายุ", type: "Main" },
    { code: "00005", name: "จัดส่ง", type: "Main" },
    
    // คลังรถเซลส์ (Van Sales)
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

    // อื่นๆ
    { code: "00001", name: "บริษัท สมุนไพร หนุมาน จำกัด - OEM", type: "Other" },
    { code: "00002", name: "บริษัท สมุนไพร หนุมาน จำกัด - จัดเซ็ต", type: "Other" },
    { code: "00003", name: "บริษัท สมุนไพร หนุมาน จำกัด", type: "Other" },
];

export function getLocationName(code) {
    const loc = WAREHOUSES.find(w => w.code === code);
    return loc ? loc.name : code;
}
