import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { SearchInput } from "../../../components/ui/Form";
import { Chip, Page, Stack, Tabs, Toolbar } from "../../../components/ui/Page";
import { ConfirmDialog } from "../../../components/ui/Sheet";
import { Avatar, Badge, EmptyState, IconTile, List, ListRow } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import ClientFormSheet from "../components/ClientFormSheet";
import TerritorySheet from "../components/TerritorySheet";
import { deleteTerritory } from "../data/api";
import { useSales } from "../data/salesContext";
import { balanceOf, hasDebt } from "../domain/ledger";
import { formatDualObj, formatNumber } from "../domain/money";
import { hasLocation } from "../domain/location";
import { clientTier, tierLabel } from "../domain/pricing";

const FILTERS = [
  { value: "all", label: "الكل" },
  { value: "debt", label: "عليه دين" },
  { value: "wholesale", label: "جملة" },
  { value: "retail", label: "مفرق" },
  { value: "noLocation", label: "بدون موقع" },
];

export default function ClientsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const { clients, territories, balances, visits } = useSales();
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [territoryId, setTerritoryId] = useState("");
  const [sheet, setSheet] = useState(null);

  const tab = params.get("tab") === "territories" ? "territories" : "clients";
  const setTab = (value) => setParams(value === "territories" ? { tab: "territories" } : {}, { replace: true });

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return clients
      .filter((c) => !q || c.name?.toLowerCase().includes(q) || String(c.phone || "").includes(q))
      .filter((c) => (territoryId ? c.territoryId === territoryId : true))
      .filter((c) => {
        if (filter === "debt") return hasDebt(balanceOf(balances, c.id));
        if (filter === "wholesale") return c.type === "wholesale";
        if (filter === "retail") return c.type !== "wholesale";
        if (filter === "noLocation") return !hasLocation(c);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [clients, term, territoryId, filter, balances]);

  const clientCount = (id) => clients.filter((c) => c.territoryId === id).length;

  return (
    <Page
      title="العملاء"
      subtitle={`${formatNumber(clients.length)} عميل · ${formatNumber(territories.length)} منطقة`}
      actions={
        <Button
          icon="fa-solid fa-plus"
          onClick={() => setSheet(tab === "territories" ? { type: "territory" } : { type: "client" })}
        >
          {tab === "territories" ? "منطقة جديدة" : "عميل جديد"}
        </Button>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "clients", label: "العملاء", count: clients.length },
          { value: "territories", label: "المناطق", count: territories.length },
        ]}
      />

      {tab === "clients" ? (
        <Stack gap={12}>
          <SearchInput value={term} onChange={setTerm} placeholder="ابحث بالاسم أو رقم الهاتف..." />
          <Toolbar>
            {FILTERS.map((f) => (
              <Chip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
                {f.label}
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

          {filtered.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-users"
              title={clients.length === 0 ? "لا يوجد عملاء بعد" : "لا توجد نتائج"}
              text={clients.length === 0 ? "ابدأ بإضافة عملائك لتتمكن من تسجيل الفواتير والزيارات." : "جرّب تغيير البحث أو الفلاتر."}
              action={
                clients.length === 0 ? (
                  <Button icon="fa-solid fa-plus" onClick={() => setSheet({ type: "client" })}>
                    عميل جديد
                  </Button>
                ) : null
              }
            />
          ) : (
            <List>
              {filtered.map((client) => {
                const balance = balanceOf(balances, client.id);
                const lastVisit = visits
                  .filter((v) => v.clientId === client.id)
                  .reduce((latest, v) => (!latest || v.date > latest ? v.date : latest), null);
                return (
                  <ListRow
                    key={client.id}
                    onClick={() => navigate(`/sales/clients/${client.id}`)}
                    leading={<Avatar name={client.name} />}
                    title={
                      <>
                        {client.name}
                        {client.type === "wholesale" && <Badge tone="info">{tierLabel(clientTier(client))}</Badge>}
                        {hasLocation(client) && <i className="fa-solid fa-location-dot sl-loc-dot" title="له موقع محفوظ" />}
                      </>
                    }
                    subtitle={client.territoryName || "بدون منطقة"}
                    meta={
                      lastVisit ? (
                        <span>
                          <i className="fa-solid fa-route" />
                          آخر زيارة: {lastVisit}
                        </span>
                      ) : null
                    }
                    trailing={hasDebt(balance) ? <Badge tone="danger">{formatDualObj(balance)}</Badge> : null}
                  />
                );
              })}
            </List>
          )}
        </Stack>
      ) : (
        <Stack gap={12}>
          {territories.length === 0 ? (
            <EmptyState
              icon="fa-solid fa-map-location-dot"
              title="لا توجد مناطق"
              text="قسّم عملاءك إلى مناطق لتنظيم جولاتك اليومية."
              action={
                <Button icon="fa-solid fa-plus" onClick={() => setSheet({ type: "territory" })}>
                  منطقة جديدة
                </Button>
              }
            />
          ) : (
            <List>
              {territories.map((territory) => (
                <ListRow
                  key={territory.id}
                  leading={<IconTile icon="fa-solid fa-map-location-dot" tone="warning" />}
                  title={territory.name}
                  subtitle={`${formatNumber(clientCount(territory.id))} عميل`}
                  meta={territory.notes ? <span>{territory.notes}</span> : null}
                  onClick={() => setSheet({ type: "territory", territory })}
                />
              ))}
            </List>
          )}
        </Stack>
      )}

      {sheet?.type === "client" && <ClientFormSheet onClose={() => setSheet(null)} />}
      {sheet?.type === "territory" && (
        <TerritorySheet
          territory={sheet.territory}
          onClose={() => setSheet(null)}
          onDelete={sheet.territory ? () => setSheet({ type: "deleteTerritory", territory: sheet.territory }) : undefined}
        />
      )}
      <ConfirmDialog
        open={sheet?.type === "deleteTerritory"}
        title="حذف المنطقة؟"
        message={`سيبقى العملاء المرتبطون بها (${formatNumber(clientCount(sheet?.territory?.id))} عميل) دون منطقة.`}
        onCancel={() => setSheet(null)}
        onConfirm={() => {
          deleteTerritory(sheet.territory.id);
          toast.success("تم حذف المنطقة");
          setSheet(null);
        }}
      />
    </Page>
  );
}
