import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import "./Sheet.css";

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

/**
 * Bottom sheet on phones, centered dialog on larger screens. Used for every
 * add/edit form so the full set of fields is visible in one place.
 * Put the form's submit button in `footer` with `form="<form id>"`.
 */
export function Sheet({ open, onClose, title, subtitle, icon, size = "md", footer, dismissible = true, children }) {
  useEscape(open, dismissible ? onClose : null);
  if (!open) return null;
  return createPortal(
    <div
      className="ui-sheet-overlay"
      onClick={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={`ui-sheet ui-sheet--${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="ui-sheet-grip" aria-hidden="true" />
        <header className="ui-sheet-head">
          {icon && (
            <span className="ui-sheet-ico">
              <i className={icon} aria-hidden="true" />
            </span>
          )}
          <div className="ui-sheet-titles">
            <h2 className="ui-sheet-title">{title}</h2>
            {subtitle && <p className="ui-sheet-sub">{subtitle}</p>}
          </div>
          {onClose && (
            <button type="button" className="ui-sheet-close" onClick={onClose} aria-label="إغلاق">
              <i className="fa-solid fa-xmark" />
            </button>
          )}
        </header>
        <div className="ui-sheet-body">{children}</div>
        {footer && <footer className="ui-sheet-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  tone = "danger",
  icon,
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEscape(open, loading ? null : onCancel);
  if (!open) return null;
  const toneIcon = icon || (tone === "danger" ? "fa-solid fa-trash" : "fa-solid fa-circle-question");
  return createPortal(
    <div
      className="ui-sheet-overlay ui-sheet-overlay--center"
      onClick={(e) => {
        if (!loading && e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div className="ui-confirm" role="alertdialog" aria-modal="true" aria-label={title}>
        <span className={`ui-confirm-ico ui-confirm-ico--${tone}`}>
          <i className={toneIcon} aria-hidden="true" />
        </span>
        <h2 className="ui-confirm-title">{title}</h2>
        {message && <p className="ui-confirm-msg">{message}</p>}
        <div className="ui-confirm-actions">
          <Button variant="secondary" onClick={onCancel} disabled={loading} block>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={loading} block>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * List of actions in a sheet — replaces rows of small buttons on phones.
 * actions: [{ label, icon, tone, onClick, href, target, disabled, hint }]
 */
export function ActionSheet({ open, onClose, title, subtitle, actions }) {
  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={subtitle} size="sm">
      <div className="ui-actions">
        {actions.filter(Boolean).map((a) => {
          const content = (
            <>
              <span className={`ui-action-ico ui-action-ico--${a.tone || "neutral"}`}>
                <i className={a.icon} aria-hidden="true" />
              </span>
              <span className="ui-action-text">
                <span className={`ui-action-label ${a.tone === "danger" ? "is-danger" : ""}`}>{a.label}</span>
                {a.hint && <span className="ui-action-hint">{a.hint}</span>}
              </span>
            </>
          );
          if (a.href) {
            return (
              <a
                key={a.label}
                className="ui-action"
                href={a.href}
                target={a.target}
                rel={a.target === "_blank" ? "noopener noreferrer" : undefined}
                onClick={onClose}
              >
                {content}
              </a>
            );
          }
          return (
            <button
              key={a.label}
              type="button"
              className="ui-action"
              disabled={a.disabled}
              onClick={() => {
                onClose?.();
                a.onClick?.();
              }}
            >
              {content}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
