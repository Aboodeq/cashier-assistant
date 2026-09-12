import { useId, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { FormGrid, TextAreaField, TextField } from "../../../components/ui/Form";
import { Sheet } from "../../../components/ui/Sheet";
import { Stack } from "../../../components/ui/Page";
import { Callout } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import { saveGoal } from "../data/api";
import { thisMonthISO } from "../domain/dates";

/** Monthly sales target + commission rate. The document id is the month. */
export default function GoalSheet({ goal, onClose, onDelete }) {
  const toast = useToast();
  const formId = useId();
  const [month, setMonth] = useState(goal?.month || thisMonthISO());
  const [form, setForm] = useState({
    targetUSD: goal?.targetUSD ?? "",
    targetSYP: goal?.targetSYP ?? "",
    commissionRate: goal?.commissionRate ?? "",
    notes: goal?.notes || "",
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const canSave = month && (Number(form.targetUSD) > 0 || Number(form.targetSYP) > 0 || Number(form.commissionRate) > 0);

  const submit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    const num = (v) => (v === "" ? 0 : Number(v));
    saveGoal(
      {
        month,
        targetUSD: num(form.targetUSD),
        targetSYP: num(form.targetSYP),
        commissionRate: num(form.commissionRate),
        notes: form.notes.trim(),
        createdAt: goal?.createdAt,
      },
      month,
    );
    toast.success("تم حفظ الهدف");
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={goal ? "تعديل هدف الشهر" : "تحديد هدف شهر"}
      icon="fa-solid fa-bullseye"
      footer={
        <>
          {goal && onDelete && (
            <Button variant="danger-soft" icon="fa-solid fa-trash" onClick={onDelete}>
              حذف
            </Button>
          )}
          <Button type="submit" form={formId} icon="fa-solid fa-check" disabled={!canSave}>
            حفظ
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit}>
        <Stack gap={16}>
          <TextField
            label="الشهر"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            disabled={Boolean(goal)}
            required
          />
          <FormGrid cols={2} keepCols>
            <TextField
              label="الهدف بالدولار"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              suffix="$"
              placeholder="اختياري"
              value={form.targetUSD}
              onChange={set("targetUSD")}
            />
            <TextField
              label="الهدف بالليرة"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              suffix="ل.س"
              placeholder="اختياري"
              value={form.targetSYP}
              onChange={set("targetSYP")}
            />
          </FormGrid>
          <TextField
            label="نسبة العمولة"
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            step="any"
            suffix="%"
            value={form.commissionRate}
            onChange={set("commissionRate")}
            hint="تُحتسب على صافي مبيعات الشهر (المبيعات ناقص المرتجعات)"
          />
          <Callout tone="info">حدّد الهدف بالعملة التي تتعامل بها فعلياً — يمكنك ترك الأخرى فارغة.</Callout>
          <TextAreaField label="ملاحظات" value={form.notes} onChange={set("notes")} rows={2} placeholder="اختياري" />
        </Stack>
      </form>
    </Sheet>
  );
}
