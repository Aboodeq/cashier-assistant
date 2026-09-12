import { useId, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Field, Segmented, SelectField, TextAreaField, TextField } from "../../../components/ui/Form";
import { Sheet } from "../../../components/ui/Sheet";
import { Stack } from "../../../components/ui/Page";
import { useToast } from "../../../components/ui/toastContext";
import { saveMove } from "../data/api";
import { useSales } from "../data/salesContext";
import { todayISO } from "../domain/dates";
import { availableUnits, defaultUnit, unitLabel } from "../domain/packaging";

/** A single manual load/return movement (the bulk screens handle whole runs). */
export default function MoveSheet({ move, onClose, onDelete }) {
  const { products } = useSales();
  const toast = useToast();
  const formId = useId();
  const [productId, setProductId] = useState(move?.productId || products[0]?.id || "");
  const [type, setType] = useState(move?.type || "load");
  const [unitLevel, setUnitLevel] = useState(move?.unitLevel || "");
  const [quantity, setQuantity] = useState(move ? String(move.quantity) : "");
  const [date, setDate] = useState(move?.date || todayISO());
  const [notes, setNotes] = useState(move?.notes || "");

  const product = products.find((p) => p.id === productId);
  const units = product ? availableUnits(product) : [];
  const effectiveUnit = unitLevel || (product ? defaultUnit(product) : "piece");
  const canSave = Boolean(productId) && Number(quantity) > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    saveMove(
      {
        productId,
        productName: product?.name || "",
        type,
        unitLevel: effectiveUnit,
        unit: unitLabel(product, effectiveUnit),
        quantity: Number(quantity),
        date,
        notes: notes.trim(),
        createdAt: move?.createdAt,
      },
      move?.id,
    );
    toast.success(move ? "تم حفظ الحركة" : "تم تسجيل الحركة");
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={move ? "تعديل حركة المخزون" : "حركة مخزون"}
      icon="fa-solid fa-clock-rotate-left"
      footer={
        <>
          {move && onDelete && (
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
          <Field label="نوع الحركة">
            <Segmented
              value={type}
              onChange={setType}
              options={[
                { value: "load", label: "تحميل على السيارة", icon: "fa-solid fa-dolly" },
                { value: "return", label: "إرجاع للمستودع", icon: "fa-solid fa-rotate-left" },
              ]}
            />
          </Field>

          <SelectField
            label="الصنف"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              setUnitLevel("");
            }}
            options={products.map((p) => ({ value: p.id, label: p.name }))}
            required
          />

          {units.length > 1 && (
            <Field label="الوحدة">
              <Segmented
                value={effectiveUnit}
                onChange={setUnitLevel}
                options={units.map((u) => ({ value: u.value, label: u.label }))}
                size="sm"
              />
            </Field>
          )}

          <TextField
            label="الكمية"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
          <TextField label="التاريخ" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <TextAreaField label="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="اختياري" />
        </Stack>
      </form>
    </Sheet>
  );
}
