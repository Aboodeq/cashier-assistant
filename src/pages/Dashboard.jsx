import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";
import { Routes, Route, useNavigate, useLocation, Link } from "react-router-dom";
import Companies from "./Companies";
import Representatives from "./Representatives";
import Sessions from "./Sessions";

const NAV = [
  { to: "/dashboard", icon: "fa-solid fa-house", label: "الرئيسية", end: true },
  { to: "/dashboard/companies", icon: "fa-solid fa-building", label: "الشركات", end: false },
  { to: "/dashboard/representatives", icon: "fa-solid fa-users", label: "المناديب", end: false },
  { to: "/dashboard/sessions", icon: "fa-solid fa-folder-open", label: "الجلسات", end: false },
];

export default function Dashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(window.innerWidth < 768);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fn = () => {
      const isMob = window.innerWidth < 768;
      setMobile(isMob);
      if (!isMob) setMobileOpen(false);
    };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const currentItem =
    NAV.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to))) ||
    NAV[0];

  const sideW = mobile ? (mobileOpen ? 240 : 0) : collapsed ? 70 : 240;

  return (
    <>
      <style>{CSS}</style>
      <div className="sh-root">
        {/* Mobile overlay */}
        {mobile && mobileOpen && (
          <div className="sh-overlay" onClick={() => setMobileOpen(false)} />
        )}

        {/* ══════════════ SIDEBAR ══════════════ */}
        <aside className="sh-sidebar" style={{ width: sideW, minWidth: sideW }}>
          <div className="sh-sb-bg" />
          <div className="sh-sb-glow sh-sb-glow--a" />
          <div className="sh-sb-glow sh-sb-glow--b" />

          <div
            className="sh-sb-wrap"
            style={{
              opacity: mobile && !mobileOpen ? 0 : 1,
              pointerEvents: mobile && !mobileOpen ? "none" : "auto",
            }}
          >
            {/* Logo */}
            <div className="sh-sb-logo">
              <div className="sh-sb-logo-ico">
                <i className="fa-solid fa-cash-register" style={{ fontSize: 18, color: "#fff" }} />
              </div>
              {!collapsed && (
                <div className="sh-sb-logo-text">
                  <span className="sh-sb-logo-name">Cashier Assistant</span>
                  <span className="sh-sb-logo-sub">
                    <span className="sh-sb-online" />
                    متصل
                  </span>
                </div>
              )}
            </div>

            {!collapsed && <div className="sh-sb-divlabel">القائمة</div>}

            {/* Nav */}
            <nav className="sh-sb-nav">
              {NAV.map((item, i) => {
                const active = item.end
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => mobile && setMobileOpen(false)}
                    className={`sh-sb-link ${active ? "sh-sb-link--on" : ""}`}
                    title={collapsed ? item.label : ""}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    {active && <span className="sh-sb-link-bar" />}
                    <span className={`sh-sb-link-ico ${active ? "sh-sb-link-ico--on" : ""}`}>
                      <i className={item.icon} />
                    </span>
                    {!collapsed && <span className="sh-sb-link-lbl">{item.label}</span>}
                    {!collapsed && active && (
                      <span className="sh-sb-link-chip">
                        <i className="fa-solid fa-circle" style={{ fontSize: 5 }} />
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            <div style={{ flex: 1 }} />

            {/* User */}
            {!collapsed && (
              <div className="sh-sb-user">
                <div className="sh-sb-user-ava">
                  <i className="fa-solid fa-user-tie" style={{ fontSize: 14, color: "#6366f1" }} />
                </div>
                <div className="sh-sb-user-info">
                  <span className="sh-sb-user-name">
                    {auth.currentUser?.email?.split("@")[0] || "المستخدم"}
                  </span>
                  <span className="sh-sb-user-role">أمين الصندوق</span>
                </div>
                <button className="sh-sb-exit" onClick={handleLogout}>
                  <i className="fa-solid fa-right-from-bracket" />
                </button>
              </div>
            )}

            {collapsed && (
              <button className="sh-sb-exit-sm" onClick={handleLogout}>
                <i className="fa-solid fa-right-from-bracket" />
              </button>
            )}

            {/* Toggle button — أسفل الـ sidebar */}
            {!mobile && (
              <button
                className="sh-sb-toggle"
                onClick={() => setCollapsed((c) => !c)}
                title={collapsed ? "توسيع" : "طي"}
              >
                <i className={`fa-solid fa-chevron-${collapsed ? "right" : "left"}`} />
                {!collapsed && <span>طي القائمة</span>}
              </button>
            )}
          </div>
        </aside>

        {/* ══════════════ MAIN ══════════════ */}
        <div className="sh-main">
          {/* Topbar */}
          <header className="sh-topbar">
            <div className="sh-topbar-r">
              {mobile && (
                <button className="sh-topbar-burger" onClick={() => setMobileOpen((o) => !o)}>
                  <i
                    className={`fa-solid fa-${mobileOpen ? "xmark" : "bars"}`}
                    style={{ fontSize: 16 }}
                  />
                </button>
              )}
              <div className="sh-topbar-trail">
                <span className="sh-topbar-trail-home">
                  <i className="fa-solid fa-house" style={{ fontSize: 11 }} />
                </span>
                <i className="fa-solid fa-angle-left" style={{ fontSize: 9, color: "#cbd5e1" }} />
                <span className="sh-topbar-trail-cur">{currentItem.label}</span>
              </div>
            </div>
            <div className="sh-topbar-l">
              <div className="sh-topbar-date">
                <i className="fa-regular fa-calendar" style={{ fontSize: 12 }} />
                {new Date().toLocaleDateString("en-us", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div className="sh-topbar-ava">
                <i className="fa-solid fa-user-tie" style={{ fontSize: 13, color: "#6366f1" }} />
              </div>
            </div>
          </header>

          {/* Page */}
          <main className="sh-page">
            <Routes>
              <Route index element={<Home nav={navigate} />} />
              <Route path="companies" element={<Companies />} />
              <Route path="representatives" element={<Representatives />} />
              <Route path="sessions" element={<Sessions />} />
            </Routes>
          </main>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════
   HOME PAGE
══════════════════════════════════════ */
function Home({ nav }) {
  const name = auth.currentUser?.email?.split("@")[0] || "أمين الصندوق";

  const sections = [
    {
      to: "/dashboard/companies",
      icon: "fa-solid fa-building",
      label: "الشركات",
      desc: "أضف وأدر الشركات المرتبطة بحسابك بكل سهولة",
      g1: "#4f46e5",
      g2: "#818cf8",
      light: "#ede9fe",
      shadow: "79,70,229",
      stat: "الشركات المسجلة",
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
      stat: "المناديب المسجلون",
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
      stat: "الجلسات المسجلة",
    },
  ];

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
                    <i className="fa-solid fa-coins" style={{ fontSize: 10 }} /> ٣ عملات
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
        {sections.map((s, i) => (
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

/* ══════════════════════════════════════
   CSS
══════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
html,body,#root{height:100%;}
body{font-family:'Tajawal',sans-serif;direction:rtl;background:#f1f5f9;overflow:hidden;}
button,input,select{font-family:'Tajawal',sans-serif;}
a{text-decoration:none;color:inherit;}
::-webkit-scrollbar{width:4px;}
::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:99px;}

@keyframes shGrad{0%,100%{background-position:0% 50%;}50%{background-position:100% 50%;}}
@keyframes shBlobA{0%,100%{border-radius:60% 40% 55% 45%/50% 60% 40% 50%;transform:translate(0,0);}50%{border-radius:40% 60% 40% 60%/60% 40% 60% 40%;transform:translate(-14px,18px);}}
@keyframes shBlobB{0%,100%{border-radius:45% 55% 40% 60%/60% 45% 55% 40%;transform:translate(0,0);}50%{border-radius:60% 40% 55% 45%/40% 60% 40% 60%;transform:translate(12px,-14px);}}
@keyframes shLinkIn{from{opacity:0;transform:translateX(12px);}to{opacity:1;transform:translateX(0);}}
@keyframes shFadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
@keyframes shCardIn{from{opacity:0;transform:translateY(24px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}}
@keyframes shPulse{0%,100%{transform:scale(1);opacity:0.7;}50%{transform:scale(1.3);opacity:0.2;}}
@keyframes shPtFloat{0%,100%{transform:translateY(0);opacity:0.5;}50%{transform:translateY(-20px);opacity:0.9;}}
@keyframes shWave{0%,100%{transform:rotate(0);}25%{transform:rotate(18deg);}75%{transform:rotate(-12deg);}}
@keyframes shBarIn{from{scaleX:0;}to{scaleX:1;}}
@keyframes shShimmer{0%{transform:translateX(100%);}100%{transform:translateX(-200%);}}
@keyframes shCardFloat{0%,100%{transform:translateY(0) rotate(-4deg);}50%{transform:translateY(-12px) rotate(-4deg);}}

/* ── Shell ── */
.sh-root{display:flex;height:100vh;overflow:hidden;font-family:'Tajawal',sans-serif;direction:rtl;}

/* ── Sidebar ── */
.sh-sidebar{
  position:relative;overflow:hidden;
  display:flex;flex-direction:column;
  transition:width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1);
  z-index:200;flex-shrink:0;
}
.sh-sb-bg{
  position:absolute;inset:0;z-index:0;
  background:linear-gradient(180deg,#0f0c29 0%,#1e1b4b 35%,#1a237e 70%,#0d47a1 100%);
  background-size:200% 200%;
  animation:shGrad 14s ease infinite;
}
.sh-sb-glow{position:absolute;z-index:1;pointer-events:none;border-radius:50%;}
.sh-sb-glow--a{
  width:260px;height:260px;top:-80px;right:-70px;
  background:radial-gradient(circle,rgba(99,102,241,0.45),transparent 65%);
  animation:shBlobA 12s ease-in-out infinite;
}
.sh-sb-glow--b{
  width:200px;height:200px;bottom:-60px;left:-50px;
  background:radial-gradient(circle,rgba(20,184,166,0.3),transparent 65%);
  animation:shBlobB 16s ease-in-out infinite;
}
.sh-sb-wrap{
  position:relative;z-index:2;
  display:flex;flex-direction:column;
  height:100%;padding:20px 12px 14px;
  overflow:hidden;transition:opacity 0.2s;
}

/* Logo */
.sh-sb-logo{
  display:flex;align-items:center;gap:10px;
  padding:6px 4px 6px;margin-bottom:6px;
  animation:shFadeUp 0.5s 0.05s cubic-bezier(0.22,1,0.36,1) both;
}
.sh-sb-logo-ico{
  width:42px;height:42px;border-radius:12px;flex-shrink:0;
  background:linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.08));
  border:1px solid rgba(255,255,255,0.2);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 12px rgba(0,0,0,0.25),inset 0 1px 0 rgba(255,255,255,0.2);
}
.sh-sb-logo-name{font-size:14px;font-weight:800;color:#fff;white-space:nowrap;letter-spacing:-0.2px;}
.sh-sb-logo-sub{display:flex;align-items:center;gap:5px;font-size:10px;color:rgba(255,255,255,0.4);margin-top:1px;}
.sh-sb-online{
  width:6px;height:6px;border-radius:50%;background:#34d399;flex-shrink:0;
  box-shadow:0 0 5px rgba(52,211,153,0.8);
  animation:shPulse 2s ease-in-out infinite;
}
.sh-sb-divlabel{
  font-size:9px;font-weight:700;color:rgba(255,255,255,0.28);
  text-transform:uppercase;letter-spacing:1.5px;
  padding:0 6px;margin:14px 0 8px;white-space:nowrap;
}

/* Nav */
.sh-sb-nav{display:flex;flex-direction:column;gap:2px;}
.sh-sb-link{
  display:flex;align-items:center;gap:10px;
  padding:10px 10px;border-radius:11px;
  color:rgba(255,255,255,0.52);font-size:13.5px;font-weight:500;
  transition:all 0.2s cubic-bezier(0.4,0,0.2,1);
  position:relative;overflow:hidden;white-space:nowrap;
  animation:shLinkIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
}
.sh-sb-link:hover{background:rgba(255,255,255,0.09);color:rgba(255,255,255,0.85);transform:translateX(-2px);}
.sh-sb-link--on{
  background:rgba(255,255,255,0.14) !important;
  color:#fff !important;font-weight:700 !important;
}
.sh-sb-link-bar{
  position:absolute;right:0;top:20%;bottom:20%;
  width:3px;border-radius:99px;
  background:linear-gradient(180deg,#a5b4fc,#5eead4);
  box-shadow:0 0 8px rgba(165,180,252,0.7);
}
.sh-sb-link-ico{
  width:32px;height:32px;border-radius:8px;flex-shrink:0;
  background:rgba(255,255,255,0.07);
  display:flex;align-items:center;justify-content:center;
  font-size:13px;transition:all 0.2s;
}
.sh-sb-link-ico--on{
  background:linear-gradient(135deg,rgba(165,180,252,0.4),rgba(94,234,212,0.2)) !important;
}
.sh-sb-link-lbl{flex:1;overflow:hidden;text-overflow:ellipsis;}
.sh-sb-link-chip{
  width:18px;height:18px;border-radius:5px;
  background:rgba(165,180,252,0.2);
  display:flex;align-items:center;justify-content:center;
  color:#a5b4fc;
}

/* User */
.sh-sb-user{
  display:flex;align-items:center;gap:9px;
  padding:10px 10px;border-radius:12px;
  background:rgba(255,255,255,0.07);
  border:1px solid rgba(255,255,255,0.09);
  margin-bottom:8px;
  position:relative;overflow:hidden;
}
.sh-sb-user::after{
  content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent);
  animation:shShimmer 4s linear infinite;
}
.sh-sb-user-ava{
  width:32px;height:32px;border-radius:9px;flex-shrink:0;
  background:linear-gradient(135deg,#ede9fe,#ddd6fe);
  display:flex;align-items:center;justify-content:center;
}
.sh-sb-user-info{flex:1;min-width:0;}
.sh-sb-user-name{font-size:12px;font-weight:700;color:#fff;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sh-sb-user-role{font-size:10px;color:rgba(255,255,255,0.35);}
.sh-sb-exit{
  width:28px;height:28px;border-radius:8px;flex-shrink:0;
  background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.15);
  color:#fca5a5;font-size:12px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:all 0.2s;
}
.sh-sb-exit:hover{background:rgba(239,68,68,0.28);color:#fff;}
.sh-sb-exit-sm{
  width:42px;height:42px;border-radius:11px;
  background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.15);
  color:#fca5a5;font-size:14px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  margin:8px auto;transition:all 0.2s;
}
.sh-sb-exit-sm:hover{background:rgba(239,68,68,0.25);color:#fff;}

/* Toggle */
.sh-sb-toggle{
  display:flex;align-items:center;gap:8px;
  padding:10px 12px;border-radius:11px;margin-top:4px;
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.08);
  color:rgba(255,255,255,0.45);font-size:12px;font-weight:600;
  cursor:pointer;width:100%;transition:all 0.2s;white-space:nowrap;
}
.sh-sb-toggle:hover{background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.75);}
.sh-sb-toggle i{font-size:11px;flex-shrink:0;}

/* ── Topbar ── */
.sh-topbar{
  height:58px;
  background:rgba(255,255,255,0.9);
  backdrop-filter:blur(16px);
  border-bottom:1px solid rgba(226,232,240,0.7);
  display:flex;align-items:center;justify-content:space-between;
  padding:0 24px;
  position:sticky;top:0;z-index:100;
  box-shadow:0 1px 8px rgba(0,0,0,0.04);
  flex-shrink:0;
}
.sh-topbar-r{display:flex;align-items:center;gap:12px;}
.sh-topbar-burger{
  width:36px;height:36px;border-radius:10px;
  background:#f8fafc;border:1px solid #e2e8f0;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:#475569;transition:all 0.2s;
}
.sh-topbar-burger:hover{background:#f1f5f9;color:#1e293b;}
.sh-topbar-trail{display:flex;align-items:center;gap:7px;}
.sh-topbar-trail-home{color:#94a3b8;}
.sh-topbar-trail-cur{font-size:15px;font-weight:800;color:#1e293b;}
.sh-topbar-l{display:flex;align-items:center;gap:10px;}
.sh-topbar-date{
  font-size:12px;color:#94a3b8;font-weight:500;
  display:flex;align-items:center;gap:6px;
  padding:5px 12px;border-radius:99px;
  background:#f8fafc;border:1px solid #f1f5f9;
  white-space:nowrap;
}
.sh-topbar-ava{
  width:34px;height:34px;border-radius:9px;
  background:linear-gradient(135deg,#ede9fe,#ddd6fe);
  display:flex;align-items:center;justify-content:center;
}

/* ── Main ── */
.sh-main{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;}
.sh-page{flex:1;overflow-y:auto;padding:0;}

/* ── Home ── */
.hp-root{
  display:flex;flex-direction:column;
  height:100%;min-height:0;
}

/* Hero */
.hp-hero{
  position:relative;overflow:hidden;flex-shrink:0;
  padding:32px 32px 28px;
  background:linear-gradient(135deg,#0f0c29 0%,#1e1b4b 40%,#1565c0 100%);
}
.hp-hero-bg{
  position:absolute;inset:0;
  background:linear-gradient(135deg,#0f0c29,#1e1b4b,#1a237e,#0d47a1,#1565c0);
  background-size:300% 300%;
  animation:shGrad 12s ease infinite;
}
.hp-hero-particles{position:absolute;inset:0;pointer-events:none;z-index:1;}
.hp-pt{position:absolute;border-radius:50%;animation:shPtFloat ease-in-out infinite;}
.hp-pt--1{width:8px;height:8px;background:rgba(165,180,252,0.7);top:15%;right:8%;animation-duration:5s;}
.hp-pt--2{width:5px;height:5px;background:rgba(94,234,212,0.7);top:60%;right:15%;animation-duration:7s;animation-delay:1s;}
.hp-pt--3{width:10px;height:10px;background:rgba(252,211,77,0.5);top:80%;right:30%;animation-duration:6s;animation-delay:2s;}
.hp-pt--4{width:6px;height:6px;background:rgba(165,180,252,0.6);top:30%;left:20%;animation-duration:8s;animation-delay:0.5s;}
.hp-pt--5{width:4px;height:4px;background:rgba(255,255,255,0.5);top:50%;left:10%;animation-duration:9s;animation-delay:3s;}
.hp-pt--6{width:7px;height:7px;background:rgba(94,234,212,0.5);top:20%;left:5%;animation-duration:6.5s;animation-delay:1.5s;}

.hp-hero-body{
  position:relative;z-index:2;
  display:flex;align-items:center;justify-content:space-between;gap:24px;
}
.hp-hero-left{flex:1;}
.hp-hero-badge{
  display:inline-flex;align-items:center;gap:7px;
  background:rgba(255,255,255,0.1);
  border:1px solid rgba(255,255,255,0.18);
  border-radius:99px;padding:5px 14px;
  font-size:11px;font-weight:600;color:rgba(255,255,255,0.75);
  margin-bottom:12px;
}
.hp-hero-badge-dot{
  width:6px;height:6px;border-radius:50%;background:#34d399;
  animation:shPulse 2s ease-in-out infinite;
  box-shadow:0 0 5px rgba(52,211,153,0.8);flex-shrink:0;
}
.hp-hero-h1{
  font-size:32px;font-weight:900;color:#fff;
  letter-spacing:-0.8px;margin-bottom:10px;
  text-shadow:0 2px 20px rgba(0,0,0,0.25);
  line-height:1.2;
}
.hp-hero-name{
  background:linear-gradient(90deg,#a5b4fc,#5eead4);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.hp-wave{display:inline-block;animation:shWave 2s ease-in-out infinite;transform-origin:70% 70%;}
.hp-hero-p{
  font-size:14px;color:rgba(255,255,255,0.65);
  line-height:1.7;max-width:380px;margin-bottom:20px;
}
.hp-hero-btns{display:flex;gap:10px;flex-wrap:wrap;}
.hp-hero-btn-primary{
  display:flex;align-items:center;gap:8px;
  padding:10px 20px;border-radius:11px;border:none;cursor:pointer;
  background:linear-gradient(135deg,#4f46e5,#6366f1);
  color:#fff;font-size:14px;font-weight:700;
  box-shadow:0 4px 16px rgba(79,70,229,0.4);
  transition:all 0.25s;
}
.hp-hero-btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(79,70,229,0.5);}
.hp-hero-btn-ghost{
  display:flex;align-items:center;gap:8px;
  padding:10px 20px;border-radius:11px;cursor:pointer;
  background:rgba(255,255,255,0.1);
  border:1px solid rgba(255,255,255,0.2);
  color:rgba(255,255,255,0.8);font-size:14px;font-weight:600;
  transition:all 0.25s;
}
.hp-hero-btn-ghost:hover{background:rgba(255,255,255,0.17);color:#fff;}

/* Hero card 3D */
.hp-hero-right{flex-shrink:0;}
.hp-hero-card-3d{
  width:160px;height:160px;border-radius:24px;
  background:linear-gradient(145deg,rgba(255,255,255,0.18),rgba(255,255,255,0.06));
  border:1px solid rgba(255,255,255,0.22);
  backdrop-filter:blur(16px);
  box-shadow:
    0 20px 48px rgba(0,0,0,0.3),
    inset 0 1px 0 rgba(255,255,255,0.25),
    0 0 0 1px rgba(255,255,255,0.05);
  animation:shCardFloat 4s ease-in-out infinite;
  transform:rotate(-4deg);
  display:flex;align-items:center;justify-content:center;
}
.hp-hero-card-face{
  display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;
}
.hp-hero-card-label{font-size:12px;font-weight:700;color:rgba(255,255,255,0.8);}
.hp-hero-card-chips{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;}
.hp-chip{
  display:inline-flex;align-items:center;gap:4px;
  padding:3px 8px;border-radius:99px;font-size:10px;font-weight:600;
}
.hp-chip--blue{background:rgba(99,102,241,0.35);color:#c7d2fe;border:1px solid rgba(99,102,241,0.3);}
.hp-chip--teal{background:rgba(20,184,166,0.35);color:#99f6e4;border:1px solid rgba(20,184,166,0.3);}

/* Sections */
.hp-sections{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:0;
  flex:1;
  min-height:0;
}
.sc-card{
  position:relative;overflow:hidden;
  display:flex;flex-direction:column;
  padding:32px 28px;
  cursor:pointer;
  transition:all 0.35s cubic-bezier(0.4,0,0.2,1);
  background:#fff;
  border-top:1px solid #f1f5f9;
  border-left:1px solid #f1f5f9;
  animation:shCardIn 0.5s cubic-bezier(0.22,1,0.36,1) both;
  gap:18px;
}
.sc-card:first-child{border-right:1px solid #f1f5f9;}
.sc-bg{
  position:absolute;inset:0;z-index:0;
  transition:opacity 0.35s cubic-bezier(0.4,0,0.2,1);
}
.sc-glow{
  position:absolute;inset:0;z-index:0;
  transition:box-shadow 0.35s;
  pointer-events:none;
}
.sc-ico-wrap{position:relative;z-index:1;}
.sc-ico{
  width:68px;height:68px;border-radius:20px;
  display:flex;align-items:center;justify-content:center;
  transition:all 0.35s cubic-bezier(0.4,0,0.2,1);
}
.sc-text{position:relative;z-index:1;flex:1;}
.sc-title{font-size:22px;font-weight:900;margin-bottom:8px;letter-spacing:-0.4px;transition:color 0.3s;}
.sc-desc{font-size:14px;line-height:1.65;transition:color 0.3s;}
.sc-cta{
  position:relative;z-index:1;
  display:inline-flex;align-items:center;gap:8px;
  padding:9px 18px;border-radius:11px;
  align-self:flex-start;
  transition:all 0.3s;
}

/* Tip */
.hp-tip{
  display:flex;align-items:flex-start;gap:14px;
  padding:18px 28px;
  background:#fffbeb;
  border-top:1px solid #fef3c7;
  flex-shrink:0;
}
.hp-tip-ico{
  width:36px;height:36px;border-radius:10px;flex-shrink:0;
  background:#fef3c7;
  display:flex;align-items:center;justify-content:center;
}
.hp-tip-title{font-size:13px;font-weight:800;color:#92400e;display:block;margin-bottom:3px;}
.hp-tip-p{font-size:13px;color:#78716c;line-height:1.6;}
.hp-tip-p strong{color:#1e293b;font-weight:700;}

/* Overlay mobile */
.sh-overlay{
  position:fixed;inset:0;background:rgba(15,12,41,0.55);
  backdrop-filter:blur(4px);z-index:199;
}

/* ══ RESPONSIVE ══ */
@media (max-width:1100px){
  .hp-sections{grid-template-columns:repeat(3,1fr) !important;}
  .sc-card{padding:24px 20px;}
}
@media (max-width:768px){
  body{overflow:hidden;}
  .sh-sidebar{position:fixed;top:0;right:0;bottom:0;height:100vh;}
  .hp-sections{grid-template-columns:1fr !important;}
  .sc-card{border-left:none !important;border-right:none !important;}
  .hp-hero{padding:24px 20px 20px;}
  .hp-hero-right{display:none;}
  .hp-hero-h1{font-size:24px;}
  .sh-page{overflow-y:auto;}
  .hp-root{height:auto;min-height:100%;}
}
@media (max-width:480px){
  .hp-hero-h1{font-size:20px;}
  .hp-hero-p{font-size:13px;}
  .sh-topbar{padding:0 14px;}
  .sh-topbar-date{display:none;}
  .sc-title{font-size:18px;}
}
`;
