import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { SearchInput, Switch, TextAreaField, TextField } from "../../../components/ui/Form";
import { Grid, Page, Section, Stack } from "../../../components/ui/Page";
import { ConfirmDialog } from "../../../components/ui/Sheet";
import { Badge, Callout, Card, EmptyState, StatTile } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import QtyByUnit from "../components/QtyByUnit";
import { saveCount } from "../data/api";
import { useSales } from "../data/salesContext";
import { nowMs, todayISO } from "../domain/dates";
import { cashSummary } from "../domain/ledger";
import { formatDual, formatNumber } from "../domain/money";
import { baseFromUnitMap, baseLevel, baseUnitLabel, formatBaseQty, unitMapFromBase } from "../domain/packaging";
import { stockOf } from "../domain/stock";
import { usePrinter } from "../print/usePrinter";

/**
 * End-of-day check: count what's actually left in the van, compare with what
 * the system expects, and post corrections so tomorrow starts accurate.
 */
export default function CountPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { products, stock, orders, payments, expenses } = useSales();
  const printer = usePrinter();

  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [term, setTerm] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [counted, setCounted] = useState({});
  const [confirming, setConfirming] = useState(false);

  const today = todayISO();
  const summary = useMemo(
    () => cashSummary({ orders, payments, expenses }, today, today),
    [orders, payments, expenses, today],
  );

  const rows = useMemo(() => {
    const q = term.trim().toLowerCase();
    return products
      .map((product) => {
        const expected = stockOf(stock, product.id);
        const entry = counted[product.id];
        const hasEntry = entry != null;
        const actual = hasEntry ? baseFromUnitMap(product, entry) : expected;
        return { product, expected, actual, diff: actual - expected, counted: hasEntry };
      })
      .filter((row) => (showAll ? true : Math.abs(row.expected) > 0.0001 || row.counted))
      .filter((row) => !q || row.product.name?.toLowerCase().includes(q));
  }, [products, stock, counted, showAll, term]);

  const allRows = useMemo(
    () =>
      products
        .map((product) => {
          const expected = stockOf(stock, product.id);
          const entry = counted[product.id];
          const hasEntry = entry != null;
          const actual = hasEntry ? baseFromUnitMap(product, entry) : expected;
          return { product, expected, actual, diff: actual - expected, counted: hasEntry };
        })
        .filter((row) => Math.abs(row.expected) > 0.0001 || row.counted),
    [products, stock, counted],
  );

  const stats = useMemo(() => {
    const shortage = allRows.filter((r) => r.diff < -0.0001).length;
    const surplus = allRows.filter((r) => r.diff > 0.0001).length;
    return { shortage, surplus, matched: allRows.length - shortage - surplus, untouched: allRows.filter((r) => !r.counted).length };
  }, [allRows]);

  const markMatched = (product, expected) =>
    setCounted((c) => ({ ...c, [product.id]: unitMapFromBase(product, expected) }));

  const markAllMatched = () => {
    const next = {};
    for (const row of allRows) next[row.product.id] = unitMapFromBase(row.product, row.expected);
    setCounted(next);
    toast.info("تم اعتماد جميع الأصناف كمطابقة");
  };

  const save = () => {
    const lines = allRows.map((row) => ({
      productId: row.product.id,
      productName: row.product.name,
      baseUnit: baseUnitLabel(row.product),
      expected: Math.round(row.expected * 100) / 100,
      counted: Math.round(row.actual * 100) / 100,
      diff: Math.round(row.diff * 100) / 100,
    }));
    const count = {
      date,
      notes: notes.trim(),
      lines,
      linesCount: lines.length,
      shortageCount: stats.shortage,
      surplusCount: stats.surplus,
    };
    const moves = allRows
      .filter((row) => Math.abs(row.diff) > 0.0001)
      .map((row) => ({
        productId: row.product.id,
        productName: row.product.name,
        type: "adjust",
        unitLevel: baseLevel(row.product),
        unit: baseUnitLabel(row.product),
        quantity: Math.round(row.diff * 100) / 100,
        date,
        notes: row.diff < 0 ? "عجز في الجرد" : "زيادة في الجرد",
      }));
    saveCount({ count, moves });
    toast.success("تم حفظ الجرد وتسوية المخزون", {
      action: { label: "طباعة التقرير", onClick: () => printer.printCount({ ...count, createdAt: nowMs() }, summary) },
    });
    navigate("/sales/stock");
  };

  return (
    <Page
      title="جرد نهاية اليوم"
      subtitle="تأكد من مطابقة البضاعة الموجودة فعلياً في السيارة"
      back="/sales/stock"
      footer={
        <>
          <div className="sl-foot-total">
            <span>النتيجة</span>
            <strong>
              {formatNumber(stats.matched)} مطابق · {formatNumber(stats.shortage)} عجز · {formatNumber(stats.surplus)} زيادة
            </strong>
          </div>
          <Button
            size="lg"
            icon="fa-solid fa-check"
            onClick={() => (stats.untouched > 0 ? setConfirming(true) : save())}
            disabled={allRows.length === 0}
          >
            حفظ الجرد
          </Button>
        </>
      }
    >
      <Card>
        <Stack gap={14}>
          <TextField label="تاريخ الجرد" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="sl-row-gap">
            <Button variant="soft" icon="fa-solid fa-check-double" onClick={markAllMatched}>
              اعتماد الكل كمطابق
            </Button>
            {Object.keys(counted).length > 0 && (
              <Button variant="ghost" icon="fa-solid fa-eraser" onClick={() => setCounted({})}>
                تفريغ
              </Button>
            )}
          </div>
          <Switch
            checked={showAll}
            onChange={setShowAll}
            label="إظهار كل الأصناف"
            hint="افتراضياً تظهر الأصناف التي يوجد منها رصيد فقط"
          />
        </Stack>
      </Card>

      <Grid min={150}>
        <StatTile label="مطابق" value={formatNumber(stats.matched)} tone="success" icon="fa-solid fa-circle-check" />
        <StatTile label="عجز" value={formatNumber(stats.shortage)} tone="danger" icon="fa-solid fa-arrow-trend-down" />
        <StatTile label="زيادة" value={formatNumber(stats.surplus)} tone="warning" icon="fa-solid fa-arrow-trend-up" />
        <StatTile label="لم يُجرد بعد" value={formatNumber(stats.untouched)} tone="neutral" icon="fa-solid fa-hourglass-half" />
      </Grid>

      <Section title="الأصناف">
        <Stack gap={10}>
          <SearchInput value={term} onChange={setTerm} placeholder="ابحث عن صنف..." />
          {rows.length === 0 ? (
            <Card>
              <EmptyState
                compact
                icon="fa-solid fa-clipboard-check"
                title="لا توجد أصناف للجرد"
                text="لا يوجد رصيد في السيارة حالياً — فعّل «إظهار كل الأصناف» للجرد الكامل."
              />
            </Card>
          ) : (
            <Card padded={false}>
              {rows.map((row) => (
                <div key={row.product.id} className={`sl-count-row ${row.counted ? "is-counted" : ""}`}>
                  <div className="sl-load-info">
                    <div className="sl-load-name">{row.product.name}</div>
                    <div className="sl-muted">المتوقع: {formatBaseQty(row.product, row.expected)}</div>
                    {row.counted && (
                      <div className="sl-count-diff">
                        {Math.abs(row.diff) < 0.0001 ? (
                          <Badge tone="success" icon="fa-solid fa-check">
                            مطابق
                          </Badge>
                        ) : (
                          <Badge tone={row.diff < 0 ? "danger" : "warning"}>
                            {row.diff < 0 ? "عجز" : "زيادة"} {formatBaseQty(row.product, Math.abs(row.diff))}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="sl-count-inputs">
                    <QtyByUnit
                      product={row.product}
                      value={counted[row.product.id] || {}}
                      onChange={(map) => setCounted((c) => ({ ...c, [row.product.id]: map }))}
                      ariaPrefix={row.product.name}
                    />
                    <Button size="sm" variant="ghost" onClick={() => markMatched(row.product, row.expected)}>
                      مطابق
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </Stack>
      </Section>

      <Card title="ملخص نقدية اليوم" icon="fa-solid fa-wallet" subtitle="لتسليم البضاعة والنقدية معاً">
        <Stack gap={8}>
          <Callout tone="info">
            مبيعات نقدية {formatDual(summary.cashSales.usd, summary.cashSales.syp)} + تحصيلات{" "}
            {formatDual(summary.collected.usd, summary.collected.syp)} − مصاريف{" "}
            {formatDual(summary.expenses.usd, summary.expenses.syp)}
          </Callout>
          <div className="sl-cash-line">
            <span>النقدية المفترضة معك</span>
            <strong>{formatDual(summary.cashInHand.usd, summary.cashInHand.syp)}</strong>
          </div>
        </Stack>
      </Card>

      <TextAreaField label="ملاحظات الجرد" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="اختياري" />

      <ConfirmDialog
        open={confirming}
        tone="brand"
        icon="fa-solid fa-clipboard-check"
        title="حفظ الجرد؟"
        message={`${formatNumber(stats.untouched)} صنف لم تُدخل له كمية فعلية وسيُعتبر مطابقاً للمتوقع.`}
        confirmLabel="متابعة والحفظ"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          save();
        }}
      />
    </Page>
  );
}
