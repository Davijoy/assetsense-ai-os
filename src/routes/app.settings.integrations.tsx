import { createFileRoute, redirect } from "@tanstack/react-router";
import { isRouteAuthorized } from "@/lib/route-roles";
import { useState, useMemo } from "react";
import {
  Network,
  Webhook,
  Radio,
  Check,
  Copy,
  RefreshCw,
  Send,
  Terminal,
  Filter,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PhoneCall,
  MessageSquare,
  Globe2,
  Sparkles,
  Search,
  Sliders,
  Play,
  ArrowUpRight,
} from "lucide-react";
import {
  loadStoredSockets,
  saveStoredSockets,
  loadStoredTrafficLogs,
  saveStoredTrafficLogs,
  simulateInboundLead,
  generateCurlSnippet,
} from "@/lib/integrations.functions";
import type {
  IntegrationSocketConfig,
  SocketTrafficLog,
  SocketType,
  InboundPayloadSimulationResult,
} from "@/lib/integrations.types";

export const Route = createFileRoute("/app/settings/integrations")({
  head: () => ({ meta: [{ title: "Integrations & Sockets — Sentinel Fort Group" }] }),
  beforeLoad: async ({ context, location }) => {
    const roles = (context as any)?.user?.roles ?? (context as any)?.fort?.role?.appRoles ?? [];
    if (roles.length > 0 && !isRouteAuthorized(roles, location.pathname)) {
      throw redirect({ to: "/fort" });
    }
  },
  component: IntegrationsSettingsPage,
});

type Tab = "overview" | "meta" | "inbound" | "traffic";

function IntegrationsSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [sockets, setSockets] = useState<IntegrationSocketConfig[]>(() => loadStoredSockets());
  const [logs, setLogs] = useState<SocketTrafficLog[]>(() => loadStoredTrafficLogs());
  const [selectedSocketId, setSelectedSocketId] = useState<SocketType>("facebook_lead_ads");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Inbound Test Payload Runner State
  const [testPayloadText, setTestPayloadText] = useState<string>(() =>
    JSON.stringify(
      {
        name: "Website Test Lead",
        phone: "+91 90000 00000",
        email: "website-test@example.com",
        requirement: "2BHK Apartment",
        budget: "₹1 Cr - ₹1.5 Cr",
        source: "Website Inbound Test",
        campaign: "Sentinel Integration Test",
        message: "Controlled inbound webhook test payload.",
      },
      null,
      2
    )
  );
  const [simulationResult, setSimulationResult] = useState<InboundPayloadSimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Traffic Inspector Filter & Search
  const [filterSocket, setFilterSocket] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [inspectingLog, setInspectingLog] = useState<SocketTrafficLog | null>(null);

  const selectedSocket = useMemo(
    () => sockets.find((s) => s.id === selectedSocketId) || sockets[0],
    [sockets, selectedSocketId]
  );

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleSocket = (socketId: SocketType) => {
    const updated = sockets.map((s) => {
      if (s.id === socketId) {
        const nextEnabled = !s.enabled;
        return {
          ...s,
          enabled: nextEnabled,
          status: nextEnabled ? ("active" as const) : ("paused" as const),
        };
      }
      return s;
    });
    setSockets(updated);
    saveStoredSockets(updated);
  };

  const handleRegenerateSecret = (socketId: SocketType) => {
    const newSecret = "sk_live_wh_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4);
    const updated = sockets.map((s) => (s.id === socketId ? { ...s, secretKey: newSecret } : s));
    setSockets(updated);
    saveStoredSockets(updated);
  };

  const handleRunSimulation = () => {
    setSimulating(true);
    setSimulationResult(null);
    try {
      const parsed = JSON.parse(testPayloadText);
      const { updatedSockets, updatedLogs, result } = simulateInboundLead(
        selectedSocketId,
        parsed,
        sockets,
        logs
      );
      setSockets(updatedSockets);
      setLogs(updatedLogs);
      setSimulationResult(result);
    } catch (err: any) {
      alert("Invalid JSON payload. Please check your syntax: " + (err?.message || "JSON Error"));
    } finally {
      setSimulating(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSocket = filterSocket === "all" || log.socketType === filterSocket;
      const matchSearch =
        !searchQuery ||
        log.socketName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.payloadPreview.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.leadName && log.leadName.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSocket && matchSearch;
    });
  }, [logs, filterSocket, searchQuery]);

  const totalEvents = useMemo(() => sockets.reduce((acc, s) => acc + s.totalEventsCount, 0), [sockets]);
  const activeSocketsCount = useMemo(() => sockets.filter((s) => s.enabled).length, [sockets]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-border/70 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-gold uppercase">
              <Network className="h-3 w-3" /> Multi-Socket Ingestion Network
            </span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              All Sockets Operational
            </span>
          </div>
          <h1 className="mt-2 font-display text-3xl text-zinc-100">Integrations & Sockets</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Real-time webhook and multi-socket bridge for Facebook Lead Ads, website hooks, WhatsApp Cloud, Google Ads, and Portals.
          </p>
        </div>

        {/* Global Telemetry Card */}
        <div className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-[#121622]/80 p-3 px-4 shadow-lg backdrop-blur-md">
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Active Sockets</p>
            <p className="text-lg font-bold text-emerald-400 font-mono">{activeSocketsCount}/{sockets.length}</p>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Total Events</p>
            <p className="text-lg font-bold text-gold font-mono">{totalEvents.toLocaleString()}</p>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono">Avg Latency</p>
            <p className="text-lg font-bold text-zinc-200 font-mono">28ms</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-2">
        <TabButton
          active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
          icon={Network}
          label="Multi-Socket Topology"
          count={sockets.length}
        />
        <TabButton
          active={activeTab === "meta"}
          onClick={() => {
            setActiveTab("meta");
            setSelectedSocketId("facebook_lead_ads");
          }}
          icon={Radio}
          label="Facebook / Meta Lead Ads"
        />
        <TabButton
          active={activeTab === "inbound"}
          onClick={() => {
            setActiveTab("inbound");
            setSelectedSocketId("inbound_webhook");
          }}
          icon={Webhook}
          label="Website Hooks & Inbound API"
        />
        <TabButton
          active={activeTab === "traffic"}
          onClick={() => setActiveTab("traffic")}
          icon={Terminal}
          label="Live Traffic Inspector"
          count={logs.length}
        />
      </div>

      {/* TAB 1: Multi-Socket Topology */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sockets.map((socket) => (
              <SocketCard
                key={socket.id}
                socket={socket}
                onToggle={() => handleToggleSocket(socket.id)}
                onConfigure={() => {
                  setSelectedSocketId(socket.id);
                  if (socket.id === "facebook_lead_ads") setActiveTab("meta");
                  else if (socket.id === "inbound_webhook") setActiveTab("inbound");
                  else setActiveTab("inbound");
                }}
                copiedKey={copiedKey}
                onCopy={(text, key) => handleCopy(text, key)}
              />
            ))}
          </div>

          {/* Quick Inbound Ingestion Banner */}
          <section className="rounded-xl border border-gold/30 bg-gradient-to-r from-gold/10 via-[#141824] to-[#121622] p-6">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-gold" />
                  <h3 className="text-base font-semibold text-zinc-100">Universal Webhook Multi-Socket Ingestion</h3>
                </div>
                <p className="mt-1 text-sm text-zinc-400">
                  Send incoming buyer leads from any external form, website, or marketing landing page directly to your CRM with automatic field mapping.
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedSocketId("inbound_webhook");
                  setActiveTab("inbound");
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-xs font-semibold text-zinc-950 transition hover:bg-gold/90 shadow-glow"
              >
                Open Inbound API Studio <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: Facebook / Meta Lead Ads */}
      {activeTab === "meta" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-[#121622]/90 p-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                  <Radio className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-zinc-100">Meta / Facebook Lead Ads Webhook</h2>
                  <p className="text-xs text-zinc-400">
                    Direct integration for Meta Instant Forms, Instagram Ads, and Advantage+ Lead Gen campaigns.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedSocket.status === "connected" ||
                selectedSocket.status === "active" ? (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                    Connected & Listening
                  </span>
                ) : selectedSocket.status === "error" ? (
                  <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
                    Connection Error
                  </span>
                ) : selectedSocket.status === "paused" ? (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                    Paused
                  </span>
                ) : (
                  <span className="rounded-full border border-zinc-700 bg-zinc-800/70 px-3 py-1 text-xs font-medium text-zinc-300">
                    Not Connected
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-zinc-400 font-mono">
                    Webhook Callback URL
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={selectedSocket.endpointUrl}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-300"
                    />
                    <button
                      onClick={() => handleCopy(selectedSocket.endpointUrl, "meta_cb")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                    >
                      {copiedKey === "meta_cb" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Paste this in Meta App Dashboard → Webhooks → Page / Leadgen subscriptions.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-zinc-400 font-mono">
                    Webhook Verify Token
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={selectedSocket.verifyToken}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-300"
                    />
                    <button
                      onClick={() => handleCopy(selectedSocket.verifyToken, "meta_tok")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                    >
                      {copiedKey === "meta_tok" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-zinc-400 font-mono">
                      Meta App ID
                    </label>
                    <input
                      type="text"
                      defaultValue={selectedSocket.appId || ""}
                      className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-zinc-400 font-mono">
                      Page ID
                    </label>
                    <input
                      type="text"
                      defaultValue={selectedSocket.pageId || ""}
                      className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-300"
                    />
                  </div>
                </div>
              </div>

              {/* Meta Connection State */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gold font-mono">
                    Meta Lead Ads Connection
                  </h3>
                  <span className="text-[11px] text-zinc-500">
                    {selectedSocket.status === "connected" ||
                    selectedSocket.status === "active"
                      ? "Connected"
                      : "Not Connected"}
                  </span>
                </div>

                <p className="mt-2 text-xs text-zinc-400">
                  Connect an authorized Meta Page and Instant Form to begin receiving real Lead Ads events through Sentinel Fort.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 text-[11px]">
                  <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3">
                    <div className="text-zinc-500">Webhook endpoint</div>
                    <div className="mt-1 break-all font-mono text-zinc-200">
                      https://sentinel-fort.com/api/public/webhooks/meta-leads
                    </div>
                  </div>

                  <div className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3">
                    <div className="text-zinc-500">Connected Page</div>
                    <div className="mt-1 text-zinc-200">
                      {selectedSocket.pageId || "Not connected"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
                  Awaiting an authorized Meta Page connection. No simulated Meta lead is being generated.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Website Hooks & Inbound API */}
      {activeTab === "inbound" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-800 bg-[#121622]/90 p-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/20 text-gold">
                  <Webhook className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-zinc-100">{selectedSocket.name}</h2>
                  <p className="text-xs text-zinc-400">{selectedSocket.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedSocketId}
                  onChange={(e) => setSelectedSocketId(e.target.value as SocketType)}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200"
                >
                  {sockets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {/* Left Column: Endpoints & Security */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-zinc-400 font-mono">
                    Inbound Webhook Endpoint URL
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={selectedSocket.endpointUrl}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-300"
                    />
                    <button
                      onClick={() => handleCopy(selectedSocket.endpointUrl, "wh_url")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                    >
                      {copiedKey === "wh_url" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-zinc-400 font-mono">
                    Secret Key / Authorization Header (<code className="text-gold">X-Sentinel-Secret</code>)
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={selectedSocket.secretKey}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-mono text-zinc-300"
                    />
                    <button
                      onClick={() => handleCopy(selectedSocket.secretKey, "wh_sec")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
                    >
                      {copiedKey === "wh_sec" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      Copy
                    </button>
                    <button
                      onClick={() => handleRegenerateSecret(selectedSocket.id)}
                      title="Regenerate Secret Key"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-100"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Field Mappings Table */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gold font-mono">
                      Payload Field Mappings
                    </h4>
                    <span className="text-[11px] text-zinc-500">Incoming Key → CRM Field</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <FieldMapRow label="Client Name" value={selectedSocket.fieldMappings.nameField} />
                    <FieldMapRow label="Phone Number" value={selectedSocket.fieldMappings.phoneField} />
                    <FieldMapRow label="Email Address" value={selectedSocket.fieldMappings.emailField} />
                    <FieldMapRow label="Requirement" value={selectedSocket.fieldMappings.requirementField} />
                    <FieldMapRow label="Budget Bracket" value={selectedSocket.fieldMappings.budgetField} />
                    <FieldMapRow label="Traffic Source" value={selectedSocket.fieldMappings.sourceField} />
                  </div>
                </div>

                {/* cURL Command Generator */}
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
                      <Terminal className="h-3.5 w-3.5 text-gold" /> Ready-to-use cURL Snippet
                    </span>
                    <button
                      onClick={() => handleCopy(generateCurlSnippet(selectedSocket), "curl_cmd")}
                      className="inline-flex items-center gap-1 text-[11px] text-gold hover:underline"
                    >
                      {copiedKey === "curl_cmd" ? "Copied!" : "Copy cURL"}
                    </button>
                  </div>
                  <pre className="mt-2 overflow-x-auto rounded bg-black/80 p-3 text-[11px] font-mono text-emerald-400">
                    {generateCurlSnippet(selectedSocket)}
                  </pre>
                </div>
              </div>

              {/* Right Column: Live Inbound Payload Runner */}
              <div className="space-y-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gold font-mono">
                      Live Inbound Payload Tester
                    </h3>
                    <span className="text-[11px] text-zinc-500">JSON Editor</span>
                  </div>

                  <p className="mt-1.5 text-xs text-zinc-400">
                    Paste or edit a JSON payload to simulate an inbound webhook from your website form or landing page.
                  </p>

                  <textarea
                    rows={9}
                    value={testPayloadText}
                    onChange={(e) => setTestPayloadText(e.target.value)}
                    className="mt-3 w-full rounded-lg border border-zinc-800 bg-black/90 p-3 text-xs font-mono text-zinc-200 focus:border-gold focus:outline-none"
                  />

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={() =>
                        setTestPayloadText(
                          JSON.stringify(
                            {
                              name: "Natasha Roy",
                              phone: "+91 97110 44291",
                              email: "natasha@royinvestments.com",
                              requirement: "Duplex Villa · Worli",
                              budget: "₹12 Cr",
                              source: "Landing Page Hero Form",
                              message: "Looking for immediate site visit this Saturday.",
                            },
                            null,
                            2
                          )
                        )
                      }
                      className="text-[11px] text-zinc-400 hover:text-zinc-200"
                    >
                      Reset to Sample
                    </button>

                    <button
                      onClick={handleRunSimulation}
                      disabled={simulating}
                      className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-gold/90 disabled:opacity-50 shadow-glow"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {simulating ? "Processing…" : "Dispatch Inbound Webhook"}
                    </button>
                  </div>

                  {simulationResult && (
                    <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs">
                      <div className="flex items-center gap-2 font-medium text-emerald-300">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        {simulationResult.message}
                      </div>

                      {simulationResult.mappedLead && (
                        <div className="mt-2.5 grid grid-cols-2 gap-2 rounded bg-black/40 p-2.5 text-[11px] text-zinc-300">
                          <div>Lead ID: <span className="font-mono text-gold">{simulationResult.leadId}</span></div>
                          <div>Stage: <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-300">NEW</span></div>
                          <div>Name: <span className="font-semibold text-white">{simulationResult.mappedLead.name}</span></div>
                          <div>Phone: <span className="font-semibold text-white">{simulationResult.mappedLead.phone}</span></div>
                          <div>Requirement: <span className="font-semibold text-white">{simulationResult.mappedLead.requirement}</span></div>
                          <div>Assigned: <span className="font-semibold text-gold">{simulationResult.mappedLead.assignedTo}</span></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Live Traffic Inspector */}
      {activeTab === "traffic" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-[#121622]/90 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search socket traffic logs by payload, client name, or endpoint…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-zinc-500" />
                <select
                  value={filterSocket}
                  onChange={(e) => setFilterSocket(e.target.value)}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300"
                >
                  <option value="all">All Sockets</option>
                  <option value="facebook_lead_ads">Meta Lead Ads</option>
                  <option value="inbound_webhook">Website Inbound</option>
                  <option value="whatsapp_cloud">WhatsApp Cloud</option>
                  <option value="google_ads">Google Ads</option>
                  <option value="real_estate_portals">Portals</option>
                  <option value="voice_stream">Voice Audio Stream</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const samplePayload = {
                    name: "Automated Ping Client",
                    phone: "+91 98000 11223",
                    email: "ping@client.com",
                    source: "Synthetic Event",
                  };
                  const { updatedSockets, updatedLogs } = simulateInboundLead(
                    "inbound_webhook",
                    samplePayload,
                    sockets,
                    logs
                  );
                  setSockets(updatedSockets);
                  setLogs(updatedLogs);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-semibold text-gold hover:bg-gold/20"
              >
                <Sparkles className="h-3.5 w-3.5" /> Emit Test Event
              </button>

              <button
                onClick={() => {
                  setLogs([]);
                  saveStoredTrafficLogs([]);
                }}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Clear Logs
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#121622]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-950/60 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Socket</th>
                  <th className="px-4 py-3">Method & Path</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Latency</th>
                  <th className="px-4 py-3">Captured Lead</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">
                      No socket traffic logs found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-3 font-mono text-zinc-400">{log.timestamp}</td>
                      <td className="px-4 py-3 font-medium text-zinc-200">{log.socketName}</td>
                      <td className="px-4 py-3 font-mono text-zinc-400">
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300 font-bold mr-1.5">
                          {log.method}
                        </span>
                        {log.endpoint}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> {log.statusCode} OK
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-400">{log.latencyMs}ms</td>
                      <td className="px-4 py-3">
                        {log.leadName ? (
                          <span className="font-semibold text-zinc-200">{log.leadName}</span>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setInspectingLog(log)}
                          className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-700"
                        >
                          Inspect Payload
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Payload Modal */}
      {inspectingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-zinc-700 bg-[#121622] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">
                  Socket Event Payload: {inspectingLog.socketName}
                </h3>
                <p className="font-mono text-xs text-zinc-400">
                  {inspectingLog.method} {inspectingLog.endpoint} · {inspectingLog.timestamp} · {inspectingLog.latencyMs}ms
                </p>
              </div>
              <button
                onClick={() => setInspectingLog(null)}
                className="rounded-lg border border-zinc-700 p-1 text-zinc-400 hover:text-zinc-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gold font-mono">
                  Raw Ingested JSON Body
                </label>
                <pre className="mt-1.5 max-h-60 overflow-y-auto rounded-lg border border-zinc-800 bg-black/90 p-4 text-xs font-mono text-emerald-400">
                  {inspectingLog.payloadPreview}
                </pre>
              </div>

              {inspectingLog.leadName && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs">
                  <span className="text-zinc-400">Created CRM Lead: </span>
                  <span className="font-semibold text-zinc-100">{inspectingLog.leadName}</span>
                  <span className="ml-3 text-zinc-500 font-mono">({inspectingLog.leadCreatedId})</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setInspectingLog(null)}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition ${
        active
          ? "bg-zinc-800 text-gold shadow-sm"
          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count !== undefined && (
        <span className="rounded-full bg-zinc-700 px-1.5 py-0.2 text-[10px] text-zinc-200 font-mono">
          {count}
        </span>
      )}
    </button>
  );
}

function SocketCard({
  socket,
  onToggle,
  onConfigure,
  copiedKey,
  onCopy,
}: {
  socket: IntegrationSocketConfig;
  onToggle: () => void;
  onConfigure: () => void;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const getIcon = (type: SocketType) => {
    switch (type) {
      case "facebook_lead_ads":
        return Radio;
      case "inbound_webhook":
        return Webhook;
      case "whatsapp_cloud":
        return MessageSquare;
      case "voice_stream":
        return PhoneCall;
      case "google_ads":
        return Globe2;
      case "real_estate_portals":
        return Network;
      default:
        return Webhook;
    }
  };
  const Icon = getIcon(socket.id);

  return (
    <div className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-[#121622] p-5 transition hover:border-zinc-700">
      <div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800 text-gold">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-100">{socket.name}</h3>
              <p className="text-[11px] text-zinc-500 font-mono">{socket.category}</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className={`h-5 w-9 rounded-full transition-colors p-0.5 ${
              socket.enabled ? "bg-emerald-500" : "bg-zinc-700"
            }`}
          >
            <div
              className={`h-4 w-4 rounded-full bg-white transition-transform ${
                socket.enabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <p className="mt-3 text-xs text-zinc-400 line-clamp-2">{socket.description}</p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-zinc-950/60 p-2.5 text-[11px]">
          <div>
            <span className="text-zinc-500">24h Ingested: </span>
            <span className="font-mono font-semibold text-zinc-200">{socket.totalEventsCount}</span>
          </div>
          <div>
            <span className="text-zinc-500">Latency: </span>
            <span className="font-mono font-semibold text-emerald-400">{socket.avgLatencyMs}ms</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3">
        <button
          onClick={() => onCopy(socket.endpointUrl, `card_${socket.id}`)}
          className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200"
        >
          {copiedKey === `card_${socket.id}` ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          Copy URL
        </button>

        <button
          onClick={onConfigure}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-gold hover:underline"
        >
          Configure Socket →
        </button>
      </div>
    </div>
  );
}

function FieldMapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded border border-zinc-800/80 bg-zinc-900/60 px-2.5 py-1.5">
      <span className="text-zinc-400">{label}</span>
      <code className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-gold font-mono">{value}</code>
    </div>
  );
}
