import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Sentinel Fort Group" },
      { name: "description", content: "Sentinel Fort Group is building India's intelligent real estate operating system — combining CRM, marketplace, AI voice and BI on one premium platform." },
      { property: "og:title", content: "About — Sentinel Fort Group" },
      { property: "og:description", content: "The team, mission and vision behind India's intelligent real estate operating system." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PageShell
      eyebrow="About"
      title="Strength. Vision. Legacy."
      lead="Sentinel Fort Group is building the intelligence layer for real estate — an operating system where developers, brokers, channel partners and enterprises decide once and execute always."
    >
      <section>
        <h2>Our mission</h2>
        <p>
          Real estate in India runs on fragmented tools, siloed data and slow decisions.
          We are unifying properties, leads, marketing, sales, voice and business intelligence
          into a single decision-intelligence platform, so every stakeholder — from an on-ground
          agent to a group CEO — operates with the same signal.
        </p>
      </section>

      <section>
        <h2>What we do</h2>
        <ul>
          <li>Sentinel CRM & ERP for lead-to-loyalty workflows.</li>
          <li>Sentinel Marketplace for AI-scored inventory discovery.</li>
          <li>Sentinel Voice for compliant, always-on AI voice agents.</li>
          <li>Sentinel Knowledge Intelligence Engine (KIE) for document RAG and executive copilots.</li>
          <li>Sentinel BI for forecast suites, deal rooms and governance.</li>
        </ul>
      </section>

      <section>
        <h2>Leadership</h2>
        <p>
          Sentinel Fort Group is led by operators from real estate, enterprise SaaS and applied AI.
          Our leadership team combines multiple decades of experience across residential, commercial
          and channel-partner ecosystems, with a shared bias for shipping premium software.
        </p>
      </section>

      <section>
        <h2>Where we are</h2>
        <p>
          Headquartered in India, operating across major metros and Tier‑1 markets, with a
          remote-first engineering and design team.
        </p>
      </section>
    </PageShell>
  );
}