import { useMemo, useState } from "react";
import { IconButton } from "../../../components/ui/Button";
import { TextField } from "../../../components/ui/Form";
import { Chip, Grid, Page, Section, Stack, Toolbar } from "../../../components/ui/Page";
import { Card, EmptyState, IconTile, List, ListRow, StatTile } from "../../../components/ui/Surface";
import { useSales } from "../data/salesContext";
import { endOfMonth, lastMonthRange, startOfMonth, startOfWeek, startOfYear, todayISO } from "../domain/dates";
import { cashSummary, isReturn, totalOutstanding } from "../domain/ledger";
import { formatDual, formatNumber, rankValue } from "../domain/money";
import { formatBaseQty } from "../domain/packaging";
import { lineBaseQty } from "../domain/pricing";
import { usePrinter } from "../print/usePrinter";

export default function ReportsPage() {
  const { orders, payments, expenses, balances, productById, rate } = useSales();
  const printer = usePrinter();
  const [from, setFrom] = useState(startOfMonth());
  const [to, setTo] = useState(todayISO());

  const summary = useMemo(
    () => cashSummary({ orders, payments, expenses }, from, to),
    [orders, payments, expenses, from, to],
  );
  const outstanding = useMemo(() => totalOutstanding(balances), [balances]);

  const preset = (value) => {
    if (value === "today") {
      setFrom(todayISO());
      setTo(todayISO());
    } else if (value === "week") {
      setFrom(startOfWeek());
      setTo(todayISO());
    } else if (value === "month") {
      setFrom(startOfMonth());
      setTo(todayISO());
    } else if (value === "lastMonth") {
      const range = lastMonthRange();
      setFrom(range.from);
      setTo(range.to);
    } else if (value === "year") {
      setFrom(startOfYear());
      setTo(endOfMonth());
    }
  };

  const topClients = useMemo(() => {
    const map = new Map();
    for (const order of summary.orders) {
      if (isReturn(order)) continue;
      const entry = map.get(order.clientId) || { id: order.clientId, name: order.clientName, count: 0, total: { usd: 0, syp: 0 } };
      entry.count += 1;
      entry.total.usd += order.totalUSD || 0;
      entry.total.syp += order.totalSYP || 0;
      map.set(order.clientId, entry);
    }
    return [...map.values()].sort((a, b) => rankValue(b.total, rate) - rankValue(a.total, rate)).slice(0, 8);
  }, [summary.orders, rate]);

  const topProducts = useMemo(() => {
    const map = new Map();
    for (const order of summary.orders) {
      if (isReturn(order)) continue;
      for (const item of order.items || []) {
        const product = productById.get(item.productId);
        const entry = map.get(item.productId) || { id: item.productId, name: item.productName, base: 0, total: { usd: 0, syp: 0 }, product };
        entry.base += product ? lineBaseQty(product, item) : item.quantity || 0;
        if (item.currency === "USD") entry.total.usd += item.lineTotal || 0;
        else entry.total.syp += item.lineTotal || 0;
        map.set(item.productId, entry);
      }
    }
    return [...map.values()]
      .map((entry) => ({ ...entry, qtyLabel: entry.product ? formatBaseQty(entry.product, entry.base) : formatNumber(entry.base) }))
      .sort((a, b) => b.base - a.base)
      .slice(0, 8);
  }, [summary.orders, productById]);

  const topTerritories = useMemo(() => {
    const map = new Map();
    for (const order of summary.orders) {
      if (isReturn(order)) continue;
      const key = order.territoryId || "none";
      const entry = map.get(key) || { id: key, name: order.territoryName || "بدون منطقة", count: 0, total: { usd: 0, syp: 0 } };
      entry.count += 1;
      entry.total.usd += order.totalUSD || 0;
      entry.total.syp += order.totalSYP || 0;
      map.set(key, entry);
    }
    return [...map.values()].sort((a, b) => rankValue(b.total, rate) - rankValue(a.total, rate));
  }, [summary.orders, rate]);

  return (
    <Page
      title="التقارير"
      subtitle="أداء المبيعات والتحصيل والمصاريف"
      actions={
        <IconButton
          icon="fa-solid fa-print"
          label="طباعة التقرير"
          variant="secondary"
          onClick={() => printer.printPeriod({ from, to, summary, topClients, topProducts })}
        />
      }
    >
      <Card>
        <Stack gap={12}>
          <Toolbar>
            <Chip onClick={() => preset("today")}>اليوم</Chip>
            <Chip onClick={() => preset("week")}>هذا الأسبوع</Chip>
            <Chip onClick={() => preset("month")}>هذا الشهر</Chip>
            <Chip onClick={() => preset("lastMonth")}>الشهر الماضي</Chip>
            <Chip onClick={() => preset("year")}>هذه السنة</Chip>
          </Toolbar>
          <div className="sl-pay-grid">
            <TextField label="من" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <TextField label="إلى" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </Stack>
      </Card>

      <Grid min={165}>
        <StatTile label="المبيعات" value={formatDual(summary.sales.usd, summary.sales.syp)} sub={`${formatNumber(summary.salesCount)} فاتورة`} icon="fa-solid fa-file-invoice-dollar" />
        <StatTile label="المرتجعات" value={formatDual(summary.returns.usd, summary.returns.syp)} tone="danger" icon="fa-solid fa-arrow-rotate-left" />
        <StatTile label="صافي المبيعات" value={formatDual(summary.net.usd, summary.net.syp)} tone="brand" icon="fa-solid fa-chart-line" />
        <StatTile label="التحصيلات" value={formatDual(summary.collected.usd, summary.collected.syp)} tone="success" icon="fa-solid fa-hand-holding-dollar" />
        <StatTile label="المصاريف" value={formatDual(summary.expenses.usd, summary.expenses.syp)} tone="warning" icon="fa-solid fa-gas-pump" />
        <StatTile label="النقدية المفترضة" value={formatDual(summary.cashInHand.usd, summary.cashInHand.syp)} icon="fa-solid fa-wallet" />
        <StatTile label="ديون العملاء (حالياً)" value={formatDual(outstanding.usd, outstanding.syp)} tone="danger" icon="fa-solid fa-scale-balanced" />
      </Grid>

      {summary.orders.length === 0 ? (
        <EmptyState icon="fa-solid fa-chart-column" title="لا توجد حركة في هذه الفترة" text="غيّر الفترة لعرض بيانات أخرى." />
      ) : (
        <>
          <Section title="أفضل العملاء">
            <List>
              {topClients.map((row, index) => (
                <ListRow
                  key={row.id}
                  leading={<IconTile icon="fa-solid fa-crown" tone={index === 0 ? "warning" : "neutral"} />}
                  title={row.name}
                  subtitle={`${formatNumber(row.count)} فاتورة`}
                  trailing={<strong className="sl-amount">{formatDual(row.total.usd, row.total.syp)}</strong>}
                  chevron={false}
                />
              ))}
            </List>
          </Section>

          <Section title="الأصناف الأكثر مبيعاً">
            <List>
              {topProducts.map((row, index) => (
                <ListRow
                  key={row.id}
                  leading={<IconTile icon="fa-solid fa-box" tone={index === 0 ? "brand" : "neutral"} />}
                  title={row.name}
                  subtitle={row.qtyLabel}
                  trailing={<strong className="sl-amount">{formatDual(row.total.usd, row.total.syp)}</strong>}
                  chevron={false}
                />
              ))}
            </List>
          </Section>

          <Section title="الأداء حسب المنطقة">
            <List>
              {topTerritories.map((row) => (
                <ListRow
                  key={row.id}
                  leading={<IconTile icon="fa-solid fa-map-location-dot" tone="info" />}
                  title={row.name}
                  subtitle={`${formatNumber(row.count)} فاتورة`}
                  trailing={<strong className="sl-amount">{formatDual(row.total.usd, row.total.syp)}</strong>}
                  chevron={false}
                />
              ))}
            </List>
          </Section>
        </>
      )}
    </Page>
  );
}
