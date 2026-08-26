import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import Modal from "../../components/Modal";
import "./StockPage.css";

const TYPE_META = {
  load: { label: "تحميل", icon: "fa-solid fa-arrow-down", color: "#059669", bg: "#f0fdf4" },
  return: { label: "إرجاع", icon: "fa-solid fa-arrow-up", color: "#c2410c", bg: "#fff7ed" },
  // Created automatically by the Orders page when a sale is logged — not enterable here,
  // but still shown in this log for a complete, honest audit trail of the stock.
  sale: { label: "بيع", icon: "fa-solid fa-cart-shopping", color: "#4338ca", bg: "#eef2ff" },
};

const today = () => new Date().toISOString().split("T")[0];
const emptyForm = { productId: "", type: "load", quantity: "", date: today(), notes: "" };

export default function StockPage() {
  const uid = auth.currentUser?.uid;
  const navigate = useNavigate();
  const location = useLocation();
  const moves = useFirestoreCollection(uid && ["users", uid, "salesStockMoves"], {
    orderByField: "createdAt",
  });
  const products = useFirestoreCollection(uid && ["users", uid, "salesProducts"], {
    orderByField: "createdAt",
  });

  const [form, setForm] = useState(() => ({
    ...emptyForm,
    productId: location.state?.productId || "",
    type: location.state?.type || "load",
  }));
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterProduct, setFilterProduct] = useState("");
  const [filterType, setFilterType] = useState("");

  const setField = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.productId || !Number(form.quantity)) return;
    setLoading(true);
    const product = products.find((p) => p.id === form.productId);
    await addDoc(collection(db, "users", uid, "salesStockMoves"), {
      productId: form.productId,
      productName: product?.name || "",
      unit: product?.unit || "",
      type: form.type,
      quantity: Number(form.quantity),
      date: form.date,
      notes: form.notes.trim(),
      createdAt: Date.now(),
    });
    setForm({ ...emptyForm, productId: form.productId, type: form.type });
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await deleteDoc(doc(db, "users", uid, "salesStockMoves", deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = async (id) => {
    if (!editData.productId || !Number(editData.quantity)) return;
    const product = products.find((p) => p.id === editData.productId);
    await updateDoc(doc(db, "users", uid, "salesStockMoves", id), {
      productId: editData.productId,
      productName: product?.name || "",
      unit: product?.unit || "",
      type: editData.type,
      quantity: Number(editData.quantity),
      date: editData.date,
      notes: editData.notes.trim(),
    });
    setEditId(null);
  };

  const filtered = moves
    .filter((m) => (filterProduct ? m.productId === filterProduct : true))
    .filter((m) => (filterType ? m.type === filterType : true));

  return (
    <>
      <div className="st-root">
        {/* Header */}
        <div className="st-header">
          <div className="st-header-bg" />
          <div className="st-header-body">
            <div className="st-header-left">
              <button className="st-back-btn" onClick={() => navigate("/sales/products")}>
                <i className="fa-solid fa-arrow-right" />
                المنتجات
              </button>
              <div>
                <h1 className="st-header-title">سجل حركة المخزون</h1>
                <p className="st-header-sub">تحميل وإرجاع البضاعة من وإلى السيارة</p>
              </div>
            </div>
          </div>
        </div>

        <div className="st-body">
          {/* Add form */}
          <div className="st-add-card">
            <div className="st-add-title">
              <i className="fa-solid fa-plus-circle" style={{ color: "#0f766e", fontSize: 16 }} />
              تسجيل حركة جديدة
            </div>

            {products.length === 0 ? (
              <div className="st-no-products">
                <i
                  className="fa-solid fa-triangle-exclamation"
                  style={{ color: "#f59e0b", fontSize: 14 }}
                />
                يجب إضافة منتج أولاً قبل تسجيل حركة مخزون
              </div>
            ) : (
              <form onSubmit={handleAdd}>
                <div className="st-type-toggle">
                  <button
                    type="button"
                    className={`st-type-btn st-type-btn--load ${form.type === "load" ? "st-type-btn--on" : ""}`}
                    onClick={() => setForm((p) => ({ ...p, type: "load" }))}
                  >
                    <i className="fa-solid fa-arrow-down" />
                    تحميل على السيارة
                  </button>
                  <button
                    type="button"
                    className={`st-type-btn st-type-btn--return ${form.type === "return" ? "st-type-btn--on" : ""}`}
                    onClick={() => setForm((p) => ({ ...p, type: "return" }))}
                  >
                    <i className="fa-solid fa-arrow-up" />
                    إرجاع للمستودع
                  </button>
                </div>
                <div className="st-add-grid">
                  <div className="st-field">
                    <label className="st-lbl">
                      <i className="fa-solid fa-box" />
                      المنتج
                    </label>
                    <div className="st-inp-wrap">
                      <select
                        className="st-inp"
                        value={form.productId}
                        onChange={setField("productId")}
                        required
                      >
                        <option value="">اختر المنتج...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="st-field">
                    <label className="st-lbl">
                      <i className="fa-solid fa-hashtag" />
                      الكمية
                    </label>
                    <div className="st-inp-wrap">
                      <input
                        className="st-inp"
                        type="number"
                        min="1"
                        placeholder="0"
                        value={form.quantity}
                        onChange={setField("quantity")}
                        required
                      />
                    </div>
                  </div>
                  <div className="st-field">
                    <label className="st-lbl">
                      <i className="fa-regular fa-calendar" />
                      التاريخ
                    </label>
                    <div className="st-inp-wrap">
                      <input
                        className="st-inp"
                        type="date"
                        value={form.date}
                        onChange={setField("date")}
                        required
                      />
                    </div>
                  </div>
                  <div className="st-field st-field--notes">
                    <label className="st-lbl">
                      <i className="fa-regular fa-note-sticky" />
                      ملاحظات
                    </label>
                    <div className="st-inp-wrap">
                      <input
                        className="st-inp"
                        placeholder="سبب الحركة... (اختياري)"
                        value={form.notes}
                        onChange={setField("notes")}
                      />
                    </div>
                  </div>
                  <div className="st-field st-field--submit">
                    <label className="st-lbl" style={{ opacity: 0 }}>
                      _
                    </label>
                    <button
                      type="submit"
                      className="st-add-btn"
                      disabled={loading || !form.productId || !Number(form.quantity)}
                    >
                      {loading ? (
                        <>
                          <div className="st-spinner" />
                          جاري...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-plus" />
                          تسجيل
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Filters */}
          {moves.length > 0 && (
            <div className="st-filters">
              <div className="st-filter-select-wrap">
                <i className="fa-solid fa-box st-filter-ico" />
                <select
                  className="st-filter-select"
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                >
                  <option value="">كل المنتجات</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="st-filter-select-wrap">
                <i className="fa-solid fa-arrow-right-arrow-left st-filter-ico" />
                <select
                  className="st-filter-select"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">كل الحركات</option>
                  <option value="load">تحميل</option>
                  <option value="return">إرجاع</option>
                </select>
              </div>
            </div>
          )}

          {/* List */}
          {moves.length === 0 ? (
            <div className="st-empty">
              <div className="st-empty-ico">
                <i
                  className="fa-solid fa-clock-rotate-left"
                  style={{ fontSize: 34, color: "#5eead4" }}
                />
              </div>
              <div className="st-empty-title">لا توجد حركات مخزون بعد</div>
              <div className="st-empty-sub">سجّل أول حركة تحميل من الحقل أعلاه</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="st-empty">
              <div className="st-empty-ico">
                <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 28, color: "#5eead4" }} />
              </div>
              <div className="st-empty-title">لا توجد نتائج</div>
              <div className="st-empty-sub">جرب تغيير الفلتر</div>
            </div>
          ) : (
            <div className="st-list">
              {filtered.map((m, i) => {
                const meta = TYPE_META[m.type] || TYPE_META.load;
                return (
                  <div
                    key={m.id}
                    className="st-item"
                    style={{
                      animationDelay: `${i * 0.04}s`,
                      "--st-accent": meta.color,
                      "--st-accent-bg": meta.bg,
                    }}
                  >
                    <div className="st-item-left">
                      <div className="st-item-ico">
                        <i className={meta.icon} style={{ fontSize: 16, color: meta.color }} />
                      </div>
                      <div className="st-item-info">
                        <div className="st-item-name-row">
                          <span className="st-item-name">{m.productName}</span>
                          <span className="st-type-tag" style={{ background: meta.bg, color: meta.color }}>
                            <i className={meta.icon} style={{ fontSize: 9 }} />
                            {meta.label}
                          </span>
                        </div>
                        <div className="st-item-meta">
                          <span>
                            <i className="fa-solid fa-hashtag" style={{ fontSize: 10 }} />
                            {m.quantity} {m.unit}
                          </span>
                          <span>
                            <i className="fa-regular fa-calendar" style={{ fontSize: 10 }} />
                            {m.date}
                          </span>
                        </div>
                        {m.notes && <div className="st-item-notes">{m.notes}</div>}
                      </div>
                    </div>
                    <div className="st-item-actions">
                      {m.type === "sale" ? (
                        <span className="st-item-notes">
                          <i className="fa-solid fa-lock" style={{ fontSize: 10 }} /> من عملية بيع —
                          عدّلها من صفحة المبيعات
                        </span>
                      ) : (
                        <>
                          <button
                            className="st-btn st-btn--edit"
                            onClick={() => {
                              setEditId(m.id);
                              setEditData({
                                productId: m.productId,
                                type: m.type,
                                quantity: m.quantity,
                                date: m.date,
                                notes: m.notes || "",
                              });
                            }}
                          >
                            <i className="fa-solid fa-pen" />
                          </button>
                          <button
                            className="st-btn st-btn--del"
                            onClick={() => setDeleteTarget(m)}
                            disabled={deleting === m.id}
                          >
                            {deleting === m.id ? (
                              <div className="st-spinner st-spinner--red" />
                            ) : (
                              <i className="fa-solid fa-trash" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="تأكيد حذف الحركة"
        message={`سيتم حذف حركة "${deleteTarget?.productName || ""}" بتاريخ ${deleteTarget?.date || ""}.`}
        confirmLabel="حذف الحركة"
        loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
      <Modal
        open={Boolean(editId)}
        onClose={() => setEditId(null)}
        icon="fa-solid fa-clock-rotate-left"
        title="تعديل حركة المخزون"
        subtitle={editId ? moves.find((m) => m.id === editId)?.productName : ""}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEdit(editId);
          }}
        >
          <div className="st-type-toggle" style={{ marginBottom: 16 }}>
            <button
              type="button"
              className={`st-type-btn st-type-btn--load ${editData.type === "load" ? "st-type-btn--on" : ""}`}
              onClick={() => setEditData((p) => ({ ...p, type: "load" }))}
            >
              <i className="fa-solid fa-arrow-down" />
              تحميل على السيارة
            </button>
            <button
              type="button"
              className={`st-type-btn st-type-btn--return ${editData.type === "return" ? "st-type-btn--on" : ""}`}
              onClick={() => setEditData((p) => ({ ...p, type: "return" }))}
            >
              <i className="fa-solid fa-arrow-up" />
              إرجاع للمستودع
            </button>
          </div>
          <div className="st-add-grid">
            <div className="st-field">
              <label className="st-lbl">
                <i className="fa-solid fa-box" />
                المنتج
              </label>
              <div className="st-inp-wrap">
                <select
                  className="st-inp"
                  value={editData.productId}
                  onChange={(e) => setEditData((p) => ({ ...p, productId: e.target.value }))}
                  required
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="st-field">
              <label className="st-lbl">
                <i className="fa-solid fa-hashtag" />
                الكمية
              </label>
              <div className="st-inp-wrap">
                <input
                  className="st-inp"
                  type="number"
                  min="1"
                  value={editData.quantity}
                  onChange={(e) => setEditData((p) => ({ ...p, quantity: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="st-field">
              <label className="st-lbl">
                <i className="fa-regular fa-calendar" />
                التاريخ
              </label>
              <div className="st-inp-wrap">
                <input
                  className="st-inp"
                  type="date"
                  value={editData.date}
                  onChange={(e) => setEditData((p) => ({ ...p, date: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="st-field st-field--notes">
              <label className="st-lbl">
                <i className="fa-regular fa-note-sticky" />
                ملاحظات
              </label>
              <div className="st-inp-wrap">
                <input
                  className="st-inp"
                  value={editData.notes}
                  onChange={(e) => setEditData((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="اختياري"
                />
              </div>
            </div>
            <div className="st-field st-field--actions">
              <button
                type="submit"
                className="st-btn st-btn--save st-modal-save"
                disabled={!editData.productId || !Number(editData.quantity)}
              >
                <i className="fa-solid fa-check" />
                حفظ التغييرات
              </button>
              <button type="button" className="st-btn st-btn--cancel" onClick={() => setEditId(null)}>
                إلغاء
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
