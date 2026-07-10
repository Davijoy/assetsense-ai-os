import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";

export const Route = createFileRoute("/dpa")({
  head: () => ({
    meta: [
      { title: "Data Processing Addendum — Sentinel Fort Group" },
      { name: "description", content: "The Sentinel Fort Group Data Processing Addendum (DPA) covering processing of personal data on behalf of customers." },
      { property: "og:title", content: "Data Processing Addendum — Sentinel Fort Group" },
      { property: "og:description", content: "Sentinel Fort Group DPA covering processing of personal data on behalf of customers." },
    ],
  }),
  component: DpaPage,
});

function DpaPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Data Processing Addendum"
      lead="This DPA supplements the Terms of Service between Sentinel Fort Group (processor) and the customer (controller) for the processing of personal data via the Sentinel platform."
    >
      <p><em>Last updated: July 10, 2026.</em></p>

      <section>
        <h2>1. Definitions</h2>
        <p>
          "Personal Data", "Processing", "Controller", "Processor" and "Data Subject" have the
          meanings set out in applicable data protection law (including India's DPDP Act and the
          EU GDPR).
        </p>
      </section>

      <section>
        <h2>2. Scope and roles</h2>
        <ul>
          <li>The customer is the Controller of personal data uploaded into its Sentinel workspace.</li>
          <li>Sentinel acts as the Processor and only processes personal data on documented instructions.</li>
          <li>Sentinel's subprocessors act as sub-processors under this DPA.</li>
        </ul>
      </section>

      <section>
        <h2>3. Nature and purpose of processing</h2>
        <p>
          Sentinel processes personal data to provide the CRM, Marketplace, Voice, KIE and BI
          modules, to secure the platform, to support the customer, and to comply with law.
        </p>
      </section>

      <section>
        <h2>4. Categories of data and data subjects</h2>
        <ul>
          <li><strong className="text-foreground">Data subjects:</strong> customer's employees, agents, leads, buyers, tenants and channel partners.</li>
          <li><strong className="text-foreground">Categories:</strong> contact details, communication records, property preferences, KYC references, transaction data, uploaded documents and call recordings (where enabled).</li>
        </ul>
      </section>

      <section>
        <h2>5. Security measures</h2>
        <p>
          Sentinel maintains the technical and organisational measures described on our
          {" "}<a href="/security">Security</a> page, including encryption in transit, encryption at
          rest, RLS-based tenancy isolation, RBAC, audit logging and vulnerability management.
        </p>
      </section>

      <section>
        <h2>6. Sub-processors</h2>
        <p>
          Sentinel uses vetted sub-processors for hosting, database, email, analytics and AI
          inference. A current list is available on request from
          {" "}<a href="mailto:privacy@sentinelfort.com">privacy@sentinelfort.com</a>. Customers may
          object to new sub-processors on reasonable grounds.
        </p>
      </section>

      <section>
        <h2>7. International transfers</h2>
        <p>
          Where personal data is transferred outside the customer's jurisdiction, Sentinel
          applies appropriate safeguards, such as standard contractual clauses, in line with
          applicable law.
        </p>
      </section>

      <section>
        <h2>8. Data subject requests</h2>
        <p>
          Sentinel will assist the customer in responding to data subject requests using the
          admin tools in the console and, where necessary, through targeted support requests.
        </p>
      </section>

      <section>
        <h2>9. Breach notification</h2>
        <p>
          Sentinel will notify the customer without undue delay after becoming aware of a
          personal data breach affecting the customer's data, and will provide the information
          reasonably required for the customer to meet its own notification obligations.
        </p>
      </section>

      <section>
        <h2>10. Deletion and return</h2>
        <p>
          On termination, Sentinel will delete or return customer personal data within 60 days,
          unless retention is required by law.
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>
          To execute this DPA or request the current sub-processor list, write to
          {" "}<a href="mailto:privacy@sentinelfort.com">privacy@sentinelfort.com</a>.
        </p>
      </section>
    </PageShell>
  );
}