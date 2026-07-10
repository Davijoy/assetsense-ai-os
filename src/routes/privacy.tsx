import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Sentinel Fort Group" },
      { name: "description", content: "How Sentinel Fort Group collects, uses, shares and protects personal information across its real estate operating system." },
      { property: "og:title", content: "Privacy Policy — Sentinel Fort Group" },
      { property: "og:description", content: "How we collect, use, share and protect personal information." },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Privacy Policy"
      lead="This page is maintained by Sentinel Fort Group to explain how we handle personal information across our website and platform."
    >
      <p><em>Last updated: July 10, 2026.</em></p>

      <section>
        <h2>1. Scope</h2>
        <p>
          This policy applies to the Sentinel Fort Group website, the Sentinel console
          (CRM, Marketplace, Voice, KIE, BI and related modules), and any communication
          you have with us over email or forms. It describes the categories of information
          we process, why we process it, and the choices you have.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <ul>
          <li><strong className="text-foreground">Account data</strong> — name, email, workspace, role and authentication metadata.</li>
          <li><strong className="text-foreground">Customer content</strong> — leads, properties, documents, calls and files that customers upload into the platform.</li>
          <li><strong className="text-foreground">Usage data</strong> — pages viewed, features used, device and browser info, and diagnostics.</li>
          <li><strong className="text-foreground">Communication data</strong> — messages you send to sales, support, press or careers.</li>
        </ul>
      </section>

      <section>
        <h2>3. How we use information</h2>
        <ul>
          <li>To provide, secure and improve the Sentinel platform.</li>
          <li>To personalise the console and surface relevant insights.</li>
          <li>To communicate about updates, releases and account activity.</li>
          <li>To meet legal, tax and regulatory obligations.</li>
        </ul>
      </section>

      <section>
        <h2>4. Sharing</h2>
        <p>
          We do not sell personal information. We share it only with subprocessors that
          help us operate the platform (hosting, analytics, email, AI), with your workspace
          admin, or when required by law.
        </p>
      </section>

      <section>
        <h2>5. Data retention</h2>
        <p>
          Customer content is retained for as long as the workspace is active. On termination,
          content is deleted or anonymised within 60 days, unless a longer period is required
          by law or contract.
        </p>
      </section>

      <section>
        <h2>6. Your rights</h2>
        <p>
          Subject to applicable law (including India's DPDP Act and the EU GDPR), you may
          access, correct, export or delete your personal information, or object to certain
          processing. Write to <a href="mailto:privacy@sentinelfort.com">privacy@sentinelfort.com</a>.
        </p>
      </section>

      <section>
        <h2>7. International transfers</h2>
        <p>
          Sentinel is operated from India and may process data in other jurisdictions where our
          subprocessors operate. We apply appropriate safeguards for any cross-border transfer.
        </p>
      </section>

      <section>
        <h2>8. Contact</h2>
        <p>
          Data Protection Officer, Sentinel Fort Group — <a href="mailto:privacy@sentinelfort.com">privacy@sentinelfort.com</a>.
        </p>
      </section>
    </PageShell>
  );
}