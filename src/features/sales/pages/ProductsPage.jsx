import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../components/ui/Button";
import { SearchInput } from "../../../components/ui/Form";
import { Chip, Grid, Page, Stack, Toolbar } from "../../../components/ui/Page";
import { ConfirmDialog } from "../../../components/ui/Sheet";
import { Badge, EmptyState, IconTile, List, ListRow, StatTile } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import ProductSheet from "../components/ProductSheet";
import { deleteProduct } from "../data/api";
import { useSales } from "../data/salesContext";
import { todayISO } from "../domain/dates";
import { formatMoney, formatNumber } from "../domain/money";
import { formatBaseQty, packageUnitLabel, packagingSummary } from "../domain/packaging";
import { promoFor, promoShortLabel, tierPrice } from "../domain/pricing";
import { isLowStock, stockOf } from "../domain/stock";

export default function ProductsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { products, promotions, stock, rate } = useSales();
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("");
  const [sheet, setSheet] = useState(null);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "ar")),
    [products],
  );

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    return products
      .filter((p) => !q || p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q))
      .filter((p) => (category ? p.category === category : true))
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [products, term, category]);

  const lowCount = products.filter((p) => isLowStock(p, stockOf(stock, p.id))).length;
  const withPromo = products.filter((p) => promoFor(promotions, p.id, "retail", todayISO())).length;

  return (
    <Page
      title="المنتجات"
      subtitle={`${formatNumber(products.length)} منتج`}
      actions={
        <Button icon="fa-solid fa-plus" onClick={() => setSheet({ type: "new" })}>
          منتج جديد
        </Button>
      }
    >
      <Grid min={150}>
        <StatTile label="عدد المنتجات" value={formatNumber(products.length)} icon="fa-solid fa-boxes-stacked" />
        <StatTile label="عليها عروض" value={formatNumber(withPromo)} tone="warning" icon="fa-solid fa-tags" onClick={() => navigate("/sales/promotions")} />
        <StatTile label="مخزون منخفض" value={formatNumber(lowCount)} tone={lowCount ? "danger" : "success"} icon="fa-solid fa-triangle-exclamation" onClick={() => navigate("/sales/stock")} />
      </Grid>

      <Stack gap={10}>
        <SearchInput value={term} onChange={setTerm} placeholder="ابحث عن منتج..." />
        {categories.length > 0 && (
          <Toolbar>
            <Chip active={!category} onClick={() => setCategory("")}>
              كل الفئات
            </Chip>
            {categories.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
              </Chip>
            ))}
          </Toolbar>
        )}
      </Stack>

      {filtered.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-boxes-stacked"
          title={products.length === 0 ? "لا توجد منتجات" : "لا توجد نتائج"}
          text={products.length === 0 ? "أضف منتجاتك مع أسعار المفرق والجملة وتفاصيل التعبئة." : "جرّب بحثاً آخر."}
          action={
            products.length === 0 ? (
              <Button icon="fa-solid fa-plus" onClick={() => setSheet({ type: "new" })}>
                منتج جديد
              </Button>
            ) : null
          }
        />
      ) : (
        <List>
          {filtered.map((product) => {
            const qty = stockOf(stock, product.id);
            const low = isLowStock(product, qty);
            const promo = promoFor(promotions, product.id, "retail", todayISO());
            const unit = packageUnitLabel(product);
            return (
              <ListRow
                key={product.id}
                leading={<IconTile icon="fa-solid fa-box" tone={low ? "danger" : "brand"} />}
                title={
                  <>
                    {product.name}
                    {product.category && <Badge tone="neutral">{product.category}</Badge>}
                    {promo && (
                      <Badge tone="warning" icon="fa-solid fa-tags">
                        {promoShortLabel(promo, product)}
                      </Badge>
                    )}
                  </>
                }
                subtitle={packagingSummary(product)}
                meta={
                  <>
                    <span>
                      <i className="fa-solid fa-user" />
                      مفرق: {formatMoney(tierPrice(product, "retail", "SYP", rate), "SYP")} / {unit}
                    </span>
                    <span>
                      <i className="fa-solid fa-store" />
                      جملة: {formatMoney(tierPrice(product, "wholesale", "SYP", rate), "SYP")} / {unit}
                    </span>
                  </>
                }
                trailing={
                  <Badge tone={low ? "danger" : qty > 0 ? "success" : "neutral"}>{formatBaseQty(product, qty)}</Badge>
                }
                onClick={() => setSheet({ type: "edit", product })}
              />
            );
          })}
        </List>
      )}

      {(sheet?.type === "new" || sheet?.type === "edit") && (
        <ProductSheet
          product={sheet.product}
          onClose={() => setSheet(null)}
          onDelete={sheet.product ? () => setSheet({ type: "delete", product: sheet.product }) : undefined}
        />
      )}
      <ConfirmDialog
        open={sheet?.type === "delete"}
        title="حذف المنتج؟"
        message="سيبقى سجل حركاته وفواتيره، لكنه لن يظهر في قوائم البيع والتحميل."
        onCancel={() => setSheet(null)}
        onConfirm={() => {
          deleteProduct(sheet.product.id);
          toast.success("تم حذف المنتج");
          setSheet(null);
        }}
      />
    </Page>
  );
}
