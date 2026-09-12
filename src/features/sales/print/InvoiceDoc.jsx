import { formatDate } from "../domain/dates";
import { formatDual, formatMoney, formatNumber } from "../domain/money";
import { isReturn, paymentMeta } from "../domain/ledger";
import { orderNo } from "../domain/numbering";
import { tierLabel } from "../domain/pricing";
import DocShell, { InfoBox, Num, SummaryRow } from "./DocShell";

const CURRENCIES = ["USD", "SYP"];

function moneyByCurrency(items, pick) {
  return CURRENCIES.reduce((acc, c) => {
    acc[c] = items.filter((i) => i.currency === c).reduce((sum, i) => sum + (pick(i) || 0), 0);
    return acc;
  }, {});
}

export default function InvoiceDoc({
  order,
  client,
  settings = {},
  narrow = false,
  printedAt,
  balanceBefore,
  balanceAfter,
}) {
  const items = order.items || [];
  const gross = moneyByCurrency(items, (i) => i.grossTotal ?? i.lineTotal);
  const discount = moneyByCurrency(items, (i) => i.discount);
  const isRet = isReturn(order);
  const payment = paymentMeta(order);
  const paid = { usd: order.paidUSD || 0, syp: order.paidSYP || 0 };
  const remaining = {
    usd: (order.totalUSD || 0) - paid.usd,
    syp: (order.totalSYP || 0) - paid.syp,
  };
  const hasDiscount = discount.USD > 0 || discount.SYP > 0;

  return (
    <DocShell
      settings={settings}
      title={isRet ? "إشعار مرتجع" : "فاتورة بيع"}
      number={orderNo(order).replace("#", "")}
      meta={[{ label: "التاريخ", value: formatDate(order.date) }]}
      narrow={narrow}
      printedAt={printedAt}
    >
      <div className="doc-parties">
        <InfoBox
          label={isRet ? "المرتجع من" : "العميل"}
          name={order.clientName}
          lines={[
            order.territoryName && `المنطقة: ${order.territoryName}`,
            client?.phone && `الهاتف: ${client.phone}`,
            client?.address,
          ]}
        />
        <InfoBox
          label="بيانات الفاتورة"
          lines={[
            `طريقة الدفع: ${payment.label}`,
            `فئة السعر: ${tierLabel(order.priceTier)}`,
            settings.repName && `المندوب: ${settings.repName}`,
          ]}
        />
      </div>

      {items.length === 0 ? (
        <div className="doc-empty">لا توجد أصناف</div>
      ) : (
        <table className="doc-table">
          <thead>
            <tr>
              <th style={{ width: "7%" }}>#</th>
              <th className="doc-cell-name">الصنف</th>
              <th style={{ width: "15%" }}>الكمية</th>
              <th style={{ width: "17%" }}>السعر</th>
              {hasDiscount && <th style={{ width: "14%" }}>الخصم</th>}
              <th style={{ width: "19%" }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td>
                  <Num>{index + 1}</Num>
                </td>
                <td className="doc-cell-name">
                  {item.productName}
                  {item.freeQty > 0 && (
                    <div style={{ fontSize: "10.5px", color: "#166534" }}>
                      + بونص مجاني: <Num>{formatNumber(item.freeQty)}</Num> {item.freeUnit}
                    </div>
                  )}
                </td>
                <td>
                  <Num>{formatNumber(item.quantity)}</Num> {item.unit}
                </td>
                <td>
                  <Num>{formatMoney(item.price, item.currency)}</Num>
                </td>
                {hasDiscount && (
                  <td>
                    {item.discount ? (
                      <>
                        <Num>{formatMoney(item.discount, item.currency)}</Num>
                        {item.discountPct ? ` (${formatNumber(item.discountPct)}%)` : ""}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
                <td>
                  <Num>{formatMoney(item.lineTotal, item.currency)}</Num>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="doc-summary">
        {hasDiscount && (
          <>
            <SummaryRow label="الإجمالي قبل الخصم" value={formatDual(gross.USD, gross.SYP)} />
            <SummaryRow label="الخصم" value={formatDual(discount.USD, discount.SYP)} />
          </>
        )}
        <SummaryRow
          label={isRet ? "قيمة المرتجع" : "الإجمالي"}
          value={formatDual(order.totalUSD, order.totalSYP)}
          grand
        />
        {order.paymentType === "partial" && (
          <>
            <SummaryRow label="المدفوع الآن" value={formatDual(paid.usd, paid.syp)} />
            <SummaryRow label="المتبقي على الحساب" value={formatDual(remaining.usd, remaining.syp)} />
          </>
        )}
        {balanceBefore && <SummaryRow label="الرصيد السابق" value={formatDual(balanceBefore.usd, balanceBefore.syp)} />}
        {balanceAfter && (
          <SummaryRow label="الرصيد الحالي على العميل" value={formatDual(balanceAfter.usd, balanceAfter.syp)} />
        )}
      </div>

      {order.notes && <div className="doc-note">ملاحظات: {order.notes}</div>}
    </DocShell>
  );
}
