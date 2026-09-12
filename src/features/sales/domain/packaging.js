import { formatNumber } from "./money";

/*
 * Products can be tracked/sold at up to three nested packaging levels:
 * carton > box > piece. A product picks its own top ("package type") level,
 * then optionally supplies the conversion factor(s) needed to unlock each
 * smaller level — leaving a factor blank means that level (and anything
 * smaller) can't be moved or sold, e.g. a carton with boxes-per-carton set
 * but items-per-box blank can only be handled as cartons or boxes.
 *
 * Products created before this feature have no packageType, which behaves
 * exactly like "piece": a single flat unit. No backfill needed.
 */

export const PACKAGE_TYPES = [
  { value: "piece", label: "قطعة مفردة", icon: "fa-solid fa-cube" },
  { value: "box", label: "علبة", icon: "fa-solid fa-box" },
  { value: "carton", label: "كرتون", icon: "fa-solid fa-boxes-stacked" },
];

const pieceLabel = (product) => product?.unit?.trim() || "قطعة";

/** Every unit this product can be moved/sold in, largest first. */
export function availableUnits(product) {
  const type = product?.packageType || "piece";
  const itemsPerBox = Number(product?.itemsPerBox) || 0;
  const boxesPerCarton = Number(product?.boxesPerCarton) || 0;

  if (type === "piece") return [{ value: "piece", label: pieceLabel(product) }];
  if (type === "box") {
    const units = [{ value: "box", label: "علبة" }];
    if (itemsPerBox > 0) units.push({ value: "piece", label: pieceLabel(product) });
    return units;
  }
  const units = [{ value: "carton", label: "كرتون" }];
  if (boxesPerCarton > 0) {
    units.push({ value: "box", label: "علبة" });
    if (itemsPerBox > 0) units.push({ value: "piece", label: pieceLabel(product) });
  }
  return units;
}

/** How many of this product's smallest available unit one `unit` equals. */
export function factorToBase(product, unit) {
  const itemsPerBox = Number(product?.itemsPerBox) || 0;
  const boxesPerCarton = Number(product?.boxesPerCarton) || 0;
  if (unit === "box") return itemsPerBox > 0 ? itemsPerBox : 1;
  if (unit === "carton") {
    if (boxesPerCarton > 0 && itemsPerBox > 0) return boxesPerCarton * itemsPerBox;
    if (boxesPerCarton > 0) return boxesPerCarton;
    return 1;
  }
  return 1; // "piece" or anything unrecognized
}

export function toBaseQty(product, unit, qty) {
  return (Number(qty) || 0) * factorToBase(product, unit || "piece");
}

/** The smallest available unit — what stock totals are counted in. */
export function baseLevel(product) {
  const units = availableUnits(product);
  return units[units.length - 1].value;
}

export function baseUnitLabel(product) {
  const units = availableUnits(product);
  return units[units.length - 1].label;
}

export const defaultUnit = (product) => availableUnits(product)[0].value;
export const hasUnitChoice = (product) => availableUnits(product).length > 1;

/** Label for one of a product's units, tolerant of historical values. */
export function unitLabel(product, unit) {
  const found = availableUnits(product).find((u) => u.value === unit);
  if (found) return found.label;
  if (unit === "box") return "علبة";
  if (unit === "carton") return "كرتون";
  return pieceLabel(product);
}

/** Splits a base quantity into whole units, largest first: 3 كرتون + 4 علبة. */
export function breakdown(product, baseQty) {
  let rest = Math.abs(Number(baseQty) || 0);
  const units = availableUnits(product);
  const parts = [];
  for (const u of units) {
    const factor = factorToBase(product, u.value);
    if (factor <= 0) continue;
    const whole = Math.floor(rest / factor);
    if (whole > 0) {
      parts.push({ level: u.value, label: u.label, qty: whole });
      rest -= whole * factor;
    }
  }
  if (rest > 0.0001) {
    const smallest = units[units.length - 1];
    parts.push({ level: smallest.value, label: smallest.label, qty: Math.round(rest * 100) / 100 });
  }
  return parts;
}

/** "3 كرتون + 4 علبة" (or "0 قطعة" when empty). */
export function formatBaseQty(product, baseQty) {
  const n = Number(baseQty) || 0;
  const parts = breakdown(product, n);
  if (!parts.length) return `0 ${baseUnitLabel(product)}`;
  const text = parts.map((p) => `${formatNumber(p.qty)} ${p.label}`).join(" + ");
  return n < 0 ? `- ${text}` : text;
}

/** Sums a { carton: "2", box: "3" } entry map into base units. */
export function baseFromUnitMap(product, map) {
  return availableUnits(product).reduce((sum, u) => sum + toBaseQty(product, u.value, map?.[u.value]), 0);
}

/** The reverse: splits a base quantity into per-unit input values. */
export function unitMapFromBase(product, baseQty) {
  const map = {};
  for (const part of breakdown(product, baseQty)) map[part.level] = String(part.qty);
  return map;
}

/** Quantity as entered on a line/move: "5 كرتون". */
export function formatUnitQty(product, unit, qty) {
  return `${formatNumber(qty)} ${unitLabel(product, unit)}`;
}

/** "الكرتون = 12 علبة · العلبة = 24 قطعة" */
export function packagingSummary(product) {
  const type = product?.packageType || "piece";
  const itemsPerBox = Number(product?.itemsPerBox) || 0;
  const boxesPerCarton = Number(product?.boxesPerCarton) || 0;
  const parts = [];
  if (type === "carton" && boxesPerCarton > 0) parts.push(`الكرتون = ${formatNumber(boxesPerCarton)} علبة`);
  if (type !== "piece" && itemsPerBox > 0) parts.push(`العلبة = ${formatNumber(itemsPerBox)} ${pieceLabel(product)}`);
  if (!parts.length) return type === "piece" ? `الوحدة: ${pieceLabel(product)}` : "لم تُحدَّد تفاصيل التعبئة";
  return parts.join(" · ");
}

/**
 * Derives the price for `unit` from a price entered at the product's own
 * package-type level (e.g. a per-carton price gives the per-box price).
 */
export function priceForUnit(product, unit, priceAtPackageLevel) {
  if (priceAtPackageLevel == null || priceAtPackageLevel === "") return priceAtPackageLevel;
  const type = product?.packageType || "piece";
  const packageFactor = factorToBase(product, type);
  const targetFactor = factorToBase(product, unit || type);
  if (!packageFactor) return priceAtPackageLevel;
  return (Number(priceAtPackageLevel) * targetFactor) / packageFactor;
}

/** The unit a product's prices are entered for. */
export function packageUnitLabel(product) {
  const type = product?.packageType || "piece";
  if (type === "carton") return "كرتون";
  if (type === "box") return "علبة";
  return pieceLabel(product);
}
