// studio/StudioShell.tsx
// The frame around every signed in page. There is no sidebar and no
// dashboard grid. Instead a floating bar, the same one used on the
// landing page: a pill of the few pages you use most on the left, the
// wordmark in the middle, and on the right a search shortcut, a bell
// and your organization's avatar, which opens a menu with the rest.
//
// Every page below it is a full screen "stage": one idea, large type,
// and motion. Pages fade and rise in as you move between them.

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { Overview } from "../api/types";
import { Wordmark } from "../brand/Brand";
import { Icon } from "../ui/Icons";
import { CommandPalette } from "../shell/CommandPalette";
import { studioNav } from "../shell/nav";

export function StudioShell() {
  const { me, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [palette, setPalette] = useState(false);
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const [alerts, setAlerts] = useState<Overview["attention"]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
      if (e.key === "Escape") { setMenu(false); setBell(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    api<Overview>("/overview").then((o) => setAlerts(o.attention)).catch(() => undefined);
    setMenu(false); setBell(false);
  }, [location.pathname]);

  if (!me) return null;
  const { primary, more } = studioNav(me.role);
  const initial = me.organization_name.slice(0, 1).toUpperCase();

  return (
    <div className="studio">
      <header className="sbar-wrap">
        <div className="sbar">
          <nav className="spill" aria-label="Main">
            {primary.map((item) => (
              <NavLink key={item.to} to={item.to} className="spill-item">
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="studio-pill" className="spill-on" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                    <span className="spill-label">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <Link to="/overview" className="sbrand" aria-label="Home"><Wordmark height={22} tone="light" /></Link>

          <div className="sright">
            <button className="sglass sk" onClick={() => setPalette(true)} aria-label="Search"><Icon name="eye" size={15} /><kbd>⌘K</kbd></button>
            <div className="smenu-wrap">
              <button className="sglass sbell" onClick={() => { setBell(!bell); setMenu(false); }} aria-label={`Notifications, ${alerts.length}`}>
                <Icon name="flame" size={16} />
                {alerts.length > 0 && <motion.span className="sdot" initial={{ scale: 0 }} animate={{ scale: 1 }}>{alerts.length}</motion.span>}
              </button>
              <AnimatePresence>
                {bell && (
                  <motion.div className="spanel" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <span className="mono kicker">NEEDS YOU</span>
                    {alerts.length === 0 && <p className="muted-light">All clear.</p>}
                    {alerts.slice(0, 5).map((a, i) => (
                      <Link key={i} to={a.link} className="spanel-row" onClick={() => setBell(false)}>
                        <i className={a.severity} /><span>{a.title}</span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="smenu-wrap" ref={menuRef}>
              <button className="sglass savatar" onClick={() => { setMenu(!menu); setBell(false); }} aria-label="Menu" aria-expanded={menu}>{initial}</button>
              <AnimatePresence>
                {menu && (
                  <motion.div className="spanel" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    <span className="mono kicker">{me.organization_name} / {me.role}</span>
                    {primary.map((item) => (
                      <Link key={item.to} to={item.to} className="spanel-row only-mobile" onClick={() => setMenu(false)}>
                        <span>{item.label}</span><Icon name="arrow" size={13} />
                      </Link>
                    ))}
                    {more.map((item) => (
                      <Link key={item.to} to={item.to} className="spanel-row" onClick={() => setMenu(false)}>
                        <span>{item.label}</span><Icon name="arrow" size={13} />
                      </Link>
                    ))}
                    <Link to="/architecture" className="spanel-row"><span>Architecture</span><Icon name="arrow" size={13} /></Link>
                    <Link to="/verify" className="spanel-row"><span>Verify a pack</span><Icon name="arrow" size={13} /></Link>
                    <button className="spanel-row" onClick={() => { signOut(); navigate("/"); }}><span>Switch persona</span><Icon name="arrow" size={13} /></button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <main className="stage-main">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
