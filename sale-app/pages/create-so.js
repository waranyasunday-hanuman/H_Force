import { useState, useEffect, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import Layout from "../components/Layout";
import Loading from "../components/Loading";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";
import Swal from "sweetalert2";

// ─── Print SO Form ──────────────────────────────────────────────────────────
function printSO({ order, customer, items, paymentType, dueDate, userEmail, date, discount, deposit }) {
    const subTotal  = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const discAmt   = parseFloat(discount) || 0;
    const depositAmt = parseFloat(deposit) || 0;
    const totalAmount = subTotal - discAmt;
    const netPayable  = totalAmount - depositAmt;
    const fmtCurr = (v) => new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
    const paymentLabel = { cash: "💵 เงินสด", transfer: "📱 โอนเงิน", credit: "💳 เครดิต" }[paymentType] || paymentType;
    const now = new Date();
    const printDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543}`;
    const soDate = date ? `${date.slice(6, 8)}/${date.slice(4, 6)}/${parseInt(date.slice(0, 4)) + 543}` : printDate;

    const win = window.open("", "_blank", "width=800,height=900");
    win.document.write(`
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8"/>
<title>ใบกำกับภาษีอย่างย่อ / ใบเสร็จรับเงิน</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Noto Sans Thai', sans-serif; font-size: 13px; color: #111; background: #fff; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { max-width: 720px; margin: 0 auto; border: 2px solid #6366f1; border-radius: 12px; overflow: hidden; }
  .header { background: linear-gradient(135deg,#6366f1,#8b5cf6); color: #fff; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 22px; font-weight: 700; }
  .header .meta { font-size: 12px; opacity: .85; text-align: right; }
  .section { padding: 16px 24px; border-bottom: 1px solid #e5e7eb; }
  .section:last-child { border-bottom: none; }
  .section-title { font-size: 11px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .field label { font-size: 11px; color: #6b7280; font-weight: 600; display: block; margin-bottom: 2px; }
  .field span { font-size: 13px; font-weight: 600; color: #111; }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: #f5f3ff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #6366f1; padding: 8px 10px; text-align: left; border-bottom: 2px solid #e0e7ff; }
  tbody td { padding: 8px 10px; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
  tbody tr:nth-child(even) td { background: #fafafa; }
  .text-right { text-align: right; }
  .total-row { display: flex; justify-content: flex-end; padding: 12px 24px; }
  .total-box { background: #f5f3ff; border: 1px solid #e0e7ff; border-radius: 10px; padding: 12px 20px; min-width: 240px; }
  .total-box .label { font-size: 12px; color: #6b7280; }
  .total-box .amount { font-size: 20px; font-weight: 700; color: #6366f1; }
  .payment-badge { display: inline-block; background: #ede9fe; color: #6366f1; border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 700; }
  .footer { background: #f9fafb; padding: 14px 24px; display: flex; justify-content: space-between; font-size: 11px; color: #9ca3af; }
  .sign-area { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #d1d5db; display: flex; gap: 40px; }
  .sign-box { flex: 1; text-align: center; }
  .sign-box .line { border-top: 1px solid #374151; margin: 24px 8px 4px; }
  .sign-box .role { font-size: 11px; color: #6b7280; }
  @media print { 
    @page { size: A4; margin: 0; }
    body { padding: 0; margin: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
    .page { max-width: 100%; border: none; border-radius: 0; padding: 20px; box-shadow: none; height: 100vh; display: flex; flex-direction: column; } 
    .no-print { display: none !important; }
    .flex-1 { flex: 1; }
  }
</style>
</head>
<body>
<div class="no-print" style="text-align: right; margin-bottom: 20px; padding: 20px;">
  <button onclick="window.print()" style="padding: 10px 20px; background: #6366f1; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 4px 6px rgba(99,102,241,0.2);">🖨️ พิมพ์เอกสาร</button>
</div>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div>
      <div style="font-size:12px;opacity:.8;margin-bottom:4px;font-weight:bold;">ใบกำกับภาษีอย่างย่อ / ใบเสร็จรับเงิน</div>
      <h1>บริษัท สมุนไพร หนุมาน จำกัด</h1>
    </div>
    <div class="meta">
      <div style="font-size:14px;font-weight:700">วันที่พิมพ์: ${printDate}</div>
      <div>วันที่เอกสาร: ${soDate}</div>
      <div>พนักงานขาย (SALE): ${userEmail}</div>
      <div style="margin-top:4px;font-weight:bold;color:#fbbf24;">เล่มที่: _______ เลขที่: ${order?.soNumber || order?.orderId || '—'}</div>
    </div>
  </div>

  <!-- Customer -->
  <div class="section">
    <div class="section-title">ข้อมูลลูกค้า</div>
    <div class="row2">
      <div class="field"><label>รหัสลูกค้า</label><span>${customer?.code || "—"}</span></div>
      <div class="field"><label>ชื่อลูกค้า</label><span>${customer?.name || "—"}</span></div>
    </div>
  </div>

  <!-- Items -->
  <div class="section">
    <div class="section-title">รายการสินค้า</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>รหัสสินค้า</th>
          <th>ชื่อสินค้า</th>
          <th>หน่วย</th>
          <th class="text-right">จำนวน</th>
          <th class="text-right">ราคา/หน่วย</th>
          <th class="text-right">รวม</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((it, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${it.productCode}</td>
            <td>${it.productName || ""}</td>
            <td>${it.unit || ""}</td>
            <td class="text-right">${it.quantity}</td>
            <td class="text-right">${fmtCurr(it.price)}</td>
            <td class="text-right">${fmtCurr(it.price * it.quantity)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>

  <!-- Total Summary -->
  <div class="total-row">
    <div class="total-box" style="min-width:280px">
      <table style="width:100%;font-size:13px">
        <tr><td style="color:#6b7280;padding:3px 0">ยอดรวมก่อนส่วนลด</td><td class="text-right" style="font-weight:600">${fmtCurr(subTotal)}</td></tr>
        ${discAmt > 0 ? `<tr><td style="color:#ef4444;padding:3px 0">ส่วนลดท้ายบิล</td><td class="text-right" style="color:#ef4444;font-weight:600">- ${fmtCurr(discAmt)}</td></tr>` : ''}
        <tr style="border-top:1px solid #e0e7ff"><td style="font-weight:700;padding:6px 0 3px">ยอดหลังส่วนลด</td><td class="text-right" style="font-weight:700;font-size:16px;color:#6366f1">${fmtCurr(totalAmount)}</td></tr>
        ${depositAmt > 0 ? `<tr><td style="color:#059669;padding:3px 0">มัดจำที่ชำระแล้ว</td><td class="text-right" style="color:#059669;font-weight:600">- ${fmtCurr(depositAmt)}</td></tr>
        <tr style="border-top:2px solid #6366f1"><td style="font-weight:700;padding:6px 0 0">ยอดค้างชำระ</td><td class="text-right" style="font-weight:800;font-size:18px;color:#6366f1">${fmtCurr(netPayable)}</td></tr>` : ''}
      </table>
    </div>
  </div>

  <!-- Payment -->
  <div class="section">
    <div class="section-title">การชำระเงิน</div>
    <div class="row2">
      <div class="field">
        <label>วิธีชำระเงิน</label>
        <div><span class="payment-badge">${paymentLabel}</span></div>
      </div>
      <div class="field">
        <label>หมายเหตุ / ภาษี</label>
        <div><span style="font-size: 12px; color: ${order?.needTaxInvoice || order?.need_tax_invoice ? '#059669' : '#6b7280'};">
          ${order?.needTaxInvoice || order?.need_tax_invoice ? '✅ ต้องการใบกำกับภาษีเต็มรูปแบบ' : '— ไม่ต้องการใบกำกับภาษี —'}
        </span></div>
        ${order?.managerRemarks ? `<div style="margin-top: 6px; font-size: 12px; color: #b45309; background: #fffbeb; padding: 4px 8px; border-radius: 4px; border-left: 2px solid #f59e0b;">💬 อนุมัติ: ${order.managerRemarks}</div>` : ''}
      </div>
      ${dueDate ? `<div class="field"><label>วันกำหนดชำระ / Due Date</label><span>${dueDate}</span></div>` : ""}
    </div>
  </div>

  <div class="flex-1"></div> <!-- Push signatures to bottom -->

  <!-- Signatures -->
  <div class="section" style="border-bottom: none;">
    <div class="sign-area">
      <div class="sign-box">
        <div style="height: 60px; display:flex; align-items:flex-end; justify-content:center;">
          <div style="font-family: 'cursive'; font-size: 16px; color: #4f46e5;">${userEmail.split('@')[0]}</div>
        </div>
        <div class="line"></div>
        <div>ลายมือชื่อผู้ขาย</div>
        <div class="role" style="margin-top:2px;">( ${userEmail} )</div>
      </div>
      <div class="sign-box">
        <div style="height: 60px; display:flex; align-items:flex-end; justify-content:center;">
          ${order?.signatureUrl || order?.customer_signature_url ? `<img src="${order.signatureUrl || order.customer_signature_url}" style="max-height: 60px; max-width: 100%; object-fit: contain;" />` : ''}
        </div>
        <div class="line"></div>
        <div>ลายมือชื่อลูกค้า</div>
        <div class="role" style="margin-top:2px;">( Customer )</div>
      </div>
      <div class="sign-box">
        <div style="height: 60px; display:flex; align-items:flex-end; justify-content:center;">
          <div style="font-family: 'cursive'; font-size: 16px; color: #4f46e5;">${order?.approverName ? 'Approved' : ''}</div>
        </div>
        <div class="line"></div>
        <div>ลายมือชื่อผู้อนุมัติ</div>
        <div class="role" style="margin-top:2px;">( ${order?.approverName || 'Manager'} )</div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>พิมพ์จากระบบ H Force · ${printDate}</span>
    <span>*เอกสารนี้ออกโดยระบบอัตโนมัติ</span>
  </div>
</div>
</body>
</html>`);
    win.document.close();
}

function printPOSReceipt({ order, customer, items, paymentType, userEmail, date, discount, deposit }) {
    const subTotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const discAmt = parseFloat(discount) || 0;
    const totalAmount = subTotal - discAmt;
    
    const fmtCurr = (v) => new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);
    const now = new Date();
    const printDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear() + 543} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const win = window.open("", "_blank", "width=302,height=600");
    win.document.write(`
        <html>
        <head>
            <meta charset="utf-8"/>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;700&display=swap');
                body { font-family: 'Prompt', sans-serif; width: 80mm; margin: 0; padding: 4mm; font-size: 11px; color: black; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .divider { border-top: 1px dashed black; margin: 2mm 0; }
                table { width: 100%; border-collapse: collapse; }
                .header { margin-bottom: 4mm; }
                p { margin: 1mm 0; }
            </style>
        </head>
        <body onload="window.print(); setTimeout(() => window.close(), 500);">
            <div class="header text-center">
                <h2 style="margin:0; font-size: 18px;">H FORCE</h2>
                <div style="font-size:10px">ใบกำกับภาษีอย่างย่อ</div>
                <div style="font-size:10px">(SIMPLIFIED TAX INVOICE)</div>
            </div>
            <div class="divider"></div>
            <p><strong>No:</strong> ${order?.soNumber || order?.orderId || '-'}</p>
            <p><strong>Date:</strong> ${printDate}</p>
            <p><strong>Cust:</strong> ${customer?.name || '-'}</p>
            <div class="divider"></div>
            <table>
                <thead>
                    <tr class="font-bold">
                        <th align="left">รายการ</th>
                        <th align="right">รวม</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(it => `
                        <tr>
                            <td colspan="2" style="padding-top: 2mm">${it.productName}</td>
                        </tr>
                        <tr>
                            <td style="padding-left: 2mm; color: #333;">${it.quantity} x ${fmtCurr(it.price)}</td>
                            <td align="right">${fmtCurr(it.price * it.quantity)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="divider"></div>
            <div class="font-bold" style="display:flex; justify-content:space-between; font-size: 14px;">
                <span>ยอดรวมทั้งสิ้น:</span>
                <span>${fmtCurr(totalAmount)}</span>
            </div>
            <div class="divider"></div>
            <div class="text-center" style="margin-top:5mm">
                <p>*** ขอบคุณที่ใช้บริการ ***</p>
                <p style="font-size:9px; opacity: 0.7;">พนักงาน: ${userEmail}</p>
            </div>
        </body>
        </html>
    `);
    win.document.close();
}

// ─── Searchable Combobox ────────────────────────────────────────────────────
function SearchableSelect({ options, value, onChange, placeholder, getKey, getLabel }) {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    const selected = options.find(o => getKey(o) === value);
    const filtered = options.filter(o =>
        getLabel(o).toLowerCase().includes(search.toLowerCase()) ||
        getKey(o).toLowerCase().includes(search.toLowerCase())
    ).slice(0, 50);

    useEffect(() => {
        const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <div ref={wrapRef} className="relative">
            <div
                className="w-full px-3 py-2 text-sm rounded-xl border border-indigo-100 bg-white/70 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 cursor-pointer flex items-center gap-2 shadow-sm"
                onClick={() => { setOpen(true); setSearch(""); }}
            >
                {selected
                    ? <span className="flex-1 truncate font-medium text-indigo-900">[{getKey(selected)}] {getLabel(selected)}</span>
                    : <span className="flex-1 text-gray-400">{placeholder}</span>
                }
                <svg className="w-4 h-4 text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </div>

            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 glass rounded-2xl shadow-xl border border-white/60 overflow-hidden">
                    <div className="p-2 border-b border-indigo-50">
                        <input
                            autoFocus
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="ค้นหารหัส / ชื่อ..."
                            className="w-full px-3 py-1.5 text-sm rounded-lg border border-indigo-100 bg-white outline-none focus:border-indigo-400"
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                        {filtered.length === 0
                            ? <div className="px-4 py-3 text-sm text-gray-400 text-center">ไม่พบรายการ</div>
                            : filtered.map(o => (
                                <div
                                    key={getKey(o)}
                                    className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${getKey(o) === value ? "bg-indigo-500 text-white font-semibold" : "text-gray-700 hover:bg-indigo-50"}`}
                                    onMouseDown={() => { onChange(getKey(o)); setOpen(false); }}
                                >
                                    <span className="font-mono text-xs opacity-70 mr-2">[{getKey(o)}]</span>
                                    {getLabel(o)}
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}
        </div>
    );
}

function ThaiDatePicker({ value, onChange, label, colorCls = "indigo" }) {
    const d = value ? new Date(value) : new Date();
    const [day, setDay] = useState(d.getDate());
    const [month, setMonth] = useState(d.getMonth() + 1);
    const [year, setYear] = useState(d.getFullYear());

    useEffect(() => {
        const newDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (newDate !== value) onChange(newDate);
    }, [day, month, year]);

    useEffect(() => {
        if (value) {
            const dv = new Date(value);
            if (!isNaN(dv.getTime())) {
                setDay(dv.getDate());
                setMonth(dv.getMonth() + 1);
                setYear(dv.getFullYear());
            }
        }
    }, [value]);

    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    const months = [
        { v: 1, n: "ม.ค." }, { v: 2, n: "ก.พ." }, { v: 3, n: "มี.ค." }, { v: 4, n: "เม.ย." },
        { v: 5, n: "พ.ค." }, { v: 6, n: "มิ.ย." }, { v: 7, n: "ก.ค." }, { v: 8, n: "ส.ค." },
        { v: 9, n: "ก.ย." }, { v: 10, n: "ต.ค." }, { v: 11, n: "พ.ย." }, { v: 12, n: "ธ.ค." }
    ];
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i);

    return (
        <div className="space-y-1.5">
            {label && <label className={`block text-xs font-bold text-${colorCls}-600 mb-1.5`}>{label}</label>}
            <div className="flex gap-2">
                <select value={day} onChange={e => setDay(parseInt(e.target.value))} className="flex-1 px-2 py-2.5 text-sm rounded-xl border border-indigo-100 bg-white/70 outline-none focus:ring-2 focus:ring-indigo-100 font-bold text-center">
                    {days.map(v => <option key={v} value={v}>{String(v).padStart(2, '0')}</option>)}
                </select>
                <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className="flex-[1.5] px-2 py-2.5 text-sm rounded-xl border border-indigo-100 bg-white/70 outline-none focus:ring-2 focus:ring-indigo-100 font-bold text-center">
                    {months.map(m => <option key={m.v} value={m.v}>{m.n}</option>)}
                </select>
                <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="flex-[1.2] px-2 py-2.5 text-sm rounded-xl border border-indigo-100 bg-white/70 outline-none focus:ring-2 focus:ring-indigo-100 font-bold text-center">
                    {years.map(v => <option key={v} value={v}>{v + 543}</option>)}
                </select>
            </div>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function CreateSO() {
    const router = useRouter();
    const { visitId, custCode: urlCustCode, newCustName: urlNewCustName, embed, orderId } = router.query;
    const isEmbedded = embed === 'true';

    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [savedOrderData, setSavedOrderData] = useState(null);

    const [visitRef, setVisitRef] = useState("");
    const [newCustomerName, setNewCustomerName] = useState("");
    const [activeOrderId, setActiveOrderId] = useState(orderId || null);
    const [activeSoNumber, setActiveSoNumber] = useState("");

    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [items, setItems] = useState([{ productCode: "", quantity: "", price: "", unit: "", productName: "" }]);

    const [paymentType, setPaymentType] = useState("cash");
    const [paymentSlip, setPaymentSlip] = useState(null);
    const [dueDate, setDueDate] = useState("");
    const [creditDays, setCreditDays] = useState(0);

    // ส่วนลดท้ายบิล & มัดจำ
    const [discount, setDiscount] = useState(0);
    const [deposit, setDeposit]   = useState(0);

    const [needTaxInvoice, setNeedTaxInvoice] = useState(false);
    const [taxDocument, setTaxDocument] = useState(null);

    // Signature
    const sigCanvas = useRef(null);
    const [signatureData, setSignatureData] = useState(null);

    // Manager
    const [managerRemarks, setManagerRemarks] = useState("");

    // Delivery Method
    const [deliveryMethod, setDeliveryMethod] = useState("stock_on_hand"); // stock_on_hand or office_delivery
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [deliveryDate, setDeliveryDate] = useState("");
    const [deliveryRemarks, setDeliveryRemarks] = useState("");
    const [deliveryLocation, setDeliveryLocation] = useState(null);

    const [userEmail, setUserEmail] = useState("Seller");

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) setUserEmail(session.user.email);
        });
    }, []);

    useEffect(() => {
        if (urlCustCode) setSelectedCustomer(urlCustCode);
        if (urlNewCustName) setNewCustomerName(urlNewCustName);
        if (visitId) setVisitRef(visitId);
    }, [urlCustCode, urlNewCustName, visitId]);

    useEffect(() => {
        async function fetchData() {
            setLoadingData(true);
            try {
                const [custRes, prodRes] = await Promise.all([fetch("/api/customers"), fetch("/api/products")]);
                const custData = await custRes.json();
                const prodData = await prodRes.json();
                if (custData.customers) setCustomers(custData.customers);
                if (prodData.products) {
                    // Filter only Finish Goods (PROD_TYPE == "1" or 1)
                    // If no products match "1", fallback to showing all to prevent empty list
                    const fgProducts = prodData.products.filter(p => String(p.PROD_TYPE) === "1" || p.PROD_TYPE === 1);
                    setProducts(fgProducts.length > 0 ? fgProducts : prodData.products);
                }

                if (orderId || visitId) {
                    const fetchUrl = orderId ? `/api/get-so?orderId=${orderId}` : `/api/get-so?planId=${visitId}`;
                    const soRes = await fetch(fetchUrl);
                    const soData = await soRes.json();
                    if (soRes.ok && soData.order) {
                        const o = soData.order;
                        setActiveOrderId(o.id);
                        if (o.so_number) setActiveSoNumber(o.so_number);
                        if (o.order_date) setDate(o.order_date);
                        if (o.customer_code) setSelectedCustomer(o.customer_code);
                        if (o.items) setItems(o.items);
                        if (o.payment_type) setPaymentType(o.payment_type);
                        if (o.due_date) setDueDate(o.due_date);
                        if (o.need_tax_invoice) setNeedTaxInvoice(o.need_tax_invoice);
                        
                        // Extract metadata from items array if it exists
                        if (o.items && o.items.length > 0) {
                            const lastItem = o.items[o.items.length - 1];
                            if (lastItem.isMetadata) {
                                if (lastItem.needTaxInvoice !== undefined) setNeedTaxInvoice(lastItem.needTaxInvoice);
                                if (lastItem.signatureUrl) setSignatureData(lastItem.signatureUrl);
                                if (lastItem.managerRemarks) setManagerRemarks(lastItem.managerRemarks);
                                setItems(o.items.slice(0, -1)); // Set items excluding metadata
                            } else {
                                setItems(o.items);
                            }
                        }
                    }
                }
            } catch (e) { console.error("Failed to load data", e); }
            setLoadingData(false);
        }
        if (router.isReady) {
            fetchData();
        }
    }, [router.isReady, orderId, visitId]);

    // Calculate Due Date automatically when date or creditDays change
    useEffect(() => {
        if (paymentType === 'cash' && date) {
            const d = new Date(date);
            d.setDate(d.getDate() + 3);
            setDueDate(d.toISOString().split('T')[0]);
        } else if (paymentType === 'credit' && date) {
            const d = new Date(date);
            d.setDate(d.getDate() + (parseInt(creditDays) || 0));
            setDueDate(d.toISOString().split('T')[0]);
        }
    }, [date, creditDays, paymentType]);

    const handleAddItem = () => setItems([...items, { productCode: "", quantity: "", price: "", unit: "", productName: "" }]);

    const handleRemoveItem = (i) => { const n = [...items]; n.splice(i, 1); setItems(n); };

    const handleItemChange = (index, field, value) => {
        const n = [...items];
        n[index][field] = value;
        if (field === "productCode" && products.length) {
            const prod = products.find(p => p.PROD_CD === value);
            if (prod) {
                // If price is 0, we still want to show empty if possible, but ERP usually has default prices.
                // We'll set it to the default price from Ecount.
                n[index].price = prod.OUT_PRICE ? parseFloat(prod.OUT_PRICE).toString() : "";
                n[index].unit = prod.UNIT || prod.IN_UNIT || "";
                n[index].productName = prod.PROD_DES || prod.PROD_NAME || prod.PROD_NM || "";
            }
        }
        setItems(n);
    };

    const handleSlipUpload = (e) => { if (e.target.files?.[0]) setPaymentSlip(e.target.files[0]); };
    const handleTaxDocUpload = (e) => { if (e.target.files?.[0]) setTaxDocument(e.target.files[0]); };

    const handleGetDeliveryLocation = () => {
        if (!navigator.geolocation) {
            Swal.fire("ไม่รองรับ", "เบราว์เซอร์ของคุณไม่รองรับการระบุพิกัด", "error");
            return;
        }
        setFormLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setDeliveryLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setFormLoading(false);
                Swal.fire("สำเร็จ", "ปักหมุดสถานที่จัดส่งเรียบร้อยแล้ว", "success");
            },
            (err) => {
                console.error(err);
                setFormLoading(false);
                Swal.fire("ล้มเหลว", "ไม่สามารถเข้าถึงพิกัดได้ กรุณาอนุญาตการเข้าถึง GPS", "error");
            }
        );
    };

    const fmtCurr = (v) => new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(v || 0);
    const fmt2 = (v) => (parseFloat(v) || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const subTotal    = items.reduce((s, it) => s + (parseFloat(it.price) || 0) * (parseInt(it.quantity) || 0), 0);
    const discAmt     = parseFloat(discount) || 0;
    const depositAmt  = parseFloat(deposit)  || 0;
    const totalAmount = subTotal - discAmt;          // ยอดหลังส่วนลด
    const netPayable  = totalAmount - depositAmt;    // ยอดค้างชำระ

    const getCustomerInfo = () => {
        const cust = customers.find(c => (c.CUST_CODE || c.CUST) === selectedCustomer);
        return {
            code: selectedCustomer,
            name: cust ? (cust.CUST_DES || cust.CUST_NAME || selectedCustomer) : newCustomerName,
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ text: "", type: "" });
        setFormLoading(true);

        if (!selectedCustomer && !newCustomerName) {
            setMessage({ text: "กรุณาเลือกลูกค้า", type: "error" });
            setFormLoading(false); return;
        }

        const validItems = items.filter(i => i.productCode && i.quantity > 0);
        if (validItems.length === 0) {
            setMessage({ text: "กรุณาเลือกสินค้าและระบุจำนวน", type: "error" });
            setFormLoading(false); return;
        }
        if (paymentType === "transfer" && !paymentSlip) {
            setMessage({ text: "กรุณาแนบสลิปการโอนเงิน", type: "error" });
            setFormLoading(false); return;
        }
        if ((paymentType === "cash" || paymentType === "credit") && !dueDate) {
            setMessage({ text: "กรุณาระบุวันกำหนดชำระ (Due Date)", type: "error" });
            setFormLoading(false); return;
        }
        if (needTaxInvoice && !taxDocument) {
            setMessage({ text: "กรุณาแนบเอกสารสำหรับออกใบกำกับภาษี (ภ.พ.20 หรือ หนังสือรับรอง)", type: "error" });
            setFormLoading(false); return;
        }
        if (deliveryMethod === 'office_delivery' && !deliveryLocation) {
            setMessage({ text: "กรุณากดปุ่ม 'ปักหมุดสถานที่จัดส่ง' เพื่อระบุพิกัดให้ฝ่ายจัดส่ง", type: "error" });
            setFormLoading(false); return;
        }

        let sigUrl = signatureData;
        if (sigCanvas.current && typeof sigCanvas.current.isEmpty === 'function' && !sigCanvas.current.isEmpty()) {
            sigUrl = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
        }
        
        if (!sigUrl) {
            setMessage({ text: "กรุณาให้ลูกค้าเซ็นชื่อ (Electronic Signature)", type: "error" });
            setFormLoading(false); return;
        }

        const fileToBase64 = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });

        try {
            // Bypass Supabase Storage completely due to bucket configuration issues (401 Unauthorized).
            // We convert all files to Base64 strings and save them directly in the database.
            let slipUrl = null;
            if (paymentType === "transfer" && paymentSlip) {
                slipUrl = await fileToBase64(paymentSlip);
            }

            let taxDocUrl = null;
            if (needTaxInvoice && taxDocument) {
                taxDocUrl = await fileToBase64(taxDocument);
            }

            // We will store the base64 signature string directly in the database to avoid Storage 400 errors.
            // Signatures from react-signature-canvas are usually small enough (a few KB).
            let finalSigUrl = sigUrl;

            // Append metadata to items array because sales_orders table doesn't have these columns yet!
            const itemsWithMeta = [...validItems, {
                isMetadata: true,
                needTaxInvoice,
                signatureUrl: finalSigUrl,
                managerRemarks: managerRemarks || "",
                approverName: activeOrderId ? userEmail : "",
                deliveryMethod,
                deliveryAddress: deliveryMethod === 'office_delivery' ? deliveryAddress : "",
                deliveryDate: deliveryMethod === 'office_delivery' ? deliveryDate : "",
                deliveryRemarks: deliveryMethod === 'office_delivery' ? deliveryRemarks : "",
                deliveryLocation: deliveryMethod === 'office_delivery' ? deliveryLocation : null,
            }];

            const soData = {
                date: date.replace(/-/g, ""),
                customerCode: selectedCustomer,
                newCustomerName,
                visitId: visitRef,
                items: itemsWithMeta,
                paymentType,
                paymentSlipUrl: slipUrl,
                dueDate,
                sales_person: userEmail,
                needTaxInvoice,
                taxDocumentUrl: taxDocUrl,
                signatureUrl: finalSigUrl,
            };

            let res;
            if (activeOrderId) {
                // อนุมัติและบันทึกแก้ไข
                res = await fetch("/api/approve-so", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: activeOrderId, ...soData }),
                });
            } else {
                res = await fetch("/api/create-so", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(soData),
                });
            }
            const result = await res.json();

            if (res.ok && result.success) {
                setMessage({ text: "บันทึกใบกำกับภาษีอย่างย่อสำเร็จ! 🎉", type: "success" });

                // API returns flat: { success, id, receiptNumber }
                const newOrderId = result.id;
                const newSoNumber = result.receiptNumber;

                if (newOrderId) setActiveOrderId(newOrderId);
                if (newSoNumber) setActiveSoNumber(newSoNumber);

                // Build the order object for printSO from local form state + API-returned IDs
                const orderForPrint = {
                    id: newOrderId,
                    soNumber: newSoNumber,
                    so_number: newSoNumber,
                    customer_code: selectedCustomer,
                    order_date: date,
                    payment_type: paymentType,
                    due_date: dueDate,
                    total_amount: validItems.reduce((s,i) => s + (parseFloat(i.price)||0)*(parseInt(i.quantity)||0), 0),
                    sales_person: userEmail,
                    signatureUrl: finalSigUrl,
                    customer_signature_url: finalSigUrl,
                    need_tax_invoice: needTaxInvoice,
                    approval_status: 'pending',
                };

                setSavedOrderData({
                    order: orderForPrint,
                    customer: getCustomerInfo(),
                    items: validItems,
                    paymentType,
                    dueDate,
                    userEmail,
                    date: date.replace(/-/g, ""),
                    discount,
                    deposit,
                });
            } else {
                setMessage({ text: `เกิดข้อผิดพลาด: ${result.error}`, type: "error" });
            }
        } catch (e) {
            setMessage({ text: e.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ", type: "error" });
        }
        setFormLoading(false);
    };

    // ─── UI Helpers ──────────────────────────────────────────────────────────
    const SectionLabel = ({ n, text }) => (
        <h3 className="text-base font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full glass-accent text-white text-xs font-bold flex items-center justify-center">{n}</span>
            {text}
        </h3>
    );

    const inputCls = "w-full px-3 py-2.5 text-sm rounded-xl border border-indigo-100 bg-white/70 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm font-medium placeholder-gray-300";

    const content = (
        <div className={isEmbedded ? "bg-slate-50 min-h-screen p-4" : ""}>
            <div className="max-w-3xl mx-auto">
                {/* Page Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-extrabold text-indigo-900 tracking-tight">{activeOrderId ? `📝 ตรวจสอบและอนุมัติใบสั่งขาย ${activeSoNumber ? `(${activeSoNumber})` : ''}` : "📦 สร้างรายการขาย"}</h1>
                    <p className="text-indigo-400 text-sm mt-0.5">{activeOrderId ? "แก้ไขข้อมูลและกดอนุมัติเพื่อส่งเข้า Ecount" : "บันทึก Sale Order · รอดำเนินการอนุมัติ · พิมพ์ใบ SO อัตโนมัติ"}</p>
                </div>

                {loadingData ? <Loading /> : (
                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Message */}
                        {message.text && !savedOrderData && (
                            <div className={`glass p-4 flex items-start gap-3 ${message.type === "error" ? "border-red-200 bg-red-50/80" : "border-emerald-200 bg-emerald-50/80"}`}>
                                <span className="text-xl">{message.type === "error" ? "⚠️" : "✅"}</span>
                                <p className="font-semibold text-sm">{message.text}</p>
                            </div>
                        )}

                        {savedOrderData ? (
                            <div className="glass p-8 text-center space-y-5">
                                <div className="text-6xl">📄</div>
                                <h2 className="text-2xl font-bold text-emerald-600">ออกใบกำกับภาษีอย่างย่อสำเร็จ!</h2>
                                
                                {/* Receipt Number Badge */}
                                {savedOrderData.order?.soNumber && (
                                    <div className="inline-flex flex-col items-center bg-indigo-50 border-2 border-indigo-200 rounded-2xl px-10 py-5 mx-auto shadow-sm">
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">เลขที่ใบกำกับภาษีอย่างย่อ</span>
                                        <span className="text-4xl font-black text-indigo-700 tracking-wider font-mono">{savedOrderData.order.soNumber}</span>
                                    </div>
                                )}
                                
                                <p className="text-gray-400 text-xs">บันทึกข้อมูลและ Generate เลขที่เอกสารเรียบร้อยแล้ว</p>
                                
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2">
                                    <button type="button" onClick={() => printSO(savedOrderData)}
                                        className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 transform active:scale-95">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                                        พิมพ์ใบกำกับภาษีอย่างย่อ
                                    </button>
                                    <button type="button" onClick={() => printPOSReceipt(savedOrderData)}
                                        className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-2 transform active:scale-95">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                        พิมพ์สลิป (POS 80mm)
                                    </button>
                                    <button type="button" onClick={() => {
                                        setSavedOrderData(null);
                                        setMessage({text:"", type:""});
                                        setItems([{ productCode: "", quantity: "", price: "", unit: "", productName: "" }]);
                                        setSelectedCustomer(""); setNewCustomerName("");
                                        setPaymentSlip(null); setDueDate("");
                                        setDiscount(0); setDeposit(0);
                                        setCreditDays(0);
                                        setNeedTaxInvoice(false); setTaxDocument(null);
                                        setActiveOrderId(null);
                                        setActiveSoNumber("");
                                    }}
                                        className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-all shadow-sm">
                                        สร้างใบกำกับใหม่
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>

                        {/* ── Section 1: Date & Customer ── */}
                        <div className="glass p-5">
                            <SectionLabel n="1" text="ข้อมูลเอกสาร & ลูกค้า" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-indigo-600 mb-1.5">วันที่สั่งซื้อ (Order Date)</label>
                                    <div className="px-4 py-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 text-indigo-900 font-bold text-sm flex items-center gap-2">
                                        <span>📅</span>
                                        {new Date(date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">ระบบกำหนดวันที่ปัจจุบันให้อัตโนมัติ</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-indigo-600 mb-1.5">ลูกค้า</label>
                                    {newCustomerName ? (
                                        <div className="px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-800 font-semibold text-sm">
                                            ✨ ลูกค้าใหม่: {newCustomerName}
                                        </div>
                                    ) : (
                                        <SearchableSelect
                                            options={customers}
                                            value={selectedCustomer}
                                            onChange={setSelectedCustomer}
                                            placeholder="-- ค้นหา/เลือกลูกค้า --"
                                            getKey={c => c.CUST_CODE || c.CUST || ""}
                                            getLabel={c => c.CUST_DES || c.CUST_NAME || ""}
                                        />
                                    )}
                                </div>
                            </div>
                            
                            {/* ใบกำกับภาษี */}
                            <div className="mt-4 pt-4 border-t border-indigo-50">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input type="checkbox" checked={needTaxInvoice} onChange={e => setNeedTaxInvoice(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-indigo-200 cursor-pointer" />
                                    <span className="text-sm font-bold text-indigo-800">ลูกค้าต้องการใบกำกับภาษีเต็มรูปแบบ (VAT 7%)</span>
                                </label>
                                {needTaxInvoice && (
                                    <div className="mt-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
                                        <label className="block text-xs font-bold text-indigo-600 mb-1.5">อัปโหลดเอกสารประกอบ (ภ.พ.20, หนังสือรับรองบริษัท, บัตรปชช.) <span className="text-red-500">*</span></label>
                                        <input type="file" accept="image/*,.pdf" onChange={handleTaxDocUpload} required
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-white file:text-indigo-700 hover:file:bg-indigo-50" />
                                        {taxDocument && <p className="text-xs text-emerald-600 mt-2">✅ แนบไฟล์แล้ว: {taxDocument.name}</p>}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Section 2: Items ── */}
                        <div className="glass p-5">
                            <div className="flex items-center justify-between mb-4">
                                <SectionLabel n="2" text="รายการสินค้า" />
                                <button type="button" onClick={handleAddItem}
                                    className="text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-500 border border-indigo-200 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                                    เพิ่มสินค้า
                                </button>
                            </div>

                            <div className="space-y-3">
                                {items.map((item, index) => {
                                    const rowTotal = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 0);
                                    return (
                                        <div key={index} className="bg-white/60 border border-white/80 rounded-2xl p-4 shadow-sm relative group">
                                            {/* Row 1: สินค้า */}
                                            <div className="mb-3">
                                                <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5">รหัส / ชื่อสินค้า</label>
                                                <SearchableSelect
                                                    options={products}
                                                    value={item.productCode}
                                                    onChange={v => handleItemChange(index, "productCode", v)}
                                                    placeholder="-- ค้นหา/เลือกสินค้า --"
                                                    getKey={p => p.PROD_CD || ""}
                                                    getLabel={p => p.PROD_DES || p.PROD_NAME || p.PROD_NM || p.PROD_CD || ""}
                                                />
                                            </div>

                                            {/* Row 2: qty / unit / price / total */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5">จำนวน</label>
                                                    <input
                                                        type="number" min="1" value={item.quantity}
                                                        onChange={e => handleItemChange(index, "quantity", e.target.value)}
                                                        placeholder="ระบุจำนวน"
                                                        className={inputCls + " text-right"}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5">หน่วยนับ</label>
                                                    <input
                                                        type="text" value={item.unit}
                                                        onChange={e => handleItemChange(index, "unit", e.target.value)}
                                                        placeholder="ชิ้น / แพ็ค"
                                                        className={inputCls}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5">ราคา/หน่วย (฿)</label>
                                                    <input
                                                        type="number" min="0" step="0.01"
                                                        value={item.price}
                                                        onChange={e => handleItemChange(index, "price", e.target.value)}
                                                        placeholder="0.00"
                                                        className={inputCls + " text-right font-mono"}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5">รวม (฿)</label>
                                                    <div className="px-3 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-right text-sm font-bold text-indigo-700 font-mono">
                                                        {rowTotal.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Remove button */}
                                            {items.length > 1 && (
                                                <button type="button" onClick={() => handleRemoveItem(index)}
                                                    className="absolute -top-2.5 -right-2.5 w-7 h-7 bg-red-500 text-white rounded-full text-sm flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Summary: ส่วนลด + มัดจำ + ยอดสุทธิ */}
                            <div className="mt-5 bg-white/70 border border-indigo-100 rounded-2xl p-4 shadow-sm">
                                {/* ส่วนลดท้ายบิล */}
                                <div className="flex items-center justify-between gap-4 mb-3">
                                    <label className="text-xs font-bold text-red-500 uppercase tracking-wider whitespace-nowrap">🏷️ ส่วนลดท้ายบิล (฿)</label>
                                    <input
                                        type="number" min="0" step="0.01"
                                        value={discount}
                                        onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                                        className="w-36 px-3 py-2 text-sm text-right rounded-xl border border-red-100 bg-red-50/60 focus:border-red-300 focus:ring-2 focus:ring-red-100 outline-none font-mono font-semibold text-red-600"
                                        placeholder="0.00"
                                    />
                                </div>
                                {/* มัดจำ */}
                                <div className="flex items-center justify-between gap-4 mb-4">
                                    <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider whitespace-nowrap">💰 มัดจำที่ชำระแล้ว (฿)</label>
                                    <input
                                        type="number" min="0" step="0.01"
                                        value={deposit}
                                        onChange={e => setDeposit(parseFloat(e.target.value) || 0)}
                                        className="w-36 px-3 py-2 text-sm text-right rounded-xl border border-emerald-100 bg-emerald-50/60 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 outline-none font-mono font-semibold text-emerald-600"
                                        placeholder="0.00"
                                    />
                                </div>

                                {/* ยอดสรุป */}
                                <div className="border-t border-indigo-100 pt-3 space-y-1.5">
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>ยอดรวมก่อนส่วนลด</span>
                                        <span className="font-mono">{fmt2(subTotal)}</span>
                                    </div>
                                    {discAmt > 0 && (
                                        <div className="flex justify-between text-sm text-red-500">
                                            <span>ส่วนลดท้ายบิล</span>
                                            <span className="font-mono">- {fmt2(discAmt)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-base font-bold text-indigo-700 pt-1 border-t border-indigo-100">
                                        <span>ยอดหลังส่วนลด</span>
                                        <span className="font-mono">{fmtCurr(totalAmount)}</span>
                                    </div>
                                    {depositAmt > 0 && (
                                        <>
                                            <div className="flex justify-between text-sm text-emerald-600">
                                                <span>หักมัดจำ</span>
                                                <span className="font-mono">- {fmt2(depositAmt)}</span>
                                            </div>
                                            <div className="flex justify-between text-lg font-extrabold text-indigo-900 pt-1 border-t-2 border-indigo-300">
                                                <span>ยอดค้างชำระ</span>
                                                <span className="font-mono text-indigo-600">{fmtCurr(netPayable)}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Section 3: Payment ── */}
                        <div className="glass p-5">
                            <SectionLabel n="3" text="วิธีการชำระเงิน" />
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                {[
                                    { key: "cash",     icon: "💵", label: "เงินสด" },
                                    { key: "transfer", icon: "📱", label: "โอนเงิน" },
                                    { key: "credit",   icon: "💳", label: "เครดิต" },
                                ].map(p => (
                                    <button key={p.key} type="button" onClick={() => setPaymentType(p.key)}
                                        className={`py-3 px-2 rounded-2xl border-2 font-bold text-sm transition-all flex flex-col items-center gap-1 ${
                                            paymentType === p.key
                                                ? "border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-200"
                                                : "border-white/80 bg-white/60 text-gray-500 hover:border-indigo-200"
                                        }`}>
                                        <span className="text-2xl">{p.icon}</span>
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-white/60 rounded-2xl border border-white/80 p-4">
                                {paymentType === "cash" && (
                                    <div className="sm:w-3/4">
                                        <label className="block text-xs font-bold text-indigo-600 mb-1.5">วันที่นำเงินสดฝากธนาคาร (Due Date) *</label>
                                        <div className="px-4 py-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 text-indigo-900 font-bold text-sm flex items-center gap-2">
                                            <span>💰</span>
                                            {dueDate ? new Date(dueDate).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "-"}
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-2">ระบบจะแจ้งเตือนให้นำเงินสดเข้าฝากตามกำหนด (+3 วันอัตโนมัติ)</p>
                                    </div>
                                )}
                                {paymentType === "transfer" && (
                                    <div>
                                        <label className="block text-xs font-bold text-indigo-600 mb-1.5">อัปโหลดสลิปโอนเงิน <span className="text-red-500">*</span></label>
                                        <input type="file" accept="image/*" onChange={handleSlipUpload} required
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                                        {paymentSlip && <p className="text-xs text-emerald-600 mt-2">✅ {paymentSlip.name}</p>}
                                    </div>
                                )}
                                {paymentType === "credit" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-indigo-600 mb-1.5 font-sans">จำนวนวันเครดิต (วัน)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={creditDays}
                                                onChange={e => setCreditDays(parseInt(e.target.value) || 0)}
                                                className={inputCls}
                                                placeholder="เช่น 30"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-bold text-indigo-600 mb-1.5">วันครบกำหนดชำระ (Due Date) *</label>
                                            <div className="px-4 py-2.5 rounded-xl border border-indigo-100 bg-indigo-50/50 text-indigo-900 font-bold text-sm flex items-center gap-2">
                                                <span>💳</span>
                                                {dueDate ? new Date(dueDate).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "-"}
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-2">ระบบคำนวณวันครบกำหนดให้อัตโนมัติตามจำนวนวันเครดิต</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Section 4: Delivery Method ── */}
                        <div className="glass p-5">
                            <SectionLabel n="4" text="วิธีการส่งสินค้า" />
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <button type="button" onClick={() => setDeliveryMethod("stock_on_hand")}
                                    className={`py-3 px-2 rounded-2xl border-2 font-bold text-sm transition-all flex flex-col items-center gap-1 ${
                                        deliveryMethod === "stock_on_hand"
                                            ? "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                                            : "border-white/80 bg-white/60 text-gray-500 hover:border-emerald-200"
                                    }`}>
                                    <span className="text-2xl">📦</span>
                                    ตัด Stock ในมือ
                                </button>
                                <button type="button" onClick={() => setDeliveryMethod("office_delivery")}
                                    className={`py-3 px-2 rounded-2xl border-2 font-bold text-sm transition-all flex flex-col items-center gap-1 ${
                                        deliveryMethod === "office_delivery"
                                            ? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-200"
                                            : "border-white/80 bg-white/60 text-gray-500 hover:border-blue-200"
                                    }`}>
                                    <span className="text-2xl">🏢</span>
                                    สำนักงานส่ง
                                </button>
                            </div>

                            {deliveryMethod === "office_delivery" && (
                                <div className="bg-white/60 rounded-2xl border border-white/80 p-4 space-y-4 animate-fade-in">
                                    <div>
                                        <label className="block text-xs font-bold text-blue-600 mb-1.5">ที่อยู่จัดส่ง <span className="text-red-500">*</span></label>
                                        <textarea 
                                            value={deliveryAddress} 
                                            onChange={e => setDeliveryAddress(e.target.value)}
                                            rows="2"
                                            placeholder="ระบุที่อยู่ที่ต้องการให้ไปส่ง..."
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-blue-600 mb-1.5">ปักหมุดสถานที่จัดส่ง <span className="text-red-500">*</span></label>
                                        <button 
                                            type="button" 
                                            onClick={handleGetDeliveryLocation}
                                            className={`w-full py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${deliveryLocation ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-blue-50 border-blue-200 text-blue-700 font-bold hover:bg-blue-100'}`}
                                        >
                                            {deliveryLocation ? (
                                                <><span>📍</span> พิกัด: {deliveryLocation.lat.toFixed(5)}, {deliveryLocation.lng.toFixed(5)} (แก้ไข)</>
                                            ) : (
                                                <><span>📍</span> กดเพื่อปักหมุดสถานที่ปัจจุบัน</>
                                            )}
                                        </button>
                                        <p className="text-[10px] text-gray-400 mt-1.5 ml-1">พิกัดนี้จะถูกส่งให้พนักงานขับรถเพื่อนำทางในขั้นตอนการส่งสินค้า</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <ThaiDatePicker 
                                                label="วันที่ให้จัดส่ง *" 
                                                value={deliveryDate} 
                                                onChange={setDeliveryDate} 
                                                colorCls="blue"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-blue-600 mb-1.5">หมายเหตุการจัดส่ง</label>
                                            <input type="text" value={deliveryRemarks} onChange={e => setDeliveryRemarks(e.target.value)} placeholder="เช่น ระวังแตก, ส่งก่อนเที่ยง" className={inputCls} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {deliveryMethod === "stock_on_hand" && (
                                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
                                    <span className="text-xl">✅</span>
                                    <p className="text-xs font-bold text-emerald-700">ระบบจะทำการตัดสต็อกสินค้าจากรถ/คลังประจำตัวพนักงานทันทีเมื่อได้รับการอนุมัติ</p>
                                </div>
                            )}
                        </div>

                        {/* ── Section 5: Signature ── */}
                        <div className="glass p-5">
                            <SectionLabel n="5" text="ลายมือชื่อลูกค้า (Electronic Signature)" />
                            <div className="bg-white rounded-2xl border-2 border-dashed border-indigo-200 overflow-hidden relative">
                                {signatureData ? (
                                    <div className="relative">
                                        <img src={signatureData} alt="Signature" className="w-full h-40 object-contain p-4" />
                                        <button type="button" onClick={() => { setSignatureData(null); if(sigCanvas.current) sigCanvas.current.clear(); }}
                                            className="absolute top-2 right-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg font-bold">
                                            เซ็นใหม่
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <SignatureCanvas 
                                            ref={sigCanvas}
                                            penColor="blue"
                                            canvasProps={{ className: "w-full h-40 bg-white/50 cursor-crosshair" }} 
                                        />
                                        <div className="absolute bottom-2 right-2 flex gap-2">
                                            <button type="button" onClick={() => sigCanvas.current.clear()}
                                                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs rounded-lg font-bold shadow-sm transition-colors">
                                                ล้างลายเซ็น
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-2 text-center">รบกวนลูกค้าเซ็นชื่อในกรอบด้านบน เพื่อยืนยันการสั่งซื้อ</p>
                        </div>

                        {/* ── Section 5: Manager Remarks ── */}
                        {activeOrderId && (
                            <div className="glass p-5">
                                <SectionLabel n="5" text="สำหรับผู้อนุมัติ" />
                                <div className="bg-white/60 rounded-2xl border border-white/80 p-4">
                                    <label className="block text-xs font-bold text-indigo-600 mb-1.5">หมายเหตุการอนุมัติ / คำสั่งเพิ่มเติม</label>
                                    <textarea
                                        value={managerRemarks}
                                        onChange={e => setManagerRemarks(e.target.value)}
                                        rows="3"
                                        placeholder="ระบุหมายเหตุ หรือเงื่อนไขเพิ่มเติม (ถ้ามี)"
                                        className="w-full px-4 py-3 text-sm rounded-xl border border-indigo-100 bg-white/70 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-sm resize-none"
                                    ></textarea>
                                </div>
                            </div>
                        )}

                        {/* ── Submit ── */}
                        <div className="flex gap-4">
                            <button type="submit" disabled={formLoading}
                                className="flex-1 py-4 rounded-2xl text-white font-extrabold text-base transition-all shadow-xl flex items-center justify-center gap-3 glass-accent hover:opacity-90 active:scale-[0.98] disabled:opacity-50">
                                {formLoading
                                    ? <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"/><span>กำลังบันทึก...</span></>
                                    : <><span>{activeOrderId ? "✅" : "💾"}</span><span>{activeOrderId ? "บันทึก / อนุมัติ" : "บันทึก SO"}</span></>
                                }
                            </button>
                            {activeOrderId && (
                                <button type="button" onClick={() => printSO({ order: { soNumber: activeSoNumber || activeOrderId, signatureUrl: signatureData, needTaxInvoice, approverName: managerRemarks ? userEmail : "" }, customer: getCustomerInfo(), items: items.filter(i => i.productCode && i.quantity > 0), paymentType, dueDate, userEmail, date: date.replace(/-/g, ""), discount, deposit })}
                                    className="py-4 px-6 rounded-2xl text-indigo-700 font-extrabold text-base transition-all shadow-sm border border-indigo-200 bg-white hover:bg-indigo-50 active:scale-[0.98]">
                                    👁️ Preview ใบกำกับภาษี
                                </button>
                            )}
                        </div>
                            </>
                        )}
                    </form>
                )}
            </div>
        </div>
    );

    return isEmbedded ? content : <Layout>{content}</Layout>;
}
