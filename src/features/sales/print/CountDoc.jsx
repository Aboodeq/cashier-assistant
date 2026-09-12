import { formatDate } from "../domain/dates";
import { formatDual, formatNumber } from "../domain/money";
import DocShell, { InfoBox, Num, SummaryRow } from "./DocShell";

/**
 * تقرير جرد نهاية اليوم — counted vs expected stock, and (optionally) the
 * day's cash picture so the rep can hand over goods and money together.
 */
export default function CountDoc({ count, cash, settings = {}, narrow = false, printedAt }) {
  const lines = count.lines || [];
  const shortages = lines.filter((l) => l.diff < 0);
  const surpluses = lines.filter((l) => l.diff > 0);

  return (
    <DocShell
      settings={settings}
      title="تقرير جرد نهاية اليوم"
      meta={[{ label: "التاريخ", value: formatDate(count.date) }]}
      narrow={narrow}
      printedAt={printedAt}
    >
      <div className="doc-parties">
        <InfoBox
          label="ملخص الجرد"
          lines={[
            `عدد الأصناف المجرودة: ${formatNumber(lines.length)}`,
            `مطابق: ${formatNumber(lines.length - shortages.length - surpluses.length)}`,
            `عجز: ${formatNumber(shortages.length)} · زيادة: ${formatNumber(surpluses.length)}`,
            settings.repName && `المندوب: ${settings.repName}`,
          ]}
        />
      </div>

      {lines.length === 0 ? (
        <div className="doc-empty">لا توجد أصناف في هذا الجرد</div>
      ) : (
        <table className="doc-table">
          <thead>
            <tr>
              <th style={{ width: "6%" }}>#</th>
              <th className="doc-cell-name">الصنف</th>
              <th style={{ width: "17%" }}>المتوقع</th>
              <th style={{ width: "17%" }}>الفعلي</th>
              <th style={{ width: "17%" }}>الفرق</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.productId}>
                <td>
                  <Num>{index + 1}</Num>
                </td>
                <td className="doc-cell-name">{line.productName}</td>
                <td>
                  <Num>{formatNumber(line.expected)}</Num> {line.baseUnit}
                </td>
                <td>
                  <Num>{formatNumber(line.counted)}</Num> {line.baseUnit}
                </td>
                <td>
                  {line.diff === 0 ? (
                    <span className="doc-badge doc-badge--ok">مطابق</span>
                  ) : (
                    <span className={`doc-badge ${line.diff < 0 ? "doc-badge--bad" : "doc-badge--warn"}`}>
                      <Num>
                        {line.diff > 0 ? "+" : ""}
                        {formatNumber(line.diff)}
                      </Num>{" "}
                      {line.baseUnit}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {cash && (
        <>
          <div className="doc-section-title">ملخص حركة اليوم</div>
          <div className="doc-summary" style={{ width: "100%", marginInlineStart: 0 }}>
            <SummaryRow
              label={`المبيعات (${formatNumber(cash.salesCount)} فاتورة)`}
              value={formatDual(cash.sales.usd, cash.sales.syp)}
            />
            {(cash.returns.usd > 0 || cash.returns.syp > 0) && (
              <SummaryRow label="المرتجعات" value={formatDual(cash.returns.usd, cash.returns.syp)} />
            )}
            <SummaryRow label="مبيعات نقدية" value={formatDual(cash.cashSales.usd, cash.cashSales.syp)} />
            <SummaryRow label="مبيعات على الحساب" value={formatDual(cash.credit.usd, cash.credit.syp)} />
            <SummaryRow
              label={`تحصيلات (${formatNumber(cash.paymentsCount)} دفعة)`}
              value={formatDual(cash.collected.usd, cash.collected.syp)}
            />
            <SummaryRow label="مصاريف" value={formatDual(cash.expenses.usd, cash.expenses.syp)} />
            <SummaryRow label="النقدية المفترضة مع المندوب" value={formatDual(cash.cashInHand.usd, cash.cashInHand.syp)} grand />
          </div>
        </>
      )}

      {count.notes && <div className="doc-note">ملاحظات: {count.notes}</div>}
    </DocShell>
  );
}
