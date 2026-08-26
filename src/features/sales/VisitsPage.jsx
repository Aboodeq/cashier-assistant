import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useLocation } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import Modal from "../../components/Modal";
import "./VisitsPage.css";

const OUTCOMES = [
  { value: "successful", label: "ناجحة", icon: "fa-solid fa-circle-check", color: "#059669", bg: "#f0fdf4" },
  { value: "no_answer", label: "لا يوجد رد", icon: "fa-solid fa-phone-slash", color: "#b45309", bg: "#fffbeb" },
  { value: "closed", label: "المحل مغلق", icon: "fa-solid fa-store-slash", color: "#64748b", bg: "#f8fafc" },
  { value: "postponed", label: "مؤجلة", icon: "fa-solid fa-clock", color: "#7c3aed", bg: "#f5f3ff" },
];
const outcomeMeta = (value) => OUTCOMES.find((o) => o.value === value) || OUTCOMES[0];

const today = () => new Date().toISOString().split("T")[0];
const emptyForm = { clientId: "", date: today(), outcome: "successful", followUpDate: "", notes: "" };

export default function VisitsPage() {
  const uid = auth.currentUser?.uid;
  const location = useLocation();
  const visits = useFirestoreCollection(uid && ["users", uid, "salesVisits"], {
    orderByField: "createdAt",
  });
  const clients = useFirestoreCollection(uid && ["users", uid, "salesClients"], {
    orderByField: "createdAt",
  });
  const territories = useFirestoreCollection(uid && ["users", uid, "salesTerritories"], {
    orderByField: "createdAt",
  });

  const [form, setForm] = useState(() => ({
    ...emptyForm,
    clientId: location.state?.clientId || "",
  }));
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterTerritory, setFilterTerritory] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("");

  const setField = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.clientId) return;
    setLoading(true);
    const client = clients.find((c) => c.id === form.clientId);
    await addDoc(collection(db, "users", uid, "salesVisits"), {
      clientId: form.clientId,
      clientName: client?.name || "",
      territoryId: client?.territoryId || "",
      territoryName: client?.territoryName || "",
      date: form.date,
      outcome: form.outcome,
      followUpDate: form.followUpDate,
      followUpDone: false,
      notes: form.notes.trim(),
      createdAt: Date.now(),
    });
    setForm({ ...emptyForm, clientId: form.clientId });
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await deleteDoc(doc(db, "users", uid, "salesVisits", deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = async (id) => {
    const client = clients.find((c) => c.id === editData.clientId);
    await updateDoc(doc(db, "users", uid, "salesVisits", id), {
      clientId: editData.clientId,
      clientName: client?.name || "",
      territoryId: client?.territoryId || "",
      territoryName: client?.territoryName || "",
      date: editData.date,
      outcome: editData.outcome,
      followUpDate: editData.followUpDate,
      notes: editData.notes.trim(),
    });
    setEditId(null);
  };

  const toggleFollowUpDone = async (v) => {
    await updateDoc(doc(db, "users", uid, "salesVisits", v.id), { followUpDone: !v.followUpDone });
  };

  const filtered = visits
    .filter((v) => (filterTerritory ? v.territoryId === filterTerritory : true))
    .filter((v) => (filterClient ? v.clientId === filterClient : true))
    .filter((v) => (filterOutcome ? v.outcome === filterOutcome : true));

  return (
    <>
      <div className="vs-root">
        {/* Header */}
        <div className="vs-header">
          <div className="vs-header-bg" />
          <div className="vs-header-body">
            <div className="vs-header-left">
              <div className="vs-header-ico">
                <i className="fa-solid fa-route" style={{ fontSize: 22, color: "#fff" }} />
              </div>
              <div>
                <h1 className="vs-header-title">الزيارات</h1>
                <p className="vs-header-sub">سجل زياراتك الميدانية ومتابعاتك</p>
              </div>
            </div>
            <div className="vs-header-badge">
              <i className="fa-solid fa-route" style={{ fontSize: 11 }} />
              {visits.length} زيارة
            </div>
          </div>
        </div>

        <div className="vs-body">
          {/* Add form */}
          <div className="vs-add-card">
            <div className="vs-add-title">
              <i className="fa-solid fa-plus-circle" style={{ color: "#0369a1", fontSize: 16 }} />
              تسجيل زيارة جديدة
            </div>

            {clients.length === 0 ? (
              <div className="vs-no-clients">
                <i
                  className="fa-solid fa-triangle-exclamation"
                  style={{ color: "#f59e0b", fontSize: 14 }}
                />
                يجب إضافة عميل أولاً قبل تسجيل زيارة
              </div>
            ) : (
              <form onSubmit={handleAdd} className="vs-add-grid">
                <div className="vs-field">
                  <label className="vs-lbl">
                    <i className="fa-solid fa-address-book" />
                    العميل
                  </label>
                  <div className="vs-inp-wrap">
                    <i className="fa-solid fa-address-book vs-ico" />
                    <select className="vs-inp" value={form.clientId} onChange={setField("clientId")} required>
                      <option value="">اختر العميل...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.territoryName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="vs-field">
                  <label className="vs-lbl">
                    <i className="fa-regular fa-calendar" />
                    التاريخ
                  </label>
                  <div className="vs-inp-wrap">
                    <input
                      className="vs-inp"
                      type="date"
                      value={form.date}
                      onChange={setField("date")}
                      required
                    />
                  </div>
                </div>
                <div className="vs-field">
                  <label className="vs-lbl">
                    <i className="fa-solid fa-clipboard-check" />
                    النتيجة
                  </label>
                  <div className="vs-inp-wrap">
                    <i className="fa-solid fa-clipboard-check vs-ico" />
                    <select className="vs-inp" value={form.outcome} onChange={setField("outcome")}>
                      {OUTCOMES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="vs-field">
                  <label className="vs-lbl">
                    <i className="fa-solid fa-bell" />
                    متابعة بتاريخ
                  </label>
                  <div className="vs-inp-wrap">
                    <input
                      className="vs-inp"
                      type="date"
                      value={form.followUpDate}
                      onChange={setField("followUpDate")}
                    />
                  </div>
                </div>
                <div className="vs-field vs-field--notes">
                  <label className="vs-lbl">
                    <i className="fa-regular fa-note-sticky" />
                    ملاحظات الزيارة
                  </label>
                  <div className="vs-inp-wrap">
                    <input
                      className="vs-inp"
                      placeholder="ما الذي تم بحثه أو الاتفاق عليه... (اختياري)"
                      value={form.notes}
                      onChange={setField("notes")}
                    />
                  </div>
                </div>
                <div className="vs-field vs-field--submit">
                  <label className="vs-lbl" style={{ opacity: 0 }}>
                    _
                  </label>
                  <button type="submit" className="vs-add-btn" disabled={loading || !form.clientId}>
                    {loading ? (
                      <>
                        <div className="vs-spinner" />
                        جاري...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-plus" />
                        تسجيل
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Filters */}
          {visits.length > 0 && (
            <div className="vs-filters">
              <div className="vs-filter-select-wrap">
                <i className="fa-solid fa-map-location-dot vs-filter-ico" />
                <select
                  className="vs-filter-select"
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
              <div className="vs-filter-select-wrap">
                <i className="fa-solid fa-address-book vs-filter-ico" />
                <select
                  className="vs-filter-select"
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                >
                  <option value="">كل العملاء</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="vs-filter-select-wrap">
                <i className="fa-solid fa-clipboard-check vs-filter-ico" />
                <select
                  className="vs-filter-select"
                  value={filterOutcome}
                  onChange={(e) => setFilterOutcome(e.target.value)}
                >
                  <option value="">كل النتائج</option>
                  {OUTCOMES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* List */}
          {visits.length === 0 ? (
            <div className="vs-empty">
              <div className="vs-empty-ico">
                <i className="fa-solid fa-route" style={{ fontSize: 34, color: "#bae6fd" }} />
              </div>
              <div className="vs-empty-title">لا توجد زيارات بعد</div>
              <div className="vs-empty-sub">سجّل زيارتك الأولى من الحقل أعلاه</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="vs-empty">
              <div className="vs-empty-ico">
                <i
                  className="fa-solid fa-magnifying-glass"
                  style={{ fontSize: 28, color: "#bae6fd" }}
                />
              </div>
              <div className="vs-empty-title">لا توجد نتائج</div>
              <div className="vs-empty-sub">جرب تغيير الفلتر</div>
            </div>
          ) : (
            <div className="vs-list">
              {filtered.map((v, i) => {
                const outcome = outcomeMeta(v.outcome);
                const hasFollowUp = Boolean(v.followUpDate);
                const isDue = hasFollowUp && !v.followUpDone && v.followUpDate <= today();
                return (
                  <div
                    key={v.id}
                    className="vs-item"
                    style={{
                      animationDelay: `${i * 0.04}s`,
                      "--vs-accent": outcome.color,
                      "--vs-accent-bg": outcome.bg,
                    }}
                  >
                    <div className="vs-item-left">
                      <div className="vs-item-ico">
                        <i className={outcome.icon} style={{ fontSize: 16, color: outcome.color }} />
                      </div>
                      <div className="vs-item-info">
                        <div className="vs-item-name-row">
                          <span className="vs-item-name">{v.clientName}</span>
                          <span
                            className="vs-outcome"
                            style={{ background: outcome.bg, color: outcome.color }}
                          >
                            <i className={outcome.icon} style={{ fontSize: 9 }} />
                            {outcome.label}
                          </span>
                        </div>
                        <div className="vs-item-meta">
                          <span className="vs-item-territory">
                            <i className="fa-solid fa-map-location-dot" style={{ fontSize: 10 }} />
                            {v.territoryName || "غير محدد"}
                          </span>
                          <span>
                            <i className="fa-regular fa-calendar" style={{ fontSize: 10 }} />
                            {v.date}
                          </span>
                        </div>
                        {v.notes && <div className="vs-item-notes">{v.notes}</div>}
                        {hasFollowUp && (
                          <div
                            className={`vs-followup ${
                              v.followUpDone
                                ? "vs-followup--done"
                                : isDue
                                  ? "vs-followup--due"
                                  : "vs-followup--upcoming"
                            }`}
                          >
                            <i
                              className={`fa-solid fa-${v.followUpDone ? "check" : "bell"}`}
                              style={{ fontSize: 10 }}
                            />
                            {v.followUpDone
                              ? `تمت المتابعة (${v.followUpDate})`
                              : `متابعة ${isDue ? "مستحقة" : "قادمة"}: ${v.followUpDate}`}
                            {!v.followUpDone && (
                              <button className="vs-followup-btn" onClick={() => toggleFollowUpDone(v)}>
                                تمّت
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="vs-item-actions">
                      <button
                        className="vs-btn vs-btn--edit"
                        onClick={() => {
                          setEditId(v.id);
                          setEditData({
                            clientId: v.clientId,
                            date: v.date,
                            outcome: v.outcome,
                            followUpDate: v.followUpDate || "",
                            notes: v.notes || "",
                          });
                        }}
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button
                        className="vs-btn vs-btn--del"
                        onClick={() => setDeleteTarget(v)}
                        disabled={deleting === v.id}
                      >
                        {deleting === v.id ? (
                          <div className="vs-spinner vs-spinner--red" />
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
        title="تأكيد حذف الزيارة"
        message={`سيتم حذف زيارة "${deleteTarget?.clientName || ""}" بتاريخ ${deleteTarget?.date || ""}.`}
        confirmLabel="حذف الزيارة"
        loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
      <Modal
        open={Boolean(editId)}
        onClose={() => setEditId(null)}
        icon="fa-solid fa-route"
        title="تعديل الزيارة"
        subtitle={editId ? visits.find((v) => v.id === editId)?.clientName : ""}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEdit(editId);
          }}
          className="vs-add-grid"
        >
          <div className="vs-field">
            <label className="vs-lbl">
              <i className="fa-solid fa-address-book" />
              العميل
            </label>
            <div className="vs-inp-wrap">
              <i className="fa-solid fa-address-book vs-ico" />
              <select
                className="vs-inp"
                value={editData.clientId}
                onChange={(e) => setEditData((p) => ({ ...p, clientId: e.target.value }))}
                required
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="vs-field">
            <label className="vs-lbl">
              <i className="fa-regular fa-calendar" />
              التاريخ
            </label>
            <div className="vs-inp-wrap">
              <input
                className="vs-inp"
                type="date"
                value={editData.date}
                onChange={(e) => setEditData((p) => ({ ...p, date: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="vs-field">
            <label className="vs-lbl">
              <i className="fa-solid fa-clipboard-check" />
              النتيجة
            </label>
            <div className="vs-inp-wrap">
              <i className="fa-solid fa-clipboard-check vs-ico" />
              <select
                className="vs-inp"
                value={editData.outcome}
                onChange={(e) => setEditData((p) => ({ ...p, outcome: e.target.value }))}
              >
                {OUTCOMES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="vs-field">
            <label className="vs-lbl">
              <i className="fa-solid fa-bell" />
              متابعة بتاريخ
            </label>
            <div className="vs-inp-wrap">
              <input
                className="vs-inp"
                type="date"
                value={editData.followUpDate}
                onChange={(e) => setEditData((p) => ({ ...p, followUpDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="vs-field vs-field--notes">
            <label className="vs-lbl">
              <i className="fa-regular fa-note-sticky" />
              ملاحظات الزيارة
            </label>
            <div className="vs-inp-wrap">
              <input
                className="vs-inp"
                value={editData.notes}
                onChange={(e) => setEditData((p) => ({ ...p, notes: e.target.value }))}
                placeholder="اختياري"
              />
            </div>
          </div>
          <div className="vs-field vs-field--submit vs-modal-actions">
            <button type="submit" className="vs-btn vs-btn--save vs-modal-save">
              <i className="fa-solid fa-check" />
              حفظ التغييرات
            </button>
            <button type="button" className="vs-btn vs-btn--cancel" onClick={() => setEditId(null)}>
              إلغاء
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
