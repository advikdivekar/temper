// App.tsx
// Decides which page shows for each web address, and sends people who
// are not signed in to the login page.

import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { LandingPage } from "./pages/LandingPage";
import { PlantPage } from "./pages/PlantPage";
import { StatementDetailPage } from "./pages/StatementDetailPage";
import { StatementsPage } from "./pages/StatementsPage";

export function App() {
  const { me, loading } = useAuth();
  if (loading) return <p>Loading</p>;

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={me ? <Layout /> : <Navigate to="/" />}>
        <Route path="/plant" element={<PlantPage />} />
        <Route path="/statements" element={<StatementsPage />} />
        <Route path="/statements/:id" element={<StatementDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
