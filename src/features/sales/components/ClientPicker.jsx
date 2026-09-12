import { useMemo, useState } from "react";
import { Avatar, Badge, EmptyState, List, ListRow } from "../../../components/ui/Surface";
import { Button } from "../../../components/ui/Button";
import { SearchInput } from "../../../components/ui/Form";
import { Sheet } from "../../../components/ui/Sheet";
import { Stack } from "../../../components/ui/Page";
import { useSales } from "../data/salesContext";
import { balanceOf, hasDebt } from "../domain/ledger";
import { formatDualObj } from "../domain/money";
import { clientTier, tierLabel } from "../domain/pricing";

export default function ClientPicker({ onClose, onPick, onCreate, title = "اختر العميل" }) {
  const { clients, balances } = useSales();
  const [term, setTerm] = useState("");

  const list = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => c.name?.toLowerCase().includes(q) || String(c.phone || "").includes(q) || c.territoryName?.toLowerCase().includes(q),
    );
  }, [clients, term]);

  return (
    <Sheet open onClose={onClose} title={title} icon="fa-solid fa-users">
      <Stack gap={12}>
        <SearchInput value={term} onChange={setTerm} placeholder="ابحث بالاسم أو الهاتف..." autoFocus />
        {onCreate && (
          <Button variant="soft" icon="fa-solid fa-user-plus" block onClick={onCreate}>
            إضافة عميل جديد
          </Button>
        )}
        {list.length === 0 ? (
          <EmptyState compact icon="fa-solid fa-users" title="لا يوجد عملاء مطابقون" />
        ) : (
          <List>
            {list.map((client) => {
              const balance = balanceOf(balances, client.id);
              return (
                <ListRow
                  key={client.id}
                  onClick={() => onPick(client)}
                  chevron={false}
                  leading={<Avatar name={client.name} />}
                  title={
                    <>
                      {client.name}
                      {client.type === "wholesale" && <Badge tone="info">{tierLabel(clientTier(client))}</Badge>}
                    </>
                  }
                  subtitle={client.territoryName || "بدون منطقة"}
                  trailing={
                    hasDebt(balance) ? <Badge tone="danger">{formatDualObj(balance)}</Badge> : null
                  }
                />
              );
            })}
          </List>
        )}
      </Stack>
    </Sheet>
  );
}
