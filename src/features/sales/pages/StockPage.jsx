import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, IconButton } from "../../../components/ui/Button";
import { SearchInput } from "../../../components/ui/Form";
import { Chip, Grid, Page, Stack, Tabs, Toolbar } from "../../../components/ui/Page";
import { ConfirmDialog, Sheet } from "../../../components/ui/Sheet";
import { Badge, Callout, EmptyState, IconTile, KeyValue, List, ListRow, StatTile } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import MoveSheet from "../components/MoveSheet";
import { deleteCount, deleteLoad, deleteMove } from "../data/api";
import { useSales } from "../data/salesContext";
import { formatDate, formatShortDate, relativeDay } from "../domain/dates";
import { formatNumber } from "../domain/money";
import { baseUnitLabel, formatBaseQty, formatUnitQty } from "../domain/packaging";
import { isLowStock, isManualMove, moveMeta, stockOf } from "../domain/stock";
import { usePrinter } from "../print/usePrinter";

const MOVE_FILTERS = [
  { value: "all", label: "الكل" },
  { value: "load", label: "تحميل" },
  { value: "sale", label: "بيع" },
  { value: "return", label: "إرجاع" },
  { value: "adjust", label: "تسويات" },
];

export default function StockPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { products, moves, loads, counts, stock, productById } = useSales();
  const printer = usePrinter();
  const [tab, setTab] = useState("stock");
  const [term, setTerm] = useState("");
  const [moveFilter, setMoveFilter] = useState("all");
  const [sheet, setSheet] = useState(null);

  const rows = useMemo(() => {
    const q = term.trim().toLowerCase();
    return products
      .map((product) => {
        const qty = stockOf(stock, product.id);
        return { product, qty, low: isLowStock(product, qty) };
      })
      .filter((row) => !q || row.product.name?.toLowerCase().includes(q))
      .sort((a, b) => (b.qty > 0 ? 1 : 0) - (a.qty > 0 ? 1 : 0) || a.product.name.localeCompare(b.product.name, "ar"));
  }, [products, stock, term]);

  const withStock = rows.filter((r) => r.qty > 0.0001).length;
  const lowCount = rows.filter((r) => r.low).length;

  const filteredMoves = useMemo(
    () => moves.filter((m) => (moveFilter === "all" ? true : m.type === moveFilter)).slice(0, 200),
    [moves, moveFilter],
  );

  const removeLoad = (load) => {
    deleteLoad({ load, moves: moves.filter((m) => m.loadId === load.id) });
    toast.success("تم حذف العملية وإرجاع أثرها على المخزون");
    setSheet(null);
  };

  const removeCount = (count) => {
    deleteCount({ count, moves: moves.filter((m) => m.countId === count.id) });
    toast.success("تم حذف الجرد وإلغاء تسوياته");
    setSheet(null);
  };

  return (
    <Page
      title="مخزون السيارة"
      subtitle={`${formatNumber(withStock)} صنف متوفر${lowCount ? ` · ${formatNumber(lowCount)} منخفض` : ""}`}
      actions={
        <IconButton
          icon="fa-solid fa-print"
          label="طباعة تقرير المخزون"
          variant="secondary"
          onClick={() => printer.printStock(rows)}
        />
      }
    >
      <div className="sl-stock-actions">
        <Button icon="fa-solid fa-dolly" onClick={() => navigate("/sales/stock/load")}>
          تحميل بضاعة
        </Button>
        <Button variant="secondary" icon="fa-solid fa-rotate-left" onClick={() => navigate("/sales/stock/load?type=return")}>
          إرجاع للمستودع
        </Button>
        <Button variant="secondary" icon="fa-solid fa-clipboard-check" onClick={() => navigate("/sales/stock/count")}>
          جرد نهاية اليوم
        </Button>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "stock", label: "المخزون", count: withStock },
          { value: "moves", label: "الحركات" },
          { value: "loads", label: "التحميل", count: loads.length },
          { value: "counts", label: "الجرد", count: counts.length },
        ]}
      />

      {tab === "stock" && (
        <Stack gap={12}>
          <Grid min={150}>
            <StatTile label="أصناف متوفرة" value={formatNumber(withStock)} icon="fa-solid fa-boxes-stacked" />
            <StatTile label="عند حد التنبيه" value={formatNumber(lowCount)} tone={lowCount ? "danger" : "success"} icon="fa-solid fa-triangle-exclamation" />
          </Grid>
          <SearchInput value={term} onChange={setTerm} placeholder="ابحث عن صنف..." />
          {rows.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-boxes-stacked"
              title="لا توجد منتجات"
              action={<Button onClick={() => navigate("/sales/products")}>إدارة المنتجات</Button>}
            />
          ) : (
            <List>
              {rows.map((row) => (
                <ListRow
                  key={row.product.id}
                  leading={<IconTile icon="fa-solid fa-box" tone={row.low ? "danger" : row.qty > 0 ? "brand" : "neutral"} />}
                  title={
                    <>
                      {row.product.name}
                      {row.low && <Badge tone="danger">منخفض</Badge>}
                    </>
                  }
                  subtitle={row.product.lowStockThreshold != null ? `حد التنبيه: ${formatNumber(row.product.lowStockThreshold)} ${baseUnitLabel(row.product)}` : undefined}
                  trailing={<strong className="sl-amount">{formatBaseQty(row.product, row.qty)}</strong>}
                  chevron={false}
                />
              ))}
            </List>
          )}
        </Stack>
      )}

      {tab === "moves" && (
        <Stack gap={12}>
          <Toolbar>
            {MOVE_FILTERS.map((f) => (
              <Chip key={f.value} active={moveFilter === f.value} onClick={() => setMoveFilter(f.value)}>
                {f.label}
              </Chip>
            ))}
          </Toolbar>
          {filteredMoves.length === 0 ? (
            <EmptyState compact icon="fa-solid fa-clock-rotate-left" title="لا توجد حركات" />
          ) : (
            <List>
              {filteredMoves.map((move) => {
                const meta = moveMeta(move.type);
                const product = productById.get(move.productId);
                const manual = isManualMove(move);
                return (
                  <ListRow
                    key={move.id}
                    leading={<IconTile icon={meta.icon} tone={meta.tone} />}
                    title={
                      <>
                        {move.productName}
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {move.isBonus && <Badge tone="warning">بونص</Badge>}
                      </>
                    }
                    subtitle={`${product ? formatUnitQty(product, move.unitLevel, move.quantity) : `${formatNumber(move.quantity)} ${move.unit || ""}`} · ${formatShortDate(move.date)}`}
                    meta={move.notes ? <span>{move.notes}</span> : null}
                    onClick={manual ? () => setSheet({ type: "move", move }) : undefined}
                    chevron={manual}
                  />
                );
              })}
            </List>
          )}
        </Stack>
      )}

      {tab === "loads" && (
        <Stack gap={12}>
          <Button variant="soft" icon="fa-solid fa-plus" block onClick={() => navigate("/sales/stock/load")}>
            تسجيل تحميل جديد
          </Button>
          {loads.length === 0 ? (
            <EmptyState compact icon="fa-solid fa-dolly" title="لا توجد عمليات تحميل" />
          ) : (
            <List>
              {loads.map((load) => (
                <ListRow
                  key={load.id}
                  leading={<IconTile icon={load.type === "return" ? "fa-solid fa-rotate-left" : "fa-solid fa-dolly"} tone={load.type === "return" ? "warning" : "success"} />}
                  title={
                    <>
                      {load.type === "return" ? "إرجاع للمستودع" : "تحميل بضاعة"}
                      <Badge tone="neutral">{relativeDay(load.date)}</Badge>
                    </>
                  }
                  subtitle={`${formatNumber(load.lines?.length || 0)} سطر · ${formatDate(load.date)}`}
                  onClick={() => setSheet({ type: "load", load })}
                />
              ))}
            </List>
          )}
        </Stack>
      )}

      {tab === "counts" && (
        <Stack gap={12}>
          <Button variant="soft" icon="fa-solid fa-clipboard-check" block onClick={() => navigate("/sales/stock/count")}>
            جرد جديد
          </Button>
          {counts.length === 0 ? (
            <EmptyState compact icon="fa-solid fa-clipboard-check" title="لم تُسجّل عمليات جرد بعد" />
          ) : (
            <List>
              {counts.map((count) => (
                <ListRow
                  key={count.id}
                  leading={<IconTile icon="fa-solid fa-clipboard-check" tone={count.shortageCount ? "danger" : "success"} />}
                  title={`جرد ${formatDate(count.date)}`}
                  subtitle={`${formatNumber(count.linesCount || count.lines?.length || 0)} صنف · عجز ${formatNumber(count.shortageCount || 0)} · زيادة ${formatNumber(count.surplusCount || 0)}`}
                  onClick={() => setSheet({ type: "count", count })}
                />
              ))}
            </List>
          )}
        </Stack>
      )}

      {/* Sheets */}
      {sheet?.type === "move" && (
        <MoveSheet
          move={sheet.move}
          onClose={() => setSheet(null)}
          onDelete={() => setSheet({ type: "deleteMove", move: sheet.move })}
        />
      )}

      {sheet?.type === "load" && (
        <Sheet
          open
          onClose={() => setSheet(null)}
          title={sheet.load.type === "return" ? "إذن إرجاع" : "إذن تحميل"}
          subtitle={formatDate(sheet.load.date)}
          icon="fa-solid fa-dolly"
          footer={
            <>
              <Button variant="danger-soft" icon="fa-solid fa-trash" onClick={() => setSheet({ type: "deleteLoad", load: sheet.load })}>
                حذف
              </Button>
              <Button icon="fa-solid fa-print" onClick={() => printer.printLoad(sheet.load)}>
                طباعة
              </Button>
            </>
          }
        >
          <Stack gap={8}>
            {(sheet.load.lines || []).map((line, index) => (
              <KeyValue key={index} label={line.productName} value={`${formatNumber(line.quantity)} ${line.unit}`} />
            ))}
            {sheet.load.notes && <Callout tone="info">{sheet.load.notes}</Callout>}
          </Stack>
        </Sheet>
      )}

      {sheet?.type === "count" && (
        <Sheet
          open
          onClose={() => setSheet(null)}
          title={`جرد ${formatDate(sheet.count.date)}`}
          icon="fa-solid fa-clipboard-check"
          footer={
            <>
              <Button variant="danger-soft" icon="fa-solid fa-trash" onClick={() => setSheet({ type: "deleteCount", count: sheet.count })}>
                حذف
              </Button>
              <Button icon="fa-solid fa-print" onClick={() => printer.printCount(sheet.count, null)}>
                طباعة
              </Button>
            </>
          }
        >
          <Stack gap={8}>
            {(sheet.count.lines || []).map((line) => (
              <KeyValue
                key={line.productId}
                label={line.productName}
                value={
                  line.diff === 0
                    ? `مطابق (${formatNumber(line.counted)} ${line.baseUnit})`
                    : `${line.diff > 0 ? "زيادة" : "عجز"} ${formatNumber(Math.abs(line.diff))} ${line.baseUnit}`
                }
              />
            ))}
            {sheet.count.notes && <Callout tone="info">{sheet.count.notes}</Callout>}
          </Stack>
        </Sheet>
      )}

      <ConfirmDialog
        open={sheet?.type === "deleteMove"}
        title="حذف الحركة؟"
        message="سيتم تعديل رصيد المخزون تبعاً لذلك."
        onCancel={() => setSheet(null)}
        onConfirm={() => {
          deleteMove(sheet.move.id);
          toast.success("تم حذف الحركة");
          setSheet(null);
        }}
      />
      <ConfirmDialog
        open={sheet?.type === "deleteLoad"}
        title="حذف العملية؟"
        message="سيتم حذف كل حركات المخزون المرتبطة بها."
        onCancel={() => setSheet(null)}
        onConfirm={() => removeLoad(sheet.load)}
      />
      <ConfirmDialog
        open={sheet?.type === "deleteCount"}
        title="حذف الجرد؟"
        message="سيتم إلغاء تسويات هذا الجرد وإرجاع المخزون لما كان عليه."
        onCancel={() => setSheet(null)}
        onConfirm={() => removeCount(sheet.count)}
      />
    </Page>
  );
}
