import { useId, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Field, FormGrid, Segmented, SelectField, TextAreaField, TextField } from "../../../components/ui/Form";
import { Sheet } from "../../../components/ui/Sheet";
import { Stack } from "../../../components/ui/Page";
import { Callout } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import { useSales } from "../data/salesContext";
import { saveClient } from "../data/api";
import { nowMs } from "../domain/dates";
import { coordsLabel, getCurrentCoords, hasLocation, savedOnLabel } from "../domain/location";
import { CLIENT_CATEGORIES } from "../domain/catalog";
import { TIERS } from "../domain/pricing";

const emptyForm = {
  name: "",
  phone: "",
  type: "retail",
  category: "new",
  territoryId: "",
  address: "",
  notes: "",
  creditLimitUSD: "",
  creditLimitSYP: "",
};

export default function ClientFormSheet({ client, onClose, onSaved }) {
  const { territories } = useSales();
  const toast = useToast();
  const formId = useId();
  const [form, setForm] = useState(() =>
    client
      ? {
          name: client.name || "",
          phone: client.phone || "",
          type: client.type === "wholesale" ? "wholesale" : "retail",
          category: client.category || "new",
          territoryId: client.territoryId || "",
          address: client.address || "",
          notes: client.notes || "",
          creditLimitUSD: client.creditLimitUSD ?? "",
          creditLimitSYP: client.creditLimitSYP ?? "",
        }
      : emptyForm,
  );
  const [location, setLocation] = useState(client?.location || null);
  const [locating, setLocating] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const captureLocation = async () => {
    setLocating(true);
    try {
      const coords = await getCurrentCoords();
      setLocation({ ...coords, savedAt: nowMs() });
      toast.success("تم التقاط الموقع — سيُحفظ مع العميل");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLocating(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    const territory = territories.find((t) => t.id === form.territoryId);
    const payload = {
      name,
      phone: form.phone.trim(),
      type: form.type,
      category: form.category,
      territoryId: form.territoryId,
      territoryName: territory?.name || "",
      address: form.address.trim(),
      notes: form.notes.trim(),
      creditLimitUSD: form.creditLimitUSD === "" ? null : Number(form.creditLimitUSD),
      creditLimitSYP: form.creditLimitSYP === "" ? null : Number(form.creditLimitSYP),
      location: location || null,
    };
    const id = saveClient(payload, client?.id);
    toast.success(client ? "تم حفظ بيانات العميل" : "تمت إضافة العميل");
    onSaved?.(id);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={client ? "تعديل بيانات العميل" : "عميل جديد"}
      subtitle={client?.name}
      icon="fa-solid fa-user-pen"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" form={formId} icon="fa-solid fa-check" disabled={!form.name.trim()}>
            حفظ
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit}>
        <Stack gap={16}>
          <TextField label="اسم العميل / المحل" required value={form.name} onChange={set("name")} autoFocus />

          <Field label="نوع العميل" hint="يحدد فئة السعر المستخدمة تلقائياً في الفواتير">
            <Segmented
              value={form.type}
              onChange={(value) => setForm((f) => ({ ...f, type: value }))}
              options={TIERS.map((t) => ({ value: t.value, label: t.label, icon: t.icon }))}
            />
          </Field>

          <FormGrid cols={2} keepCols>
            <TextField label="الهاتف" type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} />
            <SelectField label="التصنيف" value={form.category} onChange={set("category")} options={CLIENT_CATEGORIES} />
          </FormGrid>

          <SelectField
            label="المنطقة"
            value={form.territoryId}
            onChange={set("territoryId")}
            placeholder="بدون منطقة"
            options={territories.map((t) => ({ value: t.id, label: t.name }))}
            hint={territories.length === 0 ? "يمكنك إضافة المناطق من صفحة العملاء ← تبويب المناطق" : undefined}
          />

          <TextField label="العنوان" value={form.address} onChange={set("address")} placeholder="اختياري" />

          <Field
            label="موقع المحل"
            hint="يُلتقط من GPS الهاتف ويفتح لاحقاً على خرائط جوجل لتحديد الطريق إليه"
          >
            {location ? (
              <Callout tone="success" icon="fa-solid fa-location-dot">
                <div>
                  محفوظ {savedOnLabel(location) && `(${savedOnLabel(location)})`} — {coordsLabel(location)}
                  {location.accuracy ? ` · دقة ±${location.accuracy} م` : ""}
                </div>
                <div className="sl-row-gap">
                  <Button size="sm" variant="secondary" loading={locating} onClick={captureLocation} icon="fa-solid fa-rotate">
                    تحديث الموقع
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setLocation(null)} icon="fa-solid fa-xmark">
                    إزالة
                  </Button>
                </div>
              </Callout>
            ) : (
              <Button
                variant="secondary"
                icon="fa-solid fa-location-crosshairs"
                loading={locating}
                onClick={captureLocation}
                block
              >
                التقاط الموقع الحالي
              </Button>
            )}
          </Field>

          <FormGrid cols={2} keepCols>
            <TextField
              label="سقف الدين (دولار)"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="اختياري"
              suffix="$"
              value={form.creditLimitUSD}
              onChange={set("creditLimitUSD")}
            />
            <TextField
              label="سقف الدين (ل.س)"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="اختياري"
              suffix="ل.س"
              value={form.creditLimitSYP}
              onChange={set("creditLimitSYP")}
            />
          </FormGrid>

          <TextAreaField label="ملاحظات" value={form.notes} onChange={set("notes")} placeholder="اختياري" rows={2} />

          {client && hasLocation(client) && !location && (
            <Callout tone="warning">سيتم حذف الموقع المحفوظ لهذا العميل عند الحفظ.</Callout>
          )}
        </Stack>
      </form>
    </Sheet>
  );
}
