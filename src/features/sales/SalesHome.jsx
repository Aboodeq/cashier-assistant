import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { formatDual } from "./currency";
import "./SalesHome.css";

const SECTIONS = [
  {
    to: "/sales/territories",
    icon: "fa-solid fa-map-location-dot",
    label: "المناطق",
    desc: "عرّف مناطق التغطية وتابع عدد العملاء في كل منطقة",
    bg: "#fff7ed",
    color: "#c2410c",
  },
  {
    to: "/sales/clients",
    icon: "fa-solid fa-address-book",
    label: "العملاء",
    desc: "أضف عملاءك، اربطهم بالمناطق، وصنّفهم حسب الأهمية",
    bg: "#f5f3ff",
    color: "#7c3aed",
  },
  {
    to: "/sales/visits",
    icon: "fa-solid fa-route",
    label: "الزيارات",
    desc: "سجّل زياراتك الميدانية ونتائجها ومتابعاتك",
    bg: "#f0f9ff",
    color: "#0369a1",
  },
  {
    to: "/sales/products",
    icon: "fa-solid fa-boxes-stacked",
    label: "المنتجات والمخزون",
    desc: "كتالوج المنتجات، وتحميل/إرجاع البضاعة من وإلى السيارة",
    bg: "#f0fdfa",
    color: "#0f766e",
  },
  {
    to: "/sales/orders",
    icon: "fa-solid fa-file-invoice-dollar",
    label: "المبيعات",
    desc: "سجّل عمليات البيع نقداً أو بالدَّين، وتُخصم البضاعة تلقائياً",
    bg: "#eef2ff",
    color: "#4338ca",
  },
  {
    to: "/sales/expenses",
    icon: "fa-solid fa-car",
    label: "السيارة والمصاريف",
    desc: "سجّل مصاريف السيارة (وقود، صيانة، رسوم...) وتابع قراءة العداد",
    bg: "#fffbeb",
    color: "#92400e",
  },
  {
    to: "/sales/goals",
    icon: "fa-solid fa-bullseye",
    label: "الأهداف والعمولات",
    desc: "حدّد هدف مبيعاتك الشهري ونسبة عمولتك وتابع نسبة إنجازك",
    bg: "#fdf2f8",
    color: "#9d174d",
  },
];

const ROADMAP = [{ icon: "fa-solid fa-chart-line", label: "التقارير" }];

const today = () => new Date().toISOString().split("T")[0];

export default function SalesHome({ nav }) {
  const uid = auth.currentUser?.uid;
  const territories = useFirestoreCollection(uid && ["users", uid, "salesTerritories"]);
  const clients = useFirestoreCollection(uid && ["users", uid, "salesClients"]);
  const visits = useFirestoreCollection(uid && ["users", uid, "salesVisits"]);
  const products = useFirestoreCollection(uid && ["users", uid, "salesProducts"]);
  const moves = useFirestoreCollection(uid && ["users", uid, "salesStockMoves"]);
  const orders = useFirestoreCollection(uid && ["users", uid, "salesOrders"]);
  const payments = useFirestoreCollection(uid && ["users", uid, "salesPayments"]);
  const expenses = useFirestoreCollection(uid && ["users", uid, "salesExpenses"]);
  const goals = useFirestoreCollection(uid && ["users", uid, "salesGoals"]);
  const name = auth.currentUser?.email?.split("@")[0] || "مندوب المبيعات";

  const todaysOrders = orders.filter((o) => o.date === today());
  const salesTodayUSD = todaysOrders.reduce((s, o) => s + (o.totalUSD || 0), 0);
  const salesTodaySYP = todaysOrders.reduce((s, o) => s + (o.totalSYP || 0), 0);

  const thisMonthExpenses = expenses.filter((x) => x.date?.startsWith(today().slice(0, 7)));
  const expensesMonthUSD = thisMonthExpenses
    .filter((x) => x.currency === "USD")
    .reduce((s, x) => s + x.amount, 0);
  const expensesMonthSYP = thisMonthExpenses
    .filter((x) => x.currency === "SYP")
    .reduce((s, x) => s + x.amount, 0);

  const monthOrders = orders.filter((o) => o.date?.startsWith(today().slice(0, 7)));
  const monthSalesUSD = monthOrders.reduce((s, o) => s + (o.totalUSD || 0), 0);
  const monthSalesSYP = monthOrders.reduce((s, o) => s + (o.totalSYP || 0), 0);
  const currentMonthGoal = goals.find((g) => g.month === today().slice(0, 7));
  const commissionRate = (Number(currentMonthGoal?.commissionRate) || 0) / 100;
  const commissionUSD = monthSalesUSD * commissionRate;
  const commissionSYP = monthSalesSYP * commissionRate;

  const creditOrders = orders.filter((o) => o.paymentType === "credit");
  const owedUSD =
    creditOrders.reduce((s, o) => s + (o.totalUSD || 0), 0) -
    payments.filter((p) => p.currency === "USD").reduce((s, p) => s + p.amount, 0);
  const owedSYP =
    creditOrders.reduce((s, o) => s + (o.totalSYP || 0), 0) -
    payments.filter((p) => p.currency === "SYP").reduce((s, p) => s + p.amount, 0);

  const visitsToday = visits.filter((v) => v.date === today()).length;
  const followUps = visits
    .filter((v) => v.followUpDate && !v.followUpDone)
    .sort((a, b) => (a.followUpDate > b.followUpDate ? 1 : -1))
    .slice(0, 6);

  const stockOf = (productId) =>
    moves
      .filter((m) => m.productId === productId)
      .reduce((t, m) => t + (m.type === "load" ? m.quantity : -m.quantity), 0);
  const lowStock = products
    .filter((p) => p.lowStockThreshold != null && stockOf(p.id) <= p.lowStockThreshold)
    .slice(0, 6);

  const markFollowUpDone = async (visitId) => {
    await updateDoc(doc(db, "users", uid, "salesVisits", visitId), { followUpDone: true });
  };

  return (
    <div className="shs-root">
      {/* ── Hero ── */}
      <div className="shs-hero">
        <div className="shs-hero-bg" />
        <div className="shs-hero-particles">
          {[...Array(6)].map((_, i) => (
            <span key={i} className={`shs-pt shs-pt--${i + 1}`} />
          ))}
        </div>
        <div className="shs-hero-body">
          <div className="shs-hero-left">
            <div className="shs-hero-badge">
              <span className="shs-hero-badge-dot" />
              Cashier Assistant - وضع المبيعات
            </div>
            <h1 className="shs-hero-h1">
              أهلاً،
              <span className="shs-hero-name"> {name}</span>
              <span className="shs-wave"> 🚚</span>
            </h1>
            <p className="shs-hero-p">
              مساحتك الخاصة كمندوب مبيعات — مناطقك وعملاؤك، منفصلة تماماً عن عمل الصندوق
            </p>
            <div className="shs-hero-btns">
              <button className="shs-hero-btn-primary" onClick={() => nav("/sales/clients")}>
                <i className="fa-solid fa-user-plus" />
                عميل جديد
              </button>
              <button className="shs-hero-btn-ghost" onClick={() => nav("/sales/territories")}>
                <i className="fa-solid fa-map-location-dot" />
                المناطق
              </button>
            </div>
          </div>
          <div className="shs-hero-stats">
            <div className="shs-stat-card">
              <div className="shs-stat-val">{territories.length}</div>
              <div className="shs-stat-lbl">منطقة تغطية</div>
            </div>
            <div className="shs-stat-card">
              <div className="shs-stat-val">{clients.length}</div>
              <div className="shs-stat-lbl">عميل مسجّل</div>
            </div>
            <div className="shs-stat-card">
              <div className="shs-stat-val">{visitsToday}</div>
              <div className="shs-stat-lbl">زيارة اليوم</div>
            </div>
            {(salesTodayUSD > 0 || salesTodaySYP > 0) && (
              <div className="shs-stat-card">
                <div className="shs-stat-val" style={{ fontSize: 18 }}>
                  {formatDual(salesTodayUSD, salesTodaySYP)}
                </div>
                <div className="shs-stat-lbl">مبيعات اليوم</div>
              </div>
            )}
            {(owedUSD > 0 || owedSYP > 0) && (
              <div className="shs-stat-card">
                <div className="shs-stat-val" style={{ fontSize: 18 }}>
                  {formatDual(owedUSD, owedSYP)}
                </div>
                <div className="shs-stat-lbl">مستحق على العملاء</div>
              </div>
            )}
            {(expensesMonthUSD > 0 || expensesMonthSYP > 0) && (
              <div className="shs-stat-card">
                <div className="shs-stat-val" style={{ fontSize: 18 }}>
                  {formatDual(expensesMonthUSD, expensesMonthSYP)}
                </div>
                <div className="shs-stat-lbl">مصاريف السيارة هذا الشهر</div>
              </div>
            )}
            {(commissionUSD > 0 || commissionSYP > 0) && (
              <div className="shs-stat-card">
                <div className="shs-stat-val" style={{ fontSize: 18 }}>
                  {formatDual(commissionUSD, commissionSYP)}
                </div>
                <div className="shs-stat-lbl">عمولة هذا الشهر</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="shs-sections">
        {SECTIONS.map((s) => (
          <div key={s.to} className="ssc-card" onClick={() => nav(s.to)}>
            <div className="ssc-ico" style={{ background: s.bg }}>
              <i className={s.icon} style={{ fontSize: 24, color: s.color }} />
            </div>
            <div>
              <div className="ssc-title">{s.label}</div>
              <div className="ssc-desc">{s.desc}</div>
            </div>
            <span className="ssc-cta" style={{ color: s.color }}>
              فتح
              <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }} />
            </span>
          </div>
        ))}
      </div>

      {/* ── Follow-ups ── */}
      {followUps.length > 0 && (
        <div className="shs-followups">
          <div className="shs-roadmap-head">
            <div className="shs-roadmap-ico" style={{ background: "#fef2f2" }}>
              <i className="fa-solid fa-bell" style={{ fontSize: 15, color: "#dc2626" }} />
            </div>
            <div className="shs-roadmap-title">متابعات مستحقة</div>
          </div>
          <p className="shs-roadmap-sub">عملاء بحاجة لمتابعة بحسب آخر زياراتك</p>
          <div className="shs-followup-list">
            {followUps.map((v) => {
              const due = v.followUpDate <= today();
              return (
                <div key={v.id} className={`shs-followup-row ${due ? "shs-followup-row--due" : ""}`}>
                  <div className="shs-followup-info">
                    <span className="shs-followup-name">{v.clientName}</span>
                    <span className="shs-followup-date">
                      <i className="fa-regular fa-calendar" style={{ fontSize: 10 }} />
                      {v.followUpDate} {due ? "(مستحقة)" : ""}
                    </span>
                  </div>
                  <div className="shs-followup-actions">
                    <button
                      className="shs-followup-visit"
                      onClick={() => nav("/sales/visits", { state: { clientId: v.clientId } })}
                    >
                      <i className="fa-solid fa-route" />
                      زيارة
                    </button>
                    <button className="shs-followup-done" onClick={() => markFollowUpDone(v.id)}>
                      <i className="fa-solid fa-check" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Low stock ── */}
      {lowStock.length > 0 && (
        <div className="shs-lowstock">
          <div className="shs-roadmap-head">
            <div className="shs-roadmap-ico" style={{ background: "#f0fdfa" }}>
              <i className="fa-solid fa-boxes-stacked" style={{ fontSize: 15, color: "#0f766e" }} />
            </div>
            <div className="shs-roadmap-title">مخزون منخفض</div>
          </div>
          <p className="shs-roadmap-sub">منتجات وصلت لحد التنبيه — قد تحتاج لتحميل كمية إضافية</p>
          <div className="shs-lowstock-list">
            {lowStock.map((p) => (
              <div key={p.id} className="shs-lowstock-row">
                <div className="shs-followup-info">
                  <span className="shs-followup-name">{p.name}</span>
                  <span className="shs-followup-date">
                    <i className="fa-solid fa-cube" style={{ fontSize: 10 }} />
                    المتبقي: {stockOf(p.id)} {p.unit}
                  </span>
                </div>
                <button
                  className="shs-followup-visit"
                  onClick={() => nav("/sales/products/stock", { state: { productId: p.id, type: "load" } })}
                >
                  <i className="fa-solid fa-arrow-down" />
                  تحميل
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Roadmap ── */}
      <div className="shs-roadmap">
        <div className="shs-roadmap-head">
          <div className="shs-roadmap-ico">
            <i className="fa-solid fa-road" style={{ fontSize: 15, color: "#c2410c" }} />
          </div>
          <div className="shs-roadmap-title">قيد الإنشاء — الخطوات القادمة</div>
        </div>
        <p className="shs-roadmap-sub">نبني هذا القسم خطوة بخطوة؛ هذا ما هو قادم بعد المناطق والعملاء</p>
        <div className="shs-roadmap-grid">
          {ROADMAP.map((r) => (
            <div key={r.label} className="shs-roadmap-item">
              <div className="shs-roadmap-item-ico">
                <i className={r.icon} />
              </div>
              <div>
                <div className="shs-roadmap-item-label">{r.label}</div>
                <div className="shs-roadmap-item-tag">قريباً</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
