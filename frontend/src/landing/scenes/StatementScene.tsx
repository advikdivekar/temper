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
  { v: 35.1, d: 1, s: "%", label: "fall in India's iron and steel exports to the EU in FY25", src: "GTRI" },
  { v: 2027, d: 0, s: "", label: "year certificate sales begin for the carbon in imported goods", src: "EU CBAM", plain: true },
  { v: 30, d: 0, s: "%", label: "default value mark-up from 2028. Real data is the way out", src: "Commission" },
  { v: 50, d: 0, s: " t", label: "yearly import threshold below which importers are exempt", src: "EU CBAM" },
];

export function StatementScene() {
  return (
    <section className="paper-scene" data-scene="3">
      <Reveal>
        <p className="statement mono">
          EU importers now pay for the carbon inside <Tag>STEEL</Tag>, <Tag>ALUMINIUM</Tag> and
          the <Tag>FASTENERS</Tag> made from them. Without verified data from the
          factory they must use the <Tag>EU DEFAULT</Tag>, set high on purpose. Temper
          turns <Tag>BILLS</Tag> and <Tag>LOGS</Tag> into <Tag>SIGNED STATEMENTS</Tag> that
          travel with the goods.
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
