import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Field, FormGrid, Segmented, TextAreaField, TextField } from "../../../components/ui/Form";
import { Page, Section, Stack } from "../../../components/ui/Page";
import { Callout, Card, KeyValue } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import { PRINT_FORMATS } from "../../../utils/print";
import { saveSettings } from "../data/api";
import { useSales } from "../data/salesContext";
import { formatDateTime, nowMs, todayISO } from "../domain/dates";
import { formatMoney, formatNumber } from "../domain/money";
import { usePrinter } from "../print/usePrinter";

export default function SettingsPage() {
  const toast = useToast();
  const sales = useSales();
  const { settings } = sales;
  const printer = usePrinter();

  const [rate, setRate] = useState(settings.usdToSyp ? String(settings.usdToSyp) : "");
  const [business, setBusiness] = useState({
    businessName: settings.businessName || "",
    businessPhone: settings.businessPhone || "",
    businessAddress: settings.businessAddress || "",
    repName: settings.repName || "",
    footerNote: settings.footerNote || "",
  });
  const [format, setFormat] = useState(settings.printFormat || "a4");

  const set = (field) => (e) => setBusiness((b) => ({ ...b, [field]: e.target.value }));

  const saveRate = (e) => {
    e.preventDefault();
    const value = Number(rate);
    if (!value || value <= 0) return;
    saveSettings({ usdToSyp: value });
    toast.success("تم حفظ سعر الصرف");
  };

  const saveBusiness = (e) => {
    e.preventDefault();
    saveSettings({
      businessName: business.businessName.trim(),
      businessPhone: business.businessPhone.trim(),
      businessAddress: business.businessAddress.trim(),
      repName: business.repName.trim(),
      footerNote: business.footerNote.trim(),
    });
    toast.success("تم حفظ بيانات الطباعة");
  };

  const changeFormat = (value) => {
    setFormat(value);
    saveSettings({ printFormat: value });
    toast.success("تم حفظ حجم الورق");
  };

  const exportBackup = () => {
    const data = {
      exportedAt: nowMs(),
      settings: sales.settings,
      territories: sales.territories,
      clients: sales.clients,
      products: sales.products,
      promotions: sales.promotions,
      orders: sales.orders,
      payments: sales.payments,
      moves: sales.moves,
      loads: sales.loads,
      counts: sales.counts,
      visits: sales.visits,
      expenses: sales.expenses,
      goals: sales.goals,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `نسخة-احتياطية-${todayISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("تم تنزيل نسخة احتياطية من بياناتك");
  };

  const testPrint = () => {
    printer.printStock(
      sales.products.slice(0, 5).map((product) => ({ product, qty: sales.stock.get(product.id) || 0, low: false })),
    );
  };

  return (
    <Page title="الإعدادات" subtitle="سعر الصرف وبيانات الطباعة والنسخ الاحتياطي">
      <Card title="سعر الصرف" icon="fa-solid fa-money-bill-transfer" subtitle="يُستخدم لتحويل الأسعار بين الدولار والليرة">
        <form onSubmit={saveRate}>
          <Stack gap={12}>
            <KeyValue
              label="السعر الحالي"
              value={settings.usdToSyp ? `$1 = ${formatMoney(settings.usdToSyp, "SYP")}` : "لم يُحدَّد بعد"}
              strong
            />
            <TextField
              label="كم ليرة مقابل 1 دولار"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="مثال: 15000"
              suffix="ل.س"
            />
            <Button type="submit" icon="fa-solid fa-check" disabled={!Number(rate)}>
              حفظ السعر
            </Button>
            {settings.updatedAt && <div className="sl-muted">آخر تحديث: {formatDateTime(settings.updatedAt)}</div>}
          </Stack>
        </form>
      </Card>

      <Card title="بيانات الطباعة" icon="fa-solid fa-file-invoice" subtitle="تظهر في ترويسة الفواتير وسندات القبض والكشوف">
        <form onSubmit={saveBusiness}>
          <Stack gap={14}>
            <FormGrid cols={2} keepCols>
              <TextField label="اسم المحل / الشركة" value={business.businessName} onChange={set("businessName")} placeholder="يظهر أعلى الفاتورة" />
              <TextField label="اسم المندوب" value={business.repName} onChange={set("repName")} />
            </FormGrid>
            <FormGrid cols={2} keepCols>
              <TextField label="هاتف" type="tel" inputMode="tel" value={business.businessPhone} onChange={set("businessPhone")} />
              <TextField label="العنوان" value={business.businessAddress} onChange={set("businessAddress")} />
            </FormGrid>
            <TextAreaField
              label="عبارة أسفل الفاتورة"
              value={business.footerNote}
              onChange={set("footerNote")}
              rows={2}
              placeholder="شكراً لتعاملكم معنا"
            />
            <Button type="submit" icon="fa-solid fa-check">
              حفظ بيانات الطباعة
            </Button>
          </Stack>
        </form>
      </Card>

      <Card title="الطباعة" icon="fa-solid fa-print" subtitle="يدعم الطابعات العادية وطابعات الإيصالات الحرارية">
        <Stack gap={14}>
          <Field label="حجم الورق" hint="اختر 80 أو 58 مم إذا كنت تستخدم طابعة إيصالات محمولة مع الهاتف">
            <Segmented value={format} onChange={changeFormat} options={PRINT_FORMATS.map((f) => ({ value: f.value, label: f.label }))} />
          </Field>
          <Callout tone="info">
            الطباعة تفتح نافذة الطباعة في المتصفح مباشرة — على أندرويد اختر الطابعة أو «حفظ كـ PDF» ثم شاركه عبر واتساب.
          </Callout>
          <Button variant="secondary" icon="fa-solid fa-vial" onClick={testPrint} disabled={sales.products.length === 0}>
            تجربة الطباعة
          </Button>
        </Stack>
      </Card>

      <Section title="بياناتك">
        <Card>
          <Stack gap={12}>
            <KeyValue label="العملاء" value={formatNumber(sales.clients.length)} />
            <KeyValue label="المنتجات" value={formatNumber(sales.products.length)} />
            <KeyValue label="الفواتير" value={formatNumber(sales.orders.length)} />
            <KeyValue label="حركات المخزون" value={formatNumber(sales.moves.length)} />
            <Button variant="secondary" icon="fa-solid fa-download" onClick={exportBackup}>
              تنزيل نسخة احتياطية (JSON)
            </Button>
            <Callout tone="info">
              بياناتك محفوظة في حسابك على الإنترنت وتُزامَن تلقائياً، وتعمل أيضاً بدون اتصال ويُرسل ما سجّلته عند عودة
              الشبكة.
            </Callout>
          </Stack>
        </Card>
      </Section>
    </Page>
  );
}
