/**
 * Rendered off-screen (display:none) purely so its `innerHTML` can be lifted into the
 * print popup window — see printWindow.js / the handlePrintStatement flow in
 * ClientsPage.jsx. Shares the same `.iv-*` stylesheet as every other sales printable.
 */
export default function StatementTemplate({
  printRef,
  client,
  orders,
  payments,
  balanceUSD,
  balanceSYP,
  repName,
  printedAt,
}) {
  if (!client) {
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
  const dual = (usd, syp) =>
    [usd > 0 ? money(usd, "USD") : null, syp > 0 ? money(syp, "SYP") : null].filter(Boolean).join(" + ") || "0";

  const sortedOrders = [...orders].sort((a, b) => (a.date < b.date ? 1 : -1));
  const sortedPayments = [...payments].sort((a, b) => (a.date < b.date ? 1 : -1));
  const salesTotal = orders.reduce(
    (acc, o) => {
      acc.usd += o.totalUSD || 0;
      acc.syp += o.totalSYP || 0;
      return acc;
    },
    { usd: 0, syp: 0 },
  );
  const collectedTotal = payments.reduce(
    (acc, p) => {
      if (p.currency === "USD") acc.usd += p.amount;
      else acc.syp += p.amount;
      return acc;
    },
    { usd: 0, syp: 0 },
  );

  return (
    <div style={{ display: "none" }}>
      <div ref={printRef}>
        <div className="page">
          <div className="iv-head">
            <div>
              <h1 className="iv-title">كشف حساب عميل</h1>
              <div className="iv-ref">
                رقم المرجع: <span className="iv-num">{client.id ? client.id.slice(-8).toUpperCase() : "—"}</span>
              </div>
            </div>
            <div className="iv-head-date">
              <div className="iv-printed">
                طُبع في: <span className="iv-num">{printedAt}</span>
              </div>
            </div>
          </div>
          <div className="iv-line" />

          <div className="iv-client-card">
            <div className="iv-client-name">{client.name}</div>
            <div className="iv-client-meta">
              {client.territoryName && (
                <span>
                  <strong>المنطقة:</strong> {client.territoryName}
                </span>
              )}
              {client.phone && (
                <span>
                  <strong>الهاتف:</strong> <span className="iv-num">{client.phone}</span>
                </span>
              )}
              {client.address && (
                <span>
                  <strong>العنوان:</strong> {client.address}
                </span>
              )}
            </div>
          </div>

          <div className="iv-section-title">عمليات البيع</div>
          {sortedOrders.length === 0 ? (
            <div className="iv-empty">لا توجد عمليات بيع مسجّلة لهذا العميل</div>
          ) : (
            <table className="iv-table">
              <thead>
                <tr>
                  <th className="iv-col-index">#</th>
                  <th className="iv-col-date">التاريخ</th>
                  <th className="iv-col-type">طريقة الدفع</th>
                  <th className="iv-col-total">المجموع</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((o, index) => (
                  <tr key={o.id}>
                    <td>{index + 1}</td>
                    <td>
                      <span className="iv-num">{o.date}</span>
                    </td>
                    <td>
                      <span className={`iv-pay-tag ${o.paymentType === "credit" ? "iv-pay-tag--credit" : "iv-pay-tag--cash"}`}>
                        {o.paymentType === "credit" ? "بالدَّين" : "نقداً"}
                      </span>
                    </td>
                    <td>
                      <span className="iv-num">{dual(o.totalUSD, o.totalSYP)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="iv-section-title">الدفعات المستلمة</div>
          {sortedPayments.length === 0 ? (
            <div className="iv-empty">لا توجد دفعات مسجّلة لهذا العميل</div>
          ) : (
            <table className="iv-table">
              <thead>
                <tr>
                  <th className="iv-col-index">#</th>
                  <th className="iv-col-date">التاريخ</th>
                  <th className="iv-col-amount">المبلغ</th>
                  <th className="iv-col-notes">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {sortedPayments.map((p, index) => (
                  <tr key={p.id}>
                    <td>{index + 1}</td>
                    <td>
                      <span className="iv-num">{p.date}</span>
                    </td>
                    <td>
                      <span className="iv-num">{money(p.amount, p.currency)}</span>
                    </td>
                    <td>{p.notes || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="iv-summary">
            <div className="iv-summary-row">
              <span>إجمالي المبيعات</span>
              <span className="iv-num">{dual(salesTotal.usd, salesTotal.syp)}</span>
            </div>
            <div className="iv-summary-row">
              <span>إجمالي المحصّل</span>
              <span className="iv-num">{dual(collectedTotal.usd, collectedTotal.syp)}</span>
            </div>
            <div className="iv-summary-row iv-summary-row--total">
              <span>الرصيد المستحق</span>
              <span className="iv-num">{dual(balanceUSD, balanceSYP)}</span>
            </div>
          </div>

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
