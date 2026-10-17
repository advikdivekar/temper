// ui/PageHead.tsx
// The standard top of every app page: a small mono label, a serif
// title, an optional one line description, and room for actions on
// the right. Using one component keeps every page aligned the same.

import type { ReactNode } from "react";

interface Props {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHead({ eyebrow, title, description, actions }: Props) {
  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="serif page-title">{title}</h1>
        {description && <p className="muted page-desc">{description}</p>}
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}
