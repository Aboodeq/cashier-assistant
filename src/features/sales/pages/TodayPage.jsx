import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, IconButton } from "../../../components/ui/Button";
import { Grid, Page, Section, Stack } from "../../../components/ui/Page";
import { Badge, Callout, Card, EmptyState, IconTile, List, ListRow, StatTile } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import PaymentSheet from "../components/PaymentSheet";
import VisitSheet from "../components/VisitSheet";
import { setVisitFollowUpDone } from "../data/api";
import { useSales } from "../data/salesContext";
import { formatDate, greeting, relativeDay, thisMonthISO, todayISO } from "../domain/dates";
import { cashSummary, totalOutstanding } from "../domain/ledger";
import { formatDual, formatNumber } from "../domain/money";
import { formatBaseQty } from "../domain/packaging";
import { directionsUrl, hasLocation } from "../domain/location";
import { isLowStock, stockOf } from "../domain/stock";
import { usePrinter } from "../print/usePrinter";

const QUICK_ACTIONS = [
  { to: "/sales/invoices/new", icon: "fa-solid fa-cart-plus", label: "فاتورة بيع", tone: "brand" },
  { action: "pay", icon: "fa-solid fa-hand-holding-dollar", label: "تحصيل دفعة", tone: "success" },
  { action: "visit", icon: "fa-solid fa-route", label: "تسجيل زيارة", tone: "info" },
  { to: "/sales/stock/load", icon: "fa-solid fa-dolly", label: "تحميل بضاعة", tone: "warning" },
  { to: "/sales/stock/count", icon: "fa-solid fa-clipboard-check", label: "جرد نهاية اليوم", tone: "neutral" },
  { to: "/sales/invoices/new?kind=return", icon: "fa-solid fa-arrow-rotate-left", label: "مرتجع", tone: "danger" },
];

export default function TodayPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const sales = useSales();
  const { orders, payments, expenses, visits, products, clients, stock, loads, counts, balances, goals } = sales;
  const printer = usePrinter();
  const [sheet, setSheet] = useState(null);

  const today = todayISO();
  const summary = useMemo(
    () => cashSummary({ orders, payments, expenses }, today, today),
    [orders, payments, expenses, today],
  );
  const outstanding = useMemo(() => totalOutstanding(balances), [balances]);

  const loadedToday = loads.some((l) => l.date === today && l.type !== "return");
  const countedToday = counts.some((c) => c.date === today);
  const visitsToday = visits.filter((v) => v.date === today);

  const followUps = useMemo(
    () =>
      visits
        .filter((v) => v.followUpDate && !v.followUpDone && v.followUpDate <= today)
        .sort((a, b) => (a.followUpDate < b.followUpDate ? -1 : 1))
        .slice(0, 5),
    [visits, today],
  );

  const lowStock = useMemo(
    () => products.filter((p) => isLowStock(p, stockOf(stock, p.id))).slice(0, 5),
    [products, stock],
  );

  const goal = goals.find((g) => g.month === thisMonthISO());
  const monthSummary = useMemo(
    () => cashSummary({ orders, payments, expenses }, `${thisMonthISO()}-01`, `${thisMonthISO()}-31`),
    [orders, payments, expenses],
  );

  const recent = orders.slice(0, 4);

  const step = (done, label, hint, to, icon) => (
    <button type="button" className={`sl-step ${done ? "is-done" : ""}`} onClick={() => navigate(to)}>
      <span className="sl-step-ico">
        <i className={done ? "fa-solid fa-circle-check" : icon} />
      </span>
      <span className="sl-step-text">
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <i className="fa-solid fa-chevron-left sl-step-chev" />
    </button>
  );

  return (
    <Page
      title={`${greeting()}${sales.settings.repName ? `، ${sales.settings.repName}` : ""}`}
      subtitle={formatDate(today, { weekday: true })}
      actions={<IconButton icon="fa-solid fa-gear" label="الإعدادات" variant="secondary" onClick={() => navigate("/sales/settings")} />}
    >
      {/* Day workflow */}
      <Card title="خطوات اليوم" icon="fa-solid fa-list-check" padded={false}>
        <div className="sl-steps">
          {step(
            loadedToday,
            "تحميل البضاعة",
            loadedToday ? "تم التحميل اليوم" : "حمّل بضاعة اليوم دفعة واحدة",
            "/sales/stock/load",
            "fa-solid fa-dolly",
          )}
          {step(
            orders.some((o) => o.date === today),
            "البيع والزيارات",
            `${formatNumber(summary.salesCount)} فاتورة · ${formatNumber(visitsToday.length)} زيارة`,
            "/sales/invoices/new",
            "fa-solid fa-cart-shopping",
          )}
          {step(
            countedToday,
            "جرد نهاية اليوم",
            countedToday ? "تم الجرد اليوم" : "تأكد من مطابقة البضاعة والنقدية",
            "/sales/stock/count",
            "fa-solid fa-clipboard-check",
          )}
        </div>
      </Card>

      {/* Today's numbers */}
      <Grid min={150}>
        <StatTile label="مبيعات اليوم" value={formatDual(summary.sales.usd, summary.sales.syp)} icon="fa-solid fa-file-invoice-dollar" />
        <StatTile label="تحصيلات اليوم" value={formatDual(summary.collected.usd, summary.collected.syp)} tone="success" icon="fa-solid fa-hand-holding-dollar" />
        <StatTile
          label="النقدية معك"
          value={formatDual(summary.cashInHand.usd, summary.cashInHand.syp)}
          sub="مبيعات نقدية + تحصيلات − مصاريف"
          tone="warning"
          icon="fa-solid fa-wallet"
        />
        <StatTile
          label="ديون العملاء"
          value={formatDual(outstanding.usd, outstanding.syp)}
          tone="danger"
          icon="fa-solid fa-scale-balanced"
          onClick={() => navigate("/sales/collections")}
        />
      </Grid>

      {/* Quick actions */}
      <Section title="إجراءات سريعة">
        <div className="sl-quick">
          {QUICK_ACTIONS.map((q) => (
            <button
              key={q.label}
              type="button"
              className="sl-quick-btn"
              onClick={() => (q.to ? navigate(q.to) : setSheet({ type: q.action }))}
            >
              <IconTile icon={q.icon} tone={q.tone} size={42} />
              <span>{q.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Follow-ups */}
      {followUps.length > 0 && (
        <Section title="متابعات مستحقة" actions={<Button size="sm" variant="ghost" onClick={() => navigate("/sales/visits")}>الكل</Button>}>
          <List>
            {followUps.map((visit) => {
              const client = clients.find((c) => c.id === visit.clientId);
              return (
                <ListRow
                  key={visit.id}
                  leading={<IconTile icon="fa-solid fa-bell" tone="warning" />}
                  title={visit.clientName}
                  subtitle={`متابعة ${relativeDay(visit.followUpDate)}`}
                  chevron={false}
                  trailing={
                    <div className="sl-row-actions">
                      {client && hasLocation(client) && (
                        <IconButton
                          icon="fa-solid fa-diamond-turn-right"
                          label="الطريق"
                          variant="soft"
                          size="sm"
                          href={directionsUrl(client.location)}
                          target="_blank"
                        />
                      )}
                      <IconButton
                        icon="fa-solid fa-check"
                        label="تمت المتابعة"
                        variant="success-soft"
                        size="sm"
                        onClick={() => {
                          setVisitFollowUpDone(visit.id, true);
                          toast.success("تم تعليم المتابعة كمنجزة");
                        }}
                      />
                    </div>
                  }
                />
              );
            })}
          </List>
        </Section>
      )}

      {/* Low stock */}
      {lowStock.length > 0 && (
        <Section title="مخزون منخفض" actions={<Button size="sm" variant="ghost" onClick={() => navigate("/sales/stock")}>المخزون</Button>}>
          <List>
            {lowStock.map((product) => (
              <ListRow
                key={product.id}
                leading={<IconTile icon="fa-solid fa-triangle-exclamation" tone="danger" />}
                title={product.name}
                subtitle={`المتبقي: ${formatBaseQty(product, stockOf(stock, product.id))}`}
                onClick={() => navigate("/sales/stock/load")}
              />
            ))}
          </List>
        </Section>
      )}

      {/* Monthly goal */}
      {goal && (goal.targetUSD > 0 || goal.targetSYP > 0) && (
        <Card title="هدف الشهر" icon="fa-solid fa-bullseye" actions={<Button size="sm" variant="ghost" onClick={() => navigate("/sales/goals")}>تفاصيل</Button>}>
          <Stack gap={10}>
            {goal.targetUSD > 0 && (
              <ProgressLine label="بالدولار" value={monthSummary.net.usd} target={goal.targetUSD} currency="USD" />
            )}
            {goal.targetSYP > 0 && (
              <ProgressLine label="بالليرة" value={monthSummary.net.syp} target={goal.targetSYP} currency="SYP" />
            )}
          </Stack>
        </Card>
      )}

      {/* Recent invoices */}
      <Section title="آخر الفواتير" actions={<Button size="sm" variant="ghost" onClick={() => navigate("/sales/invoices")}>الكل</Button>}>
        {recent.length === 0 ? (
          <Card>
            <EmptyState
              compact
              icon="fa-solid fa-file-invoice-dollar"
              title="لم تسجّل فواتير بعد"
              action={<Button icon="fa-solid fa-plus" onClick={() => navigate("/sales/invoices/new")}>فاتورة جديدة</Button>}
            />
          </Card>
        ) : (
          <List>
            {recent.map((order) => (
              <ListRow
                key={order.id}
                onClick={() => navigate(`/sales/invoices/${order.id}`)}
                title={order.clientName}
                subtitle={`${relativeDay(order.date)} · ${formatNumber(order.items?.length || 0)} صنف`}
                trailing={<strong className="sl-amount">{formatDual(order.totalUSD, order.totalSYP)}</strong>}
              />
            ))}
          </List>
        )}
      </Section>

      {countedToday && (
        <Callout
          tone="success"
          icon="fa-solid fa-clipboard-check"
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const count = counts.find((c) => c.date === today);
                printer.printCount(count, summary);
              }}
            >
              طباعة
            </Button>
          }
        >
          تم إنجاز جرد اليوم — يمكنك طباعة تقرير نهاية اليوم.
        </Callout>
      )}

      {sheet?.type === "pay" && (
        <PaymentSheet
          onClose={() => setSheet(null)}
          onSaved={(payment) =>
            toast.success("تم تسجيل الدفعة", {
              action: { label: "طباعة السند", onClick: () => printer.printReceipt(payment) },
            })
          }
        />
      )}
      {sheet?.type === "visit" && <VisitSheet onClose={() => setSheet(null)} />}
    </Page>
  );
}

function ProgressLine({ label, value, target, currency }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div className="sl-progress">
      <div className="sl-progress-head">
        <span>{label}</span>
        <span>
          <Badge tone={pct >= 100 ? "success" : "brand"}>{pct}%</Badge>
        </span>
      </div>
      <div className="sl-progress-track">
        <div className={`sl-progress-fill ${pct >= 100 ? "is-done" : ""}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="sl-muted">
        {formatDual(currency === "USD" ? value : 0, currency === "SYP" ? value : 0)} من{" "}
        {formatDual(currency === "USD" ? target : 0, currency === "SYP" ? target : 0)}
      </div>
    </div>
  );
}
