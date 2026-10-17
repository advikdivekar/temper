// landing/LandingPage.tsx
// The public front door, built as seven connected scenes:
//   1 Hero (explorable world)       5 Technical explainer
//   2 Statement and facts           6 Principles
//   3 The problem (default markup)  7 Enter the demo
//   4 How it works
// plus a floating top nav, a floating bottom pill and a scene counter
// that follow you down the page.

import { EnterProvider } from "./EnterContext";
import { FloatingCta } from "./parts/FloatingCta";
import { FloatingNav } from "./parts/FloatingNav";
import { SceneIndex } from "./parts/SceneIndex";
import { DefaultScene } from "./scenes/DefaultScene";
import { EnterScene } from "./scenes/EnterScene";
import { ExplainerScene } from "./scenes/ExplainerScene";
import { HeroScene } from "./scenes/HeroScene";
import { HowScene } from "./scenes/HowScene";
import { PrinciplesScene } from "./scenes/PrinciplesScene";
import { SiteFooter } from "./scenes/SiteFooter";
import { StatementScene } from "./scenes/StatementScene";

export function LandingPage() {
  return (
    <EnterProvider>
      <div className="lp">
        <FloatingNav />
        <SceneIndex total={7} />
        <main>
          <HeroScene />
          <StatementScene />
          <DefaultScene />
          <HowScene />
          <ExplainerScene />
          <PrinciplesScene />
          <EnterScene />
        </main>
        <SiteFooter />
        <FloatingCta />
      </div>
    </EnterProvider>
  );
}
