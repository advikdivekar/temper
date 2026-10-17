// App.tsx
// Maps web addresses to pages. Public pages (landing, architecture,
// verify) work for anyone. Everything inside the app shell needs a
// signed in user, and anyone else is sent to the landing page.

import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { LandingPage } from "./landing/LandingPage";
import { AppShell } from "./shell/AppShell";

// Each page is loaded only when first visited, so the landing page
// downloads far less code. Suspense shows nothing while a page loads.
const ArchitecturePage = lazy(() => import("./architecture/ArchitecturePage").then((m) => ({ default: m.ArchitecturePage })));
const AuditPage = lazy(() => import("./pages/AuditPage").then((m) => ({ default: m.AuditPage })));
const EvidencePage = lazy(() => import("./pages/EvidencePage").then((m) => ({ default: m.EvidencePage })));
const LedgerPage = lazy(() => import("./pages/LedgerPage").then((m) => ({ default: m.LedgerPage })));
const NetworkPage = lazy(() => import("./pages/NetworkPage").then((m) => ({ default: m.NetworkPage })));
const OverviewPage = lazy(() => import("./pages/OverviewPage").then((m) => ({ default: m.OverviewPage })));
const PlantPage = lazy(() => import("./pages/PlantPage").then((m) => ({ default: m.PlantPage })));
const ReferencePage = lazy(() => import("./pages/ReferencePage").then((m) => ({ default: m.ReferencePage })));
const RequestsPage = lazy(() => import("./pages/RequestsPage").then((m) => ({ default: m.RequestsPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const StatementPage = lazy(() => import("./pages/StatementPage").then((m) => ({ default: m.StatementPage })));
const StatementsPage = lazy(() => import("./pages/StatementsPage").then((m) => ({ default: m.StatementsPage })));
const VerifyPage = lazy(() => import("./pages/VerifyPage").then((m) => ({ default: m.VerifyPage })));

export function App() {
  const { me, loading } = useAuth();
  if (loading) return null;

  return (
    <Suspense fallback={null}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/architecture" element={<ArchitecturePage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route element={me ? <AppShell /> : <Navigate to="/" />}>
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/plant" element={<PlantPage />} />
        <Route path="/statements" element={<StatementsPage />} />
        <Route path="/statements/:id" element={<StatementPage />} />
        <Route path="/ledger" element={<LedgerPage />} />
        <Route path="/evidence" element={<EvidencePage />} />
        <Route path="/network" element={<NetworkPage />} />
        <Route path="/requests" element={<RequestsPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/reference" element={<ReferencePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
    </Suspense>
  );
}
