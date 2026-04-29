import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    
    const { planId, orderId } = req.query;
    if (!planId && !orderId) return res.status(400).json({ error: "Missing planId or orderId" });

    try {
        let customerCode = null;
        let soData = null;

        if (orderId) {
            const { data: order, error } = await supabase.from('sales_orders').select('*').eq('id', orderId).single();
            if (error || !order) return res.status(404).json({ error: "ไม่พบใบสั่งขายนี้" });
            soData = order;
            customerCode = order.customer_code;
        } else if (planId) {
            // 1. Try to find an SO directly linked to this planId
            const { data: orderByPlan } = await supabase
                .from('sales_orders')
                .select('*')
                .eq('plan_id', planId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (orderByPlan) {
                soData = orderByPlan;
                customerCode = orderByPlan.customer_code;
            } else {
                // 2. No SO linked — just get customer code from plan for prefilling
                const { data: planData } = await supabase
                    .from('sales_plans')
                    .select('customer_code, customer_name')
                    .eq('id', planId)
                    .single();
                
                customerCode = planData?.customer_code;
                // No SO yet — return null order, let frontend start fresh
                // soData remains null
            }
        }

        // Get customer info if we have a customerCode
        let custInfo = { code: customerCode, name: "" };
        if (customerCode) {
            const { data: custData } = await supabase
                .from('customers')
                .select('*')
                .eq('cust_code', customerCode)
                .single();
            if (custData) {
                custInfo.name = custData.cust_name || custData.cust_des || customerCode;
            }
        }

        // Always return 200 — let frontend decide what to do with null order
        res.status(200).json({
            order: soData,
            customer: custInfo
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
