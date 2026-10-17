// components/Layout.tsx
// The page frame: top bar with navigation that depends on the role.

import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Layout() {
  const { me, signOut } = useAuth();
  if (!me) return null;

  return (
    <>
      <header className="topbar">
        <Link to="/statements"><strong>Temper</strong></Link>
        <nav>
          {me.role === "supplier" && <Link to="/plant">My plant</Link>}
          <Link to="/statements">
            {me.role === "supplier" ? "My statements" : "Shared with me"}
          </Link>
        </nav>
        <span className="who">
          {me.organization_name} ({me.role})
          <button onClick={() => { signOut(); window.location.href = "/"; }}>Switch persona</button>
        </span>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
