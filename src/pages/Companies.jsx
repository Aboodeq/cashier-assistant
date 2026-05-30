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

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [name, setName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(collection(db, "users", uid, "companies"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setCompanies(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setLoading(true);
    const uid = auth.currentUser?.uid;
    await addDoc(collection(db, "users", uid, "companies"), {
      name: n,
      createdAt: Date.now(),
    });
    setName("");
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    const uid = auth.currentUser?.uid;
    await deleteDoc(doc(db, "users", uid, "companies", id));
    setDeleting(null);
  };

  const handleEdit = async (id) => {
    const n = editName.trim();
    if (!n) return;
    const uid = auth.currentUser?.uid;
    await updateDoc(doc(db, "users", uid, "companies", id), { name: n });
    setEditId(null);
    setEditName("");
  };

  const filtered = companies.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <style>{CSS}</style>
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
                          onClick={() => handleDelete(c.id)}
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
    </>
  );
}

const CSS = `
@keyframes cpFadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
@keyframes cpItemIn{from{opacity:0;transform:translateX(12px);}to{opacity:1;transform:translateX(0);}}
@keyframes cpSpin{to{transform:rotate(360deg);}}
@keyframes cpGrad{0%,100%{background-position:0% 50%;}50%{background-position:100% 50%;}}

.cp-root{display:flex;flex-direction:column;height:100%;min-height:0;background:#f1f5f9;}

/* Header */
.cp-header{
  position:relative;overflow:hidden;flex-shrink:0;
  padding:28px 32px 24px;
  background:linear-gradient(135deg,#1e1b4b,#1a237e,#1565c0);
  background-size:200% 200%;
  animation:cpGrad 10s ease infinite;
}
.cp-header-bg{
  position:absolute;inset:0;
  background:linear-gradient(135deg,#0f0c29,#1e1b4b,#1a237e,#0d47a1);
  background-size:300% 300%;
  animation:cpGrad 12s ease infinite;
}
.cp-header-body{
  position:relative;z-index:1;
  display:flex;align-items:center;justify-content:space-between;gap:16px;
}
.cp-header-left{display:flex;align-items:center;gap:16px;}
.cp-header-ico{
  width:52px;height:52px;border-radius:15px;flex-shrink:0;
  background:linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.08));
  border:1px solid rgba(255,255,255,0.2);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 16px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.2);
}
.cp-header-title{font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.4px;margin-bottom:3px;}
.cp-header-sub{font-size:13px;color:rgba(255,255,255,0.6);font-weight:400;}
.cp-header-badge{
  display:flex;align-items:center;gap:6px;
  padding:7px 16px;border-radius:99px;
  background:rgba(255,255,255,0.12);
  border:1px solid rgba(255,255,255,0.18);
  font-size:13px;font-weight:700;color:#fff;
  white-space:nowrap;
}

/* Body */
.cp-body{
  flex:1;overflow-y:auto;
  padding:24px 28px;
  display:flex;flex-direction:column;gap:18px;
}

/* Add card */
.cp-add-card{
  background:#fff;border-radius:18px;
  padding:22px 24px;
  border:1px solid #f1f5f9;
  box-shadow:0 2px 16px rgba(0,0,0,0.05);
  animation:cpFadeUp 0.5s 0.05s cubic-bezier(0.22,1,0.36,1) both;
}
.cp-add-card-title{
  display:flex;align-items:center;gap:8px;
  font-size:14px;font-weight:700;color:#1e293b;
  margin-bottom:16px;
}
.cp-add-form{display:flex;gap:10px;align-items:stretch;}
.cp-input-wrap{
  flex:1;position:relative;
  border:1.5px solid #e2e8f0;border-radius:12px;
  background:#f8fafc;
  transition:all 0.22s;
  display:flex;align-items:center;
}
.cp-input-wrap:focus-within{
  border-color:#6366f1;background:#fff;
  box-shadow:0 0 0 4px rgba(99,102,241,0.1);
}
.cp-input-ico{position:absolute;right:14px;color:#94a3b8;font-size:14px;pointer-events:none;}
.cp-input{
  width:100%;padding:13px 42px 13px 16px;
  border:none;background:transparent;
  font-size:15px;color:#1e293b;text-align:right;
  border-radius:12px;
}
.cp-input:focus{outline:none;}
.cp-add-btn{
  display:flex;align-items:center;gap:8px;
  padding:13px 22px;border-radius:12px;border:none;
  background:linear-gradient(135deg,#4f46e5,#6366f1);
  color:#fff;font-size:14px;font-weight:700;cursor:pointer;
  white-space:nowrap;flex-shrink:0;
  box-shadow:0 4px 16px rgba(79,70,229,0.35);
  transition:all 0.25s;
}
.cp-add-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 24px rgba(79,70,229,0.45);}
.cp-add-btn:disabled{opacity:0.6;cursor:not-allowed;transform:none;}

/* Search */
.cp-search-wrap{
  position:relative;
  animation:cpFadeUp 0.5s 0.1s cubic-bezier(0.22,1,0.36,1) both;
}
.cp-search-ico{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:14px;pointer-events:none;}
.cp-search{
  width:100%;padding:12px 42px 12px 40px;
  border:1.5px solid #e2e8f0;border-radius:12px;
  background:#fff;font-size:14px;color:#1e293b;text-align:right;
  transition:all 0.22s;
}
.cp-search:focus{outline:none;border-color:#6366f1;box-shadow:0 0 0 4px rgba(99,102,241,0.1);}
.cp-search-clear{
  position:absolute;left:12px;top:50%;transform:translateY(-50%);
  width:24px;height:24px;border-radius:6px;
  background:#f1f5f9;border:none;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  color:#94a3b8;font-size:12px;transition:all 0.2s;
}
.cp-search-clear:hover{background:#e2e8f0;color:#475569;}

/* Empty */
.cp-empty{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:60px 24px;gap:12px;
  animation:cpFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both;
}
.cp-empty-ico{
  width:80px;height:80px;border-radius:22px;
  background:linear-gradient(135deg,#f5f3ff,#ede9fe);
  display:flex;align-items:center;justify-content:center;
  margin-bottom:4px;
}
.cp-empty-title{font-size:16px;font-weight:800;color:#1e293b;}
.cp-empty-sub{font-size:13px;color:#94a3b8;}

/* List */
.cp-list{display:flex;flex-direction:column;gap:10px;}
.cp-item{
  display:flex;align-items:center;justify-content:space-between;
  background:#fff;border-radius:14px;
  padding:14px 18px;
  border:1px solid #f1f5f9;
  box-shadow:0 2px 8px rgba(0,0,0,0.04);
  transition:all 0.25s cubic-bezier(0.4,0,0.2,1);
  animation:cpItemIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
  gap:12px;
}
.cp-item:hover{
  transform:translateX(-4px);
  box-shadow:0 6px 20px rgba(79,70,229,0.1);
  border-color:rgba(99,102,241,0.2);
}
.cp-item-left{display:flex;align-items:center;gap:12px;flex:1;min-width:0;}
.cp-item-num{
  width:24px;height:24px;border-radius:7px;flex-shrink:0;
  background:#f5f3ff;
  display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:700;color:#6366f1;
}
.cp-item-ico{
  width:38px;height:38px;border-radius:11px;flex-shrink:0;
  background:linear-gradient(135deg,#ede9fe,#ddd6fe);
  display:flex;align-items:center;justify-content:center;
}
.cp-item-name{font-size:15px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cp-edit-input{
  flex:1;padding:7px 12px;border:1.5px solid #6366f1;border-radius:9px;
  font-size:14px;color:#1e293b;background:#f5f3ff;text-align:right;
}
.cp-edit-input:focus{outline:none;box-shadow:0 0 0 3px rgba(99,102,241,0.12);}
.cp-item-actions{display:flex;align-items:center;gap:6px;flex-shrink:0;}

/* Buttons */
.cp-btn{
  display:flex;align-items:center;gap:5px;
  padding:7px 12px;border-radius:9px;border:none;
  font-size:12px;font-weight:600;cursor:pointer;
  transition:all 0.2s;
}
.cp-btn--edit{background:#f5f3ff;color:#4f46e5;}
.cp-btn--edit:hover{background:#ede9fe;transform:scale(1.05);}
.cp-btn--del{background:#fef2f2;color:#ef4444;}
.cp-btn--del:hover:not(:disabled){background:#fee2e2;transform:scale(1.05);}
.cp-btn--del:disabled{opacity:0.6;cursor:not-allowed;}
.cp-btn--save{background:linear-gradient(135deg,#4f46e5,#6366f1);color:#fff;padding:7px 14px;}
.cp-btn--save:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(79,70,229,0.3);}
.cp-btn--cancel{background:#f8fafc;color:#94a3b8;border:1px solid #e2e8f0;}
.cp-btn--cancel:hover{background:#f1f5f9;color:#475569;}

/* Spinners */
.cp-spinner{
  width:16px;height:16px;
  border:2.5px solid rgba(255,255,255,0.3);
  border-top-color:#fff;border-radius:50%;
  animation:cpSpin 0.7s linear infinite;
}
.cp-spinner--red{
  border:2px solid rgba(239,68,68,0.2);
  border-top-color:#ef4444;
}

/* Responsive */
@media (max-width:600px){
  .cp-body{padding:16px 14px;}
  .cp-header{padding:22px 18px 18px;}
  .cp-add-form{flex-direction:column;}
  .cp-add-btn{width:100%;justify-content:center;}
  .cp-header-badge{display:none;}
}
`;
