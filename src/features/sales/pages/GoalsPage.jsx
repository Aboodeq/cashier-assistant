import { useMemo, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Grid, Page, Section, Stack } from "../../../components/ui/Page";
import { ConfirmDialog } from "../../../components/ui/Sheet";
import { Badge, Callout, Card, EmptyState, IconTile, KeyValue, List, ListRow, StatTile } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import GoalSheet from "../components/GoalSheet";
import { deleteGoal } from "../data/api";
import { useSales } from "../data/salesContext";
import { endOfMonth, formatMonthLabel, startOfMonth, thisMonthISO } from "../domain/dates";
import { cashSummary } from "../domain/ledger";
import { formatDual, formatMoney, formatNumber } from "../domain/money";

function monthRange(month) {
  return { from: `${month}-01`, to: endOfMonth(`${month}-01`) };
}

export default function GoalsPage() {
  const toast = useToast();
  const { goals, orders, payments, expenses } = useSales();
  const [sheet, setSheet] = useState(null);

  const current = thisMonthISO();
  const sorted = useMemo(() => [...goals].sort((a, b) => (a.month < b.month ? 1 : -1)), [goals]);
  const currentGoal = goals.find((g) => g.month === current);

  const summaryFor = (month) => {
    const { from, to } = monthRange(month);
    return cashSummary({ orders, payments, expenses }, from, to);
  };

  const currentSummary = useMemo(
    () => cashSummary({ orders, payments, expenses }, startOfMonth(), endOfMonth()),
    [orders, payments, expenses],
  );

  const commissionOf = (goal, summary) => {
    const rate = (Number(goal?.commissionRate) || 0) / 100;
    return { usd: summary.net.usd * rate, syp: summary.net.syp * rate };
  };

  const pct = (value, target) => (target > 0 ? Math.min(999, Math.round((value / target) * 100)) : null);

  return (
    <Page
      title="الأهداف والعمولات"
      subtitle={formatMonthLabel(current)}
      actions={
        <Button icon="fa-solid fa-plus" onClick={() => setSheet({ type: "new" })}>
          تحديد هدف
        </Button>
      }
    >
      {currentGoal ? (
        <Card title={`إنجاز ${formatMonthLabel(current)}`} icon="fa-solid fa-bullseye">
          <Stack gap={14}>
            {currentGoal.targetUSD > 0 && (
              <Progress
                label="الهدف بالدولار"
                value={currentSummary.net.usd}
                target={currentGoal.targetUSD}
                currency="USD"
              />
            )}
            {currentGoal.targetSYP > 0 && (
              <Progress
                label="الهدف بالليرة"
                value={currentSummary.net.syp}
                target={currentGoal.targetSYP}
                currency="SYP"
              />
            )}
            <KeyValue label="صافي المبيعات" value={formatDual(currentSummary.net.usd, currentSummary.net.syp)} />
            <KeyValue label="نسبة العمولة" value={`${formatNumber(currentGoal.commissionRate || 0)}%`} />
            <KeyValue
              label="العمولة المستحقة"
              value={formatDual(commissionOf(currentGoal, currentSummary).usd, commissionOf(currentGoal, currentSummary).syp)}
              strong
            />
            <div className="sl-row-gap">
              <Button size="sm" variant="secondary" icon="fa-solid fa-pen" onClick={() => setSheet({ type: "edit", goal: currentGoal })}>
                تعديل الهدف
              </Button>
            </div>
          </Stack>
        </Card>
      ) : (
        <Callout
          tone="brand"
          icon="fa-solid fa-bullseye"
          action={
            <Button size="sm" onClick={() => setSheet({ type: "new" })}>
              تحديد
            </Button>
          }
        >
          لم تحدّد هدفاً لشهر {formatMonthLabel(current)} بعد.
        </Callout>
      )}

      <Grid min={150}>
        <StatTile label="مبيعات الشهر" value={formatDual(currentSummary.sales.usd, currentSummary.sales.syp)} icon="fa-solid fa-file-invoice-dollar" />
        <StatTile label="تحصيلات الشهر" value={formatDual(currentSummary.collected.usd, currentSummary.collected.syp)} tone="success" icon="fa-solid fa-hand-holding-dollar" />
        <StatTile label="مرتجعات" value={formatDual(currentSummary.returns.usd, currentSummary.returns.syp)} tone="danger" icon="fa-solid fa-arrow-rotate-left" />
      </Grid>

      <Section title="سجل الأهداف">
        {sorted.length === 0 ? (
          <EmptyState icon="fa-solid fa-bullseye" title="لا توجد أهداف محددة" text="حدّد هدفاً شهرياً لتتابع إنجازك وعمولتك." />
        ) : (
          <List>
            {sorted.map((goal) => {
              const summary = summaryFor(goal.month);
              const commission = commissionOf(goal, summary);
              const usdPct = pct(summary.net.usd, goal.targetUSD);
              const sypPct = pct(summary.net.syp, goal.targetSYP);
              return (
                <ListRow
                  key={goal.id}
                  leading={<IconTile icon="fa-solid fa-calendar-check" tone={goal.month === current ? "brand" : "neutral"} />}
                  title={
                    <>
                      {formatMonthLabel(goal.month)}
                      {usdPct != null && <Badge tone={usdPct >= 100 ? "success" : "brand"}>{usdPct}% $</Badge>}
                      {sypPct != null && <Badge tone={sypPct >= 100 ? "success" : "brand"}>{sypPct}% ل.س</Badge>}
                    </>
                  }
                  subtitle={`صافي المبيعات: ${formatDual(summary.net.usd, summary.net.syp)}`}
                  meta={
                    <span>
                      <i className="fa-solid fa-percent" />
                      العمولة: {formatDual(commission.usd, commission.syp)}
                    </span>
                  }
                  onClick={() => setSheet({ type: "edit", goal })}
                />
              );
            })}
          </List>
        )}
      </Section>

      {(sheet?.type === "new" || sheet?.type === "edit") && (
        <GoalSheet
          goal={sheet.goal}
          onClose={() => setSheet(null)}
          onDelete={sheet.goal ? () => setSheet({ type: "delete", goal: sheet.goal }) : undefined}
        />
      )}
      <ConfirmDialog
        open={sheet?.type === "delete"}
        title="حذف الهدف؟"
        onCancel={() => setSheet(null)}
        onConfirm={() => {
          deleteGoal(sheet.goal.id);
          toast.success("تم حذف الهدف");
          setSheet(null);
        }}
      />
    </Page>
  );
}

function Progress({ label, value, target, currency }) {
  const percent = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div className="sl-progress">
      <div className="sl-progress-head">
        <span>{label}</span>
        <Badge tone={percent >= 100 ? "success" : "brand"}>{percent}%</Badge>
      </div>
      <div className="sl-progress-track">
        <div className={`sl-progress-fill ${percent >= 100 ? "is-done" : ""}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="sl-muted">
        {formatMoney(value, currency)} من {formatMoney(target, currency)}
      </div>
    </div>
  );
}
