import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { SearchInput } from "../../../components/ui/Form";
import { Chip, Grid, Page, Stack, Toolbar } from "../../../components/ui/Page";
import { Badge, EmptyState, List, ListRow, StatTile } from "../../../components/ui/Surface";
import { useSales } from "../data/salesContext";
import { formatShortDate, startOfMonth, startOfWeek, todayISO } from "../domain/dates";
import { isReturn, paymentMeta } from "../domain/ledger";
import { formatDual, formatNumber } from "../domain/money";
import { orderNo } from "../domain/numbering";

const PERIODS = [
  { value: "today", label: "اليوم" },
  { value: "week", label: "هذا الأسبوع" },
  { value: "month", label: "هذا الشهر" },
  { value: "all", label: "الكل" },
];

const KINDS = [
  { value: "all", label: "الكل" },
  { value: "sale", label: "فواتير بيع" },
  { value: "return", label: "مرتجعات" },
];

const PAYMENTS = [
  { value: "all", label: "كل الحالات" },
  { value: "cash", label: "نقداً" },
  { value: "credit", label: "على الحساب" },
  { value: "partial", label: "دفعة جزئية" },
];

function periodStart(period) {
  if (period === "today") return todayISO();
  if (period === "week") return startOfWeek();
  if (period === "month") return startOfMonth();
  return "";
}

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { orders } = useSales();
  const [term, setTerm] = useState("");
  const [period, setPeriod] = useState("month");
  const [kind, setKind] = useState("all");
  const [payment, setPayment] = useState("all");

  const filtered = useMemo(() => {
    const from = periodStart(period);
    const q = term.trim().toLowerCase();
    return orders
      .filter((o) => (from ? o.date >= from : true))
      .filter((o) => (kind === "all" ? true : kind === "return" ? isReturn(o) : !isReturn(o)))
      .filter((o) => (payment === "all" ? true : o.paymentType === payment))
      .filter(
        (o) =>
          !q ||
          o.clientName?.toLowerCase().includes(q) ||
          String(o.invoiceNo || "").includes(q) ||
          o.items?.some((i) => i.productName?.toLowerCase().includes(q)),
      )
      .sort((a, b) => (a.date === b.date ? (b.createdAt || 0) - (a.createdAt || 0) : a.date < b.date ? 1 : -1));
  }, [orders, period, kind, payment, term]);

  const totals = useMemo(() => {
    const acc = { sales: { usd: 0, syp: 0 }, returns: { usd: 0, syp: 0 }, unpaid: { usd: 0, syp: 0 } };
    for (const order of filtered) {
      const bucket = isReturn(order) ? acc.returns : acc.sales;
      bucket.usd += order.totalUSD || 0;
      bucket.syp += order.totalSYP || 0;
      if (!isReturn(order) && order.paymentType !== "cash") {
        acc.unpaid.usd += (order.totalUSD || 0) - (order.paidUSD || 0);
        acc.unpaid.syp += (order.totalSYP || 0) - (order.paidSYP || 0);
      }
    }
    return acc;
  }, [filtered]);

  return (
    <Page
      title="الفواتير"
      subtitle={`${formatNumber(filtered.length)} فاتورة في الفترة المحددة`}
      actions={
        <Button icon="fa-solid fa-plus" onClick={() => navigate("/sales/invoices/new")}>
          فاتورة جديدة
        </Button>
      }
    >
      <Stack gap={12}>
        <SearchInput value={term} onChange={setTerm} placeholder="ابحث برقم الفاتورة أو اسم العميل أو الصنف..." />
        <Toolbar>
          {PERIODS.map((p) => (
            <Chip key={p.value} active={period === p.value} onClick={() => setPeriod(p.value)}>
              {p.label}
            </Chip>
          ))}
        </Toolbar>
        <Toolbar>
          {KINDS.map((k) => (
            <Chip key={k.value} active={kind === k.value} onClick={() => setKind(k.value)}>
              {k.label}
            </Chip>
          ))}
          {PAYMENTS.filter((p) => p.value !== "all").map((p) => (
            <Chip key={p.value} active={payment === p.value} onClick={() => setPayment(payment === p.value ? "all" : p.value)}>
              {p.label}
            </Chip>
          ))}
        </Toolbar>
      </Stack>

      <Grid min={170}>
        <StatTile label="إجمالي المبيعات" value={formatDual(totals.sales.usd, totals.sales.syp)} icon="fa-solid fa-file-invoice-dollar" />
        <StatTile label="غير مسدد" value={formatDual(totals.unpaid.usd, totals.unpaid.syp)} tone="warning" icon="fa-solid fa-hourglass-half" />
        {(totals.returns.usd > 0 || totals.returns.syp > 0) && (
          <StatTile label="المرتجعات" value={formatDual(totals.returns.usd, totals.returns.syp)} tone="danger" icon="fa-solid fa-arrow-rotate-left" />
        )}
      </Grid>

      {filtered.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-file-invoice-dollar"
          title="لا توجد فواتير"
          text="غيّر الفلاتر أو ابدأ بتسجيل فاتورة جديدة."
          action={
            <Button icon="fa-solid fa-plus" onClick={() => navigate("/sales/invoices/new")}>
              فاتورة جديدة
            </Button>
          }
        />
      ) : (
        <List>
          {filtered.map((order) => {
            const meta = paymentMeta(order);
            return (
              <ListRow
                key={order.id}
                onClick={() => navigate(`/sales/invoices/${order.id}`)}
                title={
                  <>
                    {order.clientName || "بدون عميل"}
                    <Badge tone={isReturn(order) ? "danger" : meta.tone}>{isReturn(order) ? "مرتجع" : meta.label}</Badge>
                  </>
                }
                subtitle={`${orderNo(order)} · ${formatShortDate(order.date)} · ${formatNumber(order.items?.length || 0)} صنف`}
                trailing={<strong className="sl-amount">{formatDual(order.totalUSD, order.totalSYP)}</strong>}
              />
            );
          })}
        </List>
      )}
    </Page>
  );
}
