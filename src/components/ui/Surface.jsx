import "./Surface.css";

export function Card({ title, subtitle, icon, tone = "brand", actions, padded = true, className = "", children }) {
  const hasHead = title || actions;
  return (
    <section className={`ui-card ${className}`}>
      {hasHead && (
        <header className="ui-card-head">
          {icon && (
            <span className={`ui-card-ico ui-tone--${tone}`}>
              <i className={icon} aria-hidden="true" />
            </span>
          )}
          <div className="ui-card-titles">
            {title && <h2 className="ui-card-title">{title}</h2>}
            {subtitle && <p className="ui-card-sub">{subtitle}</p>}
          </div>
          {actions && <div className="ui-card-actions">{actions}</div>}
        </header>
      )}
      <div className={padded ? "ui-card-body" : undefined}>{children}</div>
    </section>
  );
}

/** tone: neutral | brand | success | warning | danger | info */
export function Badge({ tone = "neutral", icon, className = "", children }) {
  return (
    <span className={`ui-badge ui-tone--${tone} ${className}`}>
      {icon && <i className={icon} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function StatTile({ label, value, sub, icon, tone = "brand", onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} className={`ui-stat ${onClick ? "is-clickable" : ""}`} onClick={onClick}>
      <div className="ui-stat-top">
        <span className="ui-stat-label">{label}</span>
        {icon && (
          <span className={`ui-stat-ico ui-tone--${tone}`}>
            <i className={icon} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="ui-stat-value">{value}</div>
      {sub && <div className="ui-stat-sub">{sub}</div>}
    </Tag>
  );
}

export function EmptyState({ icon = "fa-regular fa-folder-open", title, text, action, compact = false }) {
  return (
    <div className={`ui-empty ${compact ? "ui-empty--compact" : ""}`}>
      <span className="ui-empty-ico">
        <i className={icon} aria-hidden="true" />
      </span>
      {title && <div className="ui-empty-title">{title}</div>}
      {text && <div className="ui-empty-text">{text}</div>}
      {action && <div className="ui-empty-action">{action}</div>}
    </div>
  );
}

export function List({ className = "", children }) {
  return <div className={`ui-list ${className}`}>{children}</div>;
}

/** A tappable row: leading (avatar/icon), title + subtitle/meta, trailing (value/actions). */
export function ListRow({ leading, title, subtitle, meta, trailing, onClick, chevron = Boolean(onClick), className = "" }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} className={`ui-row ${onClick ? "is-clickable" : ""} ${className}`} onClick={onClick}>
      {leading && <div className="ui-row-lead">{leading}</div>}
      <div className="ui-row-main">
        <div className="ui-row-title">{title}</div>
        {subtitle && <div className="ui-row-sub">{subtitle}</div>}
        {meta && <div className="ui-row-meta">{meta}</div>}
      </div>
      {trailing && <div className="ui-row-trail">{trailing}</div>}
      {chevron && <i className="fa-solid fa-chevron-left ui-row-chev" aria-hidden="true" />}
    </Tag>
  );
}

const AVATAR_TONES = ["brand", "success", "warning", "info", "danger", "neutral"];

export function Avatar({ name = "", icon, tone, size = 40 }) {
  const code = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const t = tone || AVATAR_TONES[code % AVATAR_TONES.length];
  return (
    <span
      className={`ui-avatar ui-tone--${t}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      {icon ? <i className={icon} /> : name.trim().charAt(0) || "?"}
    </span>
  );
}

export function IconTile({ icon, tone = "brand", size = 40 }) {
  return (
    <span className={`ui-avatar ui-tone--${tone}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}>
      <i className={icon} aria-hidden="true" />
    </span>
  );
}

export function KeyValue({ label, value, strong = false }) {
  return (
    <div className={`ui-kv ${strong ? "ui-kv--strong" : ""}`}>
      <span className="ui-kv-label">{label}</span>
      <span className="ui-kv-value">{value}</span>
    </div>
  );
}

/** Inline message box. tone: info | warning | danger | success | brand */
export function Callout({ tone = "info", icon, title, action, children }) {
  const defaultIcon = {
    info: "fa-solid fa-circle-info",
    warning: "fa-solid fa-triangle-exclamation",
    danger: "fa-solid fa-circle-exclamation",
    success: "fa-solid fa-circle-check",
    brand: "fa-solid fa-lightbulb",
  }[tone];
  return (
    <div className={`ui-callout ui-callout--${tone}`}>
      <i className={icon || defaultIcon} aria-hidden="true" />
      <div className="ui-callout-body">
        {title && <div className="ui-callout-title">{title}</div>}
        {children && <div className="ui-callout-text">{children}</div>}
      </div>
      {action && <div className="ui-callout-action">{action}</div>}
    </div>
  );
}

export function Spinner({ label = "جاري التحميل..." }) {
  return (
    <div className="ui-spinner-wrap" role="status">
      <span className="ui-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
