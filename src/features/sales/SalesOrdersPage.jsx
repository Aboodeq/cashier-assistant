import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useLocation } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import "./SalesOrdersPage.css";

const today = () => new Date().toISOString().split("T")[0];
const emptyForm = {
  clientId: "",
  productId: "",
  quantity: "",
  price: "",
  paymentType: "cash",
  visitId: "",
  date: today(),
  notes: "",
};

export default function SalesOrdersPage() {
  const uid = auth.currentUser?.uid;
  const location = useLocation();
  const orders = useFirestoreCollection(uid && ["users", uid, "salesOrders"], {
    orderByField: "createdAt",
  });
  const clients = useFirestoreCollection(uid && ["users", uid, "salesClients"], {
    orderByField: "createdAt",
  });
  const products = useFirestoreCollection(uid && ["users", uid, "salesProducts"], {
    orderByField: "createdAt",
  });
  const visits = useFirestoreCollection(uid && ["users", uid, "salesVisits"]);
  const moves = useFirestoreCollection(uid && ["users", uid, "salesStockMoves"]);

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
  const [filterProduct, setFilterProduct] = useState("");
  const [filterPayment, setFilterPayment] = useState("");

  const setField = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const stockOf = (productId) =>
    moves
      .filter((m) => m.productId === productId)
      .reduce((t, m) => t + (m.type === "load" ? m.quantity : -m.quantity), 0);

  const onProductChange = (e) => {
    const product = products.find((p) => p.id === e.target.value);
    setForm((p) => ({ ...p, productId: e.target.value, price: product?.price ?? p.price }));
  };

  const clientVisits = form.clientId ? visits.filter((v) => v.clientId === form.clientId) : [];
  const total = (Number(form.quantity) || 0) * (Number(form.price) || 0);
  const selectedStock = form.productId ? stockOf(form.productId) : null;
  const overStock = selectedStock != null && Number(form.quantity) > selectedStock;

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.clientId || !form.productId || !Number(form.quantity)) return;
    setLoading(true);
    const client = clients.find((c) => c.id === form.clientId);
    const product = products.find((p) => p.id === form.productId);
    const quantity = Number(form.quantity);
    const price = Number(form.price) || 0;
    const orderRef = await addDoc(collection(db, "users", uid, "salesOrders"), {
      clientId: form.clientId,
      clientName: client?.name || "",
      territoryId: client?.territoryId || "",
      territoryName: client?.territoryName || "",
      productId: form.productId,
      productName: product?.name || "",
      unit: product?.unit || "",
      quantity,
      price,
      total: quantity * price,
      paymentType: form.paymentType,
      visitId: form.visitId || "",
      date: form.date,
      notes: form.notes.trim(),
      createdAt: Date.now(),
    });
    await addDoc(collection(db, "users", uid, "salesStockMoves"), {
      productId: form.productId,
      productName: product?.name || "",
      unit: product?.unit || "",
      type: "sale",
      quantity,
      date: form.date,
      notes: `بيع لـ ${client?.name || ""}`,
      orderId: orderRef.id,
      createdAt: Date.now(),
    });
    setForm({ ...emptyForm, clientId: form.clientId, date: form.date });
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      const linkedMove = moves.find((m) => m.orderId === deleteTarget.id);
      if (linkedMove) await deleteDoc(doc(db, "users", uid, "salesStockMoves", linkedMove.id));
      await deleteDoc(doc(db, "users", uid, "salesOrders", deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = async (id) => {
    if (!editData.clientId || !editData.productId || !Number(editData.quantity)) return;
    const client = clients.find((c) => c.id === editData.clientId);
    const product = products.find((p) => p.id === editData.productId);
    const quantity = Number(editData.quantity);
    const price = Number(editData.price) || 0;
    await updateDoc(doc(db, "users", uid, "salesOrders", id), {
      clientId: editData.clientId,
      clientName: client?.name || "",
      territoryId: client?.territoryId || "",
      territoryName: client?.territoryName || "",
      productId: editData.productId,
      productName: product?.name || "",
      unit: product?.unit || "",
      quantity,
      price,
      total: quantity * price,
      paymentType: editData.paymentType,
      date: editData.date,
      notes: editData.notes.trim(),
    });
    const linkedMove = moves.find((m) => m.orderId === id);
    if (linkedMove) {
      await updateDoc(doc(db, "users", uid, "salesStockMoves", linkedMove.id), {
        productId: editData.productId,
        productName: product?.name || "",
        unit: product?.unit || "",
        quantity,
        date: editData.date,
      });
    }
    setEditId(null);
  };

  const filtered = orders
    .filter((o) => (filterClient ? o.clientId === filterClient : true))
    .filter((o) => (filterProduct ? o.productId === filterProduct : true))
    .filter((o) => (filterPayment ? o.paymentType === filterPayment : true));

  const grand = filtered.reduce(
    (acc, o) => {
      acc.total += o.total;
      if (o.paymentType === "credit") acc.credit += o.total;
      else acc.cash += o.total;
      return acc;
    },
    { total: 0, cash: 0, credit: 0 },
  );

  return (
    <>
      <div className="so-root">
        {/* Header */}
        <div className="so-header">
          <div className="so-header-bg" />
          <div className="so-header-body">
            <div className="so-header-left">
              <div className="so-header-ico">
                <i className="fa-solid fa-file-invoice-dollar" style={{ fontSize: 22, color: "#fff" }} />
              </div>
              <div>
                <h1 className="so-header-title">المبيعات</h1>
                <p className="so-header-sub">سجّل مبيعاتك — نقداً أو بالدَّين — وتُخصم البضاعة تلقائياً</p>
              </div>
            </div>
            <div className="so-header-badge">
              <i className="fa-solid fa-file-invoice-dollar" style={{ fontSize: 11 }} />
              {orders.length} عملية بيع
            </div>
          </div>
        </div>

        <div className="so-body">
          {/* Add form */}
          <div className="so-add-card">
            <div className="so-add-title">
              <i className="fa-solid fa-plus-circle" style={{ color: "#4338ca", fontSize: 16 }} />
              تسجيل عملية بيع
            </div>

            {clients.length === 0 || products.length === 0 ? (
              <div className="so-warn">
                <i className="fa-solid fa-triangle-exclamation" style={{ color: "#f59e0b" }} />
                يجب إضافة عميل ومنتج واحد على الأقل قبل تسجيل عملية بيع
              </div>
            ) : (
              <form onSubmit={handleAdd} className="so-add-grid">
                <div className="so-field">
                  <label className="so-lbl">
                    <i className="fa-solid fa-address-book" />
                    العميل
                  </label>
                  <div className="so-inp-wrap">
                    <select
                      className="so-inp"
                      value={form.clientId}
                      onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value, visitId: "" }))}
                      required
                    >
                      <option value="">اختر العميل...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="so-field">
                  <label className="so-lbl">
                    <i className="fa-solid fa-box" />
                    المنتج
                  </label>
                  <div className="so-inp-wrap">
                    <select className="so-inp" value={form.productId} onChange={onProductChange} required>
                      <option value="">اختر المنتج...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (متوفر: {stockOf(p.id)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="so-field">
                  <label className="so-lbl">
                    <i className="fa-solid fa-hashtag" />
                    الكمية
                  </label>
                  <div className="so-inp-wrap">
                    <input
                      className="so-inp"
                      type="number"
                      min="1"
                      placeholder="0"
                      value={form.quantity}
                      onChange={setField("quantity")}
                      required
                    />
                  </div>
                </div>
                <div className="so-field">
                  <label className="so-lbl">
                    <i className="fa-solid fa-sack-dollar" />
                    سعر الوحدة
                  </label>
                  <div className="so-inp-wrap">
                    <input
                      className="so-inp"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={form.price}
                      onChange={setField("price")}
                      required
                    />
                  </div>
                </div>

                <div className="so-field so-field--payment">
                  <label className="so-lbl">
                    <i className="fa-solid fa-money-bill-wave" />
                    طريقة الدفع
                  </label>
                  <div className="so-payment-toggle">
                    <button
                      type="button"
                      className={`so-payment-btn so-payment-btn--cash ${form.paymentType === "cash" ? "so-payment-btn--on" : ""}`}
                      onClick={() => setForm((p) => ({ ...p, paymentType: "cash" }))}
                    >
                      <i className="fa-solid fa-money-bill" />
                      نقداً
                    </button>
                    <button
                      type="button"
                      className={`so-payment-btn so-payment-btn--credit ${form.paymentType === "credit" ? "so-payment-btn--on" : ""}`}
                      onClick={() => setForm((p) => ({ ...p, paymentType: "credit" }))}
                    >
                      <i className="fa-solid fa-hand-holding-dollar" />
                      بالدَّين
                    </button>
                  </div>
                </div>

                <div className="so-field">
                  <label className="so-lbl">
                    <i className="fa-regular fa-calendar" />
                    التاريخ
                  </label>
                  <div className="so-inp-wrap">
                    <input className="so-inp" type="date" value={form.date} onChange={setField("date")} required />
                  </div>
                </div>
                <div className="so-field">
                  <label className="so-lbl">
                    <i className="fa-solid fa-equals" />
                    الإجمالي
                  </label>
                  <div className="so-total-box">{total.toLocaleString()}</div>
                </div>

                {clientVisits.length > 0 && (
                  <div className="so-field so-field--visit">
                    <label className="so-lbl">
                      <i className="fa-solid fa-route" />
                      مرتبطة بزيارة (اختياري)
                    </label>
                    <div className="so-inp-wrap">
                      <select className="so-inp" value={form.visitId} onChange={setField("visitId")}>
                        <option value="">بدون ربط</option>
                        {clientVisits.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.date}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="so-field so-field--notes">
                  <label className="so-lbl">
                    <i className="fa-regular fa-note-sticky" />
                    ملاحظات
                  </label>
                  <div className="so-inp-wrap">
                    <input
                      className="so-inp"
                      placeholder="ملاحظات... (اختياري)"
                      value={form.notes}
                      onChange={setField("notes")}
                    />
                  </div>
                </div>

                {overStock && (
                  <div className="so-field so-field--notes">
                    <div className="so-warn">
                      <i className="fa-solid fa-triangle-exclamation" style={{ color: "#f59e0b" }} />
                      الكمية المطلوبة ({form.quantity}) أكبر من المتوفر ({selectedStock}) — سيُسجَّل البيع
                      رغم ذلك
                    </div>
                  </div>
                )}

                <div className="so-field so-field--submit">
                  <button
                    type="submit"
                    className="so-add-btn"
                    disabled={loading || !form.clientId || !form.productId || !Number(form.quantity)}
                  >
                    {loading ? (
                      <>
                        <div className="so-spinner" />
                        جاري...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-plus" />
                        تسجيل البيع
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Totals strip */}
          {filtered.length > 0 && (
            <div className="so-totals-strip">
              <div className="so-total-chip">
                <span className="so-total-chip-lbl">إجمالي المبيعات</span>
                <span className="so-total-chip-val">{grand.total.toLocaleString()}</span>
              </div>
              <div className="so-total-chip">
                <span className="so-total-chip-lbl">نقداً</span>
                <span className="so-total-chip-val" style={{ color: "#059669" }}>
                  {grand.cash.toLocaleString()}
                </span>
              </div>
              <div className="so-total-chip">
                <span className="so-total-chip-lbl">بالدَّين</span>
                <span className="so-total-chip-val" style={{ color: "#b45309" }}>
                  {grand.credit.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Filters */}
          {orders.length > 0 && (
            <div className="so-filters">
              <div className="so-filter-select-wrap">
                <i className="fa-solid fa-address-book so-filter-ico" />
                <select
                  className="so-filter-select"
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
              <div className="so-filter-select-wrap">
                <i className="fa-solid fa-box so-filter-ico" />
                <select
                  className="so-filter-select"
                  value={filterProduct}
                  onChange={(e) => setFilterProduct(e.target.value)}
                >
                  <option value="">كل المنتجات</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="so-filter-select-wrap">
                <i className="fa-solid fa-money-bill-wave so-filter-ico" />
                <select
                  className="so-filter-select"
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value)}
                >
                  <option value="">كل طرق الدفع</option>
                  <option value="cash">نقداً</option>
                  <option value="credit">بالدَّين</option>
                </select>
              </div>
            </div>
          )}

          {/* List */}
          {orders.length === 0 ? (
            <div className="so-empty">
              <div className="so-empty-ico">
                <i
                  className="fa-solid fa-file-invoice-dollar"
                  style={{ fontSize: 34, color: "#c7d2fe" }}
                />
              </div>
              <div className="so-empty-title">لا توجد عمليات بيع بعد</div>
              <div className="so-empty-sub">سجّل أول عملية بيع من الحقل أعلاه</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="so-empty">
              <div className="so-empty-ico">
                <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 28, color: "#c7d2fe" }} />
              </div>
              <div className="so-empty-title">لا توجد نتائج</div>
              <div className="so-empty-sub">جرب تغيير الفلتر</div>
            </div>
          ) : (
            <div className="so-list">
              {filtered.map((o, i) => (
                <div
                  key={o.id}
                  className="so-item"
                  style={{
                    animationDelay: `${i * 0.04}s`,
                    "--so-accent": o.paymentType === "credit" ? "#b45309" : "#059669",
                  }}
                >
                  <div className="so-item-left">
                    <div className="so-item-ico">
                      <i className="fa-solid fa-box" style={{ fontSize: 16, color: "#4338ca" }} />
                    </div>
                    {editId === o.id ? (
                      <div className="so-edit-grid">
                        <select
                          className="so-edit-select"
                          value={editData.clientId}
                          onChange={(e) => setEditData((p) => ({ ...p, clientId: e.target.value }))}
                        >
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <select
                          className="so-edit-select"
                          value={editData.productId}
                          onChange={(e) => setEditData((p) => ({ ...p, productId: e.target.value }))}
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <input
                          className="so-edit-input"
                          type="number"
                          min="1"
                          value={editData.quantity}
                          onChange={(e) => setEditData((p) => ({ ...p, quantity: e.target.value }))}
                        />
                        <input
                          className="so-edit-input"
                          type="number"
                          min="0"
                          value={editData.price}
                          onChange={(e) => setEditData((p) => ({ ...p, price: e.target.value }))}
                        />
                        <select
                          className="so-edit-select"
                          value={editData.paymentType}
                          onChange={(e) => setEditData((p) => ({ ...p, paymentType: e.target.value }))}
                        >
                          <option value="cash">نقداً</option>
                          <option value="credit">بالدَّين</option>
                        </select>
                        <input
                          className="so-edit-input"
                          type="date"
                          value={editData.date}
                          onChange={(e) => setEditData((p) => ({ ...p, date: e.target.value }))}
                        />
                        <input
                          className="so-edit-input so-edit-full"
                          value={editData.notes}
                          onChange={(e) => setEditData((p) => ({ ...p, notes: e.target.value }))}
                          placeholder="ملاحظات"
                        />
                      </div>
                    ) : (
                      <div className="so-item-info">
                        <div className="so-item-name-row">
                          <span className="so-item-name">
                            {o.clientName} — {o.productName}
                          </span>
                          <span
                            className={`so-pay-tag ${o.paymentType === "credit" ? "so-pay-tag--credit" : "so-pay-tag--cash"}`}
                          >
                            <i
                              className={`fa-solid fa-${o.paymentType === "credit" ? "hand-holding-dollar" : "money-bill"}`}
                              style={{ fontSize: 9 }}
                            />
                            {o.paymentType === "credit" ? "بالدَّين" : "نقداً"}
                          </span>
                        </div>
                        <div className="so-item-meta">
                          <span>
                            <i className="fa-solid fa-hashtag" style={{ fontSize: 10 }} />
                            {o.quantity} {o.unit} × {o.price.toLocaleString()}
                          </span>
                          <span className="so-item-total">
                            <i className="fa-solid fa-equals" style={{ fontSize: 10 }} />
                            {o.total.toLocaleString()}
                          </span>
                          <span>
                            <i className="fa-regular fa-calendar" style={{ fontSize: 10 }} />
                            {o.date}
                          </span>
                        </div>
                        {o.notes && <div className="so-item-notes">{o.notes}</div>}
                      </div>
                    )}
                  </div>
                  <div className="so-item-actions">
                    {editId === o.id ? (
                      <>
                        <button className="so-btn so-btn--save" onClick={() => handleEdit(o.id)}>
                          <i className="fa-solid fa-check" />
                          حفظ
                        </button>
                        <button className="so-btn so-btn--cancel" onClick={() => setEditId(null)}>
                          <i className="fa-solid fa-xmark" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="so-btn so-btn--edit"
                          onClick={() => {
                            setEditId(o.id);
                            setEditData({
                              clientId: o.clientId,
                              productId: o.productId,
                              quantity: o.quantity,
                              price: o.price,
                              paymentType: o.paymentType,
                              date: o.date,
                              notes: o.notes || "",
                            });
                          }}
                        >
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button
                          className="so-btn so-btn--del"
                          onClick={() => setDeleteTarget(o)}
                          disabled={deleting === o.id}
                        >
                          {deleting === o.id ? (
                            <div className="so-spinner so-spinner--red" />
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
        title="تأكيد حذف عملية البيع"
        message={`سيتم حذف عملية بيع "${deleteTarget?.productName || ""}" لـ "${deleteTarget?.clientName || ""}"، وإرجاع الكمية إلى المخزون.`}
        confirmLabel="حذف العملية"
        loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
