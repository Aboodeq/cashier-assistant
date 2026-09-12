import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { auth } from "../../firebase/config";
import AppShell from "../../components/layout/AppShell";
import { useToast } from "../../components/ui/toastContext";
import { SalesDataProvider } from "./data/SalesDataProvider";
import { setWriteErrorHandler } from "./data/api";
import { SALES_NAV, SALES_TABS } from "./nav";
import ClientProfilePage from "./pages/ClientProfilePage";
import ClientsPage from "./pages/ClientsPage";
import CollectionsPage from "./pages/CollectionsPage";
import CountPage from "./pages/CountPage";
import ExpensesPage from "./pages/ExpensesPage";
import GoalsPage from "./pages/GoalsPage";
import InvoiceEditorPage from "./pages/InvoiceEditorPage";
import InvoiceViewPage from "./pages/InvoiceViewPage";
import InvoicesPage from "./pages/InvoicesPage";
import LoadPage from "./pages/LoadPage";
import ProductsPage from "./pages/ProductsPage";
import PromotionsPage from "./pages/PromotionsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import StockPage from "./pages/StockPage";
import TodayPage from "./pages/TodayPage";
import VisitsPage from "./pages/VisitsPage";
import "./sales.css";

/** Surfaces failed background writes (they're never awaited — see data/api.js). */
function WriteErrorReporter() {
  const toast = useToast();
  useEffect(() => {
    setWriteErrorHandler(() => toast.error("تعذّر حفظ التغييرات على الخادم — سيعاد المحاولة عند عودة الاتصال"));
    return () => setWriteErrorHandler((error) => console.error(error));
  }, [toast]);
  return null;
}

export default function SalesShell() {
  const uid = auth.currentUser?.uid;

  return (
    <AppShell groups={SALES_NAV} tabs={SALES_TABS}>
      <SalesDataProvider key={uid} uid={uid}>
        <WriteErrorReporter />
        <Routes>
          <Route index element={<TodayPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/new" element={<InvoiceEditorPage />} />
          <Route path="invoices/:id" element={<InvoiceViewPage />} />
          <Route path="invoices/:id/edit" element={<InvoiceEditorPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:id" element={<ClientProfilePage />} />
          <Route path="visits" element={<VisitsPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="stock/load" element={<LoadPage />} />
          <Route path="stock/count" element={<CountPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="promotions" element={<PromotionsPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />

          {/* Paths from the previous version */}
          <Route path="orders" element={<Navigate to="/sales/invoices" replace />} />
          <Route path="clients/payments" element={<Navigate to="/sales/collections" replace />} />
          <Route path="products/stock" element={<Navigate to="/sales/stock" replace />} />
          <Route path="territories" element={<Navigate to="/sales/clients?tab=territories" replace />} />
          <Route path="*" element={<Navigate to="/sales" replace />} />
        </Routes>
      </SalesDataProvider>
    </AppShell>
  );
}
