import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — Sentinel Fort Group" },
      { name: "description", content: "How Sentinel Fort Group protects customer data across authentication, encryption, tenancy and operations." },
      { property: "og:title", content: "Security — Sentinel Fort Group" },
      { property: "og:description", content: "Authentication, encryption, tenancy and operational security at Sentinel." },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Security"
      lead="This page is maintained by Sentinel Fort Group to answer common security questions about the Sentinel platform. It is app-owned editable content, not an independent certification."
    >
      <section>
        <h2>Access & authentication</h2>
        <ul>
          <li>Email + password sign-in with password reset and email verification.</li>
          <li>Google OAuth for enterprise sign-in.</li>
          <li>Role-based access control (admin, manager, agent, viewer, builder, developer) enforced on the server.</li>
          <li>Session tokens are scoped per workspace and expire on sign-out.</li>
        </ul>
      </section>

      <section>
        <h2>Tenancy & data isolation</h2>
        <ul>
          <li>Multi-tenant architecture with workspace-scoped identifiers on every record.</li>
          <li>Row-Level Security policies on every customer-facing table.</li>
          <li>Security-definer helpers for role checks to prevent policy recursion.</li>
        </ul>
      </section>

      <section>
        <h2>Encryption</h2>
        <ul>
          <li>TLS 1.2+ for all data in transit.</li>
          <li>Storage-level encryption at rest for the database and file storage.</li>
          <li>Secrets are stored in a managed secret store, never in source code.</li>
        </ul>
      </section>

      <section>
        <h2>Application security</h2>
        <ul>
          <li>Server functions validate input with Zod before any database access.</li>
          <li>Public API routes require signed callers or a valid workspace bearer token.</li>
          <li>Continuous dependency scanning; high and medium findings are remediated.</li>
        </ul>
      </section>

      <section>
        <h2>Operational security</h2>
        <ul>
          <li>Audit logs for administrative and connector events.</li>
          <li>Least-privilege access for internal engineers.</li>
          <li>Backups and point-in-time recovery managed by our hosting platform.</li>
        </ul>
      </section>

      <section>
        <h2>Report a vulnerability</h2>
        <p>
          If you believe you've found a security issue, please write to
          {" "}<a href="mailto:security@sentinelfort.com">security@sentinelfort.com</a>.
          Please do not publicly disclose the issue until we've had a reasonable opportunity
          to investigate and remediate.
        </p>
      </section>
    </PageShell>
  );
}