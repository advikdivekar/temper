// App.tsx
// Maps web addresses to pages. Anyone not signed in is sent to the
// landing page.

import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { LandingPage } from "./landing/LandingPage";
import { PlantPage } from "./pages/PlantPage";
import { StatementPage } from "./pages/StatementPage";
import { StatementsPage } from "./pages/StatementsPage";
import { AppShell } from "./shell/AppShell";

export function App() {
  const { me, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={me ? <AppShell /> : <Navigate to="/" />}>
        <Route path="/plant" element={<PlantPage />} />
        <Route path="/statements" element={<StatementsPage />} />
        <Route path="/statements/:id" element={<StatementPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
