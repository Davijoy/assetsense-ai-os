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
  { label: "Investor relations", email: "ir@sentinelfort.com", desc: "Investor briefings, disclosures and analyst enquiries." },
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
        <p className="mt-2">
          Phone: <a href="tel:+918040000000">+91 80 4000 0000</a><br />
          Email: <a href="mailto:hello@sentinelfort.com">hello@sentinelfort.com</a>
        </p>
      </section>

      <section>
        <h2>Find us</h2>
        <div className="mt-2 overflow-hidden rounded-lg border border-border">
          <iframe
            title="Sentinel Fort Group office"
            src="https://www.google.com/maps?q=Bengaluru%2C%20Karnataka%2C%20India&output=embed"
            loading="lazy"
            className="h-72 w-full"
          />
        </div>
      </section>

      <section>
        <h2>Send us a note</h2>
        <form
          action="mailto:hello@sentinelfort.com"
          method="post"
          encType="text/plain"
          className="mt-4 grid gap-4 rounded-lg border border-border p-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-gold/80">
              Name
              <input required name="name" className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </label>
            <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-gold/80">
              Work email
              <input required type="email" name="email" className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </label>
            <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-gold/80">
              Company
              <input name="company" className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
            </label>
            <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-gold/80">
              Topic
              <select name="topic" className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary">
                <option>Sales & demos</option>
                <option>Partnerships</option>
                <option>Support</option>
                <option>Press</option>
                <option>Investor relations</option>
                <option>Other</option>
              </select>
            </label>
          </div>
          <label className="grid gap-1.5 text-xs uppercase tracking-[0.18em] text-gold/80">
            Message
            <textarea name="message" rows={5} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
          </label>
          <button type="submit" className="justify-self-start rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Send message
          </button>
        </form>
      </section>

      <section>
        <h2>Follow us</h2>
        <ul className="flex flex-wrap gap-4">
          <li><a href="https://www.linkedin.com/" target="_blank" rel="noreferrer">LinkedIn</a></li>
          <li><a href="https://x.com/" target="_blank" rel="noreferrer">X</a></li>
          <li><a href="https://www.youtube.com/" target="_blank" rel="noreferrer">YouTube</a></li>
          <li><a href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram</a></li>
        </ul>
      </section>
    </PageShell>
  );
}