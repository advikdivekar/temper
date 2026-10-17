// shell/AppShell.tsx
// The frame around every signed in page: a sidebar and the content.
//
// Motion ideas used here:
//   layoutId pill   the highlight behind the active menu item slides
//                   from one item to the next instead of jumping
//   page transition each page fades and rises in, and the old one fades
//                   out, keyed by the web address

import { AnimatePresence, motion } from "motion/react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Icon, Logo } from "../ui/Icons";
import { Pill } from "../ui/Pill";

export function AppShell() {
  const { me, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  if (!me) return null;

  const items =
    me.role === "supplier"
      ? [
          { to: "/plant", label: "Plant workspace", icon: "factory" },
          { to: "/statements", label: "Statements", icon: "shield" },
        ]
      : [{ to: "/statements", label: me.role === "importer" ? "Supplier portfolio" : "Review queue", icon: "shield" }];

  function leave() {
    signOut();
    navigate("/");
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink to="/statements"><Logo /></NavLink>
        <nav>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className="nav-item">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="nav-pill" className="nav-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                  )}
                  <span className="nav-label"><Icon name={item.icon} size={17} />{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="org-card">
          <Pill tone="ember">{me.role}</Pill>
          <strong>{me.organization_name}</strong>
          <button className="btn quiet small" onClick={leave}>Switch persona</button>
        </div>
      </aside>
      <main className="content">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
