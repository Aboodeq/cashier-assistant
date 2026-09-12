import { toBaseQty } from "./packaging";

/*
 * Vehicle stock is always derived from the movement log — never stored as a
 * running total, so edits and deletions can't drift. Each move records the
 * unit it was entered in (carton/box/piece) and is normalized to the
 * product's smallest available unit before being summed.
 */

export const MOVE_TYPES = {
  load: { label: "تحميل", icon: "fa-solid fa-dolly", tone: "success", sign: 1 },
  return: { label: "إرجاع للمستودع", icon: "fa-solid fa-rotate-left", tone: "warning", sign: -1 },
  sale: { label: "بيع", icon: "fa-solid fa-cart-shopping", tone: "brand", sign: -1 },
  customerReturn: { label: "مرتجع من عميل", icon: "fa-solid fa-arrow-rotate-left", tone: "info", sign: 1 },
  // Stock-count corrections carry their own sign in `quantity`.
  adjust: { label: "تسوية جرد", icon: "fa-solid fa-clipboard-check", tone: "neutral", sign: 1 },
};

export const moveMeta = (type) => MOVE_TYPES[type] || MOVE_TYPES.sale;

/** Signed effect of a move on stock, in the product's base units. */
export function moveDelta(product, move) {
  const qty = toBaseQty(product, move.unitLevel, move.quantity);
  return moveMeta(move.type).sign * qty;
}

/** Map of productId → base-unit quantity currently in the vehicle. */
export function stockMap(products, moves) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const totals = new Map(products.map((p) => [p.id, 0]));
  for (const move of moves) {
    const product = byId.get(move.productId);
    if (!product) continue; // product deleted — its history no longer counts
    totals.set(move.productId, (totals.get(move.productId) || 0) + moveDelta(product, move));
  }
  return totals;
}

export const stockOf = (stock, productId) => stock.get(productId) || 0;

export function isLowStock(product, qty) {
  return product?.lowStockThreshold != null && qty <= Number(product.lowStockThreshold);
}

/** Manual moves can be edited; sale/return-driven ones belong to their document. */
export const isManualMove = (move) => (move.type === "load" || move.type === "return") && !move.loadId;
