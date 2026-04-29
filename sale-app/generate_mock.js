const fs = require('fs');

const months = ['01', '02', '03', '04'];
const days = Array.from({length: 28}, (_, i) => String(i + 1).padStart(2, '0'));
const purposes = ['pitch', 'pitch', 'inspection', 'collection']; // Bias towards pitch
const types = ['new', 'existing', 'existing'];
const payments = ['cash', 'transfer', 'credit'];
const salesPersons = ['sale1@company.com', 'sale2@company.com', 'manager@company.com', 'sale3@company.com'];

const customers = [
  { c: 'C001', n: 'ร้านเจ๊แดง พาณิชย์ มินิมาร์ท', lat: 13.7563, lng: 100.5018 },
  { c: 'C002', n: 'บริษัท รุ่งเรืองจำกัด', lat: 13.7128, lng: 100.5231 },
  { c: 'C003', n: 'ร้านขายยา มิตรภาพ', lat: 13.7299, lng: 100.5694 },
  { c: 'C004', n: 'อาณาจักร วัสดุก่อสร้าง', lat: 13.8345, lng: 100.5021 },
  { c: 'C005', n: 'ร้านสหกรณ์ โรงเรียน', lat: 13.6892, lng: 100.4930 },
  { c: 'C006', n: 'อู่ซ่อมรถ ประดิษฐ์', lat: 13.7845, lng: 100.6120 },
  { c: 'C007', n: 'ร้านของชำ หน้าปากซอย', lat: 13.7210, lng: 100.4789 },
  { c: 'C008', n: 'ร้านสะดวกซื้อ 24 ชม', lat: 13.8402, lng: 100.5891 },
  { c: 'C009', n: 'บริษัท รับเหมาไพบูลย์', lat: 13.7541, lng: 100.6122 },
  { c: 'C010', n: 'บิวตี้ ห้างทองเซ็นเตอร์', lat: 13.7420, lng: 100.5218 }
];

let visitSql = 'INSERT INTO public.visits (customer_type, customer_code, customer_name, latitude, longitude, purpose, sales_person, notes, created_at, visit_result) VALUES\n';
let soSql = 'INSERT INTO public.sales_orders (order_date, customer_code, customer_name, sales_person, total_amount, payment_type) VALUES\n';

let visitValues = [];
let soValues = [];

for (let i = 0; i < 50; i++) {
  const month = months[Math.floor(Math.random() * months.length)];
  const day = days[Math.floor(Math.random() * days.length)];
  const cust = customers[Math.floor(Math.random() * customers.length)];
  const type = types[Math.floor(Math.random() * types.length)];
  const purp = purposes[Math.floor(Math.random() * purposes.length)];
  const sp = salesPersons[Math.floor(Math.random() * salesPersons.length)];
  
  // jitter lat lng a bit for map variety
  const lat = (cust.lat + (Math.random() - 0.5) * 0.05).toFixed(4);
  const lng = (cust.lng + (Math.random() - 0.5) * 0.05).toFixed(4);
  
  const created_at = `2026-${month}-${day} ${String(8 + Math.floor(Math.random() * 8)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}:00+07`;
  
  let visitResult = 'NULL';
  if (purp === 'collection') {
     visitResult = `'{"total_amount": ${1000 + Math.floor(Math.random() * 10000)}}'`;
  }
  
  let code = (type === 'existing') ? `'${cust.c}'` : 'NULL';
  let name = `'${cust.n}'`;
  
  visitValues.push(`('${type}', ${code}, ${name}, ${lat}, ${lng}, '${purp}', '${sp}', 'Mockup visit ${i+1} for ${month}/2026', '${created_at}', ${visitResult})`);
  
  // Generate Sale order for some pitch visits
  if (purp === 'pitch' && Math.random() > 0.3) {
      const soAmt = (2000 + Math.floor(Math.random() * 50000)).toFixed(2);
      const pay = payments[Math.floor(Math.random() * payments.length)];
      const orderDate = `2026-${month}-${day}`;
      soValues.push(`('${orderDate}', ${code}, ${name}, '${sp}', ${soAmt}, '${pay}')`);
  }
}

let finalSql = visitSql + visitValues.join(',\n') + ';\n\n' + soSql + soValues.join(',\n') + ';\n';
fs.writeFileSync('mock_data_50.sql', finalSql);
console.log('Successfully created mock_data_50.sql with ' + visitValues.length + ' visits and ' + soValues.length + ' sales orders.');
