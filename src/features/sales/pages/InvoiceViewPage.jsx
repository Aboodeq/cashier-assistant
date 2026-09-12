import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, IconButton } from "../../../components/ui/Button";
import { Page, Section } from "../../../components/ui/Page";
import { ActionSheet, ConfirmDialog } from "../../../components/ui/Sheet";
import { Avatar, Badge, Callout, Card, EmptyState, KeyValue, ListRow, Spinner } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import PaymentSheet from "../components/PaymentSheet";
import { deleteOrder } from "../data/api";
import { useSales } from "../data/salesContext";
import { formatDate } from "../domain/dates";
import { balanceOf, hasDebt, isReturn, paymentMeta } from "../domain/ledger";
import { formatDual, formatDualObj, formatMoney, formatNumber } from "../domain/money";
import { orderTitle } from "../domain/numbering";
import { tierLabel } from "../domain/pricing";
import { canWhatsApp } from "../domain/share";
import { usePrinter } from "../print/usePrinter";

export default function InvoiceViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { orders, clients, moves, payments, balances, ready } = useSales();
  const printer = usePrinter();
  const [sheet, setSheet] = useState(null);

  const order = orders.find((o) => o.id === id);
  if (!order) {
    return (
      <Page title="الفاتورة" back="/sales/invoices">
        {ready ? (
          <EmptyState
            icon="fa-solid fa-file-circle-question"
            title="الفاتورة غير موجودة"
            action={<Button onClick={() => navigate("/sales/invoices")}>العودة للفواتير</Button>}
          />
        ) : (
          <Spinner />
        )}
      </Page>
    );
  }

  const client = clients.find((c) => c.id === order.clientId);
  const balance = balanceOf(balances, order.clientId);
  const meta = paymentMeta(order);
  const ret = isReturn(order);
  const linkedPayments = payments.filter((p) => p.orderId === order.id);
  const remaining = {
    usd: (order.totalUSD || 0) - (order.paidUSD || 0),
    syp: (order.totalSYP || 0) - (order.paidSYP || 0),
  };

  const confirmDelete = () => {
    deleteOrder({
      order,
      moves: moves.filter((m) => m.orderId === order.id),
      payments: linkedPayments,
    });
    toast.success("تم حذف الفاتورة وإرجاع الكميات إلى المخزون");
    navigate("/sales/invoices", { replace: true });
  };

  return (
    <Page
      title={orderTitle(order)}
      subtitle={`${order.clientName} · ${formatDate(order.date)}`}
      back="/sales/invoices"
      actions={
        <>
          <IconButton icon="fa-solid fa-print" label="طباعة" variant="soft" onClick={() => printer.printInvoice(order)} />
          <IconButton icon="fa-solid fa-ellipsis" label="خيارات" variant="secondary" onClick={() => setSheet({ type: "actions" })} />
        </>
      }
      footer={
        <>
          <Button variant="secondary" icon="fa-solid fa-print" onClick={() => printer.printInvoice(order)} block>
            طباعة
          </Button>
          <Button
            variant="whatsapp"
            icon="fa-brands fa-whatsapp"
            block
            onClick={() =>
              canWhatsApp(client?.phone)
                ? printer.whatsapp(client.phone, printer.invoiceText(order))
                : printer.share(printer.invoiceText(order), orderTitle(order))
            }
          >
            إرسال
          </Button>
        </>
      }
    >
      <Card>
        <ListRow
          onClick={client ? () => navigate(`/sales/clients/${client.id}`) : undefined}
          leading={<Avatar name={order.clientName || "?"} size={44} />}
          title={
            <>
              {order.clientName}
              <Badge tone={ret ? "danger" : meta.tone}>{ret ? "مرتجع" : meta.label}</Badge>
            </>
          }
          subtitle={[order.territoryName, client?.phone].filter(Boolean).join(" · ") || "—"}
          meta={
            hasDebt(balance) ? (
              <span>
                <i className="fa-solid fa-scale-balanced" />
                رصيد العميل: {formatDualObj(balance)}
              </span>
            ) : null
          }
        />
      </Card>

      <Section title="الأصناف">
        <Card padded={false}>
          {(order.items || []).map((item, index) => (
            <ListRow
              key={index}
              title={item.productName}
              subtitle={`${formatNumber(item.quantity)} ${item.unit} × ${formatMoney(item.price, item.currency)}${
                item.discount ? ` · خصم ${formatNumber(item.discountPct)}%` : ""
              }`}
              meta={
                item.freeQty > 0 ? (
                  <span className="sl-free">
                    <i className="fa-solid fa-gift" />+ بونص {formatNumber(item.freeQty)} {item.freeUnit} مجاناً
                  </span>
                ) : null
              }
              trailing={<strong className="sl-amount">{formatMoney(item.lineTotal, item.currency)}</strong>}
              chevron={false}
            />
          ))}
        </Card>
      </Section>

      <Card title="الملخص" icon="fa-solid fa-receipt">
        {(order.discountUSD > 0 || order.discountSYP > 0) && (
          <>
            <KeyValue label="قبل الخصم" value={formatDual(order.subtotalUSD, order.subtotalSYP)} />
            <KeyValue label="الخصم" value={formatDual(order.discountUSD, order.discountSYP)} />
          </>
        )}
        <KeyValue label="فئة السعر" value={tierLabel(order.priceTier)} />
        <KeyValue label={ret ? "قيمة المرتجع" : "الإجمالي"} value={formatDual(order.totalUSD, order.totalSYP)} strong />
        {order.paymentType === "partial" && (
          <>
            <KeyValue label="المدفوع الآن" value={formatDual(order.paidUSD, order.paidSYP)} />
            <KeyValue label="المتبقي على الحساب" value={formatDual(remaining.usd, remaining.syp)} />
          </>
        )}
      </Card>

      {order.notes && <Callout tone="info" icon="fa-regular fa-note-sticky">{order.notes}</Callout>}

      {!ret && order.paymentType !== "cash" && hasDebt(balance) && (
        <Button variant="success" icon="fa-solid fa-hand-holding-dollar" block onClick={() => setSheet({ type: "pay" })}>
          تحصيل دفعة من {order.clientName}
        </Button>
      )}

      {sheet?.type === "actions" && (
        <ActionSheet
          open
          onClose={() => setSheet(null)}
          title={orderTitle(order)}
          actions={[
            { label: "طباعة", icon: "fa-solid fa-print", tone: "brand", onClick: () => printer.printInvoice(order) },
            {
              label: "إرسال عبر واتساب",
              icon: "fa-brands fa-whatsapp",
              tone: "whatsapp",
              onClick: () =>
                canWhatsApp(client?.phone)
                  ? printer.whatsapp(client.phone, printer.invoiceText(order))
                  : printer.share(printer.invoiceText(order), orderTitle(order)),
            },
            { label: "مشاركة النص", icon: "fa-solid fa-share-nodes", onClick: () => printer.share(printer.invoiceText(order), orderTitle(order)) },
            { label: "تعديل", icon: "fa-solid fa-pen", onClick: () => navigate(`/sales/invoices/${order.id}/edit`) },
            { label: "حذف", icon: "fa-solid fa-trash", tone: "danger", onClick: () => setSheet({ type: "delete" }) },
          ]}
        />
      )}

      {sheet?.type === "pay" && (
        <PaymentSheet
          clientId={order.clientId}
          onClose={() => setSheet(null)}
          onSaved={(payment) =>
            toast.success("تم تسجيل الدفعة", {
              action: { label: "طباعة السند", onClick: () => printer.printReceipt(payment) },
            })
          }
        />
      )}

      <ConfirmDialog
        open={sheet?.type === "delete"}
        title="حذف الفاتورة؟"
        message="سيتم حذف الفاتورة وإرجاع كمياتها إلى مخزون السيارة، وحذف أي دفعة سُجلت معها."
        confirmLabel="حذف"
        onCancel={() => setSheet(null)}
        onConfirm={confirmDelete}
      />
    </Page>
  );
}
