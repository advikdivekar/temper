// landing/scenes/StatementScene.tsx
// Scene 2: a short editorial statement on a light page, with key
// words picked out as outlined tags, then a grid of four facts.
//
// Every number here is a public fact with a source listed in the
// footer. The crosshair marks at the grid corners are a drawing
// detail borrowed from technical drawings.

import { CountUp } from "../../ui/CountUp";
import { Reveal } from "../../ui/Reveal";

const Tag = ({ children }: { children: React.ReactNode }) => <span className="tag">{children}</span>;

const FACTS = [
  { v: 35.1, d: 1, s: "%", label: "fall in India's steel exports to the EU, FY25", src: "GTRI" },
  { v: 2027, d: 0, s: "", label: "certificate sales begin", src: "EU CBAM", plain: true },
  { v: 30, d: 0, s: "%", label: "default mark-up by 2028", src: "Commission" },
  { v: 50, d: 0, s: " t", label: "yearly import exemption", src: "EU CBAM" },
];

export function StatementScene() {
  return (
    <section className="paper-scene" data-scene="3">
      <Reveal>
        <p className="statement mono">
          EU importers now pay for the carbon in <Tag>STEEL</Tag>, <Tag>ALUMINIUM</Tag> and <Tag>FASTENERS</Tag>.
          Without verified data they pay the <Tag>EU DEFAULT</Tag>. Temper turns <Tag>BILLS</Tag> into <Tag>SIGNED STATEMENTS</Tag>.
        </p>
      </Reveal>
      <div className="facts">
        {FACTS.map((f, i) => (
          <Reveal key={f.label} delay={i * 0.08} className="fact">
            <i className="cross tl" /><i className="cross tr" /><i className="cross bl" /><i className="cross br" />
            <div className="fact-n serif"><CountUp value={f.v} decimals={f.d} suffix={f.s} grouping={!f.plain} /></div>
            <p>{f.label}</p>
            <span className="mono muted">{f.src}</span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
