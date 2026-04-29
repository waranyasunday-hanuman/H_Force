const fs = require('fs');

const content = fs.readFileSync('C:\\Users\\USER\\Desktop\\OAPIManual Create SO.htm', 'utf8');

// Find all <a> tags that look like they are API links
const matches = [...content.matchAll(/<a\s+href="[^"]*"[^>]*title="([^"]+Api)"[^>]*>([\s\S]*?)<\/a>/gi)];

const categories = {};
for (const m of matches) {
    const apiName = m[1];
    let thText = m[2].replace(/<!--[\s\S]*?-->/g, '').trim();
    // remove any inner HTML tags
    thText = thText.replace(/<[^>]+>/g, '').trim();
    
    let category = "Other";
    if (apiName.includes("Account")) category = "Account (บัญชีพื้นฐาน)";
    if (apiName.includes("Voucher") || apiName.includes("Invoice") || apiName.includes("Payment") || apiName.includes("Receipt")) category = "Accounting (บัญชี/การเงิน)";
    if (apiName.includes("Inventory") || apiName.includes("Goods")) category = "Inventory (คลังสินค้า)";
    if (apiName.includes("Sale") || apiName.includes("Quotation")) category = "Sale (ขาย)";
    if (apiName.includes("Purchase")) category = "Purchase (ซื้อ)";
    if (apiName.includes("Product") || apiName.includes("Cust")) category = "Basic (ข้อมูลพื้นฐาน)";

    if (!categories[category]) categories[category] = [];
    categories[category].push({ api: apiName, desc: thText });
}

for (const [cat, endpoints] of Object.entries(categories)) {
    console.log(`\n=== ${cat} ===`);
    endpoints.forEach(e => console.log(`- ${e.desc} (${e.api})`));
}
