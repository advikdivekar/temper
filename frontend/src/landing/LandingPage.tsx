// landing/LandingPage.tsx
// The public front door, built as nine connected scenes:
//   1 Hero (full screen heat field)   6 Technical explainer
//   2 The supply chain (hold to temper) 7 Architecture
//   3 Statement and facts              8 Principles
//   4 The problem (default markup)     9 Enter the demo
//   5 How it works (scroll slide deck)
// plus a floating top nav, a floating bottom pill and a scene counter
// that follow you down the page.

import { EnterProvider } from "./EnterContext";
import { FloatingCta } from "./parts/FloatingCta";
import { FloatingNav } from "./parts/FloatingNav";
import { LogoStrip } from "./parts/LogoStrip";
import { ArchScene } from "./scenes/ArchScene";
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
          <ArchScene />
          <PrinciplesScene />
          <EnterScene />
        </main>
        <SiteFooter />
        <FloatingCta />
      </div>
    </EnterProvider>
  );
}
