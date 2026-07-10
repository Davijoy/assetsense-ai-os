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
        <h2>Who we are</h2>
        <p>
          Sentinel Fort Group is building the Intelligence Layer for Real Estate by combining
          Artificial Intelligence, Business Intelligence, CRM, ERP, Marketplace and Decision
          Intelligence into one unified platform.
        </p>
      </section>

      <section>
        <h2>Mission</h2>
        <p>
          Empower the real estate industry with intelligent technology that transforms data
          into decisions.
        </p>
      </section>

      <section>
        <h2>Vision</h2>
        <p>
          To become the global intelligence platform for real estate.
        </p>
      </section>

      <section>
        <h2>Core values</h2>
        <ul>
          <li><strong className="text-foreground">Strength</strong> — enterprise-grade engineering, security and reliability.</li>
          <li><strong className="text-foreground">Vision</strong> — decisions grounded in AI, evidence and long horizons.</li>
          <li><strong className="text-foreground">Legacy</strong> — every product is built to outlast trends.</li>
          <li><strong className="text-foreground">Innovation</strong> — AI-native by default, not bolted on.</li>
          <li><strong className="text-foreground">Integrity</strong> — transparent data, transparent commercials.</li>
          <li><strong className="text-foreground">Customer success</strong> — we measure ourselves in customer outcomes.</li>
        </ul>
      </section>

      <section>
        <h2>Timeline</h2>
        <ul>
          <li><strong className="text-foreground">2024</strong> — Sentinel Fort Group founded to build a Real Estate Operating System.</li>
          <li><strong className="text-foreground">2025</strong> — CRM, Marketplace, AI Voice and BI launched to design partners.</li>
          <li><strong className="text-foreground">2025</strong> — Knowledge Intelligence Engine (KIE) and Decision Intelligence modules shipped.</li>
          <li><strong className="text-foreground">2026</strong> — REOS v1.0 with multi-tenant workspaces, RBAC and Global Intelligence Layer.</li>
        </ul>
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