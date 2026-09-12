import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { Field, MoneyField, Segmented, TextAreaField, TextField } from "../../../components/ui/Form";
import { Page, Section, Stack } from "../../../components/ui/Page";
import { Avatar, Badge, Callout, Card, EmptyState, KeyValue, Spinner } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import ClientFormSheet from "../components/ClientFormSheet";
import ClientPicker from "../components/ClientPicker";
import LineSheet from "../components/LineSheet";
import ProductPicker from "../components/ProductPicker";
import { saveOrder } from "../data/api";
import { useSales } from "../data/salesContext";
import { todayISO } from "../domain/dates";
import { PAYMENT_TYPES, RETURN_PAYMENT_TYPES, balanceOf } from "../domain/ledger";
import { formatDual, formatDualObj, formatMoney, formatNumber } from "../domain/money";
import { nextInvoiceNo, nextReceiptNo } from "../domain/numbering";
import { TIERS, clientTier, lineBaseQty, lineTotalsOf, promoFor, tierLabel, unitPrice } from "../domain/pricing";
import { moveDelta, stockOf } from "../domain/stock";

let lineKey = 0;
const nextKey = () => {
  lineKey += 1;
  return `l${lineKey}`;
};

function stateFromOrder(order) {
  return {
    kind: order.kind === "return" ? "return" : "sale",
    clientId: order.clientId || "",
    tier: order.priceTier || "retail",
    lines: (order.items || []).map((item) => ({ ...item, key: nextKey() })),
    paymentType: order.paymentType || "cash",
    paidUSD: order.paidUSD ? String(order.paidUSD) : "",
    paidSYP: order.paidSYP ? String(order.paidSYP) : "",
    date: order.date || todayISO(),
    notes: order.notes || "",
  };
}

export default function InvoiceEditorPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const sales = useSales();
  const { orders, clients, products, promotions, moves, payments, stock, balances, rate, productById, ready } = sales;

  const existing = id ? orders.find((o) => o.id === id) : null;
  const [form, setForm] = useState(() => ({
    kind: params.get("kind") === "return" ? "return" : "sale",
    clientId: params.get("client") || "",
    tier: "retail",
    lines: [],
    paymentType: params.get("kind") === "return" ? "credit" : "cash",
    paidUSD: "",
    paidSYP: "",
    date: todayISO(),
    notes: "",
  }));
  const [hydrated, setHydrated] = useState(!id);
  const [sheet, setSheet] = useState(null);

  // Fill the form once the invoice being edited has loaded (the page can be
  // opened directly from a link, before data arrives).
  if (id && !hydrated && existing) {
    setHydrated(true);
    setForm(stateFromOrder(existing));
  }

  const isReturn = form.kind === "return";
  const client = clients.find((c) => c.id === form.clientId);
  const balance = form.clientId ? balanceOf(balances, form.clientId) : null;
  const totals = lineTotalsOf(form.lines);
  const ownMoves = existing ? moves.filter((m) => m.orderId === existing.id) : [];
  const ownPayments = existing ? payments.filter((p) => p.orderId === existing.id) : [];

  /** Stock as if this invoice's own effect were undone, minus what's in the cart. */
  const availableFor = (productId, exceptKey) => {
    const product = productById.get(productId);
    if (!product) return 0;
    const own = ownMoves
      .filter((m) => m.productId === productId)
      .reduce((sum, m) => sum + moveDelta(product, m), 0);
    const inCart = form.lines
      .filter((l) => l.productId === productId && l.key !== exceptKey)
      .reduce((sum, l) => sum + lineBaseQty(product, l), 0);
    return stockOf(stock, productId) - own - inCart;
  };

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const pickClient = (picked) => {
    setForm((f) => ({ ...f, clientId: picked.id, tier: clientTier(picked) }));
  };

  const changeTier = (tier) => {
    setForm((f) => ({
      ...f,
      tier,
      lines: f.lines.map((line) => ({
        ...line,
        price: unitPrice(productById.get(line.productId) || {}, {
          tier,
          currency: line.currency,
          unitLevel: line.unitLevel,
          rate,
        }),
      })),
    }));
    toast.info("تم تحديث الأسعار حسب فئة السعر الجديدة");
  };

  const upsertLine = (line, key) => {
    setForm((f) => ({
      ...f,
      lines: key ? f.lines.map((l) => (l.key === key ? { ...line, key } : l)) : [...f.lines, { ...line, key: nextKey() }],
    }));
  };

  const removeLine = (key) => setForm((f) => ({ ...f, lines: f.lines.filter((l) => l.key !== key) }));

  const paid = {
    usd: form.paymentType === "partial" ? Number(form.paidUSD) || 0 : form.paymentType === "cash" ? totals.total.usd : 0,
    syp: form.paymentType === "partial" ? Number(form.paidSYP) || 0 : form.paymentType === "cash" ? totals.total.syp : 0,
  };
  const remaining = { usd: totals.total.usd - paid.usd, syp: totals.total.syp - paid.syp };

  const creditLimitWarning = (() => {
    if (isReturn || form.paymentType === "cash" || !client || !balance) return null;
    const afterUSD = balance.usd + remaining.usd;
    const afterSYP = balance.syp + remaining.syp;
    const overUSD = client.creditLimitUSD != null && afterUSD > Number(client.creditLimitUSD);
    const overSYP = client.creditLimitSYP != null && afterSYP > Number(client.creditLimitSYP);
    if (!overUSD && !overSYP) return null;
    return `سيتجاوز رصيد العميل سقف الدين المحدد له (${formatDual(client.creditLimitUSD, client.creditLimitSYP)}).`;
  })();

  const canSave = Boolean(form.clientId) && form.lines.length > 0;

  const save = () => {
    if (!canSave) return;
    const invoiceNo = existing?.invoiceNo || nextInvoiceNo(orders, form.kind);
    const items = form.lines.map(({ key, ...line }) => line); // eslint-disable-line no-unused-vars
    const order = {
      kind: form.kind,
      invoiceNo,
      clientId: form.clientId,
      clientName: client?.name || "",
      clientType: client?.type || "retail",
      territoryId: client?.territoryId || "",
      territoryName: client?.territoryName || "",
      priceTier: form.tier,
      date: form.date,
      notes: form.notes.trim(),
      items,
      subtotalUSD: totals.gross.usd,
      subtotalSYP: totals.gross.syp,
      discountUSD: totals.discount.usd,
      discountSYP: totals.discount.syp,
      totalUSD: totals.total.usd,
      totalSYP: totals.total.syp,
      paymentType: form.paymentType,
      paidUSD: paid.usd,
      paidSYP: paid.syp,
      createdAt: existing?.createdAt,
    };

    const stockMoves = [];
    for (const line of form.lines) {
      stockMoves.push({
        productId: line.productId,
        productName: line.productName,
        type: isReturn ? "customerReturn" : "sale",
        unitLevel: line.unitLevel,
        unit: line.unit,
        quantity: line.quantity,
        date: form.date,
        notes: `${isReturn ? "مرتجع من" : "بيع لـ"} ${client?.name || ""}`,
      });
      if (line.freeQty > 0) {
        stockMoves.push({
          productId: line.productId,
          productName: line.productName,
          type: isReturn ? "customerReturn" : "sale",
          unitLevel: line.freeUnitLevel,
          unit: line.freeUnit,
          quantity: line.freeQty,
          isBonus: true,
          date: form.date,
          notes: `بونص — ${client?.name || ""}`,
        });
      }
    }

    const paymentDocs = [];
    if (!isReturn && form.paymentType === "partial") {
      let receipt = nextReceiptNo(payments);
      for (const currency of ["USD", "SYP"]) {
        const amount = currency === "USD" ? paid.usd : paid.syp;
        if (amount > 0) {
          paymentDocs.push({
            clientId: form.clientId,
            clientName: client?.name || "",
            currency,
            amount,
            date: form.date,
            notes: `دفعة مع الفاتورة #${invoiceNo}`,
            receiptNo: receipt,
          });
          receipt += 1;
        }
      }
    }

    const savedId = saveOrder({
      order,
      id: existing?.id,
      moves: stockMoves,
      payments: paymentDocs,
      replaceMoves: ownMoves,
      replacePayments: ownPayments,
    });
    toast.success(existing ? "تم حفظ الفاتورة" : isReturn ? "تم تسجيل المرتجع" : "تم تسجيل الفاتورة");
    navigate(`/sales/invoices/${savedId}`, { replace: true });
  };

  if (id && !existing) {
    return (
      <Page title="تعديل فاتورة" back="/sales/invoices">
        {ready ? (
          <EmptyState
            icon="fa-solid fa-file-circle-question"
            title="الفاتورة غير موجودة"
            text="ربما تم حذفها من جهاز آخر."
            action={<Button onClick={() => navigate("/sales/invoices")}>العودة للفواتير</Button>}
          />
        ) : (
          <Spinner />
        )}
      </Page>
    );
  }

  return (
    <Page
      title={existing ? `تعديل ${isReturn ? "مرتجع" : "فاتورة"} #${existing.invoiceNo || ""}` : isReturn ? "مرتجع جديد" : "فاتورة بيع جديدة"}
      back="/sales/invoices"
      footer={
        <>
          <div className="sl-foot-total">
            <span>الإجمالي</span>
            <strong>{formatDual(totals.total.usd, totals.total.syp)}</strong>
          </div>
          <Button size="lg" icon="fa-solid fa-check" onClick={save} disabled={!canSave}>
            {existing ? "حفظ التعديلات" : "حفظ"}
          </Button>
        </>
      }
    >
      {!existing && (
        <Segmented
          value={form.kind}
          onChange={(kind) => setForm((f) => ({ ...f, kind, paymentType: kind === "return" ? "credit" : "cash" }))}
          options={[
            { value: "sale", label: "فاتورة بيع", icon: "fa-solid fa-cart-shopping" },
            { value: "return", label: "مرتجع من عميل", icon: "fa-solid fa-arrow-rotate-left" },
          ]}
        />
      )}

      {/* Client */}
      <Section title="العميل">
        {client ? (
          <Card>
            <div className="sl-client-row">
              <Avatar name={client.name} size={44} />
              <div className="sl-client-info">
                <div className="sl-client-name">
                  {client.name}
                  <Badge tone={client.type === "wholesale" ? "info" : "neutral"}>{tierLabel(clientTier(client))}</Badge>
                </div>
                <div className="sl-muted">
                  {client.territoryName || "بدون منطقة"}
                  {balance && ` · الرصيد: ${formatDualObj(balance, "لا يوجد")}`}
                </div>
              </div>
              <Button variant="ghost" icon="fa-solid fa-repeat" onClick={() => setSheet({ type: "client" })}>
                تغيير
              </Button>
            </div>
          </Card>
        ) : (
          <Button variant="secondary" size="lg" block icon="fa-solid fa-users" onClick={() => setSheet({ type: "client" })}>
            اختر العميل
          </Button>
        )}
      </Section>

      {/* Price tier */}
      {client && (
        <Field label="فئة السعر" hint="تُحدَّد تلقائياً حسب نوع العميل، ويمكنك تغييرها لهذه الفاتورة">
          <Segmented value={form.tier} onChange={changeTier} options={TIERS.map((t) => ({ value: t.value, label: t.label, icon: t.icon }))} />
        </Field>
      )}

      {/* Lines */}
      <Section
        title="الأصناف"
        actions={
          <Button
            size="sm"
            variant="soft"
            icon="fa-solid fa-plus"
            onClick={() => setSheet({ type: "product" })}
            disabled={!products.length}
          >
            إضافة صنف
          </Button>
        }
      >
        {form.lines.length === 0 ? (
          <Card>
            <EmptyState
              compact
              icon="fa-solid fa-cart-shopping"
              title="لم تُضف أصنافاً بعد"
              text={products.length ? "اضغط «إضافة صنف» لاختيار المنتج والكمية." : "أضف منتجات من صفحة المنتجات أولاً."}
            />
          </Card>
        ) : (
          <div className="sl-lines">
            {form.lines.map((line) => (
              <button
                key={line.key}
                type="button"
                className="sl-line"
                onClick={() => setSheet({ type: "line", line, product: productById.get(line.productId) })}
              >
                <div className="sl-line-main">
                  <div className="sl-line-name">
                    {line.productName}
                    {line.promotionTitle && (
                      <Badge tone="warning" icon="fa-solid fa-tags">
                        عرض
                      </Badge>
                    )}
                  </div>
                  <div className="sl-muted">
                    {formatNumber(line.quantity)} {line.unit} × {formatMoney(line.price, line.currency)}
                    {line.discount > 0 && ` · خصم ${formatNumber(line.discountPct)}%`}
                  </div>
                  {line.freeQty > 0 && (
                    <div className="sl-free">
                      + بونص {formatNumber(line.freeQty)} {line.freeUnit} مجاناً
                    </div>
                  )}
                </div>
                <div className="sl-line-side">
                  <strong>{formatMoney(line.lineTotal, line.currency)}</strong>
                  <i className="fa-solid fa-pen sl-line-edit" aria-hidden="true" />
                </div>
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Payment */}
      <Section title={isReturn ? "تسوية المرتجع" : "الدفع"}>
        <Card>
          <Stack gap={16}>
            <Segmented
              value={form.paymentType}
              onChange={(value) => setField("paymentType", value)}
              options={(isReturn ? RETURN_PAYMENT_TYPES : PAYMENT_TYPES).map((p) => ({ value: p.value, label: p.label }))}
              size="sm"
            />

            {form.paymentType === "partial" && (
              <>
                <div className="sl-pay-grid">
                  <MoneyField
                    label="المدفوع الآن (دولار)"
                    currency="USD"
                    value={form.paidUSD}
                    onChange={(e) => setField("paidUSD", e.target.value)}
                  />
                  <MoneyField
                    label="المدفوع الآن (ل.س)"
                    currency="SYP"
                    value={form.paidSYP}
                    onChange={(e) => setField("paidSYP", e.target.value)}
                  />
                </div>
                <KeyValue label="المتبقي على الحساب" value={formatDual(remaining.usd, remaining.syp)} strong />
              </>
            )}

            {creditLimitWarning && <Callout tone="warning">{creditLimitWarning}</Callout>}

            <TextField label="التاريخ" type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} />
            <TextAreaField
              label="ملاحظات"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={2}
              placeholder="اختياري"
            />
          </Stack>
        </Card>
      </Section>

      {/* Totals */}
      <Card title="الإجمالي" icon="fa-solid fa-receipt">
        <KeyValue label="عدد الأصناف" value={formatNumber(form.lines.length)} />
        {(totals.discount.usd > 0 || totals.discount.syp > 0) && (
          <>
            <KeyValue label="قبل الخصم" value={formatDual(totals.gross.usd, totals.gross.syp)} />
            <KeyValue label="الخصم" value={formatDual(totals.discount.usd, totals.discount.syp)} />
          </>
        )}
        <KeyValue label={isReturn ? "قيمة المرتجع" : "الإجمالي"} value={formatDual(totals.total.usd, totals.total.syp)} strong />
      </Card>

      {/* Sheets */}
      {sheet?.type === "client" && (
        <ClientPicker
          onClose={() => setSheet(null)}
          onPick={(picked) => {
            pickClient(picked);
            setSheet(null);
          }}
          onCreate={() => setSheet({ type: "newClient" })}
        />
      )}
      {sheet?.type === "newClient" && (
        <ClientFormSheet onClose={() => setSheet(null)} onSaved={(newId) => setForm((f) => ({ ...f, clientId: newId }))} />
      )}
      {sheet?.type === "product" && (
        <ProductPicker
          onClose={() => setSheet(null)}
          tier={form.tier}
          date={form.date}
          availableOf={(productId) => availableFor(productId)}
          onPick={(product) => setSheet({ type: "line", product })}
        />
      )}
      {sheet?.type === "line" && sheet.product && (
        <LineSheet
          product={sheet.product}
          promo={promoFor(promotions, sheet.product.id, form.tier, form.date)}
          tier={form.tier}
          rate={rate}
          line={sheet.line}
          isReturn={isReturn}
          available={availableFor(sheet.product.id, sheet.line?.key)}
          onSave={(line) => {
            upsertLine(line, sheet.line?.key);
            setSheet(null);
          }}
          onRemove={
            sheet.line
              ? () => {
                  removeLine(sheet.line.key);
                  setSheet(null);
                }
              : undefined
          }
          onClose={() => setSheet(null)}
        />
      )}
    </Page>
  );
}
