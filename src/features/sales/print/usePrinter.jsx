import { printElement } from "../../../utils/print";
import { useSales } from "../data/salesContext";
import { formatDate, nowMs, todayISO } from "../domain/dates";
import { formatDual, formatMoney, formatNumber } from "../domain/money";
import { balanceOf, isReturn, orderOwed, paymentMeta } from "../domain/ledger";
import { orderNo, receiptNo } from "../domain/numbering";
import { shareText, whatsappUrl } from "../domain/share";
import CountDoc from "./CountDoc";
import InvoiceDoc from "./InvoiceDoc";
import LoadDoc from "./LoadDoc";
import PeriodDoc from "./PeriodDoc";
import ReceiptDoc from "./ReceiptDoc";
import StatementDoc from "./StatementDoc";
import StockDoc from "./StockDoc";

/**
 * Printing + WhatsApp sharing for every document, wired to the user's
 * settings (business letterhead, paper size). Printing happens in-page so it
 * works on Android — see src/utils/print.jsx.
 */
export function usePrinter() {
  const { settings, clientById, balances, orders, payments } = useSales();
  const format = settings.printFormat || "a4";
  const base = () => ({ settings, narrow: format !== "a4", printedAt: nowMs() });
  const businessLine = settings.businessName ? `${settings.businessName}\n` : "";

  /* ── Printing ── */
  const printInvoice = (order) => {
    const client = clientById.get(order.clientId);
    const after = balanceOf(balances, order.clientId);
    const owed = orderOwed(order);
    // Undo this invoice *and* any down payment taken with it, so "previous
    // balance" is what the client owed before this visit.
    const paidWithOrder = payments
      .filter((p) => p.orderId === order.id)
      .reduce(
        (acc, p) => ({
          usd: acc.usd + (p.currency === "USD" ? p.amount || 0 : 0),
          syp: acc.syp + (p.currency === "SYP" ? p.amount || 0 : 0),
        }),
        { usd: 0, syp: 0 },
      );
    const before = {
      usd: after.usd - owed.usd + paidWithOrder.usd,
      syp: after.syp - owed.syp + paidWithOrder.syp,
    };
    printElement(
      <InvoiceDoc
        {...base()}
        order={order}
        client={client}
        balanceBefore={order.paymentType === "cash" ? null : before}
        balanceAfter={order.paymentType === "cash" ? null : after}
      />,
      { title: `${isReturn(order) ? "مرتجع" : "فاتورة"} ${orderNo(order)} - ${order.clientName}`, format },
    );
  };

  const printReceipt = (payment) => {
    printElement(
      <ReceiptDoc
        {...base()}
        payment={payment}
        client={clientById.get(payment.clientId)}
        balanceAfter={balanceOf(balances, payment.clientId)}
      />,
      { title: `سند قبض ${receiptNo(payment)} - ${payment.clientName}`, format },
    );
  };

  const printStatement = (client) => {
    printElement(
      <StatementDoc
        {...base()}
        client={client}
        orders={orders.filter((o) => o.clientId === client.id)}
        payments={payments.filter((p) => p.clientId === client.id)}
        balance={balanceOf(balances, client.id)}
      />,
      { title: `كشف حساب - ${client.name}`, format },
    );
  };

  const printStock = (rows) => {
    printElement(<StockDoc {...base()} rows={rows} />, { title: "تقرير مخزون السيارة", format });
  };

  const printLoad = (load) => {
    printElement(<LoadDoc {...base()} load={load} />, {
      title: `${load.type === "return" ? "إذن إرجاع" : "إذن تحميل"} ${formatDate(load.date)}`,
      format,
    });
  };

  const printPeriod = ({ from, to, summary, topClients, topProducts }) => {
    printElement(
      <PeriodDoc {...base()} from={from} to={to} summary={summary} topClients={topClients} topProducts={topProducts} />,
      { title: `تقرير المبيعات ${from} - ${to}`, format },
    );
  };

  const printCount = (count, cash) => {
    printElement(<CountDoc {...base()} count={count} cash={cash} />, {
      title: `جرد ${formatDate(count.date)}`,
      format,
    });
  };

  /* ── WhatsApp / share text ── */
  const invoiceText = (order) => {
    const lines = (order.items || []).map(
      (item, i) =>
        `${i + 1}) ${item.productName} — ${formatNumber(item.quantity)} ${item.unit} × ${formatMoney(item.price, item.currency)} = ${formatMoney(item.lineTotal, item.currency)}${item.freeQty ? ` (+${formatNumber(item.freeQty)} ${item.freeUnit} مجاناً)` : ""}`,
    );
    const balance = balanceOf(balances, order.clientId);
    return [
      businessLine + `${isReturn(order) ? "إشعار مرتجع" : "فاتورة بيع"} ${orderNo(order)}`,
      `العميل: ${order.clientName}`,
      `التاريخ: ${formatDate(order.date)}`,
      "",
      ...lines,
      "",
      `الإجمالي: ${formatDual(order.totalUSD, order.totalSYP)}`,
      `طريقة الدفع: ${paymentMeta(order).label}`,
      order.paymentType === "partial"
        ? `المدفوع الآن: ${formatDual(order.paidUSD, order.paidSYP)}`
        : null,
      order.paymentType !== "cash" ? `الرصيد الحالي: ${formatDual(balance.usd, balance.syp)}` : null,
      settings.footerNote || "شكراً لتعاملكم معنا",
    ]
      .filter((line) => line !== null)
      .join("\n");
  };

  const receiptText = (payment) => {
    const balance = balanceOf(balances, payment.clientId);
    return [
      businessLine + `سند قبض ${receiptNo(payment)}`,
      `العميل: ${payment.clientName}`,
      `التاريخ: ${formatDate(payment.date)}`,
      `المبلغ المستلم: ${formatMoney(payment.amount, payment.currency)}`,
      `الرصيد المتبقي: ${formatDual(balance.usd, balance.syp)}`,
      settings.footerNote || "شكراً لتعاملكم معنا",
    ].join("\n");
  };

  const statementText = (client) => {
    const balance = balanceOf(balances, client.id);
    const clientOrders = orders.filter((o) => o.clientId === client.id);
    const clientPayments = payments.filter((p) => p.clientId === client.id);
    return [
      businessLine + `كشف حساب — ${client.name}`,
      `حتى تاريخ: ${formatDate(todayISO())}`,
      `عدد الفواتير: ${formatNumber(clientOrders.length)}`,
      `عدد الدفعات: ${formatNumber(clientPayments.length)}`,
      `الرصيد المستحق: ${formatDual(balance.usd, balance.syp)}`,
      settings.footerNote || "",
    ]
      .filter(Boolean)
      .join("\n");
  };

  const share = (text, title) => shareText(text, title);
  const whatsapp = (phone, text) => window.open(whatsappUrl(phone, text), "_blank", "noopener");

  return {
    format,
    printInvoice,
    printReceipt,
    printStatement,
    printStock,
    printLoad,
    printCount,
    printPeriod,
    invoiceText,
    receiptText,
    statementText,
    share,
    whatsapp,
  };
}
