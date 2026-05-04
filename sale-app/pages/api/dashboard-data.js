import { createClient } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import { getSessionKey, getProducts } from "../../lib/ecount";

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { dateType, startDate, endDate, user } = req.query; 
        
        let startObj = new Date();
        let endObj = new Date();

        if (dateType === 'monthly') {
            startObj.setDate(1); // First day of current month
        } else if (dateType === 'custom') {
            if (startDate) startObj = new Date(startDate);
            if (endDate) endObj = new Date(endDate);
        } // 'daily' keeps both as today

        const formatSupabaseDate = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const startStr = formatSupabaseDate(startObj);
        const endStr = formatSupabaseDate(endObj);

        // --- Fetch Sales Orders ---
        let soQuery = supabase
            .from('sales_orders')
            .select('*')
            .gte('order_date', startStr)
            .lte('order_date', endStr);
            
        if (user && user !== 'all') {
            soQuery = soQuery.eq('sales_person', user);
        }
        
        const { data: salesOrders, error: soError } = await soQuery;
        if (soError) throw soError;


        // --- Fetch Visits ---
        let visitQuery = supabase
            .from('visits')
            .select('*')
            .gte('created_at', startStr + "T00:00:00Z")
            .lte('created_at', endStr + "T23:59:59Z");
            
        if (user && user !== 'all') {
            visitQuery = visitQuery.eq('sales_person', user);
        }

        const { data: visitsData, error: visitError } = await visitQuery;
        if (visitError) throw visitError;


        // --- Process Products (from Ecount — optional, won't crash if unavailable) ---
        const productMap = {};
        try {
            const auth = await getSessionKey();
            const products = await getProducts(auth.sessionKey, auth.hostUrl).catch(() => []);
            products.forEach(p => {
                productMap[p.PROD_CD] = p.PROD_DES || p.PROD_NAME || p.PROD_NM || p.PROD_CD;
            });
        } catch (ecountErr) {
            console.warn("[dashboard-data] Ecount unavailable, skipping product name lookup:", ecountErr.message);
        }

        // --- Aggregations ---
        let totalAmount = 0;
        let soCount = salesOrders?.length || 0;
        const productsAgg = {};
        const salesByPersonMap = {};
        const customersSet = new Set();
        let rawItemsCount = 0;
        
        (salesOrders || []).forEach(order => {
            const amt = parseFloat(order.total_amount || 0);
            const cCode = order.customer_code || "Unknown";
            const person = order.sales_person || "Unknown";

            totalAmount += amt;
            customersSet.add(cCode);

            // Sales by person
            if (!salesByPersonMap[person]) {
                salesByPersonMap[person] = { name: person, amount: 0, count: 0 };
            }
            salesByPersonMap[person].amount += amt;
            salesByPersonMap[person].count += 1;

            // Process Items
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    rawItemsCount++;
                    const pCode = item.productCode || "Unknown";
                    const pName = productMap[pCode] || pCode;
                    const qty = parseInt(item.quantity || 0);
                    const itemAmt = parseFloat(item.price || 0) * qty;

                    if (!productsAgg[pName]) {
                        productsAgg[pName] = { name: pName, qty: 0, amount: 0 };
                    }
                    productsAgg[pName].qty += qty;
                    productsAgg[pName].amount += itemAmt;
                });
            }
        });

        const bestSellingProducts = Object.values(productsAgg)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5); 

        const salesByPerson = Object.values(salesByPersonMap)
            .sort((a, b) => b.amount - a.amount);

        const newCustomersCount = customersSet.size;

        // --- Sales Summary Breakdown ---
        let saleCash = 0;
        let saleCredit = 0;
        let saleTransfer = 0;

        (salesOrders || []).forEach(order => {
            const amt = parseFloat(order.total_amount || 0);
            if (order.payment_type === 'cash') saleCash += amt;
            else if (order.payment_type === 'credit') saleCredit += amt;
            else if (order.payment_type === 'transfer') saleTransfer += amt;
            else saleCash += amt; // default if not specified
        });

        // --- Visit Aggregations ---
        let checkInCount = visitsData?.length || 0;
        let visitNew = 0;
        let visitExisting = 0;
        let purposes = { pitch: 0, inspection: 0, collection: 0, other: 0 };
        let collectedAmount = 0;
        let totalDistance = 0;
        let fraudCount = 0;
        
        (visitsData || []).forEach(v => {
            if (v.customer_type === 'new') visitNew++;
            else visitExisting++;

            const p = v.purpose || 'other';
            if (purposes[p] !== undefined) purposes[p]++;
            else purposes.other++;

            // Sum collections
            if (p === 'collection' && v.visit_result && v.visit_result.total_amount) {
                collectedAmount += parseFloat(v.visit_result.total_amount);
            }

            // Sum distance
            totalDistance += parseFloat(v.distance_km || 0);

            // Fraud count
            if (v.is_out_of_range) fraudCount++;
        });

        const recentVisits = (visitsData || [])
            .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 15);

        // --- Fetch All Staff for Manager Dropdown (Using Admin to get emails) ---
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, display_name, pic_name, role');

        const profileMap = {};
        (profiles || []).forEach(p => { profileMap[p.id] = p; });

        const allStaff = (authData?.users || [])
            .filter(u => profileMap[u.id]?.role === 'sale' || profileMap[u.id]?.role === 'manager')
            .map(u => ({
                id: u.id,
                email: u.email,
                full_name: profileMap[u.id]?.display_name || profileMap[u.id]?.pic_name || u.email.split('@')[0],
                role: profileMap[u.id]?.role
            }));

        // --- Return Data ---
        res.status(200).json({ 
            totalAmount,
            soCount,
            newCustomersCount,
            bestSellingProducts,
            salesByPerson,
            allStaff,
            rawCount: rawItemsCount,
            checkInCount,
            visitNew,
            visitExisting,
            saleCash,
            saleCredit,
            saleTransfer,
            collectedAmount,
            totalDistance,
            fraudCount,
            purposes,
            recentVisits,
            allVisits: visitsData || [],
            filters: { startStr, endStr, user } 
        });
        
    } catch (error) {
        console.error("API Error dashboard:", error);
        res.status(500).json({ 
            error: "Cannot fetch dashboard data", 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
