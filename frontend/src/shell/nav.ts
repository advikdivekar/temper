// shell/nav.ts
// Which pages exist for which role, grouped under headings. The
// sidebar and the command palette both read this one list, so a new
// page only has to be added here.

import type { Role } from "../api/types";

export interface NavItem { to: string; label: string; icon: string }
export interface NavGroup { title: string; items: NavItem[] }

export function navFor(role: Role): NavGroup[] {
  const trust: NavGroup = {
    title: "Trust",
    items: [
      { to: "/reference", label: "Reference data", icon: "file" },
      { to: "/settings", label: "Organization", icon: "shield" },
    ],
  };
  const network: NavGroup = {
    title: "Network",
    items: [
      { to: "/network", label: "Supply chain", icon: "link" },
      { to: "/requests", label: "Requests", icon: "ship" },
    ],
  };
  if (role === "supplier") {
    return [
      { title: "Workspace", items: [
        { to: "/overview", label: "Overview", icon: "flame" },
        { to: "/plant", label: "Plant workspace", icon: "factory" },
        { to: "/statements", label: "Statements", icon: "shield" },
      ] },
      { title: "Records", items: [
        { to: "/records", label: "Records", icon: "refresh" },
      ] },
      network, trust,
    ];
  }
  const queue = role === "importer" ? "Supplier portfolio" : "Review queue";
  return [
    { title: "Workspace", items: [
      { to: "/overview", label: "Overview", icon: "flame" },
      { to: "/statements", label: queue, icon: "shield" },
    ] },
    network, trust,
  ];
}


/** The app's floating bar: four core pages. The rest live in the menu. */
export function studioNav(role: Role): { primary: NavItem[]; more: NavItem[] } {
  const home = { to: "/overview", label: "Home", icon: "flame" };
  const statements = { to: "/statements", label: role === "verifier" ? "Review" : "Statements", icon: "shield" };
  const chain = { to: "/network", label: "Chain", icon: "link" };
  const requests = { to: "/requests", label: "Requests", icon: "ship" };
  const library = { to: "/reference", label: "Library", icon: "file" };
  const identity = { to: "/settings", label: "Organization", icon: "shield" };
  if (role === "supplier") {
    return {
      primary: [home, statements, { to: "/plant", label: "Build", icon: "factory" }, chain],
      more: [{ to: "/records", label: "Records", icon: "refresh" }, requests, library, identity],
    };
  }
  return {
    primary: [home, statements, chain, requests],
    more: [{ to: "/records", label: "Audit and records", icon: "lock" }, library, identity],
  };
}
