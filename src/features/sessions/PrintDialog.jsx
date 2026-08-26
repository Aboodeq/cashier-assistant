import "./PrintDialog.css";

export default function PrintDialog({ onClose, onPrint, deps, wths, entries, dT, wT, nT }) {
  return (
    <div className="pd-overlay" onClick={onClose}>
      <div className="pd-box" onClick={(e) => e.stopPropagation()}>
        <div className="pd-header">
          <div className="pd-header-ico">
            <i className="fa-solid fa-print" style={{ fontSize: 18, color: "#4f46e5" }} />
          </div>
          <div>
            <div className="pd-title">اختر ما تريد طباعته</div>
            <div className="pd-subtitle">سيتم فتح نافذة الطباعة مباشرة</div>
          </div>
        </div>
        <div className="pd-options">
          <button className="pd-opt pd-opt--dep" onClick={() => onPrint("deposit")}>
            <div className="pd-opt-ico pd-opt-ico--dep">
              <i className="fa-solid fa-arrow-down" style={{ fontSize: 18, color: "#059669" }} />
            </div>
            <div className="pd-opt-body">
              <span className="pd-opt-title">الإيداعات فقط</span>
              <span className="pd-opt-desc">
                {deps.length} إدخال · ل.س: {dT.newSYP.toLocaleString()} · ${dT.usd.toLocaleString()}
              </span>
            </div>
            <i className="fa-solid fa-chevron-left pd-opt-arrow" />
          </button>
          <button className="pd-opt pd-opt--wth" onClick={() => onPrint("withdrawal")}>
            <div className="pd-opt-ico pd-opt-ico--wth">
              <i className="fa-solid fa-arrow-up" style={{ fontSize: 18, color: "#dc2626" }} />
            </div>
            <div className="pd-opt-body">
              <span className="pd-opt-title">السحوبات فقط</span>
              <span className="pd-opt-desc">
                {wths.length} إدخال · ل.س: {wT.newSYP.toLocaleString()} · ${wT.usd.toLocaleString()}
              </span>
            </div>
            <i className="fa-solid fa-chevron-left pd-opt-arrow" />
          </button>
          <button className="pd-opt pd-opt--all" onClick={() => onPrint("all")}>
            <div className="pd-opt-ico pd-opt-ico--all">
              <i className="fa-solid fa-layer-group" style={{ fontSize: 18, color: "#4f46e5" }} />
            </div>
            <div className="pd-opt-body">
              <span className="pd-opt-title">الإيداعات والسحوبات معاً</span>
              <span className="pd-opt-desc">
                {entries.length} إدخال إجمالاً · الصافي: {nT.newSYP.toLocaleString()} / $
                {nT.usd.toLocaleString()}
              </span>
            </div>
            <i className="fa-solid fa-chevron-left pd-opt-arrow" />
          </button>
        </div>
        <button className="pd-cancel" onClick={onClose}>
          <i className="fa-solid fa-xmark" />
          إلغاء
        </button>
      </div>
    </div>
  );
}
