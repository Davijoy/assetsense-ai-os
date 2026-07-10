import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";

export const Route = createFileRoute("/careers")({
  head: () => ({
    meta: [
      { title: "Careers — Sentinel Fort Group" },
      { name: "description", content: "Join Sentinel Fort Group and help build India's intelligent real estate operating system. Open roles across engineering, AI, design and go-to-market." },
      { property: "og:title", content: "Careers — Sentinel Fort Group" },
      { property: "og:description", content: "Open roles across engineering, AI, design and go-to-market." },
    ],
  }),
  component: CareersPage,
});

const roles = [
  { team: "Engineering", title: "Senior Full-Stack Engineer", location: "Bengaluru / Remote", type: "Full-time" },
  { team: "AI", title: "Applied AI Engineer — RAG & Agents", location: "Remote (India)", type: "Full-time" },
  { team: "Design", title: "Product Designer — Console", location: "Bengaluru / Remote", type: "Full-time" },
  { team: "Go-to-market", title: "Enterprise Account Executive", location: "Mumbai", type: "Full-time" },
  { team: "Customer", title: "Solutions Engineer — Real Estate", location: "Bengaluru / Mumbai / NCR", type: "Full-time" },
];

function CareersPage() {
  return (
    <PageShell
      eyebrow="Careers"
      title="Build the operating system for Indian real estate."
      lead="We are hiring operators, engineers, designers and AI researchers who want to reshape how a trillion-dollar industry decides and executes."
    >
      <section>
        <h2>How we work</h2>
        <ul>
          <li>Small, high-agency teams that ship weekly.</li>
          <li>Design-led, AI-native — every workflow starts with the user.</li>
          <li>Remote-first with regular in-person offsites in India.</li>
          <li>Transparent compensation with meaningful equity.</li>
        </ul>
      </section>

      <section>
        <h2>Open roles</h2>
        <div className="mt-4 divide-y divide-border rounded-lg border border-border">
          {roles.map((r) => (
            <div key={r.title} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="text-foreground font-medium">{r.title}</div>
                <div className="text-xs uppercase tracking-wide text-gold/80">{r.team} · {r.location} · {r.type}</div>
              </div>
              <a href="mailto:careers@sentinelfort.com" className="text-sm">Apply →</a>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>Don't see your role?</h2>
        <p>
          We're always meeting exceptional people. Write to{" "}
          <a href="mailto:careers@sentinelfort.com">careers@sentinelfort.com</a> with a note on
          what you'd build here.
        </p>
      </section>
    </PageShell>
  );
}