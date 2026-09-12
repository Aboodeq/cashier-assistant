/* Dev-only visual harness: renders the sales UI with mock data so screens can
   be screenshotted without a Firebase session. Not part of the app build. */
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import "../index.css";
import AppShell from "../components/layout/AppShell";
import { SalesDataContext } from "../features/sales/data/salesContext";
import { SALES_NAV, SALES_TABS } from "../features/sales/nav";
import { balanceMap } from "../features/sales/domain/ledger";
import { stockMap } from "../features/sales/domain/stock";
import { todayISO, addDays } from "../features/sales/domain/dates";
import ClientProfilePage from "../features/sales/pages/ClientProfilePage";
import ClientsPage from "../features/sales/pages/ClientsPage";
import CollectionsPage from "../features/sales/pages/CollectionsPage";
import CountPage from "../features/sales/pages/CountPage";
import ExpensesPage from "../features/sales/pages/ExpensesPage";
import GoalsPage from "../features/sales/pages/GoalsPage";
import InvoiceEditorPage from "../features/sales/pages/InvoiceEditorPage";
import InvoiceViewPage from "../features/sales/pages/InvoiceViewPage";
import InvoicesPage from "../features/sales/pages/InvoicesPage";
import LoadPage from "../features/sales/pages/LoadPage";
import ProductsPage from "../features/sales/pages/ProductsPage";
import PromotionsPage from "../features/sales/pages/PromotionsPage";
import ReportsPage from "../features/sales/pages/ReportsPage";
import SettingsPage from "../features/sales/pages/SettingsPage";
import StockPage from "../features/sales/pages/StockPage";
import TodayPage from "../features/sales/pages/TodayPage";
import VisitsPage from "../features/sales/pages/VisitsPage";
import "../features/sales/sales.css";

const today = todayISO();

const territories = [
  { id: "t1", name: "جرمانا", createdAt: 5 },
  { id: "t2", name: "صحنايا", createdAt: 4 },
];

const clients = [
  { id: "c1", name: "محل الثقة", phone: "0955123456", type: "wholesale", category: "vip", territoryId: "t1", territoryName: "جرمانا", address: "شارع الجلاء", location: { lat: 33.48, lng: 36.35, accuracy: 12, savedAt: Date.now() - 86400000 }, createdAt: 9 },
  { id: "c2", name: "سوبر ماركت النور", phone: "0933222111", type: "retail", category: "regular", territoryId: "t1", territoryName: "جرمانا", createdAt: 8 },
  { id: "c3", name: "بقالية الأمانة", phone: "0988777666", type: "retail", category: "new", territoryId: "t2", territoryName: "صحنايا", createdAt: 7 },
];

const products = [
  { id: "p1", name: "علكة سيليكا", category: "حلويات", unit: "قطعة", packageType: "carton", boxesPerCarton: 12, itemsPerBox: 24, priceUSD: 60, priceSYP: 780000, wholesaleSYP: 750000, lowStockThreshold: 200, createdAt: 9 },
  { id: "p2", name: "بسكويت شاي", category: "حلويات", unit: "قطعة", packageType: "box", itemsPerBox: 12, priceSYP: 45000, wholesaleSYP: 42000, lowStockThreshold: 20, createdAt: 8 },
  { id: "p3", name: "زيت قلي 1 لتر", category: "مواد غذائية", unit: "عبوة", packageType: "piece", priceSYP: 38000, createdAt: 7 },
];

const promotions = [
  { id: "pr1", title: "عرض العلكة", productId: "p1", productName: "علكة سيليكا", type: "bonus", buyQty: 10, freeQty: 1, unitLevel: "carton", appliesTo: "all", startDate: addDays(today, -10), endDate: addDays(today, 20), active: true, createdAt: 5 },
  { id: "pr2", title: "خصم البسكويت", productId: "p2", productName: "بسكويت شاي", type: "percent", percent: 5, minQty: 10, unitLevel: "box", appliesTo: "wholesale", startDate: addDays(today, -5), active: true, createdAt: 4 },
];

const moves = [
  { id: "m1", productId: "p1", productName: "علكة سيليكا", type: "load", unitLevel: "carton", unit: "كرتون", quantity: 8, date: today, loadId: "l1", createdAt: 10 },
  { id: "m2", productId: "p2", productName: "بسكويت شاي", type: "load", unitLevel: "box", unit: "علبة", quantity: 40, date: today, loadId: "l1", createdAt: 9 },
  { id: "m3", productId: "p3", productName: "زيت قلي 1 لتر", type: "load", unitLevel: "piece", unit: "عبوة", quantity: 60, date: today, loadId: "l1", createdAt: 8 },
  { id: "m4", productId: "p1", productName: "علكة سيليكا", type: "sale", unitLevel: "carton", unit: "كرتون", quantity: 2, date: today, orderId: "o1", createdAt: 7 },
  { id: "m5", productId: "p2", productName: "بسكويت شاي", type: "sale", unitLevel: "box", unit: "علبة", quantity: 6, date: today, orderId: "o2", createdAt: 6 },
  { id: "m6", productId: "p3", productName: "زيت قلي 1 لتر", type: "sale", unitLevel: "piece", unit: "عبوة", quantity: 48, date: today, orderId: "o1", createdAt: 5 },
];

const orders = [
  {
    id: "o1", kind: "sale", invoiceNo: 12, clientId: "c1", clientName: "محل الثقة", territoryId: "t1", territoryName: "جرمانا",
    priceTier: "wholesale", date: today, paymentType: "partial", paidUSD: 0, paidSYP: 500000,
    items: [
      { productId: "p1", productName: "علكة سيليكا", unitLevel: "carton", unit: "كرتون", currency: "SYP", quantity: 2, price: 750000, grossTotal: 1500000, discountPct: 0, discount: 0, lineTotal: 1500000, freeQty: 0 },
      { productId: "p3", productName: "زيت قلي 1 لتر", unitLevel: "piece", unit: "عبوة", currency: "SYP", quantity: 48, price: 38000, grossTotal: 1824000, discountPct: 0, discount: 0, lineTotal: 1824000, freeQty: 0 },
    ],
    subtotalSYP: 3324000, discountSYP: 0, totalSYP: 3324000, totalUSD: 0, createdAt: 20,
  },
  {
    id: "o2", kind: "sale", invoiceNo: 11, clientId: "c2", clientName: "سوبر ماركت النور", territoryId: "t1", territoryName: "جرمانا",
    priceTier: "retail", date: today, paymentType: "cash",
    items: [
      { productId: "p2", productName: "بسكويت شاي", unitLevel: "box", unit: "علبة", currency: "SYP", quantity: 6, price: 45000, grossTotal: 270000, discountPct: 0, discount: 0, lineTotal: 270000, freeQty: 0 },
    ],
    subtotalSYP: 270000, totalSYP: 270000, totalUSD: 0, paidSYP: 270000, createdAt: 19,
  },
  {
    id: "o3", kind: "sale", invoiceNo: 10, clientId: "c3", clientName: "بقالية الأمانة", territoryId: "t2", territoryName: "صحنايا",
    priceTier: "retail", date: addDays(today, -2), paymentType: "credit",
    items: [{ productId: "p1", productName: "علكة سيليكا", unitLevel: "box", unit: "علبة", currency: "USD", quantity: 10, price: 5, grossTotal: 50, discount: 0, lineTotal: 50, freeQty: 0 }],
    totalUSD: 50, totalSYP: 0, createdAt: 18,
  },
];

const payments = [
  { id: "pay1", clientId: "c1", clientName: "محل الثقة", currency: "SYP", amount: 500000, date: today, receiptNo: 7, orderId: "o1", notes: "دفعة مع الفاتورة #12", createdAt: 15 },
  { id: "pay2", clientId: "c3", clientName: "بقالية الأمانة", currency: "USD", amount: 20, date: addDays(today, -1), receiptNo: 6, createdAt: 14 },
];

const visits = [
  { id: "v1", clientId: "c1", clientName: "محل الثقة", territoryId: "t1", territoryName: "جرمانا", date: today, outcome: "successful", followUpDate: addDays(today, 3), followUpDone: false, notes: "طلب زيادة الكمية", createdAt: 12 },
  { id: "v2", clientId: "c3", clientName: "بقالية الأمانة", territoryId: "t2", territoryName: "صحنايا", date: addDays(today, -1), outcome: "closed", followUpDate: today, followUpDone: false, createdAt: 11 },
];

const expenses = [
  { id: "e1", category: "fuel", categoryLabel: "وقود", currency: "SYP", amount: 150000, date: today, odometer: 154300, createdAt: 10 },
  { id: "e2", category: "maintenance", categoryLabel: "صيانة", currency: "SYP", amount: 90000, date: addDays(today, -3), createdAt: 9 },
];

const goals = [{ id: today.slice(0, 7), month: today.slice(0, 7), targetSYP: 20000000, targetUSD: 0, commissionRate: 4, createdAt: 8 }];
const loads = [{ id: "l1", type: "load", date: today, lines: [
  { productId: "p1", productName: "علكة سيليكا", unitLevel: "carton", unit: "كرتون", quantity: 8 },
  { productId: "p2", productName: "بسكويت شاي", unitLevel: "box", unit: "علبة", quantity: 40 },
  { productId: "p3", productName: "زيت قلي 1 لتر", unitLevel: "piece", unit: "عبوة", quantity: 60 },
], linesCount: 3, createdAt: 30 }];
const counts = [];
const settings = {
  usdToSyp: 15000,
  businessName: "مؤسسة النور للتوزيع",
  businessPhone: "0955000111",
  repName: "عبد الكريم",
  printFormat: new URLSearchParams(window.location.search).get("fmt") || "a4",
  footerNote: "شكراً لتعاملكم معنا",
};

const value = {
  territories, clients, visits, products, promotions, moves, loads, counts, orders, payments, expenses, goals, settings,
  uid: "preview",
  rate: settings.usdToSyp,
  productById: new Map(products.map((p) => [p.id, p])),
  clientById: new Map(clients.map((c) => [c.id, c])),
  territoryById: new Map(territories.map((t) => [t.id, t])),
  stock: stockMap(products, moves),
  balances: balanceMap(orders, payments),
  ready: true,
};

const path = new URLSearchParams(window.location.search).get("path") || "/sales";

/** Dev probe: lists elements wider than the viewport so layout bugs are visible. */
function OverflowProbe() {
  const offenders = [];
  setTimeout(() => {
    const vw = document.documentElement.clientWidth;
    for (const el of document.querySelectorAll("body *")) {
      const rect = el.getBoundingClientRect();
      if (rect.width > vw + 1 || rect.right > vw + 1 || rect.left < -1) {
        offenders.push(
          `${el.tagName.toLowerCase()}.${String(el.className || "").split(" ").slice(0, 2).join(".")} w=${Math.round(rect.width)} l=${Math.round(rect.left)} r=${Math.round(rect.right)}`,
        );
      }
    }
    const box = document.createElement("pre");
    box.style.cssText =
      "position:fixed;inset:auto 0 0 0;z-index:99999;max-height:45vh;overflow:auto;background:#111;color:#0f0;font:10px monospace;padding:6px;margin:0;direction:ltr";
    box.textContent = `viewport=${vw}\n` + (offenders.slice(0, 25).join("\n") || "no overflow");
    document.body.appendChild(box);
  }, 1500);
  return null;
}

createRoot(document.getElementById("root")).render(
  <MemoryRouter initialEntries={[path]}>
    <SalesDataContext.Provider value={value}>
      {new URLSearchParams(window.location.search).has("probe") && <OverflowProbe />}
      <AppShell groups={SALES_NAV} tabs={SALES_TABS}>
        <Routes>
          <Route path="/sales" element={<TodayPage />} />
          <Route path="/sales/invoices" element={<InvoicesPage />} />
          <Route path="/sales/invoices/new" element={<InvoiceEditorPage />} />
          <Route path="/sales/invoices/:id" element={<InvoiceViewPage />} />
          <Route path="/sales/invoices/:id/edit" element={<InvoiceEditorPage />} />
          <Route path="/sales/clients" element={<ClientsPage />} />
          <Route path="/sales/clients/:id" element={<ClientProfilePage />} />
          <Route path="/sales/visits" element={<VisitsPage />} />
          <Route path="/sales/collections" element={<CollectionsPage />} />
          <Route path="/sales/stock" element={<StockPage />} />
          <Route path="/sales/stock/load" element={<LoadPage />} />
          <Route path="/sales/stock/count" element={<CountPage />} />
          <Route path="/sales/products" element={<ProductsPage />} />
          <Route path="/sales/promotions" element={<PromotionsPage />} />
          <Route path="/sales/expenses" element={<ExpensesPage />} />
          <Route path="/sales/goals" element={<GoalsPage />} />
          <Route path="/sales/reports" element={<ReportsPage />} />
          <Route path="/sales/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
    </SalesDataContext.Provider>
  </MemoryRouter>,
);
