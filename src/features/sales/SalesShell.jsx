import { Route, Routes, useNavigate } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import ClientsPage from "./ClientsPage";
import ProductsPage from "./ProductsPage";
import SalesHome from "./SalesHome";
import StockPage from "./StockPage";
import TerritoriesPage from "./TerritoriesPage";
import VisitsPage from "./VisitsPage";
import { NAV } from "./nav";

export default function SalesShell() {
  const navigate = useNavigate();

  return (
    <AppShell navItems={NAV}>
      <Routes>
        <Route index element={<SalesHome nav={navigate} />} />
        <Route path="territories" element={<TerritoriesPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="visits" element={<VisitsPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/stock" element={<StockPage />} />
      </Routes>
    </AppShell>
  );
}
