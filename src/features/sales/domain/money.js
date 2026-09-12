/*
 * Money is always tracked per currency. USD and SYP amounts are never blended
 * into one converted figure — a client can owe both at the same time, and a
 * single invoice can hold lines priced in either currency.
 */

export const CURRENCIES = [
  { value: "USD", label: "دولار", symbol: "$" },
  { value: "SYP", label: "ليرة سورية", symbol: "ل.س" },
];

export const currencyLabel = (c) => (c === "USD" ? "دولار" : "ليرة سورية");
export const currencySymbol = (c) => (c === "USD" ? "$" : "ل.س");

/** Latin digits regardless of the phone's locale. */
export function formatNumber(value, maxFractionDigits = 2) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: maxFractionDigits }).format(n);
}

export function roundMoney(amount, currency) {
  const n = Number(amount) || 0;
  return currency === "USD" ? Math.round(n * 100) / 100 : Math.round(n);
}

export function formatMoney(amount, currency) {
  const n = Number(amount) || 0;
  return currency === "USD" ? `$${formatNumber(n, 2)}` : `${formatNumber(n, 0)} ل.س`;
}

/** "$30 + 130,000 ل.س" — skips a currency when it's zero. */
export function formatDual(usd, syp, zeroLabel = "0") {
  const parts = [];
  if (Math.abs(Number(usd) || 0) >= 0.005) parts.push(formatMoney(usd, "USD"));
  if (Math.abs(Number(syp) || 0) >= 0.5) parts.push(formatMoney(syp, "SYP"));
  return parts.length ? parts.join(" + ") : zeroLabel;
}

export const zeroDual = () => ({ usd: 0, syp: 0 });
export const isZeroDual = (d) => !d || (Math.abs(d.usd) < 0.005 && Math.abs(d.syp) < 0.5);
export const formatDualObj = (d, zeroLabel = "0") => formatDual(d?.usd, d?.syp, zeroLabel);

export function addDual(a, b) {
  return { usd: (a?.usd || 0) + (b?.usd || 0), syp: (a?.syp || 0) + (b?.syp || 0) };
}
export function subDual(a, b) {
  return { usd: (a?.usd || 0) - (b?.usd || 0), syp: (a?.syp || 0) - (b?.syp || 0) };
}
export function scaleDual(d, factor) {
  return { usd: (d?.usd || 0) * factor, syp: (d?.syp || 0) * factor };
}
export function dualOf(currency, amount) {
  return currency === "USD" ? { usd: Number(amount) || 0, syp: 0 } : { usd: 0, syp: Number(amount) || 0 };
}

/** Rough single number for sorting/ranking only — never shown as an amount. */
export function rankValue(dual, rate) {
  const syp = dual?.syp || 0;
  return (dual?.usd || 0) + (rate > 0 ? syp / rate : syp / 100000);
}
