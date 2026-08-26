import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import "./RepresentativesPage.css";

export default function RepresentativesPage() {
  const uid = auth.currentUser?.uid;
  const reps = useFirestoreCollection(uid && ["users", uid, "representatives"], {
    orderByField: "createdAt",
  });
  const companies = useFirestoreCollection(uid && ["users", uid, "companies"], {
    orderByField: "createdAt",
  });

  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ name: "", companyId: "" });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCo, setFilterCo] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || !companyId) return;
    setLoading(true);
    const co = companies.find((c) => c.id === companyId);
    await addDoc(collection(db, "users", uid, "representatives"), {
      name: n,
      companyId,
      companyName: co?.name || "",
      createdAt: Date.now(),
    });
    setName("");
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await deleteDoc(doc(db, "users", uid, "representatives", deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = async (id) => {
    const n = editData.name.trim();
    if (!n) return;
    const co = companies.find((c) => c.id === editData.companyId);
    await updateDoc(doc(db, "users", uid, "representatives", id), {
      name: n,
      companyId: editData.companyId,
      companyName: co?.name || "",
    });
    setEditId(null);
  };

  const filtered = reps
    .filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    .filter((r) => (filterCo ? r.companyId === filterCo : true));

  return (
    <>
      <div className="rp-root">
        {/* Header */}
        <div className="rp-header">
          <div className="rp-header-bg" />
          <div className="rp-header-body">
            <div className="rp-header-left">
              <div className="rp-header-ico">
                <i className="fa-solid fa-users" style={{ fontSize: 22, color: "#fff" }} />
              </div>
              <div>
                <h1 className="rp-header-title">المناديب</h1>
                <p className="rp-header-sub">إدارة قائمة المناديب وربطهم بالشركات</p>
              </div>
            </div>
            <div className="rp-header-badge">
              <i className="fa-solid fa-users" style={{ fontSize: 11 }} />
              {reps.length} مندوب
            </div>
          </div>
        </div>

        <div className="rp-body">
          {/* Add form */}
          <div className="rp-add-card">
            <div className="rp-add-title">
              <i className="fa-solid fa-user-plus" style={{ color: "#0891b2", fontSize: 16 }} />
              إضافة مندوب جديد
            </div>

            {companies.length === 0 ? (
              <div className="rp-no-companies">
                <i
                  className="fa-solid fa-triangle-exclamation"
                  style={{ color: "#f59e0b", fontSize: 14 }}
                />
                يجب إضافة شركة أولاً قبل إضافة مندوب
              </div>
            ) : (
              <form onSubmit={handleAdd} className="rp-add-form">
                <div className="rp-input-wrap">
                  <i className="fa-solid fa-user rp-input-ico" />
                  <input
                    className="rp-input"
                    type="text"
                    placeholder="اسم المندوب..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="rp-select-wrap">
                  <i className="fa-solid fa-building rp-select-ico" />
                  <select
                    className="rp-select"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    required
                  >
                    <option value="">اختر الشركة...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="rp-add-btn"
                  disabled={loading || !name.trim() || !companyId}
                >
                  {loading ? (
                    <>
                      <div className="rp-spinner" />
                      جاري...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-plus" />
                      إضافة
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Filters */}
          {reps.length > 0 && (
            <div className="rp-filters">
              <div className="rp-search-wrap">
                <i className="fa-solid fa-magnifying-glass rp-search-ico" />
                <input
                  className="rp-search"
                  placeholder="البحث..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="rp-clear" onClick={() => setSearch("")}>
                    <i className="fa-solid fa-xmark" />
                  </button>
                )}
              </div>
              <div className="rp-filter-select-wrap">
                <i className="fa-solid fa-building rp-filter-ico" />
                <select
                  className="rp-filter-select"
                  value={filterCo}
                  onChange={(e) => setFilterCo(e.target.value)}
                >
                  <option value="">كل الشركات</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* List */}
          {reps.length === 0 ? (
            <div className="rp-empty">
              <div className="rp-empty-ico">
                <i className="fa-solid fa-users" style={{ fontSize: 34, color: "#bae6fd" }} />
              </div>
              <div className="rp-empty-title">لا يوجد مناديب بعد</div>
              <div className="rp-empty-sub">أضف مندوبك الأول من الحقل أعلاه</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rp-empty">
              <div className="rp-empty-ico">
                <i
                  className="fa-solid fa-magnifying-glass"
                  style={{ fontSize: 28, color: "#bae6fd" }}
                />
              </div>
              <div className="rp-empty-title">لا توجد نتائج</div>
              <div className="rp-empty-sub">جرب تغيير فلتر البحث</div>
            </div>
          ) : (
            <div className="rp-list">
              {filtered.map((r, i) => (
                <div key={r.id} className="rp-item" style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="rp-item-left">
                    <div className="rp-item-ava">{r.name.charAt(0)}</div>
                    {editId === r.id ? (
                      <div className="rp-edit-fields">
                        <input
                          className="rp-edit-input"
                          value={editData.name}
                          onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                          placeholder="اسم المندوب"
                          autoFocus
                        />
                        <select
                          className="rp-edit-select"
                          value={editData.companyId}
                          onChange={(e) =>
                            setEditData((p) => ({ ...p, companyId: e.target.value }))
                          }
                        >
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="rp-item-info">
                        <div className="rp-item-name">{r.name}</div>
                        <div className="rp-item-co">
                          <i className="fa-solid fa-building" style={{ fontSize: 10 }} />
                          {r.companyName || "غير محدد"}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="rp-item-actions">
                    {editId === r.id ? (
                      <>
                        <button className="rp-btn rp-btn--save" onClick={() => handleEdit(r.id)}>
                          <i className="fa-solid fa-check" />
                          حفظ
                        </button>
                        <button className="rp-btn rp-btn--cancel" onClick={() => setEditId(null)}>
                          <i className="fa-solid fa-xmark" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="rp-btn rp-btn--edit"
                          onClick={() => {
                            setEditId(r.id);
                            setEditData({ name: r.name, companyId: r.companyId });
                          }}
                        >
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button
                          className="rp-btn rp-btn--del"
                          onClick={() => setDeleteTarget(r)}
                          disabled={deleting === r.id}
                        >
                          {deleting === r.id ? (
                            <div className="rp-spinner rp-spinner--red" />
                          ) : (
                            <i className="fa-solid fa-trash" />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="تأكيد حذف المندوب"
        message={`سيتم حذف "${deleteTarget?.name || ""}" من قائمة المناديب.`}
        confirmLabel="حذف المندوب"
        loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
