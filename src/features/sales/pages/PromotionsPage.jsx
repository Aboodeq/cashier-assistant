import { useMemo, useState } from "react";
import { Button, IconButton } from "../../../components/ui/Button";
import { Page, Tabs } from "../../../components/ui/Page";
import { ConfirmDialog } from "../../../components/ui/Sheet";
import { Badge, Callout, EmptyState, IconTile, List, ListRow } from "../../../components/ui/Surface";
import { useToast } from "../../../components/ui/toastContext";
import PromotionSheet from "../components/PromotionSheet";
import { deletePromotion, setPromotionActive } from "../data/api";
import { useSales } from "../data/salesContext";
import { formatDate, todayISO } from "../domain/dates";
import { formatNumber } from "../domain/money";
import { PROMO_AUDIENCES, isPromoLive, promoLabel } from "../domain/pricing";

export default function PromotionsPage() {
  const toast = useToast();
  const { promotions, productById } = useSales();
  const [tab, setTab] = useState("live");
  const [sheet, setSheet] = useState(null);

  const today = todayISO();
  const live = useMemo(() => promotions.filter((p) => isPromoLive(p, today)), [promotions, today]);
  const others = useMemo(() => promotions.filter((p) => !isPromoLive(p, today)), [promotions, today]);
  const list = tab === "live" ? live : others;

  const audienceLabel = (value) => PROMO_AUDIENCES.find((a) => a.value === (value || "all"))?.label;

  return (
    <Page
      title="عروض الشركة"
      subtitle={`${formatNumber(live.length)} عرض فعّال`}
      actions={
        <Button icon="fa-solid fa-plus" onClick={() => setSheet({ type: "new" })}>
          عرض جديد
        </Button>
      }
    >
      <Callout tone="info" icon="fa-solid fa-lightbulb">
        العروض تُطبّق تلقائياً أثناء إنشاء الفاتورة حسب الصنف ونوع العميل وتاريخ الفاتورة.
      </Callout>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "live", label: "الفعّالة", count: live.length },
          { value: "others", label: "منتهية / موقوفة", count: others.length },
        ]}
      />

      {list.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-tags"
          title={tab === "live" ? "لا توجد عروض فعّالة" : "لا توجد عروض منتهية"}
          text={tab === "live" ? "أضف عروض الشركة (خصم نسبة أو كمية مجانية) لتُطبّق تلقائياً على الفواتير." : undefined}
          action={
            tab === "live" ? (
              <Button icon="fa-solid fa-plus" onClick={() => setSheet({ type: "new" })}>
                عرض جديد
              </Button>
            ) : null
          }
        />
      ) : (
        <List>
          {list.map((promo) => {
            const product = productById.get(promo.productId);
            return (
              <ListRow
                key={promo.id}
                leading={<IconTile icon={promo.type === "bonus" ? "fa-solid fa-gift" : "fa-solid fa-percent"} tone={promo.active === false ? "neutral" : "warning"} />}
                title={
                  <>
                    {promo.title || promoLabel(promo, product)}
                    {promo.active === false && <Badge tone="neutral">موقوف</Badge>}
                  </>
                }
                subtitle={`${promo.productName || product?.name || "صنف محذوف"} · ${promoLabel(promo, product)}`}
                meta={
                  <>
                    <span>
                      <i className="fa-solid fa-users" />
                      {audienceLabel(promo.appliesTo)}
                    </span>
                    <span>
                      <i className="fa-regular fa-calendar" />
                      {promo.startDate ? formatDate(promo.startDate) : "—"} {promo.endDate ? `← ${formatDate(promo.endDate)}` : "(مفتوح)"}
                    </span>
                  </>
                }
                trailing={
                  <div className="sl-row-actions">
                    <IconButton
                      icon={promo.active === false ? "fa-solid fa-play" : "fa-solid fa-pause"}
                      label={promo.active === false ? "تفعيل" : "إيقاف"}
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setPromotionActive(promo.id, promo.active === false);
                        toast.success(promo.active === false ? "تم تفعيل العرض" : "تم إيقاف العرض");
                      }}
                    />
                  </div>
                }
                onClick={() => setSheet({ type: "edit", promotion: promo })}
              />
            );
          })}
        </List>
      )}

      {(sheet?.type === "new" || sheet?.type === "edit") && (
        <PromotionSheet
          promotion={sheet.promotion}
          onClose={() => setSheet(null)}
          onDelete={sheet.promotion ? () => setSheet({ type: "delete", promotion: sheet.promotion }) : undefined}
        />
      )}
      <ConfirmDialog
        open={sheet?.type === "delete"}
        title="حذف العرض؟"
        message="الفواتير السابقة التي طُبّق عليها العرض لن تتغير."
        onCancel={() => setSheet(null)}
        onConfirm={() => {
          deletePromotion(sheet.promotion.id);
          toast.success("تم حذف العرض");
          setSheet(null);
        }}
      />
    </Page>
  );
}
