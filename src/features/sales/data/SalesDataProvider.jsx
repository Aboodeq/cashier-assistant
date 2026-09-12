import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { balanceMap } from "../domain/ledger";
import { stockMap } from "../domain/stock";
import { SalesDataContext } from "./salesContext";

const COLLECTIONS = {
  territories: "salesTerritories",
  clients: "salesClients",
  visits: "salesVisits",
  products: "salesProducts",
  promotions: "salesPromotions",
  moves: "salesStockMoves",
  loads: "salesLoads",
  counts: "salesCounts",
  orders: "salesOrders",
  payments: "salesPayments",
  expenses: "salesExpenses",
  goals: "salesGoals",
};

const KEYS = Object.keys(COLLECTIONS);
const EMPTY = Object.fromEntries(KEYS.map((k) => [k, []]));
const byNewest = (a, b) => (b.createdAt || 0) - (a.createdAt || 0);

/**
 * Subscribes once to every sales collection. Mount it with `key={uid}` so a
 * different account starts from a clean slate.
 */
export function SalesDataProvider({ uid, children }) {
  const [raw, setRaw] = useState(() => ({ ...EMPTY, settings: null }));
  const [loaded, setLoaded] = useState({});

  useEffect(() => {
    if (!uid) return undefined;
    const unsubs = KEYS.map((key) =>
      onSnapshot(
        collection(db, "users", uid, COLLECTIONS[key]),
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byNewest);
          setRaw((state) => ({ ...state, [key]: docs }));
          setLoaded((state) => (state[key] ? state : { ...state, [key]: true }));
        },
        (error) => {
          console.error(`فشل تحميل ${COLLECTIONS[key]}`, error);
          setLoaded((state) => (state[key] ? state : { ...state, [key]: true }));
        },
      ),
    );
    unsubs.push(
      onSnapshot(doc(db, "users", uid, "salesSettings", "main"), (snap) => {
        setRaw((state) => ({ ...state, settings: snap.exists() ? { id: snap.id, ...snap.data() } : {} }));
        setLoaded((state) => (state.settings ? state : { ...state, settings: true }));
      }),
    );
    return () => unsubs.forEach((unsub) => unsub());
  }, [uid]);

  const value = useMemo(() => {
    const settings = raw.settings || {};
    return {
      ...raw,
      uid,
      settings,
      rate: Number(settings.usdToSyp) || 0,
      productById: new Map(raw.products.map((p) => [p.id, p])),
      clientById: new Map(raw.clients.map((c) => [c.id, c])),
      territoryById: new Map(raw.territories.map((t) => [t.id, t])),
      stock: stockMap(raw.products, raw.moves),
      balances: balanceMap(raw.orders, raw.payments),
      ready: KEYS.every((k) => loaded[k]) && Boolean(loaded.settings),
    };
  }, [raw, loaded, uid]);

  return <SalesDataContext.Provider value={value}>{children}</SalesDataContext.Provider>;
}
