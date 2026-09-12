import { createContext, useContext } from "react";

export const SalesDataContext = createContext(null);

/**
 * Every sales page reads its data from here. The whole module subscribes once
 * (in SalesShell) instead of each page re-subscribing to the same collections
 * on every navigation.
 */
export function useSales() {
  const value = useContext(SalesDataContext);
  if (!value) throw new Error("useSales() must be used inside <SalesDataProvider>");
  return value;
}
