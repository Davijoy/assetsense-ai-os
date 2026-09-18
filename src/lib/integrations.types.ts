/**
 * SENTINEL FORT — Integrations & Multi-Socket Data Models
 */

export type SocketType =
  | "facebook_lead_ads"
  | "inbound_webhook"
  | "whatsapp_cloud"
  | "google_ads"
  | "real_estate_portals"
  | "voice_stream"
  | "automation_bridge";

export type SocketStatus = "active" | "standby" | "connected" | "error" | "paused";

export interface FieldMappingConfig {
  nameField: string;
  phoneField: string;
  emailField: string;
  requirementField: string;
  budgetField: string;
  sourceField: string;
  campaignField: string;
  notesField: string;
}

export interface IntegrationSocketConfig {
  id: SocketType;
  name: string;
  category: "Social & Lead Ads" | "Webhooks & API" | "Messaging & Chat" | "Portals & MLS" | "Voice & Audio" | "Automation";
  description: string;
  status: SocketStatus;
  enabled: boolean;
  endpointUrl: string;
  secretKey: string;
  verifyToken: string;
  appId?: string;
  pageId?: string;
  phoneNumberId?: string;
  lastEventAt?: string;
  totalEventsCount: number;
  successRate: number;
  avgLatencyMs: number;
  fieldMappings: FieldMappingConfig;
}

export interface SocketTrafficLog {
  id: string;
  timestamp: string;
  socketType: SocketType;
  socketName: string;
  method: "POST" | "GET" | "WS" | "HOOK";
  endpoint: string;
  statusCode: number;
  latencyMs: number;
  payloadPreview: string;
  status: "SUCCESS" | "VERIFIED" | "SIMULATED" | "ERROR";
  leadCreatedId?: string;
  leadName?: string;
  sourceDetails?: string;
}

export interface InboundPayloadSimulationResult {
  success: boolean;
  message: string;
  socketId: SocketType;
  leadId?: string;
  mappedLead?: {
    name: string;
    phone: string;
    email: string;
    stage: string;
    budget: string;
    requirement: string;
    source: string;
    campaign: string;
    assignedTo: string;
  };
  logEntry: SocketTrafficLog;
}
