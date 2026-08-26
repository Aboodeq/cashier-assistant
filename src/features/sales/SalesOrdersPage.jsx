import { useRef, useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useLocation } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { formatReportTimestamp } from "../../utils/format";
import { openPrintWindow } from "../../utils/printWindow";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import Modal from "../../components/Modal";
import { formatDual, priceIn, useExchangeRate } from "./currency";
import InvoiceTemplate, { INVOICE_PRINT_STYLES } from "./InvoiceTemplate";
import { availableUnits, baseUnitLabel, priceForUnit, toBaseQty, unitLabel } from "./packaging";
import "./SalesOrdersPage.css";

const today = () => new Date().toISOString().split("T")[0];

const emptyLine = { productId: "", currency: "USD", quantity: "", price: "", unitLevel: "" };
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
  const [editOrderForm, setEditOrderForm] = useState(emptyOrderForm);
  const [editLine, setEditLine] = useState(emptyLine);
  const [editCart, setEditCart] = useState([]);
  const [editSaving, setEditSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
  const printRef = useRef(null);
  const repName = auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "";
  const [filterClient, setFilterClient] = useState("");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterPayment, setFilterPayment] = useState("");

  // excludeOrderId lets the edit modal see stock as if this order's own moves
  // don't exist yet, so re-saving the same quantities never falsely warns.
  // Moves/cart lines may each be recorded in a different unit (carton/box/
  // piece) for the same product, so everything is normalized to that
  // product's smallest available unit before summing.
  const stockOf = (productId, excludeOrderId) => {
    const product = products.find((p) => p.id === productId);
    return moves
      .filter((m) => m.productId === productId && (!excludeOrderId || m.orderId !== excludeOrderId))
      .reduce((t, m) => {
        const qty = toBaseQty(product, m.unitLevel, m.quantity);
        return t + (m.type === "load" ? qty : -qty);
      }, 0);
  };
  const cartQtyOf = (cartList, productId) => {
    const product = products.find((p) => p.id === productId);
    return cartList
      .filter((i) => i.productId === productId)
      .reduce((s, i) => s + toBaseQty(product, i.unitLevel, i.quantity), 0);
  };
  const availableOf = (productId, cartList, excludeOrderId) =>
    stockOf(productId, excludeOrderId) - cartQtyOf(cartList, productId);

  const computeCartTotals = (cartList) =>
    cartList.reduce(
      (acc, i) => {
        if (i.currency === "USD") acc.usd += i.lineTotal;
        else acc.syp += i.lineTotal;
        return acc;
      },
      { usd: 0, syp: 0 },
    );

  // Shared logic for the "pick a product/qty/unit/price and add it to the
  // cart" builder — used by both the new-order form and the edit modal, each
  // with its own line/cart state so they never interfere with one another.
  const buildLineHelpers = (lineState, setLineState, cartList, setCartList, excludeOrderId) => {
    const lineProduct = products.find((p) => p.id === lineState.productId);
    const lineUnits = lineProduct ? availableUnits(lineProduct) : [];
    const effectiveUnit = lineState.unitLevel || lineUnits[0]?.value || "piece";

    const priceAtUnit = (product, currency, unit) =>
      product ? priceForUnit(product, unit, priceIn(product, currency, rate)) || "" : "";

    const setLineField = (field) => (e) => setLineState((p) => ({ ...p, [field]: e.target.value }));
    const onLineProductChange = (e) => {
      const product = products.find((p) => p.id === e.target.value);
      const units = product ? availableUnits(product) : [];
      const unit = units[0]?.value || "piece";
      setLineState((p) => ({
        ...p,
        productId: e.target.value,
        unitLevel: "",
        price: priceAtUnit(product, p.currency, unit),
      }));
    };
    const setLineCurrency = (currency) => {
      setLineState((p) => ({
        ...p,
        currency,
        price: priceAtUnit(lineProduct, currency, effectiveUnit),
      }));
    };
    const setLineUnit = (unit) => {
      setLineState((p) => ({
        ...p,
        unitLevel: unit,
        price: priceAtUnit(lineProduct, p.currency, unit),
      }));
    };
    const availableOfLine = (productId) => availableOf(productId, cartList, excludeOrderId);
    const lineTotal = (Number(lineState.quantity) || 0) * (Number(lineState.price) || 0);
    const lineOverStock =
      lineProduct != null &&
      toBaseQty(lineProduct, effectiveUnit, lineState.quantity) > availableOfLine(lineState.productId);
    const addLineToCart = () => {
      if (!lineState.productId || !Number(lineState.quantity) || !Number(lineState.price)) return;
      const product = products.find((p) => p.id === lineState.productId);
      setCartList((c) => [
        ...c,
        {
          productId: lineState.productId,
          productName: product?.name || "",
          unit: unitLabel(product, effectiveUnit),
          unitLevel: effectiveUnit,
          currency: lineState.currency,
          quantity: Number(lineState.quantity),
          price: Number(lineState.price),
          lineTotal: Number(lineState.quantity) * Number(lineState.price),
        },
      ]);
      setLineState((p) => ({ ...emptyLine, currency: p.currency }));
    };
    const removeFromCart = (index) => setCartList((c) => c.filter((_, i) => i !== index));
    return {
      setLineField,
      onLineProductChange,
      setLineCurrency,
      setLineUnit,
      availableOfLine,
      lineUnits,
      effectiveUnit,
      lineTotal,
      lineProduct,
      lineOverStock,
      addLineToCart,
      removeFromCart,
    };
  };

  const lineHelpers = buildLineHelpers(line, setLine, cart, setCart, null);
  const editLineHelpers = buildLineHelpers(editLine, setEditLine, editCart, setEditCart, editId);

  const cartTotals = computeCartTotals(cart);
  const editCartTotals = computeCartTotals(editCart);

  const clientVisits = orderForm.clientId ? visits.filter((v) => v.clientId === orderForm.clientId) : [];
  const editClientVisits = editOrderForm.clientId
    ? visits.filter((v) => v.clientId === editOrderForm.clientId)
    : [];

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
          unitLevel: item.unitLevel || "piece",
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

  const handlePrintOrder = (order) => {
    setPrintOrder(order);
    // Give the off-screen InvoiceTemplate a tick to re-render with this order's
    // data before lifting its innerHTML into the print popup.
    setTimeout(() => {
      const bodyHtml = printRef.current?.innerHTML || "";
      const w = openPrintWindow({
        title: `فاتورة بيع — ${order.clientName}`,
        bodyHtml,
        styles: INVOICE_PRINT_STYLES,
      });
      if (!w) {
        setPrintOrder(null);
        return;
      }
      setTimeout(() => {
        w.print();
        w.close();
        setPrintOrder(null);
      }, 500);
    }, 150);
  };

  const handleEdit = async () => {
    if (!editOrderForm.clientId || editCart.length === 0) return;
    setEditSaving(true);
    // Safe: only runs from the modal's save-button click handler, never during
    // render — see https://react.dev/reference/rules/components-and-hooks-must-be-pure.
    // eslint-disable-next-line react-hooks/purity
    const createdAt = Date.now();
    const client = clients.find((c) => c.id === editOrderForm.clientId);
    await updateDoc(doc(db, "users", uid, "salesOrders", editId), {
      clientId: editOrderForm.clientId,
      clientName: client?.name || "",
      territoryId: client?.territoryId || "",
      territoryName: client?.territoryName || "",
      date: editOrderForm.date,
      visitId: editOrderForm.visitId || "",
      items: editCart,
      totalUSD: editCartTotals.usd,
      totalSYP: editCartTotals.syp,
      paymentType: editOrderForm.paymentType,
      notes: editOrderForm.notes.trim(),
    });
    // Items/quantities may have changed, so the linked stock moves are fully
    // replaced rather than patched, keeping derived stock always correct.
    const linkedMoves = moves.filter((m) => m.orderId === editId);
    await Promise.all(linkedMoves.map((m) => deleteDoc(doc(db, "users", uid, "salesStockMoves", m.id))));
    await Promise.all(
      editCart.map((item) =>
        addDoc(collection(db, "users", uid, "salesStockMoves"), {
          productId: item.productId,
          productName: item.productName,
          unit: item.unit,
          unitLevel: item.unitLevel || "piece",
          type: "sale",
          quantity: item.quantity,
          date: editOrderForm.date,
          notes: `بيع لـ ${client?.name || ""}`,
          orderId: editId,
          createdAt,
        }),
      ),
    );
    setEditId(null);
    setEditSaving(false);
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
                    onClick={() => lineHelpers.setLineCurrency("USD")}
                  >
                    <i className="fa-solid fa-dollar-sign" />
                    دولار
                  </button>
                  <button
                    type="button"
                    className={`so-currency-btn ${line.currency === "SYP" ? "so-currency-btn--on" : ""}`}
                    onClick={() => lineHelpers.setLineCurrency("SYP")}
                  >
                    <i className="fa-solid fa-money-bill" />
                    ليرة سورية
                  </button>
                </div>
                {lineHelpers.lineUnits.length > 1 && (
                  <div className="so-currency-toggle" style={{ marginBottom: 10 }}>
                    {lineHelpers.lineUnits.map((u) => (
                      <button
                        key={u.value}
                        type="button"
                        className={`so-currency-btn ${lineHelpers.effectiveUnit === u.value ? "so-currency-btn--on" : ""}`}
                        onClick={() => lineHelpers.setLineUnit(u.value)}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="so-line-grid">
                  <div className="so-field">
                    <label className="so-lbl">
                      <i className="fa-solid fa-box" />
                      المنتج
                    </label>
                    <div className="so-inp-wrap">
                      <select className="so-inp" value={line.productId} onChange={lineHelpers.onLineProductChange}>
                        <option value="">اختر المنتج...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (متوفر: {lineHelpers.availableOfLine(p.id)} {baseUnitLabel(p)})
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
                        onChange={lineHelpers.setLineField("quantity")}
                      />
                    </div>
                  </div>
                  <div className="so-field">
                    <label className="so-lbl">
                      <i className="fa-solid fa-sack-dollar" />
                      سعر الـ{unitLabel(lineHelpers.lineProduct, lineHelpers.effectiveUnit)}
                    </label>
                    <div className="so-inp-wrap">
                      <input
                        className="so-inp"
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={line.price}
                        onChange={lineHelpers.setLineField("price")}
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
                      {lineHelpers.lineTotal.toLocaleString()}
                      {line.currency === "SYP" ? " ل.س" : ""}
                    </div>
                  </div>
                </div>

                {lineHelpers.lineOverStock && (
                  <div className="so-warn" style={{ marginTop: 10 }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ color: "#f59e0b" }} />
                    الكمية أكبر من المتوفر ({lineHelpers.availableOfLine(line.productId)} {baseUnitLabel(lineHelpers.lineProduct)}) — يمكنك المتابعة رغم ذلك
                  </div>
                )}

                <button
                  type="button"
                  className="so-add-line-btn"
                  style={{ marginTop: 10 }}
                  onClick={lineHelpers.addLineToCart}
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
                        <button className="so-cart-remove" onClick={() => lineHelpers.removeFromCart(i)}>
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
                  </div>
                  <div className="so-item-actions">
                    <button
                      className="so-btn so-btn--print"
                      onClick={() => handlePrintOrder(o)}
                      disabled={Boolean(printOrder)}
                      title="طباعة الفاتورة"
                    >
                      <i className="fa-solid fa-print" />
                    </button>
                    <button
                      className="so-btn so-btn--edit"
                      onClick={() => {
                        setEditId(o.id);
                        setEditOrderForm({
                          clientId: o.clientId,
                          paymentType: o.paymentType,
                          visitId: o.visitId || "",
                          date: o.date,
                          notes: o.notes || "",
                        });
                        setEditCart(o.items || []);
                        setEditLine(emptyLine);
                      }}
                      title="تعديل عملية البيع"
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
        icon="fa-solid fa-file-invoice-dollar"
        title="تعديل عملية البيع"
        subtitle="عدّل العميل، الأصناف، الأسعار، وطريقة الدفع"
        maxWidth={720}
      >
        <div className="so-field so-client-field">
          <label className="so-lbl">
            <i className="fa-solid fa-address-book" />
            العميل
          </label>
          <div className="so-inp-wrap">
            <select
              className="so-inp"
              value={editOrderForm.clientId}
              onChange={(e) =>
                setEditOrderForm((p) => ({ ...p, clientId: e.target.value, visitId: "" }))
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

        <div className="so-divider">الأصناف</div>

        <div className="so-currency-toggle" style={{ marginBottom: 10 }}>
          <button
            type="button"
            className={`so-currency-btn ${editLine.currency === "USD" ? "so-currency-btn--on" : ""}`}
            onClick={() => editLineHelpers.setLineCurrency("USD")}
          >
            <i className="fa-solid fa-dollar-sign" />
            دولار
          </button>
          <button
            type="button"
            className={`so-currency-btn ${editLine.currency === "SYP" ? "so-currency-btn--on" : ""}`}
            onClick={() => editLineHelpers.setLineCurrency("SYP")}
          >
            <i className="fa-solid fa-money-bill" />
            ليرة سورية
          </button>
        </div>
        {editLineHelpers.lineUnits.length > 1 && (
          <div className="so-currency-toggle" style={{ marginBottom: 10 }}>
            {editLineHelpers.lineUnits.map((u) => (
              <button
                key={u.value}
                type="button"
                className={`so-currency-btn ${editLineHelpers.effectiveUnit === u.value ? "so-currency-btn--on" : ""}`}
                onClick={() => editLineHelpers.setLineUnit(u.value)}
              >
                {u.label}
              </button>
            ))}
          </div>
        )}
        <div className="so-line-grid">
          <div className="so-field">
            <label className="so-lbl">
              <i className="fa-solid fa-box" />
              المنتج
            </label>
            <div className="so-inp-wrap">
              <select
                className="so-inp"
                value={editLine.productId}
                onChange={editLineHelpers.onLineProductChange}
              >
                <option value="">اختر المنتج...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (متوفر: {editLineHelpers.availableOfLine(p.id)} {baseUnitLabel(p)})
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
                value={editLine.quantity}
                onChange={editLineHelpers.setLineField("quantity")}
              />
            </div>
          </div>
          <div className="so-field">
            <label className="so-lbl">
              <i className="fa-solid fa-sack-dollar" />
              سعر الـ{unitLabel(editLineHelpers.lineProduct, editLineHelpers.effectiveUnit)}
            </label>
            <div className="so-inp-wrap">
              <input
                className="so-inp"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={editLine.price}
                onChange={editLineHelpers.setLineField("price")}
              />
            </div>
          </div>
          <div className="so-field">
            <label className="so-lbl">
              <i className="fa-solid fa-equals" />
              المجموع
            </label>
            <div className="so-line-total-box">
              {editLine.currency === "USD" ? "$" : ""}
              {editLineHelpers.lineTotal.toLocaleString()}
              {editLine.currency === "SYP" ? " ل.س" : ""}
            </div>
          </div>
        </div>

        {editLineHelpers.lineOverStock && (
          <div className="so-warn" style={{ marginTop: 10 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: "#f59e0b" }} />
            الكمية أكبر من المتوفر ({editLineHelpers.availableOfLine(editLine.productId)} {baseUnitLabel(editLineHelpers.lineProduct)}) — يمكنك المتابعة رغم ذلك
          </div>
        )}

        <button
          type="button"
          className="so-add-line-btn"
          style={{ marginTop: 10 }}
          onClick={editLineHelpers.addLineToCart}
          disabled={!editLine.productId || !Number(editLine.quantity) || !Number(editLine.price)}
        >
          <i className="fa-solid fa-cart-plus" />
          أضف الصنف
        </button>

        {editCart.length > 0 && (
          <div className="so-cart">
            {editCart.map((item, i) => (
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
                <button className="so-cart-remove" onClick={() => editLineHelpers.removeFromCart(i)}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            ))}
            <div className="so-cart-totals">
              الإجمالي: {formatDual(editCartTotals.usd, editCartTotals.syp)}
            </div>
          </div>
        )}

        <div className="so-divider">تفاصيل عملية البيع</div>

        <div className="so-order-fields">
          <div className="so-field">
            <label className="so-lbl">
              <i className="fa-solid fa-money-bill-wave" />
              طريقة الدفع
            </label>
            <div className="so-payment-toggle">
              <button
                type="button"
                className={`so-payment-btn so-payment-btn--cash ${editOrderForm.paymentType === "cash" ? "so-payment-btn--on" : ""}`}
                onClick={() => setEditOrderForm((p) => ({ ...p, paymentType: "cash" }))}
              >
                <i className="fa-solid fa-money-bill" />
                نقداً
              </button>
              <button
                type="button"
                className={`so-payment-btn so-payment-btn--credit ${editOrderForm.paymentType === "credit" ? "so-payment-btn--on" : ""}`}
                onClick={() => setEditOrderForm((p) => ({ ...p, paymentType: "credit" }))}
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
                  value={editOrderForm.date}
                  onChange={(e) => setEditOrderForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
            </div>
            {editClientVisits.length > 0 && (
              <div className="so-field">
                <label className="so-lbl">
                  <i className="fa-solid fa-route" />
                  مرتبطة بزيارة (اختياري)
                </label>
                <div className="so-inp-wrap">
                  <select
                    className="so-inp"
                    value={editOrderForm.visitId}
                    onChange={(e) => setEditOrderForm((p) => ({ ...p, visitId: e.target.value }))}
                  >
                    <option value="">بدون ربط</option>
                    {editClientVisits.map((v) => (
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
                value={editOrderForm.notes}
                onChange={(e) => setEditOrderForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="so-modal-actions">
            <button
              type="button"
              className="so-add-btn so-modal-save"
              onClick={handleEdit}
              disabled={editSaving || !editOrderForm.clientId || editCart.length === 0}
            >
              {editSaving ? (
                <>
                  <div className="so-spinner" />
                  جاري...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check" />
                  حفظ التعديلات
                </>
              )}
            </button>
            <button type="button" className="so-btn so-btn--cancel" onClick={() => setEditId(null)}>
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
      <ConfirmDeleteDialog
        open={Boolean(deleteTarget)}
        title="تأكيد حذف عملية البيع"
        message={`سيتم حذف عملية البيع لـ "${deleteTarget?.clientName || ""}" بكل أصنافها، وإرجاع الكميات إلى المخزون.`}
        confirmLabel="حذف العملية"
        loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {/* Invoice print template (off-screen; lifted into the print popup) */}
      <InvoiceTemplate
        printRef={printRef}
        order={printOrder}
        client={printOrder ? clients.find((c) => c.id === printOrder.clientId) : null}
        repName={repName}
        printedAt={formatReportTimestamp()}
      />
    </>
  );
}
