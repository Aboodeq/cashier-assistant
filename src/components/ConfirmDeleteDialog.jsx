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
    <>
      <style>{CSS}</style>
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
    </>
  );
}

const CSS = `
@keyframes cdFade{from{opacity:0;}to{opacity:1;}}
@keyframes cdPop{from{opacity:0;transform:translateY(10px) scale(0.96);}to{opacity:1;transform:translateY(0) scale(1);}}
@keyframes cdSpin{to{transform:rotate(360deg);}}

.cd-overlay{
  position:fixed;inset:0;z-index:9999;
  display:flex;align-items:center;justify-content:center;
  padding:20px;background:rgba(15,23,42,0.46);
  backdrop-filter:blur(10px);
  animation:cdFade 0.18s ease both;
}
.cd-box{
  width:min(430px,100%);
  background:#fff;border:1px solid #fee2e2;border-radius:16px;
  padding:22px;box-shadow:0 24px 70px rgba(15,23,42,0.24);
  direction:rtl;text-align:right;
  animation:cdPop 0.2s cubic-bezier(0.22,1,0.36,1) both;
}
.cd-icon{
  width:46px;height:46px;border-radius:14px;
  display:flex;align-items:center;justify-content:center;
  background:#fef2f2;color:#dc2626;border:1px solid #fecaca;
  margin-bottom:14px;font-size:18px;
}
.cd-content{display:flex;flex-direction:column;gap:6px;}
.cd-title{margin:0;color:#0f172a;font-size:18px;font-weight:900;letter-spacing:0;}
.cd-message{margin:0;color:#64748b;font-size:14px;line-height:1.8;}
.cd-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px;}
.cd-btn{
  min-height:40px;border:none;border-radius:10px;
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  padding:0 16px;font-size:13px;font-weight:800;cursor:pointer;
  transition:all 0.2s;white-space:nowrap;
}
.cd-btn:disabled{opacity:0.65;cursor:not-allowed;}
.cd-btn--cancel{background:#f8fafc;color:#475569;border:1px solid #e2e8f0;}
.cd-btn--cancel:hover:not(:disabled){background:#f1f5f9;}
.cd-btn--delete{background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;box-shadow:0 5px 16px rgba(220,38,38,0.26);}
.cd-btn--delete:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 22px rgba(220,38,38,0.32);}
.cd-spinner{
  width:14px;height:14px;border-radius:50%;
  border:2px solid rgba(255,255,255,0.45);border-top-color:#fff;
  animation:cdSpin 0.8s linear infinite;
}
@media (max-width:520px){
  .cd-box{padding:18px;border-radius:14px;}
  .cd-actions{flex-direction:column-reverse;}
  .cd-btn{width:100%;}
}
`;
