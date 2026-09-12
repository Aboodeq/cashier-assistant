import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Page.css";

/**
 * Standard page frame. The header is sticky and doubles as the phone's top
 * app bar. `back` is the fallback path used when there's no in-app history
 * to return to (e.g. the page was opened directly from a link).
 * `footer` renders a sticky bottom action bar.
 */
export function Page({ title, subtitle, back, actions, footer, wide = false, className = "", children }) {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = title ? `${title} · Cashier Assistant` : "Cashier Assistant";
  }, [title]);

  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate(typeof back === "string" ? back : "..");
  };

  return (
    <div className={`ui-pg ${className}`}>
      <header className="ui-pg-head">
        <div className={`ui-pg-head-in ${wide ? "is-wide" : ""}`}>
          {back && (
            <button type="button" className="ui-pg-back" onClick={goBack} aria-label="رجوع">
              <i className="fa-solid fa-arrow-right" />
            </button>
          )}
          <div className="ui-pg-titles">
            <h1 className="ui-pg-title">{title}</h1>
            {subtitle && <p className="ui-pg-sub">{subtitle}</p>}
          </div>
          {actions && <div className="ui-pg-actions">{actions}</div>}
        </div>
      </header>
      <div className={`ui-pg-body ${wide ? "is-wide" : ""}`}>{children}</div>
      {footer && (
        <div className="ui-pg-foot">
          <div className={`ui-pg-foot-in ${wide ? "is-wide" : ""}`}>{footer}</div>
        </div>
      )}
    </div>
  );
}

export function Section({ title, subtitle, actions, className = "", children }) {
  return (
    <section className={`ui-sec ${className}`}>
      {(title || actions) && (
        <div className="ui-sec-head">
          <div className="ui-sec-titles">
            {title && <h2 className="ui-sec-title">{title}</h2>}
            {subtitle && <p className="ui-sec-sub">{subtitle}</p>}
          </div>
          {actions && <div className="ui-sec-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Tabs({ value, onChange, tabs }) {
  return (
    <div className="ui-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          className={`ui-tab ${value === t.value ? "is-on" : ""}`}
          onClick={() => onChange(t.value)}
        >
          {t.icon && <i className={t.icon} aria-hidden="true" />}
          <span>{t.label}</span>
          {t.count != null && <span className="ui-tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Horizontally scrollable row of filter chips / controls. */
export function Toolbar({ className = "", children }) {
  return <div className={`ui-toolbar ${className}`}>{children}</div>;
}

export function Chip({ active = false, icon, onClick, children }) {
  return (
    <button type="button" className={`ui-chip ${active ? "is-on" : ""}`} onClick={onClick} aria-pressed={active}>
      {icon && <i className={icon} aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Responsive grid for cards/tiles. */
export function Grid({ min = 160, gap = 12, className = "", children }) {
  return (
    <div
      className={`ui-autogrid ${className}`}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${min}px, 100%), 1fr))`, gap }}
    >
      {children}
    </div>
  );
}

export function Stack({ gap = 16, className = "", children }) {
  return (
    <div className={`ui-stack ${className}`} style={{ gap }}>
      {children}
    </div>
  );
}
