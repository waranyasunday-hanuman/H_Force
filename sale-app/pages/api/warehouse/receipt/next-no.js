import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { date } = req.query; // format YYYY-MM-DD
        const d = date ? new Date(date) : new Date();
        
        // Format: YYMM
        const yy = d.getFullYear().toString().substring(2);
        const mm = (d.getMonth() + 1).toString().padStart(2, '0');
        const prefix = `WR-${yy}${mm}-`;

        // Query Supabase for the latest document number matching this prefix
        const { data, error } = await supabase
            .from("warehouse_receipt_requests")
            .select("receipt_no")
            .like("receipt_no", `${prefix}%`)
            .order("receipt_no", { ascending: false })
            .limit(1);

        if (error && error.code !== '42P01') {
            // 42P01 is table does not exist. If it's something else, throw.
            console.error("Supabase error fetching next WR no:", error);
        }

        let nextNumber = 1;
        if (data && data.length > 0 && data[0].receipt_no) {
            // receipt_no format: WR-YYMM-0001
            const parts = data[0].receipt_no.split('-');
            if (parts.length === 3) {
                const currentNum = parseInt(parts[2], 10);
                if (!isNaN(currentNum)) {
                    nextNumber = currentNum + 1;
                }
            }
        }

        const documentNo = `${prefix}${nextNumber.toString().padStart(4, '0')}`;

        res.status(200).json({ documentNo });
    } catch (error) {
        console.error("Failed to generate document no:", error);
        // Fallback in case of unexpected failure
        const yy = new Date().getFullYear().toString().substring(2);
        const mm = (new Date().getMonth() + 1).toString().padStart(2, '0');
        const fallbackNo = `WR-${yy}${mm}-0001`;
        res.status(200).json({ documentNo: fallbackNo });
    }
}
