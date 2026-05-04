// components/PrintIssueDocument.js
// ISO 9001:2015 – Material Requisition Form – บริษัท สมุนไพร หนุมาน จำกัด

const OP_LABEL = {
    issue:    "ขอเบิก (Goods Issue)",
    transfer: "ขอโอน (Transfer)",
    writeoff: "ขอตัด (Write-off)",
};

export default function PrintIssueDocument({ data }) {
    if (!data) return null;

    const {
        request_no, type, operation_type = "issue", purpose, department,
        requester_name, needed_date, remarks, from_warehouse, to_warehouse,
        created_at, approved_by, approved_at, approval_remarks, ecount_ref_no,
        items = [],
    } = data;

    const typeLabel  = type === "RAW_MATERIAL" ? "Raw Material (RM)" : "Finish Goods (FG)";
    const opLabel    = OP_LABEL[operation_type] || OP_LABEL.issue;
    const docCode    = type === "RAW_MATERIAL" ? "WH-FM-001" : "WH-FM-002";
    const createdStr = created_at
        ? new Date(created_at).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })
        : "—";
    const neededStr  = needed_date
        ? new Date(needed_date).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })
        : "—";
    const totalQty   = items.reduce((s, i) => s + (parseFloat(i.requested_qty || i.quantity || 0)), 0);
    const MIN_ROWS   = 8;
    const BLANK_ROWS = Math.max(0, MIN_ROWS - items.length);

    const B = "#000000";
    const HEADER_BG = "#1C2E4A";
    const ACCENT    = "#1C2E4A";
    const LBL_BG    = "#F0F4FA";
    const ALT_BG    = "#F8FAFF";

    const cell = (extra = {}) => ({
        border: `1px solid ${B}`,
        padding: "5px 8px",
        verticalAlign: "middle",
        overflowWrap: "break-word",
        fontSize: "9pt",
        lineHeight: "1.4",
        ...extra,
    });

    const lbl = (extra = {}) => cell({
        background: LBL_BG,
        fontWeight: 700,
        color: "#374151",
        fontSize: "8pt",
        whiteSpace: "nowrap",
        width: "16%",
        ...extra,
    });

    const val = (extra = {}) => cell({
        fontWeight: 500,
        width: "34%",
        ...extra,
    });

    const TABLE = {
        borderCollapse: "collapse",
        width: "100%",
        tableLayout: "fixed",
        marginBottom: 0,
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400&display=swap');

                .pf-page {
                    font-family: 'Sarabun', 'TH Sarabun New', Arial, sans-serif;
                    font-size: 10pt;
                    color: #111827;
                    background: white;
                    width: 210mm;
                    min-height: 297mm;
                    margin: 0 auto;
                    padding: 12mm 14mm 12mm;
                    box-sizing: border-box;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                }

                @media print {
                    .no-print { display: none !important; }
                    @page { size: A4 portrait; margin: 0; }
                    html, body { margin: 0; padding: 0; background: white; }
                    .pf-page { box-shadow: none !important; width: 100%; padding: 12mm 14mm 12mm; }
                }
                @media screen {
                    .pf-page { box-shadow: 0 8px 48px rgba(0,0,0,0.15); }
                }

                .pf-section-title {
                    font-size: 8pt;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: ${HEADER_BG};
                    padding: 4px 10px;
                    margin: 8px 0 0 0;
                    background: ${LBL_BG};
                    border-left: 4px solid ${HEADER_BG};
                    border-top: 1px solid ${B};
                    border-right: 1px solid ${B};
                    border-bottom: 1px solid ${B};
                }

                .pf-item-row:nth-child(even) td { background: ${ALT_BG}; }

                .wm-approved {
                    position: absolute; top: 50%; left: 50%;
                    transform: translate(-50%, -50%) rotate(-30deg);
                    font-size: 80pt; font-weight: 900;
                    color: rgba(0, 140, 70, 0.055);
                    pointer-events: none; white-space: nowrap; z-index: 0;
                    letter-spacing: 0.1em;
                }
            `}</style>

            <div className="pf-page">

                {/* Watermark */}
                {approved_by && <div className="wm-approved">APPROVED</div>}

                {/* ══════════════════════════════════════════
                    HEADER
                ══════════════════════════════════════════ */}
                <table style={{ ...TABLE, border: `1px solid ${B}` }}>
                    <colgroup>
                        <col style={{ width: "30%" }} />
                        <col style={{ width: "40%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "15%" }} />
                    </colgroup>
                    <tbody>
                        {/* Row 1 – spans */}
                        <tr>
                            {/* Logo + Company — rowspan 4 */}
                            <td rowSpan={4} style={{
                                border: `1px solid ${B}`, textAlign: "center",
                                padding: "10px 8px", verticalAlign: "middle",
                            }}>
                                <img src="/Logo.jpg" alt="Logo"
                                     style={{ width: 62, height: 62, objectFit: "contain", display: "block", margin: "0 auto 6px" }} />
                                <div style={{ fontWeight: 900, fontSize: "11pt", lineHeight: 1.3 }}>
                                    บริษัท สมุนไพร หนุมาน จำกัด
                                </div>
                                <div style={{ fontWeight: 500, fontSize: "8pt", color: "#6B7280", marginTop: 2 }}>
                                    Hanuman Herb Co., Ltd.
                                </div>
                            </td>

                            {/* Document title — rowspan 5 */}
                            <td rowSpan={5} style={{
                                border: `1px solid ${B}`, textAlign: "center",
                                padding: "12px 8px", verticalAlign: "middle",
                            }}>
                                <div style={{ fontSize: "18pt", fontWeight: 900, color: ACCENT, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                                    ใบขอเบิกสินค้า
                                </div>
                                <div style={{ fontSize: "9.5pt", fontWeight: 500, color: "#6B7280", marginTop: 4 }}>
                                    Material / Goods Requisition Form
                                </div>
                                <div style={{
                                    display: "inline-block", marginTop: 8,
                                    background: ACCENT, color: "#fff",
                                    fontSize: "8pt", fontWeight: 700,
                                    padding: "3px 14px", borderRadius: 999,
                                    letterSpacing: "0.04em",
                                }}>
                                    {opLabel} &nbsp;·&nbsp; {typeLabel}
                                </div>
                            </td>

                            {/* Doc control header cells */}
                            <td style={{ border: `1px solid ${B}`, background: HEADER_BG, color: "#fff", fontWeight: 700, fontSize: "8pt", padding: "5px 6px" }}>
                                รหัสเอกสาร / Doc. No.
                            </td>
                            <td style={{ border: `1px solid ${B}`, fontWeight: 700, fontSize: "9pt", padding: "5px 8px" }}>
                                {docCode}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ border: `1px solid ${B}`, background: HEADER_BG, color: "#fff", fontWeight: 700, fontSize: "8pt", padding: "5px 6px" }}>
                                ฉบับที่ / Rev.
                            </td>
                            <td style={{ border: `1px solid ${B}`, fontWeight: 700, fontSize: "9pt", padding: "5px 8px" }}>01</td>
                        </tr>
                        <tr>
                            <td style={{ border: `1px solid ${B}`, background: HEADER_BG, color: "#fff", fontWeight: 700, fontSize: "8pt", padding: "5px 6px" }}>
                                วันที่ใช้งาน / Eff. Date
                            </td>
                            <td style={{ border: `1px solid ${B}`, fontWeight: 700, fontSize: "9pt", padding: "5px 8px" }}>01 ม.ค. 2568</td>
                        </tr>
                    </tbody>
                </table>

                {/* ══════════════════════════════════════════
                    REQUEST INFO
                ══════════════════════════════════════════ */}
                <div className="pf-section-title">ข้อมูลคำขอ / Request Information</div>
                <table style={{ ...TABLE, border: `1px solid ${B}`, borderTop: "none" }}>
                    <colgroup>
                        <col style={{ width: "16%" }} />
                        <col style={{ width: "34%" }} />
                        <col style={{ width: "16%" }} />
                        <col style={{ width: "34%" }} />
                    </colgroup>
                    <tbody>
                        <tr>
                            <td style={lbl()}>เลขที่คำขอ</td>
                            <td style={val({ fontWeight: 900, color: "#B91C1C", fontSize: "10.5pt" })}>{request_no}</td>
                            <td style={lbl()}>หน้า / Page</td>
                            <td style={val()}>1 / 1</td>
                        </tr>
                        <tr>
                            <td style={lbl()}>ผู้ขอเบิก</td>
                            <td style={val({ fontWeight: 700 })}>{requester_name || "—"}</td>
                            <td style={lbl()}>แผนก / ฝ่าย</td>
                            <td style={val()}>{department || "—"}</td>
                        </tr>
                        <tr>
                            <td style={lbl()}>วัตถุประสงค์</td>
                            <td style={val()}>{purpose || "—"}</td>
                            <td style={lbl()}>วันที่สร้าง</td>
                            <td style={val()}>{createdStr}</td>
                        </tr>
                        <tr>
                            <td style={lbl()}>คลังต้นทาง</td>
                            <td style={val()}>{from_warehouse || "—"}</td>
                            <td style={lbl()}>วันที่ต้องใช้</td>
                            <td style={val()}>{neededStr}</td>
                        </tr>
                        {operation_type === "transfer" && (
                            <tr>
                                <td style={lbl()}>คลังปลายทาง</td>
                                <td style={val()} colSpan={3}>{to_warehouse || "—"}</td>
                            </tr>
                        )}
                        {remarks && (
                            <tr>
                                <td style={lbl()}>หมายเหตุ</td>
                                <td style={val()} colSpan={3}>{remarks}</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* ══════════════════════════════════════════
                    ITEMS TABLE
                ══════════════════════════════════════════ */}
                <div className="pf-section-title">รายการสินค้า / Item Details</div>
                <table style={{ ...TABLE, border: `1px solid ${B}`, borderTop: "none" }}>
                    <colgroup>
                        <col style={{ width: "5%" }} />
                        <col style={{ width: "15%" }} />
                        <col style={{ width: "30%" }} />
                        <col style={{ width: "6%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "9%" }} />
                        <col style={{ width: "16%" }} />
                    </colgroup>
                    <thead>
                        <tr>
                            {[
                                ["ลำดับ", "center"],
                                ["รหัสสินค้า", "left"],
                                ["ชื่อสินค้า / รายละเอียด", "left"],
                                ["หน่วย", "center"],
                                ["จำนวนขอ", "center"],
                                ["จำนวนอนุมัติ", "center"],
                                ["จ่ายจริง", "center"],
                                ["หมายเหตุ", "left"],
                            ].map(([h, align]) => (
                                <th key={h} style={{
                                    border: `1px solid ${B}`,
                                    background: HEADER_BG, color: "#fff",
                                    fontWeight: 700, fontSize: "8pt",
                                    padding: "6px 4px", textAlign: align,
                                    lineHeight: 1.3,
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={item.id || idx} className="pf-item-row">
                                <td style={cell({ textAlign: "center", color: "#6B7280" })}>{idx + 1}</td>
                                <td style={cell({ fontWeight: 700, fontSize: "8.5pt", color: "#374151" })}>{item.product_code}</td>
                                <td style={cell()}>{item.product_name || item.productName || item.product_code}</td>
                                <td style={cell({ textAlign: "center" })}>{item.unit || item.UNIT_CD || "—"}</td>
                                <td style={cell({ textAlign: "center", fontWeight: 800 })}>{item.requested_qty ?? item.quantity}</td>
                                <td style={cell({ textAlign: "center", fontWeight: 700, color: "#059669" })}>{item.approved_qty ?? ""}</td>
                                <td style={cell({ textAlign: "center", fontWeight: 700, color: "#2563EB" })}>{item.issued_qty ?? ""}</td>
                                <td style={cell({ fontSize: "8.5pt", color: "#4B5563" })}>{item.item_remarks || item.remarks || ""}</td>
                            </tr>
                        ))}

                        {/* Blank rows */}
                        {Array.from({ length: BLANK_ROWS }).map((_, i) => (
                            <tr key={`blank-${i}`}>
                                <td style={cell({ textAlign: "center", color: "#D1D5DB", fontSize: "8pt", height: "7.5mm" })}>
                                    {items.length + i + 1}
                                </td>
                                {[...Array(7)].map((_, j) => <td key={j} style={cell({ height: "7.5mm" })} />)}
                            </tr>
                        ))}

                        {/* Total */}
                        <tr>
                            <td colSpan={4} style={cell({ textAlign: "right", fontWeight: 800, background: LBL_BG, fontSize: "9pt" })}>
                                รวมทั้งสิ้น (Total)
                            </td>
                            <td style={cell({ textAlign: "center", fontWeight: 900, background: ACCENT, color: "#fff", fontSize: "10pt" })}>
                                {totalQty}
                            </td>
                            <td colSpan={3} style={cell({ background: LBL_BG })} />
                        </tr>
                    </tbody>
                </table>

                {/* ══════════════════════════════════════════
                    APPROVAL (conditional)
                ══════════════════════════════════════════ */}
                {approved_by && (
                    <>
                        <div className="pf-section-title">ข้อมูลการอนุมัติ / Approval Record</div>
                        <table style={{ ...TABLE, border: `1px solid ${B}`, borderTop: "none" }}>
                            <colgroup>
                                <col style={{ width: "16%" }} />
                                <col style={{ width: "34%" }} />
                                <col style={{ width: "16%" }} />
                                <col style={{ width: "34%" }} />
                            </colgroup>
                            <tbody>
                                <tr>
                                    <td style={lbl()}>อนุมัติโดย</td>
                                    <td style={val({ fontWeight: 700 })}>{approved_by}</td>
                                    <td style={lbl()}>วันที่อนุมัติ</td>
                                    <td style={val()}>{approved_at ? new Date(approved_at).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }) : "—"}</td>
                                </tr>
                                {ecount_ref_no && (
                                    <tr>
                                        <td style={lbl()}>Ecount Ref. No.</td>
                                        <td style={val({ color: "#2563EB", fontWeight: 800 })} colSpan={3}>{ecount_ref_no}</td>
                                    </tr>
                                )}
                                {approval_remarks && (
                                    <tr>
                                        <td style={lbl()}>หมายเหตุ</td>
                                        <td style={val()} colSpan={3}>{approval_remarks}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </>
                )}

                {/* ══════════════════════════════════════════
                    SIGNATURES – pushed to bottom
                ══════════════════════════════════════════ */}
                <div style={{ marginTop: "auto" }}>
                    <div className="pf-section-title">ลายมือชื่อผู้เกี่ยวข้อง / Authorized Signatures</div>
                    <table style={{ ...TABLE, border: `1px solid ${B}`, borderTop: "none" }}>
                        <colgroup>
                            <col style={{ width: "25%" }} />
                            <col style={{ width: "25%" }} />
                            <col style={{ width: "25%" }} />
                            <col style={{ width: "25%" }} />
                        </colgroup>
                        <tbody>
                            <tr>
                                {[
                                    { th: "ผู้ขอเบิก",            en: "Requester" },
                                    { th: "หัวหน้าแผนก",           en: "Supervisor" },
                                    { th: "ผู้อนุมัติ (ฝ่ายคลัง)", en: "Warehouse Approver" },
                                    { th: "ผู้จ่ายสินค้า",          en: "Issued By" },
                                ].map((s, i) => (
                                    <td key={s.th} style={{
                                        border: `1px solid ${B}`,
                                        textAlign: "center",
                                        padding: "6px 10px 10px",
                                        height: "28mm",
                                        verticalAlign: "bottom",
                                        borderLeft: i === 0 ? `1px solid ${B}` : `1px solid ${B}`,
                                    }}>
                                        {/* Signature space */}
                                        <div style={{ height: "16mm", borderBottom: `1px solid ${B}`, marginBottom: 5 }} />
                                        <div style={{ fontWeight: 800, fontSize: "9pt", color: ACCENT }}>{s.th}</div>
                                        <div style={{ fontSize: "7.5pt", color: "#9CA3AF" }}>({s.en})</div>
                                        <div style={{ fontSize: "7.5pt", color: "#D1D5DB", marginTop: 4 }}>
                                            วันที่ / Date: _______________
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>

                    {/* ══ ISO Footer ══ */}
                    <div style={{
                        marginTop: 6,
                        display: "flex", justifyContent: "space-between",
                        borderTop: `1px solid #D1D5DB`, paddingTop: 4,
                    }}>
                        <span style={{ fontSize: "7pt", color: "#9CA3AF" }}>
                            ⚠ เอกสารควบคุมภายใต้ระบบ ISO 9001:2015 — ห้ามดัดแปลงหรือทำสำเนาโดยไม่ได้รับอนุญาตจากฝ่ายควบคุมคุณภาพ
                        </span>
                        <span style={{ fontSize: "7pt", color: "#9CA3AF", whiteSpace: "nowrap", marginLeft: 8 }}>
                            {docCode} Rev.01 &nbsp;|&nbsp; พิมพ์: {new Date().toLocaleString("th-TH")}
                        </span>
                    </div>
                </div>

            </div>
        </>
    );
}
