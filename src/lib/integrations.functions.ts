/**
 * SENTINEL FORT — Multi-Socket Integrations Engine
 *
 * Provides real-time configuration, webhook generation, field mapping,
 * live traffic logs, and test payload simulators for Facebook Lead Ads,
 * generic website webhooks, WhatsApp Cloud API, Google Ads, Real Estate Portals,
 * and Voice Audio Sockets.
 */
import type {
  IntegrationSocketConfig,
  SocketTrafficLog,
  SocketType,
  InboundPayloadSimulationResult,
} from "./integrations.types";

export const INITIAL_SOCKET_CONFIGS: IntegrationSocketConfig[] = [
  {
    id: "facebook_lead_ads",
    name: "Meta Lead Ads Webhook Socket",
    category: "Social & Lead Ads",
    description: "Real-time webhook listener for Facebook & Instagram instant lead generation forms.",
    status: "active",
    enabled: true,
    endpointUrl: "https://app.assetsense.ai/api/public/webhooks/meta-leads",
    secretKey: "fb_sec_leadgen_88f92a10b",
    verifyToken: "sentinel_meta_leadgen_verify_tok_99x",
    appId: "982347812901842",
    pageId: "441298510293810",
    lastEventAt: "2 mins ago",
    totalEventsCount: 1428,
    successRate: 99.6,
    avgLatencyMs: 38,
    fieldMappings: {
      nameField: "full_name",
      phoneField: "phone_number",
      emailField: "email",
      requirementField: "property_type",
      budgetField: "budget_bracket",
      sourceField: "platform",
      campaignField: "campaign_name",
      notesField: "customer_message",
    },
  },
  {
    id: "inbound_webhook",
    name: "Website Inbound Multi-Hook",
    category: "Webhooks & API",
    description: "Universal JSON ingestion webhook for developer websites, landing pages, and custom forms.",
    status: "active",
    enabled: true,
    endpointUrl: "https://app.assetsense.ai/api/public/webhooks/inbound",
    secretKey: "sk_live_wh_sec_4f9a0c7e2b1",
    verifyToken: "wh_sig_v1_live_auth_62",
    lastEventAt: "5 mins ago",
    totalEventsCount: 3892,
    successRate: 100.0,
    avgLatencyMs: 24,
    fieldMappings: {
      nameField: "name",
      phoneField: "phone",
      emailField: "email",
      requirementField: "requirement",
      budgetField: "budget",
      sourceField: "source",
      campaignField: "campaign",
      notesField: "message",
    },
  },
  {
    id: "whatsapp_cloud",
    name: "WhatsApp Cloud Business API Socket",
    category: "Messaging & Chat",
    description: "Meta WhatsApp Business Cloud Webhook for two-way conversational lead capturing and notifications.",
    status: "connected",
    enabled: true,
    endpointUrl: "https://app.assetsense.ai/api/public/webhooks/whatsapp",
    secretKey: "waba_sec_token_991823",
    verifyToken: "waba_wh_verify_sentinel_2026",
    phoneNumberId: "+91 98700 12345",
    lastEventAt: "14 mins ago",
    totalEventsCount: 942,
    successRate: 99.2,
    avgLatencyMs: 45,
    fieldMappings: {
      nameField: "sender_name",
      phoneField: "from_number",
      emailField: "email",
      requirementField: "inquiry_text",
      budgetField: "budget",
      sourceField: "channel",
      campaignField: "ad_id",
      notesField: "message_body",
    },
  },
  {
    id: "google_ads",
    name: "Google Ads Lead Extension Socket",
    category: "Social & Lead Ads",
    description: "Webhook listener for Google Search, Performance Max, and YouTube lead capture forms.",
    status: "active",
    enabled: true,
    endpointUrl: "https://app.assetsense.ai/api/public/webhooks/google-leads",
    secretKey: "gads_wh_key_44391a",
    verifyToken: "gads_sig_verify_901",
    lastEventAt: "32 mins ago",
    totalEventsCount: 614,
    successRate: 99.8,
    avgLatencyMs: 32,
    fieldMappings: {
      nameField: "user_column_FULL_NAME",
      phoneField: "user_column_PHONE_NUMBER",
      emailField: "user_column_EMAIL",
      requirementField: "user_column_PROJECT",
      budgetField: "user_column_BUDGET",
      sourceField: "lead_source",
      campaignField: "campaign_id",
      notesField: "custom_questions",
    },
  },
  {
    id: "real_estate_portals",
    name: "MagicBricks / 99Acres Multi-Portal Socket",
    category: "Portals & MLS",
    description: "Real-time ingestion socket for MagicBricks, 99acres, and Housing.com verified buyer inquiries.",
    status: "active",
    enabled: true,
    endpointUrl: "https://app.assetsense.ai/api/public/webhooks/portals",
    secretKey: "portal_hub_sec_89271",
    verifyToken: "portal_auth_tok_881",
    lastEventAt: "48 mins ago",
    totalEventsCount: 2180,
    successRate: 98.9,
    avgLatencyMs: 54,
    fieldMappings: {
      nameField: "lead_name",
      phoneField: "contact_mobile",
      emailField: "contact_email",
      requirementField: "project_name",
      budgetField: "price_range",
      sourceField: "portal_name",
      campaignField: "listing_id",
      notesField: "query_details",
    },
  },
  {
    id: "voice_stream",
    name: "Twilio & Deepgram Voice Stream Socket",
    category: "Voice & Audio",
    description: "Ultra low-latency audio WebSocket stream for inbound & outbound autonomous AI calling orchestrator.",
    status: "connected",
    enabled: true,
    endpointUrl: "wss://app.assetsense.ai/api/public/sockets/voice-stream",
    secretKey: "stream_ws_tok_39108",
    verifyToken: "ws_voice_sign_887",
    lastEventAt: "8 mins ago",
    totalEventsCount: 785,
    successRate: 99.7,
    avgLatencyMs: 18,
    fieldMappings: {
      nameField: "caller_name",
      phoneField: "caller_number",
      emailField: "caller_email",
      requirementField: "discussed_property",
      budgetField: "budget_estimate",
      sourceField: "call_direction",
      campaignField: "call_campaign",
      notesField: "call_summary",
    },
  },
  {
    id: "automation_bridge",
    name: "Zapier / Make / n8n Multi-Bridge",
    category: "Automation",
    description: "Universal webhook bridge for triggering external automation workflows and receiving inbound triggers.",
    status: "active",
    enabled: true,
    endpointUrl: "https://app.assetsense.ai/api/public/webhooks/automation",
    secretKey: "zap_sec_bridge_1028",
    verifyToken: "make_wh_ver_481",
    lastEventAt: "1 hour ago",
    totalEventsCount: 1120,
    successRate: 100.0,
    avgLatencyMs: 28,
    fieldMappings: {
      nameField: "name",
      phoneField: "phone",
      emailField: "email",
      requirementField: "project",
      budgetField: "budget",
      sourceField: "source",
      campaignField: "campaign",
      notesField: "data",
    },
  },
];

export const INITIAL_TRAFFIC_LOGS: SocketTrafficLog[] = [
  {
    id: "log_10928",
    timestamp: "Just now",
    socketType: "facebook_lead_ads",
    socketName: "Meta Lead Ads Socket",
    method: "POST",
    endpoint: "/api/public/webhooks/meta-leads",
    statusCode: 200,
    latencyMs: 34,
    payloadPreview: JSON.stringify({
      leadgen_id: "lead_fb_882941",
      full_name: "Vikram Malhotra",
      phone_number: "+91 98201 88392",
      email: "vikram.m@zenithholdings.in",
      property_type: "The Grand Penthouse",
      budget_bracket: "₹7.5 Cr - ₹9 Cr",
      campaign_name: "Meta Luxury Flagship Q3",
    }),
    status: "VERIFIED",
    leadCreatedId: "lead_meta_01",
    leadName: "Vikram Malhotra",
    sourceDetails: "Facebook Instant Form (ID: 99182)",
  },
  {
    id: "log_10927",
    timestamp: "4 mins ago",
    socketType: "inbound_webhook",
    socketName: "Website Multi-Hook",
    method: "POST",
    endpoint: "/api/public/webhooks/inbound",
    statusCode: 200,
    latencyMs: 21,
    payloadPreview: JSON.stringify({
      name: "Natasha Roy",
      phone: "+91 97110 44291",
      email: "natasha@royinvestments.com",
      requirement: "Duplex Villa · Worli",
      budget: "₹12 Cr",
      source: "Landing Page Hero Form",
      message: "Looking for immediate site visit this Saturday.",
    }),
    status: "SUCCESS",
    leadCreatedId: "lead_wh_02",
    leadName: "Natasha Roy",
    sourceDetails: "assetsense.ai/landing-luxury",
  },
  {
    id: "log_10926",
    timestamp: "12 mins ago",
    socketType: "whatsapp_cloud",
    socketName: "WhatsApp Cloud API",
    method: "POST",
    endpoint: "/api/public/webhooks/whatsapp",
    statusCode: 200,
    latencyMs: 42,
    payloadPreview: JSON.stringify({
      sender_name: "Amit Singhania",
      from_number: "+91 98401 77123",
      message_body: "Hi, please send brochure and floor plans for Tower A 4BHK units.",
      inquiry_text: "4BHK Tower A",
      channel: "WhatsApp Inbound",
    }),
    status: "VERIFIED",
    leadCreatedId: "lead_wa_03",
    leadName: "Amit Singhania",
    sourceDetails: "WhatsApp Business Account #4410",
  },
  {
    id: "log_10925",
    timestamp: "28 mins ago",
    socketType: "voice_stream",
    socketName: "Voice Stream Socket",
    method: "WS",
    endpoint: "/api/public/sockets/voice-stream",
    statusCode: 200,
    latencyMs: 16,
    payloadPreview: JSON.stringify({
      caller_name: "Sameer Deshmukh",
      caller_number: "+91 99200 44109",
      call_duration: "142s",
      call_summary: "Interested in 3BHK sea view. Supreme Agent answered pricing queries and booked call back.",
      sentiment: "Positive (0.92)",
    }),
    status: "SUCCESS",
    leadCreatedId: "lead_vc_04",
    leadName: "Sameer Deshmukh",
    sourceDetails: "Deepgram Real-time Audio WebSocket",
  },
  {
    id: "log_10924",
    timestamp: "45 mins ago",
    socketType: "real_estate_portals",
    socketName: "MagicBricks Ingest",
    method: "POST",
    endpoint: "/api/public/webhooks/portals",
    statusCode: 200,
    latencyMs: 51,
    payloadPreview: JSON.stringify({
      portal_name: "MagicBricks Premium",
      lead_name: "Pooja Verma",
      contact_mobile: "+91 98112 39014",
      project_name: "Emerald Heights",
      price_range: "₹4.5 Cr - ₹5.5 Cr",
      query_details: "Verified Buyer badge. Pre-approved home loan with HDFC.",
    }),
    status: "VERIFIED",
    leadCreatedId: "lead_mb_05",
    leadName: "Pooja Verma",
    sourceDetails: "MagicBricks Real Estate Gateway",
  },
  {
    id: "log_10923",
    timestamp: "1 hour ago",
    socketType: "google_ads",
    socketName: "Google Ads Socket",
    method: "POST",
    endpoint: "/api/public/webhooks/google-leads",
    statusCode: 200,
    latencyMs: 29,
    payloadPreview: JSON.stringify({
      user_column_FULL_NAME: "Kavita Reddy",
      user_column_PHONE_NUMBER: "+91 99881 22345",
      user_column_EMAIL: "kavita.reddy@techcorp.io",
      user_column_PROJECT: "Skyline Residences",
      lead_source: "Google Search Ad: 'Luxury Apartments South Mumbai'",
    }),
    status: "SUCCESS",
    leadCreatedId: "lead_ga_06",
    leadName: "Kavita Reddy",
    sourceDetails: "Google Ads Webhook Extension",
  },
];

const STORAGE_SOCKETS_KEY = "sentinel_integration_sockets_v1";
const STORAGE_LOGS_KEY = "sentinel_socket_traffic_logs_v1";

export function loadStoredSockets(): IntegrationSocketConfig[] {
  if (typeof window === "undefined") return INITIAL_SOCKET_CONFIGS;
  try {
    const raw = localStorage.getItem(STORAGE_SOCKETS_KEY);
    if (!raw) return INITIAL_SOCKET_CONFIGS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (e) {
    console.warn("Failed to parse stored sockets:", e);
  }
  return INITIAL_SOCKET_CONFIGS;
}

export function saveStoredSockets(sockets: IntegrationSocketConfig[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_SOCKETS_KEY, JSON.stringify(sockets));
  } catch (e) {
    console.error("Failed to save sockets to storage:", e);
  }
}

export function loadStoredTrafficLogs(): SocketTrafficLog[] {
  if (typeof window === "undefined") return INITIAL_TRAFFIC_LOGS;
  try {
    const raw = localStorage.getItem(STORAGE_LOGS_KEY);
    if (!raw) return INITIAL_TRAFFIC_LOGS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (e) {
    console.warn("Failed to parse stored traffic logs:", e);
  }
  return INITIAL_TRAFFIC_LOGS;
}

export function saveStoredTrafficLogs(logs: SocketTrafficLog[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(logs.slice(0, 50)));
  } catch (e) {
    console.error("Failed to save logs to storage:", e);
  }
}

/**
 * Simulate dispatch of an inbound lead payload to any socket
 */
export function simulateInboundLead(
  socketId: SocketType,
  rawPayload: Record<string, any>,
  allSockets: IntegrationSocketConfig[],
  allLogs: SocketTrafficLog[]
): {
  updatedSockets: IntegrationSocketConfig[];
  updatedLogs: SocketTrafficLog[];
  result: InboundPayloadSimulationResult;
} {
  const socket = allSockets.find((s) => s.id === socketId) || allSockets[0];
  const maps = socket.fieldMappings;

  const leadName = rawPayload[maps.nameField] || rawPayload.name || rawPayload.fullName || "Prospective Client";
  const leadPhone = rawPayload[maps.phoneField] || rawPayload.phone || rawPayload.mobile || "+91 98000 00000";
  const leadEmail = rawPayload[maps.emailField] || rawPayload.email || "inquiry@client.com";
  const requirement = rawPayload[maps.requirementField] || rawPayload.requirement || rawPayload.property || "Luxury Residence";
  const budget = rawPayload[maps.budgetField] || rawPayload.budget || "₹5.0 Cr";
  const source = rawPayload[maps.sourceField] || socket.name;
  const campaign = rawPayload[maps.campaignField] || "Direct Inbound Socket";

  const newLogId = "log_" + Date.now().toString().slice(-6);
  const newLeadId = "lead_inbound_" + Math.random().toString(36).substring(2, 7);

  const logEntry: SocketTrafficLog = {
    id: newLogId,
    timestamp: "Just now",
    socketType: socket.id,
    socketName: socket.name,
    method: "POST",
    endpoint: socket.endpointUrl.replace("https://app.assetsense.ai", ""),
    statusCode: 200,
    latencyMs: Math.floor(Math.random() * 25) + 15,
    payloadPreview: JSON.stringify(rawPayload, null, 2),
    status: "SUCCESS",
    leadCreatedId: newLeadId,
    leadName,
    sourceDetails: `Direct Multi-Socket Ingestion (${socket.name})`,
  };

  const updatedSockets = allSockets.map((s) => {
    if (s.id === socket.id) {
      return {
        ...s,
        totalEventsCount: s.totalEventsCount + 1,
        lastEventAt: "Just now",
      };
    }
    return s;
  });

  const updatedLogs = [logEntry, ...allLogs];
  saveStoredSockets(updatedSockets);
  saveStoredTrafficLogs(updatedLogs);

  const result: InboundPayloadSimulationResult = {
    success: true,
    message: `Successfully ingested lead for "${leadName}" via ${socket.name}.`,
    socketId: socket.id,
    leadId: newLeadId,
    mappedLead: {
      name: leadName,
      phone: leadPhone,
      email: leadEmail,
      stage: "NEW",
      budget,
      requirement,
      source,
      campaign,
      assignedTo: "Supreme AI Agent",
    },
    logEntry,
  };

  return { updatedSockets, updatedLogs, result };
}

/**
 * Generate cURL snippet for any socket
 */
export function generateCurlSnippet(socket: IntegrationSocketConfig): string {
  const samplePayload: Record<string, string> = {
    [socket.fieldMappings.nameField]: "Aditya Singhal",
    [socket.fieldMappings.phoneField]: "+91 98210 99881",
    [socket.fieldMappings.emailField]: "aditya.singhal@investor.in",
    [socket.fieldMappings.requirementField]: "4BHK Seafront Luxury Penthouse",
    [socket.fieldMappings.budgetField]: "₹8.5 Cr",
    [socket.fieldMappings.sourceField]: "Website Landing Form",
    [socket.fieldMappings.campaignField]: "Q3 Flagship Luxury Campaign",
    [socket.fieldMappings.notesField]: "Client requested immediate callback from senior advisor.",
  };

  return `curl -X POST ${socket.endpointUrl} \\
  -H "Content-Type: application/json" \\
  -H "X-Sentinel-Secret: ${socket.secretKey}" \\
  -H "X-Verify-Token: ${socket.verifyToken}" \\
  -d '${JSON.stringify(samplePayload, null, 2)}'`;
}
