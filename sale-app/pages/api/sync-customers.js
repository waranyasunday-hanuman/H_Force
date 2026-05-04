import { getSessionKey, getCustomers } from "../../lib/ecount";
import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        console.log("Sync Start: Logging in to Ecount...");
        const auth = await getSessionKey();
        
        console.log("Sync: Fetching customers from Ecount...");
        const ecountCustomers = await getCustomers(auth.sessionKey, auth.hostUrl);

        if (!ecountCustomers || ecountCustomers.length === 0) {
            console.log("Sync: No customers found in Ecount");
            return res.status(404).json({ error: "No customers found in Ecount" });
        }

        console.log(`Sync: Found ${ecountCustomers.length} customers. Mapping data...`);

        // Map Ecount fields to Supabase fields (snake_case)
        const upsertData = ecountCustomers.map(c => {
            // Helper for numbers to avoid NaN
            const parseNum = (val) => {
                const n = parseFloat(val);
                return isNaN(n) ? 0 : n;
            };

            return {
                cust_code: c.CUST_CODE || c.CUST || c.CUST_CD || "",
                cust_name: c.CUST_NAME || c.CUST_DES || c.CUST_NM || "",
                business_no: c.BUSINESS_NO || "",
                boss_name: c.BOSS_NAME || "",
                uptae: c.UPTAE || "",
                jongmok: c.JONGMOK || "",
                tel: c.TEL || "",
                hp_no: c.HP_NO || "",
                email: c.EMAIL || "",
                addr: c.ADDR || "",
                remarks: c.REMARKS || "",
                fax: c.FAX || "",
                cust_group1: c.CUST_GROUP1 || "",
                cust_group2: c.CUST_GROUP2 || "",
                emp_cd: c.EMP_CD || "",
                cust_limit: parseNum(c.CUST_LIMIT),
                price_group: c.PRICE_GROUP || "",
                price_group2: c.PRICE_GROUP2 || "",
                post_no: c.POST_NO || "",
                g_gubun: c.G_GUBUN || "01",
                g_business_type: c.G_BUSINESS_TYPE || "",
                g_business_cd: c.G_BUSINESS_CD || "",
                tax_reg_id: c.TAX_REG_ID || "",
                dm_post: c.DM_POST || "",
                dm_addr: c.DM_ADDR || "",
                remarks_win: c.REMARKS_WIN || "",
                gubun: c.GUBUN || "11",
                foreign_flag: c.FOREIGN_FLAG || "N",
                exchange_code: c.EXCHANGE_CODE || "",
                url_path: c.URL_PATH || "",
                outorder_yn: c.OUTORDER_YN || "N",
                io_code_sl_base_yn: c.IO_CODE_SL_BASE_YN || "Y",
                io_code_sl: c.IO_CODE_SL || "",
                io_code_by_base_yn: c.IO_CODE_BY_BASE_YN || "Y",
                io_code_by: c.IO_CODE_BY || "",
                manage_bond_no: c.MANAGE_BOND_NO || "B",
                manage_debit_no: c.MANAGE_DEBIT_NO || "B",
                o_rate: parseNum(c.O_RATE),
                i_rate: parseNum(c.I_RATE),
                cust_limit_term: parseInt(c.CUST_LIMIT_TERM) || 0,
                cont1: c.CONT1 || "",
                cont2: c.CONT2 || "",
                cont3: c.CONT3 || "",
                cont4: c.CONT4 || "",
                cont5: c.CONT5 || "",
                cont6: c.CONT6 || "",
                no_cust_user1: c.NO_CUST_USER1 ? String(c.NO_CUST_USER1) : "",
                no_cust_user2: c.NO_CUST_USER2 ? String(c.NO_CUST_USER2) : "",
                no_cust_user3: c.NO_CUST_USER3 ? String(c.NO_CUST_USER3) : "",
                category: (c.CUST_CODE || c.CUST || "").startsWith("SP") ? "Supplier" : "Customer",
                updated_at: new Date().toISOString()
            };
        });

        console.log(`Sync: Upserting ${upsertData.length} records to Supabase...`);

        // Batch upsert to Supabase
        const { error: upsertError } = await supabase
            .from('customers')
            .upsert(upsertData, { onConflict: 'cust_code' });

        if (upsertError) {
            console.error("Supabase Upsert Error:", upsertError);
            throw upsertError;
        }

        console.log("Sync: Success!");
        res.status(200).json({ 
            success: true, 
            count: upsertData.length,
            message: `Successfully synced ${upsertData.length} customers from Ecount`
        });

    } catch (error) {
        console.error("Sync API Error:", error);
        res.status(500).json({ 
            error: error.message || "Failed to sync customers",
            details: error
        });
    }
}
