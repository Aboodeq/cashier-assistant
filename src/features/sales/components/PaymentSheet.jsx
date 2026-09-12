import { useId, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Field, MoneyField, Segmented, TextAreaField, TextField } from "../../../components/ui/Form";
import { Sheet } from "../../../components/ui/Sheet";
import { Stack } from "../../../components/ui/Page";
import { Callout } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import { savePayment } from "../data/api";
import { useSales } from "../data/salesContext";
import { todayISO } from "../domain/dates";
import { balanceOf } from "../domain/ledger";
import { CURRENCIES, formatDualObj, formatMoney } from "../domain/money";
import { nextReceiptNo } from "../domain/numbering";
import ClientPicker from "./ClientPicker";

/** Record money collected from a client (تحصيل). */
export default function PaymentSheet({ payment, clientId, onClose, onSaved }) {
  const { clients, balances, payments } = useSales();
  const toast = useToast();
  const formId = useId();
  const [selectedId, setSelectedId] = useState(payment?.clientId || clientId || "");
  const [currency, setCurrency] = useState(payment?.currency || "SYP");
  const [amount, setAmount] = useState(payment ? String(payment.amount) : "");
  const [date, setDate] = useState(payment?.date || todayISO());
  const [notes, setNotes] = useState(payment?.notes || "");
  const [picking, setPicking] = useState(false);

  const client = clients.find((c) => c.id === selectedId);
  const balance = selectedId ? balanceOf(balances, selectedId) : null;
  const due = balance ? (currency === "USD" ? balance.usd : balance.syp) : 0;
  const canSave = Boolean(selectedId) && Number(amount) > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    savePayment(
      {
        clientId: selectedId,
        clientName: client?.name || "",
        currency,
        amount: Number(amount),
        date,
        notes: notes.trim(),
        receiptNo: payment?.receiptNo || nextReceiptNo(payments),
        createdAt: payment?.createdAt,
      },
      payment?.id,
    );
    toast.success(payment ? "تم تعديل الدفعة" : "تم تسجيل الدفعة");
    onSaved?.({
      id: payment?.id,
      clientId: selectedId,
      clientName: client?.name || "",
      currency,
      amount: Number(amount),
      date,
      notes: notes.trim(),
      receiptNo: payment?.receiptNo || nextReceiptNo(payments),
    });
    onClose();
  };

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title={payment ? "تعديل الدفعة" : "تسجيل دفعة"}
        icon="fa-solid fa-hand-holding-dollar"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" form={formId} icon="fa-solid fa-check" disabled={!canSave}>
              حفظ الدفعة
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={submit}>
          <Stack gap={16}>
            <Field label="العميل" required>
              <Button variant="secondary" block icon="fa-solid fa-users" onClick={() => setPicking(true)}>
                {client ? client.name : "اختر العميل"}
              </Button>
            </Field>

            {balance && (
              <Callout tone={due > 0 ? "warning" : "success"} icon="fa-solid fa-scale-balanced">
                الرصيد الحالي على العميل: <strong>{formatDualObj(balance, "لا يوجد رصيد مستحق")}</strong>
              </Callout>
            )}

            <Field label="العملة">
              <Segmented
                value={currency}
                onChange={setCurrency}
                options={CURRENCIES.map((c) => ({ value: c.value, label: c.label }))}
              />
            </Field>

            <MoneyField
              label="المبلغ المستلم"
              currency={currency}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              hint={due > 0 ? `المستحق بهذه العملة: ${formatMoney(due, currency)}` : undefined}
            />
            {due > 0 && (
              <Button variant="soft" size="sm" onClick={() => setAmount(String(due))} icon="fa-solid fa-equals">
                تحصيل كامل المستحق ({formatMoney(due, currency)})
              </Button>
            )}

            <TextField label="التاريخ" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <TextAreaField label="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="اختياري" />
          </Stack>
        </form>
      </Sheet>

      {picking && (
        <ClientPicker
          onClose={() => setPicking(false)}
          onPick={(c) => setSelectedId(c.id)}
          title="اختر العميل المُحصّل منه"
        />
      )}
    </>
  );
}
