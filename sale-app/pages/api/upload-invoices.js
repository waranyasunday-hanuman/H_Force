import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { fileData } = req.body; // Base64 or JSON from frontend

        if (!fileData) {
            return res.status(400).json({ error: "No file data provided" });
        }

        // Decode Base64 if needed (assuming frontend sends base64)
        const buffer = Buffer.from(fileData, 'base64');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rawData.length < 2) {
            return res.status(400).json({ error: "File is empty or missing headers" });
        }

        // Find the actual header row (first row that contains "วันที่" or "เลขที่")
        let headerRowIndex = 0;
        for (let i = 0; i < Math.min(rawData.length, 10); i++) {
            const row = rawData[i];
            if (row && row.some(cell => String(cell).includes("วันที่") || String(cell).includes("เลขที่"))) {
                headerRowIndex = i;
                break;
            }
        }

        const headers = rawData[headerRowIndex];
        const rows = rawData.slice(headerRowIndex + 1);

        const findHeader = (patterns) => {
            return headers.findIndex(h => h && patterns.some(p => String(h).includes(p)));
        };

        // Flexible header mapping based on common Ecount export names
        const mapping = {
            date: findHeader(["วันที่", "Date"]),
            no: findHeader(["เลขที่", "No", "ใบขาย"]),
            custCode: findHeader(["รหัสลูกค้า", "Cust Code"]),
            custName: findHeader(["ชื่อลูกค้า", "Cust Name", "ลูกค้า/"]),
            picCode: findHeader(["รหัส PIC", "PIC Code"]),
            picName: findHeader(["ชื่อ PIC", "PIC Name"]),
            total: findHeader(["ยอด", "รวม", "Total", "Amount"])
        };

        // Log mapping for debugging (will show in server console)
        console.log("Header Mapping:", mapping);

        const invoices = rows.map((row, index) => {
            if (!row[mapping.no]) return null;

            let formattedDate = null;
            const rawDate = row[mapping.date];
            if (rawDate) {
                if (rawDate instanceof Date) {
                    formattedDate = rawDate.toISOString().split('T')[0];
                } else if (typeof rawDate === 'string') {
                    const dateParts = rawDate.split('/');
                    if (dateParts.length === 3) {
                        formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                    }
                }
            }

            return {
                invoice_no: String(row[mapping.no]),
                customer_code: String(row[mapping.custCode] || ""),
                customer_name: String(row[mapping.custName] || ""),
                invoice_date: formattedDate,
                total_amount: parseFloat(row[mapping.total] || 0),
                outstanding_amount: parseFloat(row[mapping.total] || 0), // Default to full amount
                status: 'pending',
                pic_code: String(row[mapping.picCode] || ""),
                pic_name: String(row[mapping.picName] || ""),
                last_sync_at: new Date().toISOString()
            };
        }).filter(inv => inv !== null);

        // Admin client to bypass RLS
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Bulk Upsert - onConflict: invoice_no ensures no duplicates
        // Note: We use .upsert() which handles "If Invoice ไหนซ้ำ ไม่ต้องบันทึกเข้าระบบ" 
        // effectively by updating or we could use .insert() with ignore.
        // The user said "ไม่ต้องบันทึก" (don't save), but usually users mean "don't create duplicate".
        // If we want to strictly NOT update existing ones, we can use a select check.
        // But upsert is generally safer for data consistency.
        const { error: upsertError } = await supabaseAdmin
            .from('invoices')
            .upsert(invoices, { onConflict: 'invoice_no', ignoreDuplicates: true });

        if (upsertError) throw upsertError;

        return res.status(200).json({ 
            success: true, 
            message: `Uploaded ${invoices.length} invoices successfully.`,
            count: invoices.length 
        });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: error.message });
    }
}
