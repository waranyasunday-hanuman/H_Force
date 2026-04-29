import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
    const { method } = req;

    try {
        if (method === "GET") {
            const { userId } = req.query;
            const { data, error } = await supabase
                .from('sales_plans')
                .select('*')
                .eq('user_id', userId)
                .order('plan_date', { ascending: true });
            if (error) throw error;
            return res.status(200).json({ plans: data });
        }

        if (method === "POST") {
            const { user_id, customer_name, customer_code, plan_date, purpose, notes } = req.body;
            const { data, error } = await supabase
                .from('sales_plans')
                .insert([{ user_id, customer_name, customer_code, plan_date, purpose, notes }])
                .select()
                .single();
            if (error) throw error;
            return res.status(200).json({ plan: data });
        }

        if (method === "PUT") {
            const { id, ...updates } = req.body;
            const { data, error } = await supabase
                .from('sales_plans')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return res.status(200).json({ plan: data });
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        console.error("Plans API Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
