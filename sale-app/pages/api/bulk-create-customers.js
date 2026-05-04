import { supabase } from "../../lib/supabase";
import { ecount } from "../../lib/ecount";

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { customers } = req.body;
    if (!customers || !Array.isArray(customers)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }

    const results = { success: 0, fail: 0, errors: [] };

    for (const cust of customers) {
        try {
            // 1. Try Ecount
            // Note: In a real bulk scenario we might want to batch, but Ecount V2 OAPI is usually one-by-one or small batches.
            // For now, let's focus on Supabase sync for the Import feature.
            
            // 2. Save to Supabase
            const { error: dbError } = await supabase.from('customers').upsert({
                cust_code: cust.custCode || cust.CUST || cust.businessNo,
                category: cust.category || 'Customer',
                business_no: cust.businessNo || cust.BUSINESS_NO,
                cust_name: cust.custName || cust.CUST_NAME || cust.CUST_DES,
                boss_name: cust.bossName || cust.BOSS_NAME,
                tel: cust.tel || cust.TEL,
                hp_no: cust.hpNo || cust.HP_NO,
                email: cust.email || cust.EMAIL,
                addr: cust.addr || cust.ADDR,
                uptae: cust.uptae || cust.UPTAE,
                jongmok: cust.jongmok || cust.JONGMOK,
                remarks: cust.remarks || cust.REMARKS,
                fax: cust.fax || cust.FAX,
                cust_group1: cust.custGroup1 || cust.CUST_GROUP1,
                cust_group2: cust.custGroup2 || cust.CUST_GROUP2,
                emp_cd: cust.empCd || cust.EMP_CD,
                cust_limit: cust.custLimit || cust.CUST_LIMIT || null,
                price_group: cust.priceGroup || cust.PRICE_GROUP,
                price_group2: cust.priceGroup2 || cust.PRICE_GROUP2,
                post_no: cust.postNo || cust.POST_NO,
                g_gubun: cust.gGubun || cust.G_GUBUN,
                g_business_type: cust.gBusinessType || cust.G_BUSINESS_TYPE,
                g_business_cd: cust.gBusinessCd || cust.G_BUSINESS_CD,
                tax_reg_id: cust.taxRegId || cust.TAX_REG_ID,
                dm_post: cust.dmPost || cust.DM_POST,
                dm_addr: cust.dmAddr || cust.DM_ADDR,
                remarks_win: cust.remarksWin || cust.REMARKS_WIN,
                gubun: cust.gubun || cust.GUBUN,
                foreign_flag: cust.foreignFlag || cust.FOREIGN_FLAG,
                exchange_code: cust.exchangeCode || cust.EXCHANGE_CODE,
                url_path: cust.urlPath || cust.URL_PATH,
                outorder_yn: cust.outorderYn || cust.OUTORDER_YN,
                io_code_sl_base_yn: cust.ioCodeSlBaseYn || cust.IO_CODE_SL_BASE_YN,
                io_code_sl: cust.ioCodeSl || cust.IO_CODE_SL,
                io_code_by_base_yn: cust.ioCodeByBaseYn || cust.IO_CODE_BY_BASE_YN,
                io_code_by: cust.ioCodeBy || cust.IO_CODE_BY,
                manage_bond_no: cust.manageBondNo || cust.MANAGE_BOND_NO,
                manage_debit_no: cust.manageDebitNo || cust.MANAGE_DEBIT_NO,
                o_rate: cust.oRate || cust.O_RATE || null,
                i_rate: cust.iRate || cust.I_RATE || null,
                cust_limit_term: cust.custLimitTerm || cust.CUST_LIMIT_TERM || null,
                cont1: cust.cont1 || cust.CONT1,
                cont2: cust.cont2 || cust.CONT2,
                cont3: cust.cont3 || cust.CONT3,
                cont4: cust.cont4 || cust.CONT4,
                cont5: cust.cont5 || cust.CONT5,
                cont6: cust.cont6 || cust.CONT6,
                no_cust_user1: cust.noCustUser1 || cust.NO_CUST_USER1 || null,
                no_cust_user2: cust.noCustUser2 || cust.NO_CUST_USER2 || null,
                no_cust_user3: cust.noCustUser3 || cust.NO_CUST_USER3 || null
            }, { onConflict: 'cust_code' });

            if (dbError) throw dbError;
            results.success++;
        } catch (e) {
            results.fail++;
            results.errors.push({ code: cust.custCode, error: e.message });
        }
    }

    res.status(200).json(results);
}
