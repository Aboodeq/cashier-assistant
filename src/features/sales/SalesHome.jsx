import { auth } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
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
];

const ROADMAP = [
  { icon: "fa-solid fa-route", label: "زيارات ميدانية" },
  { icon: "fa-solid fa-boxes-stacked", label: "البضاعة والمخزون" },
  { icon: "fa-solid fa-file-invoice-dollar", label: "الطلبات والفواتير" },
  { icon: "fa-solid fa-car", label: "السيارة والمصاريف" },
  { icon: "fa-solid fa-bullseye", label: "الأهداف والعمولات" },
  { icon: "fa-solid fa-chart-line", label: "التقارير" },
];

export default function SalesHome({ nav }) {
  const uid = auth.currentUser?.uid;
  const territories = useFirestoreCollection(uid && ["users", uid, "salesTerritories"]);
  const clients = useFirestoreCollection(uid && ["users", uid, "salesClients"]);
  const name = auth.currentUser?.email?.split("@")[0] || "مندوب المبيعات";

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
