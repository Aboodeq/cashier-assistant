import { SALES_PRINT_STYLES } from "./printStyles";

/**
 * Rendered off-screen (display:none) purely so its `innerHTML` can be lifted into the
 * print popup window — see printWindow.js / the handlePrintOrder flow in
 * SalesOrdersPage.jsx. Its `.iv-*` classes only get styled there, inside that popup's
 * own injected stylesheet (the shared SALES_PRINT_STYLES, re-exported below).
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

export const INVOICE_PRINT_STYLES = SALES_PRINT_STYLES;
