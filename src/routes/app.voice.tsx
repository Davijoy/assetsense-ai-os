import { createFileRoute } from "@tanstack/react-router";
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  Sparkles,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Volume2,
  Languages,
  Bot,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/app/voice")({
  head: () => ({ meta: [{ title: "AI Voice — Assetsense" }] }),
  component: VoiceDashboard,
});

const kpis = [
  { label: "Calls Today", value: "1,847", delta: "+24%", icon: PhoneCall },
  { label: "Avg. Handle Time", value: "3m 12s", delta: "-18%", icon: Clock },
  { label: "Qualification Rate", value: "62.4%", delta: "+9.1%", icon: CheckCircle2 },
  { label: "Active Agents", value: "12 / 16", delta: "live", icon: Bot },
];

const agents = [
  { name: "Aria", lang: "English · Hindi", calls: 342, qual: 68, status: "live", load: 78 },
  { name: "Veda", lang: "Hindi · Marathi", calls: 287, qual: 71, status: "live", load: 64 },
  { name: "Kabir", lang: "English · Tamil", calls: 251, qual: 59, status: "live", load: 52 },
  { name: "Ishaan", lang: "Telugu · English", calls: 198, qual: 64, status: "idle", load: 22 },
  { name: "Nyra", lang: "Kannada · English", calls: 174, qual: 66, status: "live", load: 41 },
];

const liveCalls = [
  { lead: "Rohan Sharma", project: "Lodha Park", agent: "Aria", dur: "02:41", intent: 94, sentiment: "positive" },
  { lead: "Priya Iyer", project: "Prestige Lakeside", agent: "Veda", dur: "01:18", intent: 71, sentiment: "neutral" },
  { lead: "Aakash Verma", project: "Sobha City", agent: "Kabir", dur: "04:02", intent: 88, sentiment: "positive" },
  { lead: "Sneha Rao", project: "Brigade Cornerstone", agent: "Nyra", dur: "00:46", intent: 42, sentiment: "negative" },
];

const transcript = [
  { who: "agent", text: "Hi Rohan, this is Aria from Assetsense. I see you enquired about Lodha Park — is now a good time?" },
  { who: "lead", text: "Yes, I have a couple of minutes. I'm specifically looking at 3 BHK units." },
  { who: "agent", text: "Got it. 3 BHKs at Lodha Park start at ₹4.2 Cr with a sea-view premium. Budget range you're comfortable with?" },
  { who: "lead", text: "Around 4.5 Cr, but timeline matters — I need possession within 6 months." },
  { who: "agent", text: "Tower B has ready-to-move 3 BHKs. Would Saturday 11 AM work for a site visit?", tag: "Site visit proposed" },
  { who: "lead", text: "Saturday works. Send the details over WhatsApp." },
];

const intents = [
  { label: "Site Visit", count: 412, pct: 34 },
  { label: "Pricing Info", count: 287, pct: 24 },
  { label: "Loan Assistance", count: 198, pct: 16 },
  { label: "Possession Date", count: 142, pct: 12 },
  { label: "Not Interested", count: 168, pct: 14 },
];

function VoiceDashboard() {
  const [playing, setPlaying] = useState(true);
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">AI Voice Operations</p>
          <h1 className="mt-2 font-display text-5xl">Live agent floor.</h1>
          <p className="mt-2 text-muted-foreground">12 AI agents handling inbound and outbound, in 11 languages.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Realtime · synced 2s ago
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, delta, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border bg-surface/40 p-5">
            <div className="flex items-center justify-between">
              <Icon className="h-4 w-4 text-primary" />
              <span className="text-[10px] uppercase tracking-wider text-primary">{delta}</span>
            </div>
            <div className="mt-4 font-display text-4xl">{value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl">Live call · Rohan Sharma</h2>
              <p className="text-xs text-muted-foreground">Lodha Park · Aria · 02:41 · English</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPlaying(!playing)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20"
              >
                {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {playing ? "Listening" : "Paused"}
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs">
                <Volume2 className="h-3 w-3" /> Whisper
              </button>
            </div>
          </div>

          {/* waveform */}
          <div className="mt-5 flex h-16 items-center gap-1 rounded-xl bg-background p-3">
            {Array.from({ length: 64 }).map((_, i) => {
              const h = 20 + Math.abs(Math.sin(i * 0.6)) * 70 + (i % 5) * 4;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-full bg-primary/60"
                  style={{ height: `${h}%`, opacity: playing ? 0.4 + (i % 7) / 10 : 0.2 }}
                />
              );
            })}
          </div>

          <div className="mt-6 space-y-3">
            {transcript.map((t, i) => (
              <div key={i} className={`flex gap-3 ${t.who === "agent" ? "" : "flex-row-reverse"}`}>
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] ${
                    t.who === "agent" ? "bg-primary/15 text-primary" : "bg-surface-elevated"
                  }`}
                >
                  {t.who === "agent" ? <Bot className="h-3.5 w-3.5" /> : "RS"}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  t.who === "agent" ? "bg-surface-elevated" : "bg-primary/10"
                }`}>
                  {t.text}
                  {t.tag && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-primary">
                      <Sparkles className="h-2.5 w-2.5" /> {t.tag}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5">
            <div className="rounded-lg bg-background p-3">
              <div className="text-[10px] uppercase text-muted-foreground">Intent</div>
              <div className="mt-1 font-display text-2xl text-primary">High · 94</div>
            </div>
            <div className="rounded-lg bg-background p-3">
              <div className="text-[10px] uppercase text-muted-foreground">Sentiment</div>
              <div className="mt-1 font-display text-2xl">Positive</div>
            </div>
            <div className="rounded-lg bg-background p-3">
              <div className="text-[10px] uppercase text-muted-foreground">Next Action</div>
              <div className="mt-1 text-sm">Schedule site visit · Sat 11 AM</div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface/30 p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">Intent Mix</h3>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-4 space-y-3">
              {intents.map((i) => (
                <div key={i.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span>{i.label}</span>
                    <span className="text-muted-foreground">{i.count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-glow"
                      style={{ width: `${i.pct * 2.5}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface/30 p-6">
            <h3 className="font-display text-xl">Languages live</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {["English", "Hindi", "Marathi", "Tamil", "Telugu", "Kannada", "Bengali", "Gujarati", "Punjabi", "Malayalam", "Odia"].map((l) => (
                <span key={l} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs">
                  <Languages className="h-3 w-3 text-primary" /> {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface/30">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h3 className="font-display text-2xl">Active calls</h3>
            <span className="text-xs text-muted-foreground">{liveCalls.length} in progress</span>
          </div>
          <div className="divide-y divide-border">
            {liveCalls.map((c) => (
              <div key={c.lead} className="flex items-center gap-4 p-4 text-sm">
                <PhoneIncoming className="h-4 w-4 text-primary" />
                <div className="flex-1">
                  <div className="font-medium">{c.lead}</div>
                  <div className="text-xs text-muted-foreground">{c.project} · {c.agent}</div>
                </div>
                <div className="text-xs tabular-nums text-muted-foreground">{c.dur}</div>
                <div className={`rounded-full px-2 py-0.5 text-[10px] ${
                  c.sentiment === "positive" ? "bg-primary/15 text-primary" :
                  c.sentiment === "negative" ? "bg-destructive/15 text-destructive" :
                  "bg-surface-elevated text-muted-foreground"
                }`}>
                  {c.sentiment}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <Sparkles className="h-3 w-3 text-primary" /> {c.intent}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface/30">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h3 className="font-display text-2xl">Agent roster</h3>
            <button className="text-xs text-primary hover:underline">Manage agents</button>
          </div>
          <div className="divide-y divide-border">
            {agents.map((a) => (
              <div key={a.name} className="flex items-center gap-4 p-4">
                <div className="relative">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-glow text-[10px] font-medium text-primary-foreground">
                    {a.name[0]}
                  </div>
                  <span className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background ${
                    a.status === "live" ? "bg-primary animate-pulse" : "bg-muted-foreground"
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="text-sm">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.lang}</div>
                </div>
                <div className="hidden sm:block w-28">
                  <div className="text-[10px] text-muted-foreground">Load</div>
                  <div className="mt-1 h-1 rounded-full bg-background">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${a.load}%` }} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular-nums">{a.calls}</div>
                  <div className="text-[10px] text-muted-foreground">{a.qual}% qual.</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}