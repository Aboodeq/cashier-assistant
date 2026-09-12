import { formatDate, todayISO } from "../domain/dates";
import { formatDual } from "../domain/money";
import { isReturn, paymentMeta } from "../domain/ledger";
import { orderNo } from "../domain/numbering";
import DocShell, { InfoBox, Num, SummaryRow } from "./DocShell";

/** كشف حساب — every invoice and payment for one client, with the balance. */
export default function StatementDoc({
  client,
  orders = [],
  payments = [],
  balance,
  settings = {},
  narrow = false,
  printedAt,
}) {
  const rows = [
    ...orders.map((o) => ({
      key: `o-${o.id}`,
      date: o.date,
      label: `${isReturn(o) ? "مرتجع" : "فاتورة"} ${orderNo(o)}`,
      detail: paymentMeta(o).label,
      debit: isReturn(o) ? null : { usd: o.totalUSD || 0, syp: o.totalSYP || 0 },
      credit: isReturn(o) ? { usd: o.totalUSD || 0, syp: o.totalSYP || 0 } : null,
    })),
    ...payments.map((p) => ({
      key: `p-${p.id}`,
      date: p.date,
      label: "دفعة مستلمة",
      detail: p.notes || "",
      debit: null,
      credit: p.currency === "USD" ? { usd: p.amount || 0, syp: 0 } : { usd: 0, syp: p.amount || 0 },
    })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const totalSales = orders
    .filter((o) => !isReturn(o))
    .reduce((acc, o) => ({ usd: acc.usd + (o.totalUSD || 0), syp: acc.syp + (o.totalSYP || 0) }), { usd: 0, syp: 0 });
  const totalReturns = orders
    .filter(isReturn)
    .reduce((acc, o) => ({ usd: acc.usd + (o.totalUSD || 0), syp: acc.syp + (o.totalSYP || 0) }), { usd: 0, syp: 0 });
  const totalPaid = payments.reduce(
    (acc, p) => ({
      usd: acc.usd + (p.currency === "USD" ? p.amount || 0 : 0),
      syp: acc.syp + (p.currency === "SYP" ? p.amount || 0 : 0),
    }),
    { usd: 0, syp: 0 },
  );

  return (
    <DocShell
      settings={settings}
      title="كشف حساب عميل"
      meta={[{ label: "حتى تاريخ", value: formatDate(todayISO()) }]}
      narrow={narrow}
      printedAt={printedAt}
      signatures={false}
    >
      <div className="doc-parties">
        <InfoBox
          label="العميل"
          name={client?.name}
          lines={[
            client?.territoryName && `المنطقة: ${client.territoryName}`,
            client?.phone && `الهاتف: ${client.phone}`,
            client?.address,
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <div className="doc-empty">لا توجد حركات على حساب هذا العميل</div>
      ) : (
        <table className="doc-table">
          <thead>
            <tr>
              <th style={{ width: "16%" }}>التاريخ</th>
              <th className="doc-cell-name">البيان</th>
              <th style={{ width: "22%" }}>عليه (مدين)</th>
              <th style={{ width: "22%" }}>له (دائن)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>
                  <Num>{formatDate(row.date)}</Num>
                </td>
                <td className="doc-cell-name">
                  {row.label}
                  {row.detail && <span style={{ color: "#6b7280" }}> — {row.detail}</span>}
                </td>
                <td>{row.debit ? <Num>{formatDual(row.debit.usd, row.debit.syp, "—")}</Num> : "—"}</td>
                <td>{row.credit ? <Num>{formatDual(row.credit.usd, row.credit.syp, "—")}</Num> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="doc-summary">
        <SummaryRow label="إجمالي المشتريات" value={formatDual(totalSales.usd, totalSales.syp)} />
        {(totalReturns.usd > 0 || totalReturns.syp > 0) && (
          <SummaryRow label="إجمالي المرتجعات" value={formatDual(totalReturns.usd, totalReturns.syp)} />
        )}
        <SummaryRow label="إجمالي المدفوع" value={formatDual(totalPaid.usd, totalPaid.syp)} />
        <SummaryRow label="الرصيد المستحق" value={formatDual(balance?.usd, balance?.syp)} grand />
      </div>
    </DocShell>
  );
}
