import { baseUnitLabel, toBaseQty } from "./packaging";

/**
 * Rendered off-screen (display:none) purely so its `innerHTML` can be lifted into the
 * print popup window — see printWindow.js / the handlePrintStockReport flow in
 * ProductsPage.jsx. Shares the same `.iv-*` stylesheet as every other sales printable.
 */
export default function StockReportTemplate({ printRef, products, moves, repName, printedAt }) {
  const stockOf = (productId) => {
    const product = products.find((p) => p.id === productId);
    return moves
      .filter((m) => m.productId === productId)
      .reduce((total, m) => {
        const qty = toBaseQty(product, m.unitLevel, m.quantity);
        return total + (m.type === "load" ? qty : -qty);
      }, 0);
  };

  const rows = [...products]
    .map((p) => ({ product: p, stock: stockOf(p.id), low: p.lowStockThreshold != null && stockOf(p.id) <= p.lowStockThreshold }))
    .sort((a, b) => {
      if (a.low !== b.low) return a.low ? -1 : 1;
      return a.product.name.localeCompare(b.product.name, "ar");
    });
  const lowCount = rows.filter((r) => r.low).length;

  return (
    <div style={{ display: "none" }}>
      <div ref={printRef}>
        <div className="page">
          <div className="iv-head">
            <div>
              <h1 className="iv-title">تقرير المخزون</h1>
              <div className="iv-ref">إجمالي المنتجات: {products.length}</div>
            </div>
            <div className="iv-head-date">
              <div className="iv-printed">
                طُبع في: <span className="iv-num">{printedAt}</span>
              </div>
            </div>
          </div>
          <div className="iv-line" />

          {lowCount > 0 && (
            <div className="iv-notes" style={{ marginBottom: 20 }}>
              <strong>تنبيه: </strong>
              {lowCount} منتج{lowCount > 1 ? "ات" : ""} وصل{lowCount > 1 ? "ت" : ""} إلى حد التنبيه أو أقل — مظللة أدناه.
            </div>
          )}

          {rows.length === 0 ? (
            <div className="iv-empty">لا توجد منتجات مسجّلة</div>
          ) : (
            <table className="iv-table">
              <thead>
                <tr>
                  <th className="iv-col-index">#</th>
                  <th className="iv-col-name">المنتج</th>
                  <th className="iv-col-total">المخزون الحالي</th>
                  <th className="iv-col-total">حد التنبيه</th>
                  <th className="iv-col-status">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, index) => (
                  <tr key={r.product.id} style={r.low ? { background: "#fef2f2" } : undefined}>
                    <td>{index + 1}</td>
                    <td>{r.product.name}</td>
                    <td>
                      <span className="iv-num">{r.stock.toLocaleString()}</span> {baseUnitLabel(r.product)}
                    </td>
                    <td>
                      {r.product.lowStockThreshold != null ? (
                        <>
                          <span className="iv-num">{r.product.lowStockThreshold.toLocaleString()}</span>{" "}
                          {baseUnitLabel(r.product)}
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <span className={`iv-status-badge ${r.low ? "iv-status-badge--low" : "iv-status-badge--ok"}`}>
                        {r.low ? "منخفض" : "طبيعي"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="iv-footer">
            {repName && (
              <div>
                <span>المندوب: </span>
                <strong dir="ltr">{repName}</strong>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
