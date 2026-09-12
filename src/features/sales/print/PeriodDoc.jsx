import { formatDate } from "../domain/dates";
import { formatDual, formatNumber } from "../domain/money";
import DocShell, { Num, SummaryRow } from "./DocShell";

/** تقرير فترة — the summary a rep hands to the company. */
export default function PeriodDoc({ from, to, summary, topClients = [], topProducts = [], settings = {}, narrow = false, printedAt }) {
  return (
    <DocShell
      settings={settings}
      title="تقرير المبيعات"
      meta={[{ label: "الفترة", value: `${formatDate(from)} — ${formatDate(to)}` }]}
      narrow={narrow}
      printedAt={printedAt}
      signatures={false}
    >
      <div className="doc-section-title">ملخص الفترة</div>
      <div className="doc-summary" style={{ width: "100%", marginInlineStart: 0 }}>
        <SummaryRow label={`المبيعات (${formatNumber(summary.salesCount)} فاتورة)`} value={formatDual(summary.sales.usd, summary.sales.syp)} />
        {(summary.returns.usd > 0 || summary.returns.syp > 0) && (
          <SummaryRow label={`المرتجعات (${formatNumber(summary.returnsCount)})`} value={formatDual(summary.returns.usd, summary.returns.syp)} />
        )}
        <SummaryRow label="صافي المبيعات" value={formatDual(summary.net.usd, summary.net.syp)} />
        <SummaryRow label="مبيعات نقدية" value={formatDual(summary.cashSales.usd, summary.cashSales.syp)} />
        <SummaryRow label="مبيعات على الحساب" value={formatDual(summary.credit.usd, summary.credit.syp)} />
        <SummaryRow label={`التحصيلات (${formatNumber(summary.paymentsCount)})`} value={formatDual(summary.collected.usd, summary.collected.syp)} />
        <SummaryRow label="المصاريف" value={formatDual(summary.expenses.usd, summary.expenses.syp)} />
        <SummaryRow label="النقدية المفترضة" value={formatDual(summary.cashInHand.usd, summary.cashInHand.syp)} grand />
      </div>

      {topClients.length > 0 && (
        <>
          <div className="doc-section-title">أفضل العملاء</div>
          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ width: "8%" }}>#</th>
                <th className="doc-cell-name">العميل</th>
                <th style={{ width: "18%" }}>عدد الفواتير</th>
                <th style={{ width: "28%" }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {topClients.map((row, index) => (
                <tr key={row.id}>
                  <td>
                    <Num>{index + 1}</Num>
                  </td>
                  <td className="doc-cell-name">{row.name}</td>
                  <td>
                    <Num>{formatNumber(row.count)}</Num>
                  </td>
                  <td>
                    <Num>{formatDual(row.total.usd, row.total.syp)}</Num>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {topProducts.length > 0 && (
        <>
          <div className="doc-section-title">الأصناف الأكثر مبيعاً</div>
          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ width: "8%" }}>#</th>
                <th className="doc-cell-name">الصنف</th>
                <th style={{ width: "22%" }}>الكمية</th>
                <th style={{ width: "28%" }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((row, index) => (
                <tr key={row.id}>
                  <td>
                    <Num>{index + 1}</Num>
                  </td>
                  <td className="doc-cell-name">{row.name}</td>
                  <td>
                    <Num>{row.qtyLabel}</Num>
                  </td>
                  <td>
                    <Num>{formatDual(row.total.usd, row.total.syp)}</Num>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </DocShell>
  );
}
