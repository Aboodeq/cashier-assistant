import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ToastContext } from "./toastContext";
import "./Toast.css";

const ICONS = {
  success: "fa-solid fa-circle-check",
  error: "fa-solid fa-circle-exclamation",
  info: "fa-solid fa-circle-info",
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone, message, { action, duration } = {}) => {
      nextId.current += 1;
      const id = nextId.current;
      setItems((list) => [...list.slice(-2), { id, tone, message, action }]);
      setTimeout(() => dismiss(id), duration ?? (action ? 7000 : 3500));
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (message, opts) => push("success", message, opts),
      error: (message, opts) => push("error", message, opts),
      info: (message, opts) => push("info", message, opts),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="ui-toasts" aria-live="polite">
          {items.map((t) => (
            <div key={t.id} className={`ui-toast ui-toast--${t.tone}`} role="status">
              <i className={ICONS[t.tone]} aria-hidden="true" />
              <span className="ui-toast-msg">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  className="ui-toast-action"
                  onClick={() => {
                    dismiss(t.id);
                    t.action.onClick();
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button type="button" className="ui-toast-close" onClick={() => dismiss(t.id)} aria-label="إغلاق">
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
