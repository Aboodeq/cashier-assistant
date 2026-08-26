import { Route, Routes, useNavigate } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import ClientsPage from "./ClientsPage";
import SalesHome from "./SalesHome";
import TerritoriesPage from "./TerritoriesPage";
import { NAV } from "./nav";

export default function SalesShell() {
  const navigate = useNavigate();

  return (
    <AppShell navItems={NAV}>
      <Routes>
        <Route index element={<SalesHome nav={navigate} />} />
        <Route path="territories" element={<TerritoriesPage />} />
        <Route path="clients" element={<ClientsPage />} />
      </Routes>
    </AppShell>
  );
}
