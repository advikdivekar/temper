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
      { to: "/audit", label: "Audit log", icon: "lock" },
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
        { to: "/ledger", label: "Ledger", icon: "refresh" },
        { to: "/evidence", label: "Evidence vault", icon: "upload" },
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
