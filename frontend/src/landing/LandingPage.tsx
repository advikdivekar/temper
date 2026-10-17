// landing/LandingPage.tsx
// The public front door, built as connected scenes:
//   Hero (factory skyline), Follow one number (hold), Statement and
//   facts, The problem, How it works (scroll slide deck), Technical
//   explainer, Enter the demo
// plus a floating top nav. The architecture has its own page.

import { EnterProvider } from "./EnterContext";
import { FloatingNav } from "./parts/FloatingNav";
import { LogoStrip } from "./parts/LogoStrip";
import { DeckScene } from "./scenes/DeckScene";
import { DefaultScene } from "./scenes/DefaultScene";
import { EnterScene } from "./scenes/EnterScene";
import { ExplainerScene } from "./scenes/ExplainerScene";
import { HeroScene } from "./scenes/HeroScene";
import { SiteFooter } from "./scenes/SiteFooter";
import { StatementScene } from "./scenes/StatementScene";
import { WorldScene } from "./scenes/WorldScene";

export function LandingPage() {
  return (
    <EnterProvider>
      <div className="lp">
        <FloatingNav />
        <main>
          <HeroScene />
          <LogoStrip />
          <WorldScene />
          <StatementScene />
          <DefaultScene />
          <DeckScene />
          <ExplainerScene />
          <EnterScene />
        </main>
        <SiteFooter />
      </div>
    </EnterProvider>
  );
}
