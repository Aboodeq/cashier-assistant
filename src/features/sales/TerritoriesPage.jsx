import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import "./TerritoriesPage.css";

export default function TerritoriesPage() {
  const uid = auth.currentUser?.uid;
  const territories = useFirestoreCollection(uid && ["users", uid, "salesTerritories"], {
    orderByField: "createdAt",
  });
  const clients = useFirestoreCollection(uid && ["users", uid, "salesClients"], {
    orderByField: "createdAt",
  });

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ name: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");

  const clientCount = (territoryId) => clients.filter((c) => c.territoryId === territoryId).length;

  const handleAdd = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setLoading(true);
    await addDoc(collection(db, "users", uid, "salesTerritories"), {
      name: n,
      notes: notes.trim(),
      createdAt: Date.now(),
    });
    setName("");
    setNotes("");
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await deleteDoc(doc(db, "users", uid, "salesTerritories", deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = async (id) => {
    const n = editData.name.trim();
    if (!n) return;
    await updateDoc(doc(db, "users", uid, "salesTerritories", id), {
      name: n,
      notes: editData.notes.trim(),
    });
    setEditId(null);
  };

  const filtered = territories.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="tr-root">
        {/* Header */}
        <div className="tr-header">
          <div className="tr-header-bg" />
          <div className="tr-header-body">
            <div className="tr-header-left">
              <div className="tr-header-ico">
                <i className="fa-solid fa-map-location-dot" style={{ fontSize: 22, color: "#fff" }} />
              </div>
              <div>
                <h1 className="tr-header-title">المناطق</h1>
                <p className="tr-header-sub">إدارة مناطق التغطية والمبيعات</p>
              </div>
            </div>
            <div className="tr-header-badge">
              <i className="fa-solid fa-map-location-dot" style={{ fontSize: 11 }} />
              {territories.length} منطقة
            </div>
          </div>
        </div>

        <div className="tr-body">
          {/* Add form */}
          <div className="tr-add-card">
            <div className="tr-add-card-title">
              <i className="fa-solid fa-plus-circle" style={{ color: "#c2410c", fontSize: 16 }} />
              إضافة منطقة جديدة
            </div>
            <form onSubmit={handleAdd} className="tr-add-form">
              <div className="tr-input-wrap">
                <i className="fa-solid fa-map-location-dot tr-input-ico" />
                <input
                  className="tr-input"
                  type="text"
                  placeholder="اسم المنطقة... (مثال: حي الميدان)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="tr-input-wrap">
                <i className="fa-regular fa-note-sticky tr-input-ico" />
                <input
                  className="tr-input"
                  type="text"
                  placeholder="ملاحظات... (اختياري)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <button type="submit" className="tr-add-btn" disabled={loading || !name.trim()}>
                {loading ? (
                  <>
                    <div className="tr-spinner" />
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

          {/* Search */}
          {territories.length > 0 && (
            <div className="tr-search-wrap">
              <i className="fa-solid fa-magnifying-glass tr-search-ico" />
              <input
                className="tr-search"
                type="text"
                placeholder="البحث في المناطق..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="tr-search-clear" onClick={() => setSearch("")}>
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>
          )}

          {/* List */}
          {territories.length === 0 ? (
            <div className="tr-empty">
              <div className="tr-empty-ico">
                <i
                  className="fa-solid fa-map-location-dot"
                  style={{ fontSize: 36, color: "#fdba74" }}
                />
              </div>
              <div className="tr-empty-title">لا توجد مناطق بعد</div>
              <div className="tr-empty-sub">أضف منطقتك الأولى من الحقل أعلاه</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="tr-empty">
              <div className="tr-empty-ico">
                <i
                  className="fa-solid fa-magnifying-glass"
                  style={{ fontSize: 30, color: "#fdba74" }}
                />
              </div>
              <div className="tr-empty-title">لا توجد نتائج</div>
              <div className="tr-empty-sub">جرب كلمة بحث مختلفة</div>
            </div>
          ) : (
            <div className="tr-list">
              {filtered.map((t, i) => (
                <div key={t.id} className="tr-item" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="tr-item-left">
                    <div className="tr-item-num">{i + 1}</div>
                    <div className="tr-item-ico">
                      <i
                        className="fa-solid fa-map-location-dot"
                        style={{ fontSize: 16, color: "#c2410c" }}
                      />
                    </div>
                    {editId === t.id ? (
                      <div style={{ display: "flex", gap: 8, flex: 1, flexWrap: "wrap" }}>
                        <input
                          className="tr-edit-input"
                          value={editData.name}
                          onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && handleEdit(t.id)}
                          placeholder="اسم المنطقة"
                          autoFocus
                        />
                        <input
                          className="tr-edit-input"
                          value={editData.notes}
                          onChange={(e) => setEditData((p) => ({ ...p, notes: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && handleEdit(t.id)}
                          placeholder="ملاحظات"
                        />
                      </div>
                    ) : (
                      <div className="tr-item-info">
                        <div className="tr-item-name">{t.name}</div>
                        {t.notes && <div className="tr-item-notes">{t.notes}</div>}
                      </div>
                    )}
                  </div>
                  <div className="tr-item-actions">
                    {editId === t.id ? (
                      <>
                        <button className="tr-btn tr-btn--save" onClick={() => handleEdit(t.id)}>
                          <i className="fa-solid fa-check" />
                          حفظ
                        </button>
                        <button
                          className="tr-btn tr-btn--cancel"
                          onClick={() => setEditId(null)}
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="tr-item-count">{clientCount(t.id)} عميل</span>
                        <button
                          className="tr-btn tr-btn--edit"
                          onClick={() => {
                            setEditId(t.id);
                            setEditData({ name: t.name, notes: t.notes || "" });
                          }}
                        >
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button
                          className="tr-btn tr-btn--del"
                          onClick={() => setDeleteTarget(t)}
                          disabled={deleting === t.id}
                        >
                          {deleting === t.id ? (
                            <div className="tr-spinner tr-spinner--red" />
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
        title="تأكيد حذف المنطقة"
        message={`سيتم حذف "${deleteTarget?.name || ""}" من قائمة المناطق. لن يتم حذف العملاء المرتبطين بها.`}
        confirmLabel="حذف المنطقة"
        loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
