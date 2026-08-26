import "./Modal.css";

/**
 * Generic pop-up dialog for editing forms — used instead of expanding a form
 * inline within a list row, so the full set of fields is always visible at
 * once rather than a trimmed-down subset.
 */
export default function Modal({ open, title, subtitle, icon, onClose, children, maxWidth = 640 }) {
  if (!open) return null;

  return (
    <div className="md-overlay" onClick={onClose}>
      <div className="md-box" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div className="md-header">
          {icon && (
            <div className="md-header-ico">
              <i className={icon} />
            </div>
          )}
          <div className="md-header-text">
            <h2 className="md-title">{title}</h2>
            {subtitle && <p className="md-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="md-close" onClick={onClose} aria-label="إغلاق">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="md-body">{children}</div>
      </div>
    </div>
  );
}
