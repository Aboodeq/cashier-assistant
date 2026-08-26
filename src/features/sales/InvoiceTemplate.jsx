/**
 * Rendered off-screen (display:none) purely so its `innerHTML` can be lifted into the
 * print popup window — see printWindow.js / the handlePrintOrder flow in
 * SalesOrdersPage.jsx. Its `.iv-*` classes only get styled there, inside that popup's
 * own injected stylesheet (INVOICE_PRINT_STYLES below).
 */
export default function InvoiceTemplate({ printRef, order, client, repName, printedAt }) {
  if (!order) {
    return (
      <div style={{ display: "none" }}>
        <div ref={printRef} />
      </div>
    );
  }

  const money = (amount, currency) => {
    const n = Number(amount) || 0;
    return currency === "USD" ? `$${n.toLocaleString()}` : `${n.toLocaleString()} ل.س`;
  };
  const items = order.items || [];

  return (
    <div style={{ display: "none" }}>
      <div ref={printRef}>
        <div className="page">
          <div className="iv-head">
            <div>
              <h1 className="iv-title">فاتورة بيع</h1>
              <div className="iv-ref">
                رقم المرجع: <span className="iv-num">{order.id ? order.id.slice(-8).toUpperCase() : "—"}</span>
              </div>
            </div>
            <div className="iv-head-date">
              <div>
                التاريخ: <span className="iv-num">{order.date}</span>
              </div>
              <div className="iv-printed">
                طُبعت في: <span className="iv-num">{printedAt}</span>
              </div>
            </div>
          </div>
          <div className="iv-line" />

          <div className="iv-client-card">
            <div className="iv-client-name">{order.clientName}</div>
            <div className="iv-client-meta">
              {order.territoryName && (
                <span>
                  <strong>المنطقة:</strong> {order.territoryName}
                </span>
              )}
              {client?.phone && (
                <span>
                  <strong>الهاتف:</strong> <span className="iv-num">{client.phone}</span>
                </span>
              )}
              {client?.address && (
                <span>
                  <strong>العنوان:</strong> {client.address}
                </span>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="iv-empty">لا توجد أصناف في هذه الفاتورة</div>
          ) : (
            <table className="iv-table">
              <thead>
                <tr>
                  <th className="iv-col-index">#</th>
                  <th className="iv-col-name">الصنف</th>
                  <th className="iv-col-qty">الكمية</th>
                  <th className="iv-col-price">سعر الوحدة</th>
                  <th className="iv-col-total">المجموع</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{item.productName}</td>
                    <td>
                      <span className="iv-num">{item.quantity}</span> {item.unit}
                    </td>
                    <td>
                      <span className="iv-num">{money(item.price, item.currency)}</span>
                    </td>
                    <td>
                      <span className="iv-num">{money(item.lineTotal, item.currency)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="iv-summary">
            <div className="iv-summary-row">
              <span>طريقة الدفع</span>
              <span className={`iv-pay-tag ${order.paymentType === "credit" ? "iv-pay-tag--credit" : "iv-pay-tag--cash"}`}>
                {order.paymentType === "credit" ? "بالدَّين" : "نقداً"}
              </span>
            </div>
            <div className="iv-summary-row iv-summary-row--total">
              <span>الإجمالي</span>
              <span className="iv-num">
                {[order.totalUSD > 0 ? money(order.totalUSD, "USD") : null, order.totalSYP > 0 ? money(order.totalSYP, "SYP") : null]
                  .filter(Boolean)
                  .join(" + ") || "0"}
              </span>
            </div>
          </div>

          {order.notes && (
            <div className="iv-notes">
              <strong>ملاحظات: </strong>
              {order.notes}
            </div>
          )}

          <div className="iv-footer">
            {repName && (
              <div>
                <span>المندوب: </span>
                <strong dir="ltr">{repName}</strong>
              </div>
            )}
            <div className="iv-thanks">شكراً لتعاملكم معنا</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const INVOICE_PRINT_STYLES = `
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{font-family:'Tajawal',Arial,sans-serif;direction:rtl;background:#fff;color:#1e293b;font-size:14px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .page{width:210mm;min-height:297mm;margin:0 auto;padding:14mm 15mm;background:#fff;}
  .iv-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;}
  .iv-title{font-size:26px;font-weight:900;color:#1e293b;margin-bottom:6px;}
  .iv-ref{font-size:13px;color:#666;}
  .iv-head-date{text-align:left;font-size:13px;color:#444;line-height:1.9;}
  .iv-printed{color:#999;font-size:12px;}
  .iv-num{direction:ltr;unicode-bidi:isolate;display:inline-block;}
  .iv-line{height:2px;background:#4338ca;margin:16px 0 24px;}

  .iv-client-card{background:#f8f9fc;border:1px solid #e9e9f5;border-right:5px solid #4338ca;border-radius:6px;padding:16px 20px;margin-bottom:28px;}
  .iv-client-name{font-size:18px;font-weight:900;color:#1e293b;margin-bottom:8px;}
  .iv-client-meta{display:flex;flex-wrap:wrap;gap:6px 22px;font-size:13px;color:#333;}
  .iv-client-meta strong{font-weight:700;color:#555;}

  .iv-table{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:22px;}
  .iv-table th,.iv-table td{border:1px solid #ddd;text-align:center;vertical-align:middle;}
  .iv-table th{background:#f8f9fa;color:#000;font-size:13px;font-weight:800;padding:10px 8px;}
  .iv-table td{color:#000;font-size:13px;line-height:1.5;padding:9px 8px;}
  .iv-table tr{break-inside:avoid;page-break-inside:avoid;}
  .iv-col-index{width:34px;}
  .iv-col-name{width:38%;}
  .iv-col-qty{width:16%;}
  .iv-col-price{width:20%;}
  .iv-col-total{width:22%;}
  .iv-empty{border:1px solid #ddd;background:#fafafa;color:#666;text-align:center;padding:18px;margin-bottom:22px;}

  .iv-summary{margin-right:auto;width:60%;min-width:260px;}
  .iv-summary-row{display:flex;align-items:center;justify-content:space-between;padding:8px 4px;font-size:14px;color:#333;}
  .iv-summary-row--total{border-top:2px solid #1e293b;margin-top:4px;padding-top:12px;font-size:19px;font-weight:900;color:#1e293b;}
  .iv-pay-tag{font-size:12px;font-weight:800;padding:3px 12px;border-radius:99px;}
  .iv-pay-tag--cash{background:#dcfce7;color:#166534;}
  .iv-pay-tag--credit{background:#fef3c7;color:#92400e;}

  .iv-notes{margin-top:20px;padding:12px 16px;background:#fafafa;border:1px solid #eee;border-radius:6px;font-size:13px;color:#444;white-space:pre-wrap;word-break:break-word;}

  .iv-footer{border-top:1px solid #e5e7eb;margin-top:36px;padding-top:16px;display:flex;align-items:center;justify-content:space-between;color:#666;font-size:12px;}
  .iv-footer strong{font-size:13px;font-weight:900;color:#4338ca;}
  .iv-thanks{font-weight:700;color:#4338ca;}

  @media print{
    @page{size:A4;margin:0;}
    .page{width:210mm;min-height:297mm;padding:14mm 15mm;}
  }
`;
