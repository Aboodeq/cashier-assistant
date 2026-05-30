import { useState, useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";

/* ══════════════════════════════════════
   مكوّن رئيسي
══════════════════════════════════════ */
export default function Sessions() {
  const [view, setView] = useState("list"); // 'list' | 'detail'
  const [activeSession, setActiveSession] = useState(null);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <style>{CSS}</style>
      {view === "list" ? (
        <SessionList
          onOpen={(s) => {
            setActiveSession(s);
            setView("detail");
          }}
        />
      ) : (
        <SessionDetail
          session={activeSession}
          onBack={() => {
            setActiveSession(null);
            setView("list");
          }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════
   قائمة الجلسات
══════════════════════════════════════ */
function SessionList({ onOpen }) {
  const [sessions, setSessions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [filterCo, setFilterCo] = useState("");
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const qS = query(collection(db, "users", uid, "sessions"), orderBy("createdAt", "desc"));
    const qC = query(collection(db, "users", uid, "companies"), orderBy("createdAt", "desc"));
    const u1 = onSnapshot(qS, (s) => setSessions(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(qC, (s) => setCompanies(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => {
      u1();
      u2();
    };
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!label.trim() || !companyId) return;
    setLoading(true);
    const co = companies.find((c) => c.id === companyId);
    await addDoc(collection(db, "users", uid, "sessions"), {
      label: label.trim(),
      companyId,
      companyName: co?.name || "",
      date,
      createdAt: Date.now(),
      totalNewSYP: 0,
      totalOldSYP: 0,
      totalUSD: 0,
      entriesCount: 0,
    });
    setLabel("");
    setShowForm(false);
    setLoading(false);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    setDeleting(id);
    // حذف الإدخالات أولاً
    const entriesRef = collection(db, "users", uid, "sessions", id, "entries");
    const snap = await getDocs(entriesRef);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, "users", uid, "sessions", id));
    setDeleting(null);
  };

  const filtered = sessions.filter((s) => (filterCo ? s.companyId === filterCo : true));

  const totalStats = {
    newSYP: sessions.reduce((a, s) => a + (s.totalNewSYP || 0), 0),
    oldSYP: sessions.reduce((a, s) => a + (s.totalOldSYP || 0), 0),
    usd: sessions.reduce((a, s) => a + (s.totalUSD || 0), 0),
  };

  return (
    <div className="sl-root">
      {/* Header */}
      <div className="sl-header">
        <div className="sl-header-bg" />
        <div className="sl-header-body">
          <div className="sl-header-left">
            <div className="sl-header-ico">
              <i className="fa-solid fa-folder-open" style={{ fontSize: 22, color: "#fff" }} />
            </div>
            <div>
              <h1 className="sl-header-title">الجلسات</h1>
              <p className="sl-header-sub">تسجيل وتتبع جلسات استلام الأموال</p>
            </div>
          </div>
          <button className="sl-new-btn" onClick={() => setShowForm((f) => !f)}>
            <i className={`fa-solid fa-${showForm ? "xmark" : "plus"}`} />
            {showForm ? "إلغاء" : "جلسة جديدة"}
          </button>
        </div>

        {/* Stats bar */}
        <div className="sl-stats-bar">
          {[
            {
              label: "إجمالي ل.س جديد",
              val: totalStats.newSYP.toLocaleString(),
              icon: "fa-solid fa-money-bill-wave",
              color: "#a5b4fc",
            },
            {
              label: "إجمالي ل.س قديم",
              val: totalStats.oldSYP.toLocaleString(),
              icon: "fa-solid fa-money-bill",
              color: "#6ee7b7",
            },
            {
              label: "إجمالي دولار",
              val: `$${totalStats.usd.toLocaleString()}`,
              icon: "fa-solid fa-dollar-sign",
              color: "#fcd34d",
            },
            {
              label: "عدد الجلسات",
              val: sessions.length,
              icon: "fa-solid fa-folder-open",
              color: "#93c5fd",
            },
          ].map((st, i) => (
            <div key={i} className="sl-stat">
              <i className={st.icon} style={{ fontSize: 13, color: st.color }} />
              <div>
                <div className="sl-stat-val">{st.val}</div>
                <div className="sl-stat-lbl">{st.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sl-body">
        {/* Add Form */}
        {showForm && (
          <div className="sl-form-card">
            <div className="sl-form-title">
              <i className="fa-solid fa-folder-plus" style={{ color: "#059669", fontSize: 16 }} />
              إنشاء جلسة جديدة
            </div>
            {companies.length === 0 ? (
              <div className="sl-warn">
                <i className="fa-solid fa-triangle-exclamation" />
                يجب إضافة شركة أولاً قبل إنشاء جلسة
              </div>
            ) : (
              <form onSubmit={handleAdd} className="sl-form">
                <div className="sl-field">
                  <label className="sl-label">
                    <i className="fa-solid fa-tag" style={{ fontSize: 11, color: "#6ee7b7" }} />
                    اسم الجلسة
                  </label>
                  <div className="sl-input-wrap">
                    <i className="fa-solid fa-folder sl-input-ico" />
                    <input
                      className="sl-input"
                      placeholder="مثال: صندوق الصباح..."
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="sl-field">
                  <label className="sl-label">
                    <i
                      className="fa-solid fa-building"
                      style={{ fontSize: 11, color: "#6ee7b7" }}
                    />
                    الشركة
                  </label>
                  <div className="sl-select-wrap">
                    <i className="fa-solid fa-building sl-input-ico" />
                    <select
                      className="sl-select"
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
                </div>
                <div className="sl-field">
                  <label className="sl-label">
                    <i
                      className="fa-regular fa-calendar"
                      style={{ fontSize: 11, color: "#6ee7b7" }}
                    />
                    التاريخ
                  </label>
                  <div className="sl-input-wrap">
                    <i className="fa-regular fa-calendar sl-input-ico" />
                    <input
                      className="sl-input"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="sl-submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="sl-spinner" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-folder-plus" />
                      إنشاء الجلسة
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Filter */}
        {sessions.length > 0 && companies.length > 1 && (
          <div className="sl-filter-wrap">
            <i className="fa-solid fa-filter sl-filter-ico" />
            <select
              className="sl-filter-sel"
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
        )}

        {/* Sessions list */}
        {sessions.length === 0 ? (
          <div className="sl-empty">
            <div className="sl-empty-ico">
              <i className="fa-solid fa-folder-open" style={{ fontSize: 36, color: "#86efac" }} />
            </div>
            <div className="sl-empty-title">لا توجد جلسات بعد</div>
            <div className="sl-empty-sub">أنشئ جلستك الأولى بالضغط على "جلسة جديدة"</div>
          </div>
        ) : (
          <div className="sl-list">
            {filtered.map((s, i) => (
              <div
                key={s.id}
                className="sl-item"
                onClick={() => onOpen(s)}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="sl-item-top">
                  <div className="sl-item-ico">
                    <i
                      className="fa-solid fa-folder-open"
                      style={{ fontSize: 18, color: "#059669" }}
                    />
                  </div>
                  <div className="sl-item-info">
                    <div className="sl-item-label">{s.label}</div>
                    <div className="sl-item-meta">
                      <span className="sl-item-co">
                        <i className="fa-solid fa-building" style={{ fontSize: 10 }} />
                        {s.companyName}
                      </span>
                      <span className="sl-item-date">
                        <i className="fa-regular fa-calendar" style={{ fontSize: 10 }} />
                        {s.date}
                      </span>
                      <span className="sl-item-entries">
                        <i className="fa-solid fa-list" style={{ fontSize: 10 }} />
                        {s.entriesCount || 0} إدخال
                      </span>
                    </div>
                  </div>
                  <div className="sl-item-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="sl-del-btn"
                      onClick={(e) => handleDelete(s.id, e)}
                      disabled={deleting === s.id}
                    >
                      {deleting === s.id ? (
                        <div className="sl-spinner sl-spinner--red" />
                      ) : (
                        <i className="fa-solid fa-trash" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="sl-item-totals">
                  <div className="sl-total sl-total--purple">
                    <span className="sl-total-lbl">ل.س جديد</span>
                    <span className="sl-total-val">{(s.totalNewSYP || 0).toLocaleString()}</span>
                  </div>
                  <div className="sl-total sl-total--teal">
                    <span className="sl-total-lbl">ل.س قديم</span>
                    <span className="sl-total-val">{(s.totalOldSYP || 0).toLocaleString()}</span>
                  </div>
                  <div className="sl-total sl-total--amber">
                    <span className="sl-total-lbl">دولار</span>
                    <span className="sl-total-val">${(s.totalUSD || 0).toLocaleString()}</span>
                  </div>
                </div>
                <div className="sl-item-arrow">
                  <i className="fa-solid fa-arrow-left" style={{ fontSize: 13 }} />
                  فتح الجلسة
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   تفاصيل الجلسة
══════════════════════════════════════ */
function SessionDetail({ session, onBack }) {
  const [entries, setEntries] = useState([]);
  const [reps, setReps] = useState([]);
  const [repId, setRepId] = useState("");
  const [newSYP, setNewSYP] = useState("");
  const [oldSYP, setOldSYP] = useState("");
  const [usd, setUsd] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showPrint, setShowPrint] = useState(false);
  const printRef = useRef(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid || !session) return;
    const qE = query(
      collection(db, "users", uid, "sessions", session.id, "entries"),
      orderBy("createdAt", "asc"),
    );
    const qR = query(collection(db, "users", uid, "representatives"), orderBy("createdAt", "desc"));
    const u1 = onSnapshot(qE, (s) => setEntries(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(qR, (s) => setReps(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => {
      u1();
      u2();
    };
  }, [session]);

  // مناديب الشركة فقط
  const companyReps = reps.filter((r) => r.companyId === session.companyId);

  const updateSessionTotals = async (newEntries) => {
    const totalNewSYP = newEntries.reduce((a, e) => a + (Number(e.newSYP) || 0), 0);
    const totalOldSYP = newEntries.reduce((a, e) => a + (Number(e.oldSYP) || 0), 0);
    const totalUSD = newEntries.reduce((a, e) => a + (Number(e.usd) || 0), 0);
    await updateDoc(doc(db, "users", uid, "sessions", session.id), {
      totalNewSYP,
      totalOldSYP,
      totalUSD,
      entriesCount: newEntries.length,
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!repId) return;
    setLoading(true);
    const rep = reps.find((r) => r.id === repId);
    const entry = {
      repId,
      repName: rep?.name || "",
      newSYP: Number(newSYP) || 0,
      oldSYP: Number(oldSYP) || 0,
      usd: Number(usd) || 0,
      createdAt: Date.now(),
    };
    await addDoc(collection(db, "users", uid, "sessions", session.id, "entries"), entry);
    const updated = [...entries, entry];
    await updateSessionTotals(updated);
    setRepId("");
    setNewSYP("");
    setOldSYP("");
    setUsd("");
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    await deleteDoc(doc(db, "users", uid, "sessions", session.id, "entries", id));
    const updated = entries.filter((e) => e.id !== id);
    await updateSessionTotals(updated);
    setDeleting(null);
  };

  const handleEdit = async (id) => {
    await updateDoc(doc(db, "users", uid, "sessions", session.id, "entries", id), {
      newSYP: Number(editData.newSYP) || 0,
      oldSYP: Number(editData.oldSYP) || 0,
      usd: Number(editData.usd) || 0,
    });
    const updated = entries.map((e) =>
      e.id === id
        ? {
            ...e,
            ...editData,
            newSYP: Number(editData.newSYP) || 0,
            oldSYP: Number(editData.oldSYP) || 0,
            usd: Number(editData.usd) || 0,
          }
        : e,
    );
    await updateSessionTotals(updated);
    setEditId(null);
  };

  const totals = {
    newSYP: entries.reduce((a, e) => a + (Number(e.newSYP) || 0), 0),
    oldSYP: entries.reduce((a, e) => a + (Number(e.oldSYP) || 0), 0),
    usd: entries.reduce((a, e) => a + (Number(e.usd) || 0), 0),
  };

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const w = window.open("", "_blank");
    w.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير جلسة — ${session.label}</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
          *{margin:0;padding:0;box-sizing:border-box;}
          body{font-family:'Tajawal',sans-serif;direction:rtl;padding:32px;color:#1e293b;background:#fff;}
          .print-header{text-align:center;margin-bottom:32px;padding-bottom:20px;border-bottom:2px solid #e2e8f0;}
          .print-logo{font-size:28px;font-weight:900;color:#1e1b4b;margin-bottom:6px;}
          .print-sub{font-size:14px;color:#64748b;}
          .print-info{display:flex;justify-content:space-between;margin-bottom:24px;gap:16px;}
          .print-info-item{background:#f8fafc;padding:12px 16px;border-radius:10px;flex:1;}
          .print-info-label{font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;}
          .print-info-val{font-size:15px;font-weight:700;color:#1e293b;}
          table{width:100%;border-collapse:collapse;margin-bottom:24px;}
          th{background:#1e1b4b;color:#fff;padding:11px 14px;font-size:13px;font-weight:700;text-align:right;}
          td{padding:10px 14px;font-size:13px;border-bottom:1px solid #f1f5f9;color:#374151;}
          tr:hover td{background:#f8fafc;}
          tr:nth-child(even) td{background:#fafafa;}
          .totals-row td{font-weight:800;background:#1e1b4b!important;color:#fff!important;font-size:14px;}
          .print-summary{display:flex;gap:12px;margin-bottom:20px;}
          .sum-box{flex:1;padding:16px;border-radius:12px;text-align:center;}
          .sum-box--purple{background:#f5f3ff;border:1px solid #ddd6fe;}
          .sum-box--teal{background:#f0fdf4;border:1px solid #bbf7d0;}
          .sum-box--amber{background:#fffbeb;border:1px solid #fde68a;}
          .sum-label{font-size:12px;color:#64748b;font-weight:600;margin-bottom:4px;}
          .sum-val{font-size:20px;font-weight:900;color:#1e293b;}
          .print-footer{text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;}
          @media print{body{padding:16px;}}
        </style>
      </head>
      <body>${printContent}</body>
      </html>
    `);
    w.document.close();
    setTimeout(() => {
      w.print();
      w.close();
    }, 400);
  };

  const handleExportCSV = () => {
    const headers = ["المندوب", "ل.س جديد", "ل.س قديم", "دولار"];
    const rows = entries.map((e) => [e.repName, e.newSYP || 0, e.oldSYP || 0, e.usd || 0]);
    rows.push(["الإجمالي", totals.newSYP, totals.oldSYP, totals.usd]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `جلسة_${session.label}_${session.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="sd-root">
      {/* Header */}
      <div className="sd-header">
        <div className="sd-header-bg" />
        <div className="sd-header-body">
          <div className="sd-header-top">
            <button className="sd-back-btn" onClick={onBack}>
              <i className="fa-solid fa-arrow-right" />
              العودة
            </button>
            <div className="sd-header-actions">
              <button className="sd-action-btn sd-action-btn--csv" onClick={handleExportCSV}>
                <i className="fa-solid fa-file-csv" />
                <span>CSV</span>
              </button>
              <button className="sd-action-btn sd-action-btn--print" onClick={handlePrint}>
                <i className="fa-solid fa-print" />
                <span>طباعة</span>
              </button>
            </div>
          </div>
          <div className="sd-header-info">
            <div className="sd-header-ico">
              <i className="fa-solid fa-folder-open" style={{ fontSize: 20, color: "#fff" }} />
            </div>
            <div>
              <h1 className="sd-header-title">{session.label}</h1>
              <div className="sd-header-meta">
                <span>
                  <i className="fa-solid fa-building" style={{ fontSize: 10 }} />{" "}
                  {session.companyName}
                </span>
                <span>
                  <i className="fa-regular fa-calendar" style={{ fontSize: 10 }} /> {session.date}
                </span>
                <span>
                  <i className="fa-solid fa-list" style={{ fontSize: 10 }} /> {entries.length} إدخال
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Totals bar */}
        <div className="sd-totals-bar">
          <div className="sd-total-chip sd-total-chip--purple">
            <div className="sd-total-chip-ico">
              <i
                className="fa-solid fa-money-bill-wave"
                style={{ fontSize: 14, color: "#818cf8" }}
              />
            </div>
            <div>
              <div className="sd-total-chip-lbl">ل.س جديد</div>
              <div className="sd-total-chip-val">{totals.newSYP.toLocaleString()}</div>
            </div>
          </div>
          <div className="sd-total-chip sd-total-chip--teal">
            <div className="sd-total-chip-ico">
              <i className="fa-solid fa-money-bill" style={{ fontSize: 14, color: "#34d399" }} />
            </div>
            <div>
              <div className="sd-total-chip-lbl">ل.س قديم</div>
              <div className="sd-total-chip-val">{totals.oldSYP.toLocaleString()}</div>
            </div>
          </div>
          <div className="sd-total-chip sd-total-chip--amber">
            <div className="sd-total-chip-ico">
              <i className="fa-solid fa-dollar-sign" style={{ fontSize: 14, color: "#fbbf24" }} />
            </div>
            <div>
              <div className="sd-total-chip-lbl">دولار</div>
              <div className="sd-total-chip-val">${totals.usd.toLocaleString()}</div>
            </div>
          </div>
          <div className="sd-total-chip sd-total-chip--blue">
            <div className="sd-total-chip-ico">
              <i className="fa-solid fa-users" style={{ fontSize: 14, color: "#60a5fa" }} />
            </div>
            <div>
              <div className="sd-total-chip-lbl">المناديب</div>
              <div className="sd-total-chip-val">{entries.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="sd-body">
        {/* Add entry form */}
        <div className="sd-add-card">
          <div className="sd-add-title">
            <i className="fa-solid fa-plus-circle" style={{ color: "#059669", fontSize: 15 }} />
            تسجيل استلام جديد
          </div>
          {companyReps.length === 0 ? (
            <div className="sd-warn">
              <i className="fa-solid fa-triangle-exclamation" />
              لا يوجد مناديب مرتبطون بهذه الشركة. أضف مناديب أولاً.
            </div>
          ) : (
            <form onSubmit={handleAdd} className="sd-add-form">
              {/* Rep */}
              <div className="sd-field">
                <label className="sd-label">
                  <i className="fa-solid fa-user" style={{ fontSize: 10, color: "#6ee7b7" }} />
                  المندوب
                </label>
                <div className="sd-select-wrap">
                  <i className="fa-solid fa-user sd-input-ico" />
                  <select
                    className="sd-select"
                    value={repId}
                    onChange={(e) => setRepId(e.target.value)}
                    required
                  >
                    <option value="">اختر المندوب...</option>
                    {companyReps.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Currencies */}
              <div className="sd-currencies">
                <div className="sd-field">
                  <label className="sd-label">
                    <span className="sd-cur-dot sd-cur-dot--purple" />
                    ل.س جديد
                  </label>
                  <div className="sd-input-wrap sd-input-wrap--purple">
                    <input
                      className="sd-input"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={newSYP}
                      onChange={(e) => setNewSYP(e.target.value)}
                    />
                  </div>
                </div>
                <div className="sd-field">
                  <label className="sd-label">
                    <span className="sd-cur-dot sd-cur-dot--teal" />
                    ل.س قديم
                  </label>
                  <div className="sd-input-wrap sd-input-wrap--teal">
                    <input
                      className="sd-input"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={oldSYP}
                      onChange={(e) => setOldSYP(e.target.value)}
                    />
                  </div>
                </div>
                <div className="sd-field">
                  <label className="sd-label">
                    <span className="sd-cur-dot sd-cur-dot--amber" />
                    دولار
                  </label>
                  <div className="sd-input-wrap sd-input-wrap--amber">
                    <input
                      className="sd-input"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={usd}
                      onChange={(e) => setUsd(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="sd-submit-btn" disabled={loading || !repId}>
                {loading ? (
                  <>
                    <div className="sd-spinner" />
                    جاري التسجيل...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-plus" />
                    تسجيل الاستلام
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Entries table */}
        {entries.length === 0 ? (
          <div className="sd-empty">
            <div className="sd-empty-ico">
              <i className="fa-solid fa-inbox" style={{ fontSize: 32, color: "#86efac" }} />
            </div>
            <div className="sd-empty-title">لا توجد إدخالات بعد</div>
            <div className="sd-empty-sub">سجّل أول استلام من الحقل أعلاه</div>
          </div>
        ) : (
          <div className="sd-table-card">
            <div className="sd-table-header">
              <div className="sd-table-title">
                <i className="fa-solid fa-table-list" style={{ color: "#059669", fontSize: 15 }} />
                سجل الاستلام
                <span className="sd-table-count">{entries.length}</span>
              </div>
            </div>

            {/* Table */}
            <div className="sd-table-wrap">
              <table className="sd-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>المندوب</th>
                    <th>ل.س جديد</th>
                    <th>ل.س قديم</th>
                    <th>دولار</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={e.id} className="sd-tr" style={{ animationDelay: `${i * 0.04}s` }}>
                      <td className="sd-td-num">{i + 1}</td>
                      <td>
                        <div className="sd-td-rep">
                          <div className="sd-td-ava">{e.repName?.charAt(0) || "؟"}</div>
                          <span className="sd-td-rep-name">{e.repName}</span>
                        </div>
                      </td>
                      {editId === e.id ? (
                        <>
                          <td>
                            <input
                              className="sd-edit-inp sd-edit-inp--purple"
                              type="number"
                              value={editData.newSYP}
                              onChange={(v) =>
                                setEditData((p) => ({ ...p, newSYP: v.target.value }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              className="sd-edit-inp sd-edit-inp--teal"
                              type="number"
                              value={editData.oldSYP}
                              onChange={(v) =>
                                setEditData((p) => ({ ...p, oldSYP: v.target.value }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              className="sd-edit-inp sd-edit-inp--amber"
                              type="number"
                              value={editData.usd}
                              onChange={(v) => setEditData((p) => ({ ...p, usd: v.target.value }))}
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <span className="sd-amount sd-amount--purple">
                              {(e.newSYP || 0).toLocaleString()}
                            </span>
                          </td>
                          <td>
                            <span className="sd-amount sd-amount--teal">
                              {(e.oldSYP || 0).toLocaleString()}
                            </span>
                          </td>
                          <td>
                            <span className="sd-amount sd-amount--amber">
                              ${(e.usd || 0).toLocaleString()}
                            </span>
                          </td>
                        </>
                      )}
                      <td>
                        <div className="sd-td-actions">
                          {editId === e.id ? (
                            <>
                              <button
                                className="sd-act-btn sd-act-btn--save"
                                onClick={() => handleEdit(e.id)}
                              >
                                <i className="fa-solid fa-check" />
                              </button>
                              <button
                                className="sd-act-btn sd-act-btn--cancel"
                                onClick={() => setEditId(null)}
                              >
                                <i className="fa-solid fa-xmark" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="sd-act-btn sd-act-btn--edit"
                                onClick={() => {
                                  setEditId(e.id);
                                  setEditData({
                                    newSYP: e.newSYP || 0,
                                    oldSYP: e.oldSYP || 0,
                                    usd: e.usd || 0,
                                  });
                                }}
                              >
                                <i className="fa-solid fa-pen" />
                              </button>
                              <button
                                className="sd-act-btn sd-act-btn--del"
                                onClick={() => handleDelete(e.id)}
                                disabled={deleting === e.id}
                              >
                                {deleting === e.id ? (
                                  <div className="sd-spinner sd-spinner--sm" />
                                ) : (
                                  <i className="fa-solid fa-trash" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="sd-tfoot-row">
                    <td colSpan="2" className="sd-tfoot-label">
                      <i className="fa-solid fa-sigma" style={{ marginLeft: 6 }} />
                      الإجمالي
                    </td>
                    <td>
                      <span className="sd-amount sd-amount--purple sd-amount--bold">
                        {totals.newSYP.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className="sd-amount sd-amount--teal  sd-amount--bold">
                        {totals.oldSYP.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className="sd-amount sd-amount--amber sd-amount--bold">
                        ${totals.usd.toLocaleString()}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Hidden print template */}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <div className="print-header">
            <div className="print-logo">مساعد الصندوق</div>
            <div className="print-sub">تقرير جلسة استلام الأموال</div>
          </div>
          <div className="print-info">
            <div className="print-info-item">
              <div className="print-info-label">اسم الجلسة</div>
              <div className="print-info-val">{session.label}</div>
            </div>
            <div className="print-info-item">
              <div className="print-info-label">الشركة</div>
              <div className="print-info-val">{session.companyName}</div>
            </div>
            <div className="print-info-item">
              <div className="print-info-label">التاريخ</div>
              <div className="print-info-val">{session.date}</div>
            </div>
            <div className="print-info-item">
              <div className="print-info-label">عدد الإدخالات</div>
              <div className="print-info-val">{entries.length}</div>
            </div>
          </div>
          <div className="print-summary">
            <div className="sum-box sum-box--purple">
              <div className="sum-label">إجمالي ل.س جديد</div>
              <div className="sum-val">{totals.newSYP.toLocaleString()}</div>
            </div>
            <div className="sum-box sum-box--teal">
              <div className="sum-label">إجمالي ل.س قديم</div>
              <div className="sum-val">{totals.oldSYP.toLocaleString()}</div>
            </div>
            <div className="sum-box sum-box--amber">
              <div className="sum-label">إجمالي الدولار</div>
              <div className="sum-val">${totals.usd.toLocaleString()}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>اسم المندوب</th>
                <th>ل.س جديد</th>
                <th>ل.س قديم</th>
                <th>دولار</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id}>
                  <td>{i + 1}</td>
                  <td>{e.repName}</td>
                  <td>{(e.newSYP || 0).toLocaleString()}</td>
                  <td>{(e.oldSYP || 0).toLocaleString()}</td>
                  <td>${(e.usd || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td colSpan="2">الإجمالي</td>
                <td>{totals.newSYP.toLocaleString()}</td>
                <td>{totals.oldSYP.toLocaleString()}</td>
                <td>${totals.usd.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
          <div className="print-footer">
            تم الإنشاء بواسطة مساعد الصندوق — {new Date().toLocaleDateString("ar-SY")}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════
   CSS
══════════════════════════════════════ */
const CSS = `
@keyframes sdGrad{0%,100%{background-position:0% 50%;}50%{background-position:100% 50%;}}
@keyframes sdFadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
@keyframes sdItemIn{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
@keyframes sdTrIn{from{opacity:0;transform:translateX(8px);}to{opacity:1;transform:translateX(0);}}
@keyframes sdSpin{to{transform:rotate(360deg);}}
@keyframes sdPulse{0%,100%{opacity:1;}50%{opacity:0.5;}}

/* ── Session List ── */
.sl-root{display:flex;flex-direction:column;height:100%;background:#f1f5f9;}
.sl-header{
  position:relative;overflow:hidden;flex-shrink:0;
  background:linear-gradient(135deg,#022c22,#065f46,#059669);
  background-size:200% 200%;animation:sdGrad 10s ease infinite;
}
.sl-header-bg{
  position:absolute;inset:0;
  background:linear-gradient(135deg,#022c22,#064e3b,#065f46,#059669,#10b981);
  background-size:300% 300%;animation:sdGrad 12s ease infinite;
}
.sl-header-body{
  position:relative;z-index:1;
  display:flex;align-items:center;justify-content:space-between;
  padding:24px 28px 16px;gap:16px;
}
.sl-header-left{display:flex;align-items:center;gap:14px;}
.sl-header-ico{
  width:50px;height:50px;border-radius:14px;flex-shrink:0;
  background:linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.08));
  border:1px solid rgba(255,255,255,0.2);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 16px rgba(0,0,0,0.2),inset 0 1px 0 rgba(255,255,255,0.2);
}
.sl-header-title{font-size:21px;font-weight:900;color:#fff;letter-spacing:-0.4px;margin-bottom:3px;}
.sl-header-sub{font-size:13px;color:rgba(255,255,255,0.6);}
.sl-new-btn{
  display:flex;align-items:center;gap:8px;
  padding:10px 20px;border-radius:11px;border:none;cursor:pointer;
  background:rgba(255,255,255,0.15);
  border:1px solid rgba(255,255,255,0.25);
  color:#fff;font-size:14px;font-weight:700;
  transition:all 0.25s;white-space:nowrap;flex-shrink:0;
}
.sl-new-btn:hover{background:rgba(255,255,255,0.25);}

/* Stats bar */
.sl-stats-bar{
  position:relative;z-index:1;
  display:flex;gap:0;
  border-top:1px solid rgba(255,255,255,0.1);
}
.sl-stat{
  flex:1;display:flex;align-items:center;gap:10px;
  padding:14px 18px;
  border-left:1px solid rgba(255,255,255,0.08);
}
.sl-stat:last-child{border-left:none;}
.sl-stat-val{font-size:16px;font-weight:900;color:#fff;line-height:1;}
.sl-stat-lbl{font-size:10px;color:rgba(255,255,255,0.5);font-weight:500;margin-top:2px;}

.sl-body{flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:16px;}

/* Form card */
.sl-form-card{
  background:#fff;border-radius:18px;padding:22px 24px;
  border:1px solid #f1f5f9;
  box-shadow:0 2px 16px rgba(0,0,0,0.05);
  animation:sdFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both;
}
.sl-form-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:#1e293b;margin-bottom:18px;}
.sl-warn{
  display:flex;align-items:center;gap:8px;
  padding:11px 14px;border-radius:10px;
  background:#fffbeb;border:1px solid #fef3c7;
  font-size:13px;font-weight:500;color:#92400e;
}
.sl-form{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;align-items:end;}
.sl-field{display:flex;flex-direction:column;gap:7px;}
.sl-label{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;}
.sl-input-wrap{
  position:relative;border:1.5px solid #e2e8f0;border-radius:12px;
  background:#f8fafc;display:flex;align-items:center;transition:all 0.22s;
}
.sl-input-wrap:focus-within{border-color:#059669;background:#fff;box-shadow:0 0 0 4px rgba(5,150,105,0.1);}
.sl-input-ico{position:absolute;right:13px;color:#94a3b8;font-size:13px;pointer-events:none;}
.sl-input{width:100%;padding:12px 38px 12px 14px;border:none;background:transparent;font-size:14px;color:#1e293b;text-align:right;border-radius:12px;}
.sl-input:focus{outline:none;}
.sl-select-wrap{
  position:relative;border:1.5px solid #e2e8f0;border-radius:12px;
  background:#f8fafc;display:flex;align-items:center;transition:all 0.22s;
}
.sl-select-wrap:focus-within{border-color:#059669;background:#fff;box-shadow:0 0 0 4px rgba(5,150,105,0.1);}
.sl-select{width:100%;padding:12px 38px 12px 14px;border:none;background:transparent;font-size:14px;color:#1e293b;text-align:right;border-radius:12px;appearance:none;cursor:pointer;}
.sl-select:focus{outline:none;}
.sl-submit-btn{
  display:flex;align-items:center;justify-content:center;gap:8px;
  padding:12px 20px;border-radius:12px;border:none;
  background:linear-gradient(135deg,#059669,#10b981);
  color:#fff;font-size:14px;font-weight:700;cursor:pointer;
  box-shadow:0 4px 16px rgba(5,150,105,0.35);
  transition:all 0.25s;grid-column:span 3;
}
.sl-submit-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 24px rgba(5,150,105,0.45);}
.sl-submit-btn:disabled{opacity:0.6;cursor:not-allowed;}

/* Filter */
.sl-filter-wrap{
  position:relative;max-width:260px;
}
.sl-filter-ico{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:13px;pointer-events:none;z-index:1;}
.sl-filter-sel{
  width:100%;padding:10px 36px 10px 12px;
  border:1.5px solid #e2e8f0;border-radius:11px;
  background:#fff;font-size:13px;color:#1e293b;text-align:right;
  appearance:none;cursor:pointer;transition:all 0.22s;
}
.sl-filter-sel:focus{outline:none;border-color:#059669;}

/* Empty */
.sl-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:56px 24px;gap:10px;animation:sdFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both;}
.sl-empty-ico{width:80px;height:80px;border-radius:22px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);display:flex;align-items:center;justify-content:center;margin-bottom:4px;}
.sl-empty-title{font-size:16px;font-weight:800;color:#1e293b;}
.sl-empty-sub{font-size:13px;color:#94a3b8;}

/* Session items */
.sl-list{display:flex;flex-direction:column;gap:12px;}
.sl-item{
  background:#fff;border-radius:18px;padding:18px 20px;
  border:1px solid #f1f5f9;
  box-shadow:0 2px 12px rgba(0,0,0,0.05);
  cursor:pointer;
  transition:all 0.3s cubic-bezier(0.4,0,0.2,1);
  animation:sdItemIn 0.4s cubic-bezier(0.22,1,0.36,1) both;
}
.sl-item:hover{
  transform:translateY(-4px);
  box-shadow:0 12px 32px rgba(5,150,105,0.12);
  border-color:rgba(5,150,105,0.2);
}
.sl-item-top{display:flex;align-items:flex-start;gap:14px;margin-bottom:14px;}
.sl-item-ico{
  width:44px;height:44px;border-radius:13px;flex-shrink:0;
  background:linear-gradient(135deg,#d1fae5,#a7f3d0);
  display:flex;align-items:center;justify-content:center;
}
.sl-item-info{flex:1;}
.sl-item-label{font-size:16px;font-weight:800;color:#1e293b;margin-bottom:5px;}
.sl-item-meta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.sl-item-meta span{display:flex;align-items:center;gap:4px;font-size:12px;color:#94a3b8;font-weight:500;}
.sl-item-co{color:#0891b2 !important;font-weight:600 !important;}
.sl-item-actions{flex-shrink:0;}
.sl-del-btn{
  width:32px;height:32px;border-radius:9px;
  background:#fef2f2;border:1px solid #fecaca;
  color:#ef4444;font-size:13px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:all 0.2s;
}
.sl-del-btn:hover:not(:disabled){background:#fee2e2;transform:scale(1.1);}
.sl-del-btn:disabled{opacity:0.6;cursor:not-allowed;}

.sl-item-totals{
  display:flex;gap:8px;margin-bottom:12px;
}
.sl-total{
  flex:1;display:flex;flex-direction:column;gap:2px;
  padding:10px 12px;border-radius:11px;
}
.sl-total--purple{background:#f5f3ff;}
.sl-total--teal{background:#f0fdf4;}
.sl-total--amber{background:#fffbeb;}
.sl-total-lbl{font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;}
.sl-total-val{font-size:14px;font-weight:800;color:#1e293b;}

.sl-item-arrow{
  display:flex;align-items:center;gap:6px;
  font-size:12px;font-weight:700;color:#059669;
}

/* ── Session Detail ── */
.sd-root{display:flex;flex-direction:column;height:100%;background:#f1f5f9;}
.sd-header{
  position:relative;overflow:hidden;flex-shrink:0;
  background:linear-gradient(135deg,#1e1b4b,#1a237e,#1565c0);
}
.sd-header-bg{
  position:absolute;inset:0;
  background:linear-gradient(135deg,#0f0c29,#1e1b4b,#1a237e,#0d47a1);
  background-size:300% 300%;animation:sdGrad 12s ease infinite;
}
.sd-header-body{position:relative;z-index:1;padding:18px 24px 16px;}
.sd-header-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.sd-back-btn{
  display:flex;align-items:center;gap:7px;
  padding:8px 16px;border-radius:10px;border:none;cursor:pointer;
  background:rgba(255,255,255,0.12);
  border:1px solid rgba(255,255,255,0.2);
  color:rgba(255,255,255,0.85);font-size:13px;font-weight:600;
  transition:all 0.2s;
}
.sd-back-btn:hover{background:rgba(255,255,255,0.2);}
.sd-header-actions{display:flex;gap:8px;}
.sd-action-btn{
  display:flex;align-items:center;gap:7px;
  padding:8px 16px;border-radius:10px;border:none;cursor:pointer;
  font-size:13px;font-weight:700;
  transition:all 0.25s;
}
.sd-action-btn--csv{
  background:rgba(5,150,105,0.2);
  border:1px solid rgba(5,150,105,0.3);color:#6ee7b7;
}
.sd-action-btn--csv:hover{background:rgba(5,150,105,0.35);}
.sd-action-btn--print{
  background:rgba(59,130,246,0.2);
  border:1px solid rgba(59,130,246,0.3);color:#93c5fd;
}
.sd-action-btn--print:hover{background:rgba(59,130,246,0.35);}
.sd-header-info{display:flex;align-items:center;gap:14px;}
.sd-header-ico{
  width:46px;height:46px;border-radius:13px;flex-shrink:0;
  background:linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.08));
  border:1px solid rgba(255,255,255,0.2);
  display:flex;align-items:center;justify-content:center;
}
.sd-header-title{font-size:19px;font-weight:900;color:#fff;margin-bottom:5px;}
.sd-header-meta{display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.sd-header-meta span{display:flex;align-items:center;gap:4px;font-size:12px;color:rgba(255,255,255,0.55);font-weight:500;}

/* Totals bar */
.sd-totals-bar{
  position:relative;z-index:1;
  display:flex;gap:0;
  border-top:1px solid rgba(255,255,255,0.1);
}
.sd-total-chip{
  flex:1;display:flex;align-items:center;gap:10px;
  padding:13px 16px;
  border-left:1px solid rgba(255,255,255,0.08);
}
.sd-total-chip:last-child{border-left:none;}
.sd-total-chip-ico{
  width:32px;height:32px;border-radius:9px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
}
.sd-total-chip--purple .sd-total-chip-ico{background:rgba(129,140,248,0.2);}
.sd-total-chip--teal   .sd-total-chip-ico{background:rgba(52,211,153,0.2);}
.sd-total-chip--amber  .sd-total-chip-ico{background:rgba(251,191,36,0.2);}
.sd-total-chip--blue   .sd-total-chip-ico{background:rgba(96,165,250,0.2);}
.sd-total-chip-lbl{font-size:10px;color:rgba(255,255,255,0.5);font-weight:600;text-transform:uppercase;letter-spacing:0.4px;}
.sd-total-chip-val{font-size:16px;font-weight:900;color:#fff;line-height:1.2;}

.sd-body{flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:16px;}

/* Add form */
.sd-add-card{
  background:#fff;border-radius:18px;padding:20px 22px;
  border:1px solid #f1f5f9;
  box-shadow:0 2px 16px rgba(0,0,0,0.05);
  animation:sdFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both;
}
.sd-add-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:#1e293b;margin-bottom:16px;}
.sd-warn{display:flex;align-items:center;gap:8px;padding:11px 14px;border-radius:10px;background:#fffbeb;border:1px solid #fef3c7;font-size:13px;font-weight:500;color:#92400e;}
.sd-add-form{display:flex;flex-direction:column;gap:14px;}

.sd-currencies{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
.sd-field{display:flex;flex-direction:column;gap:7px;}
.sd-label{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;}
.sd-cur-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.sd-cur-dot--purple{background:#818cf8;}
.sd-cur-dot--teal{background:#34d399;}
.sd-cur-dot--amber{background:#fbbf24;}

.sd-input-wrap{
  border:1.5px solid #e2e8f0;border-radius:12px;
  background:#f8fafc;transition:all 0.22s;
}
.sd-input-wrap--purple:focus-within{border-color:#818cf8;background:#fff;box-shadow:0 0 0 4px rgba(129,140,248,0.1);}
.sd-input-wrap--teal:focus-within{border-color:#34d399;background:#fff;box-shadow:0 0 0 4px rgba(52,211,153,0.1);}
.sd-input-wrap--amber:focus-within{border-color:#fbbf24;background:#fff;box-shadow:0 0 0 4px rgba(251,191,36,0.1);}
.sd-input{width:100%;padding:12px 14px;border:none;background:transparent;font-size:15px;color:#1e293b;text-align:right;border-radius:12px;}
.sd-input:focus{outline:none;}
.sd-select-wrap{
  position:relative;border:1.5px solid #e2e8f0;border-radius:12px;
  background:#f8fafc;transition:all 0.22s;
}
.sd-select-wrap:focus-within{border-color:#059669;background:#fff;box-shadow:0 0 0 4px rgba(5,150,105,0.1);}
.sd-input-ico{position:absolute;right:13px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:13px;pointer-events:none;}
.sd-select{width:100%;padding:12px 38px 12px 14px;border:none;background:transparent;font-size:14px;color:#1e293b;text-align:right;border-radius:12px;appearance:none;cursor:pointer;}
.sd-select:focus{outline:none;}
.sd-submit-btn{
  display:flex;align-items:center;justify-content:center;gap:8px;
  padding:13px;border-radius:12px;border:none;
  background:linear-gradient(135deg,#059669,#10b981);
  color:#fff;font-size:15px;font-weight:700;cursor:pointer;
  box-shadow:0 4px 16px rgba(5,150,105,0.35);
  transition:all 0.25s;
}
.sd-submit-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 24px rgba(5,150,105,0.45);}
.sd-submit-btn:disabled{opacity:0.6;cursor:not-allowed;}

/* Empty */
.sd-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;gap:10px;animation:sdFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both;}
.sd-empty-ico{width:72px;height:72px;border-radius:20px;background:linear-gradient(135deg,#f0fdf4,#dcfce7);display:flex;align-items:center;justify-content:center;margin-bottom:4px;}
.sd-empty-title{font-size:15px;font-weight:800;color:#1e293b;}
.sd-empty-sub{font-size:13px;color:#94a3b8;}

/* Table */
.sd-table-card{
  background:#fff;border-radius:18px;
  border:1px solid #f1f5f9;
  box-shadow:0 2px 16px rgba(0,0,0,0.05);
  overflow:hidden;
  animation:sdFadeUp 0.4s 0.1s cubic-bezier(0.22,1,0.36,1) both;
}
.sd-table-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 20px;border-bottom:1px solid #f8fafc;
}
.sd-table-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:#1e293b;}
.sd-table-count{
  display:inline-flex;align-items:center;justify-content:center;
  width:22px;height:22px;border-radius:6px;
  background:#f0fdf4;color:#059669;font-size:11px;font-weight:800;
}
.sd-table-wrap{overflow-x:auto;}
.sd-table{width:100%;border-collapse:collapse;}
.sd-table thead th{
  background:#f8fafc;padding:11px 16px;
  font-size:12px;font-weight:700;color:#64748b;
  text-align:right;border-bottom:1px solid #f1f5f9;
  text-transform:uppercase;letter-spacing:0.5px;
  white-space:nowrap;
}
.sd-tr{
  border-bottom:1px solid #f8fafc;
  transition:background 0.15s;
  animation:sdTrIn 0.3s cubic-bezier(0.22,1,0.36,1) both;
}
.sd-tr:hover{background:#fafafa;}
.sd-tr td{padding:12px 16px;vertical-align:middle;}
.sd-td-num{
  font-size:12px;font-weight:700;color:#94a3b8;
  width:40px;text-align:center;
}
.sd-td-rep{display:flex;align-items:center;gap:10px;}
.sd-td-ava{
  width:34px;height:34px;border-radius:10px;flex-shrink:0;
  background:linear-gradient(135deg,#059669,#34d399);
  display:flex;align-items:center;justify-content:center;
  font-size:14px;font-weight:800;color:#fff;
}
.sd-td-rep-name{font-size:14px;font-weight:700;color:#1e293b;}

.sd-amount{
  display:inline-flex;align-items:center;
  padding:4px 10px;border-radius:7px;
  font-size:13px;font-weight:700;
}
.sd-amount--purple{background:#f5f3ff;color:#4f46e5;}
.sd-amount--teal{background:#f0fdf4;color:#059669;}
.sd-amount--amber{background:#fffbeb;color:#d97706;}
.sd-amount--bold{font-size:14px !important;padding:6px 12px !important;}

.sd-edit-inp{
  width:100%;padding:7px 10px;border-radius:8px;
  font-size:13px;color:#1e293b;text-align:right;
}
.sd-edit-inp--purple{border:1.5px solid #818cf8;background:#f5f3ff;}
.sd-edit-inp--purple:focus{outline:none;box-shadow:0 0 0 3px rgba(129,140,248,0.15);}
.sd-edit-inp--teal{border:1.5px solid #34d399;background:#f0fdf4;}
.sd-edit-inp--teal:focus{outline:none;box-shadow:0 0 0 3px rgba(52,211,153,0.15);}
.sd-edit-inp--amber{border:1.5px solid #fbbf24;background:#fffbeb;}
.sd-edit-inp--amber:focus{outline:none;box-shadow:0 0 0 3px rgba(251,191,36,0.15);}

.sd-td-actions{display:flex;gap:6px;align-items:center;}
.sd-act-btn{
  width:30px;height:30px;border-radius:8px;border:none;
  display:flex;align-items:center;justify-content:center;
  font-size:12px;cursor:pointer;transition:all 0.2s;
}
.sd-act-btn--edit{background:#f5f3ff;color:#4f46e5;}
.sd-act-btn--edit:hover{background:#ede9fe;transform:scale(1.1);}
.sd-act-btn--del{background:#fef2f2;color:#ef4444;}
.sd-act-btn--del:hover:not(:disabled){background:#fee2e2;transform:scale(1.1);}
.sd-act-btn--del:disabled{opacity:0.6;cursor:not-allowed;}
.sd-act-btn--save{background:linear-gradient(135deg,#059669,#10b981);color:#fff;}
.sd-act-btn--save:hover{transform:scale(1.1);}
.sd-act-btn--cancel{background:#f8fafc;color:#94a3b8;border:1px solid #e2e8f0;}

.sd-tfoot-row td{
  padding:13px 16px;
  background:#f8fafc;
  border-top:2px solid #e2e8f0;
  font-weight:700;
}
.sd-tfoot-label{font-size:13px;font-weight:800;color:#1e293b;display:flex;align-items:center;}

/* Spinners */
.sl-spinner,.sd-spinner{
  width:16px;height:16px;
  border:2.5px solid rgba(255,255,255,0.3);
  border-top-color:#fff;border-radius:50%;
  animation:sdSpin 0.7s linear infinite;display:inline-block;
}
.sl-spinner--red,.sd-spinner--red{border:2px solid rgba(239,68,68,0.2);border-top-color:#ef4444;}
.sd-spinner--sm{width:14px;height:14px;border-width:2px;}

/* Responsive */
@media(max-width:768px){
  .sl-stats-bar{flex-wrap:wrap;}
  .sl-stat{flex:0 0 50%;border-bottom:1px solid rgba(255,255,255,0.08);}
  .sl-body,.sd-body{padding:16px 14px;}
  .sl-header-body,.sd-header-body{padding:18px 16px 12px;}
  .sl-form{grid-template-columns:1fr;}
  .sl-submit-btn{grid-column:span 1;}
  .sd-currencies{grid-template-columns:1fr;}
  .sd-totals-bar{flex-wrap:wrap;}
  .sd-total-chip{flex:0 0 50%;}
  .sd-table thead th:nth-child(1){display:none;}
  .sd-tr td:nth-child(1){display:none;}
}
@media(max-width:480px){
  .sl-stat{flex:0 0 100%;}
  .sd-total-chip{flex:0 0 100%;}
  .sd-header-actions span{display:none;}
  .sd-action-btn{padding:8px 12px;}
}
`;
