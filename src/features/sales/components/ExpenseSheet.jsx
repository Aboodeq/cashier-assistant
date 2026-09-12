import { useId, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Field, MoneyField, Segmented, TextAreaField, TextField } from "../../../components/ui/Form";
import { Sheet } from "../../../components/ui/Sheet";
import { Chip, Stack, Toolbar } from "../../../components/ui/Page";
import { useToast } from "../../../components/ui/toastContext";
import { saveExpense } from "../data/api";
import { todayISO } from "../domain/dates";
import { EXPENSE_CATEGORIES, expenseCategory } from "../domain/catalog";
import { CURRENCIES } from "../domain/money";

export default function ExpenseSheet({ expense, onClose, onDelete }) {
  const toast = useToast();
  const formId = useId();
  const [category, setCategory] = useState(expense?.category || "fuel");
  const [currency, setCurrency] = useState(expense?.currency || "SYP");
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [odometer, setOdometer] = useState(expense?.odometer ?? "");
  const [date, setDate] = useState(expense?.date || todayISO());
  const [notes, setNotes] = useState(expense?.notes || "");

  const submit = (e) => {
    e.preventDefault();
    if (!Number(amount)) return;
    saveExpense(
      {
        category,
        categoryLabel: expenseCategory(category).label,
        currency,
        amount: Number(amount),
        odometer: odometer === "" ? null : Number(odometer),
        date,
        notes: notes.trim(),
        createdAt: expense?.createdAt,
      },
      expense?.id,
    );
    toast.success(expense ? "تم حفظ المصروف" : "تم تسجيل المصروف");
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={expense ? "تعديل المصروف" : "تسجيل مصروف"}
      icon="fa-solid fa-gas-pump"
      footer={
        <>
          {expense && onDelete && (
            <Button variant="danger-soft" icon="fa-solid fa-trash" onClick={onDelete}>
              حذف
            </Button>
          )}
          <Button type="submit" form={formId} icon="fa-solid fa-check" disabled={!Number(amount)}>
            حفظ
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit}>
        <Stack gap={16}>
          <Field label="نوع المصروف">
            <Toolbar>
              {EXPENSE_CATEGORIES.map((c) => (
                <Chip key={c.value} icon={c.icon} active={category === c.value} onClick={() => setCategory(c.value)}>
                  {c.label}
                </Chip>
              ))}
            </Toolbar>
          </Field>

          <Field label="العملة">
            <Segmented value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c.value, label: c.label }))} />
          </Field>

          <MoneyField label="المبلغ" currency={currency} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <TextField label="التاريخ" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <TextField
            label="قراءة العداد (كم)"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="اختياري"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
          />
          <TextAreaField label="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="اختياري" />
        </Stack>
      </form>
    </Sheet>
  );
}
