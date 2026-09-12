import { orderKind } from "./ledger";

/*
 * Sequential document numbers are derived from the documents already on the
 * device rather than a server counter, so a sale can still be written with no
 * signal (Firestore transactions need a live connection).
 */

function nextNumber(items, field) {
  let max = 0;
  for (const item of items) {
    const n = Number(item?.[field]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

export const nextInvoiceNo = (orders, kind = "sale") =>
  nextNumber(orders.filter((o) => orderKind(o) === kind), "invoiceNo");

export const nextReceiptNo = (payments) => nextNumber(payments, "receiptNo");

/** "#14" — falls back to a short id for documents created before numbering. */
export function orderNo(order) {
  if (order?.invoiceNo) return `#${order.invoiceNo}`;
  return `#${String(order?.id || "").slice(-5).toUpperCase()}`;
}

export function orderTitle(order) {
  return `${orderKind(order) === "return" ? "مرتجع" : "فاتورة"} ${orderNo(order)}`;
}

export function receiptNo(payment) {
  if (payment?.receiptNo) return `#${payment.receiptNo}`;
  return `#${String(payment?.id || "").slice(-5).toUpperCase()}`;
}
