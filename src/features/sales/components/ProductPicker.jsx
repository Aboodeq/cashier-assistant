import { useMemo, useState } from "react";
import { Badge, EmptyState, IconTile, List, ListRow } from "../../../components/ui/Surface";
import { SearchInput } from "../../../components/ui/Form";
import { Sheet } from "../../../components/ui/Sheet";
import { Stack } from "../../../components/ui/Page";
import { useSales } from "../data/salesContext";
import { formatMoney } from "../domain/money";
import { formatBaseQty, packageUnitLabel } from "../domain/packaging";
import { promoFor, promoShortLabel, tierPrice } from "../domain/pricing";
import { stockOf } from "../domain/stock";

/** Pick a product for an invoice line — shows what's on the vehicle and the tier price. */
export default function ProductPicker({ onClose, onPick, tier = "retail", date, availableOf }) {
  const { products, promotions, stock, rate } = useSales();
  const [term, setTerm] = useState("");

  const list = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q),
    );
  }, [products, term]);

  return (
    <Sheet open onClose={onClose} title="اختر الصنف" icon="fa-solid fa-boxes-stacked">
      <Stack gap={12}>
        <SearchInput value={term} onChange={setTerm} placeholder="ابحث عن صنف..." autoFocus />
        {list.length === 0 ? (
          <EmptyState compact icon="fa-solid fa-boxes-stacked" title="لا توجد أصناف مطابقة" />
        ) : (
          <List>
            {list.map((product) => {
              const available = availableOf ? availableOf(product.id) : stockOf(stock, product.id);
              const promo = promoFor(promotions, product.id, tier, date);
              return (
                <ListRow
                  key={product.id}
                  onClick={() => {
                    onPick(product);
                    onClose();
                  }}
                  chevron={false}
                  leading={<IconTile icon="fa-solid fa-box" tone={available > 0 ? "brand" : "neutral"} />}
                  title={
                    <>
                      {product.name}
                      {promo && <Badge tone="warning" icon="fa-solid fa-tags">{promoShortLabel(promo, product)}</Badge>}
                    </>
                  }
                  subtitle={`${formatMoney(tierPrice(product, tier, "SYP", rate), "SYP")} / ${packageUnitLabel(product)}`}
                  trailing={
                    <Badge tone={available > 0 ? "success" : "danger"}>
                      {available > 0 ? formatBaseQty(product, available) : "لا يوجد مخزون"}
                    </Badge>
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
