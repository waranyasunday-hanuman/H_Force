import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { 
            user_id,
            customer_type, 
            customer_code, 
            customer_name, 
            latitude, 
            longitude, 
            photo_url, 
            notes, 
            purpose, 
            sales_person,
            is_out_of_range,
            gps_accuracy,
            plan_id
        } = req.body;

        // Calculate distance from last visit of the day
        let distance_km = 0;
        const today = new Date().toISOString().split('T')[0];
        
        const { data: lastVisit } = await supabase
            .from('visits')
            .select('latitude, longitude')
            .eq('sales_person', sales_person)
            .gte('created_at', today)
            .order('created_at', { ascending: false })
            .limit(1);

        if (lastVisit && lastVisit.length > 0) {
            distance_km = calculateDistance(
                latitude, longitude, 
                lastVisit[0].latitude, lastVisit[0].longitude
            );
        }

        const { data, error } = await supabase
            .from('visits')
            .insert([{
                user_id,
                customer_type,
                customer_code,
                customer_name,
                latitude,
                longitude,
                photo_url,
                notes,
                purpose,
                sales_person,
                distance_km,
                is_out_of_range: !!is_out_of_range,
                gps_accuracy,
                plan_id,
                is_completed: false
            }])
            .select()
            .single();

        if (error) {
            console.error("DB Insert Visit Error:", error);
            throw new Error(error.message || "Cannot save visit to database");
        }

        return res.status(200).json({ success: true, visit: data });

    } catch (error) {
        console.error("API Error Check-in:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
}
