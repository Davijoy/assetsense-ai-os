import { createFileRoute } from "@tanstack/react-router";
import { ResourcePage } from "@/components/landing/ResourcePage";
import { Activity, ShieldCheck, Radar, BellRing, ScrollText, Cloud } from "lucide-react";

export const Route = createFileRoute("/resources/status")({
  head: () => ({
    meta: [
      { title: "System Status — Sentinel Fort Group" },
      { name: "description", content: "Live status of Sentinel modules, integrations and regions, plus historical uptime and incident post-mortems." },
      { property: "og:title", content: "Sentinel System Status" },
      { property: "og:description", content: "Realtime health, uptime and incident history for the Sentinel platform." },
    ],
  }),
  component: StatusPage,
});

const services = [
  { name: "Web App & Console", status: "Operational" },
  { name: "APIs & Webhooks", status: "Operational" },
  { name: "AI Voice", status: "Operational" },
  { name: "Marketing Cloud", status: "Operational" },
  { name: "Knowledge Intelligence Engine", status: "Operational" },
  { name: "Realtify U Integrations", status: "Operational" },
];

function StatusPage() {
  return (
    <ResourcePage
      eyebrow="Resources · System Status"
      title={<>Sentinel is <span className="text-primary">operational</span>.</>}
      lead="Realtime status of every Sentinel module, region and integration — plus historical uptime and detailed post-mortems for every incident."
      highlights={["Realtime health", "99.95% target uptime", "Incident history"]}
      sections={[
        { icon: Activity, title: "Realtime Health", description: "Live signals on every module, updated every 30 seconds." },
        { icon: Radar, title: "Regions", description: "Regional health for India, EU and North America." },
        { icon: BellRing, title: "Subscribe", description: "Get incident notifications by email, SMS or Slack." },
        { icon: ScrollText, title: "Post-mortems", description: "Detailed, blameless post-mortems on every major incident." },
        { icon: ShieldCheck, title: "Security Advisories", description: "Vulnerability disclosures and patching timelines." },
        { icon: Cloud, title: "Maintenance Windows", description: "Scheduled maintenance published two weeks in advance." },
      ]}
    >
      <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-medium text-emerald-300">All systems operational</span>
        </div>
        <div className="mt-6 divide-y divide-border/50">
          {services.map((s) => (
            <div key={s.name} className="flex items-center justify-between py-3 text-sm">
              <span className="text-foreground">{s.name}</span>
              <span className="text-emerald-300">{s.status}</span>
            </div>
          ))}
        </div>
      </div>
    </ResourcePage>
  );
}