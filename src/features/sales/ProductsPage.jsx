import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import "./ProductsPage.css";

const emptyForm = { name: "", unit: "قطعة", price: "", lowStockThreshold: "", notes: "" };

export default function ProductsPage() {
  const uid = auth.currentUser?.uid;
  const navigate = useNavigate();
  const products = useFirestoreCollection(uid && ["users", uid, "salesProducts"], {
    orderByField: "createdAt",
  });
  const moves = useFirestoreCollection(uid && ["users", uid, "salesStockMoves"]);

  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");

  const setField = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const stockOf = (productId) =>
    moves
      .filter((m) => m.productId === productId)
      .reduce((total, m) => total + (m.type === "load" ? m.quantity : -m.quantity), 0);

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    setLoading(true);
    await addDoc(collection(db, "users", uid, "salesProducts"), {
      name,
      unit: form.unit.trim() || "قطعة",
      price: Number(form.price) || 0,
      lowStockThreshold: form.lowStockThreshold === "" ? null : Number(form.lowStockThreshold),
      notes: form.notes.trim(),
      createdAt: Date.now(),
    });
    setForm(emptyForm);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await deleteDoc(doc(db, "users", uid, "salesProducts", deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = async (id) => {
    const name = editData.name.trim();
    if (!name) return;
    await updateDoc(doc(db, "users", uid, "salesProducts", id), {
      name,
      unit: editData.unit.trim() || "قطعة",
      price: Number(editData.price) || 0,
      lowStockThreshold: editData.lowStockThreshold === "" ? null : Number(editData.lowStockThreshold),
      notes: editData.notes.trim(),
    });
    setEditId(null);
  };

  const goStock = (productId, type) =>
    navigate("/sales/products/stock", { state: { productId, type } });

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pd-root">
        {/* Header */}
        <div className="pd-header">
          <div className="pd-header-bg" />
          <div className="pd-header-body">
            <div className="pd-header-left">
              <div className="pd-header-ico">
                <i className="fa-solid fa-boxes-stacked" style={{ fontSize: 22, color: "#fff" }} />
              </div>
              <div>
                <h1 className="pd-header-title">المنتجات والمخزون</h1>
                <p className="pd-header-sub">كتالوج المنتجات ومتابعة الكمية المحمّلة على السيارة</p>
              </div>
            </div>
            <div className="pd-header-right">
              <button className="pd-header-link" onClick={() => navigate("/sales/products/stock")}>
                <i className="fa-solid fa-clock-rotate-left" />
                سجل الحركات
              </button>
              <div className="pd-header-badge">
                <i className="fa-solid fa-boxes-stacked" style={{ fontSize: 11 }} />
                {products.length} منتج
              </div>
            </div>
          </div>
        </div>

        <div className="pd-body">
          {/* Add form */}
          <div className="pd-add-card">
            <div className="pd-add-title">
              <i className="fa-solid fa-plus-circle" style={{ color: "#0f766e", fontSize: 16 }} />
              إضافة منتج جديد
            </div>
            <form onSubmit={handleAdd} className="pd-add-grid">
              <div className="pd-field">
                <label className="pd-lbl">
                  <i className="fa-solid fa-tag" />
                  اسم المنتج
                </label>
                <div className="pd-inp-wrap">
                  <input
                    className="pd-inp"
                    placeholder="اسم المنتج..."
                    value={form.name}
                    onChange={setField("name")}
                    required
                  />
                </div>
              </div>
              <div className="pd-field">
                <label className="pd-lbl">
                  <i className="fa-solid fa-ruler" />
                  الوحدة
                </label>
                <div className="pd-inp-wrap">
                  <input
                    className="pd-inp"
                    placeholder="قطعة / كرتون..."
                    value={form.unit}
                    onChange={setField("unit")}
                  />
                </div>
              </div>
              <div className="pd-field">
                <label className="pd-lbl">
                  <i className="fa-solid fa-sack-dollar" />
                  السعر
                </label>
                <div className="pd-inp-wrap">
                  <input
                    className="pd-inp"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.price}
                    onChange={setField("price")}
                  />
                </div>
              </div>
              <div className="pd-field">
                <label className="pd-lbl">
                  <i className="fa-solid fa-triangle-exclamation" />
                  حد التنبيه
                </label>
                <div className="pd-inp-wrap">
                  <input
                    className="pd-inp"
                    type="number"
                    min="0"
                    placeholder="اختياري"
                    value={form.lowStockThreshold}
                    onChange={setField("lowStockThreshold")}
                  />
                </div>
              </div>
              <div className="pd-field pd-field--submit">
                <label className="pd-lbl" style={{ opacity: 0 }}>
                  _
                </label>
                <button type="submit" className="pd-add-btn" disabled={loading || !form.name.trim()}>
                  {loading ? (
                    <>
                      <div className="pd-spinner" />
                      جاري...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-plus" />
                      إضافة
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Search */}
          {products.length > 0 && (
            <div className="pd-search-wrap">
              <i className="fa-solid fa-magnifying-glass pd-search-ico" />
              <input
                className="pd-search"
                placeholder="البحث في المنتجات..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="pd-search-clear" onClick={() => setSearch("")}>
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>
          )}

          {/* List */}
          {products.length === 0 ? (
            <div className="pd-empty">
              <div className="pd-empty-ico">
                <i className="fa-solid fa-boxes-stacked" style={{ fontSize: 36, color: "#5eead4" }} />
              </div>
              <div className="pd-empty-title">لا توجد منتجات بعد</div>
              <div className="pd-empty-sub">أضف منتجك الأول من الحقل أعلاه</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="pd-empty">
              <div className="pd-empty-ico">
                <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 30, color: "#5eead4" }} />
              </div>
              <div className="pd-empty-title">لا توجد نتائج</div>
              <div className="pd-empty-sub">جرب كلمة بحث مختلفة</div>
            </div>
          ) : (
            <div className="pd-list">
              {filtered.map((p, i) => {
                const stock = stockOf(p.id);
                const low = p.lowStockThreshold != null && stock <= p.lowStockThreshold;
                return (
                  <div key={p.id} className="pd-item" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="pd-item-left">
                      <div className="pd-item-ico">
                        <i className="fa-solid fa-box" style={{ fontSize: 16, color: "#0f766e" }} />
                      </div>
                      {editId === p.id ? (
                        <div className="pd-edit-grid">
                          <input
                            className="pd-edit-input"
                            value={editData.name}
                            onChange={(e) => setEditData((d) => ({ ...d, name: e.target.value }))}
                            placeholder="اسم المنتج"
                            autoFocus
                          />
                          <input
                            className="pd-edit-input"
                            value={editData.unit}
                            onChange={(e) => setEditData((d) => ({ ...d, unit: e.target.value }))}
                            placeholder="الوحدة"
                          />
                          <input
                            className="pd-edit-input"
                            type="number"
                            value={editData.price}
                            onChange={(e) => setEditData((d) => ({ ...d, price: e.target.value }))}
                            placeholder="السعر"
                          />
                          <input
                            className="pd-edit-input"
                            type="number"
                            value={editData.lowStockThreshold}
                            onChange={(e) =>
                              setEditData((d) => ({ ...d, lowStockThreshold: e.target.value }))
                            }
                            placeholder="حد التنبيه"
                          />
                          <input
                            className="pd-edit-input pd-edit-full"
                            value={editData.notes}
                            onChange={(e) => setEditData((d) => ({ ...d, notes: e.target.value }))}
                            placeholder="ملاحظات"
                          />
                        </div>
                      ) : (
                        <div className="pd-item-info">
                          <div className="pd-item-name-row">
                            <span className="pd-item-name">{p.name}</span>
                            <span className={`pd-stock-badge ${low ? "pd-stock-badge--low" : ""}`}>
                              <i
                                className={`fa-solid fa-${low ? "triangle-exclamation" : "cube"}`}
                                style={{ fontSize: 9 }}
                              />
                              {stock} {p.unit}
                            </span>
                          </div>
                          <div className="pd-item-meta">
                            <span className="pd-item-price">
                              <i className="fa-solid fa-sack-dollar" style={{ fontSize: 10 }} />
                              {p.price.toLocaleString()} / {p.unit}
                            </span>
                          </div>
                          {p.notes && <div className="pd-item-notes">{p.notes}</div>}
                        </div>
                      )}
                    </div>
                    <div className="pd-item-actions">
                      {editId === p.id ? (
                        <>
                          <button className="pd-btn pd-btn--save" onClick={() => handleEdit(p.id)}>
                            <i className="fa-solid fa-check" />
                            حفظ
                          </button>
                          <button className="pd-btn pd-btn--cancel" onClick={() => setEditId(null)}>
                            <i className="fa-solid fa-xmark" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button className="pd-btn pd-btn--load" onClick={() => goStock(p.id, "load")}>
                            <i className="fa-solid fa-arrow-down" />
                            تحميل
                          </button>
                          <button
                            className="pd-btn pd-btn--return"
                            onClick={() => goStock(p.id, "return")}
                          >
                            <i className="fa-solid fa-arrow-up" />
                            إرجاع
                          </button>
                          <button
                            className="pd-btn pd-btn--edit"
                            onClick={() => {
                              setEditId(p.id);
                              setEditData({
                                name: p.name,
                                unit: p.unit || "قطعة",
                                price: p.price ?? "",
                                lowStockThreshold: p.lowStockThreshold ?? "",
                                notes: p.notes || "",
                              });
                            }}
                          >
                            <i className="fa-solid fa-pen" />
                          </button>
                          <button
                            className="pd-btn pd-btn--del"
                            onClick={() => setDeleteTarget(p)}
                            disabled={deleting === p.id}
                          >
                            {deleting === p.id ? (
                              <div className="pd-spinner pd-spinner--red" />
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
        title="تأكيد حذف المنتج"
        message={`سيتم حذف "${deleteTarget?.name || ""}" من قائمة المنتجات. سجل حركات المخزون الخاصة به سيبقى دون تغيير.`}
        confirmLabel="حذف المنتج"
        loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
