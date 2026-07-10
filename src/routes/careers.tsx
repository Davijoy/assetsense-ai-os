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
        <h2>Why join Sentinel</h2>
        <ul>
          <li>Work on the intelligence layer for a trillion-dollar industry.</li>
          <li>Ship AI-native products used by developers, brokers and enterprises daily.</li>
          <li>Direct exposure to founders, customers and the executive command center.</li>
          <li>Long-horizon problems — CRM, ERP, AI Voice, BI and Knowledge Engines under one roof.</li>
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
        <h2>Benefits</h2>
        <ul>
          <li>Competitive salary and meaningful ESOPs from day one.</li>
          <li>Premium health cover for you and your family.</li>
          <li>Home-office and learning stipends.</li>
          <li>Annual company offsite in India.</li>
          <li>Flexible time off and a genuine remote-first culture.</li>
        </ul>
      </section>

      <section>
        <h2>Culture</h2>
        <p>
          We are operators and engineers who care about the details. Expect a bias for shipping,
          direct feedback, a written-first culture and a strong belief that the best real estate
          software is yet to be built — by us.
        </p>
      </section>

      <section>
        <h2>Apply</h2>
        <form
          action="mailto:careers@sentinelfort.com"
          method="post"
          encType="text/plain"
          className="mt-4 grid gap-4 rounded-lg border border-border p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-gold/80">
              Full name
              <input required name="name" className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </label>
            <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-gold/80">
              Email
              <input required type="email" name="email" className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </label>
            <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-gold/80">
              Role
              <input name="role" placeholder="e.g. Applied AI Engineer" className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </label>
            <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-gold/80">
              Portfolio / LinkedIn
              <input name="portfolio" className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </label>
          </div>
          <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-gold/80">
            Why Sentinel?
            <textarea name="message" rows={4} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
          </label>
          <button type="submit" className="justify-self-start rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Submit application
          </button>
        </form>
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