import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const body = req.body;

        // Validate
        if (!body || (!body.customerCode && !body.newCustomerName) || !body.items || body.items.length === 0) {
            return res.status(400).json({ error: "ข้อมูลไม่ครบ" });
        }

        let customerCode = body.customerCode;

        // New customer → auto-generate code & save
        if (!customerCode && body.newCustomerName) {
            customerCode = `C${Math.floor(Math.random() * 900000) + 100000}`;
            await supabase.from('customers').insert([{
                cust_code: customerCode,
                cust_name: body.newCustomerName,
                business_no: "0000000000000"
            }]);
        }

        // Format date
        const dateStr = body.date || "";
        const formattedDate = dateStr.length === 8
            ? `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`
            : (dateStr || new Date().toISOString().split('T')[0]);

        // Calculate total
        const totalAmount = body.items.reduce((sum, item) =>
            sum + ((parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0)), 0);

        // Generate receipt number: YYYY/MM/XXXX
        const d = new Date(formattedDate);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const startDate = `${year}-${month}-01`;
        const nextMonthDate = new Date(year, d.getMonth() + 1, 1).toISOString().split('T')[0];

        const { count } = await supabase
            .from('sales_orders')
            .select('*', { count: 'exact', head: true })
            .gte('order_date', startDate)
            .lt('order_date', nextMonthDate);

        const receiptNumber = `${year}/${month}/${String((count || 0) + 1).padStart(4, '0')}`;

        // --- RESILIENT INSERT LOGIC ---
        // We attempt to insert with all columns. If it fails due to a missing column in the PostgREST cache,
        // we retry without those specific columns.
        
        const fullPayload = {
            order_date: formattedDate,
            customer_code: customerCode,
            sales_person: body.sales_person || "Seller",
            total_amount: totalAmount,
            so_count: 1,
            items: body.items,
            payment_type: body.paymentType,
            payment_slip_url: body.paymentSlipUrl || null,
            due_date: body.dueDate || null,
            approval_status: 'pending',
            so_number: receiptNumber,
            plan_id: body.visitId || null,
        };

        let { data: inserted, error: dbError } = await supabase.from('sales_orders').insert([fullPayload]).select();

        // If it fails because of a missing column in cache (PGRST204), try a safe fallback
        if (dbError && dbError.code === 'PGRST204') {
            console.warn("Retrying insert due to schema cache issue:", dbError.message);
            
            // Minimal columns guaranteed by init_sales.sql
            const safePayload = {
                order_date: formattedDate,
                customer_code: customerCode,
                sales_person: body.sales_person || "Seller",
                total_amount: totalAmount,
                so_count: 1,
                items: Array.isArray(body.items) 
                    ? [...body.items, { _metadata: { so_number: receiptNumber, plan_id: body.visitId, payment_type: body.paymentType, due_date: body.dueDate } }]
                    : { ...body.items, _metadata: { so_number: receiptNumber, plan_id: body.visitId, payment_type: body.paymentType, due_date: body.dueDate } }
            };
            
            const retry = await supabase.from('sales_orders').insert([safePayload]).select();
            inserted = retry.data;
            dbError = retry.error;
        }

        if (dbError) {
            console.error("DB Error after retries:", dbError);
            return res.status(500).json({ error: dbError.message });
        }

        const savedId = inserted?.[0]?.id;

        return res.status(200).json({
            success: true,
            id: savedId,
            receiptNumber,
        });

    } catch (e) {
        console.error("create-so error:", e);
        return res.status(500).json({ error: e.message });
    }
}
