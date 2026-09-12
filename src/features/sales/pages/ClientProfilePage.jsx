import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, IconButton } from "../../../components/ui/Button";
import { Grid, Page, Section, Tabs } from "../../../components/ui/Page";
import { ActionSheet, ConfirmDialog } from "../../../components/ui/Sheet";
import { Avatar, Badge, Callout, Card, EmptyState, IconTile, List, ListRow, Spinner, StatTile } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import ClientFormSheet from "../components/ClientFormSheet";
import PaymentSheet from "../components/PaymentSheet";
import VisitSheet from "../components/VisitSheet";
import { clearClientLocation, deleteClient, setClientLocation } from "../data/api";
import { useSales } from "../data/salesContext";
import { formatDate, relativeDay } from "../domain/dates";
import { balanceOf, hasDebt, isReturn, paymentMeta } from "../domain/ledger";
import { coordsLabel, directionsUrl, getCurrentCoords, hasLocation, savedOnLabel } from "../domain/location";
import { formatDual, formatDualObj, formatMoney, formatNumber } from "../domain/money";
import { orderNo, receiptNo } from "../domain/numbering";
import { clientTier, tierLabel } from "../domain/pricing";
import { canWhatsApp, telUrl } from "../domain/share";
import { outcomeMeta } from "../domain/catalog";
import { usePrinter } from "../print/usePrinter";

export default function ClientProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { clients, orders, payments, visits, balances, ready } = useSales();
  const printer = usePrinter();
  const [tab, setTab] = useState("invoices");
  const [sheet, setSheet] = useState(null);
  const [locating, setLocating] = useState(false);

  const client = clients.find((c) => c.id === id);

  const clientOrders = useMemo(
    () => orders.filter((o) => o.clientId === id).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [orders, id],
  );
  const clientPayments = useMemo(
    () => payments.filter((p) => p.clientId === id).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [payments, id],
  );
  const clientVisits = useMemo(
    () => visits.filter((v) => v.clientId === id).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [visits, id],
  );

  if (!client) {
    return (
      <Page title="ملف العميل" back="/sales/clients">
        {ready ? (
          <EmptyState
            icon="fa-solid fa-user-slash"
            title="العميل غير موجود"
            action={<Button onClick={() => navigate("/sales/clients")}>العودة للعملاء</Button>}
          />
        ) : (
          <Spinner />
        )}
      </Page>
    );
  }

  const balance = balanceOf(balances, client.id);
  const totalBought = clientOrders
    .filter((o) => !isReturn(o))
    .reduce((acc, o) => ({ usd: acc.usd + (o.totalUSD || 0), syp: acc.syp + (o.totalSYP || 0) }), { usd: 0, syp: 0 });

  const captureLocation = async () => {
    setLocating(true);
    try {
      const coords = await getCurrentCoords();
      setClientLocation(client.id, coords);
      toast.success("تم حفظ موقع المحل");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLocating(false);
    }
  };

  const statementActions = () => [
    { label: "طباعة كشف الحساب", icon: "fa-solid fa-print", tone: "brand", onClick: () => printer.printStatement(client) },
    {
      label: "إرسال الكشف عبر واتساب",
      icon: "fa-brands fa-whatsapp",
      tone: "whatsapp",
      disabled: !canWhatsApp(client.phone),
      onClick: () => printer.whatsapp(client.phone, printer.statementText(client)),
    },
    { label: "مشاركة الكشف", icon: "fa-solid fa-share-nodes", onClick: () => printer.share(printer.statementText(client), `كشف حساب ${client.name}`) },
  ];

  return (
    <Page
      title={client.name}
      subtitle={client.territoryName || "بدون منطقة"}
      back="/sales/clients"
      actions={
        <>
          <IconButton icon="fa-solid fa-pen" label="تعديل" variant="secondary" onClick={() => setSheet({ type: "edit" })} />
          <IconButton icon="fa-solid fa-ellipsis" label="خيارات" variant="secondary" onClick={() => setSheet({ type: "actions" })} />
        </>
      }
      footer={
        <>
          <Button size="lg" icon="fa-solid fa-cart-plus" block onClick={() => navigate(`/sales/invoices/new?client=${client.id}`)}>
            فاتورة جديدة
          </Button>
          {hasDebt(balance) && (
            <Button size="lg" variant="success" icon="fa-solid fa-hand-holding-dollar" block onClick={() => setSheet({ type: "pay" })}>
              تحصيل
            </Button>
          )}
        </>
      }
    >
      <Card>
        <div className="sl-profile">
          <Avatar name={client.name} size={56} />
          <div className="sl-profile-info">
            <div className="sl-client-name">
              {client.name}
              <Badge tone={client.type === "wholesale" ? "info" : "neutral"}>{tierLabel(clientTier(client))}</Badge>
            </div>
            <div className="sl-muted">{client.address || client.territoryName || "—"}</div>
            {client.notes && <div className="sl-muted">{client.notes}</div>}
          </div>
        </div>
        <div className="sl-profile-actions">
          {client.phone && (
            <Button variant="secondary" size="sm" icon="fa-solid fa-phone" href={telUrl(client.phone)}>
              اتصال
            </Button>
          )}
          {canWhatsApp(client.phone) && (
            <Button
              variant="whatsapp"
              size="sm"
              icon="fa-brands fa-whatsapp"
              onClick={() => printer.whatsapp(client.phone, `مرحباً ${client.name}`)}
            >
              واتساب
            </Button>
          )}
          {hasLocation(client) ? (
            <Button variant="soft" size="sm" icon="fa-solid fa-diamond-turn-right" href={directionsUrl(client.location)} target="_blank">
              الطريق إلى المحل
            </Button>
          ) : (
            <Button variant="secondary" size="sm" icon="fa-solid fa-location-crosshairs" loading={locating} onClick={captureLocation}>
              حفظ موقع المحل
            </Button>
          )}
        </div>
        {hasLocation(client) && (
          <div className="sl-muted sl-loc-line">
            <i className="fa-solid fa-location-dot" /> {coordsLabel(client.location)}
            {savedOnLabel(client.location) && ` · حُفظ ${savedOnLabel(client.location)}`}
          </div>
        )}
      </Card>

      <Grid min={150}>
        <StatTile
          label="الرصيد المستحق"
          value={formatDualObj(balance, "لا يوجد")}
          tone={hasDebt(balance) ? "danger" : "success"}
          icon="fa-solid fa-scale-balanced"
        />
        <StatTile label="إجمالي المشتريات" value={formatDual(totalBought.usd, totalBought.syp)} icon="fa-solid fa-basket-shopping" />
        <StatTile label="عدد الفواتير" value={formatNumber(clientOrders.length)} icon="fa-solid fa-file-invoice-dollar" />
        <StatTile label="عدد الزيارات" value={formatNumber(clientVisits.length)} tone="info" icon="fa-solid fa-route" />
      </Grid>

      {(client.creditLimitUSD != null || client.creditLimitSYP != null) && hasDebt(balance) && (
        <Callout tone="info">
          سقف الدين المحدد: {formatDual(client.creditLimitUSD, client.creditLimitSYP)}
        </Callout>
      )}

      <Section
        title="السجل"
        actions={
          <Button size="sm" variant="soft" icon="fa-solid fa-file-lines" onClick={() => setSheet({ type: "statement" })}>
            كشف حساب
          </Button>
        }
      >
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "invoices", label: "الفواتير", count: clientOrders.length },
            { value: "payments", label: "الدفعات", count: clientPayments.length },
            { value: "visits", label: "الزيارات", count: clientVisits.length },
          ]}
        />

        {tab === "invoices" &&
          (clientOrders.length === 0 ? (
            <EmptyState compact icon="fa-solid fa-file-invoice-dollar" title="لا توجد فواتير لهذا العميل" />
          ) : (
            <List>
              {clientOrders.map((order) => (
                <ListRow
                  key={order.id}
                  onClick={() => navigate(`/sales/invoices/${order.id}`)}
                  title={
                    <>
                      {orderNo(order)}
                      <Badge tone={isReturn(order) ? "danger" : paymentMeta(order).tone}>
                        {isReturn(order) ? "مرتجع" : paymentMeta(order).label}
                      </Badge>
                    </>
                  }
                  subtitle={`${formatDate(order.date)} · ${formatNumber(order.items?.length || 0)} صنف`}
                  trailing={<strong className="sl-amount">{formatDual(order.totalUSD, order.totalSYP)}</strong>}
                />
              ))}
            </List>
          ))}

        {tab === "payments" &&
          (clientPayments.length === 0 ? (
            <EmptyState compact icon="fa-solid fa-hand-holding-dollar" title="لا توجد دفعات" />
          ) : (
            <List>
              {clientPayments.map((payment) => (
                <ListRow
                  key={payment.id}
                  leading={<IconTile icon="fa-solid fa-receipt" tone="success" />}
                  title={`سند ${receiptNo(payment)}`}
                  subtitle={`${formatDate(payment.date)}${payment.notes ? ` · ${payment.notes}` : ""}`}
                  trailing={<strong className="sl-amount">{formatMoney(payment.amount, payment.currency)}</strong>}
                  onClick={() => printer.printReceipt(payment)}
                  chevron={false}
                />
              ))}
            </List>
          ))}

        {tab === "visits" &&
          (clientVisits.length === 0 ? (
            <EmptyState
              compact
              icon="fa-solid fa-route"
              title="لا توجد زيارات"
              action={
                <Button size="sm" onClick={() => setSheet({ type: "visit" })}>
                  تسجيل زيارة
                </Button>
              }
            />
          ) : (
            <List>
              {clientVisits.map((visit) => {
                const meta = outcomeMeta(visit.outcome);
                return (
                  <ListRow
                    key={visit.id}
                    leading={<IconTile icon={meta.icon} tone={meta.tone} />}
                    title={
                      <>
                        {relativeDay(visit.date)}
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </>
                    }
                    subtitle={visit.notes || (visit.followUpDate ? `متابعة: ${visit.followUpDate}` : "—")}
                    chevron={false}
                  />
                );
              })}
            </List>
          ))}
      </Section>

      {sheet?.type === "edit" && <ClientFormSheet client={client} onClose={() => setSheet(null)} />}
      {sheet?.type === "pay" && (
        <PaymentSheet
          clientId={client.id}
          onClose={() => setSheet(null)}
          onSaved={(payment) =>
            toast.success("تم تسجيل الدفعة", {
              action: { label: "طباعة السند", onClick: () => printer.printReceipt(payment) },
            })
          }
        />
      )}
      {sheet?.type === "visit" && <VisitSheet clientId={client.id} onClose={() => setSheet(null)} />}
      {sheet?.type === "statement" && (
        <ActionSheet open onClose={() => setSheet(null)} title="كشف الحساب" subtitle={client.name} actions={statementActions()} />
      )}
      {sheet?.type === "actions" && (
        <ActionSheet
          open
          onClose={() => setSheet(null)}
          title={client.name}
          actions={[
            { label: "تسجيل زيارة", icon: "fa-solid fa-route", tone: "brand", onClick: () => setSheet({ type: "visit" }) },
            { label: "مرتجع من العميل", icon: "fa-solid fa-arrow-rotate-left", tone: "warning", onClick: () => navigate(`/sales/invoices/new?kind=return&client=${client.id}`) },
            ...statementActions(),
            hasLocation(client)
              ? { label: "تحديث الموقع المحفوظ", icon: "fa-solid fa-location-crosshairs", onClick: captureLocation }
              : null,
            hasLocation(client)
              ? {
                  label: "حذف الموقع المحفوظ",
                  icon: "fa-solid fa-location-dot",
                  tone: "danger",
                  onClick: () => {
                    clearClientLocation(client.id);
                    toast.success("تم حذف الموقع");
                  },
                }
              : null,
            { label: "حذف العميل", icon: "fa-solid fa-trash", tone: "danger", onClick: () => setSheet({ type: "delete" }) },
          ].filter(Boolean)}
        />
      )}
      <ConfirmDialog
        open={sheet?.type === "delete"}
        title="حذف العميل؟"
        message="ستبقى فواتيره ودفعاته في السجل، لكن لن يظهر في قوائم العملاء."
        onCancel={() => setSheet(null)}
        onConfirm={() => {
          deleteClient(client.id);
          toast.success("تم حذف العميل");
          navigate("/sales/clients", { replace: true });
        }}
      />
    </Page>
  );
}
