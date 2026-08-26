import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import { Spin, Empty } from "./SessionShared";
import "./SessionList.css";

function Fld({ label, icon, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          fontSize: 11,
          fontWeight: 700,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        <i className={icon} style={{ fontSize: 10, color: "#34d399" }} />
        {label}
      </label>
      <div
        style={{
          position: "relative",
          border: "1.5px solid #e2e8f0",
          borderRadius: 11,
          background: "#f8fafc",
          transition: "all 0.2s",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function SessionList({ onOpen }) {
  const uid = auth.currentUser?.uid;
  const sessions = useFirestoreCollection(uid && ["users", uid, "sessions"], {
    orderByField: "createdAt",
  });
  const companies = useFirestoreCollection(uid && ["users", uid, "companies"], {
    orderByField: "createdAt",
  });

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterCo, setFilterCo] = useState("");

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
      totalDepNewSYP: 0,
      totalDepUSD: 0,
      totalWthNewSYP: 0,
      totalWthUSD: 0,
      entriesCount: 0,
    });
    setLabel("");
    setShowForm(false);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      const snap = await getDocs(
        collection(db, "users", uid, "sessions", deleteTarget.id, "entries"),
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, "users", uid, "sessions", deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = sessions.filter((s) => (filterCo ? s.companyId === filterCo : true));
  const grand = {
    depNewSYP: sessions.reduce((a, s) => a + (s.totalDepNewSYP || 0), 0),
    depUSD: sessions.reduce((a, s) => a + (s.totalDepUSD || 0), 0),
    wthNewSYP: sessions.reduce((a, s) => a + (s.totalWthNewSYP || 0), 0),
    wthUSD: sessions.reduce((a, s) => a + (s.totalWthUSD || 0), 0),
  };

  return (
    <div className="sl-root">
      <div className="sl-header">
        <div className="sl-hbg" />
        <div className="sl-htop">
          <div className="sl-htop-l">
            <div className="sl-hico">
              <i className="fa-solid fa-folder-open" style={{ fontSize: 20, color: "#fff" }} />
            </div>
            <div>
              <h1 className="sl-htitle">الجلسات</h1>
              <p className="sl-hsub">تسجيل وتتبع جلسات الإيداع والسحب</p>
            </div>
          </div>
          <button className="sl-newbtn" onClick={() => setShowForm((f) => !f)}>
            <i className={`fa-solid fa-${showForm ? "xmark" : "plus"}`} />
            {showForm ? "إلغاء" : "جلسة جديدة"}
          </button>
        </div>
        <div className="sl-stats">
          {[
            {
              lbl: "إيداع ل.س",
              val: grand.depNewSYP.toLocaleString(),
              ic: "fa-solid fa-arrow-down",
              cl: "#a5b4fc",
            },
            {
              lbl: "إيداع دولار",
              val: `$${grand.depUSD.toLocaleString()}`,
              ic: "fa-solid fa-arrow-down",
              cl: "#fcd34d",
            },
            {
              lbl: "سحب ل.س",
              val: grand.wthNewSYP.toLocaleString(),
              ic: "fa-solid fa-arrow-up",
              cl: "#fca5a5",
            },
            {
              lbl: "سحب دولار",
              val: `$${grand.wthUSD.toLocaleString()}`,
              ic: "fa-solid fa-arrow-up",
              cl: "#f9a8d4",
            },
          ].map((st, i) => (
            <div key={i} className="sl-stat">
              <i className={st.ic} style={{ fontSize: 12, color: st.cl }} />
              <div>
                <div className="sl-stat-val">{st.val}</div>
                <div className="sl-stat-lbl">{st.lbl}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sl-body">
        {showForm && (
          <div className="sl-form-card">
            <div className="sl-form-title">
              <i className="fa-solid fa-folder-plus" style={{ color: "#059669", fontSize: 15 }} />
              إنشاء جلسة جديدة
            </div>
            {companies.length === 0 ? (
              <div className="warn-box">
                <i className="fa-solid fa-triangle-exclamation" />
                يجب إضافة شركة أولاً
              </div>
            ) : (
              <form onSubmit={handleAdd} className="sl-form">
                <Fld label="اسم الجلسة" icon="fa-solid fa-folder">
                  <input
                    className="inp"
                    placeholder="مثال: صندوق الصباح"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    required
                  />
                </Fld>
                <Fld label="الشركة" icon="fa-solid fa-building">
                  <select
                    className="inp"
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    required
                    style={{ appearance: "none", cursor: "pointer" }}
                  >
                    <option value="">اختر الشركة...</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Fld>
                <Fld label="التاريخ" icon="fa-regular fa-calendar">
                  <input
                    className="inp"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </Fld>
                <button
                  type="submit"
                  className="btn-green"
                  disabled={loading}
                  style={{ alignSelf: "flex-end" }}
                >
                  {loading ? (
                    <>
                      <Spin />
                      جاري...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-folder-plus" />
                      إنشاء
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {sessions.length > 0 && companies.length > 1 && (
          <div className="filter-row">
            <i className="fa-solid fa-filter" style={{ color: "#94a3b8", fontSize: 13 }} />
            <select
              className="filter-sel"
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

        {sessions.length === 0 ? (
          <Empty
            icon="fa-solid fa-folder-open"
            title="لا توجد جلسات بعد"
            sub="أنشئ جلستك الأولى من الزر أعلاه"
            color="#86efac"
          />
        ) : (
          <div className="sl-list">
            {filtered.map((s, i) => (
              <div
                key={s.id}
                className="sl-card"
                onClick={() => onOpen(s)}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="sl-card-top">
                  <div className="sl-card-ico">
                    <i
                      className="fa-solid fa-folder-open"
                      style={{ fontSize: 17, color: "#059669" }}
                    />
                  </div>
                  <div className="sl-card-info">
                    <div className="sl-card-label">{s.label}</div>
                    <div className="sl-card-meta">
                      <span className="meta-co">
                        <i className="fa-solid fa-building" style={{ fontSize: 9 }} />
                        {s.companyName}
                      </span>
                      <span className="meta-item">
                        <i className="fa-regular fa-calendar" style={{ fontSize: 9 }} />
                        {s.date}
                      </span>
                      <span className="meta-item">
                        <i className="fa-solid fa-list" style={{ fontSize: 9 }} />
                        {s.entriesCount || 0} إدخال
                      </span>
                    </div>
                  </div>
                  <button
                    className="del-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(s);
                    }}
                    disabled={deleting === s.id}
                  >
                    {deleting === s.id ? <Spin red /> : <i className="fa-solid fa-trash" />}
                  </button>
                </div>
                <div className="sl-card-amounts">
                  <div className="amount-group amount-group--dep">
                    <div className="amount-group-label">
                      <i className="fa-solid fa-arrow-down" />
                      إيداع
                    </div>
                    <div className="amount-chips">
                      <span className="chip chip--purple">
                        {(s.totalDepNewSYP || 0).toLocaleString()} <em>ل.س</em>
                      </span>
                      <span className="chip chip--amber">
                        ${(s.totalDepUSD || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="amount-divider" />
                  <div className="amount-group amount-group--wth">
                    <div className="amount-group-label">
                      <i className="fa-solid fa-arrow-up" />
                      سحب
                    </div>
                    <div className="amount-chips">
                      <span className="chip chip--red">
                        {(s.totalWthNewSYP || 0).toLocaleString()} <em>ل.س</em>
                      </span>
                      <span className="chip chip--pink">
                        ${(s.totalWthUSD || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="sl-card-open">
                  <i className="fa-solid fa-arrow-left" />
                  فتح الجلسة
                </div>
              </div>
            ))}
          </div>
        )}

        <ConfirmDeleteDialog
          open={Boolean(deleteTarget)}
          title="تأكيد حذف الجلسة"
          message={`سيتم حذف جلسة "${deleteTarget?.label || ""}" مع كل الإدخالات المرتبطة بها.`}
          confirmLabel="حذف الجلسة"
          loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
