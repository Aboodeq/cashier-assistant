import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Field, Input, Segmented, Stepper, TextField } from "../../../components/ui/Form";
import { Sheet } from "../../../components/ui/Sheet";
import { Stack } from "../../../components/ui/Page";
import { Callout, KeyValue } from "../../../components/ui/Surface";
import { CURRENCIES, formatMoney, formatNumber } from "../domain/money";
import { availableUnits, formatBaseQty, packagingSummary, toBaseQty, unitLabel } from "../domain/packaging";
import { buildLine, evaluatePromo, lineBaseQty, promoLabel, unitPrice } from "../domain/pricing";

/**
 * Add or edit one invoice line: unit, quantity, currency and price, with any
 * company promotion applied automatically.
 */
export default function LineSheet({
  product,
  promo,
  tier,
  rate,
  line,
  available = 0,
  isReturn = false,
  onSave,
  onRemove,
  onClose,
}) {
  const units = availableUnits(product);
  const [unitLevel, setUnitLevel] = useState(line?.unitLevel || units[0].value);
  const [currency, setCurrency] = useState(line?.currency || "SYP");
  const [quantity, setQuantity] = useState(line ? String(line.quantity) : "1");
  const [price, setPrice] = useState(
    line ? String(line.price) : String(unitPrice(product, { tier, currency: "SYP", unitLevel: units[0].value, rate })),
  );
  const [manualDiscountPct, setManualDiscountPct] = useState(line?.manualDiscountPct ? String(line.manualDiscountPct) : "");
  const [priceTouched, setPriceTouched] = useState(false);

  const repriceFor = (nextUnit, nextCurrency) => {
    if (priceTouched) return;
    setPrice(String(unitPrice(product, { tier, currency: nextCurrency, unitLevel: nextUnit, rate })));
  };

  const draft = buildLine({
    product,
    unitLevel,
    quantity,
    price,
    currency,
    promo,
    manualDiscountPct,
  });
  const evaluated = evaluatePromo(promo, product, unitLevel, quantity);
  const neededBase = lineBaseQty(product, draft);
  const overStock = !isReturn && neededBase > available + 0.0001;
  const canSave = Number(quantity) > 0 && Number(price) >= 0;

  return (
    <Sheet
      open
      onClose={onClose}
      title={product.name}
      subtitle={packagingSummary(product)}
      icon="fa-solid fa-box"
      footer={
        <>
          {onRemove && (
            <Button variant="danger-soft" icon="fa-solid fa-trash" onClick={onRemove}>
              حذف
            </Button>
          )}
          <Button icon="fa-solid fa-check" disabled={!canSave} onClick={() => onSave(draft)}>
            {line ? "حفظ التعديل" : "إضافة للفاتورة"}
          </Button>
        </>
      }
    >
      <Stack gap={16}>
        {units.length > 1 && (
          <Field label="الوحدة">
            <Segmented
              value={unitLevel}
              onChange={(value) => {
                setUnitLevel(value);
                repriceFor(value, currency);
              }}
              options={units.map((u) => ({ value: u.value, label: u.label }))}
            />
          </Field>
        )}

        <Field
          label="الكمية"
          hint={
            isReturn
              ? "كمية المرتجع من العميل"
              : `المتوفر في السيارة: ${formatBaseQty(product, available)}`
          }
        >
          <Stepper value={quantity} onChange={setQuantity} min={0} ariaLabel="الكمية" />
        </Field>

        <Field label="العملة">
          <Segmented
            value={currency}
            onChange={(value) => {
              setCurrency(value);
              repriceFor(unitLevel, value);
            }}
            options={CURRENCIES.map((c) => ({ value: c.value, label: c.label }))}
          />
        </Field>

        <TextField
          label={`السعر لكل ${unitLabel(product, unitLevel)}`}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={price}
          suffix={currency === "USD" ? "$" : "ل.س"}
          onChange={(e) => {
            setPrice(e.target.value);
            setPriceTouched(true);
          }}
          hint={`سعر ${tier === "wholesale" ? "الجملة" : "المفرق"} المقترح: ${formatMoney(
            unitPrice(product, { tier, currency, unitLevel, rate }),
            currency,
          )}`}
        />

        {promo && (
          <Callout tone={evaluated.applies ? "success" : "warning"} icon="fa-solid fa-tags">
            <strong>{promo.title || "عرض الشركة"}</strong> — {promoLabel(promo, product)}
            {!evaluated.applies && evaluated.missingBase > 0 && (
              <div>يلزم {formatBaseQty(product, evaluated.missingBase)} إضافية لتفعيل العرض</div>
            )}
            {evaluated.applies && draft.freeQty > 0 && (
              <div>
                سيتم تسليم <strong>{formatNumber(draft.freeQty)} {draft.freeUnit}</strong> مجاناً مع هذا الصنف
              </div>
            )}
          </Callout>
        )}

        <Field label="خصم إضافي (%)" hint="اتركه فارغاً إن لم يكن هناك خصم يدوي">
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            step="any"
            placeholder="0"
            suffix="%"
            value={manualDiscountPct}
            onChange={(e) => setManualDiscountPct(e.target.value)}
          />
        </Field>

        {overStock && (
          <Callout tone="warning">
            الكمية المطلوبة ({formatBaseQty(product, neededBase)}) أكبر من المتوفر في السيارة — يمكنك المتابعة وسيظهر
            العجز في الجرد.
          </Callout>
        )}

        <div className="sl-line-total">
          <KeyValue label="الإجمالي قبل الخصم" value={formatMoney(draft.grossTotal, currency)} />
          {draft.discount > 0 && (
            <KeyValue
              label={`الخصم (${formatNumber(draft.discountPct)}%)`}
              value={`- ${formatMoney(draft.discount, currency)}`}
            />
          )}
          <KeyValue label="إجمالي السطر" value={formatMoney(draft.lineTotal, currency)} strong />
          <KeyValue
            label="يخرج من السيارة"
            value={formatBaseQty(product, toBaseQty(product, unitLevel, quantity) + (draft.freeQty ? toBaseQty(product, draft.freeUnitLevel, draft.freeQty) : 0))}
          />
        </div>
      </Stack>
    </Sheet>
  );
}
