import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Sentinel Fort Group" },
      { name: "description", content: "The terms that govern access to and use of the Sentinel Fort Group website and platform." },
      { property: "og:title", content: "Terms of Service — Sentinel Fort Group" },
      { property: "og:description", content: "Terms governing use of the Sentinel Fort Group website and platform." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Terms of Service"
      lead="These terms are maintained by Sentinel Fort Group and govern access to the Sentinel website and platform."
    >
      <p><em>Last updated: July 10, 2026.</em></p>

      <section>
        <h2>1. Agreement</h2>
        <p>
          By accessing the Sentinel website or logging into the Sentinel console you agree to
          these Terms of Service. If you are using Sentinel on behalf of an organisation, you
          confirm that you are authorised to bind that organisation.
        </p>
      </section>

      <section>
        <h2>2. Accounts and workspaces</h2>
        <ul>
          <li>You are responsible for your credentials and for all activity in your workspace.</li>
          <li>Workspace admins may add, remove and assign roles for their users.</li>
          <li>You must be at least 18 years old and use Sentinel only for lawful purposes.</li>
        </ul>
      </section>

      <section>
        <h2>3. Customer content</h2>
        <p>
          You retain all rights to the leads, properties, documents and other content you upload.
          You grant Sentinel a limited license to host, process and display that content solely
          to provide the service to you.
        </p>
      </section>

      <section>
        <h2>4. Acceptable use</h2>
        <ul>
          <li>No reverse engineering, scraping or bypassing security controls.</li>
          <li>No uploading of unlawful, infringing, or harmful content.</li>
          <li>No use of Sentinel Voice or AI features to impersonate, harass or defraud.</li>
        </ul>
      </section>

      <section>
        <h2>5. Fees and billing</h2>
        <p>
          Paid plans are billed as agreed in your order form or plan selection. Fees are
          non-refundable except where required by law.
        </p>
      </section>

      <section>
        <h2>6. Suspension and termination</h2>
        <p>
          We may suspend or terminate access for material breach, non-payment, or activity that
          threatens the security of the platform. You may cancel at any time from your workspace
          settings.
        </p>
      </section>

      <section>
        <h2>7. Disclaimers and liability</h2>
        <p>
          The Sentinel platform is provided "as is". To the maximum extent permitted by law,
          Sentinel Fort Group disclaims all implied warranties and its aggregate liability is
          limited to the fees paid in the twelve months preceding the claim.
        </p>
      </section>

      <section>
        <h2>8. Governing law</h2>
        <p>
          These terms are governed by the laws of India. Courts in Bengaluru shall have
          exclusive jurisdiction, except where a mandatory local law requires otherwise.
        </p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>
          Questions about these terms? Write to <a href="mailto:legal@sentinelfort.com">legal@sentinelfort.com</a>.
        </p>
      </section>
    </PageShell>
  );
}