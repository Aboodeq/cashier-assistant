import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import "./CompaniesPage.css";

export default function CompaniesPage() {
  const uid = auth.currentUser?.uid;
  const companies = useFirestoreCollection(uid && ["users", uid, "companies"], {
    orderByField: "createdAt",
  });

  const [name, setName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");

  const handleAdd = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setLoading(true);
    await addDoc(collection(db, "users", uid, "companies"), {
      name: n,
      createdAt: Date.now(),
    });
    setName("");
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await deleteDoc(doc(db, "users", uid, "companies", deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = async (id) => {
    const n = editName.trim();
    if (!n) return;
    await updateDoc(doc(db, "users", uid, "companies", id), { name: n });
    setEditId(null);
    setEditName("");
  };

  const filtered = companies.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="cp-root">
        {/* ── Header ── */}
        <div className="cp-header">
          <div className="cp-header-bg" />
          <div className="cp-header-body">
            <div className="cp-header-left">
              <div className="cp-header-ico">
                <i className="fa-solid fa-building" style={{ fontSize: 22, color: "#fff" }} />
              </div>
              <div>
                <h1 className="cp-header-title">الشركات</h1>
                <p className="cp-header-sub">إدارة الشركات المرتبطة بحسابك</p>
              </div>
            </div>
            <div className="cp-header-badge">
              <i className="fa-solid fa-building" style={{ fontSize: 11 }} />
              {companies.length} شركة
            </div>
          </div>
        </div>

        <div className="cp-body">
          {/* ── Add Form ── */}
          <div className="cp-add-card">
            <div className="cp-add-card-title">
              <i className="fa-solid fa-plus-circle" style={{ color: "#4f46e5", fontSize: 16 }} />
              إضافة شركة جديدة
            </div>
            <form onSubmit={handleAdd} className="cp-add-form">
              <div className="cp-input-wrap">
                <i className="fa-solid fa-building cp-input-ico" />
                <input
                  className="cp-input"
                  type="text"
                  placeholder="اسم الشركة..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="cp-add-btn" disabled={loading || !name.trim()}>
                {loading ? (
                  <>
                    <div className="cp-spinner" />
                    جاري الإضافة...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-plus" />
                    إضافة
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ── Search ── */}
          {companies.length > 0 && (
            <div className="cp-search-wrap">
              <i className="fa-solid fa-magnifying-glass cp-search-ico" />
              <input
                className="cp-search"
                type="text"
                placeholder="البحث في الشركات..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="cp-search-clear" onClick={() => setSearch("")}>
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>
          )}

          {/* ── List ── */}
          {companies.length === 0 ? (
            <div className="cp-empty">
              <div className="cp-empty-ico">
                <i className="fa-solid fa-building" style={{ fontSize: 36, color: "#c7d2fe" }} />
              </div>
              <div className="cp-empty-title">لا توجد شركات بعد</div>
              <div className="cp-empty-sub">أضف شركتك الأولى من الحقل أعلاه</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="cp-empty">
              <div className="cp-empty-ico">
                <i
                  className="fa-solid fa-magnifying-glass"
                  style={{ fontSize: 30, color: "#c7d2fe" }}
                />
              </div>
              <div className="cp-empty-title">لا توجد نتائج</div>
              <div className="cp-empty-sub">جرب كلمة بحث مختلفة</div>
            </div>
          ) : (
            <div className="cp-list">
              {filtered.map((c, i) => (
                <div key={c.id} className="cp-item" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="cp-item-left">
                    <div className="cp-item-num">{i + 1}</div>
                    <div className="cp-item-ico">
                      <i
                        className="fa-solid fa-building"
                        style={{ fontSize: 16, color: "#4f46e5" }}
                      />
                    </div>
                    {editId === c.id ? (
                      <input
                        className="cp-edit-input"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleEdit(c.id)}
                        autoFocus
                      />
                    ) : (
                      <div className="cp-item-name">{c.name}</div>
                    )}
                  </div>
                  <div className="cp-item-actions">
                    {editId === c.id ? (
                      <>
                        <button className="cp-btn cp-btn--save" onClick={() => handleEdit(c.id)}>
                          <i className="fa-solid fa-check" />
                          حفظ
                        </button>
                        <button
                          className="cp-btn cp-btn--cancel"
                          onClick={() => {
                            setEditId(null);
                            setEditName("");
                          }}
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="cp-btn cp-btn--edit"
                          onClick={() => {
                            setEditId(c.id);
                            setEditName(c.name);
                          }}
                        >
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button
                          className="cp-btn cp-btn--del"
                          onClick={() => setDeleteTarget(c)}
                          disabled={deleting === c.id}
                        >
                          {deleting === c.id ? (
                            <div className="cp-spinner cp-spinner--red" />
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
        title="تأكيد حذف الشركة"
        message={`سيتم حذف "${deleteTarget?.name || ""}" من قائمة الشركات.`}
        confirmLabel="حذف الشركة"
        loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
