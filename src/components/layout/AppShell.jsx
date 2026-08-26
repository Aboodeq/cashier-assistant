import { useState } from "react";
import { signOut } from "firebase/auth";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../../firebase/config";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import "./AppShell.css";

/**
 * The two separate "jobs" this app covers. Each owns its own route tree, nav,
 * and Firestore data — the switcher below just lets you jump between them.
 */
const MODES = [
  { to: "/dashboard", icon: "fa-solid fa-cash-register", label: "الصندوق", role: "أمين الصندوق" },
  { to: "/sales", icon: "fa-solid fa-truck-fast", label: "المبيعات", role: "مندوب مبيعات" },
];

/**
 * Sidebar + topbar app chrome shared by every mode. Pass the mode's own nav
 * items and its routed page content (a <Routes> element) as children.
 */
export default function AppShell({ navItems, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobile = useMediaQuery("(max-width: 768px)");
  const navigate = useNavigate();
  const location = useLocation();

  // Close the mobile drawer the moment the viewport grows past the mobile breakpoint,
  // so it isn't left open in the background if the screen narrows again later.
  // (Adjusting state during render, per https://react.dev/learn/you-might-not-need-an-effect
  // — avoids the extra render + flash an effect-based reset would cause.)
  const [wasMobile, setWasMobile] = useState(mobile);
  if (mobile !== wasMobile) {
    setWasMobile(mobile);
    if (!mobile) setMobileOpen(false);
  }

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const activeMode = MODES.find((m) => location.pathname.startsWith(m.to)) || MODES[0];

  const currentItem =
    navItems.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to))) ||
    navItems[0];

  const sideW = mobile ? (mobileOpen ? 240 : 0) : collapsed ? 70 : 240;

  return (
    <div className="sh-root">
      {/* Mobile overlay */}
      {mobile && mobileOpen && <div className="sh-overlay" onClick={() => setMobileOpen(false)} />}

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

          {/* Mode switcher */}
          <div className="sh-mode-switch" style={{ flexDirection: collapsed ? "column" : "row" }}>
            {MODES.map((m) => {
              const on = m.to === activeMode.to;
              return (
                <Link
                  key={m.to}
                  to={m.to}
                  onClick={() => mobile && setMobileOpen(false)}
                  className={`sh-mode-btn ${on ? "sh-mode-btn--on" : ""}`}
                  title={collapsed ? m.label : ""}
                >
                  <i className={m.icon} />
                  {!collapsed && <span>{m.label}</span>}
                </Link>
              );
            })}
          </div>

          {!collapsed && <div className="sh-sb-divlabel">القائمة</div>}

          {/* Nav */}
          <nav className="sh-sb-nav">
            {navItems.map((item, i) => {
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
                <span className="sh-sb-user-role">{activeMode.role}</span>
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
                <i className={activeMode.icon} style={{ fontSize: 11 }} />
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
        <main className="sh-page">{children}</main>
      </div>
    </div>
  );
}
