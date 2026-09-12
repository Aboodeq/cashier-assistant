import { useId, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Field, FormGrid, Segmented, Switch, TextAreaField, TextField } from "../../../components/ui/Form";
import { Sheet } from "../../../components/ui/Sheet";
import { Stack } from "../../../components/ui/Page";
import { Callout } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import { savePromotion } from "../data/api";
import { useSales } from "../data/salesContext";
import { todayISO } from "../domain/dates";
import { availableUnits, defaultUnit } from "../domain/packaging";
import { PROMO_AUDIENCES, PROMO_TYPES, promoLabel } from "../domain/pricing";
import ProductPicker from "./ProductPicker";

/** Company offers: a percentage discount, or free goods on a quantity. */
export default function PromotionSheet({ promotion, onClose, onDelete }) {
  const { products } = useSales();
  const toast = useToast();
  const formId = useId();
  const [productId, setProductId] = useState(promotion?.productId || "");
  const [form, setForm] = useState(() => ({
    title: promotion?.title || "",
    type: promotion?.type || "percent",
    percent: promotion?.percent ?? "",
    minQty: promotion?.minQty ?? "",
    buyQty: promotion?.buyQty ?? "",
    freeQty: promotion?.freeQty ?? "",
    unitLevel: promotion?.unitLevel || "",
    appliesTo: promotion?.appliesTo || "all",
    startDate: promotion?.startDate || todayISO(),
    endDate: promotion?.endDate || "",
    notes: promotion?.notes || "",
  }));
  const [active, setActive] = useState(promotion?.active !== false);
  const [picking, setPicking] = useState(false);

  const product = products.find((p) => p.id === productId);
  const units = product ? availableUnits(product) : [];
  const unitLevel = form.unitLevel || (product ? defaultUnit(product) : "");
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const preview = product
    ? promoLabel(
        {
          type: form.type,
          percent: form.percent,
          minQty: form.minQty,
          buyQty: form.buyQty,
          freeQty: form.freeQty,
          unitLevel,
        },
        product,
      )
    : "";

  const canSave =
    Boolean(productId) &&
    (form.type === "percent" ? Number(form.percent) > 0 : Number(form.buyQty) > 0 && Number(form.freeQty) > 0);

  const submit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    const num = (v) => (v === "" ? null : Number(v));
    savePromotion(
      {
        title: form.title.trim() || preview,
        productId,
        productName: product?.name || "",
        type: form.type,
        percent: form.type === "percent" ? num(form.percent) : null,
        minQty: form.type === "percent" ? num(form.minQty) : null,
        buyQty: form.type === "bonus" ? num(form.buyQty) : null,
        freeQty: form.type === "bonus" ? num(form.freeQty) : null,
        unitLevel,
        appliesTo: form.appliesTo,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        active,
        notes: form.notes.trim(),
        createdAt: promotion?.createdAt,
      },
      promotion?.id,
    );
    toast.success(promotion ? "تم حفظ العرض" : "تمت إضافة العرض");
    onClose();
  };

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title={promotion ? "تعديل العرض" : "عرض جديد"}
        icon="fa-solid fa-tags"
        footer={
          <>
            {promotion && onDelete && (
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
            <Field label="الصنف" required>
              <Button variant="secondary" block icon="fa-solid fa-boxes-stacked" onClick={() => setPicking(true)}>
                {product ? product.name : "اختر الصنف"}
              </Button>
            </Field>

            <Field label="نوع العرض">
              <Segmented
                value={form.type}
                onChange={(value) => setForm((f) => ({ ...f, type: value }))}
                options={PROMO_TYPES.map((t) => ({ value: t.value, label: t.label, icon: t.icon }))}
              />
            </Field>

            {units.length > 1 && (
              <Field label="وحدة العرض" hint="الوحدة التي تُحسب بها كميات العرض">
                <Segmented
                  value={unitLevel}
                  onChange={(value) => setForm((f) => ({ ...f, unitLevel: value }))}
                  options={units.map((u) => ({ value: u.value, label: u.label }))}
                  size="sm"
                />
              </Field>
            )}

            {form.type === "percent" ? (
              <FormGrid cols={2} keepCols>
                <TextField
                  label="نسبة الخصم"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="any"
                  suffix="%"
                  value={form.percent}
                  onChange={set("percent")}
                  required
                />
                <TextField
                  label="أقل كمية"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="اختياري"
                  value={form.minQty}
                  onChange={set("minQty")}
                />
              </FormGrid>
            ) : (
              <FormGrid cols={2} keepCols>
                <TextField
                  label="عند شراء"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={form.buyQty}
                  onChange={set("buyQty")}
                  required
                />
                <TextField
                  label="الكمية المجانية"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={form.freeQty}
                  onChange={set("freeQty")}
                  required
                />
              </FormGrid>
            )}

            {preview && <Callout tone="brand" icon="fa-solid fa-gift">{preview}</Callout>}

            <Field label="يطبّق على">
              <Segmented
                value={form.appliesTo}
                onChange={(value) => setForm((f) => ({ ...f, appliesTo: value }))}
                options={PROMO_AUDIENCES}
                size="sm"
              />
            </Field>

            <FormGrid cols={2} keepCols>
              <TextField label="من تاريخ" type="date" value={form.startDate} onChange={set("startDate")} />
              <TextField label="إلى تاريخ" type="date" value={form.endDate} onChange={set("endDate")} hint="اتركه فارغاً لعرض مفتوح" />
            </FormGrid>

            <TextField label="اسم العرض" value={form.title} onChange={set("title")} placeholder={preview || "اختياري"} />
            <Switch checked={active} onChange={setActive} label="العرض مفعّل" hint="أوقفه مؤقتاً دون حذفه" />
            <TextAreaField label="ملاحظات" value={form.notes} onChange={set("notes")} rows={2} placeholder="اختياري" />
          </Stack>
        </form>
      </Sheet>

      {picking && (
        <ProductPicker
          onClose={() => setPicking(false)}
          onPick={(p) => {
            setProductId(p.id);
            setPicking(false);
          }}
        />
      )}
    </>
  );
}
