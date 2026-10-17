// shell/AppShell.tsx
// The frame around every signed in page: a grouped sidebar, a top bar
// with search (Cmd+K) and notifications, and the page content.
//
// Motion ideas used here:
//   layoutId pill   the highlight behind the active menu item slides
//   page transition each page fades and rises in, keyed by address
//   bell            a small badge counts what needs attention

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Overview } from "../api/types";
import { Icon, Logo } from "../ui/Icons";
import { Pill } from "../ui/Pill";
import { CommandPalette } from "./CommandPalette";
import { navFor } from "./nav";

export function AppShell() {
  const { me, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [palette, setPalette] = useState(false);
  const [bell, setBell] = useState(false);
  const [alerts, setAlerts] = useState<Overview["attention"]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    api<Overview>("/overview").then((o) => setAlerts(o.attention)).catch(() => undefined);
    setBell(false);
  }, [location.pathname]);

  if (!me) return null;
  const groups = navFor(me.role);

  function leave() { signOut(); navigate("/"); }

  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink to="/overview"><Logo tone="dark" /></NavLink>
        <nav>
          {groups.map((group) => (
            <div key={group.title} className="nav-group">
              <span className="nav-title">{group.title}</span>
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} className="nav-item">
                  {({ isActive }) => (
                    <>
                      {isActive && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                      <span className="nav-label"><Icon name={item.icon} size={16} />{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="org-card">
          <Pill tone="ember">{me.role}</Pill>
          <strong>{me.organization_name}</strong>
          <button className="btn quiet small" onClick={leave}>Switch persona</button>
        </div>
      </aside>

      <div className="main-col">
        <div className="topbar">
          <button className="search-btn" onClick={() => setPalette(true)} aria-label="Search">
            <Icon name="eye" size={15} /><span>Search or jump to...</span><kbd>⌘K</kbd>
          </button>
          <div className="topbar-right">
            <Link to="/architecture" className="top-link">Architecture</Link>
            <Link to="/verify" className="top-link">Verify a pack</Link>
            <div className="bell-wrap">
              <button className="bell" onClick={() => setBell(!bell)} aria-label={`Notifications, ${alerts.length}`} aria-expanded={bell}>
                <Icon name="flame" size={17} />
                {alerts.length > 0 && <motion.span className="bell-count" initial={{ scale: 0 }} animate={{ scale: 1 }}>{alerts.length}</motion.span>}
              </button>
              <AnimatePresence>
                {bell && (
                  <motion.div className="bell-panel" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <span className="eyebrow">Needs attention</span>
                    {alerts.length === 0 && <p className="muted">All clear.</p>}
                    {alerts.slice(0, 5).map((a, i) => (
                      <Link key={i} to={a.link} className="bell-item" onClick={() => setBell(false)}>
                        <span className={`sev ${a.severity}`} /><div><strong>{a.title}</strong><div className="muted">{a.detail}</div></div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <main className="content">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
