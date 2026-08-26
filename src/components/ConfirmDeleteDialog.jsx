import "./ConfirmDeleteDialog.css";

export default function ConfirmDeleteDialog({
  open,
  title = "تأكيد الحذف",
  message = "هل أنت متأكد من حذف هذا العنصر؟",
  confirmLabel = "حذف",
  cancelLabel = "إلغاء",
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="cd-overlay" onClick={loading ? undefined : onCancel}>
      <div className="cd-box" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="cd-icon">
          <i className="fa-solid fa-trash" />
        </div>
        <div className="cd-content">
          <h2 className="cd-title">{title}</h2>
          <p className="cd-message">{message}</p>
        </div>
        <div className="cd-actions">
          <button className="cd-btn cd-btn--cancel" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button className="cd-btn cd-btn--delete" onClick={onConfirm} disabled={loading}>
            {loading ? (
              <>
                <span className="cd-spinner" />
                جاري الحذف...
              </>
            ) : (
              <>
                <i className="fa-solid fa-trash" />
                {confirmLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
