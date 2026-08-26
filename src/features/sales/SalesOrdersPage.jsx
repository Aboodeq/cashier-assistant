import { useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useLocation } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import { formatDual, priceIn, useExchangeRate } from "./currency";
import "./SalesOrdersPage.css";

const today = () => new Date().toISOString().split("T")[0];

const emptyLine = { productId: "", currency: "USD", quantity: "", price: "" };
const emptyOrderForm = { clientId: "", paymentType: "cash", visitId: "", date: today(), notes: "" };

export default function SalesOrdersPage() {
  const uid = auth.currentUser?.uid;
  const location = useLocation();
  const rate = useExchangeRate();
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

  const [orderForm, setOrderForm] = useState(() => ({
    ...emptyOrderForm,
    clientId: location.state?.clientId || "",
  }));
  const [line, setLine] = useState(emptyLine);
  const [cart, setCart] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({ date: today(), paymentType: "cash", notes: "" });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterClient, setFilterClient] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterPayment, setFilterPayment] = useState("");

  const stockOf = (productId) =>
    moves
      .filter((m) => m.productId === productId)
      .reduce((t, m) => t + (m.type === "load" ? m.quantity : -m.quantity), 0);
  const cartQtyOf = (productId) =>
    cart.filter((i) => i.productId === productId).reduce((s, i) => s + i.quantity, 0);
  const availableOf = (productId) => stockOf(productId) - cartQtyOf(productId);

  const setLineField = (field) => (e) => setLine((p) => ({ ...p, [field]: e.target.value }));

  const onLineProductChange = (e) => {
    const product = products.find((p) => p.id === e.target.value);
    setLine((p) => ({
      ...p,
      productId: e.target.value,
      price: product ? priceIn(product, p.currency, rate) || "" : "",
    }));
  };
  const setLineCurrency = (currency) => {
    const product = products.find((p) => p.id === line.productId);
    setLine((p) => ({ ...p, currency, price: product ? priceIn(product, currency, rate) || "" : "" }));
  };

  const lineTotal = (Number(line.quantity) || 0) * (Number(line.price) || 0);
  const lineProduct = products.find((p) => p.id === line.productId);
  const lineOverStock = lineProduct != null && Number(line.quantity) > availableOf(line.productId);

  const addLineToCart = () => {
    if (!line.productId || !Number(line.quantity) || !Number(line.price)) return;
    const product = products.find((p) => p.id === line.productId);
    setCart((c) => [
      ...c,
      {
        productId: line.productId,
        productName: product?.name || "",
        unit: product?.unit || "",
        currency: line.currency,
        quantity: Number(line.quantity),
        price: Number(line.price),
        lineTotal: Number(line.quantity) * Number(line.price),
      },
    ]);
    setLine((p) => ({ ...emptyLine, currency: p.currency }));
  };
  const removeFromCart = (index) => setCart((c) => c.filter((_, i) => i !== index));

  const cartTotals = cart.reduce(
    (acc, i) => {
      if (i.currency === "USD") acc.usd += i.lineTotal;
      else acc.syp += i.lineTotal;
      return acc;
    },
    { usd: 0, syp: 0 },
  );

  const clientVisits = orderForm.clientId ? visits.filter((v) => v.clientId === orderForm.clientId) : [];

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (!orderForm.clientId || cart.length === 0) return;
    setLoading(true);
    // Safe: this only ever runs in response to the form's submit event, never during
    // render — see https://react.dev/reference/rules/components-and-hooks-must-be-pure,
    // which explicitly calls out event handlers as the right place for side effects.
    // eslint-disable-next-line react-hooks/purity
    const createdAt = Date.now();
    const client = clients.find((c) => c.id === orderForm.clientId);
    const orderRef = await addDoc(collection(db, "users", uid, "salesOrders"), {
      clientId: orderForm.clientId,
      clientName: client?.name || "",
      territoryId: client?.territoryId || "",
      territoryName: client?.territoryName || "",
      date: orderForm.date,
      visitId: orderForm.visitId || "",
      items: cart,
      totalUSD: cartTotals.usd,
      totalSYP: cartTotals.syp,
      paymentType: orderForm.paymentType,
      notes: orderForm.notes.trim(),
      createdAt,
    });
    const movePromises = [];
    for (const item of cart) {
      movePromises.push(
        addDoc(collection(db, "users", uid, "salesStockMoves"), {
          productId: item.productId,
          productName: item.productName,
          unit: item.unit,
          type: "sale",
          quantity: item.quantity,
          date: orderForm.date,
          notes: `بيع لـ ${client?.name || ""}`,
          orderId: orderRef.id,
          createdAt,
        }),
      );
    }
    await Promise.all(movePromises);
    setCart([]);
    setLine(emptyLine);
    setOrderForm({ ...emptyOrderForm, clientId: orderForm.clientId, date: orderForm.date });
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      const linkedMoves = moves.filter((m) => m.orderId === deleteTarget.id);
      await Promise.all(
        linkedMoves.map((m) => deleteDoc(doc(db, "users", uid, "salesStockMoves", m.id))),
      );
      await deleteDoc(doc(db, "users", uid, "salesOrders", deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = async (id) => {
    await updateDoc(doc(db, "users", uid, "salesOrders", id), {
      date: editData.date,
      paymentType: editData.paymentType,
      notes: editData.notes.trim(),
    });
    const linkedMoves = moves.filter((m) => m.orderId === id);
    await Promise.all(
      linkedMoves.map((m) =>
        updateDoc(doc(db, "users", uid, "salesStockMoves", m.id), { date: editData.date }),
      ),
    );
    setEditId(null);
  };

  const filtered = orders
    .filter((o) => (filterClient ? o.clientId === filterClient : true))
    .filter((o) => (filterProduct ? o.items?.some((i) => i.productId === filterProduct) : true))
    .filter((o) => (filterPayment ? o.paymentType === filterPayment : true));

  const grand = filtered.reduce(
    (acc, o) => {
      acc.usd += o.totalUSD || 0;
      acc.syp += o.totalSYP || 0;
      if (o.paymentType === "credit") {
        acc.creditUSD += o.totalUSD || 0;
        acc.creditSYP += o.totalSYP || 0;
      } else {
        acc.cashUSD += o.totalUSD || 0;
        acc.cashSYP += o.totalSYP || 0;
      }
      return acc;
    },
    { usd: 0, syp: 0, cashUSD: 0, cashSYP: 0, creditUSD: 0, creditSYP: 0 },
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
                <p className="so-header-sub">أضف عدة أصناف بعملات مختلفة لعملية بيع واحدة</p>
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
              تسجيل عملية بيع جديدة
            </div>

            {clients.length === 0 || products.length === 0 ? (
              <div className="so-warn">
                <i className="fa-solid fa-triangle-exclamation" style={{ color: "#f59e0b" }} />
                يجب إضافة عميل ومنتج واحد على الأقل قبل تسجيل عملية بيع
              </div>
            ) : (
              <>
                {/* Client */}
                <div className="so-field so-client-field">
                  <label className="so-lbl">
                    <i className="fa-solid fa-address-book" />
                    العميل
                  </label>
                  <div className="so-inp-wrap">
                    <select
                      className="so-inp"
                      value={orderForm.clientId}
                      onChange={(e) =>
                        setOrderForm((p) => ({ ...p, clientId: e.target.value, visitId: "" }))
                      }
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

                <div className="so-divider">أضف الأصناف</div>

                {/* Line item builder */}
                <div className="so-currency-toggle" style={{ marginBottom: 10 }}>
                  <button
                    type="button"
                    className={`so-currency-btn ${line.currency === "USD" ? "so-currency-btn--on" : ""}`}
                    onClick={() => setLineCurrency("USD")}
                  >
                    <i className="fa-solid fa-dollar-sign" />
                    دولار
                  </button>
                  <button
                    type="button"
                    className={`so-currency-btn ${line.currency === "SYP" ? "so-currency-btn--on" : ""}`}
                    onClick={() => setLineCurrency("SYP")}
                  >
                    <i className="fa-solid fa-money-bill" />
                    ليرة سورية
                  </button>
                </div>
                <div className="so-line-grid">
                  <div className="so-field">
                    <label className="so-lbl">
                      <i className="fa-solid fa-box" />
                      المنتج
                    </label>
                    <div className="so-inp-wrap">
                      <select className="so-inp" value={line.productId} onChange={onLineProductChange}>
                        <option value="">اختر المنتج...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (متوفر: {availableOf(p.id)})
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
                        value={line.quantity}
                        onChange={setLineField("quantity")}
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
                        step="any"
                        placeholder="0"
                        value={line.price}
                        onChange={setLineField("price")}
                      />
                    </div>
                  </div>
                  <div className="so-field">
                    <label className="so-lbl">
                      <i className="fa-solid fa-equals" />
                      المجموع
                    </label>
                    <div className="so-line-total-box">
                      {line.currency === "USD" ? "$" : ""}
                      {lineTotal.toLocaleString()}
                      {line.currency === "SYP" ? " ل.س" : ""}
                    </div>
                  </div>
                </div>

                {lineOverStock && (
                  <div className="so-warn" style={{ marginTop: 10 }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ color: "#f59e0b" }} />
                    الكمية أكبر من المتوفر ({availableOf(line.productId)}) — يمكنك المتابعة رغم ذلك
                  </div>
                )}

                <button
                  type="button"
                  className="so-add-line-btn"
                  style={{ marginTop: 10 }}
                  onClick={addLineToCart}
                  disabled={!line.productId || !Number(line.quantity) || !Number(line.price)}
                >
                  <i className="fa-solid fa-cart-plus" />
                  أضف الصنف للسلة
                </button>

                {/* Cart */}
                {cart.length > 0 && (
                  <div className="so-cart">
                    {cart.map((item, i) => (
                      <div key={i} className="so-cart-row">
                        <div className="so-cart-row-info">
                          <span className="so-cart-row-name">{item.productName}</span>
                          <span className="so-cart-row-detail">
                            {item.quantity} {item.unit} ×{" "}
                            {item.currency === "USD" ? `$${item.price}` : `${item.price} ل.س`}
                          </span>
                          <span className="so-cart-row-total">
                            = {item.currency === "USD" ? `$${item.lineTotal.toLocaleString()}` : `${item.lineTotal.toLocaleString()} ل.س`}
                          </span>
                        </div>
                        <button className="so-cart-remove" onClick={() => removeFromCart(i)}>
                          <i className="fa-solid fa-xmark" />
                        </button>
                      </div>
                    ))}
                    <div className="so-cart-totals">
                      الإجمالي: {formatDual(cartTotals.usd, cartTotals.syp)}
                    </div>
                  </div>
                )}

                <div className="so-divider">تفاصيل عملية البيع</div>

                <form onSubmit={handleSubmitOrder} className="so-order-fields">
                  <div className="so-field">
                    <label className="so-lbl">
                      <i className="fa-solid fa-money-bill-wave" />
                      طريقة الدفع
                    </label>
                    <div className="so-payment-toggle">
                      <button
                        type="button"
                        className={`so-payment-btn so-payment-btn--cash ${orderForm.paymentType === "cash" ? "so-payment-btn--on" : ""}`}
                        onClick={() => setOrderForm((p) => ({ ...p, paymentType: "cash" }))}
                      >
                        <i className="fa-solid fa-money-bill" />
                        نقداً
                      </button>
                      <button
                        type="button"
                        className={`so-payment-btn so-payment-btn--credit ${orderForm.paymentType === "credit" ? "so-payment-btn--on" : ""}`}
                        onClick={() => setOrderForm((p) => ({ ...p, paymentType: "credit" }))}
                      >
                        <i className="fa-solid fa-hand-holding-dollar" />
                        بالدَّين
                      </button>
                    </div>
                  </div>

                  <div className="so-order-fields-row">
                    <div className="so-field">
                      <label className="so-lbl">
                        <i className="fa-regular fa-calendar" />
                        التاريخ
                      </label>
                      <div className="so-inp-wrap">
                        <input
                          className="so-inp"
                          type="date"
                          value={orderForm.date}
                          onChange={(e) => setOrderForm((p) => ({ ...p, date: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    {clientVisits.length > 0 && (
                      <div className="so-field">
                        <label className="so-lbl">
                          <i className="fa-solid fa-route" />
                          مرتبطة بزيارة (اختياري)
                        </label>
                        <div className="so-inp-wrap">
                          <select
                            className="so-inp"
                            value={orderForm.visitId}
                            onChange={(e) => setOrderForm((p) => ({ ...p, visitId: e.target.value }))}
                          >
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
                  </div>

                  <div className="so-field">
                    <label className="so-lbl">
                      <i className="fa-regular fa-note-sticky" />
                      ملاحظات
                    </label>
                    <div className="so-inp-wrap">
                      <input
                        className="so-inp"
                        placeholder="ملاحظات... (اختياري)"
                        value={orderForm.notes}
                        onChange={(e) => setOrderForm((p) => ({ ...p, notes: e.target.value }))}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="so-add-btn"
                    disabled={loading || !orderForm.clientId || cart.length === 0}
                  >
                    {loading ? (
                      <>
                        <div className="so-spinner" />
                        جاري...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check" />
                        تسجيل عملية البيع ({cart.length} صنف)
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Totals strip */}
          {filtered.length > 0 && (
            <div className="so-totals-strip">
              <div className="so-total-chip">
                <span className="so-total-chip-lbl">إجمالي المبيعات</span>
                <span className="so-total-chip-val">{formatDual(grand.usd, grand.syp)}</span>
              </div>
              <div className="so-total-chip">
                <span className="so-total-chip-lbl">نقداً</span>
                <span className="so-total-chip-val" style={{ color: "#059669" }}>
                  {formatDual(grand.cashUSD, grand.cashSYP)}
                </span>
              </div>
              <div className="so-total-chip">
                <span className="so-total-chip-lbl">بالدَّين</span>
                <span className="so-total-chip-val" style={{ color: "#b45309" }}>
                  {formatDual(grand.creditUSD, grand.creditSYP)}
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
                      <i className="fa-solid fa-file-invoice-dollar" style={{ fontSize: 16, color: "#4338ca" }} />
                    </div>
                    {editId === o.id ? (
                      <div className="so-edit-grid">
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
                          <span className="so-item-name">{o.clientName}</span>
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
                        <div className="so-order-items">
                          {(o.items || []).map((item, idx) => (
                            <div key={idx} className="so-order-item-row">
                              <i className="fa-solid fa-circle" />
                              <span className="so-order-item-name">{item.productName}</span>
                              <span>
                                {item.quantity} {item.unit} ×{" "}
                                {item.currency === "USD" ? `$${item.price}` : `${item.price} ل.س`} ={" "}
                                {item.currency === "USD"
                                  ? `$${item.lineTotal.toLocaleString()}`
                                  : `${item.lineTotal.toLocaleString()} ل.س`}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="so-item-meta">
                          <span className="so-item-total">
                            <i className="fa-solid fa-equals" style={{ fontSize: 10 }} />
                            {formatDual(o.totalUSD, o.totalSYP)}
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
                              date: o.date,
                              paymentType: o.paymentType,
                              notes: o.notes || "",
                            });
                          }}
                          title="تعديل التاريخ/الدفع/الملاحظات"
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
        message={`سيتم حذف عملية البيع لـ "${deleteTarget?.clientName || ""}" بكل أصنافها، وإرجاع الكميات إلى المخزون.`}
        confirmLabel="حذف العملية"
        loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}
