import { useRef, useState } from "react";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/config";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { formatReportTimestamp } from "../../utils/format";
import { openPrintWindow } from "../../utils/printWindow";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog";
import Modal from "../../components/Modal";
import { formatMoney, hasDirectPrice, priceIn, useExchangeRate } from "./currency";
import { baseUnitLabel, PACKAGE_TYPES, toBaseQty } from "./packaging";
import { SALES_PRINT_STYLES } from "./printStyles";
import StockReportTemplate from "./StockReportTemplate";
import "./ProductsPage.css";

const emptyForm = {
  name: "",
  unit: "قطعة",
  packageType: "piece",
  boxesPerCarton: "",
  itemsPerBox: "",
  priceUSD: "",
  priceSYP: "",
  lowStockThreshold: "",
  notes: "",
};

export default function ProductsPage() {
  const uid = auth.currentUser?.uid;
  const navigate = useNavigate();
  const rate = useExchangeRate();
  const products = useFirestoreCollection(uid && ["users", uid, "salesProducts"], {
    orderByField: "createdAt",
  });
  const moves = useFirestoreCollection(uid && ["users", uid, "salesStockMoves"]);

  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [printingStock, setPrintingStock] = useState(false);
  const printRef = useRef(null);
  const repName = auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "";

  const setField = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  // Stock moves may have been recorded in any of a product's available units
  // (carton/box/piece) — normalize each to the product's smallest available
  // unit before summing so totals stay correct regardless of which unit a
  // given load/return/sale was entered in.
  const stockOf = (productId) => {
    const product = products.find((p) => p.id === productId);
    return moves
      .filter((m) => m.productId === productId)
      .reduce((total, m) => {
        const qty = toBaseQty(product, m.unitLevel, m.quantity);
        return total + (m.type === "load" ? qty : -qty);
      }, 0);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name || (!form.priceUSD && !form.priceSYP)) return;
    setLoading(true);
    await addDoc(collection(db, "users", uid, "salesProducts"), {
      name,
      unit: form.unit.trim() || "قطعة",
      packageType: form.packageType,
      boxesPerCarton: form.packageType === "carton" && form.boxesPerCarton !== "" ? Number(form.boxesPerCarton) : null,
      itemsPerBox: form.packageType !== "piece" && form.itemsPerBox !== "" ? Number(form.itemsPerBox) : null,
      priceUSD: form.priceUSD === "" ? null : Number(form.priceUSD),
      priceSYP: form.priceSYP === "" ? null : Number(form.priceSYP),
      lowStockThreshold: form.lowStockThreshold === "" ? null : Number(form.lowStockThreshold),
      notes: form.notes.trim(),
      createdAt: Date.now(),
    });
    setForm(emptyForm);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget.id);
    try {
      await deleteDoc(doc(db, "users", uid, "salesProducts", deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = async (id) => {
    const name = editData.name.trim();
    if (!name || (!editData.priceUSD && !editData.priceSYP)) return;
    await updateDoc(doc(db, "users", uid, "salesProducts", id), {
      name,
      unit: editData.unit.trim() || "قطعة",
      packageType: editData.packageType,
      boxesPerCarton:
        editData.packageType === "carton" && editData.boxesPerCarton !== ""
          ? Number(editData.boxesPerCarton)
          : null,
      itemsPerBox:
        editData.packageType !== "piece" && editData.itemsPerBox !== "" ? Number(editData.itemsPerBox) : null,
      priceUSD: editData.priceUSD === "" ? null : Number(editData.priceUSD),
      priceSYP: editData.priceSYP === "" ? null : Number(editData.priceSYP),
      lowStockThreshold: editData.lowStockThreshold === "" ? null : Number(editData.lowStockThreshold),
      notes: editData.notes.trim(),
    });
    setEditId(null);
  };

  const goStock = (productId, type) =>
    navigate("/sales/products/stock", { state: { productId, type } });

  const handlePrintStockReport = () => {
    setPrintingStock(true);
    setTimeout(() => {
      const bodyHtml = printRef.current?.innerHTML || "";
      const w = openPrintWindow({ title: "تقرير المخزون", bodyHtml, styles: SALES_PRINT_STYLES });
      if (!w) {
        setPrintingStock(false);
        return;
      }
      setTimeout(() => {
        w.print();
        w.close();
        setPrintingStock(false);
      }, 500);
    }, 150);
  };

  // Price is always entered for the product's own package-type unit (e.g. per
  // carton) — this just labels the price fields with that unit for clarity.
  const packageUnitLabel = (packageType, unit) =>
    packageType === "carton" ? "كرتون" : packageType === "box" ? "علبة" : unit.trim() || "قطعة";

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <div className="pd-root">
        {/* Header */}
        <div className="pd-header">
          <div className="pd-header-bg" />
          <div className="pd-header-body">
            <div className="pd-header-left">
              <div className="pd-header-ico">
                <i className="fa-solid fa-boxes-stacked" style={{ fontSize: 22, color: "#fff" }} />
              </div>
              <div>
                <h1 className="pd-header-title">المنتجات والمخزون</h1>
                <p className="pd-header-sub">كتالوج المنتجات ومتابعة الكمية المحمّلة على السيارة</p>
              </div>
            </div>
            <div className="pd-header-right">
              <button
                className="pd-header-link"
                onClick={handlePrintStockReport}
                disabled={printingStock || products.length === 0}
              >
                <i className="fa-solid fa-print" />
                طباعة تقرير المخزون
              </button>
              <button className="pd-header-link" onClick={() => navigate("/sales/products/stock")}>
                <i className="fa-solid fa-clock-rotate-left" />
                سجل الحركات
              </button>
              <div className="pd-header-badge">
                <i className="fa-solid fa-boxes-stacked" style={{ fontSize: 11 }} />
                {products.length} منتج
              </div>
            </div>
          </div>
        </div>

        <div className="pd-body">
          {/* Add form */}
          <div className="pd-add-card">
            <div className="pd-add-title">
              <i className="fa-solid fa-plus-circle" style={{ color: "#0f766e", fontSize: 16 }} />
              إضافة منتج جديد
            </div>
            <form onSubmit={handleAdd} className="pd-add-grid">
              <div className="pd-field pd-field--name">
                <label className="pd-lbl">
                  <i className="fa-solid fa-tag" />
                  اسم المنتج
                </label>
                <div className="pd-inp-wrap">
                  <input
                    className="pd-inp"
                    placeholder="اسم المنتج..."
                    value={form.name}
                    onChange={setField("name")}
                    required
                  />
                </div>
              </div>
              <div className="pd-field pd-field--package">
                <label className="pd-lbl">
                  <i className="fa-solid fa-layer-group" />
                  طريقة التعبئة
                </label>
                <div className="pd-package-toggle">
                  {PACKAGE_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className={`pd-package-btn ${form.packageType === t.value ? "pd-package-btn--on" : ""}`}
                      onClick={() => setForm((p) => ({ ...p, packageType: t.value }))}
                    >
                      <i className={t.icon} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {form.packageType === "carton" && (
                <div className="pd-field">
                  <label className="pd-lbl">
                    <i className="fa-solid fa-box" />
                    عدد العلب داخل الكرتون
                  </label>
                  <div className="pd-inp-wrap">
                    <input
                      className="pd-inp"
                      type="number"
                      min="1"
                      placeholder="اختياري"
                      value={form.boxesPerCarton}
                      onChange={setField("boxesPerCarton")}
                    />
                  </div>
                </div>
              )}
              {form.packageType !== "piece" && (
                <div className="pd-field">
                  <label className="pd-lbl">
                    <i className="fa-solid fa-cube" />
                    عدد القطع داخل {form.packageType === "carton" ? "كل علبة" : "العلبة"}
                  </label>
                  <div className="pd-inp-wrap">
                    <input
                      className="pd-inp"
                      type="number"
                      min="1"
                      placeholder="اختياري"
                      value={form.itemsPerBox}
                      onChange={setField("itemsPerBox")}
                    />
                  </div>
                </div>
              )}
              <div className="pd-field">
                <label className="pd-lbl">
                  <i className="fa-solid fa-ruler" />
                  {form.packageType === "piece" ? "الوحدة" : "اسم القطعة الواحدة"}
                </label>
                <div className="pd-inp-wrap">
                  <input
                    className="pd-inp"
                    placeholder="قطعة / كيلو..."
                    value={form.unit}
                    onChange={setField("unit")}
                  />
                </div>
              </div>
              <div className="pd-field">
                <label className="pd-lbl">
                  <i className="fa-solid fa-dollar-sign" />
                  السعر (دولار) / {packageUnitLabel(form.packageType, form.unit)}
                </label>
                <div className="pd-inp-wrap">
                  <input
                    className="pd-inp"
                    type="number"
                    min="0"
                    step="any"
                    placeholder={
                      form.priceSYP && rate > 0
                        ? `≈ ${(Number(form.priceSYP) / rate).toLocaleString()}`
                        : "0"
                    }
                    value={form.priceUSD}
                    onChange={setField("priceUSD")}
                  />
                </div>
              </div>
              <div className="pd-field">
                <label className="pd-lbl">
                  <i className="fa-solid fa-money-bill" />
                  السعر (ل.س) / {packageUnitLabel(form.packageType, form.unit)}
                </label>
                <div className="pd-inp-wrap">
                  <input
                    className="pd-inp"
                    type="number"
                    min="0"
                    step="any"
                    placeholder={
                      form.priceUSD && rate > 0
                        ? `≈ ${(Number(form.priceUSD) * rate).toLocaleString()}`
                        : "0"
                    }
                    value={form.priceSYP}
                    onChange={setField("priceSYP")}
                  />
                </div>
              </div>
              <div className="pd-field">
                <label className="pd-lbl">
                  <i className="fa-solid fa-triangle-exclamation" />
                  حد التنبيه (بالـ{baseUnitLabel(form)})
                </label>
                <div className="pd-inp-wrap">
                  <input
                    className="pd-inp"
                    type="number"
                    min="0"
                    placeholder="اختياري"
                    value={form.lowStockThreshold}
                    onChange={setField("lowStockThreshold")}
                  />
                </div>
              </div>
              <div className="pd-field pd-field--notes">
                <label className="pd-lbl">
                  <i className="fa-regular fa-note-sticky" />
                  ملاحظات
                </label>
                <div className="pd-inp-wrap">
                  <input
                    className="pd-inp"
                    placeholder="اختياري"
                    value={form.notes}
                    onChange={setField("notes")}
                  />
                </div>
              </div>
              <div className="pd-field pd-field--submit">
                <label className="pd-lbl" style={{ opacity: 0 }}>
                  _
                </label>
                <button
                  type="submit"
                  className="pd-add-btn"
                  disabled={loading || !form.name.trim() || (!form.priceUSD && !form.priceSYP)}
                >
                  {loading ? (
                    <>
                      <div className="pd-spinner" />
                      جاري...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-plus" />
                      إضافة
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Search */}
          {products.length > 0 && (
            <div className="pd-search-wrap">
              <i className="fa-solid fa-magnifying-glass pd-search-ico" />
              <input
                className="pd-search"
                placeholder="البحث في المنتجات..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="pd-search-clear" onClick={() => setSearch("")}>
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>
          )}

          {/* List */}
          {products.length === 0 ? (
            <div className="pd-empty">
              <div className="pd-empty-ico">
                <i className="fa-solid fa-boxes-stacked" style={{ fontSize: 36, color: "#5eead4" }} />
              </div>
              <div className="pd-empty-title">لا توجد منتجات بعد</div>
              <div className="pd-empty-sub">أضف منتجك الأول من الحقل أعلاه</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="pd-empty">
              <div className="pd-empty-ico">
                <i className="fa-solid fa-magnifying-glass" style={{ fontSize: 30, color: "#5eead4" }} />
              </div>
              <div className="pd-empty-title">لا توجد نتائج</div>
              <div className="pd-empty-sub">جرب كلمة بحث مختلفة</div>
            </div>
          ) : (
            <div className="pd-list">
              {filtered.map((p, i) => {
                const stock = stockOf(p.id);
                const low = p.lowStockThreshold != null && stock <= p.lowStockThreshold;
                return (
                  <div key={p.id} className="pd-item" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="pd-item-left">
                      <div className="pd-item-ico">
                        <i className="fa-solid fa-box" style={{ fontSize: 16, color: "#0f766e" }} />
                      </div>
                      <div className="pd-item-info">
                        <div className="pd-item-name-row">
                          <span className="pd-item-name">{p.name}</span>
                          <span className={`pd-stock-badge ${low ? "pd-stock-badge--low" : ""}`}>
                            <i
                              className={`fa-solid fa-${low ? "triangle-exclamation" : "cube"}`}
                              style={{ fontSize: 9 }}
                            />
                            {stock} {baseUnitLabel(p)}
                          </span>
                        </div>
                        <div className="pd-item-meta">
                          <span className="pd-item-price">
                            <i className="fa-solid fa-dollar-sign" style={{ fontSize: 10 }} />
                            {formatMoney(priceIn(p, "USD", rate), "USD")}
                            {!hasDirectPrice(p, "USD") && rate > 0 && " (تقديري)"}
                            {" "}/ {packageUnitLabel(p.packageType || "piece", p.unit || "")}
                          </span>
                          <span className="pd-item-price">
                            <i className="fa-solid fa-money-bill" style={{ fontSize: 10 }} />
                            {formatMoney(priceIn(p, "SYP", rate), "SYP")}
                            {!hasDirectPrice(p, "SYP") && rate > 0 && " (تقديري)"}
                            {" "}/ {packageUnitLabel(p.packageType || "piece", p.unit || "")}
                          </span>
                        </div>
                        {(p.packageType === "box" || p.packageType === "carton") && (
                          <div className="pd-package-summary">
                            <i className="fa-solid fa-layer-group" style={{ fontSize: 10 }} />
                            {p.packageType === "carton" && p.boxesPerCarton
                              ? `الكرتون = ${p.boxesPerCarton} علبة`
                              : null}
                            {p.packageType === "carton" && p.boxesPerCarton && p.itemsPerBox ? " = " : null}
                            {p.itemsPerBox ? `${p.itemsPerBox} ${p.unit || "قطعة"} / علبة` : null}
                            {!p.itemsPerBox && !(p.packageType === "carton" && p.boxesPerCarton) && "لم تُحدَّد تفاصيل التعبئة"}
                          </div>
                        )}
                        {p.notes && <div className="pd-item-notes">{p.notes}</div>}
                      </div>
                    </div>
                    <div className="pd-item-actions">
                      <button className="pd-btn pd-btn--load" onClick={() => goStock(p.id, "load")}>
                        <i className="fa-solid fa-arrow-down" />
                        تحميل
                      </button>
                      <button className="pd-btn pd-btn--return" onClick={() => goStock(p.id, "return")}>
                        <i className="fa-solid fa-arrow-up" />
                        إرجاع
                      </button>
                      <button
                        className="pd-btn pd-btn--edit"
                        onClick={() => {
                          setEditId(p.id);
                          setEditData({
                            name: p.name,
                            unit: p.unit || "قطعة",
                            packageType: p.packageType || "piece",
                            boxesPerCarton: p.boxesPerCarton ?? "",
                            itemsPerBox: p.itemsPerBox ?? "",
                            priceUSD: p.priceUSD ?? "",
                            priceSYP: p.priceSYP ?? "",
                            lowStockThreshold: p.lowStockThreshold ?? "",
                            notes: p.notes || "",
                          });
                        }}
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button
                        className="pd-btn pd-btn--del"
                        onClick={() => setDeleteTarget(p)}
                        disabled={deleting === p.id}
                      >
                        {deleting === p.id ? (
                          <div className="pd-spinner pd-spinner--red" />
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
        title="تأكيد حذف المنتج"
        message={`سيتم حذف "${deleteTarget?.name || ""}" من قائمة المنتجات. سجل حركات المخزون الخاصة به سيبقى دون تغيير.`}
        confirmLabel="حذف المنتج"
        loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
      <Modal
        open={Boolean(editId)}
        onClose={() => setEditId(null)}
        icon="fa-solid fa-boxes-stacked"
        title="تعديل المنتج"
        subtitle={editId ? products.find((p) => p.id === editId)?.name : ""}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEdit(editId);
          }}
          className="pd-add-grid"
        >
          <div className="pd-field pd-field--name">
            <label className="pd-lbl">
              <i className="fa-solid fa-tag" />
              اسم المنتج
            </label>
            <div className="pd-inp-wrap">
              <input
                className="pd-inp"
                value={editData.name}
                onChange={(e) => setEditData((d) => ({ ...d, name: e.target.value }))}
                required
                autoFocus
              />
            </div>
          </div>
          <div className="pd-field pd-field--package">
            <label className="pd-lbl">
              <i className="fa-solid fa-layer-group" />
              طريقة التعبئة
            </label>
            <div className="pd-package-toggle">
              {PACKAGE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`pd-package-btn ${editData.packageType === t.value ? "pd-package-btn--on" : ""}`}
                  onClick={() => setEditData((d) => ({ ...d, packageType: t.value }))}
                >
                  <i className={t.icon} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {editData.packageType === "carton" && (
            <div className="pd-field">
              <label className="pd-lbl">
                <i className="fa-solid fa-box" />
                عدد العلب داخل الكرتون
              </label>
              <div className="pd-inp-wrap">
                <input
                  className="pd-inp"
                  type="number"
                  min="1"
                  placeholder="اختياري"
                  value={editData.boxesPerCarton}
                  onChange={(e) => setEditData((d) => ({ ...d, boxesPerCarton: e.target.value }))}
                />
              </div>
            </div>
          )}
          {editData.packageType !== "piece" && (
            <div className="pd-field">
              <label className="pd-lbl">
                <i className="fa-solid fa-cube" />
                عدد القطع داخل {editData.packageType === "carton" ? "كل علبة" : "العلبة"}
              </label>
              <div className="pd-inp-wrap">
                <input
                  className="pd-inp"
                  type="number"
                  min="1"
                  placeholder="اختياري"
                  value={editData.itemsPerBox}
                  onChange={(e) => setEditData((d) => ({ ...d, itemsPerBox: e.target.value }))}
                />
              </div>
            </div>
          )}
          <div className="pd-field">
            <label className="pd-lbl">
              <i className="fa-solid fa-ruler" />
              {editData.packageType === "piece" ? "الوحدة" : "اسم القطعة الواحدة"}
            </label>
            <div className="pd-inp-wrap">
              <input
                className="pd-inp"
                value={editData.unit}
                onChange={(e) => setEditData((d) => ({ ...d, unit: e.target.value }))}
              />
            </div>
          </div>
          <div className="pd-field">
            <label className="pd-lbl">
              <i className="fa-solid fa-dollar-sign" />
              السعر (دولار) / {packageUnitLabel(editData.packageType, editData.unit)}
            </label>
            <div className="pd-inp-wrap">
              <input
                className="pd-inp"
                type="number"
                min="0"
                step="any"
                placeholder={
                  editData.priceSYP && rate > 0
                    ? `≈ ${(Number(editData.priceSYP) / rate).toLocaleString()}`
                    : "0"
                }
                value={editData.priceUSD}
                onChange={(e) => setEditData((d) => ({ ...d, priceUSD: e.target.value }))}
              />
            </div>
          </div>
          <div className="pd-field">
            <label className="pd-lbl">
              <i className="fa-solid fa-money-bill" />
              السعر (ل.س) / {packageUnitLabel(editData.packageType, editData.unit)}
            </label>
            <div className="pd-inp-wrap">
              <input
                className="pd-inp"
                type="number"
                min="0"
                step="any"
                placeholder={
                  editData.priceUSD && rate > 0
                    ? `≈ ${(Number(editData.priceUSD) * rate).toLocaleString()}`
                    : "0"
                }
                value={editData.priceSYP}
                onChange={(e) => setEditData((d) => ({ ...d, priceSYP: e.target.value }))}
              />
            </div>
          </div>
          <div className="pd-field">
            <label className="pd-lbl">
              <i className="fa-solid fa-triangle-exclamation" />
              حد التنبيه (بالـ{baseUnitLabel(editData)})
            </label>
            <div className="pd-inp-wrap">
              <input
                className="pd-inp"
                type="number"
                min="0"
                placeholder="اختياري"
                value={editData.lowStockThreshold}
                onChange={(e) => setEditData((d) => ({ ...d, lowStockThreshold: e.target.value }))}
              />
            </div>
          </div>
          <div className="pd-field pd-field--notes">
            <label className="pd-lbl">
              <i className="fa-regular fa-note-sticky" />
              ملاحظات
            </label>
            <div className="pd-inp-wrap">
              <input
                className="pd-inp"
                value={editData.notes}
                onChange={(e) => setEditData((d) => ({ ...d, notes: e.target.value }))}
                placeholder="اختياري"
              />
            </div>
          </div>
          <div className="pd-field pd-field--actions pd-modal-actions">
            <button
              type="submit"
              className="pd-btn pd-btn--save pd-modal-save"
              disabled={!editData.name.trim() || (!editData.priceUSD && !editData.priceSYP)}
            >
              <i className="fa-solid fa-check" />
              حفظ التغييرات
            </button>
            <button type="button" className="pd-btn pd-btn--cancel" onClick={() => setEditId(null)}>
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      {/* Stock report print template (off-screen; lifted into the print popup) */}
      <StockReportTemplate
        printRef={printRef}
        products={products}
        moves={moves}
        repName={repName}
        printedAt={formatReportTimestamp()}
      />
    </>
  );
}
