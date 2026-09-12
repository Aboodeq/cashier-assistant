import { useId, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { TextAreaField, TextField } from "../../../components/ui/Form";
import { Sheet } from "../../../components/ui/Sheet";
import { Stack } from "../../../components/ui/Page";
import { useToast } from "../../../components/ui/toastContext";
import { saveTerritory } from "../data/api";

export default function TerritorySheet({ territory, onClose, onDelete }) {
  const toast = useToast();
  const formId = useId();
  const [name, setName] = useState(territory?.name || "");
  const [notes, setNotes] = useState(territory?.notes || "");

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    saveTerritory({ name: name.trim(), notes: notes.trim(), createdAt: territory?.createdAt }, territory?.id);
    toast.success(territory ? "تم حفظ المنطقة" : "تمت إضافة المنطقة");
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={territory ? "تعديل المنطقة" : "منطقة جديدة"}
      icon="fa-solid fa-map-location-dot"
      size="sm"
      footer={
        <>
          {territory && onDelete && (
            <Button variant="danger-soft" icon="fa-solid fa-trash" onClick={onDelete}>
              حذف
            </Button>
          )}
          <Button type="submit" form={formId} icon="fa-solid fa-check" disabled={!name.trim()}>
            حفظ
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit}>
        <Stack gap={16}>
          <TextField label="اسم المنطقة" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <TextAreaField label="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="اختياري" />
        </Stack>
      </form>
    </Sheet>
  );
}
