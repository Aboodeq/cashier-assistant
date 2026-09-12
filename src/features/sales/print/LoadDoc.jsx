import { formatDate } from "../domain/dates";
import { formatNumber } from "../domain/money";
import DocShell, { InfoBox, Num } from "./DocShell";

/** إذن تحميل / إرجاع — the slip signed when goods move between warehouse and vehicle. */
export default function LoadDoc({ load, settings = {}, narrow = false, printedAt }) {
  const isReturn = load.type === "return";
  const lines = load.lines || [];

  return (
    <DocShell
      settings={settings}
      title={isReturn ? "إذن إرجاع للمستودع" : "إذن تحميل بضاعة"}
      meta={[{ label: "التاريخ", value: formatDate(load.date) }]}
      narrow={narrow}
      printedAt={printedAt}
    >
      <div className="doc-parties">
        <InfoBox
          label="البيان"
          lines={[
            isReturn ? "إرجاع البضاعة من السيارة إلى المستودع" : "تحميل البضاعة من المستودع إلى السيارة",
            settings.repName && `المندوب: ${settings.repName}`,
            `عدد الأصناف: ${formatNumber(lines.length)}`,
          ]}
        />
      </div>

      {lines.length === 0 ? (
        <div className="doc-empty">لا توجد أصناف</div>
      ) : (
        <table className="doc-table">
          <thead>
            <tr>
              <th style={{ width: "8%" }}>#</th>
              <th className="doc-cell-name">الصنف</th>
              <th style={{ width: "30%" }}>الكمية</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={`${line.productId}-${line.unitLevel}-${index}`}>
                <td>
                  <Num>{index + 1}</Num>
                </td>
                <td className="doc-cell-name">{line.productName}</td>
                <td>
                  <Num>{formatNumber(line.quantity)}</Num> {line.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {load.notes && <div className="doc-note">ملاحظات: {load.notes}</div>}
    </DocShell>
  );
}
