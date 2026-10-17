// App.tsx
// Maps web addresses to pages. Public pages (landing, architecture,
// verify) work for anyone. Everything inside the app shell needs a
// signed in user, and anyone else is sent to the landing page.

import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { LandingPage } from "./landing/LandingPage";
import { StudioShell } from "./studio/StudioShell";

// Each page is loaded only when first visited, so the landing page
// downloads far less code. Suspense shows nothing while a page loads.
const ArchitecturePage = lazy(() => import("./architecture/ArchitecturePage").then((m) => ({ default: m.ArchitecturePage })));
const AuditPage = lazy(() => import("./studio/pages/AuditPage").then((m) => ({ default: m.AuditPage })));
const EvidencePage = lazy(() => import("./studio/pages/VaultPage").then((m) => ({ default: m.VaultPage })));
const LedgerPage = lazy(() => import("./studio/pages/LedgerPage").then((m) => ({ default: m.LedgerPage })));
const NetworkPage = lazy(() => import("./studio/pages/NetworkPage").then((m) => ({ default: m.NetworkPage })));
const HomePage = lazy(() => import("./studio/pages/HomePage").then((m) => ({ default: m.HomePage })));
const PlantPage = lazy(() => import("./studio/pages/BuildPage").then((m) => ({ default: m.BuildPage })));
const ReferencePage = lazy(() => import("./studio/pages/LibraryPage").then((m) => ({ default: m.LibraryPage })));
const RequestsPage = lazy(() => import("./studio/pages/RequestsPage").then((m) => ({ default: m.RequestsPage })));
const SettingsPage = lazy(() => import("./studio/pages/IdentityPage").then((m) => ({ default: m.IdentityPage })));
const StatementPage = lazy(() => import("./studio/pages/StatementPage").then((m) => ({ default: m.StatementPage })));
const StatementsPage = lazy(() => import("./studio/pages/StatementsPage").then((m) => ({ default: m.StatementsPage })));
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
      <Route element={me ? <StudioShell /> : <Navigate to="/" />}>
        <Route path="/overview" element={<HomePage />} />
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
