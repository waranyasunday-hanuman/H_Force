import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
    try {
        const dummyCustomers = [
            { cust_code: 'C001', cust_name: 'บริษัท ซีพี ออลล์ จำกัด (มหาชน)', business_no: '0107542000011', boss_name: 'คุณธนินท์', tel: '02-826-7777', email: 'contact@cpall.co.th', jongmok: 'ร้านสะดวกซื้อ' },
            { cust_code: 'C002', cust_name: 'บริษัท บิ๊กซี ซูเปอร์เซ็นเตอร์ จำกัด', business_no: '0107536000633', boss_name: 'คุณอัศวิน', tel: '02-655-0666', email: 'info@bigc.co.th', jongmok: 'ห้างสรรพสินค้า' },
            { cust_code: 'V001', cust_name: 'หจก. พี.เค. แพ็คเกจจิ้ง', business_no: '0103550000111', boss_name: 'สมชาย', tel: '081-111-2222', email: 'pkpack@test.com', jongmok: 'บรรจุภัณฑ์', remarks: 'Supplier หลัก' },
            { cust_code: 'C003', cust_name: 'ร้านเจ๊ต้อย สมุนไพร', business_no: '1100220033004', boss_name: 'เจ๊ต้อย', tel: '089-999-8888', email: '', jongmok: 'ร้านขายส่ง', addr: 'ตลาดไท ปทุมธานี' },
            { cust_code: 'C004', cust_name: 'บริษัท บิวตี้ สกิน จำกัด', business_no: '0105555000000', boss_name: 'คุณวิจิตรา', tel: '02-123-4567', email: 'sales@beautyskin.com', jongmok: 'เครื่องสำอาง', addr: 'กรุงเทพฯ' }
        ];

        const results = [];
        for (const c of dummyCustomers) {
            const { error } = await supabase.from('customers').upsert([c], { onConflict: 'cust_code' });
            if (error) results.push({ code: c.cust_code, error: error.message });
            else results.push({ code: c.cust_code, status: "success" });
        }
        
        res.status(200).json({ seeded: true, results });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
