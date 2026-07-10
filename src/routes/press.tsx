import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";

export const Route = createFileRoute("/press")({
  head: () => ({
    meta: [
      { title: "Press — Sentinel Fort Group" },
      { name: "description", content: "Press releases, media assets and company facts for Sentinel Fort Group." },
      { property: "og:title", content: "Press — Sentinel Fort Group" },
      { property: "og:description", content: "Press releases, media assets and company facts." },
    ],
  }),
  component: PressPage,
});

function PressPage() {
  return (
    <PageShell
      eyebrow="Press"
      title="News, media and brand assets."
      lead="Everything journalists, analysts and partners need to write about Sentinel Fort Group."
    >
      <section>
        <h2>Company facts</h2>
        <ul>
          <li><strong className="text-foreground">Legal name:</strong> Sentinel Fort Group</li>
          <li><strong className="text-foreground">Category:</strong> Real Estate Operating System (REOS)</li>
          <li><strong className="text-foreground">Headquarters:</strong> India</li>
          <li><strong className="text-foreground">Founded:</strong> 2024</li>
          <li><strong className="text-foreground">Tagline:</strong> Strength. Vision. Legacy.</li>
        </ul>
      </section>

      <section>
        <h2>Recent announcements</h2>
        <ul>
          <li>Sentinel Fort Group launches Knowledge Intelligence Engine (KIE) for real-estate copilots.</li>
          <li>Sentinel Voice cockpit adds real-time AI transcripts and compliance recording.</li>
          <li>Sentinel Marketplace introduces AI Investment Scores for residential inventory.</li>
          <li>Sentinel Fort Group becomes anchor licensee of the RealtifyU operating stack.</li>
        </ul>
      </section>

      <section>
        <h2>Brand assets</h2>
        <p>
          Logos, wordmarks and product screenshots are available on request. Please write to
          {" "}<a href="mailto:press@sentinelfort.com">press@sentinelfort.com</a> with your outlet
          and deadline.
        </p>
      </section>

      <section>
        <h2>Media contact</h2>
        <p>
          <a href="mailto:press@sentinelfort.com">press@sentinelfort.com</a>
        </p>
      </section>

      <section>
        <h2>Press kit</h2>
        <p>
          The Sentinel Fort Group press kit includes primary and secondary logos, wordmarks,
          shield mark, product screenshots, executive photography and boilerplate copy in short
          and long form. Written requests are turned around within one business day.
        </p>
        <ul>
          <li>Primary wordmark and shield mark (SVG + PNG)</li>
          <li>Product screenshots of CRM, Marketplace, AI Voice, KIE and BI</li>
          <li>Executive photography and bios</li>
          <li>Short and long-form company boilerplate</li>
          <li>Approved product taglines</li>
        </ul>
      </section>

      <section>
        <h2>Future announcements</h2>
        <ul>
          <li>Sentinel Enterprise Cloud with region-aware data residency (upcoming).</li>
          <li>Marketplace expansion into commercial and pre-leased inventory (upcoming).</li>
          <li>Executive Command Center — public beta (upcoming).</li>
        </ul>
      </section>
    </PageShell>
  );
}