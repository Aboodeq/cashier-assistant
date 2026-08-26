import { useRef, useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import {
  amountLines,
  formatEntryDate,
  formatMoney,
  formatReportTimestamp,
  netTotals,
  sumEntries,
} from "../../utils/format";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import { Spin, Empty } from "./SessionShared";
import PrintDialog from "./PrintDialog";
import PrintTemplate from "./PrintTemplate";
import { openPrintWindow } from "./printReport";
import "./EntriesPage.css";

export default function EntriesPage({ session, onBack, defaultTab }) {
  const uid = auth.currentUser?.uid;
  const entries = useFirestoreCollection(
    uid && session && ["users", uid, "sessions", session.id, "entries"],
    { orderByField: "createdAt", direction: "asc" },
  );
  const reps = useFirestoreCollection(uid && ["users", uid, "representatives"], {
    orderByField: "createdAt",
  });

  const [tab, setTab] = useState(defaultTab || "deposit");
  const [repId, setRepId] = useState("");
  const [withdrawalName, setWithdrawalName] = useState("");
  const [newSYP, setNewSYP] = useState("");
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
  const printUserName =
    auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "";

  const companyReps = reps.filter((r) => r.companyId === session.companyId);
  const deps = entries.filter((e) => e.type === "deposit");
  const wths = entries.filter((e) => e.type === "withdrawal");
  const shown = tab === "deposit" ? deps : wths;
  const curT = sumEntries(shown);
  const dT = sumEntries(deps);
  const wT = sumEntries(wths);
  const nT = netTotals(dT, wT);

  const syncTotals = async (updated) => {
    const d = sumEntries(updated.filter((e) => e.type === "deposit"));
    const w = sumEntries(updated.filter((e) => e.type === "withdrawal"));
    await updateDoc(doc(db, "users", uid, "sessions", session.id), {
      totalDepNewSYP: d.newSYP,
      totalDepUSD: d.usd,
      totalWthNewSYP: w.newSYP,
      totalWthUSD: w.usd,
      entriesCount: updated.length,
    });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const isWth = tab === "withdrawal";
    const typedName = withdrawalName.trim();
    if (isWth ? !typedName : !repId) return;
    setLoading(true);
    const rep = isWth ? null : reps.find((r) => r.id === repId);
    const entry = {
      repId: isWth ? "" : repId,
      repName: isWth ? typedName : rep?.name || "",
      type: tab,
      newSYP: Number(newSYP) || 0,
      usd: Number(usd) || 0,
      note: note.trim(),
      createdAt: Date.now(),
    };
    await addDoc(collection(db, "users", uid, "sessions", session.id, "entries"), entry);
    await syncTotals([...entries, entry]);
    setRepId("");
    setWithdrawalName("");
    setNewSYP("");
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
      usd: Number(editData.usd) || 0,
      note: editData.note || "",
    });
    const updated = entries.map((e) =>
      e.id === id
        ? {
            ...e,
            ...editData,
            newSYP: Number(editData.newSYP) || 0,
            usd: Number(editData.usd) || 0,
          }
        : e,
    );
    await syncTotals(updated);
    setEditId(null);
  };

  const printTitle = () => {
    const base = printMode === "withdrawal" ? "كشف السحوبات" : "كشف أموال المندوبين";
    return `${base} - ${session.companyName}`;
  };

  const handlePrint = (mode) => {
    setPrintDialog(false);
    setPrintMode(mode);
    setTimeout(() => {
      const bodyHtml = printRef.current?.innerHTML || "";
      const w = openPrintWindow({ title: `تقرير — ${session.label}`, bodyHtml });
      if (!w) {
        setPrintMode(null);
        return;
      }
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

  return (
    <div className="ep-root">
      {/* Header */}
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
            { lbl: "صافي ل.س", val: nT.newSYP.toLocaleString(), pos: nT.newSYP >= 0 },
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
                {/* Name / Rep field */}
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
                {/* SYP */}
                <div className="ep-field">
                  <label className="ep-lbl">
                    <span className="dot dot--purple" />
                    ل.س
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
                {/* USD */}
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
                {/* Note */}
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
                {/* Submit */}
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
                lbl: "ل.س",
                val: curT.newSYP.toLocaleString(),
                cls: tab === "deposit" ? "et--purple" : "et--red",
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
                    <th>ل.س</th>
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

      {/* Confirm delete */}
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title={`تأكيد حذف ${deleteTarget?.type === "withdrawal" ? "السحب" : "الإيداع"}`}
        message={`سيتم حذف هذا الإدخال${deleteTarget?.repName ? ` باسم "${deleteTarget.repName}"` : ""}.`}
        confirmLabel="حذف الإدخال"
        loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {/* Print Dialog */}
      {printDialog && (
        <PrintDialog
          onClose={() => setPrintDialog(false)}
          onPrint={handlePrint}
          deps={deps}
          wths={wths}
          entries={entries}
          dT={dT}
          wT={wT}
          nT={nT}
        />
      )}

      {/* Print Template (off-screen; lifted into the print popup) */}
      <PrintTemplate
        printRef={printRef}
        title={printTitle()}
        reportDate={formatReportTimestamp()}
        totals={{ dep: dT, wth: wT, net: nT }}
        rows={pRows}
        money={formatMoney}
        entryDate={(entry) => formatEntryDate(entry, session.date || "-")}
        amountLines={(entry) => amountLines(entry, formatMoney)}
        printUserName={printUserName}
      />
    </div>
  );
}
