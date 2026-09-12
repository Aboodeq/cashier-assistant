import { addDual, zeroDual } from "./money";
import { inRange } from "./dates";

/*
 * What a client owes = unpaid invoices − returns credited − payments received.
 * A "cash" invoice is settled on the spot and never touches the balance; a
 * "partial" one lands on the balance in full and its down payment is recorded
 * as a normal payment, so one formula covers every case.
 */

export const PAYMENT_TYPES = [
  { value: "cash", label: "نقداً", icon: "fa-solid fa-money-bill-wave", tone: "success" },
  { value: "partial", label: "دفعة جزئية", icon: "fa-solid fa-scale-balanced", tone: "warning" },
  { value: "credit", label: "على الحساب", icon: "fa-solid fa-hand-holding-dollar", tone: "danger" },
];

export const RETURN_PAYMENT_TYPES = [
  { value: "credit", label: "خصم من حساب العميل", icon: "fa-solid fa-hand-holding-dollar", tone: "brand" },
  { value: "cash", label: "إرجاع نقدي", icon: "fa-solid fa-money-bill-wave", tone: "success" },
];

export const isReturn = (order) => order?.kind === "return";
export const orderKind = (order) => (isReturn(order) ? "return" : "sale");

export function paymentMeta(order) {
  const list = isReturn(order) ? RETURN_PAYMENT_TYPES : PAYMENT_TYPES;
  return list.find((p) => p.value === order?.paymentType) || list[list.length - 1];
}

export const orderTotal = (order) => ({ usd: order?.totalUSD || 0, syp: order?.totalSYP || 0 });

/** How much of an order lands on the client's balance. */
export function orderOwed(order) {
  if (order?.paymentType === "cash") return zeroDual();
  const total = orderTotal(order);
  return isReturn(order) ? { usd: -total.usd, syp: -total.syp } : total;
}

/** Map of clientId → { usd, syp } still owed (negative = credit in their favour). */
export function balanceMap(orders, payments) {
  const map = new Map();
  const bump = (clientId, dual) => {
    if (!clientId) return;
    map.set(clientId, addDual(map.get(clientId) || zeroDual(), dual));
  };
  for (const order of orders) bump(order.clientId, orderOwed(order));
  for (const p of payments) {
    bump(p.clientId, p.currency === "USD" ? { usd: -(p.amount || 0), syp: 0 } : { usd: 0, syp: -(p.amount || 0) });
  }
  return map;
}

export const balanceOf = (map, clientId) => map.get(clientId) || zeroDual();
export const hasDebt = (balance) => (balance?.usd || 0) > 0.005 || (balance?.syp || 0) > 0.5;

/** Sum of every client's outstanding debt (credits in their favour ignored). */
export function totalOutstanding(map) {
  let usd = 0;
  let syp = 0;
  for (const b of map.values()) {
    if (b.usd > 0) usd += b.usd;
    if (b.syp > 0) syp += b.syp;
  }
  return { usd, syp };
}

const sumOrders = (orders) =>
  orders.reduce((acc, o) => addDual(acc, orderTotal(o)), zeroDual());

/**
 * Money picture for a period: what was sold, returned, collected and spent —
 * and how much cash the rep should be holding for it.
 */
export function cashSummary({ orders = [], payments = [], expenses = [] }, from, to) {
  const inPeriod = (iso) => inRange(iso, from, to);
  const periodOrders = orders.filter((o) => inPeriod(o.date));
  const sales = periodOrders.filter((o) => !isReturn(o));
  const returns = periodOrders.filter(isReturn);
  const cashSales = sales.filter((o) => o.paymentType === "cash");
  const cashReturns = returns.filter((o) => o.paymentType === "cash");
  const periodPayments = payments.filter((p) => inPeriod(p.date));
  const periodExpenses = expenses.filter((e) => inPeriod(e.date));

  const collected = periodPayments.reduce(
    (acc, p) => addDual(acc, p.currency === "USD" ? { usd: p.amount || 0, syp: 0 } : { usd: 0, syp: p.amount || 0 }),
    zeroDual(),
  );
  const spent = periodExpenses.reduce(
    (acc, e) => addDual(acc, e.currency === "USD" ? { usd: e.amount || 0, syp: 0 } : { usd: 0, syp: e.amount || 0 }),
    zeroDual(),
  );
  const cashSalesTotal = sumOrders(cashSales);
  const cashReturnsTotal = sumOrders(cashReturns);

  return {
    orders: periodOrders,
    salesCount: sales.length,
    returnsCount: returns.length,
    sales: sumOrders(sales),
    returns: sumOrders(returns),
    net: {
      usd: sumOrders(sales).usd - sumOrders(returns).usd,
      syp: sumOrders(sales).syp - sumOrders(returns).syp,
    },
    cashSales: cashSalesTotal,
    credit: {
      usd: sumOrders(sales.filter((o) => o.paymentType !== "cash")).usd,
      syp: sumOrders(sales.filter((o) => o.paymentType !== "cash")).syp,
    },
    collected,
    expenses: spent,
    paymentsCount: periodPayments.length,
    cashInHand: {
      usd: cashSalesTotal.usd + collected.usd - cashReturnsTotal.usd - spent.usd,
      syp: cashSalesTotal.syp + collected.syp - cashReturnsTotal.syp - spent.syp,
    },
  };
}
