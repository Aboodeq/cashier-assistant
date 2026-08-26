import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { useExchangeRate } from "./currency";
import "./SettingsPage.css";

export default function SettingsPage() {
  const uid = auth.currentUser?.uid;
  const rate = useExchangeRate();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Prefill the input the first time the live rate loads, without fighting the
  // user's typing on later snapshot updates. Adjusting state during render
  // (rather than in an effect) avoids an extra render + flash.
  const [sawRate, setSawRate] = useState(false);
  if (rate > 0 && !sawRate) {
    setSawRate(true);
    if (value === "") setValue(String(rate));
  }

  const handleSave = async (e) => {
    e.preventDefault();
    const n = Number(value);
    if (!n || n <= 0) return;
    setSaving(true);
    await setDoc(doc(db, "users", uid, "salesSettings", "main"), {
      usdToSyp: n,
      updatedAt: Date.now(),
    });
    setSaving(false);
  };

  return (
    <div className="se-root">
      <div className="se-header">
        <div className="se-header-bg" />
        <div className="se-header-body">
          <div className="se-header-ico">
            <i className="fa-solid fa-money-bill-transfer" style={{ fontSize: 22, color: "#fff" }} />
          </div>
          <div>
            <h1 className="se-header-title">الإعدادات</h1>
            <p className="se-header-sub">سعر صرف الدولار مقابل الليرة السورية</p>
          </div>
        </div>
      </div>

      <div className="se-body">
        <div className="se-card">
          <div className="se-card-title">
            <i className="fa-solid fa-money-bill-transfer" style={{ color: "#0e7490", fontSize: 16 }} />
            سعر الصرف
          </div>
          <p className="se-card-sub">
            حدّد كم ليرة سورية يساوي الدولار الواحد. تُستخدم هذه القيمة لتسعير المنتجات وتحويل
            المبيعات تلقائياً بين العملتين عند الحاجة.
          </p>

          <div className="se-current">
            <span className="se-current-lbl">السعر الحالي</span>
            {rate > 0 ? (
              <span className="se-current-val">
                $1 = {rate.toLocaleString()} ل.س
              </span>
            ) : (
              <span className="se-current-empty">لم يُحدَّد بعد</span>
            )}
          </div>

          <form onSubmit={handleSave} className="se-form">
            <div className="se-field">
              <label className="se-lbl">
                <i className="fa-solid fa-sack-dollar" />
                عدد الليرات مقابل 1 دولار
              </label>
              <div className="se-inp-wrap">
                <input
                  className="se-inp"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="مثال: 15000"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="se-save-btn" disabled={saving || !Number(value)}>
              {saving ? (
                <>
                  <div className="se-spinner" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check" />
                  حفظ السعر
                </>
              )}
            </button>
          </form>

          <div className="se-example">
            مثال: إذا أدخلت <strong>15000</strong>، فمنتج سعره <strong>$1</strong> يعادل تلقائياً{" "}
            <strong>15,000 ل.س</strong> عند البيع بالليرة — ما لم تحدّد له سعراً مباشراً بالليرة في
            صفحة المنتجات.
          </div>
        </div>
      </div>
    </div>
  );
}
