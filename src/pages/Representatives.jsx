import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";

export default function Representatives() {
  const [reps, setReps] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ name: "", companyId: "" });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCo, setFilterCo] = useState("");

  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const qR = query(collection(db, "users", uid, "representatives"), orderBy("createdAt", "desc"));
    const qC = query(collection(db, "users", uid, "companies"), orderBy("createdAt", "desc"));
    const u1 = onSnapshot(qR, (s) => setReps(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(qC, (s) => setCompanies(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => {
      u1();
      u2();
    };
  }, []);

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
      <style>{CSS}</style>
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

const CSS = `
@keyframes rpFadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
@keyframes rpItemIn{from{opacity:0;transform:translateX(12px);}to{opacity:1;transform:translateX(0);}}
@keyframes rpSpin{to{transform:rotate(360deg);}}
@keyframes rpGrad{0%,100%{background-position:0% 50%;}50%{background-position:100% 50%;}}

.rp-root{display:flex;flex-direction:column;height:100%;min-height:0;background:#f1f5f9;}

.rp-header{
  position:relative;overflow:hidden;flex-shrink:0;
  padding:28px 32px 24px;
  background:linear-gradient(135deg,#0c4a6e,#075985,#0369a1);
  background-size:200% 200%;animation:rpGrad 10s ease infinite;
}
.rp-header-bg{
  position:absolute;inset:0;
  background:linear-gradient(135deg,#082f49,#0c4a6e,#0369a1,#0891b2);
  background-size:300% 300%;animation:rpGrad 12s ease infinite;
}
.rp-header-body{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:16px;}
.rp-header-left{display:flex;align-items:center;gap:16px;}
.rp-header-ico{
  width:52px;height:52px;border-radius:15px;flex-shrink:0;
  background:linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.08));
  border:1px solid rgba(255,255,255,0.2);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 16px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.2);
}
.rp-header-title{font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.4px;margin-bottom:3px;}
.rp-header-sub{font-size:13px;color:rgba(255,255,255,0.6);}
.rp-header-badge{
  display:flex;align-items:center;gap:6px;
  padding:7px 16px;border-radius:99px;
  background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.18);
  font-size:13px;font-weight:700;color:#fff;white-space:nowrap;
}

.rp-body{flex:1;overflow-y:auto;padding:24px 28px;display:flex;flex-direction:column;gap:18px;}

.rp-add-card{
  background:#fff;border-radius:18px;padding:22px 24px;
  border:1px solid #f1f5f9;
  box-shadow:0 2px 16px rgba(0,0,0,0.05);
  animation:rpFadeUp 0.5s 0.05s cubic-bezier(0.22,1,0.36,1) both;
}
.rp-add-title{
  display:flex;align-items:center;gap:8px;
  font-size:14px;font-weight:700;color:#1e293b;margin-bottom:16px;
}
.rp-no-companies{
  display:flex;align-items:center;gap:8px;
  padding:12px 16px;border-radius:10px;
  background:#fffbeb;border:1px solid #fef3c7;
  font-size:13px;font-weight:500;color:#92400e;
}
.rp-add-form{display:flex;gap:10px;align-items:stretch;flex-wrap:wrap;}
.rp-input-wrap{
  flex:2;min-width:160px;position:relative;
  border:1.5px solid #e2e8f0;border-radius:12px;background:#f8fafc;
  display:flex;align-items:center;transition:all 0.22s;
}
.rp-input-wrap:focus-within{border-color:#0891b2;background:#fff;box-shadow:0 0 0 4px rgba(8,145,178,0.1);}
.rp-input-ico{position:absolute;right:14px;color:#94a3b8;font-size:14px;pointer-events:none;}
.rp-input{width:100%;padding:13px 42px 13px 16px;border:none;background:transparent;font-size:15px;color:#1e293b;text-align:right;border-radius:12px;}
.rp-input:focus{outline:none;}
.rp-select-wrap{
  flex:2;min-width:160px;position:relative;
  border:1.5px solid #e2e8f0;border-radius:12px;background:#f8fafc;
  display:flex;align-items:center;transition:all 0.22s;
}
.rp-select-wrap:focus-within{border-color:#0891b2;background:#fff;box-shadow:0 0 0 4px rgba(8,145,178,0.1);}
.rp-select-ico{position:absolute;right:14px;color:#94a3b8;font-size:14px;pointer-events:none;z-index:1;}
.rp-select{
  width:100%;padding:13px 42px 13px 16px;
  border:none;background:transparent;
  font-size:15px;color:#1e293b;text-align:right;
  border-radius:12px;appearance:none;cursor:pointer;
}
.rp-select:focus{outline:none;}
.rp-add-btn{
  display:flex;align-items:center;gap:8px;
  padding:13px 22px;border-radius:12px;border:none;
  background:linear-gradient(135deg,#0891b2,#06b6d4);
  color:#fff;font-size:14px;font-weight:700;cursor:pointer;
  white-space:nowrap;flex-shrink:0;
  box-shadow:0 4px 16px rgba(8,145,178,0.35);
  transition:all 0.25s;
}
.rp-add-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 24px rgba(8,145,178,0.45);}
.rp-add-btn:disabled{opacity:0.6;cursor:not-allowed;}

.rp-filters{
  display:flex;gap:10px;
  animation:rpFadeUp 0.5s 0.1s cubic-bezier(0.22,1,0.36,1) both;
}
.rp-search-wrap{flex:2;position:relative;}
.rp-search-ico{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:14px;pointer-events:none;}
.rp-search{
  width:100%;padding:12px 42px 12px 40px;
  border:1.5px solid #e2e8f0;border-radius:12px;
  background:#fff;font-size:14px;color:#1e293b;text-align:right;transition:all 0.22s;
}
.rp-search:focus{outline:none;border-color:#0891b2;box-shadow:0 0 0 4px rgba(8,145,178,0.1);}
.rp-clear{
  position:absolute;left:12px;top:50%;transform:translateY(-50%);
  width:24px;height:24px;border-radius:6px;
  background:#f1f5f9;border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  color:#94a3b8;font-size:12px;transition:all 0.2s;
}
.rp-clear:hover{background:#e2e8f0;}
.rp-filter-select-wrap{flex:1;min-width:140px;position:relative;}
.rp-filter-ico{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:13px;pointer-events:none;z-index:1;}
.rp-filter-select{
  width:100%;padding:12px 36px 12px 12px;
  border:1.5px solid #e2e8f0;border-radius:12px;
  background:#fff;font-size:14px;color:#1e293b;text-align:right;
  appearance:none;cursor:pointer;transition:all 0.22s;
}
.rp-filter-select:focus{outline:none;border-color:#0891b2;}

.rp-empty{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:60px 24px;gap:12px;
  animation:rpFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both;
}
.rp-empty-ico{
  width:80px;height:80px;border-radius:22px;
  background:linear-gradient(135deg,#f0f9ff,#e0f2fe);
  display:flex;align-items:center;justify-content:center;margin-bottom:4px;
}
.rp-empty-title{font-size:16px;font-weight:800;color:#1e293b;}
.rp-empty-sub{font-size:13px;color:#94a3b8;}

.rp-list{display:flex;flex-direction:column;gap:10px;}
.rp-item{
  display:flex;align-items:center;justify-content:space-between;
  background:#fff;border-radius:14px;padding:13px 18px;
  border:1px solid #f1f5f9;
  box-shadow:0 2px 8px rgba(0,0,0,0.04);
  transition:all 0.25s cubic-bezier(0.4,0,0.2,1);
  animation:rpItemIn 0.4s cubic-bezier(0.22,1,0.36,1) both;gap:12px;
}
.rp-item:hover{transform:translateX(-4px);box-shadow:0 6px 20px rgba(8,145,178,0.1);border-color:rgba(8,145,178,0.2);}
.rp-item-left{display:flex;align-items:center;gap:12px;flex:1;min-width:0;}
.rp-item-ava{
  width:40px;height:40px;border-radius:12px;flex-shrink:0;
  background:linear-gradient(135deg,#0891b2,#22d3ee);
  display:flex;align-items:center;justify-content:center;
  font-size:16px;font-weight:800;color:#fff;
}
.rp-item-info{flex:1;min-width:0;}
.rp-item-name{font-size:15px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.rp-item-co{
  display:flex;align-items:center;gap:4px;
  font-size:12px;color:#94a3b8;font-weight:500;margin-top:2px;
}
.rp-edit-fields{display:flex;gap:8px;flex:1;flex-wrap:wrap;}
.rp-edit-input{
  flex:1;min-width:120px;padding:7px 12px;
  border:1.5px solid #0891b2;border-radius:9px;
  font-size:14px;color:#1e293b;background:#f0f9ff;text-align:right;
}
.rp-edit-input:focus{outline:none;box-shadow:0 0 0 3px rgba(8,145,178,0.12);}
.rp-edit-select{
  flex:1;min-width:120px;padding:7px 12px;
  border:1.5px solid #0891b2;border-radius:9px;
  font-size:14px;color:#1e293b;background:#f0f9ff;text-align:right;
  appearance:none;cursor:pointer;
}
.rp-edit-select:focus{outline:none;}
.rp-item-actions{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.rp-btn{
  display:flex;align-items:center;gap:5px;
  padding:7px 12px;border-radius:9px;border:none;
  font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s;
}
.rp-btn--edit{background:#f0f9ff;color:#0891b2;}
.rp-btn--edit:hover{background:#e0f2fe;transform:scale(1.05);}
.rp-btn--del{background:#fef2f2;color:#ef4444;}
.rp-btn--del:hover:not(:disabled){background:#fee2e2;transform:scale(1.05);}
.rp-btn--del:disabled{opacity:0.6;cursor:not-allowed;}
.rp-btn--save{background:linear-gradient(135deg,#0891b2,#06b6d4);color:#fff;padding:7px 14px;}
.rp-btn--save:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(8,145,178,0.3);}
.rp-btn--cancel{background:#f8fafc;color:#94a3b8;border:1px solid #e2e8f0;}
.rp-btn--cancel:hover{background:#f1f5f9;}
.rp-spinner{width:16px;height:16px;border:2.5px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:rpSpin 0.7s linear infinite;}
.rp-spinner--red{border:2px solid rgba(239,68,68,0.2);border-top-color:#ef4444;}

@media(max-width:600px){
  .rp-body{padding:16px 14px;}
  .rp-header{padding:22px 18px 18px;}
  .rp-add-form{flex-direction:column;}
  .rp-add-btn{width:100%;justify-content:center;}
  .rp-filters{flex-direction:column;}
  .rp-header-badge{display:none;}
}
`;
