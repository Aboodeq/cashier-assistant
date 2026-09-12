import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, IconButton } from "../../../components/ui/Button";
import { SearchInput } from "../../../components/ui/Form";
import { Chip, Grid, Page, Stack, Toolbar } from "../../../components/ui/Page";
import { ConfirmDialog } from "../../../components/ui/Sheet";
import { Badge, EmptyState, IconTile, List, ListRow, StatTile } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import VisitSheet from "../components/VisitSheet";
import { VISIT_OUTCOMES, outcomeMeta } from "../domain/catalog";
import { deleteVisit, setVisitFollowUpDone } from "../data/api";
import { useSales } from "../data/salesContext";
import { formatDate, relativeDay, startOfWeek, todayISO } from "../domain/dates";
import { formatNumber } from "../domain/money";
import { directionsUrl, hasLocation } from "../domain/location";

const PERIODS = [
  { value: "today", label: "اليوم" },
  { value: "week", label: "هذا الأسبوع" },
  { value: "all", label: "الكل" },
  { value: "followups", label: "متابعات مستحقة" },
];

export default function VisitsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { visits, clients, territories } = useSales();
  const [period, setPeriod] = useState("today");
  const [outcome, setOutcome] = useState("all");
  const [territoryId, setTerritoryId] = useState("");
  const [term, setTerm] = useState("");
  const [sheet, setSheet] = useState(null);

  const today = todayISO();
  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return visits
      .filter((v) => {
        if (period === "today") return v.date === today;
        if (period === "week") return v.date >= startOfWeek();
        if (period === "followups") return v.followUpDate && !v.followUpDone && v.followUpDate <= today;
        return true;
      })
      .filter((v) => (outcome === "all" ? true : v.outcome === outcome))
      .filter((v) => (territoryId ? v.territoryId === territoryId : true))
      .filter((v) => !q || v.clientName?.toLowerCase().includes(q))
      .sort((a, b) => (a.date === b.date ? (b.createdAt || 0) - (a.createdAt || 0) : a.date < b.date ? 1 : -1));
  }, [visits, period, outcome, territoryId, term, today]);

  const todayCount = visits.filter((v) => v.date === today).length;
  const dueFollowUps = visits.filter((v) => v.followUpDate && !v.followUpDone && v.followUpDate <= today).length;
  const successRate = (() => {
    const week = visits.filter((v) => v.date >= startOfWeek());
    if (!week.length) return "—";
    return `${Math.round((week.filter((v) => v.outcome === "successful").length / week.length) * 100)}%`;
  })();

  return (
    <Page
      title="الزيارات"
      subtitle={`${formatNumber(todayCount)} زيارة اليوم`}
      actions={
        <Button icon="fa-solid fa-plus" onClick={() => setSheet({ type: "new" })}>
          تسجيل زيارة
        </Button>
      }
    >
      <Grid min={150}>
        <StatTile label="زيارات اليوم" value={formatNumber(todayCount)} icon="fa-solid fa-route" />
        <StatTile label="متابعات مستحقة" value={formatNumber(dueFollowUps)} tone={dueFollowUps ? "warning" : "success"} icon="fa-solid fa-bell" onClick={() => setPeriod("followups")} />
        <StatTile label="نسبة النجاح (الأسبوع)" value={successRate} tone="success" icon="fa-solid fa-circle-check" />
      </Grid>

      <Stack gap={10}>
        <SearchInput value={term} onChange={setTerm} placeholder="ابحث باسم العميل..." />
        <Toolbar>
          {PERIODS.map((p) => (
            <Chip key={p.value} active={period === p.value} onClick={() => setPeriod(p.value)}>
              {p.label}
            </Chip>
          ))}
        </Toolbar>
        <Toolbar>
          <Chip active={outcome === "all"} onClick={() => setOutcome("all")}>
            كل النتائج
          </Chip>
          {VISIT_OUTCOMES.map((o) => (
            <Chip key={o.value} icon={o.icon} active={outcome === o.value} onClick={() => setOutcome(o.value)}>
              {o.label}
            </Chip>
          ))}
        </Toolbar>
        {territories.length > 0 && (
          <Toolbar>
            <Chip active={!territoryId} onClick={() => setTerritoryId("")}>
              كل المناطق
            </Chip>
            {territories.map((t) => (
              <Chip key={t.id} active={territoryId === t.id} onClick={() => setTerritoryId(t.id)}>
                {t.name}
              </Chip>
            ))}
          </Toolbar>
        )}
      </Stack>

      {filtered.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-route"
          title="لا توجد زيارات"
          text="سجّل زياراتك الميدانية لمتابعة عملائك بانتظام."
          action={
            <Button icon="fa-solid fa-plus" onClick={() => setSheet({ type: "new" })}>
              تسجيل زيارة
            </Button>
          }
        />
      ) : (
        <List>
          {filtered.map((visit) => {
            const meta = outcomeMeta(visit.outcome);
            const client = clients.find((c) => c.id === visit.clientId);
            const due = visit.followUpDate && !visit.followUpDone && visit.followUpDate <= today;
            return (
              <ListRow
                key={visit.id}
                leading={<IconTile icon={meta.icon} tone={meta.tone} />}
                title={
                  <>
                    {visit.clientName}
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    {due && <Badge tone="warning">متابعة مستحقة</Badge>}
                  </>
                }
                subtitle={`${relativeDay(visit.date)} · ${visit.territoryName || "بدون منطقة"}`}
                meta={
                  <>
                    {visit.notes && <span>{visit.notes}</span>}
                    {visit.followUpDate && (
                      <span>
                        <i className="fa-regular fa-calendar" />
                        متابعة: {formatDate(visit.followUpDate)}
                      </span>
                    )}
                  </>
                }
                trailing={
                  <div className="sl-row-actions">
                    {client && hasLocation(client) && (
                      <IconButton icon="fa-solid fa-diamond-turn-right" label="الطريق" size="sm" variant="soft" href={directionsUrl(client.location)} target="_blank" />
                    )}
                    {due && (
                      <IconButton
                        icon="fa-solid fa-check"
                        label="إنهاء المتابعة"
                        size="sm"
                        variant="success-soft"
                        onClick={() => {
                          setVisitFollowUpDone(visit.id, true);
                          toast.success("تم إنهاء المتابعة");
                        }}
                      />
                    )}
                    <IconButton icon="fa-solid fa-pen" label="تعديل" size="sm" variant="secondary" onClick={() => setSheet({ type: "edit", visit })} />
                    <IconButton icon="fa-solid fa-trash" label="حذف" size="sm" variant="danger-soft" onClick={() => setSheet({ type: "delete", visit })} />
                  </div>
                }
                chevron={false}
                onClick={client ? () => navigate(`/sales/clients/${client.id}`) : undefined}
              />
            );
          })}
        </List>
      )}

      {(sheet?.type === "new" || sheet?.type === "edit") && (
        <VisitSheet visit={sheet.visit} onClose={() => setSheet(null)} />
      )}
      <ConfirmDialog
        open={sheet?.type === "delete"}
        title="حذف الزيارة؟"
        onCancel={() => setSheet(null)}
        onConfirm={() => {
          deleteVisit(sheet.visit.id);
          toast.success("تم حذف الزيارة");
          setSheet(null);
        }}
      />
    </Page>
  );
}
