import { getSessionKey, createCustomer } from "../../lib/ecount";
import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const custData = req.body;
        
        // Validation
        if (!custData || !custData.custName || !custData.businessNo) {
            return res.status(400).json({ error: "Missing required customer data (Name/Business No)" });
        }

        const sessionKey = await getSessionKey();
        
        // 1. ยิงเข้า Ecount
        const result = await createCustomer(sessionKey, custData);

        // 2. สำเนาลง Supabase (Dual-write) ไว้ให้ค้นหา
        const { error: dbError } = await supabase.from('customers').insert([{
            cust_code: custData.custCode || custData.businessNo || Math.random().toString(36).substr(2, 9),
            category: custData.category,
            business_no: custData.businessNo,
            cust_name: custData.custName,
            boss_name: custData.bossName,
            tel: custData.tel,
            hp_no: custData.hpNo,
            email: custData.email,
            addr: custData.addr,
            uptae: custData.uptae,
            jongmok: custData.jongmok,
            remarks: custData.remarks,
            fax: custData.fax,
            cust_group1: custData.custGroup1,
            cust_group2: custData.custGroup2,
            emp_cd: custData.empCd,
            cust_limit: custData.custLimit || null,
            price_group: custData.priceGroup,
            price_group2: custData.priceGroup2,
            post_no: custData.postNo,
            g_gubun: custData.gGubun,
            g_business_type: custData.gBusinessType,
            g_business_cd: custData.gBusinessCd,
            tax_reg_id: custData.taxRegId,
            dm_post: custData.dmPost,
            dm_addr: custData.dmAddr,
            remarks_win: custData.remarksWin,
            gubun: custData.gubun,
            foreign_flag: custData.foreignFlag,
            exchange_code: custData.exchangeCode,
            url_path: custData.urlPath,
            outorder_yn: custData.outorderYn,
            io_code_sl_base_yn: custData.ioCodeSlBaseYn,
            io_code_sl: custData.ioCodeSl,
            io_code_by_base_yn: custData.ioCodeByBaseYn,
            io_code_by: custData.ioCodeBy,
            manage_bond_no: custData.manageBondNo,
            manage_debit_no: custData.manageDebitNo,
            o_rate: custData.oRate || null,
            i_rate: custData.iRate || null,
            cust_limit_term: custData.custLimitTerm || null,
            cont1: custData.cont1,
            cont2: custData.cont2,
            cont3: custData.cont3,
            cont4: custData.cont4,
            cont5: custData.cont5,
            cont6: custData.cont6,
            no_cust_user1: custData.noCustUser1 || null,
            no_cust_user2: custData.noCustUser2 || null,
            no_cust_user3: custData.noCustUser3 || null
        }]);

        if (dbError) {
            console.error("Supabase Save Warning:", dbError);
            // ไม่ block flow ถ้า Ecount สำเร็จแล้วแต่ Supabase ผิดพลาด (อาจซ้ำ)
        }

        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error("API Error Create Customer:", error);
        return res.status(500).json({ success: false, error: error.message || "Failed to create customer" });
    }
}
