import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Sentinel Fort Group" },
      { name: "description", content: "Talk to Sentinel Fort Group about demos, partnerships, press or support." },
      { property: "og:title", content: "Contact — Sentinel Fort Group" },
      { property: "og:description", content: "Talk to sales, partnerships, press or support." },
    ],
  }),
  component: ContactPage,
});

const contacts = [
  { label: "Sales & demos", email: "sales@sentinelfort.com", desc: "Explore Sentinel for your brokerage, developer group or enterprise." },
  { label: "Partnerships", email: "partners@sentinelfort.com", desc: "Channel partners, integrators and technology alliances." },
  { label: "Press & media", email: "press@sentinelfort.com", desc: "Editorial, briefings and brand assets." },
  { label: "Support", email: "support@sentinelfort.com", desc: "For existing Sentinel customers and workspace admins." },
  { label: "Security & privacy", email: "security@sentinelfort.com", desc: "Report vulnerabilities or privacy concerns." },
];

function ContactPage() {
  return (
    <PageShell
      eyebrow="Contact"
      title="Talk to Sentinel Fort Group."
      lead="Pick the right desk below and we'll get back within one business day."
    >
      <section>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          {contacts.map((c) => (
            <div key={c.email} className="rounded-lg border border-border p-5">
              <div className="text-xs uppercase tracking-[0.22em] text-gold/80">{c.label}</div>
              <a href={`mailto:${c.email}`} className="mt-2 block text-foreground font-medium">{c.email}</a>
              <p className="mt-2 text-sm">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Registered office</h2>
        <p>
          Sentinel Fort Group<br />
          Bengaluru, Karnataka, India
        </p>
      </section>
    </PageShell>
  );
}