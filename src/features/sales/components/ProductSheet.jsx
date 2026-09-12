import { useId, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Field, FormGrid, Segmented, TextAreaField, TextField } from "../../../components/ui/Form";
import { Sheet } from "../../../components/ui/Sheet";
import { Stack } from "../../../components/ui/Page";
import { Callout } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import { saveProduct } from "../data/api";
import { useSales } from "../data/salesContext";
import { formatMoney } from "../domain/money";
import { PACKAGE_TYPES, baseUnitLabel, packageUnitLabel, packagingSummary } from "../domain/packaging";

const emptyForm = {
  name: "",
  category: "",
  unit: "قطعة",
  packageType: "piece",
  boxesPerCarton: "",
  itemsPerBox: "",
  priceUSD: "",
  priceSYP: "",
  wholesaleUSD: "",
  wholesaleSYP: "",
  lowStockThreshold: "",
  notes: "",
};

export default function ProductSheet({ product, onClose, onDelete }) {
  const { rate } = useSales();
  const toast = useToast();
  const formId = useId();
  const [form, setForm] = useState(() =>
    product
      ? {
          name: product.name || "",
          category: product.category || "",
          unit: product.unit || "قطعة",
          packageType: product.packageType || "piece",
          boxesPerCarton: product.boxesPerCarton ?? "",
          itemsPerBox: product.itemsPerBox ?? "",
          priceUSD: product.priceUSD ?? "",
          priceSYP: product.priceSYP ?? "",
          wholesaleUSD: product.wholesaleUSD ?? "",
          wholesaleSYP: product.wholesaleSYP ?? "",
          lowStockThreshold: product.lowStockThreshold ?? "",
          notes: product.notes || "",
        }
      : emptyForm,
  );

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const preview = { ...form };
  const unitOfPrice = packageUnitLabel(preview);
  const hasPrice = form.priceUSD !== "" || form.priceSYP !== "" || form.wholesaleUSD !== "" || form.wholesaleSYP !== "";
  const canSave = form.name.trim() && hasPrice;

  const submit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    const num = (v) => (v === "" ? null : Number(v));
    saveProduct(
      {
        name: form.name.trim(),
        category: form.category.trim(),
        unit: form.unit.trim() || "قطعة",
        packageType: form.packageType,
        boxesPerCarton: form.packageType === "carton" ? num(form.boxesPerCarton) : null,
        itemsPerBox: form.packageType !== "piece" ? num(form.itemsPerBox) : null,
        priceUSD: num(form.priceUSD),
        priceSYP: num(form.priceSYP),
        wholesaleUSD: num(form.wholesaleUSD),
        wholesaleSYP: num(form.wholesaleSYP),
        lowStockThreshold: num(form.lowStockThreshold),
        notes: form.notes.trim(),
        createdAt: product?.createdAt,
      },
      product?.id,
    );
    toast.success(product ? "تم حفظ المنتج" : "تمت إضافة المنتج");
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={product ? "تعديل المنتج" : "منتج جديد"}
      subtitle={product?.name}
      icon="fa-solid fa-box"
      size="lg"
      footer={
        <>
          {product && onDelete && (
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
        <Stack gap={18}>
          <FormGrid cols={2} keepCols>
            <TextField label="اسم المنتج" required value={form.name} onChange={set("name")} autoFocus />
            <TextField label="الفئة / الماركة" value={form.category} onChange={set("category")} placeholder="اختياري" />
          </FormGrid>

          <Field label="طريقة التعبئة" hint={packagingSummary(preview)}>
            <Segmented
              value={form.packageType}
              onChange={(value) => setForm((f) => ({ ...f, packageType: value }))}
              options={PACKAGE_TYPES.map((t) => ({ value: t.value, label: t.label, icon: t.icon }))}
              size="sm"
            />
          </Field>

          <FormGrid cols={2} keepCols>
            {form.packageType === "carton" && (
              <TextField
                label="عدد العلب داخل الكرتون"
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="اختياري"
                value={form.boxesPerCarton}
                onChange={set("boxesPerCarton")}
              />
            )}
            {form.packageType !== "piece" && (
              <TextField
                label={`عدد القطع داخل ${form.packageType === "carton" ? "كل علبة" : "العلبة"}`}
                type="number"
                inputMode="numeric"
                min="1"
                placeholder="اختياري"
                value={form.itemsPerBox}
                onChange={set("itemsPerBox")}
              />
            )}
            <TextField
              label={form.packageType === "piece" ? "اسم الوحدة" : "اسم القطعة الواحدة"}
              value={form.unit}
              onChange={set("unit")}
              placeholder="قطعة / كيلو..."
            />
          </FormGrid>

          {form.packageType !== "piece" && (
            <Callout tone="info">
              اترك خانة فارغة إذا لم تكن تبيع بهذا المستوى — عندها لن يظهر كوحدة بيع أو تحميل.
            </Callout>
          )}

          <Field label={`سعر المستهلك (المفرق) لكل ${unitOfPrice}`}>
            <FormGrid cols={2} keepCols>
              <TextField
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                suffix="$"
                placeholder={form.priceSYP && rate > 0 ? `≈ ${(Number(form.priceSYP) / rate).toFixed(2)}` : "0"}
                value={form.priceUSD}
                onChange={set("priceUSD")}
              />
              <TextField
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                suffix="ل.س"
                placeholder={form.priceUSD && rate > 0 ? `≈ ${Math.round(Number(form.priceUSD) * rate)}` : "0"}
                value={form.priceSYP}
                onChange={set("priceSYP")}
              />
            </FormGrid>
          </Field>

          <Field
            label={`سعر الجملة لكل ${unitOfPrice}`}
            hint="يُستخدم تلقائياً مع عملاء الجملة — إن تُرك فارغاً يُستخدم سعر المستهلك"
          >
            <FormGrid cols={2} keepCols>
              <TextField
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                suffix="$"
                placeholder={form.priceUSD ? `${formatMoney(Number(form.priceUSD), "USD")}` : "0"}
                value={form.wholesaleUSD}
                onChange={set("wholesaleUSD")}
              />
              <TextField
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                suffix="ل.س"
                placeholder={form.priceSYP ? `${Number(form.priceSYP)}` : "0"}
                value={form.wholesaleSYP}
                onChange={set("wholesaleSYP")}
              />
            </FormGrid>
          </Field>

          <TextField
            label={`حد التنبيه (${baseUnitLabel(preview)})`}
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="اختياري"
            value={form.lowStockThreshold}
            onChange={set("lowStockThreshold")}
            hint="ينبّهك في الصفحة الرئيسية عندما ينزل المخزون إلى هذا الحد"
          />

          <TextAreaField label="ملاحظات" value={form.notes} onChange={set("notes")} rows={2} placeholder="اختياري" />
        </Stack>
      </form>
    </Sheet>
  );
}
