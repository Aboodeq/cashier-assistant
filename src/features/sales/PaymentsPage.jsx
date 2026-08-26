import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import Modal from "../../components/Modal";
import { formatDual, formatMoney } from "./currency";
import "./PaymentsPage.css";

const today = () => new Date().toISOString().split("T")[0];
const emptyForm = { clientId: "", currency: "USD", amount: "", date: today(), notes: "" };

export default function PaymentsPage() {
  const uid = auth.currentUser?.uid;
  const navigate = useNavigate();
  const location = useLocation();
  const payments = useFirestoreCollection(uid && ["users", uid, "salesPayments"], {
    orderByField: "createdAt",
  });
  const clients = useFirestoreCollection(uid && ["users", uid, "salesClients"], {
    orderByField: "createdAt",
  });
  const orders = useFirestoreCollection(uid && ["users", uid, "salesOrders"]);

  const [form, setForm] = useState(() => ({
    ...emptyForm,
    clientId: location.state?.clientId || "",
  }));
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterClient, setFilterClient] = useState("");

  const setField = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  // Balances are tracked per currency — a client can owe both USD and SYP at
  // once, and we never blend them into one converted figure.
  const balanceIn = (clientId, currency) => {
    const owed = orders
      .filter((o) => o.clientId === clientId && o.paymentType === "credit")
      .reduce((s, o) => s + (currency === "USD" ? o.totalUSD || 0 : o.totalSYP || 0), 0);
    const paid = payments
      .filter((p) => p.clientId === clientId && p.currency === currency)
      .reduce((s, p) => s + p.amount, 0);
    return owed - paid;
  };

  const balances = clients
    .map((c) => ({ ...c, usd: balanceIn(c.id, "USD"), syp: balanceIn(c.id, "SYP") }))
    .filter((c) => c.usd > 0 || c.syp > 0)
    .sort((a, b) => b.usd + b.syp / 100000 - (a.usd + a.syp / 100000));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.clientId || !Number(form.amount)) return;
    setLoading(true);
    const client = clients.find((c) => c.id === form.clientId);
    await addDoc(collection(db, "users", uid, "salesPayments"), {
      clientId: form.clientId,
      clientName: client?.name || "",
      currency: form.currency,
      amount: Number(form.amount),
      date: form.date,
      notes: form.notes.trim(),
      createdAt: Date.now(),
    });
    setForm({ ...emptyForm, clientId: form.clientId, currency: form.currency });
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await deleteDoc(doc(db, "users", uid, "salesPayments", deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = async (id) => {
    if (!editData.clientId || !Number(editData.amount)) return;
    const client = clients.find((c) => c.id === editData.clientId);
    await updateDoc(doc(db, "users", uid, "salesPayments", id), {
      clientId: editData.clientId,
      clientName: client?.name || "",
      currency: editData.currency,
      amount: Number(editData.amount),
      date: editData.date,
      notes: editData.notes.trim(),
    });
    setEditId(null);
  };

  const filtered = payments.filter((p) => (filterClient ? p.clientId === filterClient : true));

  return (
    <>
      <div className="py-root">
        {/* Header */}
        <div className="py-header">
          <div className="py-header-bg" />
          <div className="py-header-body">
            <div className="py-header-left">
              <button className="py-back-btn" onClick={() => navigate("/sales/clients")}>
                <i className="fa-solid fa-arrow-right" />
                العملاء
              </button>
              <div>
                <h1 className="py-header-title">التحصيلات</h1>
                <p className="py-header-sub">أرصدة العملاء وتسجيل الدفعات المحصّلة</p>
              </div>
            </div>
            <div className="py-header-badge">
              <i className="fa-solid fa-scale-balanced" style={{ fontSize: 11 }} />
              {balances.length} عميل مدين
            </div>
          </div>
        </div>

        <div className="py-body">
          {/* Balances */}
          <div className="py-balances">
            <div className="py-section-title">
              <i className="fa-solid fa-scale-balanced" style={{ color: "#16a34a", fontSize: 16 }} />
              أرصدة العملاء المستحقة
            </div>
            {balances.length === 0 ? (
              <div className="py-no-balances">
                <i className="fa-solid fa-circle-check" />
                لا يوجد أي رصيد مستحق على عملائك حالياً
              </div>
            ) : (
              <div className="py-balance-grid">
                {balances.map((c) => (
                  <div key={c.id} className="py-balance-card">
                    <div className="py-balance-info">
                      <div className="py-balance-name">{c.name}</div>
                      <div className="py-balance-territory">{c.territoryName}</div>
                    </div>
                    <div className="py-balance-side">
                      <span className="py-balance-amount">{formatDual(c.usd, c.syp)}</span>
                      <button
                        className="py-balance-btn"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            clientId: c.id,
                            currency: c.usd > 0 ? "USD" : "SYP",
                          }))
                        }
                      >
                        <i className="fa-solid fa-hand-holding-dollar" />
                        تحصيل
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add form */}
          <div className="py-add-card">
            <div className="py-section-title">
              <i className="fa-solid fa-plus-circle" style={{ color: "#16a34a", fontSize: 16 }} />
              تسجيل دفعة محصّلة
            </div>
            {clients.length === 0 ? (
              <div className="py-no-balances">
                <i className="fa-solid fa-triangle-exclamation" style={{ color: "#f59e0b" }} />
                يجب إضافة عميل أولاً
              </div>
            ) : (
              <form onSubmit={handleAdd} className="py-add-grid">
                <div className="py-field">
                  <label className="py-lbl">
                    <i className="fa-solid fa-address-book" />
                    العميل
                  </label>
                  <div className="py-inp-wrap">
                    <select className="py-inp" value={form.clientId} onChange={setField("clientId")} required>
                      <option value="">اختر العميل...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="py-field">
                  <label className="py-lbl">
                    <i className="fa-solid fa-money-bill-wave" />
                    العملة
                  </label>
                  <div className="py-inp-wrap">
                    <select className="py-inp" value={form.currency} onChange={setField("currency")}>
                      <option value="USD">دولار</option>
                      <option value="SYP">ليرة سورية</option>
                    </select>
                  </div>
                </div>
                <div className="py-field">
                  <label className="py-lbl">
                    <i className="fa-solid fa-sack-dollar" />
                    المبلغ
                  </label>
                  <div className="py-inp-wrap">
                    <input
                      className="py-inp"
                      type="number"
                      min="1"
                      step="any"
                      placeholder="0"
                      value={form.amount}
                      onChange={setField("amount")}
                      required
                    />
                  </div>
                </div>
                <div className="py-field">
                  <label className="py-lbl">
                    <i className="fa-regular fa-calendar" />
                    التاريخ
                  </label>
                  <div className="py-inp-wrap">
                    <input className="py-inp" type="date" value={form.date} onChange={setField("date")} required />
                  </div>
                </div>
                <div className="py-field">
                  <label className="py-lbl">
                    <i className="fa-regular fa-note-sticky" />
                    ملاحظات
                  </label>
                  <div className="py-inp-wrap">
                    <input
                      className="py-inp"
                      placeholder="اختياري..."
                      value={form.notes}
                      onChange={setField("notes")}
                    />
                  </div>
                </div>
                <div className="py-field py-field--submit">
                  <button
                    type="submit"
                    className="py-add-btn"
                    disabled={loading || !form.clientId || !Number(form.amount)}
                  >
                    {loading ? (
                      <>
                        <div className="py-spinner" />
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

          {/* Filter */}
          {payments.length > 0 && (
            <div className="py-filters">
              <div className="py-filter-select-wrap">
                <i className="fa-solid fa-address-book py-filter-ico" />
                <select
                  className="py-filter-select"
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
            </div>
          )}

          {/* List */}
          {payments.length === 0 ? (
            <div className="py-empty">
              <div className="py-empty-ico">
                <i className="fa-solid fa-hand-holding-dollar" style={{ fontSize: 34, color: "#86efac" }} />
              </div>
              <div className="py-empty-title">لا توجد دفعات مسجّلة بعد</div>
              <div className="py-empty-sub">سجّل أول دفعة تحصيل من الحقل أعلاه</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-empty">
              <div className="py-empty-ico">
                <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 28, color: "#86efac" }} />
              </div>
              <div className="py-empty-title">لا توجد نتائج</div>
              <div className="py-empty-sub">جرب تغيير الفلتر</div>
            </div>
          ) : (
            <div className="py-list">
              {filtered.map((p, i) => (
                <div key={p.id} className="py-item" style={{ animationDelay: `${i * 0.04}s` }}>
                  <div className="py-item-left">
                    <div className="py-item-ico">
                      <i className="fa-solid fa-hand-holding-dollar" style={{ fontSize: 16, color: "#16a34a" }} />
                    </div>
                    <div className="py-item-info">
                      <div className="py-item-name">{p.clientName}</div>
                      <div className="py-item-meta">
                        <span className="py-item-amount">
                          <i className="fa-solid fa-sack-dollar" style={{ fontSize: 10 }} />
                          {formatMoney(p.amount, p.currency || "USD")}
                        </span>
                        <span>
                          <i className="fa-regular fa-calendar" style={{ fontSize: 10 }} />
                          {p.date}
                        </span>
                      </div>
                      {p.notes && <div className="py-item-notes">{p.notes}</div>}
                    </div>
                  </div>
                  <div className="py-item-actions">
                    <button
                      className="py-btn py-btn--edit"
                      onClick={() => {
                        setEditId(p.id);
                        setEditData({
                          clientId: p.clientId,
                          currency: p.currency || "USD",
                          amount: p.amount,
                          date: p.date,
                          notes: p.notes || "",
                        });
                      }}
                    >
                      <i className="fa-solid fa-pen" />
                    </button>
                    <button
                      className="py-btn py-btn--del"
                      onClick={() => setDeleteTarget(p)}
                      disabled={deleting === p.id}
                    >
                      {deleting === p.id ? (
                        <div className="py-spinner py-spinner--red" />
                      ) : (
                        <i className="fa-solid fa-trash" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Modal
        open={Boolean(editId)}
        onClose={() => setEditId(null)}
        icon="fa-solid fa-pen"
        title="تعديل الدفعة"
        subtitle="عدّل بيانات الدفعة المحصّلة"
      >
        <div className="py-modal-form">
          <div className="py-field">
            <label className="py-lbl">
              <i className="fa-solid fa-address-book" />
              العميل
            </label>
            <div className="py-inp-wrap">
              <select
                className="py-inp"
                value={editData.clientId}
                onChange={(e) => setEditData((d) => ({ ...d, clientId: e.target.value }))}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="py-field">
            <label className="py-lbl">
              <i className="fa-solid fa-money-bill-wave" />
              العملة
            </label>
            <div className="py-inp-wrap">
              <select
                className="py-inp"
                value={editData.currency}
                onChange={(e) => setEditData((d) => ({ ...d, currency: e.target.value }))}
              >
                <option value="USD">دولار</option>
                <option value="SYP">ليرة سورية</option>
              </select>
            </div>
          </div>
          <div className="py-field">
            <label className="py-lbl">
              <i className="fa-solid fa-sack-dollar" />
              المبلغ
            </label>
            <div className="py-inp-wrap">
              <input
                className="py-inp"
                type="number"
                min="1"
                step="any"
                value={editData.amount}
                onChange={(e) => setEditData((d) => ({ ...d, amount: e.target.value }))}
              />
            </div>
          </div>
          <div className="py-field">
            <label className="py-lbl">
              <i className="fa-regular fa-calendar" />
              التاريخ
            </label>
            <div className="py-inp-wrap">
              <input
                className="py-inp"
                type="date"
                value={editData.date}
                onChange={(e) => setEditData((d) => ({ ...d, date: e.target.value }))}
              />
            </div>
          </div>
          <div className="py-field">
            <label className="py-lbl">
              <i className="fa-regular fa-note-sticky" />
              ملاحظات
            </label>
            <div className="py-inp-wrap">
              <input
                className="py-inp"
                placeholder="اختياري..."
                value={editData.notes}
                onChange={(e) => setEditData((d) => ({ ...d, notes: e.target.value }))}
              />
            </div>
          </div>
          <div className="py-modal-actions">
            <button
              type="button"
              className="py-add-btn py-modal-save"
              onClick={() => handleEdit(editId)}
              disabled={!editData.clientId || !Number(editData.amount)}
            >
              <i className="fa-solid fa-check" />
              حفظ التعديلات
            </button>
            <button type="button" className="py-btn py-btn--cancel" onClick={() => setEditId(null)}>
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="تأكيد حذف الدفعة"
        message={`سيتم حذف دفعة "${deleteTarget?.clientName || ""}" بقيمة ${deleteTarget ? formatMoney(deleteTarget.amount, deleteTarget.currency || "USD") : ""}.`}
        confirmLabel="حذف الدفعة"
        loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
