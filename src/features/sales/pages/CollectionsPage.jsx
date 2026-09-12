import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, IconButton } from "../../../components/ui/Button";
import { SearchInput } from "../../../components/ui/Form";
import { Grid, Page, Stack, Tabs } from "../../../components/ui/Page";
import { ConfirmDialog } from "../../../components/ui/Sheet";
import { Avatar, Badge, Callout, EmptyState, IconTile, List, ListRow, StatTile } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import PaymentSheet from "../components/PaymentSheet";
import { deletePayment } from "../data/api";
import { useSales } from "../data/salesContext";
import { formatDate, startOfMonth, todayISO } from "../domain/dates";
import { balanceOf, hasDebt, totalOutstanding } from "../domain/ledger";
import { formatDual, formatDualObj, formatMoney, formatNumber, rankValue } from "../domain/money";
import { receiptNo } from "../domain/numbering";
import { usePrinter } from "../print/usePrinter";

export default function CollectionsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { clients, payments, balances, rate } = useSales();
  const printer = usePrinter();
  const [tab, setTab] = useState("balances");
  const [term, setTerm] = useState("");
  const [sheet, setSheet] = useState(null);

  const debtors = useMemo(() => {
    const q = term.trim().toLowerCase();
    return clients
      .map((client) => ({ client, balance: balanceOf(balances, client.id) }))
      .filter((row) => hasDebt(row.balance))
      .filter((row) => !q || row.client.name?.toLowerCase().includes(q))
      .sort((a, b) => rankValue(b.balance, rate) - rankValue(a.balance, rate));
  }, [clients, balances, term, rate]);

  const outstanding = useMemo(() => totalOutstanding(balances), [balances]);
  const monthStart = startOfMonth();
  const collectedThisMonth = useMemo(
    () =>
      payments
        .filter((p) => p.date >= monthStart)
        .reduce(
          (acc, p) => ({
            usd: acc.usd + (p.currency === "USD" ? p.amount || 0 : 0),
            syp: acc.syp + (p.currency === "SYP" ? p.amount || 0 : 0),
          }),
          { usd: 0, syp: 0 },
        ),
    [payments, monthStart],
  );
  const collectedToday = useMemo(() => {
    const today = todayISO();
    return payments
      .filter((p) => p.date === today)
      .reduce(
        (acc, p) => ({
          usd: acc.usd + (p.currency === "USD" ? p.amount || 0 : 0),
          syp: acc.syp + (p.currency === "SYP" ? p.amount || 0 : 0),
        }),
        { usd: 0, syp: 0 },
      );
  }, [payments]);

  const history = useMemo(() => {
    const q = term.trim().toLowerCase();
    return payments.filter((p) => !q || p.clientName?.toLowerCase().includes(q)).slice(0, 150);
  }, [payments, term]);

  return (
    <Page
      title="التحصيلات"
      subtitle={`${formatNumber(debtors.length)} عميل عليه رصيد`}
      actions={
        <Button icon="fa-solid fa-plus" onClick={() => setSheet({ type: "new" })}>
          تسجيل دفعة
        </Button>
      }
    >
      <Grid min={160}>
        <StatTile label="إجمالي الديون" value={formatDual(outstanding.usd, outstanding.syp)} tone="danger" icon="fa-solid fa-scale-balanced" />
        <StatTile label="محصّل اليوم" value={formatDual(collectedToday.usd, collectedToday.syp)} tone="success" icon="fa-solid fa-hand-holding-dollar" />
        <StatTile label="محصّل هذا الشهر" value={formatDual(collectedThisMonth.usd, collectedThisMonth.syp)} icon="fa-solid fa-calendar-check" />
      </Grid>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "balances", label: "الأرصدة المستحقة", count: debtors.length },
          { value: "history", label: "سجل الدفعات", count: payments.length },
        ]}
      />

      <SearchInput value={term} onChange={setTerm} placeholder="ابحث باسم العميل..." />

      {tab === "balances" ? (
        debtors.length === 0 ? (
          <EmptyState icon="fa-solid fa-circle-check" title="لا توجد ديون" text="كل العملاء مسددون — أحسنت!" />
        ) : (
          <List>
            {debtors.map(({ client, balance }) => (
              <ListRow
                key={client.id}
                leading={<Avatar name={client.name} />}
                title={client.name}
                subtitle={client.territoryName || "بدون منطقة"}
                trailing={
                  <>
                    <strong className="sl-amount sl-amount--danger">{formatDualObj(balance)}</strong>
                    <Button size="sm" variant="success-soft" onClick={() => setSheet({ type: "new", clientId: client.id })}>
                      تحصيل
                    </Button>
                  </>
                }
                onClick={() => navigate(`/sales/clients/${client.id}`)}
                chevron={false}
              />
            ))}
          </List>
        )
      ) : history.length === 0 ? (
        <EmptyState icon="fa-solid fa-receipt" title="لا توجد دفعات مسجّلة" />
      ) : (
        <Stack gap={10}>
          <Callout tone="info">اضغط على أي دفعة لطباعة سند القبض أو تعديلها.</Callout>
          <List>
            {history.map((payment) => (
              <ListRow
                key={payment.id}
                leading={<IconTile icon="fa-solid fa-receipt" tone="success" />}
                title={
                  <>
                    {payment.clientName}
                    {payment.orderId && <Badge tone="brand">مع فاتورة</Badge>}
                  </>
                }
                subtitle={`سند ${receiptNo(payment)} · ${formatDate(payment.date)}`}
                trailing={
                  <>
                    <strong className="sl-amount">{formatMoney(payment.amount, payment.currency)}</strong>
                    <div className="sl-row-actions">
                      <IconButton
                        icon="fa-solid fa-print"
                        label="طباعة السند"
                        size="sm"
                        variant="soft"
                        onClick={() => printer.printReceipt(payment)}
                      />
                      <IconButton
                        icon="fa-solid fa-pen"
                        label="تعديل"
                        size="sm"
                        variant="secondary"
                        onClick={() => setSheet({ type: "edit", payment })}
                      />
                      <IconButton
                        icon="fa-solid fa-trash"
                        label="حذف"
                        size="sm"
                        variant="danger-soft"
                        onClick={() => setSheet({ type: "delete", payment })}
                      />
                    </div>
                  </>
                }
                chevron={false}
              />
            ))}
          </List>
        </Stack>
      )}

      {(sheet?.type === "new" || sheet?.type === "edit") && (
        <PaymentSheet
          payment={sheet.payment}
          clientId={sheet.clientId}
          onClose={() => setSheet(null)}
          onSaved={(payment) =>
            toast.success(sheet.type === "edit" ? "تم تعديل الدفعة" : "تم تسجيل الدفعة", {
              action: { label: "طباعة السند", onClick: () => printer.printReceipt(payment) },
            })
          }
        />
      )}

      <ConfirmDialog
        open={sheet?.type === "delete"}
        title="حذف الدفعة؟"
        message="سيعود المبلغ إلى رصيد العميل المستحق."
        onCancel={() => setSheet(null)}
        onConfirm={() => {
          deletePayment(sheet.payment.id);
          toast.success("تم حذف الدفعة");
          setSheet(null);
        }}
      />
    </Page>
  );
}
