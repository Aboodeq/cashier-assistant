import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import Modal from "../../components/Modal";
import { formatDual } from "./currency";
import "./ClientsPage.css";

const CATEGORIES = [
  { value: "new", label: "جديد", cls: "cl-cat--new" },
  { value: "regular", label: "دائم", cls: "cl-cat--regular" },
  { value: "vip", label: "مميز", cls: "cl-cat--vip" },
  { value: "inactive", label: "غير نشط", cls: "cl-cat--inactive" },
];
const categoryMeta = (value) => CATEGORIES.find((c) => c.value === value) || CATEGORIES[0];

const emptyForm = { name: "", phone: "", address: "", territoryId: "", category: "new", notes: "" };

export default function ClientsPage() {
  const uid = auth.currentUser?.uid;
  const navigate = useNavigate();
  const clients = useFirestoreCollection(uid && ["users", uid, "salesClients"], {
    orderByField: "createdAt",
  });
  const territories = useFirestoreCollection(uid && ["users", uid, "salesTerritories"], {
    orderByField: "createdAt",
  });
  const visits = useFirestoreCollection(uid && ["users", uid, "salesVisits"]);
  const orders = useFirestoreCollection(uid && ["users", uid, "salesOrders"]);
  const payments = useFirestoreCollection(uid && ["users", uid, "salesPayments"]);

  const lastVisitDate = (clientId) =>
    visits
      .filter((v) => v.clientId === clientId)
      .reduce((latest, v) => (!latest || v.date > latest ? v.date : latest), null);

  // Balances are tracked per currency — a client can owe both USD and SYP at
  // once, never blended into one converted figure.
  const balanceIn = (clientId, currency) => {
    const owed = orders
      .filter((o) => o.clientId === clientId && o.paymentType === "credit")
      .reduce((s, o) => s + (currency === "USD" ? o.totalUSD || 0 : o.totalSYP || 0), 0);
    const paid = payments
      .filter((p) => p.clientId === clientId && p.currency === currency)
      .reduce((s, p) => s + p.amount, 0);
    return owed - paid;
  };
  const hasBalance = (clientId) => balanceIn(clientId, "USD") > 0 || balanceIn(clientId, "SYP") > 0;

  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [filterTerritory, setFilterTerritory] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const setField = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name || !form.territoryId) return;
    setLoading(true);
    const territory = territories.find((t) => t.id === form.territoryId);
    await addDoc(collection(db, "users", uid, "salesClients"), {
      name,
      phone: form.phone.trim(),
      address: form.address.trim(),
      territoryId: form.territoryId,
      territoryName: territory?.name || "",
      category: form.category,
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
      await deleteDoc(doc(db, "users", uid, "salesClients", deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = async (id) => {
    const name = editData.name.trim();
    if (!name) return;
    const territory = territories.find((t) => t.id === editData.territoryId);
    await updateDoc(doc(db, "users", uid, "salesClients", id), {
      name,
      phone: editData.phone.trim(),
      address: editData.address.trim(),
      territoryId: editData.territoryId,
      territoryName: territory?.name || "",
      category: editData.category,
      notes: editData.notes.trim(),
    });
    setEditId(null);
  };

  const filtered = clients
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => (filterTerritory ? c.territoryId === filterTerritory : true))
    .filter((c) => (filterCategory ? c.category === filterCategory : true));

  return (
    <>
      <div className="cl-root">
        {/* Header */}
        <div className="cl-header">
          <div className="cl-header-bg" />
          <div className="cl-header-body">
            <div className="cl-header-left">
              <div className="cl-header-ico">
                <i className="fa-solid fa-address-book" style={{ fontSize: 22, color: "#fff" }} />
              </div>
              <div>
                <h1 className="cl-header-title">العملاء</h1>
                <p className="cl-header-sub">إدارة قائمة العملاء وربطهم بالمناطق</p>
              </div>
            </div>
            <div className="cl-header-right">
              <button className="cl-header-link" onClick={() => navigate("/sales/clients/payments")}>
                <i className="fa-solid fa-hand-holding-dollar" />
                التحصيلات
              </button>
              <div className="cl-header-badge">
                <i className="fa-solid fa-address-book" style={{ fontSize: 11 }} />
                {clients.length} عميل
              </div>
            </div>
          </div>
        </div>

        <div className="cl-body">
          {/* Add form */}
          <div className="cl-add-card">
            <div className="cl-add-title">
              <i className="fa-solid fa-user-plus" style={{ color: "#7c3aed", fontSize: 16 }} />
              إضافة عميل جديد
            </div>

            {territories.length === 0 ? (
              <div className="cl-no-territories">
                <i
                  className="fa-solid fa-triangle-exclamation"
                  style={{ color: "#f59e0b", fontSize: 14 }}
                />
                يجب إضافة منطقة أولاً قبل إضافة عميل
              </div>
            ) : (
              <form onSubmit={handleAdd} className="cl-add-grid">
                <div className="cl-field">
                  <label className="cl-lbl">
                    <i className="fa-solid fa-user" />
                    اسم العميل
                  </label>
                  <div className="cl-inp-wrap">
                    <i className="fa-solid fa-user cl-ico" />
                    <input
                      className="cl-inp"
                      placeholder="اسم العميل / المحل..."
                      value={form.name}
                      onChange={setField("name")}
                      required
                    />
                  </div>
                </div>
                <div className="cl-field">
                  <label className="cl-lbl">
                    <i className="fa-solid fa-phone" />
                    الهاتف
                  </label>
                  <div className="cl-inp-wrap">
                    <i className="fa-solid fa-phone cl-ico" />
                    <input
                      className="cl-inp"
                      type="tel"
                      placeholder="رقم الهاتف..."
                      value={form.phone}
                      onChange={setField("phone")}
                    />
                  </div>
                </div>
                <div className="cl-field">
                  <label className="cl-lbl">
                    <i className="fa-solid fa-map-location-dot" />
                    المنطقة
                  </label>
                  <div className="cl-inp-wrap">
                    <i className="fa-solid fa-map-location-dot cl-ico" />
                    <select
                      className="cl-inp"
                      value={form.territoryId}
                      onChange={setField("territoryId")}
                      required
                    >
                      <option value="">اختر المنطقة...</option>
                      {territories.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="cl-field">
                  <label className="cl-lbl">
                    <i className="fa-solid fa-star" />
                    التصنيف
                  </label>
                  <div className="cl-inp-wrap">
                    <i className="fa-solid fa-star cl-ico" />
                    <select className="cl-inp" value={form.category} onChange={setField("category")}>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="cl-field cl-field--address">
                  <label className="cl-lbl">
                    <i className="fa-solid fa-location-dot" />
                    العنوان
                  </label>
                  <div className="cl-inp-wrap">
                    <i className="fa-solid fa-location-dot cl-ico" />
                    <input
                      className="cl-inp"
                      placeholder="العنوان التفصيلي... (اختياري)"
                      value={form.address}
                      onChange={setField("address")}
                    />
                  </div>
                </div>
                <div className="cl-field cl-field--notes">
                  <label className="cl-lbl">
                    <i className="fa-regular fa-note-sticky" />
                    ملاحظات
                  </label>
                  <div className="cl-inp-wrap">
                    <i className="fa-regular fa-note-sticky cl-ico" />
                    <input
                      className="cl-inp"
                      placeholder="ملاحظات... (اختياري)"
                      value={form.notes}
                      onChange={setField("notes")}
                    />
                  </div>
                </div>
                <div className="cl-field cl-field--submit">
                  <label className="cl-lbl" style={{ opacity: 0 }}>
                    _
                  </label>
                  <button
                    type="submit"
                    className="cl-add-btn"
                    disabled={loading || !form.name.trim() || !form.territoryId}
                  >
                    {loading ? (
                      <>
                        <div className="cl-spinner" />
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
            )}
          </div>

          {/* Filters */}
          {clients.length > 0 && (
            <div className="cl-filters">
              <div className="cl-search-wrap">
                <i className="fa-solid fa-magnifying-glass cl-search-ico" />
                <input
                  className="cl-search"
                  placeholder="البحث..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="cl-clear" onClick={() => setSearch("")}>
                    <i className="fa-solid fa-xmark" />
                  </button>
                )}
              </div>
              <div className="cl-filter-select-wrap">
                <i className="fa-solid fa-map-location-dot cl-filter-ico" />
                <select
                  className="cl-filter-select"
                  value={filterTerritory}
                  onChange={(e) => setFilterTerritory(e.target.value)}
                >
                  <option value="">كل المناطق</option>
                  {territories.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="cl-filter-select-wrap">
                <i className="fa-solid fa-star cl-filter-ico" />
                <select
                  className="cl-filter-select"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">كل التصنيفات</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* List */}
          {clients.length === 0 ? (
            <div className="cl-empty">
              <div className="cl-empty-ico">
                <i className="fa-solid fa-address-book" style={{ fontSize: 34, color: "#ddd6fe" }} />
              </div>
              <div className="cl-empty-title">لا يوجد عملاء بعد</div>
              <div className="cl-empty-sub">أضف عميلك الأول من الحقل أعلاه</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="cl-empty">
              <div className="cl-empty-ico">
                <i
                  className="fa-solid fa-magnifying-glass"
                  style={{ fontSize: 28, color: "#ddd6fe" }}
                />
              </div>
              <div className="cl-empty-title">لا توجد نتائج</div>
              <div className="cl-empty-sub">جرب تغيير فلتر البحث</div>
            </div>
          ) : (
            <div className="cl-list">
              {filtered.map((c, i) => {
                const cat = categoryMeta(c.category);
                return (
                  <div key={c.id} className="cl-item" style={{ animationDelay: `${i * 0.04}s` }}>
                    <div className="cl-item-left">
                      <div className="cl-item-ava">{c.name.charAt(0)}</div>
                      <div className="cl-item-info">
                        <div className="cl-item-name-row">
                          <span className="cl-item-name">{c.name}</span>
                          <span className={`cl-cat ${cat.cls}`}>{cat.label}</span>
                          {hasBalance(c.id) && (
                            <span className="cl-cat cl-cat--debt">
                              <i className="fa-solid fa-scale-balanced" style={{ fontSize: 9 }} />
                              مستحق: {formatDual(balanceIn(c.id, "USD"), balanceIn(c.id, "SYP"))}
                            </span>
                          )}
                        </div>
                        <div className="cl-item-meta">
                          <span className="cl-item-territory">
                            <i className="fa-solid fa-map-location-dot" style={{ fontSize: 10 }} />
                            {c.territoryName || "غير محدد"}
                          </span>
                          {c.phone && (
                            <span>
                              <i className="fa-solid fa-phone" style={{ fontSize: 10 }} />
                              {c.phone}
                            </span>
                          )}
                          {c.address && (
                            <span>
                              <i className="fa-solid fa-location-dot" style={{ fontSize: 10 }} />
                              {c.address}
                            </span>
                          )}
                          <span>
                            <i className="fa-solid fa-route" style={{ fontSize: 10 }} />
                            {lastVisitDate(c.id) ? `آخر زيارة: ${lastVisitDate(c.id)}` : "لا توجد زيارات بعد"}
                          </span>
                        </div>
                        {c.notes && <div className="cl-item-notes">{c.notes}</div>}
                      </div>
                    </div>
                    <div className="cl-item-actions">
                      <button
                        className="cl-btn cl-btn--sell"
                        onClick={() => navigate("/sales/orders", { state: { clientId: c.id } })}
                      >
                        <i className="fa-solid fa-cart-shopping" />
                        بيع
                      </button>
                      {hasBalance(c.id) && (
                        <button
                          className="cl-btn cl-btn--collect"
                          onClick={() =>
                            navigate("/sales/clients/payments", { state: { clientId: c.id } })
                          }
                        >
                          <i className="fa-solid fa-hand-holding-dollar" />
                          تحصيل
                        </button>
                      )}
                      <button
                        className="cl-btn cl-btn--visit"
                        onClick={() => navigate("/sales/visits", { state: { clientId: c.id } })}
                      >
                        <i className="fa-solid fa-route" />
                        زيارة
                      </button>
                      <button
                        className="cl-btn cl-btn--edit"
                        onClick={() => {
                          setEditId(c.id);
                          setEditData({
                            name: c.name,
                            phone: c.phone || "",
                            address: c.address || "",
                            territoryId: c.territoryId || "",
                            category: c.category || "new",
                            notes: c.notes || "",
                          });
                        }}
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button
                        className="cl-btn cl-btn--del"
                        onClick={() => setDeleteTarget(c)}
                        disabled={deleting === c.id}
                      >
                        {deleting === c.id ? (
                          <div className="cl-spinner cl-spinner--red" />
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
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="تأكيد حذف العميل"
        message={`سيتم حذف "${deleteTarget?.name || ""}" من قائمة العملاء.`}
        confirmLabel="حذف العميل"
        loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
      <Modal
        open={Boolean(editId)}
        onClose={() => setEditId(null)}
        icon="fa-solid fa-address-book"
        title="تعديل العميل"
        subtitle={editId ? clients.find((c) => c.id === editId)?.name : ""}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEdit(editId);
          }}
          className="cl-add-grid"
        >
          <div className="cl-field">
            <label className="cl-lbl">
              <i className="fa-solid fa-user" />
              اسم العميل
            </label>
            <div className="cl-inp-wrap">
              <i className="fa-solid fa-user cl-ico" />
              <input
                className="cl-inp"
                value={editData.name}
                onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                required
                autoFocus
              />
            </div>
          </div>
          <div className="cl-field">
            <label className="cl-lbl">
              <i className="fa-solid fa-phone" />
              الهاتف
            </label>
            <div className="cl-inp-wrap">
              <i className="fa-solid fa-phone cl-ico" />
              <input
                className="cl-inp"
                type="tel"
                value={editData.phone}
                onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
          </div>
          <div className="cl-field">
            <label className="cl-lbl">
              <i className="fa-solid fa-map-location-dot" />
              المنطقة
            </label>
            <div className="cl-inp-wrap">
              <i className="fa-solid fa-map-location-dot cl-ico" />
              <select
                className="cl-inp"
                value={editData.territoryId}
                onChange={(e) => setEditData((p) => ({ ...p, territoryId: e.target.value }))}
                required
              >
                {territories.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="cl-field">
            <label className="cl-lbl">
              <i className="fa-solid fa-star" />
              التصنيف
            </label>
            <div className="cl-inp-wrap">
              <i className="fa-solid fa-star cl-ico" />
              <select
                className="cl-inp"
                value={editData.category}
                onChange={(e) => setEditData((p) => ({ ...p, category: e.target.value }))}
              >
                {CATEGORIES.map((cc) => (
                  <option key={cc.value} value={cc.value}>
                    {cc.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="cl-field cl-field--address">
            <label className="cl-lbl">
              <i className="fa-solid fa-location-dot" />
              العنوان
            </label>
            <div className="cl-inp-wrap">
              <i className="fa-solid fa-location-dot cl-ico" />
              <input
                className="cl-inp"
                value={editData.address}
                onChange={(e) => setEditData((p) => ({ ...p, address: e.target.value }))}
                placeholder="اختياري"
              />
            </div>
          </div>
          <div className="cl-field cl-field--notes">
            <label className="cl-lbl">
              <i className="fa-regular fa-note-sticky" />
              ملاحظات
            </label>
            <div className="cl-inp-wrap">
              <i className="fa-regular fa-note-sticky cl-ico" />
              <input
                className="cl-inp"
                value={editData.notes}
                onChange={(e) => setEditData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="اختياري"
              />
            </div>
          </div>
          <div className="cl-field cl-field--submit cl-modal-actions">
            <button type="submit" className="cl-btn cl-btn--save cl-modal-save">
              <i className="fa-solid fa-check" />
              حفظ التغييرات
            </button>
            <button type="button" className="cl-btn cl-btn--cancel" onClick={() => setEditId(null)}>
              إلغاء
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
