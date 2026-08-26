import { auth } from "../../firebase/config";
import { useFirestoreDoc } from "../../hooks/useFirestoreDoc";

/** The one shared USD→SYP rate every sales page prices/converts against. */
export function useExchangeRate() {
  const uid = auth.currentUser?.uid;
  const settings = useFirestoreDoc(uid && ["users", uid, "salesSettings", "main"]);
  return settings?.usdToSyp || 0;
}

/**
 * A product can have a price in USD, in SYP, or both. If only one is set,
 * the other currency's price is derived from the exchange rate — so a rep
 * only has to price a product once, in whichever currency they think in.
 */
export function priceIn(product, currency, rate) {
  const usd = product?.priceUSD;
  const syp = product?.priceSYP;
  if (currency === "USD") {
    if (usd != null && usd !== "") return Number(usd);
    if (syp != null && syp !== "" && rate > 0) return Number(syp) / rate;
    return 0;
  }
  if (syp != null && syp !== "") return Number(syp);
  if (usd != null && usd !== "" && rate > 0) return Number(usd) * rate;
  return 0;
}

/** Whether a product's price in `currency` is a direct entry vs. rate-converted. */
export function hasDirectPrice(product, currency) {
  const value = currency === "USD" ? product?.priceUSD : product?.priceSYP;
  return value != null && value !== "";
}

export function formatMoney(amount, currency) {
  const n = Number(amount) || 0;
  return currency === "USD" ? `$${n.toLocaleString()}` : `${n.toLocaleString()} ل.س`;
}

/** "$10 + 5,000 ل.س" — skips a currency entirely when it's zero, never blends the two. */
export function formatDual(usd, syp) {
  const parts = [];
  if (usd) parts.push(`$${Number(usd).toLocaleString()}`);
  if (syp) parts.push(`${Number(syp).toLocaleString()} ل.س`);
  return parts.length ? parts.join(" + ") : "0";
}

export const CURRENCIES = [
  { value: "USD", label: "دولار", symbol: "$" },
  { value: "SYP", label: "ليرة سورية", symbol: "ل.س" },
];
