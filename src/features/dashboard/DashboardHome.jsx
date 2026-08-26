import { useState } from "react";
import { auth } from "../../firebase/config";
import "./DashboardHome.css";

const SECTIONS = [
  {
    to: "/dashboard/companies",
    icon: "fa-solid fa-building",
    label: "الشركات",
    desc: "أضف وأدر الشركات المرتبطة بحسابك بكل سهولة",
    g1: "#4f46e5",
    g2: "#818cf8",
    light: "#ede9fe",
    shadow: "79,70,229",
  },
  {
    to: "/dashboard/representatives",
    icon: "fa-solid fa-users",
    label: "المناديب",
    desc: "إدارة قائمة المناديب وربطهم بالشركات",
    g1: "#0e7490",
    g2: "#22d3ee",
    light: "#ecfeff",
    shadow: "14,116,144",
  },
  {
    to: "/dashboard/sessions",
    icon: "fa-solid fa-folder-open",
    label: "الجلسات",
    desc: "سجّل جلسات الاستلام وتتبع المبالغ بدقة",
    g1: "#059669",
    g2: "#34d399",
    light: "#ecfdf5",
    shadow: "5,150,105",
  },
];

export default function DashboardHome({ nav }) {
  const name = auth.currentUser?.email?.split("@")[0] || "أمين الصندوق";

  return (
    <div className="hp-root">
      {/* ── Hero ── */}
      <div className="hp-hero">
        <div className="hp-hero-bg" />
        <div className="hp-hero-particles">
          {[...Array(6)].map((_, i) => (
            <span key={i} className={`hp-pt hp-pt--${i + 1}`} />
          ))}
        </div>
        <div className="hp-hero-body">
          <div className="hp-hero-left">
            <div className="hp-hero-badge">
              <span className="hp-hero-badge-dot" />
              Cashier Assistant - control panel
            </div>
            <h1 className="hp-hero-h1">
              أهلاً،
              <span className="hp-hero-name"> {name}</span>
              <span className="hp-wave"> 👋</span>
            </h1>
            <p className="hp-hero-p">
              نظام إدارة الصندوق المتكامل — تتبع الإيرادات وأدر المناديب عبر شركات متعددة
            </p>
            <div className="hp-hero-btns">
              <button className="hp-hero-btn-primary" onClick={() => nav("/dashboard/sessions")}>
                <i className="fa-solid fa-plus" />
                جلسة جديدة
              </button>
              <button className="hp-hero-btn-ghost" onClick={() => nav("/dashboard/companies")}>
                <i className="fa-solid fa-building" />
                الشركات
              </button>
            </div>
          </div>
          <div className="hp-hero-right">
            <div className="hp-hero-card-3d">
              <div className="hp-hero-card-face">
                <i
                  className="fa-solid fa-cash-register"
                  style={{ fontSize: 36, color: "#fff", opacity: 0.9 }}
                />
                <div className="hp-hero-card-label">Cashier Assistant</div>
                <div className="hp-hero-card-chips">
                  <span className="hp-chip hp-chip--blue">
                    <i className="fa-solid fa-coins" style={{ fontSize: 10 }} /> عملتان
                  </span>
                  <span className="hp-chip hp-chip--teal">
                    <i className="fa-solid fa-shield-halved" style={{ fontSize: 10 }} /> آمن
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sections — تملأ الشاشة ── */}
      <div className="hp-sections">
        {SECTIONS.map((s, i) => (
          <SectionCard key={i} s={s} i={i} nav={nav} />
        ))}
      </div>

      {/* ── Tip ── */}
      <div className="hp-tip">
        <div className="hp-tip-ico">
          <i className="fa-solid fa-lightbulb" style={{ fontSize: 16, color: "#f59e0b" }} />
        </div>
        <div>
          <strong className="hp-tip-title">كيف تبدأ؟</strong>
          <p className="hp-tip-p">
            أضف <strong>الشركات</strong> ← ثم <strong>المناديب</strong> ← ثم أنشئ{" "}
            <strong>جلسة</strong> لتسجيل المبالغ
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ s, i, nav }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      className="sc-card"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => nav(s.to)}
      style={{ animationDelay: `${0.1 + i * 0.08}s` }}
    >
      {/* BG gradient on hover */}
      <div
        className="sc-bg"
        style={{
          background: `linear-gradient(145deg,${s.g1},${s.g2})`,
          opacity: hov ? 1 : 0,
        }}
      />

      {/* Glow */}
      <div
        className="sc-glow"
        style={{
          boxShadow: hov ? `0 0 60px 20px rgba(${s.shadow},0.25)` : "none",
        }}
      />

      {/* Icon */}
      <div className="sc-ico-wrap">
        <div
          className="sc-ico"
          style={{
            background: hov ? "rgba(255,255,255,0.2)" : s.light,
            boxShadow: hov ? "0 4px 16px rgba(0,0,0,0.15)" : "none",
          }}
        >
          <i
            className={s.icon}
            style={{
              fontSize: 28,
              color: hov ? "#fff" : s.g1,
              transition: "color 0.3s",
            }}
          />
        </div>
      </div>

      {/* Text */}
      <div className="sc-text">
        <div className="sc-title" style={{ color: hov ? "#fff" : "#1e293b" }}>
          {s.label}
        </div>
        <div className="sc-desc" style={{ color: hov ? "rgba(255,255,255,0.75)" : "#94a3b8" }}>
          {s.desc}
        </div>
      </div>

      {/* CTA */}
      <div
        className="sc-cta"
        style={{
          background: hov ? "rgba(255,255,255,0.18)" : s.light,
          border: hov ? "1px solid rgba(255,255,255,0.25)" : `1px solid ${s.light}`,
        }}
      >
        <span style={{ color: hov ? "#fff" : s.g1, fontWeight: 700, fontSize: 14 }}>فتح</span>
        <i
          className="fa-solid fa-arrow-left"
          style={{
            color: hov ? "#fff" : s.g1,
            fontSize: 12,
            transform: hov ? "translateX(-4px)" : "translateX(0)",
            transition: "transform 0.25s",
          }}
        />
      </div>
    </div>
  );
}
