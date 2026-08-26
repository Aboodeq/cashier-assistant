import { Route, Routes, useNavigate } from "react-router-dom";
import AppShell from "../../components/layout/AppShell";
import CompaniesPage from "../companies/CompaniesPage";
import RepresentativesPage from "../representatives/RepresentativesPage";
import SessionsPage from "../sessions/SessionsPage";
import DashboardHome from "./DashboardHome";
import { NAV } from "./nav";

export default function DashboardShell() {
  const navigate = useNavigate();

  return (
    <AppShell navItems={NAV}>
      <Routes>
        <Route index element={<DashboardHome nav={navigate} />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="representatives" element={<RepresentativesPage />} />
        <Route path="sessions" element={<SessionsPage />} />
      </Routes>
    </AppShell>
  );
}
