import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
    const { data, error } = await supabase.from('sales_orders').select('*').limit(1);
    if (error) return res.status(500).json({ error });
    res.status(200).json({ columns: Object.keys(data[0] || {}), data });
}
