import { formatNumber } from "../domain/money";
import { formatBaseQty, baseUnitLabel, packagingSummary } from "../domain/packaging";
import DocShell, { Num } from "./DocShell";

/** تقرير المخزون — what is currently on the vehicle. */
export default function StockDoc({ rows = [], settings = {}, narrow = false, printedAt }) {
  const lowCount = rows.filter((r) => r.low).length;

  return (
    <DocShell
      settings={settings}
      title="تقرير مخزون السيارة"
      meta={[{ label: "عدد الأصناف", value: formatNumber(rows.length) }]}
      narrow={narrow}
      printedAt={printedAt}
      signatures={false}
    >
      {lowCount > 0 && (
        <div className="doc-note">
          تنبيه: <Num>{formatNumber(lowCount)}</Num> صنف عند حد التنبيه أو أقل.
        </div>
      )}

      {rows.length === 0 ? (
        <div className="doc-empty">لا توجد منتجات</div>
      ) : (
        <table className="doc-table">
          <thead>
            <tr>
              <th style={{ width: "6%" }}>#</th>
              <th className="doc-cell-name">الصنف</th>
              <th style={{ width: "26%" }}>الكمية المتوفرة</th>
              <th style={{ width: "16%" }}>حد التنبيه</th>
              <th style={{ width: "12%" }}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.product.id}>
                <td>
                  <Num>{index + 1}</Num>
                </td>
                <td className="doc-cell-name">
                  {row.product.name}
                  {!narrow && (
                    <div style={{ fontSize: "10.5px", color: "#6b7280" }}>{packagingSummary(row.product)}</div>
                  )}
                </td>
                <td>
                  <Num>{formatBaseQty(row.product, row.qty)}</Num>
                </td>
                <td>
                  {row.product.lowStockThreshold != null ? (
                    <>
                      <Num>{formatNumber(row.product.lowStockThreshold)}</Num> {baseUnitLabel(row.product)}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <span className={`doc-badge ${row.low ? "doc-badge--bad" : "doc-badge--ok"}`}>
                    {row.low ? "منخفض" : "طبيعي"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DocShell>
  );
}
