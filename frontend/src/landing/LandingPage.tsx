// landing/LandingPage.tsx
// The public front door, built as connected scenes:
//   1 Hero (factory skyline)        5 Technical explainer
//   2 Follow one number (guided)    6 Principles
//   3 Statement and facts           7 Enter the demo
//   4 The problem, then How it works (scroll slide deck)
// plus a floating top nav. The architecture has its own page.

import { EnterProvider } from "./EnterContext";
import { FloatingNav } from "./parts/FloatingNav";
import { LogoStrip } from "./parts/LogoStrip";
import { DeckScene } from "./scenes/DeckScene";
import { DefaultScene } from "./scenes/DefaultScene";
import { EnterScene } from "./scenes/EnterScene";
import { ExplainerScene } from "./scenes/ExplainerScene";
import { HeroScene } from "./scenes/HeroScene";
import { PrinciplesScene } from "./scenes/PrinciplesScene";
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
          <PrinciplesScene />
          <EnterScene />
        </main>
        <SiteFooter />
      </div>
    </EnterProvider>
  );
}
