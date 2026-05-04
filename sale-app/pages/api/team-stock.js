import { supabase } from "../../lib/supabase";
import { getSessionKey, getInventory } from "../../lib/ecount";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // 1. Fetch all sales staff who have a warehouse_code
        const { data: staff, error: staffError } = await supabase
            .from('profiles')
            .select('email, full_name, warehouse_code')
            .eq('role', 'sale')
            .not('warehouse_code', 'is', null);

        if (staffError) throw staffError;

        if (!staff || staff.length === 0) {
            return res.status(200).json({ teamStock: [] });
        }

        // 2. Get Ecount credentials
        const auth = await getSessionKey();
        
        // 3. Fetch inventory for each warehouse
        // We do this in parallel to be fast, but Ecount might have rate limits, so we'll be careful.
        const teamStock = await Promise.all(staff.map(async (member) => {
            try {
                const invData = await getInventory(auth.sessionKey, auth.hostUrl, member.warehouse_code);
                const items = invData.inventory || [];
                
                const totalQty = items.reduce((sum, item) => sum + parseFloat(item.QTY || 0), 0);
                const totalItems = items.filter(i => parseFloat(i.QTY) > 0).length;

                return {
                    email: member.email,
                    name: member.full_name || member.email.split('@')[0],
                    warehouseCode: member.warehouse_code,
                    totalQty,
                    totalItems,
                    items: items.filter(i => parseFloat(i.QTY) > 0) // Only items with stock
                };
            } catch (err) {
                console.error(`Error fetching stock for ${member.warehouse_code}:`, err);
                return {
                    email: member.email,
                    name: member.full_name || member.email.split('@')[0],
                    warehouseCode: member.warehouse_code,
                    error: "Cannot fetch data"
                };
            }
        }));

        res.status(200).json({ teamStock });

    } catch (error) {
        console.error("API Error team-stock:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
