import { useMemo, useState } from "react";
import { Button, IconButton } from "../../../components/ui/Button";
import { Chip, Grid, Page, Stack, Toolbar } from "../../../components/ui/Page";
import { ConfirmDialog } from "../../../components/ui/Sheet";
import { Badge, EmptyState, IconTile, List, ListRow, StatTile } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import ExpenseSheet from "../components/ExpenseSheet";
import { EXPENSE_CATEGORIES, expenseCategory } from "../domain/catalog";
import { deleteExpense } from "../data/api";
import { useSales } from "../data/salesContext";
import { formatDate, startOfMonth, startOfWeek, todayISO } from "../domain/dates";
import { formatDual, formatMoney, formatNumber } from "../domain/money";

const PERIODS = [
  { value: "week", label: "هذا الأسبوع" },
  { value: "month", label: "هذا الشهر" },
  { value: "all", label: "الكل" },
];

const sumDual = (list) =>
  list.reduce(
    (acc, e) => ({
      usd: acc.usd + (e.currency === "USD" ? e.amount || 0 : 0),
      syp: acc.syp + (e.currency === "SYP" ? e.amount || 0 : 0),
    }),
    { usd: 0, syp: 0 },
  );

export default function ExpensesPage() {
  const toast = useToast();
  const { expenses } = useSales();
  const [period, setPeriod] = useState("month");
  const [category, setCategory] = useState("");
  const [sheet, setSheet] = useState(null);

  const from = period === "week" ? startOfWeek() : period === "month" ? startOfMonth() : "";
  const filtered = useMemo(
    () =>
      expenses
        .filter((e) => (from ? e.date >= from : true))
        .filter((e) => (category ? e.category === category : true))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [expenses, from, category],
  );

  const totals = useMemo(() => sumDual(filtered), [filtered]);
  const todayTotal = useMemo(() => sumDual(expenses.filter((e) => e.date === todayISO())), [expenses]);
  const byCategory = useMemo(
    () =>
      EXPENSE_CATEGORIES.map((c) => ({ ...c, total: sumDual(filtered.filter((e) => e.category === c.value)) })).filter(
        (c) => c.total.usd > 0 || c.total.syp > 0,
      ),
    [filtered],
  );
  const lastOdometer = useMemo(
    () => expenses.map((e) => Number(e.odometer) || 0).reduce((max, n) => Math.max(max, n), 0),
    [expenses],
  );

  return (
    <Page
      title="مصاريف السيارة"
      subtitle="وقود وصيانة ومصاريف التشغيل اليومية"
      actions={
        <Button icon="fa-solid fa-plus" onClick={() => setSheet({ type: "new" })}>
          تسجيل مصروف
        </Button>
      }
    >
      <Grid min={150}>
        <StatTile label="مصاريف الفترة" value={formatDual(totals.usd, totals.syp)} tone="warning" icon="fa-solid fa-gas-pump" />
        <StatTile label="مصاريف اليوم" value={formatDual(todayTotal.usd, todayTotal.syp)} icon="fa-solid fa-calendar-day" />
        {lastOdometer > 0 && (
          <StatTile label="آخر قراءة عداد" value={`${formatNumber(lastOdometer)} كم`} tone="info" icon="fa-solid fa-gauge-high" />
        )}
      </Grid>

      <Stack gap={10}>
        <Toolbar>
          {PERIODS.map((p) => (
            <Chip key={p.value} active={period === p.value} onClick={() => setPeriod(p.value)}>
              {p.label}
            </Chip>
          ))}
        </Toolbar>
        <Toolbar>
          <Chip active={!category} onClick={() => setCategory("")}>
            كل الأنواع
          </Chip>
          {EXPENSE_CATEGORIES.map((c) => (
            <Chip key={c.value} icon={c.icon} active={category === c.value} onClick={() => setCategory(c.value)}>
              {c.label}
            </Chip>
          ))}
        </Toolbar>
      </Stack>

      {byCategory.length > 0 && (
        <Grid min={160}>
          {byCategory.map((c) => (
            <StatTile key={c.value} label={c.label} value={formatDual(c.total.usd, c.total.syp)} icon={c.icon} tone="neutral" />
          ))}
        </Grid>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-gas-pump"
          title="لا توجد مصاريف"
          text="سجّل مصاريف السيارة لتظهر ضمن حساب النقدية اليومية."
          action={
            <Button icon="fa-solid fa-plus" onClick={() => setSheet({ type: "new" })}>
              تسجيل مصروف
            </Button>
          }
        />
      ) : (
        <List>
          {filtered.map((expense) => {
            const meta = expenseCategory(expense.category);
            return (
              <ListRow
                key={expense.id}
                leading={<IconTile icon={meta.icon} tone="warning" />}
                title={
                  <>
                    {meta.label}
                    {expense.odometer != null && <Badge tone="neutral">{formatNumber(expense.odometer)} كم</Badge>}
                  </>
                }
                subtitle={`${formatDate(expense.date)}${expense.notes ? ` · ${expense.notes}` : ""}`}
                trailing={
                  <>
                    <strong className="sl-amount">{formatMoney(expense.amount, expense.currency)}</strong>
                    <div className="sl-row-actions">
                      <IconButton icon="fa-solid fa-pen" label="تعديل" size="sm" variant="secondary" onClick={() => setSheet({ type: "edit", expense })} />
                    </div>
                  </>
                }
                chevron={false}
              />
            );
          })}
        </List>
      )}

      {(sheet?.type === "new" || sheet?.type === "edit") && (
        <ExpenseSheet
          expense={sheet.expense}
          onClose={() => setSheet(null)}
          onDelete={sheet.expense ? () => setSheet({ type: "delete", expense: sheet.expense }) : undefined}
        />
      )}
      <ConfirmDialog
        open={sheet?.type === "delete"}
        title="حذف المصروف؟"
        onCancel={() => setSheet(null)}
        onConfirm={() => {
          deleteExpense(sheet.expense.id);
          toast.success("تم حذف المصروف");
          setSheet(null);
        }}
      />
    </Page>
  );
}
