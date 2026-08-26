import { useState } from "react";
import { auth } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { formatDual } from "./currency";
import { baseUnitLabel, toBaseQty } from "./packaging";
import "./ReportsPage.css";

const today = () => new Date().toISOString().split("T")[0];
const monthStart = () => `${today().slice(0, 7)}-01`;
const yearStart = () => `${today().slice(0, 4)}-01-01`;
const lastMonthRange = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  const from = d.toISOString().slice(0, 7) + "-01";
  const to = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
  return { from, to };
};

const sumDual = (list, usdField, sypField) =>
  list.reduce(
    (acc, x) => {
      acc.usd += x[usdField] || 0;
      acc.syp += x[sypField] || 0;
      return acc;
    },
    { usd: 0, syp: 0 },
  );

export default function ReportsPage() {
  const uid = auth.currentUser?.uid;
  const orders = useFirestoreCollection(uid && ["users", uid, "salesOrders"]);
  const payments = useFirestoreCollection(uid && ["users", uid, "salesPayments"]);
  const expenses = useFirestoreCollection(uid && ["users", uid, "salesExpenses"]);
  const products = useFirestoreCollection(uid && ["users", uid, "salesProducts"]);

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());

  const inRange = (date) => date >= from && date <= to;
  const rangedOrders = orders.filter((o) => inRange(o.date));
  const rangedPayments = payments.filter((p) => inRange(p.date));
  const rangedExpenses = expenses.filter((x) => inRange(x.date));

  const salesTotal = sumDual(rangedOrders, "totalUSD", "totalSYP");
  const collectedTotal = rangedPayments.reduce(
    (acc, p) => {
      if (p.currency === "USD") acc.usd += p.amount;
      else acc.syp += p.amount;
      return acc;
    },
    { usd: 0, syp: 0 },
  );
  const expensesTotal = rangedExpenses.reduce(
    (acc, x) => {
      if (x.currency === "USD") acc.usd += x.amount;
      else acc.syp += x.amount;
      return acc;
    },
    { usd: 0, syp: 0 },
  );

  // Outstanding client debt is a running balance, not a date-ranged figure —
  // it always reflects the current snapshot regardless of the report window.
  const creditOrders = orders.filter((o) => o.paymentType === "credit");
  const owedUSD =
    creditOrders.reduce((s, o) => s + (o.totalUSD || 0), 0) -
    payments.filter((p) => p.currency === "USD").reduce((s, p) => s + p.amount, 0);
  const owedSYP =
    creditOrders.reduce((s, o) => s + (o.totalSYP || 0), 0) -
    payments.filter((p) => p.currency === "SYP").reduce((s, p) => s + p.amount, 0);

  const cashOrders = rangedOrders.filter((o) => o.paymentType === "cash");
  const creditRangedOrders = rangedOrders.filter((o) => o.paymentType === "credit");
  const cashTotal = sumDual(cashOrders, "totalUSD", "totalSYP");
  const creditTotal = sumDual(creditRangedOrders, "totalUSD", "totalSYP");

  // Ranking uses a rough USD-equivalent proxy (same heuristic already used for
  // sorting balance cards elsewhere) — display always stays per-currency.
  const rankKey = (usd, syp) => usd + syp / 100000;

  const clientMap = new Map();
  for (const o of rangedOrders) {
    const key = o.clientId;
    const cur = clientMap.get(key) || { name: o.clientName, territory: o.territoryName, usd: 0, syp: 0, count: 0 };
    cur.usd += o.totalUSD || 0;
    cur.syp += o.totalSYP || 0;
    cur.count += 1;
    clientMap.set(key, cur);
  }
  const topClients = [...clientMap.values()]
    .sort((a, b) => rankKey(b.usd, b.syp) - rankKey(a.usd, a.syp))
    .slice(0, 5);

  // Line items for the same product may each be in a different unit (carton/
  // box/piece), so quantities are normalized to the product's smallest
  // available unit before summing/ranking — otherwise "5 cartons + 3 pieces"
  // would nonsensically sum to "8".
  const productMap = new Map();
  for (const o of rangedOrders) {
    for (const item of o.items || []) {
      const product = products.find((p) => p.id === item.productId);
      const cur = productMap.get(item.productId) || {
        name: item.productName,
        unit: baseUnitLabel(product),
        qty: 0,
        usd: 0,
        syp: 0,
      };
      cur.qty += toBaseQty(product, item.unitLevel, item.quantity);
      if (item.currency === "USD") cur.usd += item.lineTotal;
      else cur.syp += item.lineTotal;
      productMap.set(item.productId, cur);
    }
  }
  const topProducts = [...productMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

  const territoryMap = new Map();
  for (const o of rangedOrders) {
    const key = o.territoryId || "—";
    const cur = territoryMap.get(key) || { name: o.territoryName || "بدون منطقة", usd: 0, syp: 0, count: 0 };
    cur.usd += o.totalUSD || 0;
    cur.syp += o.totalSYP || 0;
    cur.count += 1;
    territoryMap.set(key, cur);
  }
  const territories = [...territoryMap.values()].sort((a, b) => rankKey(b.usd, b.syp) - rankKey(a.usd, a.syp));

  const applyPreset = (preset) => {
    if (preset === "month") {
      setFrom(monthStart());
      setTo(today());
    } else if (preset === "lastMonth") {
      const r = lastMonthRange();
      setFrom(r.from);
      setTo(r.to);
    } else if (preset === "year") {
      setFrom(yearStart());
      setTo(today());
    }
  };

  return (
    <div className="rp-root">
      {/* Header */}
      <div className="rp-header">
        <div className="rp-header-bg" />
        <div className="rp-header-body">
          <div className="rp-header-left">
            <div className="rp-header-ico">
              <i className="fa-solid fa-chart-line" style={{ fontSize: 22, color: "#fff" }} />
            </div>
            <div>
              <h1 className="rp-header-title">التقارير</h1>
              <p className="rp-header-sub">نظرة شاملة على أداء المبيعات والمصاريف والعملاء</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rp-body">
        {/* Date range */}
        <div className="rp-range-card">
          <div className="rp-range-row">
            <div className="rp-field">
              <label className="rp-lbl">
                <i className="fa-regular fa-calendar" />
                من
              </label>
              <div className="rp-inp-wrap">
                <input className="rp-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
            </div>
            <div className="rp-field">
              <label className="rp-lbl">
                <i className="fa-regular fa-calendar" />
                إلى
              </label>
              <div className="rp-inp-wrap">
                <input className="rp-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </div>
            <div className="rp-presets">
              <button type="button" className="rp-preset-btn" onClick={() => applyPreset("month")}>
                هذا الشهر
              </button>
              <button type="button" className="rp-preset-btn" onClick={() => applyPreset("lastMonth")}>
                الشهر الماضي
              </button>
              <button type="button" className="rp-preset-btn" onClick={() => applyPreset("year")}>
                هذه السنة
              </button>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="rp-stats-strip">
          <div className="rp-stat-chip">
            <span className="rp-stat-chip-lbl">مبيعات الفترة</span>
            <span className="rp-stat-chip-val">{formatDual(salesTotal.usd, salesTotal.syp)}</span>
          </div>
          <div className="rp-stat-chip">
            <span className="rp-stat-chip-lbl">محصّل خلال الفترة</span>
            <span className="rp-stat-chip-val" style={{ color: "#059669" }}>
              {formatDual(collectedTotal.usd, collectedTotal.syp)}
            </span>
          </div>
          <div className="rp-stat-chip">
            <span className="rp-stat-chip-lbl">مصاريف الفترة</span>
            <span className="rp-stat-chip-val" style={{ color: "#92400e" }}>
              {formatDual(expensesTotal.usd, expensesTotal.syp)}
            </span>
          </div>
          <div className="rp-stat-chip">
            <span className="rp-stat-chip-lbl">المستحق حالياً على العملاء</span>
            <span className="rp-stat-chip-val" style={{ color: "#dc2626" }}>
              {formatDual(owedUSD, owedSYP)}
            </span>
          </div>
        </div>

        {/* Cash vs credit */}
        {rangedOrders.length > 0 && (
          <div className="rp-stats-strip">
            <div className="rp-stat-chip">
              <span className="rp-stat-chip-lbl">مبيعات نقداً</span>
              <span className="rp-stat-chip-val" style={{ color: "#059669" }}>
                {formatDual(cashTotal.usd, cashTotal.syp)}
              </span>
            </div>
            <div className="rp-stat-chip">
              <span className="rp-stat-chip-lbl">مبيعات بالدَّين</span>
              <span className="rp-stat-chip-val" style={{ color: "#b45309" }}>
                {formatDual(creditTotal.usd, creditTotal.syp)}
              </span>
            </div>
          </div>
        )}

        {rangedOrders.length === 0 ? (
          <div className="rp-empty">
            <div className="rp-empty-ico">
              <i className="fa-solid fa-chart-line" style={{ fontSize: 34, color: "#bfdbfe" }} />
            </div>
            <div className="rp-empty-title">لا توجد عمليات بيع في هذه الفترة</div>
            <div className="rp-empty-sub">جرّب توسيع نطاق التاريخ أعلاه</div>
          </div>
        ) : (
          <>
            {/* Top clients */}
            <div className="rp-panel">
              <div className="rp-section-title">
                <i className="fa-solid fa-crown" style={{ color: "#1d4ed8", fontSize: 16 }} />
                أفضل العملاء
              </div>
              <div className="rp-rank-list">
                {topClients.map((c, i) => (
                  <div key={c.name + i} className="rp-rank-row">
                    <span className="rp-rank-num">{i + 1}</span>
                    <div className="rp-rank-info">
                      <span className="rp-rank-name">{c.name}</span>
                      <span className="rp-rank-sub">
                        {c.territory} · {c.count} عملية بيع
                      </span>
                    </div>
                    <span className="rp-rank-val">{formatDual(c.usd, c.syp)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top products */}
            <div className="rp-panel">
              <div className="rp-section-title">
                <i className="fa-solid fa-box-open" style={{ color: "#1d4ed8", fontSize: 16 }} />
                الأصناف الأكثر مبيعاً
              </div>
              <div className="rp-rank-list">
                {topProducts.map((p, i) => (
                  <div key={p.name + i} className="rp-rank-row">
                    <span className="rp-rank-num">{i + 1}</span>
                    <div className="rp-rank-info">
                      <span className="rp-rank-name">{p.name}</span>
                      <span className="rp-rank-sub">
                        {p.qty.toLocaleString()} {p.unit}
                      </span>
                    </div>
                    <span className="rp-rank-val">{formatDual(p.usd, p.syp)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Territories */}
            <div className="rp-panel">
              <div className="rp-section-title">
                <i className="fa-solid fa-map-location-dot" style={{ color: "#1d4ed8", fontSize: 16 }} />
                الأداء حسب المنطقة
              </div>
              <div className="rp-rank-list">
                {territories.map((t, i) => (
                  <div key={t.name + i} className="rp-rank-row">
                    <span className="rp-rank-num">{i + 1}</span>
                    <div className="rp-rank-info">
                      <span className="rp-rank-name">{t.name}</span>
                      <span className="rp-rank-sub">{t.count} عملية بيع</span>
                    </div>
                    <span className="rp-rank-val">{formatDual(t.usd, t.syp)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
