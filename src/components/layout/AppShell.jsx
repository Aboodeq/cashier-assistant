import { useState } from "react";
import { signOut } from "firebase/auth";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { auth } from "../../firebase/config";
import { Sheet } from "../ui/Sheet";
import { ToastProvider } from "../ui/Toast";
import "./AppShell.css";

/**
 * The two separate "jobs" this app covers. Each owns its own route tree, nav,
 * and Firestore data — the switcher just lets you jump between them.
 */
const MODES = [
  { to: "/dashboard", icon: "fa-solid fa-cash-register", label: "الصندوق", role: "أمين الصندوق" },
  { to: "/sales", icon: "fa-solid fa-truck-fast", label: "المبيعات", role: "مندوب المبيعات" },
];

const COLLAPSE_KEY = "sh-collapsed";

function isActive(item, pathname) {
  if (item.exclude?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false;
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * App chrome shared by every mode.
 *  - groups: sidebar sections   [{ label?, items: [{ to, icon, label, end?, exclude? }] }]
 *  - tabs:   phone bottom bar   [{ to, icon, label, end?, primary?, exclude? }] — an
 *            "المزيد" tab is always appended and opens every other destination.
 * Desktop shows the sidebar; phones get the bottom tab bar instead. Pages
 * render their own sticky header, which doubles as the phone's top bar.
 */
export default function AppShell({ groups = [], tabs = [], children }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [moreOpen, setMoreOpen] = useState(false);

  const activeMode = MODES.find((m) => pathname.startsWith(m.to)) || MODES[0];
  const user = auth.currentUser;
  const userName = user?.displayName || user?.email?.split("@")[0] || "المستخدم";
  const anyTabActive = tabs.some((t) => isActive(t, pathname));

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {
      // Storage unavailable (private mode) — the choice just won't persist.
    }
  };

  const logout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <ToastProvider>
      <div className={`sh ${collapsed ? "is-collapsed" : ""}`}>
        {/* ── Desktop sidebar ── */}
        <aside className="sh-side">
          <div className="sh-brand">
            <span className="sh-brand-mark">
              <i className="fa-solid fa-cash-register" />
            </span>
            <span className="sh-brand-text">
              <strong>Cashier Assistant</strong>
              <small>{activeMode.role}</small>
            </span>
          </div>

          <div className="sh-modes">
            {MODES.map((m) => (
              <Link
                key={m.to}
                to={m.to}
                className={`sh-mode ${m.to === activeMode.to ? "is-on" : ""}`}
                title={m.label}
              >
                <i className={m.icon} />
                <span>{m.label}</span>
              </Link>
            ))}
          </div>

          <nav className="sh-nav" aria-label="القائمة الرئيسية">
            {groups.map((group, gi) => (
              <div key={gi} className="sh-group">
                {group.label && <div className="sh-group-label">{group.label}</div>}
                {group.items.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`sh-link ${isActive(item, pathname) ? "is-on" : ""}`}
                    title={item.label}
                  >
                    <i className={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          <div className="sh-side-foot">
            <div className="sh-user">
              <span className="sh-user-ava">{userName.charAt(0).toUpperCase()}</span>
              <span className="sh-user-text">
                <strong>{userName}</strong>
                <small dir="ltr">{user?.email}</small>
              </span>
              <button type="button" className="sh-icon-btn" onClick={logout} title="تسجيل الخروج">
                <i className="fa-solid fa-right-from-bracket" />
              </button>
            </div>
            <button type="button" className="sh-collapse" onClick={toggleCollapsed}>
              <i className={`fa-solid fa-angles-${collapsed ? "left" : "right"}`} />
              <span>طي القائمة</span>
            </button>
          </div>
        </aside>

        <main className="sh-main">{children}</main>

        {/* ── Phone bottom tab bar ── */}
        <nav className="sh-tabs" aria-label="التنقل">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className={`sh-tab ${t.primary ? "sh-tab--primary" : ""} ${isActive(t, pathname) ? "is-on" : ""}`}
            >
              <span className="sh-tab-ico">
                <i className={t.icon} />
              </span>
              <span className="sh-tab-label">{t.label}</span>
            </Link>
          ))}
          <button
            type="button"
            className={`sh-tab ${!anyTabActive || moreOpen ? "is-on" : ""}`}
            onClick={() => setMoreOpen(true)}
          >
            <span className="sh-tab-ico">
              <i className="fa-solid fa-bars" />
            </span>
            <span className="sh-tab-label">المزيد</span>
          </button>
        </nav>

        <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="القائمة" subtitle={activeMode.role}>
          <div className="sh-more">
            <div className="sh-more-modes">
              {MODES.map((m) => (
                <Link
                  key={m.to}
                  to={m.to}
                  className={`sh-more-mode ${m.to === activeMode.to ? "is-on" : ""}`}
                  onClick={() => setMoreOpen(false)}
                >
                  <i className={m.icon} />
                  <span>{m.label}</span>
                </Link>
              ))}
            </div>

            {groups.map((group, gi) => (
              <div key={gi} className="sh-more-group">
                {group.label && <div className="sh-more-label">{group.label}</div>}
                <div className="sh-more-grid">
                  {group.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`sh-more-item ${isActive(item, pathname) ? "is-on" : ""}`}
                      onClick={() => setMoreOpen(false)}
                    >
                      <span className="sh-more-ico">
                        <i className={item.icon} />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <div className="sh-more-user">
              <span className="sh-user-ava">{userName.charAt(0).toUpperCase()}</span>
              <span className="sh-user-text">
                <strong>{userName}</strong>
                <small dir="ltr">{user?.email}</small>
              </span>
              <button type="button" className="sh-more-logout" onClick={logout}>
                <i className="fa-solid fa-right-from-bracket" />
                خروج
              </button>
            </div>
          </div>
        </Sheet>
      </div>
    </ToastProvider>
  );
}
