import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import Modal from "../../components/Modal";
import { formatDual, formatMoney } from "./currency";
import "./ExpensesPage.css";

const today = () => new Date().toISOString().split("T")[0];
const thisMonth = () => today().slice(0, 7);

const CATEGORIES = [
  { value: "fuel", label: "وقود", icon: "fa-solid fa-gas-pump" },
  { value: "maintenance", label: "صيانة", icon: "fa-solid fa-wrench" },
  { value: "tolls", label: "رسوم طرق", icon: "fa-solid fa-road" },
  { value: "parking", label: "مواقف", icon: "fa-solid fa-square-parking" },
  { value: "insurance", label: "تأمين", icon: "fa-solid fa-shield-halved" },
  { value: "fines", label: "مخالفات", icon: "fa-solid fa-triangle-exclamation" },
  { value: "other", label: "أخرى", icon: "fa-solid fa-ellipsis" },
];
const categoryOf = (value) => CATEGORIES.find((c) => c.value === value) || CATEGORIES[CATEGORIES.length - 1];

const emptyForm = { category: "fuel", currency: "USD", amount: "", odometer: "", date: today(), notes: "" };

export default function ExpensesPage() {
  const uid = auth.currentUser?.uid;
  const expenses = useFirestoreCollection(uid && ["users", uid, "salesExpenses"], {
    orderByField: "createdAt",
  });

  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const setField = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.category || !Number(form.amount)) return;
    setLoading(true);
    await addDoc(collection(db, "users", uid, "salesExpenses"), {
      category: form.category,
      categoryLabel: categoryOf(form.category).label,
      currency: form.currency,
      amount: Number(form.amount),
      odometer: form.odometer ? Number(form.odometer) : null,
      date: form.date,
      notes: form.notes.trim(),
      createdAt: Date.now(),
    });
    setForm({ ...emptyForm, category: form.category, currency: form.currency });
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await deleteDoc(doc(db, "users", uid, "salesExpenses", deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = async () => {
    if (!editData.category || !Number(editData.amount)) return;
    await updateDoc(doc(db, "users", uid, "salesExpenses", editId), {
      category: editData.category,
      categoryLabel: categoryOf(editData.category).label,
      currency: editData.currency,
      amount: Number(editData.amount),
      odometer: editData.odometer ? Number(editData.odometer) : null,
      date: editData.date,
      notes: editData.notes.trim(),
    });
    setEditId(null);
  };

  const filtered = expenses
    .filter((x) => (filterCategory ? x.category === filterCategory : true))
    .filter((x) => (filterMonth ? x.date?.startsWith(filterMonth) : true));

  // Totals — kept per currency (never blended), same convention as every
  // other money figure in the sales module.
  const sumDual = (list) =>
    list.reduce(
      (acc, x) => {
        if (x.currency === "USD") acc.usd += x.amount;
        else acc.syp += x.amount;
        return acc;
      },
      { usd: 0, syp: 0 },
    );
  const monthTotal = sumDual(expenses.filter((x) => x.date?.startsWith(thisMonth())));
  const allTotal = sumDual(expenses);
  const byCategory = CATEGORIES.map((c) => ({
    ...c,
    ...sumDual(expenses.filter((x) => x.category === c.value)),
  })).filter((c) => c.usd > 0 || c.syp > 0);

  const odometerReadings = expenses.map((x) => Number(x.odometer) || 0).filter(Boolean);
  const lastOdometer = odometerReadings.length ? Math.max(...odometerReadings) : null;

  return (
    <>
      <div className="ex-root">
        {/* Header */}
        <div className="ex-header">
          <div className="ex-header-bg" />
          <div className="ex-header-body">
            <div className="ex-header-left">
              <div className="ex-header-ico">
                <i className="fa-solid fa-car" style={{ fontSize: 22, color: "#fff" }} />
              </div>
              <div>
                <h1 className="ex-header-title">السيارة والمصاريف</h1>
                <p className="ex-header-sub">تتبّع مصاريف التشغيل اليومية للسيارة</p>
              </div>
            </div>
            <div className="ex-header-badge">
              <i className="fa-solid fa-receipt" style={{ fontSize: 11 }} />
              {expenses.length} مصروف مسجّل
            </div>
          </div>
        </div>

        <div className="ex-body">
          {/* Stats */}
          <div className="ex-stats-strip">
            <div className="ex-stat-chip">
              <span className="ex-stat-chip-lbl">مصاريف هذا الشهر</span>
              <span className="ex-stat-chip-val">{formatDual(monthTotal.usd, monthTotal.syp)}</span>
            </div>
            <div className="ex-stat-chip">
              <span className="ex-stat-chip-lbl">إجمالي كل الوقت</span>
              <span className="ex-stat-chip-val">{formatDual(allTotal.usd, allTotal.syp)}</span>
            </div>
            {lastOdometer != null && (
              <div className="ex-stat-chip">
                <span className="ex-stat-chip-lbl">آخر قراءة عداد</span>
                <span className="ex-stat-chip-val">{lastOdometer.toLocaleString()} كم</span>
              </div>
            )}
          </div>

          {/* Category breakdown */}
          {byCategory.length > 0 && (
            <div className="ex-breakdown">
              <div className="ex-section-title">
                <i className="fa-solid fa-chart-pie" style={{ color: "#c2410c", fontSize: 16 }} />
                توزيع المصاريف حسب النوع
              </div>
              <div className="ex-breakdown-grid">
                {byCategory.map((c) => (
                  <div key={c.value} className="ex-breakdown-card">
                    <div className="ex-breakdown-ico">
                      <i className={c.icon} />
                    </div>
                    <div>
                      <div className="ex-breakdown-label">{c.label}</div>
                      <div className="ex-breakdown-val">{formatDual(c.usd, c.syp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add form */}
          <div className="ex-add-card">
            <div className="ex-section-title">
              <i className="fa-solid fa-plus-circle" style={{ color: "#c2410c", fontSize: 16 }} />
              تسجيل مصروف جديد
            </div>
            <form onSubmit={handleAdd}>
              <div className="ex-category-toggle">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`ex-category-btn ${form.category === c.value ? "ex-category-btn--on" : ""}`}
                    onClick={() => setForm((p) => ({ ...p, category: c.value }))}
                  >
                    <i className={c.icon} />
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="ex-currency-toggle">
                <button
                  type="button"
                  className={`ex-currency-btn ${form.currency === "USD" ? "ex-currency-btn--on" : ""}`}
                  onClick={() => setForm((p) => ({ ...p, currency: "USD" }))}
                >
                  <i className="fa-solid fa-dollar-sign" />
                  دولار
                </button>
                <button
                  type="button"
                  className={`ex-currency-btn ${form.currency === "SYP" ? "ex-currency-btn--on" : ""}`}
                  onClick={() => setForm((p) => ({ ...p, currency: "SYP" }))}
                >
                  <i className="fa-solid fa-money-bill" />
                  ليرة سورية
                </button>
              </div>

              <div className="ex-add-grid">
                <div className="ex-field">
                  <label className="ex-lbl">
                    <i className="fa-solid fa-sack-dollar" />
                    المبلغ
                  </label>
                  <div className="ex-inp-wrap">
                    <input
                      className="ex-inp"
                      type="number"
                      min="1"
                      step="any"
                      placeholder="0"
                      value={form.amount}
                      onChange={setField("amount")}
                      required
                    />
                  </div>
                </div>
                <div className="ex-field">
                  <label className="ex-lbl">
                    <i className="fa-regular fa-calendar" />
                    التاريخ
                  </label>
                  <div className="ex-inp-wrap">
                    <input className="ex-inp" type="date" value={form.date} onChange={setField("date")} required />
                  </div>
                </div>
                <div className="ex-field">
                  <label className="ex-lbl">
                    <i className="fa-solid fa-gauge-high" />
                    قراءة العداد (كم)
                  </label>
                  <div className="ex-inp-wrap">
                    <input
                      className="ex-inp"
                      type="number"
                      min="0"
                      placeholder="اختياري"
                      value={form.odometer}
                      onChange={setField("odometer")}
                    />
                  </div>
                </div>
                <div className="ex-field ex-field--notes">
                  <label className="ex-lbl">
                    <i className="fa-regular fa-note-sticky" />
                    ملاحظات
                  </label>
                  <div className="ex-inp-wrap">
                    <input
                      className="ex-inp"
                      placeholder="اختياري..."
                      value={form.notes}
                      onChange={setField("notes")}
                    />
                  </div>
                </div>
                <div className="ex-field ex-field--submit">
                  <button type="submit" className="ex-add-btn" disabled={loading || !Number(form.amount)}>
                    {loading ? (
                      <>
                        <div className="ex-spinner" />
                        جاري...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-plus" />
                        تسجيل المصروف
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Filters */}
          {expenses.length > 0 && (
            <div className="ex-filters">
              <div className="ex-filter-select-wrap">
                <i className="fa-solid fa-tags ex-filter-ico" />
                <select
                  className="ex-filter-select"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">كل الأنواع</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ex-filter-select-wrap">
                <input
                  className="ex-filter-select"
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* List */}
          {expenses.length === 0 ? (
            <div className="ex-empty">
              <div className="ex-empty-ico">
                <i className="fa-solid fa-car-burst" style={{ fontSize: 34, color: "#fed7aa" }} />
              </div>
              <div className="ex-empty-title">لا توجد مصاريف مسجّلة بعد</div>
              <div className="ex-empty-sub">سجّل أول مصروف من الحقل أعلاه</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ex-empty">
              <div className="ex-empty-ico">
                <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 28, color: "#fed7aa" }} />
              </div>
              <div className="ex-empty-title">لا توجد نتائج</div>
              <div className="ex-empty-sub">جرب تغيير الفلتر</div>
            </div>
          ) : (
            <div className="ex-list">
              {filtered.map((x, i) => (
                <div key={x.id} className="ex-item" style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="ex-item-left">
                    <div className="ex-item-ico">
                      <i className={categoryOf(x.category).icon} style={{ fontSize: 16, color: "#c2410c" }} />
                    </div>
                    <div className="ex-item-info">
                      <div className="ex-item-name-row">
                        <span className="ex-item-name">{x.categoryLabel || categoryOf(x.category).label}</span>
                      </div>
                      <div className="ex-item-meta">
                        <span className="ex-item-amount">
                          <i className="fa-solid fa-sack-dollar" style={{ fontSize: 10 }} />
                          {formatMoney(x.amount, x.currency || "USD")}
                        </span>
                        <span>
                          <i className="fa-regular fa-calendar" style={{ fontSize: 10 }} />
                          {x.date}
                        </span>
                        {x.odometer != null && (
                          <span>
                            <i className="fa-solid fa-gauge-high" style={{ fontSize: 10 }} />
                            {Number(x.odometer).toLocaleString()} كم
                          </span>
                        )}
                      </div>
                      {x.notes && <div className="ex-item-notes">{x.notes}</div>}
                    </div>
                  </div>
                  <div className="ex-item-actions">
                    <button
                      className="ex-btn ex-btn--edit"
                      onClick={() => {
                        setEditId(x.id);
                        setEditData({
                          category: x.category,
                          currency: x.currency || "USD",
                          amount: x.amount,
                          odometer: x.odometer ?? "",
                          date: x.date,
                          notes: x.notes || "",
                        });
                      }}
                    >
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button
                      className="ex-btn ex-btn--del"
                      onClick={() => setDeleteTarget(x)}
                      disabled={deleting === x.id}
                    >
                      {deleting === x.id ? (
                        <div className="ex-spinner ex-spinner--red" />
                      ) : (
                        <i className="fa-solid fa-trash" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(editId)}
        onClose={() => setEditId(null)}
        icon="fa-solid fa-pen"
        title="تعديل المصروف"
        subtitle="عدّل بيانات المصروف"
      >
        <div className="ex-modal-form">
          <div className="ex-category-toggle">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`ex-category-btn ${editData.category === c.value ? "ex-category-btn--on" : ""}`}
                onClick={() => setEditData((d) => ({ ...d, category: c.value }))}
              >
                <i className={c.icon} />
                {c.label}
              </button>
            ))}
          </div>
          <div className="ex-currency-toggle">
            <button
              type="button"
              className={`ex-currency-btn ${editData.currency === "USD" ? "ex-currency-btn--on" : ""}`}
              onClick={() => setEditData((d) => ({ ...d, currency: "USD" }))}
            >
              <i className="fa-solid fa-dollar-sign" />
              دولار
            </button>
            <button
              type="button"
              className={`ex-currency-btn ${editData.currency === "SYP" ? "ex-currency-btn--on" : ""}`}
              onClick={() => setEditData((d) => ({ ...d, currency: "SYP" }))}
            >
              <i className="fa-solid fa-money-bill" />
              ليرة سورية
            </button>
          </div>
          <div className="ex-field">
            <label className="ex-lbl">
              <i className="fa-solid fa-sack-dollar" />
              المبلغ
            </label>
            <div className="ex-inp-wrap">
              <input
                className="ex-inp"
                type="number"
                min="1"
                step="any"
                value={editData.amount}
                onChange={(e) => setEditData((d) => ({ ...d, amount: e.target.value }))}
              />
            </div>
          </div>
          <div className="ex-field">
            <label className="ex-lbl">
              <i className="fa-regular fa-calendar" />
              التاريخ
            </label>
            <div className="ex-inp-wrap">
              <input
                className="ex-inp"
                type="date"
                value={editData.date}
                onChange={(e) => setEditData((d) => ({ ...d, date: e.target.value }))}
              />
            </div>
          </div>
          <div className="ex-field">
            <label className="ex-lbl">
              <i className="fa-solid fa-gauge-high" />
              قراءة العداد (كم)
            </label>
            <div className="ex-inp-wrap">
              <input
                className="ex-inp"
                type="number"
                min="0"
                placeholder="اختياري"
                value={editData.odometer}
                onChange={(e) => setEditData((d) => ({ ...d, odometer: e.target.value }))}
              />
            </div>
          </div>
          <div className="ex-field">
            <label className="ex-lbl">
              <i className="fa-regular fa-note-sticky" />
              ملاحظات
            </label>
            <div className="ex-inp-wrap">
              <input
                className="ex-inp"
                placeholder="اختياري..."
                value={editData.notes}
                onChange={(e) => setEditData((d) => ({ ...d, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="ex-modal-actions">
            <button
              type="button"
              className="ex-add-btn ex-modal-save"
              onClick={handleEdit}
              disabled={!editData.category || !Number(editData.amount)}
            >
              <i className="fa-solid fa-check" />
              حفظ التعديلات
            </button>
            <button type="button" className="ex-btn ex-btn--cancel" onClick={() => setEditId(null)}>
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="تأكيد حذف المصروف"
        message={`سيتم حذف مصروف "${deleteTarget?.categoryLabel || ""}" بقيمة ${deleteTarget ? formatMoney(deleteTarget.amount, deleteTarget.currency || "USD") : ""}.`}
        confirmLabel="حذف المصروف"
        loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
