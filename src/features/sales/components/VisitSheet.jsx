import { useId, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Field, Segmented, Switch, TextAreaField, TextField } from "../../../components/ui/Form";
import { Sheet } from "../../../components/ui/Sheet";
import { Stack } from "../../../components/ui/Page";
import { useToast } from "../../../components/ui/toastContext";
import { saveVisit, setClientLocation } from "../data/api";
import { useSales } from "../data/salesContext";
import { todayISO } from "../domain/dates";
import { VISIT_OUTCOMES } from "../domain/catalog";
import { getCurrentCoords, hasLocation } from "../domain/location";
import ClientPicker from "./ClientPicker";

export default function VisitSheet({ visit, clientId, onClose, onSaved }) {
  const { clients } = useSales();
  const toast = useToast();
  const formId = useId();
  const [selectedId, setSelectedId] = useState(visit?.clientId || clientId || "");
  const [date, setDate] = useState(visit?.date || todayISO());
  const [outcome, setOutcome] = useState(visit?.outcome || "successful");
  const [followUpDate, setFollowUpDate] = useState(visit?.followUpDate || "");
  const [notes, setNotes] = useState(visit?.notes || "");
  const [picking, setPicking] = useState(false);
  const [captureChoice, setCaptureChoice] = useState(null);

  const client = clients.find((c) => c.id === selectedId);
  // Default to capturing for a client with no saved location yet — the first
  // visit is the natural moment — and off afterwards so a visit logged from
  // elsewhere can't silently overwrite a good location.
  const capture = captureChoice ?? (!visit && Boolean(client) && !hasLocation(client));

  const submit = (e) => {
    e.preventDefault();
    if (!selectedId) return;
    // Start the GPS request inside the tap itself: some mobile browsers only
    // show the permission prompt for gesture-initiated requests.
    const locationTask = capture && !visit ? getCurrentCoords() : null;
    saveVisit(
      {
        clientId: selectedId,
        clientName: client?.name || "",
        territoryId: client?.territoryId || "",
        territoryName: client?.territoryName || "",
        date,
        outcome,
        followUpDate,
        followUpDone: visit?.followUpDone || false,
        notes: notes.trim(),
        createdAt: visit?.createdAt,
      },
      visit?.id,
    );
    if (locationTask) {
      locationTask
        .then((coords) => {
          setClientLocation(selectedId, coords);
          toast.success(`تم تسجيل الزيارة وحفظ موقع "${client?.name || ""}"`);
        })
        .catch((error) => toast.error(`تم تسجيل الزيارة، لكن تعذّر حفظ الموقع: ${error.message}`));
    } else {
      toast.success(visit ? "تم تعديل الزيارة" : "تم تسجيل الزيارة");
    }
    onSaved?.();
    onClose();
  };

  return (
    <>
      <Sheet
        open
        onClose={onClose}
        title={visit ? "تعديل الزيارة" : "تسجيل زيارة"}
        icon="fa-solid fa-route"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" form={formId} icon="fa-solid fa-check" disabled={!selectedId}>
              حفظ
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

            <Field label="نتيجة الزيارة">
              <Segmented
                value={outcome}
                onChange={setOutcome}
                options={VISIT_OUTCOMES.map((o) => ({ value: o.value, label: o.label }))}
                size="sm"
              />
            </Field>

            <TextField label="التاريخ" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <TextField
              label="تاريخ المتابعة"
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              hint="اتركه فارغاً إن لم تكن هناك متابعة مطلوبة"
            />

            {!visit && client && (
              <Switch
                checked={capture}
                onChange={setCaptureChoice}
                label="حفظ موقع المحل من GPS"
                hint={
                  hasLocation(client)
                    ? "للعميل موقع محفوظ — التفعيل سيستبدله بموقعك الحالي"
                    : "يُلتقط موقعك الحالي ويُحفظ في ملف العميل"
                }
              />
            )}

            <TextAreaField label="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="اختياري" />
          </Stack>
        </form>
      </Sheet>

      {picking && (
        <ClientPicker
          onClose={() => setPicking(false)}
          onPick={(c) => {
            setSelectedId(c.id);
            setPicking(false);
          }}
        />
      )}
    </>
  );
}
