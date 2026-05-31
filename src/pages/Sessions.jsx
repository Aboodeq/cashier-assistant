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
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog";

export default function Sessions() {
  const [view, setView] = useState("list");
  const [session, setSession] = useState(null);
  const [entryTab, setEntryTab] = useState("deposit");

  const openDetail = (s) => {
    setSession(s);
    setView("detail");
  };
  const openEntries = (s, tab) => {
    setSession(s);
    setEntryTab(tab);
    setView("entries");
  };
  const goBack = () => setView("list");
  const goDetail = () => setView("detail");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <style>{CSS}</style>
      {view === "list" && <SessionList onOpen={openDetail} />}
      {view === "detail" && (
        <SessionDetail session={session} onBack={goBack} onOpenEntries={openEntries} />
      )}
      {view === "entries" && (
        <EntriesPage session={session} onBack={goDetail} defaultTab={entryTab} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   SESSION LIST
════════════════════════════════════════════ */
function SessionList({ onOpen }) {
  const [sessions, setSessions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterCo, setFilterCo] = useState("");
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const u1 = onSnapshot(
      query(collection(db, "users", uid, "sessions"), orderBy("createdAt", "desc")),
      (s) => setSessions(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const u2 = onSnapshot(
      query(collection(db, "users", uid, "companies"), orderBy("createdAt", "desc")),
      (s) => setCompanies(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
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
      totalDepNewSYP: 0,
      totalDepOldSYP: 0,
      totalDepUSD: 0,
      totalWthNewSYP: 0,
      totalWthOldSYP: 0,
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
    depOldSYP: sessions.reduce((a, s) => a + (s.totalDepOldSYP || 0), 0),
    depUSD: sessions.reduce((a, s) => a + (s.totalDepUSD || 0), 0),
    wthNewSYP: sessions.reduce((a, s) => a + (s.totalWthNewSYP || 0), 0),
    wthOldSYP: sessions.reduce((a, s) => a + (s.totalWthOldSYP || 0), 0),
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
              lbl: "إيداع ل.س جديد",
              val: grand.depNewSYP.toLocaleString(),
              ic: "fa-solid fa-arrow-down",
              cl: "#a5b4fc",
            },
            {
              lbl: "إيداع ل.س قديم",
              val: grand.depOldSYP.toLocaleString(),
              ic: "fa-solid fa-arrow-down",
              cl: "#6ee7b7",
            },
            {
              lbl: "إيداع دولار",
              val: `$${grand.depUSD.toLocaleString()}`,
              ic: "fa-solid fa-arrow-down",
              cl: "#fcd34d",
            },
            {
              lbl: "سحب ل.س جديد",
              val: grand.wthNewSYP.toLocaleString(),
              ic: "fa-solid fa-arrow-up",
              cl: "#fca5a5",
            },
            {
              lbl: "سحب ل.س قديم",
              val: grand.wthOldSYP.toLocaleString(),
              ic: "fa-solid fa-arrow-up",
              cl: "#fdba74",
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
                        {(s.totalDepNewSYP || 0).toLocaleString()} <em>جديد</em>
                      </span>
                      <span className="chip chip--teal">
                        {(s.totalDepOldSYP || 0).toLocaleString()} <em>قديم</em>
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
                        {(s.totalWthNewSYP || 0).toLocaleString()} <em>جديد</em>
                      </span>
                      <span className="chip chip--orange">
                        {(s.totalWthOldSYP || 0).toLocaleString()} <em>قديم</em>
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

/* ════════════════════════════════════════════
   SESSION DETAIL
════════════════════════════════════════════ */
function SessionDetail({ session, onBack, onOpenEntries }) {
  const [entries, setEntries] = useState([]);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid || !session) return;
    const u = onSnapshot(
      query(
        collection(db, "users", uid, "sessions", session.id, "entries"),
        orderBy("createdAt", "asc"),
      ),
      (s) => setEntries(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return () => u();
  }, [session]);

  const deps = entries.filter((e) => e.type === "deposit");
  const wths = entries.filter((e) => e.type === "withdrawal");
  const calc = (arr) => ({
    newSYP: arr.reduce((a, e) => a + (Number(e.newSYP) || 0), 0),
    oldSYP: arr.reduce((a, e) => a + (Number(e.oldSYP) || 0), 0),
    usd: arr.reduce((a, e) => a + (Number(e.usd) || 0), 0),
  });
  const dT = calc(deps);
  const wT = calc(wths);
  const nT = { newSYP: dT.newSYP - wT.newSYP, oldSYP: dT.oldSYP - wT.oldSYP, usd: dT.usd - wT.usd };

  return (
    <div className="sd-root">
      <div className="sd-header">
        <div className="sd-hbg" />
        <div className="sd-htop">
          <button className="back-btn" onClick={onBack}>
            <i className="fa-solid fa-arrow-right" />
            العودة
          </button>
          <div className="sd-hmeta-row">
            <span>
              <i className="fa-solid fa-building" style={{ fontSize: 10 }} />
              {session.companyName}
            </span>
            <span>
              <i className="fa-regular fa-calendar" style={{ fontSize: 10 }} />
              {session.date}
            </span>
            <span>
              <i className="fa-solid fa-list" style={{ fontSize: 10 }} />
              {entries.length} إدخال
            </span>
          </div>
        </div>
        <div className="sd-hinfo">
          <div className="sd-hico">
            <i className="fa-solid fa-folder-open" style={{ fontSize: 18, color: "#fff" }} />
          </div>
          <h1 className="sd-htitle">{session.label}</h1>
        </div>
        <div className="sd-net-bar">
          {[
            { lbl: "صافي ل.س جديد", val: nT.newSYP.toLocaleString(), pos: nT.newSYP >= 0 },
            { lbl: "صافي ل.س قديم", val: nT.oldSYP.toLocaleString(), pos: nT.oldSYP >= 0 },
            { lbl: "صافي دولار", val: `$${nT.usd.toLocaleString()}`, pos: nT.usd >= 0 },
            { lbl: "إيداع / سحب", val: `${deps.length} / ${wths.length}`, neutral: true },
          ].map((n, i) => (
            <div key={i} className="sd-net-chip">
              <div className="sd-net-lbl">{n.lbl}</div>
              <div
                className={`sd-net-val ${n.neutral ? "" : "sd-net-val--" + (n.pos ? "pos" : "neg")}`}
              >
                {n.val}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sd-body">
        <div className="sd-summary-grid">
          <div className="sd-sum-card sd-sum-card--dep">
            <div className="sd-sum-card-header">
              <div className="sd-sum-card-ico sd-sum-card-ico--dep">
                <i className="fa-solid fa-arrow-down" style={{ fontSize: 16, color: "#059669" }} />
              </div>
              <div>
                <div className="sd-sum-card-title">الإيداعات</div>
                <div className="sd-sum-card-count">{deps.length} إدخال</div>
              </div>
            </div>
            <div className="sd-sum-amounts">
              {[
                { lbl: "ل.س جديد", val: dT.newSYP.toLocaleString(), cls: "sd-sum-val--purple" },
                { lbl: "ل.س قديم", val: dT.oldSYP.toLocaleString(), cls: "sd-sum-val--teal" },
                { lbl: "دولار", val: `$${dT.usd.toLocaleString()}`, cls: "sd-sum-val--amber" },
              ].map((a, i) => (
                <div key={i} className="sd-sum-amount">
                  <span className="sd-sum-lbl">{a.lbl}</span>
                  <span className={`sd-sum-val ${a.cls}`}>{a.val}</span>
                </div>
              ))}
            </div>
            <button
              className="sd-sum-btn sd-sum-btn--dep"
              onClick={() => onOpenEntries(session, "deposit")}
            >
              <i className="fa-solid fa-table-list" />
              عرض وإدارة الإيداعات
              <i
                className="fa-solid fa-arrow-left"
                style={{ marginRight: "auto", marginLeft: 0 }}
              />
            </button>
          </div>

          <div className="sd-sum-card sd-sum-card--wth">
            <div className="sd-sum-card-header">
              <div className="sd-sum-card-ico sd-sum-card-ico--wth">
                <i className="fa-solid fa-arrow-up" style={{ fontSize: 16, color: "#dc2626" }} />
              </div>
              <div>
                <div className="sd-sum-card-title">السحوبات</div>
                <div className="sd-sum-card-count">{wths.length} إدخال</div>
              </div>
            </div>
            <div className="sd-sum-amounts">
              {[
                { lbl: "ل.س جديد", val: wT.newSYP.toLocaleString(), cls: "sd-sum-val--red" },
                { lbl: "ل.س قديم", val: wT.oldSYP.toLocaleString(), cls: "sd-sum-val--orange" },
                { lbl: "دولار", val: `$${wT.usd.toLocaleString()}`, cls: "sd-sum-val--pink" },
              ].map((a, i) => (
                <div key={i} className="sd-sum-amount">
                  <span className="sd-sum-lbl">{a.lbl}</span>
                  <span className={`sd-sum-val ${a.cls}`}>{a.val}</span>
                </div>
              ))}
            </div>
            <button
              className="sd-sum-btn sd-sum-btn--wth"
              onClick={() => onOpenEntries(session, "withdrawal")}
            >
              <i className="fa-solid fa-table-list" />
              عرض وإدارة السحوبات
              <i
                className="fa-solid fa-arrow-left"
                style={{ marginRight: "auto", marginLeft: 0 }}
              />
            </button>
          </div>
        </div>

        <div className="sd-net-card">
          <div className="sd-net-card-title">
            <i className="fa-solid fa-scale-balanced" style={{ color: "#818cf8", fontSize: 15 }} />
            الصافي الإجمالي
          </div>
          <div className="sd-net-amounts">
            {[
              { lbl: "صافي ل.س جديد", val: nT.newSYP.toLocaleString(), pos: nT.newSYP >= 0 },
              { lbl: "صافي ل.س قديم", val: nT.oldSYP.toLocaleString(), pos: nT.oldSYP >= 0 },
              { lbl: "صافي دولار", val: `$${nT.usd.toLocaleString()}`, pos: nT.usd >= 0 },
            ].map((n, i) => (
              <div key={i} className="sd-net-amount">
                <span className="sd-net-amount-lbl">{n.lbl}</span>
                <span
                  className={`sd-net-amount-val ${n.pos ? "sd-net-amount-val--pos" : "sd-net-amount-val--neg"}`}
                >
                  {n.pos && n.val !== "0" && n.val !== "$0" ? "+" : ""}
                  {n.val}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="sd-quick-actions">
          <button
            className="sd-qa-btn sd-qa-btn--dep"
            onClick={() => onOpenEntries(session, "deposit")}
          >
            <i className="fa-solid fa-plus" />
            إضافة إيداع
          </button>
          <button
            className="sd-qa-btn sd-qa-btn--wth"
            onClick={() => onOpenEntries(session, "withdrawal")}
          >
            <i className="fa-solid fa-plus" />
            إضافة سحب
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   ENTRIES PAGE
════════════════════════════════════════════ */
function EntriesPage({ session, onBack, defaultTab }) {
  const [entries, setEntries] = useState([]);
  const [reps, setReps] = useState([]);
  const [tab, setTab] = useState(defaultTab || "deposit");
  const [repId, setRepId] = useState("");
  const [withdrawalName, setWithdrawalName] = useState("");
  const [newSYP, setNewSYP] = useState("");
  const [oldSYP, setOldSYP] = useState("");
  const [usd, setUsd] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [printDialog, setPrintDialog] = useState(false);
  const [printMode, setPrintMode] = useState(null);
  const printRef = useRef(null);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid || !session) return;
    const u1 = onSnapshot(
      query(
        collection(db, "users", uid, "sessions", session.id, "entries"),
        orderBy("createdAt", "asc"),
      ),
      (s) => setEntries(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    const u2 = onSnapshot(
      query(collection(db, "users", uid, "representatives"), orderBy("createdAt", "desc")),
      (s) => setReps(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
    return () => {
      u1();
      u2();
    };
  }, [session]);

  const companyReps = reps.filter((r) => r.companyId === session.companyId);
  const deps = entries.filter((e) => e.type === "deposit");
  const wths = entries.filter((e) => e.type === "withdrawal");
  const shown = tab === "deposit" ? deps : wths;
  const calc = (arr) => ({
    newSYP: arr.reduce((a, e) => a + (Number(e.newSYP) || 0), 0),
    oldSYP: arr.reduce((a, e) => a + (Number(e.oldSYP) || 0), 0),
    usd: arr.reduce((a, e) => a + (Number(e.usd) || 0), 0),
  });
  const curT = calc(shown);
  const dT = calc(deps);
  const wT = calc(wths);
  const nT = { newSYP: dT.newSYP - wT.newSYP, oldSYP: dT.oldSYP - wT.oldSYP, usd: dT.usd - wT.usd };

  const syncTotals = async (updated) => {
    const d = calc(updated.filter((e) => e.type === "deposit"));
    const w = calc(updated.filter((e) => e.type === "withdrawal"));
    await updateDoc(doc(db, "users", uid, "sessions", session.id), {
      totalDepNewSYP: d.newSYP,
      totalDepOldSYP: d.oldSYP,
      totalDepUSD: d.usd,
      totalWthNewSYP: w.newSYP,
      totalWthOldSYP: w.oldSYP,
      totalWthUSD: w.usd,
      entriesCount: updated.length,
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const isWithdrawal = tab === "withdrawal";
    const typedName = withdrawalName.trim();
    if (isWithdrawal ? !typedName : !repId) return;
    setLoading(true);
    const rep = isWithdrawal ? null : reps.find((r) => r.id === repId);
    const entry = {
      repId: isWithdrawal ? "" : repId,
      repName: isWithdrawal ? typedName : rep?.name || "",
      type: tab,
      newSYP: Number(newSYP) || 0,
      oldSYP: Number(oldSYP) || 0,
      usd: Number(usd) || 0,
      note: note.trim(),
      createdAt: Date.now(),
    };
    await addDoc(collection(db, "users", uid, "sessions", session.id, "entries"), entry);
    await syncTotals([...entries, entry]);
    setRepId("");
    setWithdrawalName("");
    setNewSYP("");
    setOldSYP("");
    setUsd("");
    setNote("");
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await deleteDoc(doc(db, "users", uid, "sessions", session.id, "entries", deleteTarget.id));
      const updated = entries.filter((e) => e.id !== deleteTarget.id);
      await syncTotals(updated);
      setDeleteTarget(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = async (id) => {
    await updateDoc(doc(db, "users", uid, "sessions", session.id, "entries", id), {
      newSYP: Number(editData.newSYP) || 0,
      oldSYP: Number(editData.oldSYP) || 0,
      usd: Number(editData.usd) || 0,
      note: editData.note || "",
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
    await syncTotals(updated);
    setEditId(null);
  };

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => {
      const content = printRef.current?.innerHTML || "";
      const w = window.open("", "_blank");
      w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>تقرير — ${session.label}</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap" rel="stylesheet">
        <style>
          *{margin:0;padding:0;box-sizing:border-box;}
          html,body{font-family:'Tajawal',sans-serif;direction:rtl;background:#fff;color:#0f172a;font-size:13px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}

          /* ── page wrapper ── */
          .page{max-width:210mm;margin:0 auto;padding:28px 32px;}

          /* ── header ── */
          .ph{
            display:flex;align-items:center;justify-content:space-between;
            margin-bottom:28px;padding-bottom:20px;
            border-bottom:2px solid #e2e8f0;
          }
          .ph-brand{display:flex;align-items:center;gap:12px;}
          .ph-brand-ico{
            width:44px;height:44px;border-radius:12px;
            background:linear-gradient(135deg,#1e1b4b,#3730a3);
            display:flex;align-items:center;justify-content:center;
            font-size:20px;color:#fff;flex-shrink:0;
          }
          .ph-brand-name{font-size:20px;font-weight:900;color:#0f172a;letter-spacing:-0.5px;}
          .ph-brand-sub{font-size:11px;color:#64748b;font-weight:400;margin-top:1px;}
          .ph-badge{
            padding:6px 14px;border-radius:99px;font-size:12px;font-weight:700;
          }
          .ph-badge--dep{background:#f0fdf4;color:#059669;border:1px solid #bbf7d0;}
          .ph-badge--wth{background:#fef2f2;color:#dc2626;border:1px solid #fecaca;}
          .ph-badge--all{background:#f5f3ff;color:#4f46e5;border:1px solid #ddd6fe;}

          /* ── meta info cards ── */
          .pi{display:flex;gap:8px;margin-bottom:20px;}
          .pi-card{flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;}
          .pi-lbl{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;}
          .pi-val{font-size:14px;font-weight:800;color:#0f172a;}

          /* ── summary boxes ── */
          .ps-section{margin-bottom:20px;}
          .ps-section-title{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;}
          .ps-grid{display:flex;gap:8px;}
          .ps-box{flex:1;padding:14px 16px;border-radius:12px;display:flex;flex-direction:column;gap:3px;}
          .ps-box--dep{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #86efac;}
          .ps-box--wth{background:linear-gradient(135deg,#fef2f2,#fee2e2);border:1px solid #fca5a5;}
          .ps-box--net{background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:1px solid #c4b5fd;}
          .ps-lbl{font-size:10px;font-weight:600;color:#475569;}
          .ps-val{font-size:18px;font-weight:900;color:#0f172a;letter-spacing:-0.5px;}
          .ps-sub{font-size:9px;color:#94a3b8;font-weight:500;}
          .ps-net{margin-top:4px;padding-top:6px;border-top:1px solid rgba(15,23,42,0.08);font-size:9px;color:#64748b;font-weight:700;}
          .ps-net-val{font-size:11px;font-weight:900;margin-right:4px;}
          .ps-net-val--pos{color:#059669;}
          .ps-net-val--neg{color:#dc2626;}
          .ps-net-val--zero{color:#94a3b8;}

          /* ── section divider ── */
          .sec-hdr{
            display:flex;align-items:center;gap:10px;
            margin:24px 0 12px;
          }
          .sec-hdr-bar{width:4px;height:18px;border-radius:2px;flex-shrink:0;}
          .sec-hdr-bar--dep{background:linear-gradient(180deg,#059669,#10b981);}
          .sec-hdr-bar--wth{background:linear-gradient(180deg,#dc2626,#ef4444);}
          .sec-hdr-title{font-size:14px;font-weight:800;color:#0f172a;}
          .sec-hdr-count{
            margin-right:4px;padding:2px 10px;border-radius:99px;
            font-size:11px;font-weight:700;
          }
          .sec-hdr-count--dep{background:#dcfce7;color:#059669;}
          .sec-hdr-count--wth{background:#fee2e2;color:#dc2626;}

          /* ── table ── */
          .tbl-wrap{border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:8px;}
          table{width:100%;border-collapse:collapse;}
          thead tr{background:linear-gradient(135deg,#1e1b4b,#312e81);}
          th{padding:10px 13px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.9);text-align:right;white-space:nowrap;letter-spacing:0.3px;}
          td{padding:9px 13px;font-size:12px;border-bottom:1px solid #f1f5f9;color:#334155;vertical-align:middle;}
          tr:last-child td{border-bottom:none;}
          tbody tr:nth-child(even) td{background:#fafafa;}
          .dep-row td:first-child{border-right:3px solid #10b981;}
          .wth-row td:first-child{border-right:3px solid #ef4444;}

          /* ── rep cell ── */
          .rep-cell{display:flex;align-items:center;gap:8px;}
          .rep-ava{
            width:26px;height:26px;border-radius:7px;flex-shrink:0;
            display:flex;align-items:center;justify-content:center;
            font-size:11px;font-weight:800;color:#fff;
          }
          .rep-ava--dep{background:linear-gradient(135deg,#059669,#34d399);}
          .rep-ava--wth{background:linear-gradient(135deg,#dc2626,#f87171);}
          .rep-name{font-size:12px;font-weight:700;color:#0f172a;}

          /* ── amount badges ── */
          .amt{display:inline-flex;padding:2px 8px;border-radius:5px;font-size:12px;font-weight:700;white-space:nowrap;}
          .amt--purple{background:#f5f3ff;color:#4f46e5;}
          .amt--teal{background:#f0fdf4;color:#059669;}
          .amt--amber{background:#fffbeb;color:#d97706;}
          .amt--red{background:#fef2f2;color:#dc2626;}
          .amt--orange{background:#fff7ed;color:#ea580c;}
          .amt--pink{background:#fdf2f8;color:#be185d;}
          .note-cell{font-size:11px;color:#94a3b8;font-style:italic;}

          /* ── totals row ── */
          .tot-row td{
            font-weight:800;font-size:13px;
            background:linear-gradient(135deg,#f8fafc,#f1f5f9) !important;
            border-top:2px solid #e2e8f0;
          }
          .tot-label{font-size:12px;font-weight:800;color:#0f172a;}

          /* ── net summary at bottom ── */
          .net-section{
            margin-top:20px;padding:16px 20px;
            background:linear-gradient(135deg,#f5f3ff,#ede9fe);
            border:1px solid #c4b5fd;border-radius:14px;
            display:flex;align-items:center;gap:20px;
          }
          .net-section-title{font-size:12px;font-weight:700;color:#4f46e5;white-space:nowrap;}
          .net-items{display:flex;gap:20px;flex:1;flex-wrap:wrap;}
          .net-item{display:flex;flex-direction:column;gap:2px;}
          .net-lbl{font-size:10px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;}
          .net-val{font-size:16px;font-weight:900;letter-spacing:-0.5px;}
          .net-val--pos{color:#059669;}
          .net-val--neg{color:#dc2626;}
          .net-val--zero{color:#94a3b8;}

          /* ── footer ── */
          .pf{
            margin-top:28px;padding-top:16px;
            border-top:1px solid #e2e8f0;
            display:flex;align-items:center;justify-content:space-between;
          }
          .pf-left{font-size:11px;color:#94a3b8;}
          .pf-right{font-size:11px;color:#94a3b8;font-weight:500;}

          @media print{
            body{padding:0;}
            .page{padding:16px 20px;max-width:100%;}
            @page{margin:1cm;size:A4;}
          }
        </style>
      </head><body>${content}</body></html>`);
      w.document.close();
      setTimeout(() => {
        w.print();
        w.close();
        setPrintMode(null);
      }, 500);
    }, 150);
  };

  const pRows = !printMode
    ? []
    : printMode === "all"
      ? entries
      : entries.filter((e) => e.type === printMode);
  const pDeps = pRows.filter((e) => e.type === "deposit");
  const pWths = pRows.filter((e) => e.type === "withdrawal");
  const pDT = calc(pDeps);
  const pWT = calc(pWths);
  const pNT = {
    newSYP: pDT.newSYP - pWT.newSYP,
    oldSYP: pDT.oldSYP - pWT.oldSYP,
    usd: pDT.usd - pWT.usd,
  };

  const fmtNet = (val, prefix = "") => {
    const s = val.toLocaleString();
    if (val > 0) return `+${prefix}${s}`;
    return `${prefix}${s}`;
  };
  const netTone = (val) =>
    val > 0 ? "ps-net-val--pos" : val < 0 ? "ps-net-val--neg" : "ps-net-val--zero";

  return (
    <div className="ep-root">
      {/* ── Header ── */}
      <div className="ep-header">
        <div className="ep-hbg" />
        <div className="ep-htop">
          <button className="back-btn" onClick={onBack}>
            <i className="fa-solid fa-arrow-right" />
            العودة للملخص
          </button>
          <button className="ep-print-btn" onClick={() => setPrintDialog(true)}>
            <i className="fa-solid fa-print" />
            طباعة
          </button>
        </div>
        <div className="ep-hinfo">
          <div className="ep-hico">
            <i className="fa-solid fa-table-list" style={{ fontSize: 16, color: "#fff" }} />
          </div>
          <div>
            <h1 className="ep-htitle">{session.label}</h1>
            <div className="ep-hmeta">
              <span>
                <i className="fa-solid fa-building" style={{ fontSize: 10 }} />
                {session.companyName}
              </span>
              <span>
                <i className="fa-regular fa-calendar" style={{ fontSize: 10 }} />
                {session.date}
              </span>
            </div>
          </div>
        </div>
        <div className="ep-net-bar">
          {[
            { lbl: "صافي ل.س جديد", val: nT.newSYP.toLocaleString(), pos: nT.newSYP >= 0 },
            { lbl: "صافي ل.س قديم", val: nT.oldSYP.toLocaleString(), pos: nT.oldSYP >= 0 },
            { lbl: "صافي دولار", val: `$${nT.usd.toLocaleString()}`, pos: nT.usd >= 0 },
            { lbl: "إيداع / سحب", val: `${deps.length} / ${wths.length}`, neutral: true },
          ].map((n, i) => (
            <div key={i} className="ep-net-chip">
              <div className="ep-net-lbl">{n.lbl}</div>
              <div
                className={`ep-net-val ${n.neutral ? "" : "ep-net-val--" + (n.pos ? "pos" : "neg")}`}
              >
                {n.val}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="ep-body">
        {/* Tabs */}
        <div className="ep-tabs">
          <button
            className={`ep-tab ${tab === "deposit" ? "ep-tab--dep" : ""}`}
            onClick={() => setTab("deposit")}
          >
            <i className="fa-solid fa-arrow-down" />
            إيداع
            <span className={`ep-tab-badge ${tab === "deposit" ? "ep-tab-badge--on-dep" : ""}`}>
              {deps.length}
            </span>
          </button>
          <button
            className={`ep-tab ${tab === "withdrawal" ? "ep-tab--wth" : ""}`}
            onClick={() => setTab("withdrawal")}
          >
            <i className="fa-solid fa-arrow-up" />
            سحب
            <span className={`ep-tab-badge ${tab === "withdrawal" ? "ep-tab-badge--on-wth" : ""}`}>
              {wths.length}
            </span>
          </button>
        </div>

        {/* Form */}
        <div
          className={`ep-form-card ${tab === "deposit" ? "ep-form-card--dep" : "ep-form-card--wth"}`}
        >
          <div className="ep-form-title">
            <i
              className={`fa-solid fa-${tab === "deposit" ? "arrow-down" : "arrow-up"}`}
              style={{ color: tab === "deposit" ? "#059669" : "#ef4444" }}
            />
            {tab === "deposit" ? "تسجيل إيداع جديد" : "تسجيل سحب جديد"}
          </div>
          {tab === "deposit" && companyReps.length === 0 ? (
            <div className="warn-box">
              <i className="fa-solid fa-triangle-exclamation" />
              لا يوجد مناديب لهذه الشركة
            </div>
          ) : (
            <form onSubmit={handleAdd}>
              <div className="ep-form-grid">
                <div className="ep-field">
                  <label className="ep-lbl">
                    <i className="fa-solid fa-user" />
                    {tab === "deposit" ? "المندوب" : "الاسم"}
                  </label>
                  <div
                    className={`ep-inp-wrap ${tab === "deposit" ? "ep-inp-wrap--dep" : "ep-inp-wrap--wth"}`}
                  >
                    <i className="fa-solid fa-user ep-ico" />
                    {tab === "deposit" ? (
                      <select
                        className="ep-inp"
                        value={repId}
                        onChange={(e) => setRepId(e.target.value)}
                        required
                        style={{ appearance: "none", cursor: "pointer", paddingRight: 34 }}
                      >
                        <option value="">اختر المندوب...</option>
                        {companyReps.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="ep-inp"
                        value={withdrawalName}
                        onChange={(e) => setWithdrawalName(e.target.value)}
                        placeholder="اكتب الاسم..."
                        required
                        style={{ paddingRight: 34 }}
                      />
                    )}
                  </div>
                </div>
                <div className="ep-field">
                  <label className="ep-lbl">
                    <span className="dot dot--purple" />
                    ل.س جديد
                  </label>
                  <div
                    className={`ep-inp-wrap ${tab === "deposit" ? "ep-inp-wrap--purple" : "ep-inp-wrap--red"}`}
                  >
                    <input
                      className="ep-inp"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={newSYP}
                      onChange={(e) => setNewSYP(e.target.value)}
                    />
                  </div>
                </div>
                <div className="ep-field">
                  <label className="ep-lbl">
                    <span className="dot dot--teal" />
                    ل.س قديم
                  </label>
                  <div
                    className={`ep-inp-wrap ${tab === "deposit" ? "ep-inp-wrap--teal" : "ep-inp-wrap--orange"}`}
                  >
                    <input
                      className="ep-inp"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={oldSYP}
                      onChange={(e) => setOldSYP(e.target.value)}
                    />
                  </div>
                </div>
                <div className="ep-field">
                  <label className="ep-lbl">
                    <span className="dot dot--amber" />
                    دولار
                  </label>
                  <div
                    className={`ep-inp-wrap ${tab === "deposit" ? "ep-inp-wrap--amber" : "ep-inp-wrap--pink"}`}
                  >
                    <input
                      className="ep-inp"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={usd}
                      onChange={(e) => setUsd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="ep-field ep-field--note">
                  <label className="ep-lbl">
                    <i className="fa-regular fa-note-sticky" />
                    ملاحظة
                  </label>
                  <div className="ep-inp-wrap">
                    <input
                      className="ep-inp"
                      placeholder="اختياري..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                </div>
                <div className="ep-field ep-field--submit">
                  <label className="ep-lbl" style={{ opacity: 0 }}>
                    _
                  </label>
                  <button
                    type="submit"
                    className={`ep-submit ${tab === "deposit" ? "ep-submit--dep" : "ep-submit--wth"}`}
                    disabled={loading || (tab === "deposit" ? !repId : !withdrawalName.trim())}
                  >
                    {loading ? (
                      <>
                        <Spin />
                        ...
                      </>
                    ) : (
                      <>
                        <i
                          className={`fa-solid fa-${tab === "deposit" ? "arrow-down" : "arrow-up"}`}
                        />
                        تسجيل
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Totals strip */}
        {shown.length > 0 && (
          <div className="ep-totals-strip">
            {[
              {
                lbl: "ل.س جديد",
                val: curT.newSYP.toLocaleString(),
                cls: tab === "deposit" ? "et--purple" : "et--red",
              },
              {
                lbl: "ل.س قديم",
                val: curT.oldSYP.toLocaleString(),
                cls: tab === "deposit" ? "et--teal" : "et--orange",
              },
              {
                lbl: "دولار",
                val: `$${curT.usd.toLocaleString()}`,
                cls: tab === "deposit" ? "et--amber" : "et--pink",
              },
              { lbl: "إدخالات", val: shown.length, cls: "et--neutral" },
            ].map((t, i) => (
              <div key={i} className={`ep-total-chip ${t.cls}`}>
                <span className="ep-total-lbl">{t.lbl}</span>
                <span className="ep-total-val">{t.val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        {shown.length === 0 ? (
          <Empty
            icon={`fa-solid fa-${tab === "deposit" ? "arrow-down" : "arrow-up"}`}
            title={`لا توجد ${tab === "deposit" ? "إيداعات" : "سحوبات"} بعد`}
            sub={`سجّل أول ${tab === "deposit" ? "إيداع" : "سحب"} من الحقل أعلاه`}
            color={tab === "deposit" ? "#86efac" : "#fca5a5"}
          />
        ) : (
          <div className="ep-table-section">
            <div className="ep-table-title-row">
              <div className="ep-table-title">
                <i
                  className={`fa-solid fa-${tab === "deposit" ? "arrow-down" : "arrow-up"}`}
                  style={{ color: tab === "deposit" ? "#059669" : "#ef4444" }}
                />
                {tab === "deposit" ? "سجل الإيداعات" : "سجل السحوبات"}
                <span
                  className={`tbl-badge ${tab === "deposit" ? "tbl-badge--dep" : "tbl-badge--wth"}`}
                >
                  {shown.length}
                </span>
              </div>
            </div>
            <div className="ep-tbl-outer">
              <table className="ep-tbl">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th>{tab === "deposit" ? "المندوب" : "الاسم"}</th>
                    <th>ل.س جديد</th>
                    <th>ل.س قديم</th>
                    <th>دولار</th>
                    <th>ملاحظة</th>
                    <th style={{ width: 80 }}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((e, i) => (
                    <tr
                      key={e.id}
                      className={`ep-tr ep-tr--${tab === "deposit" ? "dep" : "wth"}`}
                      style={{ animationDelay: `${i * 0.03}s` }}
                    >
                      <td className="td-num">{i + 1}</td>
                      <td>
                        <div className="td-rep">
                          <div className={`td-ava td-ava--${tab === "deposit" ? "dep" : "wth"}`}>
                            {e.repName?.charAt(0) || "؟"}
                          </div>
                          <span className="td-name">{e.repName}</span>
                        </div>
                      </td>
                      {editId === e.id ? (
                        <>
                          <td>
                            <input
                              className="td-edit td-edit--purple"
                              type="number"
                              value={editData.newSYP}
                              onChange={(v) =>
                                setEditData((p) => ({ ...p, newSYP: v.target.value }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              className="td-edit td-edit--teal"
                              type="number"
                              value={editData.oldSYP}
                              onChange={(v) =>
                                setEditData((p) => ({ ...p, oldSYP: v.target.value }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              className="td-edit td-edit--amber"
                              type="number"
                              value={editData.usd}
                              onChange={(v) => setEditData((p) => ({ ...p, usd: v.target.value }))}
                            />
                          </td>
                          <td>
                            <input
                              className="td-edit"
                              value={editData.note || ""}
                              onChange={(v) => setEditData((p) => ({ ...p, note: v.target.value }))}
                              placeholder="ملاحظة"
                            />
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <span
                              className={`tbl-amt tbl-amt--${tab === "deposit" ? "purple" : "red"}`}
                            >
                              {(e.newSYP || 0).toLocaleString()}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`tbl-amt tbl-amt--${tab === "deposit" ? "teal" : "orange"}`}
                            >
                              {(e.oldSYP || 0).toLocaleString()}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`tbl-amt tbl-amt--${tab === "deposit" ? "amber" : "pink"}`}
                            >
                              ${(e.usd || 0).toLocaleString()}
                            </span>
                          </td>
                          <td>
                            <span className="td-note">{e.note || "—"}</span>
                          </td>
                        </>
                      )}
                      <td>
                        <div className="td-acts">
                          {editId === e.id ? (
                            <>
                              <button
                                className="act-btn act-btn--save"
                                onClick={() => handleEdit(e.id)}
                              >
                                <i className="fa-solid fa-check" />
                              </button>
                              <button
                                className="act-btn act-btn--cancel"
                                onClick={() => setEditId(null)}
                              >
                                <i className="fa-solid fa-xmark" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="act-btn act-btn--edit"
                                onClick={() => {
                                  setEditId(e.id);
                                  setEditData({
                                    newSYP: e.newSYP || 0,
                                    oldSYP: e.oldSYP || 0,
                                    usd: e.usd || 0,
                                    note: e.note || "",
                                  });
                                }}
                              >
                                <i className="fa-solid fa-pen" />
                              </button>
                              <button
                                className="act-btn act-btn--del"
                                onClick={() => setDeleteTarget(e)}
                                disabled={deleting === e.id}
                              >
                                {deleting === e.id ? (
                                  <Spin red sm />
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
                  <tr className="ep-tfoot">
                    <td colSpan="2" className="ep-tfoot-lbl">
                      <i className="fa-solid fa-sigma" style={{ marginLeft: 5 }} />
                      الإجمالي
                    </td>
                    <td>
                      <span
                        className={`tbl-amt tbl-amt--bold tbl-amt--${tab === "deposit" ? "purple" : "red"}`}
                      >
                        {curT.newSYP.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`tbl-amt tbl-amt--bold tbl-amt--${tab === "deposit" ? "teal" : "orange"}`}
                      >
                        {curT.oldSYP.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`tbl-amt tbl-amt--bold tbl-amt--${tab === "deposit" ? "amber" : "pink"}`}
                      >
                        ${curT.usd.toLocaleString()}
                      </span>
                    </td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
        <div style={{ height: 40 }} />
      </div>

      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title={`تأكيد حذف ${deleteTarget?.type === "withdrawal" ? "السحب" : "الإيداع"}`}
        message={`سيتم حذف هذا الإدخال${deleteTarget?.repName ? ` باسم "${deleteTarget.repName}"` : ""}.`}
        confirmLabel="حذف الإدخال"
        loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {/* ════ PRINT DIALOG ════ */}
      {printDialog && (
        <div className="pd-overlay" onClick={() => setPrintDialog(false)}>
          <div className="pd-box" onClick={(e) => e.stopPropagation()}>
            <div className="pd-header">
              <div className="pd-header-ico">
                <i className="fa-solid fa-print" style={{ fontSize: 18, color: "#4f46e5" }} />
              </div>
              <div>
                <div className="pd-title">اختر ما تريد طباعته</div>
                <div className="pd-subtitle">سيتم فتح نافذة الطباعة مباشرة</div>
              </div>
            </div>

            <div className="pd-options">
              <button
                className="pd-opt pd-opt--dep"
                onClick={() => {
                  setPrintDialog(false);
                  handlePrint("deposit");
                }}
              >
                <div className="pd-opt-ico pd-opt-ico--dep">
                  <i
                    className="fa-solid fa-arrow-down"
                    style={{ fontSize: 18, color: "#059669" }}
                  />
                </div>
                <div className="pd-opt-body">
                  <span className="pd-opt-title">الإيداعات فقط</span>
                  <span className="pd-opt-desc">
                    {deps.length} إدخال · ل.س جديد: {dT.newSYP.toLocaleString()} · ل.س قديم:{" "}
                    {dT.oldSYP.toLocaleString()} · ${dT.usd.toLocaleString()}
                  </span>
                </div>
                <i className="fa-solid fa-chevron-left pd-opt-arrow" />
              </button>

              <button
                className="pd-opt pd-opt--wth"
                onClick={() => {
                  setPrintDialog(false);
                  handlePrint("withdrawal");
                }}
              >
                <div className="pd-opt-ico pd-opt-ico--wth">
                  <i className="fa-solid fa-arrow-up" style={{ fontSize: 18, color: "#dc2626" }} />
                </div>
                <div className="pd-opt-body">
                  <span className="pd-opt-title">السحوبات فقط</span>
                  <span className="pd-opt-desc">
                    {wths.length} إدخال · ل.س جديد: {wT.newSYP.toLocaleString()} · ل.س قديم:{" "}
                    {wT.oldSYP.toLocaleString()} · ${wT.usd.toLocaleString()}
                  </span>
                </div>
                <i className="fa-solid fa-chevron-left pd-opt-arrow" />
              </button>

              <button
                className="pd-opt pd-opt--all"
                onClick={() => {
                  setPrintDialog(false);
                  handlePrint("all");
                }}
              >
                <div className="pd-opt-ico pd-opt-ico--all">
                  <i
                    className="fa-solid fa-layer-group"
                    style={{ fontSize: 18, color: "#4f46e5" }}
                  />
                </div>
                <div className="pd-opt-body">
                  <span className="pd-opt-title">الإيداعات والسحوبات معاً</span>
                  <span className="pd-opt-desc">
                    {entries.length} إدخال إجمالاً · الصافي: {nT.newSYP.toLocaleString()} /{" "}
                    {nT.oldSYP.toLocaleString()} / ${nT.usd.toLocaleString()}
                  </span>
                </div>
                <i className="fa-solid fa-chevron-left pd-opt-arrow" />
              </button>
            </div>

            <button className="pd-cancel" onClick={() => setPrintDialog(false)}>
              <i className="fa-solid fa-xmark" />
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* ════ PRINT TEMPLATE ════ */}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <div className="page">
            {/* Header */}
            <div className="ph">
              <div className="ph-brand">
                <div className="ph-brand-ico">💼</div>
                <div>
                  <div className="ph-brand-name">cashier assistant</div>
                  <div className="ph-brand-sub">نظام إدارة الإيرادات المتكامل</div>
                </div>
              </div>
              <div
                className={`ph-badge ${printMode === "deposit" ? "ph-badge--dep" : printMode === "withdrawal" ? "ph-badge--wth" : "ph-badge--all"}`}
              >
                {printMode === "deposit"
                  ? "تقرير الإيداعات"
                  : printMode === "withdrawal"
                    ? "تقرير السحوبات"
                    : "تقرير شامل"}
              </div>
            </div>

            {/* Meta */}
            <div className="pi">
              <div className="pi-card">
                <div className="pi-lbl">اسم الجلسة</div>
                <div className="pi-val">{session.label}</div>
              </div>
              <div className="pi-card">
                <div className="pi-lbl">الشركة</div>
                <div className="pi-val">{session.companyName}</div>
              </div>
              <div className="pi-card">
                <div className="pi-lbl">التاريخ</div>
                <div className="pi-val">{session.date}</div>
              </div>
              <div className="pi-card">
                <div className="pi-lbl">عدد الإدخالات</div>
                <div className="pi-val">{pRows.length}</div>
              </div>
            </div>

            {/* Summary boxes */}
            {pDeps.length > 0 && (
              <div className="ps-section">
                <div className="ps-section-title">ملخص الإيداعات</div>
                <div className="ps-grid">
                  <div className="ps-box ps-box--dep">
                    <div className="ps-lbl">إجمالي ل.س جديد</div>
                    <div className="ps-val">{pDT.newSYP.toLocaleString()}</div>
                    <div className="ps-sub">ليرة سورية جديدة</div>
                    {printMode !== "all" && (
                      <div className="ps-net">
                        الصافي بعد السحب:
                        <span className={`ps-net-val ${netTone(nT.newSYP)}`}>
                          {fmtNet(nT.newSYP)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ps-box ps-box--dep">
                    <div className="ps-lbl">إجمالي ل.س قديم</div>
                    <div className="ps-val">{pDT.oldSYP.toLocaleString()}</div>
                    <div className="ps-sub">ليرة سورية قديمة</div>
                    {printMode !== "all" && (
                      <div className="ps-net">
                        الصافي بعد السحب:
                        <span className={`ps-net-val ${netTone(nT.oldSYP)}`}>
                          {fmtNet(nT.oldSYP)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ps-box ps-box--dep">
                    <div className="ps-lbl">إجمالي دولار</div>
                    <div className="ps-val">${pDT.usd.toLocaleString()}</div>
                    <div className="ps-sub">دولار أمريكي</div>
                    {printMode !== "all" && (
                      <div className="ps-net">
                        الصافي بعد السحب:
                        <span className={`ps-net-val ${netTone(nT.usd)}`}>
                          {fmtNet(nT.usd, "$")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {pWths.length > 0 && (
              <div className="ps-section">
                <div className="ps-section-title">ملخص السحوبات</div>
                <div className="ps-grid">
                  <div className="ps-box ps-box--wth">
                    <div className="ps-lbl">إجمالي ل.س جديد</div>
                    <div className="ps-val">{pWT.newSYP.toLocaleString()}</div>
                    <div className="ps-sub">ليرة سورية جديدة</div>
                    {printMode !== "all" && (
                      <div className="ps-net">
                        الصافي بعد السحب:
                        <span className={`ps-net-val ${netTone(nT.newSYP)}`}>
                          {fmtNet(nT.newSYP)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ps-box ps-box--wth">
                    <div className="ps-lbl">إجمالي ل.س قديم</div>
                    <div className="ps-val">{pWT.oldSYP.toLocaleString()}</div>
                    <div className="ps-sub">ليرة سورية قديمة</div>
                    {printMode !== "all" && (
                      <div className="ps-net">
                        الصافي بعد السحب:
                        <span className={`ps-net-val ${netTone(nT.oldSYP)}`}>
                          {fmtNet(nT.oldSYP)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="ps-box ps-box--wth">
                    <div className="ps-lbl">إجمالي دولار</div>
                    <div className="ps-val">${pWT.usd.toLocaleString()}</div>
                    <div className="ps-sub">دولار أمريكي</div>
                    {printMode !== "all" && (
                      <div className="ps-net">
                        الصافي بعد السحب:
                        <span className={`ps-net-val ${netTone(nT.usd)}`}>
                          {fmtNet(nT.usd, "$")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Deposits table */}
            {pDeps.length > 0 && (
              <>
                <div className="sec-hdr">
                  <div className="sec-hdr-bar sec-hdr-bar--dep" />
                  <div className="sec-hdr-title">الإيداعات</div>
                  <span className="sec-hdr-count sec-hdr-count--dep">{pDeps.length} إدخال</span>
                </div>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>المندوب</th>
                        <th>ل.س جديد</th>
                        <th>ل.س قديم</th>
                        <th>دولار</th>
                        <th>ملاحظة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pDeps.map((e, i) => (
                        <tr key={e.id} className="dep-row">
                          <td>{i + 1}</td>
                          <td>
                            <div className="rep-cell">
                              <div className="rep-ava rep-ava--dep">
                                {e.repName?.charAt(0) || "؟"}
                              </div>
                              <span className="rep-name">{e.repName}</span>
                            </div>
                          </td>
                          <td>
                            <span className="amt amt--purple">
                              {(e.newSYP || 0).toLocaleString()}
                            </span>
                          </td>
                          <td>
                            <span className="amt amt--teal">
                              {(e.oldSYP || 0).toLocaleString()}
                            </span>
                          </td>
                          <td>
                            <span className="amt amt--amber">${(e.usd || 0).toLocaleString()}</span>
                          </td>
                          <td>
                            <span className="note-cell">{e.note || "—"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="tot-row">
                        <td colSpan="2">
                          <span className="tot-label">الإجمالي</span>
                        </td>
                        <td>
                          <span className="amt amt--purple">{pDT.newSYP.toLocaleString()}</span>
                        </td>
                        <td>
                          <span className="amt amt--teal">{pDT.oldSYP.toLocaleString()}</span>
                        </td>
                        <td>
                          <span className="amt amt--amber">${pDT.usd.toLocaleString()}</span>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}

            {/* Withdrawals table */}
            {pWths.length > 0 && (
              <>
                <div className="sec-hdr">
                  <div className="sec-hdr-bar sec-hdr-bar--wth" />
                  <div className="sec-hdr-title">السحوبات</div>
                  <span className="sec-hdr-count sec-hdr-count--wth">{pWths.length} إدخال</span>
                </div>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>الاسم</th>
                        <th>ل.س جديد</th>
                        <th>ل.س قديم</th>
                        <th>دولار</th>
                        <th>ملاحظة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pWths.map((e, i) => (
                        <tr key={e.id} className="wth-row">
                          <td>{i + 1}</td>
                          <td>
                            <div className="rep-cell">
                              <div className="rep-ava rep-ava--wth">
                                {e.repName?.charAt(0) || "؟"}
                              </div>
                              <span className="rep-name">{e.repName}</span>
                            </div>
                          </td>
                          <td>
                            <span className="amt amt--red">{(e.newSYP || 0).toLocaleString()}</span>
                          </td>
                          <td>
                            <span className="amt amt--orange">
                              {(e.oldSYP || 0).toLocaleString()}
                            </span>
                          </td>
                          <td>
                            <span className="amt amt--pink">${(e.usd || 0).toLocaleString()}</span>
                          </td>
                          <td>
                            <span className="note-cell">{e.note || "—"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="tot-row">
                        <td colSpan="2">
                          <span className="tot-label">الإجمالي</span>
                        </td>
                        <td>
                          <span className="amt amt--red">{pWT.newSYP.toLocaleString()}</span>
                        </td>
                        <td>
                          <span className="amt amt--orange">{pWT.oldSYP.toLocaleString()}</span>
                        </td>
                        <td>
                          <span className="amt amt--pink">${pWT.usd.toLocaleString()}</span>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}

            {/* Net section — only when both */}
            {printMode === "all" && pDeps.length > 0 && pWths.length > 0 && (
              <div className="net-section">
                <div className="net-section-title">الصافي الإجمالي</div>
                <div className="net-items">
                  <div className="net-item">
                    <span className="net-lbl">ل.س جديد</span>
                    <span
                      className={`net-val ${pNT.newSYP > 0 ? "net-val--pos" : pNT.newSYP < 0 ? "net-val--neg" : "net-val--zero"}`}
                    >
                      {fmtNet(pNT.newSYP)}
                    </span>
                  </div>
                  <div className="net-item">
                    <span className="net-lbl">ل.س قديم</span>
                    <span
                      className={`net-val ${pNT.oldSYP > 0 ? "net-val--pos" : pNT.oldSYP < 0 ? "net-val--neg" : "net-val--zero"}`}
                    >
                      {fmtNet(pNT.oldSYP)}
                    </span>
                  </div>
                  <div className="net-item">
                    <span className="net-lbl">دولار</span>
                    <span
                      className={`net-val ${pNT.usd > 0 ? "net-val--pos" : pNT.usd < 0 ? "net-val--neg" : "net-val--zero"}`}
                    >
                      {fmtNet(pNT.usd, "$")}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pf">
              <div className="pf-left">
                تاريخ الطباعة:{" "}
                {new Date().toLocaleDateString("en-us", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="pf-right">Cashier assistant - all rights reserved</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   SHARED COMPONENTS
════════════════════════════════════════════ */
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
function Spin({ red, sm }) {
  return (
    <div
      style={{
        display: "inline-block",
        width: sm ? 12 : 15,
        height: sm ? 12 : 15,
        border: `2px solid ${red ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.3)"}`,
        borderTopColor: red ? "#ef4444" : "#fff",
        borderRadius: "50%",
        animation: "sdSpin 0.7s linear infinite",
      }}
    />
  );
}
function Empty({ icon, title, sub, color }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 20px",
        gap: 10,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: "#f8fafc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <i className={icon} style={{ fontSize: 30, color }} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>{title}</div>
      <div style={{ fontSize: 13, color: "#94a3b8" }}>{sub}</div>
    </div>
  );
}

/* ════════════════════════════════════════════
   CSS
════════════════════════════════════════════ */
const CSS = `
@keyframes sdGrad{0%,100%{background-position:0% 50%;}50%{background-position:100% 50%;}}
@keyframes sdFadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
@keyframes sdItemIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
@keyframes sdTrIn{from{opacity:0;}to{opacity:1;}}
@keyframes sdSpin{to{transform:rotate(360deg);}}
@keyframes pdIn{from{opacity:0;}to{opacity:1;}}
@keyframes pdBoxIn{from{opacity:0;transform:scale(0.9) translateY(20px);}to{opacity:1;transform:scale(1) translateY(0);}}
@keyframes pdOptIn{from{opacity:0;transform:translateX(12px);}to{opacity:1;transform:translateX(0);}}

/* SESSION LIST */
.sl-root{display:flex;flex-direction:column;height:100%;min-height:0;background:#f1f5f9;}
.sl-header{position:relative;overflow:hidden;flex-shrink:0;}
.sl-hbg{position:absolute;inset:0;background:linear-gradient(135deg,#022c22,#064e3b,#059669,#10b981);background-size:300% 300%;animation:sdGrad 12s ease infinite;}
.sl-htop{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;padding:20px 24px 14px;gap:12px;flex-wrap:wrap;}
.sl-htop-l{display:flex;align-items:center;gap:12px;}
.sl-hico{width:44px;height:44px;border-radius:12px;flex-shrink:0;background:linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.08));border:1px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;}
.sl-htitle{font-size:19px;font-weight:900;color:#fff;margin-bottom:2px;}
.sl-hsub{font-size:12px;color:rgba(255,255,255,0.6);}
.sl-newbtn{display:flex;align-items:center;gap:7px;padding:9px 18px;border-radius:10px;border:1px solid rgba(255,255,255,0.25);background:rgba(255,255,255,0.12);color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
.sl-newbtn:hover{background:rgba(255,255,255,0.22);}
.sl-stats{position:relative;z-index:1;display:flex;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,0.1);}
.sl-stat{flex:1;min-width:120px;display:flex;align-items:center;gap:8px;padding:10px 14px;border-left:1px solid rgba(255,255,255,0.07);}
.sl-stat:last-child{border-left:none;}
.sl-stat-val{font-size:13px;font-weight:900;color:#fff;line-height:1;}
.sl-stat-lbl{font-size:9px;color:rgba(255,255,255,0.45);font-weight:500;margin-top:1px;}
.sl-body{flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:14px;min-height:0;}
.sl-form-card{background:#fff;border-radius:16px;padding:18px 20px;border:1px solid #f1f5f9;box-shadow:0 2px 14px rgba(0,0,0,0.05);animation:sdFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both;}
.sl-form-title{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:#1e293b;margin-bottom:14px;}
.sl-form{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:end;}
.filter-row{display:flex;align-items:center;gap:8px;}
.filter-sel{padding:9px 14px;border:1.5px solid #e2e8f0;border-radius:10px;background:#fff;font-size:13px;color:#1e293b;appearance:none;cursor:pointer;min-width:180px;}
.filter-sel:focus{outline:none;border-color:#059669;}
.sl-list{display:flex;flex-direction:column;gap:12px;}
.sl-card{background:#fff;border-radius:16px;padding:16px 18px;border:1px solid #f1f5f9;box-shadow:0 2px 10px rgba(0,0,0,0.04);cursor:pointer;transition:all 0.28s cubic-bezier(0.4,0,0.2,1);animation:sdItemIn 0.4s cubic-bezier(0.22,1,0.36,1) both;}
.sl-card:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(5,150,105,0.12);border-color:rgba(5,150,105,0.18);}
.sl-card-top{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
.sl-card-ico{width:40px;height:40px;border-radius:11px;flex-shrink:0;background:linear-gradient(135deg,#d1fae5,#a7f3d0);display:flex;align-items:center;justify-content:center;}
.sl-card-info{flex:1;min-width:0;}
.sl-card-label{font-size:15px;font-weight:800;color:#1e293b;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sl-card-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.sl-card-meta span{display:flex;align-items:center;gap:4px;font-size:11px;color:#94a3b8;font-weight:500;}
.meta-co{color:#0891b2 !important;font-weight:600 !important;}
.del-btn{width:30px;height:30px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;color:#ef4444;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0;}
.del-btn:hover:not(:disabled){background:#fee2e2;transform:scale(1.1);}
.del-btn:disabled{opacity:0.6;cursor:not-allowed;}
.sl-card-amounts{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;}
.amount-group{flex:1;min-width:140px;background:#f8fafc;border-radius:10px;padding:9px 12px;}
.amount-group--dep{border-right:3px solid #10b981;}
.amount-group--wth{border-right:3px solid #ef4444;}
.amount-group-label{display:flex;align-items:center;gap:5px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:6px;}
.amount-group--dep .amount-group-label{color:#059669;}
.amount-group--wth .amount-group-label{color:#ef4444;}
.amount-chips{display:flex;gap:5px;flex-wrap:wrap;}
.amount-divider{width:1px;background:#e2e8f0;flex-shrink:0;}
.chip{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:700;}
.chip em{font-style:normal;font-size:9px;font-weight:500;opacity:0.7;}
.chip--purple{background:#f5f3ff;color:#4f46e5;}.chip--teal{background:#f0fdf4;color:#059669;}.chip--amber{background:#fffbeb;color:#d97706;}
.chip--red{background:#fef2f2;color:#dc2626;}.chip--orange{background:#fff7ed;color:#ea580c;}.chip--pink{background:#fdf2f8;color:#be185d;}
.sl-card-open{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:#059669;}

/* SESSION DETAIL */
.sd-root{display:flex;flex-direction:column;height:100%;min-height:0;background:#f1f5f9;}
.sd-header{position:relative;overflow:hidden;flex-shrink:0;}
.sd-hbg{position:absolute;inset:0;background:linear-gradient(135deg,#0f0c29,#1e1b4b,#1a237e,#0d47a1);background-size:300% 300%;animation:sdGrad 12s ease infinite;}
.sd-htop{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;padding:14px 20px 8px;gap:10px;flex-wrap:wrap;}
.sd-hmeta-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.sd-hmeta-row span{display:flex;align-items:center;gap:4px;font-size:11px;color:rgba(255,255,255,0.55);}
.sd-hinfo{position:relative;z-index:1;display:flex;align-items:center;gap:10px;padding:6px 20px 12px;}
.sd-hico{width:38px;height:38px;border-radius:10px;flex-shrink:0;background:linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.08));border:1px solid rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:center;}
.sd-htitle{font-size:17px;font-weight:900;color:#fff;}
.sd-net-bar{position:relative;z-index:1;display:flex;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,0.1);}
.sd-net-chip{flex:1;min-width:90px;padding:10px 14px;border-left:1px solid rgba(255,255,255,0.07);}
.sd-net-chip:last-child{border-left:none;}
.sd-net-lbl{font-size:9px;color:rgba(255,255,255,0.4);font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:2px;}
.sd-net-val{font-size:14px;font-weight:900;color:#fff;}
.sd-net-val--pos{color:#6ee7b7 !important;}.sd-net-val--neg{color:#fca5a5 !important;}
.sd-body{flex:1;overflow-y:auto;padding:18px 20px;display:flex;flex-direction:column;gap:14px;min-height:0;}
.sd-summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.sd-sum-card{background:#fff;border-radius:16px;padding:18px 20px;border:1px solid #f1f5f9;box-shadow:0 2px 12px rgba(0,0,0,0.05);display:flex;flex-direction:column;gap:14px;animation:sdFadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both;}
.sd-sum-card--dep{border-top:3px solid #10b981;}.sd-sum-card--wth{border-top:3px solid #ef4444;}
.sd-sum-card-header{display:flex;align-items:center;gap:12px;}
.sd-sum-card-ico{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sd-sum-card-ico--dep{background:#d1fae5;}.sd-sum-card-ico--wth{background:#fee2e2;}
.sd-sum-card-title{font-size:15px;font-weight:800;color:#1e293b;margin-bottom:2px;}
.sd-sum-card-count{font-size:12px;color:#94a3b8;font-weight:500;}
.sd-sum-amounts{display:flex;flex-direction:column;gap:8px;}
.sd-sum-amount{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:#f8fafc;border-radius:8px;}
.sd-sum-lbl{font-size:12px;color:#64748b;font-weight:500;}
.sd-sum-val{font-size:14px;font-weight:800;}
.sd-sum-val--purple{color:#4f46e5;}.sd-sum-val--teal{color:#059669;}.sd-sum-val--amber{color:#d97706;}
.sd-sum-val--red{color:#dc2626;}.sd-sum-val--orange{color:#ea580c;}.sd-sum-val--pink{color:#be185d;}
.sd-sum-btn{display:flex;align-items:center;gap:8px;padding:11px 14px;border-radius:10px;border:none;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.25s;width:100%;}
.sd-sum-btn--dep{background:linear-gradient(135deg,#059669,#10b981);color:#fff;box-shadow:0 3px 12px rgba(5,150,105,0.3);}
.sd-sum-btn--dep:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(5,150,105,0.4);}
.sd-sum-btn--wth{background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;box-shadow:0 3px 12px rgba(220,38,38,0.3);}
.sd-sum-btn--wth:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(220,38,38,0.4);}
.sd-net-card{background:#fff;border-radius:16px;padding:18px 20px;border:1px solid #f1f5f9;box-shadow:0 2px 12px rgba(0,0,0,0.05);animation:sdFadeUp 0.4s 0.1s cubic-bezier(0.22,1,0.36,1) both;}
.sd-net-card-title{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#1e293b;margin-bottom:14px;}
.sd-net-amounts{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
.sd-net-amount{display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:11px;background:#f8fafc;}
.sd-net-amount-lbl{font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.3px;}
.sd-net-amount-val{font-size:18px;font-weight:900;color:#1e293b;}
.sd-net-amount-val--pos{color:#059669 !important;}.sd-net-amount-val--neg{color:#dc2626 !important;}
.sd-quick-actions{display:flex;gap:10px;}
.sd-qa-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:12px;border:none;font-size:14px;font-weight:700;cursor:pointer;transition:all 0.25s;}
.sd-qa-btn--dep{background:#f0fdf4;color:#059669;border:1.5px solid #bbf7d0;}
.sd-qa-btn--dep:hover{background:linear-gradient(135deg,#059669,#10b981);color:#fff;border-color:transparent;transform:translateY(-2px);box-shadow:0 6px 18px rgba(5,150,105,0.3);}
.sd-qa-btn--wth{background:#fef2f2;color:#dc2626;border:1.5px solid #fecaca;}
.sd-qa-btn--wth:hover{background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;border-color:transparent;transform:translateY(-2px);box-shadow:0 6px 18px rgba(220,38,38,0.3);}

/* ENTRIES PAGE */
.ep-root{display:flex;flex-direction:column;height:100%;min-height:0;background:#f1f5f9;}
.ep-header{position:relative;overflow:hidden;flex-shrink:0;}
.ep-hbg{position:absolute;inset:0;background:linear-gradient(135deg,#0f0c29,#1e1b4b,#1a237e,#0d47a1);background-size:300% 300%;animation:sdGrad 12s ease infinite;}
.ep-htop{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;padding:12px 18px 8px;gap:8px;flex-wrap:wrap;}
.ep-print-btn{display:flex;align-items:center;gap:7px;padding:8px 18px;border-radius:10px;border:1px solid rgba(255,255,255,0.22);background:rgba(255,255,255,0.12);color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
.ep-print-btn:hover{background:rgba(255,255,255,0.22);transform:translateY(-1px);}
.ep-hinfo{position:relative;z-index:1;display:flex;align-items:center;gap:10px;padding:4px 18px 10px;}
.ep-hico{width:36px;height:36px;border-radius:10px;flex-shrink:0;background:linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.08));border:1px solid rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:center;}
.ep-htitle{font-size:16px;font-weight:900;color:#fff;margin-bottom:3px;}
.ep-hmeta{display:flex;align-items:center;gap:9px;flex-wrap:wrap;}
.ep-hmeta span{display:flex;align-items:center;gap:4px;font-size:11px;color:rgba(255,255,255,0.5);}
.ep-net-bar{position:relative;z-index:1;display:flex;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,0.1);}
.ep-net-chip{flex:1;min-width:80px;padding:9px 12px;border-left:1px solid rgba(255,255,255,0.07);}
.ep-net-chip:last-child{border-left:none;}
.ep-net-lbl{font-size:9px;color:rgba(255,255,255,0.38);font-weight:600;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:2px;}
.ep-net-val{font-size:13px;font-weight:900;color:#fff;}
.ep-net-val--pos{color:#6ee7b7 !important;}.ep-net-val--neg{color:#fca5a5 !important;}
.ep-body{flex:1;overflow-y:auto;padding:16px 18px;display:flex;flex-direction:column;gap:12px;min-height:0;}
.ep-tabs{display:flex;gap:5px;background:#fff;border-radius:13px;padding:4px;border:1px solid #f1f5f9;box-shadow:0 1px 6px rgba(0,0,0,0.04);flex-shrink:0;}
.ep-tab{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:10px 14px;border-radius:10px;border:none;font-size:13px;font-weight:700;cursor:pointer;background:transparent;color:#94a3b8;transition:all 0.22s;}
.ep-tab:hover{background:#f8fafc;color:#475569;}
.ep-tab--dep{background:linear-gradient(135deg,#059669,#10b981) !important;color:#fff !important;box-shadow:0 4px 12px rgba(5,150,105,0.28);}
.ep-tab--wth{background:linear-gradient(135deg,#dc2626,#ef4444) !important;color:#fff !important;box-shadow:0 4px 12px rgba(220,38,38,0.28);}
.ep-tab-badge{display:inline-flex;align-items:center;justify-content:center;width:19px;height:19px;border-radius:5px;font-size:10px;font-weight:800;background:rgba(0,0,0,0.08);color:inherit;}
.ep-tab-badge--on-dep,.ep-tab-badge--on-wth{background:rgba(255,255,255,0.22) !important;color:#fff !important;}
.ep-form-card{background:#fff;border-radius:15px;padding:16px 18px;border:1px solid #f1f5f9;box-shadow:0 2px 12px rgba(0,0,0,0.04);border-top:3px solid #059669;flex-shrink:0;}
.ep-form-card--wth{border-top-color:#ef4444 !important;}
.ep-form-title{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:#1e293b;margin-bottom:12px;}
.ep-form-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:9px;align-items:end;}
.ep-field{display:flex;flex-direction:column;gap:5px;}
.ep-field--note{grid-column:span 3;}
.ep-field--submit{grid-column:span 1;}
.ep-lbl{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.4px;}
.ep-lbl i{font-size:10px;color:#6ee7b7;}
.dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.dot--purple{background:#818cf8;}.dot--teal{background:#34d399;}.dot--amber{background:#fbbf24;}
.ep-inp-wrap{border:1.5px solid #e2e8f0;border-radius:10px;background:#f8fafc;transition:all 0.2s;position:relative;}
.ep-inp-wrap--dep:focus-within,.ep-inp-wrap--dep:focus-within{border-color:#059669;background:#fff;box-shadow:0 0 0 3px rgba(5,150,105,0.1);}
.ep-inp-wrap--wth:focus-within{border-color:#ef4444;background:#fff;box-shadow:0 0 0 3px rgba(239,68,68,0.1);}
.ep-inp-wrap--purple:focus-within{border-color:#818cf8;background:#fff;box-shadow:0 0 0 3px rgba(129,140,248,0.1);}
.ep-inp-wrap--teal:focus-within{border-color:#34d399;background:#fff;box-shadow:0 0 0 3px rgba(52,211,153,0.1);}
.ep-inp-wrap--amber:focus-within{border-color:#fbbf24;background:#fff;box-shadow:0 0 0 3px rgba(251,191,36,0.1);}
.ep-inp-wrap--red:focus-within{border-color:#ef4444;background:#fff;box-shadow:0 0 0 3px rgba(239,68,68,0.1);}
.ep-inp-wrap--orange:focus-within{border-color:#f97316;background:#fff;box-shadow:0 0 0 3px rgba(249,115,22,0.1);}
.ep-inp-wrap--pink:focus-within{border-color:#ec4899;background:#fff;box-shadow:0 0 0 3px rgba(236,72,153,0.1);}
.ep-ico{position:absolute;right:11px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:13px;pointer-events:none;}
.ep-inp{width:100%;padding:10px 12px;border:none;background:transparent;font-size:14px;color:#1e293b;text-align:right;border-radius:10px;}
.ep-inp:focus{outline:none;}
.ep-submit{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 16px;border-radius:10px;border:none;color:#fff;font-size:13px;font-weight:700;cursor:pointer;transition:all 0.22s;width:100%;white-space:nowrap;}
.ep-submit--dep{background:linear-gradient(135deg,#059669,#10b981);box-shadow:0 3px 12px rgba(5,150,105,0.28);}
.ep-submit--dep:hover:not(:disabled){transform:translateY(-2px);}
.ep-submit--wth{background:linear-gradient(135deg,#dc2626,#ef4444);box-shadow:0 3px 12px rgba(220,38,38,0.28);}
.ep-submit--wth:hover:not(:disabled){transform:translateY(-2px);}
.ep-submit:disabled{opacity:0.6;cursor:not-allowed;transform:none;}
.ep-totals-strip{display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0;}
.ep-total-chip{flex:1;min-width:90px;display:flex;align-items:center;justify-content:space-between;padding:9px 13px;border-radius:10px;}
.ep-total-lbl{font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.3px;}
.ep-total-val{font-size:14px;font-weight:900;}
.et--purple{background:#f5f3ff;}.et--purple .ep-total-val{color:#4f46e5;}
.et--teal{background:#f0fdf4;}.et--teal .ep-total-val{color:#059669;}
.et--amber{background:#fffbeb;}.et--amber .ep-total-val{color:#d97706;}
.et--red{background:#fef2f2;}.et--red .ep-total-val{color:#dc2626;}
.et--orange{background:#fff7ed;}.et--orange .ep-total-val{color:#ea580c;}
.et--pink{background:#fdf2f8;}.et--pink .ep-total-val{color:#be185d;}
.et--neutral{background:#f8fafc;}.et--neutral .ep-total-val{color:#1e293b;}
.ep-table-section{background:#fff;border-radius:16px;border:1px solid #f1f5f9;box-shadow:0 2px 12px rgba(0,0,0,0.05);display:flex;flex-direction:column;min-height:0;flex-shrink:0;}
.ep-table-title-row{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid #f8fafc;flex-shrink:0;}
.ep-table-title{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:#1e293b;}
.tbl-badge{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5px;font-size:10px;font-weight:800;}
.tbl-badge--dep{background:#f0fdf4;color:#059669;}.tbl-badge--wth{background:#fef2f2;color:#dc2626;}
.ep-tbl-outer{overflow-x:auto;overflow-y:visible;-webkit-overflow-scrolling:touch;border-radius:0 0 16px 16px;}
.ep-tbl{width:100%;border-collapse:collapse;min-width:580px;}
.ep-tbl thead th{background:#f8fafc;padding:9px 13px;font-size:11px;font-weight:700;color:#64748b;text-align:right;border-bottom:1px solid #f1f5f9;text-transform:uppercase;letter-spacing:0.3px;white-space:nowrap;position:sticky;top:0;z-index:5;}
.ep-tr{border-bottom:1px solid #f8fafc;transition:background 0.15s;animation:sdTrIn 0.25s ease both;}
.ep-tr--dep:hover{background:#f0fdf4;}.ep-tr--wth:hover{background:#fef2f2;}
.ep-tr--dep td:first-child{border-right:3px solid #10b981;}.ep-tr--wth td:first-child{border-right:3px solid #ef4444;}
.ep-tr td{padding:11px 13px;vertical-align:middle;}
.td-num{font-size:11px;font-weight:700;color:#94a3b8;text-align:center;width:36px;}
.td-rep{display:flex;align-items:center;gap:9px;white-space:nowrap;}
.td-ava{width:32px;height:32px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;}
.td-ava--dep{background:linear-gradient(135deg,#059669,#34d399);}.td-ava--wth{background:linear-gradient(135deg,#dc2626,#f87171);}
.td-name{font-size:13px;font-weight:700;color:#1e293b;}
.tbl-amt{display:inline-flex;align-items:center;padding:3px 9px;border-radius:6px;font-size:12px;font-weight:700;white-space:nowrap;}
.tbl-amt--purple{background:#f5f3ff;color:#4f46e5;}.tbl-amt--teal{background:#f0fdf4;color:#059669;}.tbl-amt--amber{background:#fffbeb;color:#d97706;}
.tbl-amt--red{background:#fef2f2;color:#dc2626;}.tbl-amt--orange{background:#fff7ed;color:#ea580c;}.tbl-amt--pink{background:#fdf2f8;color:#be185d;}
.tbl-amt--bold{font-size:13px !important;padding:5px 11px !important;font-weight:900 !important;}
.td-note{font-size:12px;color:#94a3b8;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;}
.td-edit{width:100%;padding:6px 8px;border-radius:7px;font-size:12px;color:#1e293b;text-align:right;min-width:70px;border:1.5px solid #e2e8f0;background:#f8fafc;}
.td-edit--purple{border-color:#818cf8;background:#f5f3ff;}.td-edit--teal{border-color:#34d399;background:#f0fdf4;}.td-edit--amber{border-color:#fbbf24;background:#fffbeb;}
.td-edit:focus{outline:none;}
.td-acts{display:flex;gap:5px;align-items:center;}
.act-btn{width:28px;height:28px;border-radius:7px;border:none;display:flex;align-items:center;justify-content:center;font-size:11px;cursor:pointer;transition:all 0.18s;}
.act-btn--edit{background:#f5f3ff;color:#4f46e5;}.act-btn--edit:hover{background:#ede9fe;transform:scale(1.1);}
.act-btn--del{background:#fef2f2;color:#ef4444;}.act-btn--del:hover:not(:disabled){background:#fee2e2;transform:scale(1.1);}
.act-btn--del:disabled{opacity:0.6;cursor:not-allowed;}
.act-btn--save{background:linear-gradient(135deg,#059669,#10b981);color:#fff;}.act-btn--save:hover{transform:scale(1.1);}
.act-btn--cancel{background:#f8fafc;color:#94a3b8;border:1px solid #e2e8f0;}
.ep-tfoot td{padding:10px 13px;background:#f8fafc;border-top:2px solid #e2e8f0;font-weight:700;}
.ep-tfoot-lbl{font-size:12px;font-weight:800;color:#1e293b;}

/* ════ PRINT DIALOG ════ */
.pd-overlay{
  position:fixed;inset:0;
  background:rgba(15,12,41,0.65);
  backdrop-filter:blur(8px);
  -webkit-backdrop-filter:blur(8px);
  z-index:1000;
  display:flex;align-items:center;justify-content:center;
  padding:20px;
  animation:pdIn 0.2s ease both;
}
.pd-box{
  background:#fff;
  border-radius:24px;
  padding:0;
  width:100%;max-width:420px;
  box-shadow:0 32px 80px rgba(0,0,0,0.25),0 0 0 1px rgba(0,0,0,0.04);
  animation:pdBoxIn 0.32s cubic-bezier(0.22,1,0.36,1) both;
  overflow:hidden;
}
.pd-header{
  display:flex;align-items:center;gap:14px;
  padding:22px 24px 18px;
  border-bottom:1px solid #f1f5f9;
  background:linear-gradient(135deg,#fafbff,#f5f3ff);
}
.pd-header-ico{
  width:46px;height:46px;border-radius:13px;flex-shrink:0;
  background:linear-gradient(135deg,#ede9fe,#ddd6fe);
  border:1px solid rgba(99,102,241,0.2);
  display:flex;align-items:center;justify-content:center;
}
.pd-title{font-size:16px;font-weight:900;color:#1e293b;margin-bottom:2px;letter-spacing:-0.3px;}
.pd-subtitle{font-size:12px;color:#94a3b8;font-weight:400;}
.pd-options{display:flex;flex-direction:column;padding:14px 16px;gap:8px;}
.pd-opt{
  display:flex;align-items:center;gap:14px;
  padding:14px 16px;border-radius:14px;border:none;
  cursor:pointer;transition:all 0.25s cubic-bezier(0.34,1.56,0.64,1);
  text-align:right;width:100%;
  animation:pdOptIn 0.3s cubic-bezier(0.22,1,0.36,1) both;
}
.pd-opt:nth-child(1){animation-delay:0.05s;}
.pd-opt:nth-child(2){animation-delay:0.1s;}
.pd-opt:nth-child(3){animation-delay:0.15s;}
.pd-opt--dep{background:#f0fdf4;border:1.5px solid #bbf7d0;}
.pd-opt--dep:hover{background:#dcfce7;border-color:#059669;transform:translateX(-4px) scale(1.01);box-shadow:0 6px 20px rgba(5,150,105,0.18);}
.pd-opt--wth{background:#fef2f2;border:1.5px solid #fecaca;}
.pd-opt--wth:hover{background:#fee2e2;border-color:#dc2626;transform:translateX(-4px) scale(1.01);box-shadow:0 6px 20px rgba(220,38,38,0.18);}
.pd-opt--all{background:#f5f3ff;border:1.5px solid #ddd6fe;}
.pd-opt--all:hover{background:#ede9fe;border-color:#4f46e5;transform:translateX(-4px) scale(1.01);box-shadow:0 6px 20px rgba(79,70,229,0.18);}
.pd-opt-ico{width:46px;height:46px;border-radius:13px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.pd-opt-ico--dep{background:#d1fae5;}
.pd-opt-ico--wth{background:#fee2e2;}
.pd-opt-ico--all{background:#ede9fe;}
.pd-opt-body{display:flex;flex-direction:column;gap:3px;flex:1;text-align:right;}
.pd-opt-title{font-size:14px;font-weight:800;color:#1e293b;}
.pd-opt-desc{font-size:11px;color:#94a3b8;font-weight:400;line-height:1.4;}
.pd-opt-arrow{font-size:12px;color:#cbd5e1;flex-shrink:0;transition:all 0.2s;}
.pd-opt:hover .pd-opt-arrow{color:#475569;transform:translateX(-3px);}
.pd-cancel{
  display:flex;align-items:center;justify-content:center;gap:7px;
  width:calc(100% - 32px);margin:0 16px 16px;padding:11px;
  border-radius:11px;background:#f8fafc;border:1.5px solid #e2e8f0;
  color:#64748b;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;
}
.pd-cancel:hover{background:#f1f5f9;color:#1e293b;border-color:#cbd5e1;}

/* Shared */
.back-btn{display:flex;align-items:center;gap:6px;padding:7px 13px;border-radius:9px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.85);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
.back-btn:hover{background:rgba(255,255,255,0.2);}
.warn-box{display:flex;align-items:center;gap:7px;padding:10px 14px;border-radius:9px;background:#fffbeb;border:1px solid #fef3c7;font-size:13px;color:#92400e;}
.btn-green{display:flex;align-items:center;gap:7px;padding:11px 18px;border-radius:11px;border:none;background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 3px 12px rgba(5,150,105,0.3);transition:all 0.2s;white-space:nowrap;}
.btn-green:hover:not(:disabled){transform:translateY(-2px);}
.btn-green:disabled{opacity:0.6;cursor:not-allowed;}
.inp{width:100%;padding:11px 12px;border:none;background:transparent;font-size:14px;color:#1e293b;text-align:right;border-radius:11px;}
.inp:focus{outline:none;}

/* RESPONSIVE */
@media(max-width:900px){
  .sl-stats{display:grid;grid-template-columns:repeat(3,1fr);}
  .ep-net-bar,.sd-net-bar{display:grid;grid-template-columns:repeat(2,1fr);}
  .sd-net-amounts{grid-template-columns:1fr 1fr 1fr;}
}
@media(max-width:640px){
  .sl-stats{grid-template-columns:repeat(2,1fr);}
  .sl-body,.sd-body,.ep-body{padding:12px 12px;}
  .sl-form{grid-template-columns:1fr 1fr;gap:8px;}
  .sl-form>button{grid-column:span 2;}
  .sd-summary-grid{grid-template-columns:1fr;}
  .sd-net-amounts{grid-template-columns:1fr 1fr;}
  .sd-quick-actions{flex-direction:column;}
  .ep-form-grid{grid-template-columns:1fr 1fr;gap:8px;}
  .ep-field--note{grid-column:span 2;}
  .ep-field--submit{grid-column:span 2;}
  .ep-submit{width:100%;}
  .ep-net-bar{grid-template-columns:repeat(2,1fr);}
  .ep-totals-strip{gap:6px;}
}
@media(max-width:400px){
  .sl-stats{grid-template-columns:1fr 1fr;}
  .ep-form-grid,.sd-net-amounts{grid-template-columns:1fr;}
  .ep-field--note,.ep-field--submit{grid-column:span 1;}
};
`;
