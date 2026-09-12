import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { SearchInput, TextAreaField, TextField } from "../../../components/ui/Form";
import { Page, Section, Stack } from "../../../components/ui/Page";
import { Callout, Card, EmptyState } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import QtyByUnit from "../components/QtyByUnit";
import { saveLoad } from "../data/api";
import { useSales } from "../data/salesContext";
import { formatDate, nowMs, todayISO } from "../domain/dates";
import { formatNumber } from "../domain/money";
import { availableUnits, baseFromUnitMap, formatBaseQty, unitMapFromBase } from "../domain/packaging";
import { stockOf } from "../domain/stock";
import { usePrinter } from "../print/usePrinter";

/**
 * Load the van for the day (or return what's left) in one pass — quantities
 * for every product on one screen instead of one movement at a time.
 */
export default function LoadPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { products, loads, stock } = useSales();
  const printer = usePrinter();

  const type = params.get("type") === "return" ? "return" : "load";
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [term, setTerm] = useState("");
  const [qty, setQty] = useState({});

  const lastLoad = useMemo(
    () => loads.filter((l) => (l.type || "load") === type).sort((a, b) => (b.date > a.date ? 1 : -1))[0],
    [loads, type],
  );

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
  }, [products, term]);

  const lines = useMemo(() => {
    const result = [];
    for (const product of products) {
      const map = qty[product.id];
      if (!map) continue;
      for (const unit of availableUnits(product)) {
        const value = Number(map[unit.value]) || 0;
        if (value > 0) {
          result.push({
            productId: product.id,
            productName: product.name,
            unitLevel: unit.value,
            unit: unit.label,
            quantity: value,
          });
        }
      }
    }
    return result;
  }, [products, qty]);

  const touchedProducts = new Set(lines.map((l) => l.productId)).size;

  const fillFromLastLoad = () => {
    if (!lastLoad) return;
    const next = {};
    for (const line of lastLoad.lines || []) {
      next[line.productId] = {
        ...(next[line.productId] || {}),
        [line.unitLevel]: String((Number(next[line.productId]?.[line.unitLevel]) || 0) + Number(line.quantity || 0)),
      };
    }
    setQty(next);
    toast.info(`تم نسخ كميات ${type === "return" ? "آخر إرجاع" : "آخر تحميل"} (${formatDate(lastLoad.date)})`);
  };

  const fillFromStock = () => {
    const next = {};
    for (const product of products) {
      const current = stockOf(stock, product.id);
      if (current > 0) next[product.id] = unitMapFromBase(product, current);
    }
    setQty(next);
    toast.info("تم ملء الكميات بكامل المتبقي في السيارة");
  };

  const save = () => {
    if (lines.length === 0) return;
    const load = { type, date, notes: notes.trim(), lines, linesCount: lines.length };
    const moves = lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      type,
      unitLevel: line.unitLevel,
      unit: line.unit,
      quantity: line.quantity,
      date,
      notes: type === "return" ? "إرجاع للمستودع" : "تحميل على السيارة",
    }));
    saveLoad({ load, moves });
    toast.success(type === "return" ? "تم تسجيل الإرجاع" : "تم تسجيل التحميل", {
      action: { label: "طباعة الإذن", onClick: () => printer.printLoad({ ...load, createdAt: nowMs() }) },
    });
    navigate("/sales/stock");
  };

  return (
    <Page
      title={type === "return" ? "إرجاع بضاعة للمستودع" : "تحميل بضاعة اليوم"}
      subtitle={type === "return" ? "سجّل ما تُعيده من السيارة إلى المستودع" : "أدخل كميات اليوم لكل صنف دفعة واحدة"}
      back="/sales/stock"
      footer={
        <>
          <div className="sl-foot-total">
            <span>{type === "return" ? "سيتم إرجاع" : "سيتم تحميل"}</span>
            <strong>
              {formatNumber(touchedProducts)} صنف · {formatNumber(lines.length)} سطر
            </strong>
          </div>
          <Button size="lg" icon="fa-solid fa-check" onClick={save} disabled={lines.length === 0}>
            حفظ
          </Button>
        </>
      }
    >
      <Card>
        <Stack gap={14}>
          <TextField label="التاريخ" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="sl-row-gap">
            {lastLoad && (
              <Button variant="soft" icon="fa-solid fa-copy" onClick={fillFromLastLoad}>
                نسخ {type === "return" ? "آخر إرجاع" : "آخر تحميل"}
              </Button>
            )}
            {type === "return" && (
              <Button variant="soft" icon="fa-solid fa-truck-ramp-box" onClick={fillFromStock}>
                إرجاع كل المتبقي
              </Button>
            )}
            {lines.length > 0 && (
              <Button variant="ghost" icon="fa-solid fa-eraser" onClick={() => setQty({})}>
                تفريغ
              </Button>
            )}
          </div>
          <TextAreaField label="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="اختياري" />
        </Stack>
      </Card>

      {products.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-boxes-stacked"
          title="لا توجد منتجات"
          text="أضف منتجاتك أولاً حتى تتمكن من تحميلها على السيارة."
          action={<Button onClick={() => navigate("/sales/products")}>إدارة المنتجات</Button>}
        />
      ) : (
        <Section title="الأصناف">
          <Stack gap={10}>
            <SearchInput value={term} onChange={setTerm} placeholder="ابحث عن صنف..." />
            <Card padded={false}>
              {filtered.map((product) => {
                const entered = baseFromUnitMap(product, qty[product.id]);
                const current = stockOf(stock, product.id);
                return (
                  <div key={product.id} className="sl-load-row">
                    <div className="sl-load-info">
                      <div className="sl-load-name">{product.name}</div>
                      <div className="sl-muted">
                        في السيارة: {formatBaseQty(product, current)}
                        {entered > 0 && (
                          <>
                            {" · "}
                            <span className="sl-strong">
                              {type === "return" ? "إرجاع" : "تحميل"} {formatBaseQty(product, entered)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <QtyByUnit
                      product={product}
                      value={qty[product.id] || {}}
                      onChange={(map) => setQty((q) => ({ ...q, [product.id]: map }))}
                      ariaPrefix={product.name}
                    />
                  </div>
                );
              })}
              {filtered.length === 0 && <EmptyState compact title="لا توجد أصناف مطابقة" />}
            </Card>
            {type === "return" && lines.some((l) => {
              const product = products.find((p) => p.id === l.productId);
              return baseFromUnitMap(product, qty[l.productId]) > stockOf(stock, l.productId);
            }) && (
              <Callout tone="warning">
                بعض الكميات المُدخلة أكبر من المتوفر في السيارة — تحقق قبل الحفظ.
              </Callout>
            )}
          </Stack>
        </Section>
      )}
    </Page>
  );
}
