import { formatDate } from "../domain/dates";
import { formatDual, formatMoney } from "../domain/money";
import { receiptNo } from "../domain/numbering";
import DocShell, { InfoBox, SummaryRow } from "./DocShell";

/** سند قبض — the receipt handed to a client for a payment. */
export default function ReceiptDoc({ payment, client, settings = {}, narrow = false, printedAt, balanceAfter }) {
  return (
    <DocShell
      settings={settings}
      title="سند قبض"
      number={receiptNo(payment).replace("#", "")}
      meta={[{ label: "التاريخ", value: formatDate(payment.date) }]}
      narrow={narrow}
      printedAt={printedAt}
    >
      <div className="doc-parties">
        <InfoBox
          label="استلمنا من"
          name={payment.clientName}
          lines={[client?.phone && `الهاتف: ${client.phone}`, client?.territoryName && `المنطقة: ${client.territoryName}`]}
        />
        <InfoBox
          label="بيانات السند"
          lines={[
            payment.orderId ? "دفعة مرتبطة بفاتورة" : "دفعة على الحساب",
            settings.repName && `المندوب: ${settings.repName}`,
          ]}
        />
      </div>

      <div className="doc-summary">
        <SummaryRow label="المبلغ المستلم" value={formatMoney(payment.amount, payment.currency)} grand />
        {balanceAfter && (
          <SummaryRow label="الرصيد المتبقي على العميل" value={formatDual(balanceAfter.usd, balanceAfter.syp)} />
        )}
      </div>

      {payment.notes && <div className="doc-note">ملاحظات: {payment.notes}</div>}
    </DocShell>
  );
}
