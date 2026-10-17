// studio/StudioShell.tsx
// The frame around every signed in page. A calm floating bar: a pill
// with the four pages you use most, the wordmark in the middle, and
// your avatar on the right. The avatar opens a menu with everything
// else (records, requests, the library, your organization), so the bar
// itself stays simple. Cmd+K opens a quick search from anywhere.

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Overview } from "../api/types";
import { Wordmark } from "../brand/Brand";
import { CommandPalette } from "../shell/CommandPalette";
import { studioNav } from "../shell/nav";

export function StudioShell() {
  const { me, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
      if (e.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    api<Overview>("/overview").then((o) => setCount(o.attention.length)).catch(() => undefined);
    setMenu(false);
  }, [location.pathname]);

  if (!me) return null;
  const { primary, more } = studioNav(me.role);

  return (
    <div className="studio">
      <header className="bar-wrap">
        <div className="bar">
          <nav className="pill-nav" aria-label="Main">
            {primary.map((item) => (
              <NavLink key={item.to} to={item.to} className="pill-link">
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="pill-on" className="pill-on" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                    <span className="pill-text">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <Link to="/overview" className="brand" aria-label="Home"><Wordmark height={22} tone="dark" /></Link>
          <div className="bar-right">
            <div className="menu-wrap">
              <button className="avatar-btn" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label="Menu">
                {me.organization_name.slice(0, 1).toUpperCase()}
                {count > 0 && <span className="badge">{count}</span>}
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div className="menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                    <span className="kicker">{me.organization_name} / {me.role}</span>
                    {primary.map((item) => (
                      <Link key={item.to} to={item.to} className="menu-row mobile-only" onClick={() => setMenu(false)}>{item.label}</Link>
                    ))}
                    {more.map((item) => (
                      <Link key={item.to} to={item.to} className="menu-row" onClick={() => setMenu(false)}>{item.label}</Link>
                    ))}
                    <hr />
                    <button className="menu-row" onClick={() => { setMenu(false); setPalette(true); }}>Search <small className="mono">⌘K</small></button>
                    <Link to="/architecture" className="menu-row">Architecture</Link>
                    <Link to="/verify" className="menu-row">Verify a pack</Link>
                    <button className="menu-row" onClick={() => { signOut(); navigate("/"); }}>Switch persona</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.main key={location.pathname} className="page" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
