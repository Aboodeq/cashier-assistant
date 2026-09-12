import { roundMoney, formatNumber } from "./money";
import { factorToBase, priceForUnit, toBaseQty, unitLabel } from "./packaging";

/*
 * Two price tiers per product:
 *  - retail    (سعر المستهلك/المفرق) — kept in the original priceUSD/priceSYP
 *              fields, so every product entered before tiers existed keeps its
 *              price as the retail price.
 *  - wholesale (سعر الجملة) — wholesaleUSD/wholesaleSYP; falls back to the
 *              retail price until it's filled in.
 * Prices are always entered for the product's own package unit (e.g. per
 * carton) and derived proportionally for smaller units.
 */

export const TIERS = [
  { value: "retail", label: "مفرق", icon: "fa-solid fa-user" },
  { value: "wholesale", label: "جملة", icon: "fa-solid fa-store" },
];

export const tierLabel = (tier) => (tier === "wholesale" ? "جملة" : "مفرق");
export const clientTier = (client) => (client?.type === "wholesale" ? "wholesale" : "retail");

function rawTierPrice(product, tier, currency) {
  if (tier === "wholesale") return currency === "USD" ? product?.wholesaleUSD : product?.wholesaleSYP;
  return currency === "USD" ? product?.priceUSD : product?.priceSYP;
}

const isSet = (v) => v != null && v !== "";

export function hasDirectTierPrice(product, tier, currency) {
  return isSet(rawTierPrice(product, tier, currency));
}

/** Price for one package-level unit of the product, in `currency`. */
export function tierPrice(product, tier, currency, rate) {
  const direct = rawTierPrice(product, tier, currency);
  if (isSet(direct)) return Number(direct);

  const other = rawTierPrice(product, tier, currency === "USD" ? "SYP" : "USD");
  if (isSet(other) && rate > 0) {
    return currency === "USD" ? Number(other) / rate : Number(other) * rate;
  }
  // Wholesale not entered yet → fall back to the retail price.
  if (tier === "wholesale") return tierPrice(product, "retail", currency, rate);
  return 0;
}

/** Suggested price for a specific sale unit (carton/box/piece). */
export function unitPrice(product, { tier, currency, unitLevel, rate }) {
  const base = tierPrice(product, tier, currency, rate);
  const price = priceForUnit(product, unitLevel, base);
  return currency === "USD" ? Math.round((Number(price) || 0) * 1000) / 1000 : Math.round(Number(price) || 0);
}

/* ── Company promotions ── */

export const PROMO_TYPES = [
  { value: "percent", label: "خصم نسبة", icon: "fa-solid fa-percent" },
  { value: "bonus", label: "كمية مجانية", icon: "fa-solid fa-gift" },
];

export const PROMO_AUDIENCES = [
  { value: "all", label: "كل العملاء" },
  { value: "retail", label: "المفرق فقط" },
  { value: "wholesale", label: "الجملة فقط" },
];

export function isPromoLive(promo, dateISO) {
  if (!promo || promo.active === false) return false;
  if (promo.startDate && dateISO < promo.startDate) return false;
  if (promo.endDate && dateISO > promo.endDate) return false;
  return true;
}

export const promoMatchesTier = (promo, tier) => !promo?.appliesTo || promo.appliesTo === "all" || promo.appliesTo === tier;

/** The promotion that applies to a product for this client tier and date. */
export function promoFor(promotions, productId, tier, dateISO) {
  return (
    promotions.find(
      (p) => p.productId === productId && isPromoLive(p, dateISO) && promoMatchesTier(p, tier),
    ) || null
  );
}

export function livePromos(promotions, dateISO) {
  return promotions.filter((p) => isPromoLive(p, dateISO));
}

/**
 * Works out what a promotion gives on a line.
 * Returns { applies, discountPct, freeQty, freeUnitLevel, missingBase }.
 */
export function evaluatePromo(promo, product, unitLevel, quantity) {
  const none = { applies: false, discountPct: 0, freeQty: 0, freeUnitLevel: null, missingBase: 0 };
  if (!promo || !product) return none;
  const qtyBase = toBaseQty(product, unitLevel, quantity);
  if (qtyBase <= 0) return none;

  if (promo.type === "bonus") {
    const buyBase = toBaseQty(product, promo.unitLevel || unitLevel, promo.buyQty);
    const freePer = Number(promo.freeQty) || 0;
    if (buyBase <= 0 || freePer <= 0) return none;
    const times = Math.floor(qtyBase / buyBase);
    if (times < 1) return { ...none, missingBase: buyBase - qtyBase };
    return {
      applies: true,
      discountPct: 0,
      freeQty: times * freePer,
      freeUnitLevel: promo.unitLevel || unitLevel,
      missingBase: 0,
    };
  }

  const minBase = promo.minQty ? toBaseQty(product, promo.unitLevel || unitLevel, promo.minQty) : 0;
  if (qtyBase < minBase) return { ...none, missingBase: minBase - qtyBase };
  return { applies: true, discountPct: Number(promo.percent) || 0, freeQty: 0, freeUnitLevel: null, missingBase: 0 };
}

export function promoLabel(promo, product) {
  if (!promo) return "";
  const unit = unitLabel(product, promo.unitLevel);
  if (promo.type === "bonus") {
    return `كل ${formatNumber(promo.buyQty)} ${unit} + ${formatNumber(promo.freeQty)} ${unit} مجاناً`;
  }
  const min = Number(promo.minQty) || 0;
  return min > 0
    ? `خصم ${formatNumber(promo.percent)}% عند شراء ${formatNumber(min)} ${unit} فأكثر`
    : `خصم ${formatNumber(promo.percent)}%`;
}

export function promoShortLabel(promo, product) {
  if (!promo) return "";
  if (promo.type === "bonus") {
    return `${formatNumber(promo.buyQty)}+${formatNumber(promo.freeQty)} ${unitLabel(product, promo.unitLevel)}`;
  }
  return `خصم ${formatNumber(promo.percent)}%`;
}

/**
 * Builds a full invoice line: totals, promotion discount/bonus, and the base
 * quantity that leaves the vehicle (sold units + any free units).
 */
export function buildLine({ product, unitLevel, quantity, price, currency, promo, manualDiscountPct = 0 }) {
  const qty = Number(quantity) || 0;
  const unitCost = Number(price) || 0;
  const gross = roundMoney(qty * unitCost, currency);
  const evaluated = evaluatePromo(promo, product, unitLevel, qty);
  const promoPct = evaluated.applies ? evaluated.discountPct : 0;
  const discountPct = Math.min(100, promoPct + (Number(manualDiscountPct) || 0));
  const discount = roundMoney((gross * discountPct) / 100, currency);
  const freeQty = evaluated.applies ? evaluated.freeQty : 0;
  const freeUnitLevel = freeQty > 0 ? evaluated.freeUnitLevel : null;

  return {
    productId: product.id,
    productName: product.name,
    unitLevel,
    unit: unitLabel(product, unitLevel),
    currency,
    quantity: qty,
    price: unitCost,
    grossTotal: gross,
    discountPct,
    promoDiscountPct: promoPct,
    manualDiscountPct: Number(manualDiscountPct) || 0,
    discount,
    lineTotal: roundMoney(gross - discount, currency),
    freeQty,
    freeUnitLevel,
    freeUnit: freeUnitLevel ? unitLabel(product, freeUnitLevel) : null,
    promotionId: evaluated.applies && promo ? promo.id : null,
    promotionTitle: evaluated.applies && promo ? promo.title || promoShortLabel(promo, product) : null,
  };
}

/** Units leaving the vehicle for a line, in base units (sold + free). */
export function lineBaseQty(product, line) {
  return (
    toBaseQty(product, line.unitLevel, line.quantity) +
    (line.freeQty ? toBaseQty(product, line.freeUnitLevel, line.freeQty) : 0)
  );
}

export function lineTotalsOf(lines) {
  return lines.reduce(
    (acc, l) => {
      const key = l.currency === "USD" ? "usd" : "syp";
      acc.gross[key] += l.grossTotal ?? l.lineTotal ?? 0;
      acc.discount[key] += l.discount || 0;
      acc.total[key] += l.lineTotal || 0;
      return acc;
    },
    { gross: { usd: 0, syp: 0 }, discount: { usd: 0, syp: 0 }, total: { usd: 0, syp: 0 } },
  );
}

export const pricePerBaseUnit = (product, tier, currency, rate) =>
  tierPrice(product, tier, currency, rate) / (factorToBase(product, product?.packageType || "piece") || 1);
