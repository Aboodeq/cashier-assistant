/**
 * Products can be tracked/sold at up to three nested packaging levels:
 * carton > box > piece. A product picks its own top ("package type") level when
 * it's created, then optionally supplies the conversion factor(s) needed to
 * unlock each smaller level — leaving a factor blank stops that level (and
 * anything smaller than it) from being usable for stock moves or sales, e.g.
 * a carton with boxesPerCarton set but itemsPerBox left blank can only be
 * moved/sold as cartons or boxes, never individual pieces.
 *
 * Products created before this feature existed have no packageType at all,
 * which is treated exactly like packageType "piece" — a single flat unit,
 * identical to how every product behaved previously. No backfill needed.
 */

export const PACKAGE_TYPES = [
  { value: "piece", label: "قطعة مفردة", icon: "fa-solid fa-cube" },
  { value: "box", label: "علبة", icon: "fa-solid fa-box" },
  { value: "carton", label: "كرتون", icon: "fa-solid fa-boxes-stacked" },
];

function pieceLabel(product) {
  return product?.unit?.trim() || "قطعة";
}

/**
 * Every unit this product can be moved/sold in, largest first. Always includes
 * the product's own package type; "box" additionally needs boxesPerCarton (when
 * the type is "carton"), and "piece" needs the full chain down to it.
 */
export function availableUnits(product) {
  const type = product?.packageType || "piece";
  const itemsPerBox = Number(product?.itemsPerBox) || 0;
  const boxesPerCarton = Number(product?.boxesPerCarton) || 0;

  if (type === "piece") {
    return [{ value: "piece", label: pieceLabel(product) }];
  }
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

/** How many of this product's smallest AVAILABLE unit one `unit` equals. */
export function factorToBase(product, unit) {
  const itemsPerBox = Number(product?.itemsPerBox) || 0;
  const boxesPerCarton = Number(product?.boxesPerCarton) || 0;

  if (unit === "box") return itemsPerBox > 0 ? itemsPerBox : 1;
  if (unit === "carton") {
    if (boxesPerCarton > 0 && itemsPerBox > 0) return boxesPerCarton * itemsPerBox;
    if (boxesPerCarton > 0) return boxesPerCarton;
    return 1;
  }
  return 1; // "piece", or anything unrecognized
}

/** Converts a quantity entered in `unit` to this product's smallest-available-unit count. */
export function toBaseQty(product, unit, qty) {
  return (Number(qty) || 0) * factorToBase(product, unit || "piece");
}

/** Label for the product's smallest available unit — what toBaseQty()/stock totals count in. */
export function baseUnitLabel(product) {
  const units = availableUnits(product);
  return units[units.length - 1].label;
}

/** Derives the price for `unit` from a price entered at the product's own package-type level. */
export function priceForUnit(product, unit, priceAtPackageLevel) {
  if (priceAtPackageLevel == null || priceAtPackageLevel === "") return priceAtPackageLevel;
  const type = product?.packageType || "piece";
  const packageFactor = factorToBase(product, type);
  const targetFactor = factorToBase(product, unit || type);
  if (!packageFactor) return priceAtPackageLevel;
  return (Number(priceAtPackageLevel) * targetFactor) / packageFactor;
}

/** Human label for one of a product's units (falls back gracefully for historical moves recorded under a unit the product no longer offers). */
export function unitLabel(product, unit) {
  const found = availableUnits(product).find((u) => u.value === unit);
  if (found) return found.label;
  if (unit === "box") return "علبة";
  if (unit === "carton") return "كرتون";
  return pieceLabel(product);
}
