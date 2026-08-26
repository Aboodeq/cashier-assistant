import { useState } from "react";
import { deleteDoc, doc, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import Modal from "../../components/Modal";
import { formatDual } from "./currency";
import "./GoalsPage.css";

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
const thisMonth = () => new Date().toISOString().slice(0, 7);
const monthLabel = (ym) => {
  const [y, m] = (ym || "").split("-");
  return m ? `${ARABIC_MONTHS[Number(m) - 1]} ${y}` : ym;
};
const pctFor = (actual, target) => (target > 0 ? Math.round((actual / target) * 100) : null);

const emptyForm = { month: thisMonth(), targetUSD: "", targetSYP: "", commissionRate: "", notes: "" };

export default function GoalsPage() {
  const uid = auth.currentUser?.uid;
  const goals = useFirestoreCollection(uid && ["users", uid, "salesGoals"]);
  const orders = useFirestoreCollection(uid && ["users", uid, "salesOrders"]);

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState(emptyForm);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const setField = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  // Actual sales revenue for a given "YYYY-MM" month, kept per currency —
  // same convention as every other money figure in the sales module.
  const actualForMonth = (month) =>
    orders
      .filter((o) => o.date?.startsWith(month))
      .reduce(
        (acc, o) => {
          acc.usd += o.totalUSD || 0;
          acc.syp += o.totalSYP || 0;
          return acc;
        },
        { usd: 0, syp: 0 },
      );

  const commissionFor = (goal, actual) => {
    const rate = (Number(goal?.commissionRate) || 0) / 100;
    return { usd: actual.usd * rate, syp: actual.syp * rate };
  };

  const sortedGoals = [...goals].sort((a, b) => b.month.localeCompare(a.month));

  const currentGoal = goals.find((g) => g.month === thisMonth());
  const currentActual = actualForMonth(thisMonth());
  const currentCommission = currentGoal ? commissionFor(currentGoal, currentActual) : null;

  const allTimeCommission = goals.reduce(
    (acc, g) => {
      const c = commissionFor(g, actualForMonth(g.month));
      acc.usd += c.usd;
      acc.syp += c.syp;
      return acc;
    },
    { usd: 0, syp: 0 },
  );

  const existingForFormMonth = goals.find((g) => g.month === form.month);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.month) return;
    if (!Number(form.targetUSD) && !Number(form.targetSYP) && !Number(form.commissionRate)) return;
    setSaving(true);
    await setDoc(doc(db, "users", uid, "salesGoals", form.month), {
      month: form.month,
      targetUSD: Number(form.targetUSD) || 0,
      targetSYP: Number(form.targetSYP) || 0,
      commissionRate: Number(form.commissionRate) || 0,
      notes: form.notes.trim(),
      updatedAt: Date.now(),
    });
    setForm({ ...emptyForm, month: form.month });
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editId) return;
    await setDoc(doc(db, "users", uid, "salesGoals", editId), {
      month: editId,
      targetUSD: Number(editData.targetUSD) || 0,
      targetSYP: Number(editData.targetSYP) || 0,
      commissionRate: Number(editData.commissionRate) || 0,
      notes: editData.notes.trim(),
      updatedAt: Date.now(),
    });
    setEditId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await deleteDoc(doc(db, "users", uid, "salesGoals", deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <div className="gl-root">
        {/* Header */}
        <div className="gl-header">
          <div className="gl-header-bg" />
          <div className="gl-header-body">
            <div className="gl-header-left">
              <div className="gl-header-ico">
                <i className="fa-solid fa-bullseye" style={{ fontSize: 22, color: "#fff" }} />
              </div>
              <div>
                <h1 className="gl-header-title">الأهداف والعمولات</h1>
                <p className="gl-header-sub">حدّد هدف المبيعات الشهري ونسبة عمولتك وتابع إنجازك</p>
              </div>
            </div>
            <div className="gl-header-badge">
              <i className="fa-solid fa-calendar-check" style={{ fontSize: 11 }} />
              {monthLabel(thisMonth())}
            </div>
          </div>
        </div>

        <div className="gl-body">
          {/* Current month progress */}
          <div className="gl-current-card">
            <div className="gl-section-title">
              <i className="fa-solid fa-gauge-high" style={{ color: "#be185d", fontSize: 16 }} />
              إنجاز الشهر الحالي — {monthLabel(thisMonth())}
            </div>

            {!currentGoal ? (
              <div className="gl-no-goal">
                <i className="fa-solid fa-circle-info" />
                لم تحدد هدفاً لهذا الشهر بعد — حدده من النموذج بالأسفل
              </div>
            ) : (
              <>
                <div className="gl-progress-list">
                  {currentGoal.targetUSD > 0 && (
                    <div className="gl-progress-row">
                      <div className="gl-progress-lbl">
                        <span>الهدف بالدولار</span>
                        <span>
                          ${currentActual.usd.toLocaleString()} / ${currentGoal.targetUSD.toLocaleString()} (
                          {pctFor(currentActual.usd, currentGoal.targetUSD)}%)
                        </span>
                      </div>
                      <div className="gl-progress-track">
                        <div
                          className={`gl-progress-fill ${pctFor(currentActual.usd, currentGoal.targetUSD) >= 100 ? "gl-progress-fill--done" : ""}`}
                          style={{ width: `${Math.min(100, pctFor(currentActual.usd, currentGoal.targetUSD))}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {currentGoal.targetSYP > 0 && (
                    <div className="gl-progress-row">
                      <div className="gl-progress-lbl">
                        <span>الهدف بالليرة السورية</span>
                        <span>
                          {currentActual.syp.toLocaleString()} / {currentGoal.targetSYP.toLocaleString()} ل.س (
                          {pctFor(currentActual.syp, currentGoal.targetSYP)}%)
                        </span>
                      </div>
                      <div className="gl-progress-track">
                        <div
                          className={`gl-progress-fill ${pctFor(currentActual.syp, currentGoal.targetSYP) >= 100 ? "gl-progress-fill--done" : ""}`}
                          style={{ width: `${Math.min(100, pctFor(currentActual.syp, currentGoal.targetSYP))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="gl-stats-strip">
                  <div className="gl-stat-chip">
                    <span className="gl-stat-chip-lbl">مبيعات الشهر</span>
                    <span className="gl-stat-chip-val">{formatDual(currentActual.usd, currentActual.syp)}</span>
                  </div>
                  <div className="gl-stat-chip">
                    <span className="gl-stat-chip-lbl">نسبة العمولة</span>
                    <span className="gl-stat-chip-val">{currentGoal.commissionRate || 0}%</span>
                  </div>
                  <div className="gl-stat-chip gl-stat-chip--accent">
                    <span className="gl-stat-chip-lbl">عمولة الشهر المستحقة</span>
                    <span className="gl-stat-chip-val">
                      {formatDual(currentCommission.usd, currentCommission.syp)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* All-time commission */}
          {goals.length > 0 && (
            <div className="gl-stats-strip">
              <div className="gl-stat-chip gl-stat-chip--accent">
                <span className="gl-stat-chip-lbl">إجمالي العمولات (كل الشهور المحدَّدة)</span>
                <span className="gl-stat-chip-val">
                  {formatDual(allTimeCommission.usd, allTimeCommission.syp)}
                </span>
              </div>
            </div>
          )}

          {/* Add / update goal */}
          <div className="gl-add-card">
            <div className="gl-section-title">
              <i className="fa-solid fa-plus-circle" style={{ color: "#be185d", fontSize: 16 }} />
              تحديد هدف شهر
            </div>

            {existingForFormMonth && (
              <div className="gl-no-goal" style={{ marginBottom: 14 }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ color: "#f59e0b" }} />
                يوجد هدف محفوظ مسبقاً لشهر {monthLabel(form.month)} — سيتم تحديثه عند الحفظ
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="gl-row">
                <div className="gl-field">
                  <label className="gl-lbl">
                    <i className="fa-regular fa-calendar" />
                    الشهر
                  </label>
                  <div className="gl-inp-wrap">
                    <input className="gl-inp" type="month" value={form.month} onChange={setField("month")} required />
                  </div>
                </div>
                <div className="gl-field">
                  <label className="gl-lbl">
                    <i className="fa-solid fa-percent" />
                    نسبة العمولة
                  </label>
                  <div className="gl-inp-wrap">
                    <input
                      className="gl-inp"
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      placeholder="مثال: 5"
                      value={form.commissionRate}
                      onChange={setField("commissionRate")}
                    />
                  </div>
                </div>
                <div className="gl-field">
                  <label className="gl-lbl">
                    <i className="fa-solid fa-dollar-sign" />
                    الهدف بالدولار
                  </label>
                  <div className="gl-inp-wrap">
                    <input
                      className="gl-inp"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="اختياري"
                      value={form.targetUSD}
                      onChange={setField("targetUSD")}
                    />
                  </div>
                </div>
                <div className="gl-field">
                  <label className="gl-lbl">
                    <i className="fa-solid fa-money-bill" />
                    الهدف بالليرة
                  </label>
                  <div className="gl-inp-wrap">
                    <input
                      className="gl-inp"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="اختياري"
                      value={form.targetSYP}
                      onChange={setField("targetSYP")}
                    />
                  </div>
                </div>
              </div>
              <div className="gl-field" style={{ marginTop: 12 }}>
                <label className="gl-lbl">
                  <i className="fa-regular fa-note-sticky" />
                  ملاحظات
                </label>
                <div className="gl-inp-wrap">
                  <input
                    className="gl-inp"
                    placeholder="اختياري..."
                    value={form.notes}
                    onChange={setField("notes")}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="gl-save-btn"
                style={{ marginTop: 14 }}
                disabled={
                  saving || (!Number(form.targetUSD) && !Number(form.targetSYP) && !Number(form.commissionRate))
                }
              >
                {saving ? (
                  <>
                    <div className="gl-spinner" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check" />
                    حفظ الهدف
                  </>
                )}
              </button>
            </form>
          </div>

          {/* History */}
          {sortedGoals.length === 0 ? (
            <div className="gl-empty">
              <div className="gl-empty-ico">
                <i className="fa-solid fa-bullseye" style={{ fontSize: 34, color: "#fbcfe8" }} />
              </div>
              <div className="gl-empty-title">لا توجد أهداف محدَّدة بعد</div>
              <div className="gl-empty-sub">حدّد أول هدف شهري من النموذج أعلاه</div>
            </div>
          ) : (
            <div className="gl-list">
              {sortedGoals.map((g, i) => {
                const actual = actualForMonth(g.month);
                const commission = commissionFor(g, actual);
                return (
                  <div key={g.id} className="gl-item" style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="gl-item-left">
                      <div className="gl-item-ico">
                        <i className="fa-solid fa-bullseye" style={{ fontSize: 16, color: "#be185d" }} />
                      </div>
                      <div className="gl-item-info">
                        <div className="gl-item-name">{monthLabel(g.month)}</div>
                        <div className="gl-item-meta">
                          {g.targetUSD > 0 && (
                            <span>
                              <i className="fa-solid fa-dollar-sign" style={{ fontSize: 10 }} />
                              الهدف ${g.targetUSD.toLocaleString()} — تحقق {pctFor(actual.usd, g.targetUSD)}%
                            </span>
                          )}
                          {g.targetSYP > 0 && (
                            <span>
                              <i className="fa-solid fa-money-bill" style={{ fontSize: 10 }} />
                              الهدف {g.targetSYP.toLocaleString()} ل.س — تحقق {pctFor(actual.syp, g.targetSYP)}%
                            </span>
                          )}
                          <span>
                            <i className="fa-solid fa-percent" style={{ fontSize: 10 }} />
                            عمولة {g.commissionRate || 0}%
                          </span>
                          <span className="gl-item-commission">
                            <i className="fa-solid fa-sack-dollar" style={{ fontSize: 10 }} />
                            العمولة: {formatDual(commission.usd, commission.syp)}
                          </span>
                        </div>
                        {g.notes && <div className="gl-item-notes">{g.notes}</div>}
                      </div>
                    </div>
                    <div className="gl-item-actions">
                      <button
                        className="gl-btn gl-btn--edit"
                        onClick={() => {
                          setEditId(g.id);
                          setEditData({
                            month: g.month,
                            targetUSD: g.targetUSD || "",
                            targetSYP: g.targetSYP || "",
                            commissionRate: g.commissionRate || "",
                            notes: g.notes || "",
                          });
                        }}
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button
                        className="gl-btn gl-btn--del"
                        onClick={() => setDeleteTarget(g)}
                        disabled={deleting === g.id}
                      >
                        {deleting === g.id ? (
                          <div className="gl-spinner gl-spinner--red" />
                        ) : (
                          <i className="fa-solid fa-trash" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(editId)}
        onClose={() => setEditId(null)}
        icon="fa-solid fa-pen"
        title="تعديل الهدف"
        subtitle={editId ? `هدف شهر ${monthLabel(editId)}` : ""}
      >
        <div className="gl-modal-form">
          <div className="gl-field">
            <label className="gl-lbl">
              <i className="fa-solid fa-percent" />
              نسبة العمولة
            </label>
            <div className="gl-inp-wrap">
              <input
                className="gl-inp"
                type="number"
                min="0"
                max="100"
                step="any"
                value={editData.commissionRate}
                onChange={(e) => setEditData((d) => ({ ...d, commissionRate: e.target.value }))}
              />
            </div>
          </div>
          <div className="gl-field">
            <label className="gl-lbl">
              <i className="fa-solid fa-dollar-sign" />
              الهدف بالدولار
            </label>
            <div className="gl-inp-wrap">
              <input
                className="gl-inp"
                type="number"
                min="0"
                step="any"
                placeholder="اختياري"
                value={editData.targetUSD}
                onChange={(e) => setEditData((d) => ({ ...d, targetUSD: e.target.value }))}
              />
            </div>
          </div>
          <div className="gl-field">
            <label className="gl-lbl">
              <i className="fa-solid fa-money-bill" />
              الهدف بالليرة
            </label>
            <div className="gl-inp-wrap">
              <input
                className="gl-inp"
                type="number"
                min="0"
                step="any"
                placeholder="اختياري"
                value={editData.targetSYP}
                onChange={(e) => setEditData((d) => ({ ...d, targetSYP: e.target.value }))}
              />
            </div>
          </div>
          <div className="gl-field">
            <label className="gl-lbl">
              <i className="fa-regular fa-note-sticky" />
              ملاحظات
            </label>
            <div className="gl-inp-wrap">
              <input
                className="gl-inp"
                placeholder="اختياري..."
                value={editData.notes}
                onChange={(e) => setEditData((d) => ({ ...d, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="gl-modal-actions">
            <button type="button" className="gl-save-btn gl-modal-save" onClick={handleEdit}>
              <i className="fa-solid fa-check" />
              حفظ التعديلات
            </button>
            <button type="button" className="gl-btn gl-btn--cancel" onClick={() => setEditId(null)}>
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="تأكيد حذف الهدف"
        message={`سيتم حذف هدف شهر "${monthLabel(deleteTarget?.month)}" نهائياً.`}
        confirmLabel="حذف الهدف"
        loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
