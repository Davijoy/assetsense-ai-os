import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireRoles } from "@/integrations/supabase/role-middleware";

export type CRMKpiSnapshot = {
  totalInputLeads: number;
  activeLeads: number;
  conversionRatePct: number;
  outflowLeads: number;
  notQualifiedLeads: number;
  convertedLeads: number;
  averageFirstResponseSeconds: number;
  averageResponseSeconds: number; // Backwards-compatible alias
  pipelineValueInr: number;
  totalLeads: number; // Backwards-compatible alias
  qualifiedLeads: number;
  siteVisitsScheduled: number;
  bookedLeads: number;
};

export type FollowUpStatus = "pending" | "completed" | "rescheduled" | "overdue";

export type FollowUpHistoryEntry = {
  scheduledDate: string;
  scheduledTime: string;
  status: string;
  notes?: string | null;
  updatedAt: string;
  reason?: string | null;
};

export type LiveLead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  stage: string;
  score: number;
  budget: string;
  budgetInr: number | null;
  project: string | null;
  owner: string | null;
  ownerName?: string | null;
  assignedToId?: string | null;
  assignedAt?: string | null;
  assignedBy?: string | null;
  city?: string | null;
  createdAt?: string;
  lastActivityAgo?: string;
  siteVisitDate?: string | null;
  siteVisitTime?: string | null;
  subStatus?: string | null;
  followUpDate?: string | null;
  followUpTime?: string | null;
  followUpStatus?: FollowUpStatus | null;
  followUpNotes?: string | null;
  followUpHistory?: FollowUpHistoryEntry[] | null;
};

export type LeadActivityItem = {
  id: string;
  leadId: string;
  type: string;
  subject: string;
  description: string | null;
  performedBy: string;
  createdAt: string;
  exactTimestamp: string;
  timeAgo: string;
  metadata?: Record<string, any> | null;
};

export type TeamMember = {
  id: string;
  name: string;
  initials: string;
  role: string;
  email?: string;
  status?: string;
  avatarUrl?: string | null;
};

export type AssignmentHistoryItem = {
  id: string;
  leadId: string;
  action: string;
  previousAssignee: string | null;
  newAssignee: string | null;
  performedBy: string;
  timestamp: string;
  timeAgo: string;
  notes?: string | null;
};

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  { id: "AM", name: "Aarav Mehta", initials: "AM", role: "Sales Director", email: "aarav.mehta@sentinelfort.com", status: "active" },
  { id: "SS", name: "Siddharth Sharma", initials: "SS", role: "Senior Closer", email: "siddharth.sharma@sentinelfort.com", status: "active" },
  { id: "RK", name: "Riya Kapoor", initials: "RK", role: "Relationship Manager", email: "riya.kapoor@sentinelfort.com", status: "active" },
  { id: "AI", name: "Supreme AI Agent", initials: "AI", role: "Autonomous Qualifier", email: "supreme.ai@sentinelfort.com", status: "active" },
];

export const INITIAL_LEADS: LiveLead[] = [
  {
    id: "lead-1",
    name: "Riya Kapoor",
    project: "Lodha Belmondo",
    budget: "₹1.6 Cr",
    budgetInr: 16000000,
    score: 88,
    source: "Meta Ads",
    stage: "New",
    owner: "AM",
    ownerName: "Aarav Mehta",
    email: "riya.kapoor@gmail.com",
    phone: "+919820123456",
    createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    lastActivityAgo: "4m",
    followUpDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split("T")[0],
    followUpTime: "11:30",
    followUpStatus: "pending",
    followUpNotes: "Introductory discovery call on floor plan options",
  },
  {
    id: "lead-2",
    name: "Vikram Joshi",
    project: "Oberoi Sky City",
    budget: "₹3.2 Cr",
    budgetInr: 32000000,
    score: 74,
    source: "Website",
    stage: "Call Back",
    owner: null,
    ownerName: "Unassigned",
    email: "vikram.joshi@gmail.com",
    phone: "+919820234567",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    lastActivityAgo: "5h",
    followUpDate: new Date().toISOString().split("T")[0],
    followUpTime: "15:00",
    followUpStatus: "pending",
    followUpNotes: "Customer requested callback after office hours",
  },
  {
    id: "lead-3",
    name: "Neha Sharma",
    project: "Prestige Lakeside",
    budget: "₹2.1 Cr",
    budgetInr: 21000000,
    score: 91,
    source: "Referral",
    stage: "New",
    owner: "AM",
    ownerName: "Aarav Mehta",
    email: "neha.sharma@gmail.com",
    phone: "+919820345678",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    lastActivityAgo: "30m",
    followUpDate: new Date().toISOString().split("T")[0],
    followUpTime: "17:00",
    followUpStatus: "pending",
    followUpNotes: "First discovery touchpoint on budget & unit preferences",
  },
  {
    id: "lead-4",
    name: "Arjun Patel",
    project: "Lodha Belmondo",
    budget: "₹1.9 Cr",
    budgetInr: 19000000,
    score: 94,
    source: "AI Voice",
    stage: "Qualified",
    owner: null,
    ownerName: "Unassigned",
    email: "arjun.patel@gmail.com",
    phone: "+919820456789",
    createdAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    lastActivityAgo: "2m",
    followUpDate: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString().split("T")[0],
    followUpTime: "14:00",
    followUpStatus: "pending",
    followUpNotes: "Financial pre-approval documentation review",
  },
  {
    id: "lead-5",
    name: "Pooja Nair",
    project: "Oberoi Sky City",
    budget: "₹3.5 Cr",
    budgetInr: 35000000,
    score: 89,
    source: "Google",
    stage: "Qualified",
    owner: "RK",
    ownerName: "Riya Kapoor",
    email: "pooja.nair@gmail.com",
    phone: "+919820567890",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    lastActivityAgo: "3h",
    followUpDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split("T")[0],
    followUpTime: "10:30",
    followUpStatus: "pending",
    followUpNotes: "Review luxury 3BHK deck and master floor plan",
  },
  {
    id: "lead-6",
    name: "Karan Mehta",
    project: "Prestige Lakeside",
    budget: "₹2.4 Cr",
    budgetInr: 24000000,
    score: 82,
    source: "Channel Partner",
    stage: "Site Visit Scheduled",
    siteVisitDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().split("T")[0],
    siteVisitTime: "11:00",
    owner: null,
    ownerName: "Unassigned",
    email: "karan.mehta@gmail.com",
    phone: "+919820678901",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    lastActivityAgo: "1h",
    followUpDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().split("T")[0],
    followUpTime: "11:00",
    followUpStatus: "pending",
    followUpNotes: "Site walkthrough at Prestige Lakeside",
  },
  {
    id: "lead-7",
    name: "Aditi Verma",
    project: "Lodha Belmondo",
    budget: "₹1.85 Cr",
    budgetInr: 18500000,
    score: 78,
    source: "Walk-in",
    stage: "Site Visit Scheduled",
    siteVisitDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split("T")[0],
    siteVisitTime: "16:00",
    owner: "AM",
    ownerName: "Aarav Mehta",
    email: "aditi.verma@gmail.com",
    phone: "+919820789012",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    lastActivityAgo: "2h",
    followUpDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString().split("T")[0],
    followUpTime: "16:00",
    followUpStatus: "pending",
    followUpNotes: "Site visit appointment at Lodha Belmondo",
  },
  {
    id: "lead-8",
    name: "Rohan Desai",
    project: "Oberoi Sky City",
    budget: "₹3.1 Cr",
    budgetInr: 31000000,
    score: 92,
    source: "Referral",
    stage: "RFR (Ready for Registration)",
    owner: "RK",
    ownerName: "Riya Kapoor",
    email: "rohan.desai@gmail.com",
    phone: "+919820890123",
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    lastActivityAgo: "20m",
    followUpDate: new Date().toISOString().split("T")[0],
    followUpTime: "18:00",
    followUpStatus: "pending",
    followUpNotes: "Unit registration & agreement signing follow-up",
  },
  {
    id: "lead-9",
    name: "Meera Iyer",
    project: "Prestige Lakeside",
    budget: "₹2.2 Cr",
    budgetInr: 22000000,
    score: 96,
    source: "AI Voice",
    stage: "Booked",
    owner: "AI",
    ownerName: "Supreme AI Agent",
    email: "meera.iyer@gmail.com",
    phone: "+919820901234",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    lastActivityAgo: "1h",
    followUpDate: null,
    followUpTime: null,
    followUpStatus: "completed",
    followUpNotes: "Booking confirmed & token payment received",
  },
  {
    id: "lead-10",
    name: "Sahil Khan",
    project: "Lodha Belmondo",
    budget: "₹1.95 Cr",
    budgetInr: 19500000,
    score: 90,
    source: "Meta Ads",
    stage: "Booked",
    owner: "SS",
    ownerName: "Siddharth Sharma",
    email: "sahil.khan@gmail.com",
    phone: "+919820912345",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    lastActivityAgo: "3h",
    followUpDate: null,
    followUpTime: null,
    followUpStatus: "completed",
    followUpNotes: "Agreement for sale executed",
  },
  {
    id: "lead-11",
    name: "Devendra Singhal",
    project: "Oberoi Sky City",
    budget: "₹2.8 Cr",
    budgetInr: 28000000,
    score: 45,
    source: "Website",
    stage: "Not Interested",
    owner: "AM",
    ownerName: "Aarav Mehta",
    email: "devendra.singhal@gmail.com",
    phone: "+919820923456",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    lastActivityAgo: "1d ago",
    followUpDate: null,
    followUpTime: null,
    followUpStatus: "completed",
    followUpNotes: "Budget mismatch — archived",
  },
  {
    id: "lead-12",
    name: "Sunita Rao",
    project: "Prestige Falcon",
    budget: "₹1.4 Cr",
    budgetInr: 14000000,
    score: 38,
    source: "Meta Ads",
    stage: "Dropped Plan",
    owner: "RK",
    ownerName: "Riya Kapoor",
    email: "sunita.rao@gmail.com",
    phone: "+919820934567",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    lastActivityAgo: "1d ago",
    followUpDate: null,
    followUpTime: null,
    followUpStatus: "completed",
    followUpNotes: "Purchase deferred to next fiscal year",
  },
];

export function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function formatExactTimestamp(isoString: string | null | undefined): {
  exact: string;
  timeAgo: string;
  date: string;
  time: string;
} {
  if (!isoString) {
    return { exact: "N/A", timeAgo: "Just now", date: "N/A", time: "N/A" };
  }
  const d = new Date(isoString);
  if (isNaN(d.getTime())) {
    return { exact: String(isoString), timeAgo: "Recently", date: "", time: "" };
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(d.getDate()).padStart(2, "0");
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, "0");

  const exact = `${day} ${month} ${year} — ${formattedHours}:${minutes} ${ampm}`;
  const date = `${day} ${month} ${year}`;
  const time = `${formattedHours}:${minutes} ${ampm}`;
  const timeAgo = formatTimeAgo(isoString);

  return { exact, timeAgo, date, time };
}

export function resolvePerformerName(raw?: string | null, profileMap?: Map<string, string>): string {
  if (!raw) return "Platform Administrator";
  if (profileMap && profileMap.has(raw)) return profileMap.get(raw)!;
  if (raw === "AM" || raw === "Aarav Mehta") return "Aarav Mehta";
  if (raw === "SS" || raw === "Siddharth Sharma") return "Siddharth Sharma";
  if (raw === "RK" || raw === "Riya Kapoor") return "Riya Kapoor";
  if (raw === "AI" || raw === "Supreme AI Agent") return "Supreme AI Agent";
  if (raw === "Sentinel Gateway" || raw === "Sentinel Inbound Gateway") return raw;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return "Platform Administrator";
  }
  return raw;
}

export function formatBudgetInr(budgetInr: number | null): string {
  if (!budgetInr) return "₹0";
  if (budgetInr >= 10000000) {
    const cr = (budgetInr / 10000000).toFixed(2).replace(/\.?0+$/, "");
    return `₹${cr} Cr`;
  }
  if (budgetInr >= 100000) {
    const l = (budgetInr / 100000).toFixed(2).replace(/\.?0+$/, "");
    return `₹${l} L`;
  }
  return `₹${budgetInr.toLocaleString("en-IN")}`;
}

const bookedStages = new Set(["booked", "closed", "won", "converted"]);
const notQualifiedStages = new Set([
  "not interested",
  "not_interested",
  "dropped plan",
  "dropped_plan",
  "dropped",
  "lost",
]);
const outflowStages = new Set([...bookedStages, ...notQualifiedStages]);

/**
 * Pure calculation helper for CRM KPI Snapshots.
 */
export function calculateCRMKpiSnapshot(
  leads: Array<{ id: string; budget_inr: number | null; created_at: string | null; stage: string | null }>,
  properties: Array<{ price_inr: number | null }> = [],
  calls: Array<{ lead_id: string | null; created_at: string | null }> = [],
  activities: Array<{ related_to_id: string | null; created_at: string | null; activity_type: string | null }> = []
): CRMKpiSnapshot {
  const totalInputLeads = leads.length;

  const pipelineValueInr =
    leads.reduce((sum, lead) => sum + Number(lead.budget_inr ?? 0), 0) +
    properties.reduce((sum, property) => sum + Number(property.price_inr ?? 0), 0);

  const activeLeads = leads.filter((lead) => {
    const stage = (lead.stage ?? "").toLowerCase().trim();
    return !outflowStages.has(stage);
  }).length;

  const convertedLeads = leads.filter((lead) => {
    const stage = (lead.stage ?? "").toLowerCase().trim();
    return bookedStages.has(stage);
  }).length;

  const notQualifiedLeads = leads.filter((lead) => {
    const stage = (lead.stage ?? "").toLowerCase().trim();
    return notQualifiedStages.has(stage);
  }).length;

  const outflowLeads = convertedLeads + notQualifiedLeads;

  const qualifiedLeads = leads.filter((lead) => {
    const stage = (lead.stage ?? "").toLowerCase().trim();
    return stage === "qualified" || stage === "visit" || stage.includes("visit") || stage === "negotiation" || stage === "rfr" || bookedStages.has(stage);
  }).length;

  const siteVisitsScheduled = leads.filter((lead) => {
    const stage = (lead.stage ?? "").toLowerCase().trim();
    return stage === "visit" || stage.includes("visit") || stage === "site_visit_scheduled";
  }).length;

  const conversionRatePct = totalInputLeads > 0 ? (convertedLeads / totalInputLeads) * 100 : 0;

  // Average First Response Time: elapsed seconds between lead.created_at and earliest sales touch (call or activity)
  const responseTimes = leads
    .map((lead) => {
      const leadCreatedAt = lead.created_at ? new Date(lead.created_at).getTime() : null;
      if (!leadCreatedAt) return null;

      const firstCall = calls.find((c) => c.lead_id === lead.id);
      const callTime = firstCall?.created_at ? new Date(firstCall.created_at).getTime() : null;

      const firstActivity = activities.find((a) => a.related_to_id === lead.id && a.activity_type !== "lead_created");
      const actTime = firstActivity?.created_at ? new Date(firstActivity.created_at).getTime() : null;

      const touchTimes = [callTime, actTime].filter((t): t is number => typeof t === "number" && t >= leadCreatedAt);
      if (touchTimes.length === 0) return null;

      const earliestTouch = Math.min(...touchTimes);
      return Math.max(0, Math.round((earliestTouch - leadCreatedAt) / 1000));
    })
    .filter((value): value is number => typeof value === "number");

  const averageFirstResponseSeconds = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
    : 0;

  return {
    totalInputLeads,
    activeLeads,
    conversionRatePct,
    outflowLeads,
    notQualifiedLeads,
    convertedLeads,
    averageFirstResponseSeconds,
    averageResponseSeconds: averageFirstResponseSeconds,
    pipelineValueInr,
    totalLeads: totalInputLeads,
    qualifiedLeads,
    siteVisitsScheduled,
    bookedLeads: convertedLeads,
  };
}

export const getCRMKPIs = createServerFn({ method: "GET" })
  .middleware([requireRoles(["admin", "manager", "agent", "viewer", "builder", "developer"])])
  .handler(async ({ context }): Promise<CRMKpiSnapshot> => {
    const { supabase, userId, roles } = context as {
      supabase: any;
      userId: string;
      roles?: string[];
    };

    const isSalesExecutive =
      roles?.includes("agent") &&
      !roles?.includes("admin") &&
      !roles?.includes("manager");

    let leadsQuery = supabase
      .from("leads")
      .select("id, budget_inr, created_at, stage, assigned_to");
    let callsQuery = supabase
      .from("calls")
      .select("lead_id, created_at")
      .order("created_at", { ascending: true });
    let activitiesQuery = supabase
      .from("activities")
      .select("related_to_id, created_at, activity_type")
      .eq("related_to_type", "lead")
      .order("created_at", { ascending: true });

    if (isSalesExecutive) {
      leadsQuery = leadsQuery.eq("assigned_to", userId);
    }

    const [leadsResult, propertiesResult, callsResult, activitiesResult] = await Promise.all([
      leadsQuery,
      supabase.from("properties").select("price_inr").eq("is_draft", false),
      callsQuery,
      activitiesQuery,
    ]);

    if (leadsResult.error) {
      throw new Error(leadsResult.error.message);
    }
    if (propertiesResult.error) {
      throw new Error(propertiesResult.error.message);
    }
    if (callsResult.error) {
      throw new Error(callsResult.error.message);
    }

    let leads = (leadsResult.data ?? []) as Array<{
      id: string;
      budget_inr: number | null;
      created_at: string | null;
      stage: string | null;
      assigned_to?: string | null;
    }>;

    // Defense-in-depth: enforce assigned_to filter in application layer for Sales Executives
    if (isSalesExecutive) {
      leads = leads.filter((l) => l.assigned_to === userId);
    }

    const assignedLeadIds = new Set(leads.map((l) => l.id));

    let calls = (callsResult.data ?? []) as Array<{ lead_id: string | null; created_at: string | null }>;
    let activities = (activitiesResult.data ?? []) as Array<{ related_to_id: string | null; created_at: string | null; activity_type: string | null }>;

    if (isSalesExecutive) {
      calls = calls.filter((c) => c.lead_id && assignedLeadIds.has(c.lead_id));
      activities = activities.filter((a) => a.related_to_id && assignedLeadIds.has(a.related_to_id));
    }

    const properties = isSalesExecutive
      ? []
      : ((propertiesResult.data ?? []) as Array<{ price_inr: number | null }>);

    return calculateCRMKpiSnapshot(leads, properties, calls, activities);
  });

/**
 * Pure mapping helper that transforms database rows to LiveLead format.
 * Returns empty array [] when input rows is empty.
 */
export function mapDatabaseRowsToLiveLeads(
  leadRows: any[],
  activities: any[] = [],
  profiles: any[] = []
): LiveLead[] {
  if (!Array.isArray(leadRows) || leadRows.length === 0) {
    return [];
  }

  const profileMap = new Map<string, string>();
  for (const p of profiles) {
    profileMap.set(p.id, p.full_name || p.email?.split("@")[0] || "Platform Administrator");
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

  return leadRows.map((r) => {
    const stageRaw = (r.stage ?? "new").toLowerCase().trim();
    const stage = stageRaw === "new" ? "New"
      : stageRaw === "qualified" ? "Qualified"
      : stageRaw === "call_back" || stageRaw === "call back" ? "Call Back"
      : stageRaw === "rnr" || stageRaw.includes("ringing") ? "RNR (Ringing Not Responded)"
      : stageRaw === "busy" ? "Busy"
      : stageRaw === "switch_off" || stageRaw === "switch off" ? "Switch Off"
      : stageRaw === "not_interested" || stageRaw === "not interested" ? "Not Interested"
      : stageRaw === "dropped_plan" || stageRaw === "dropped plan" ? "Dropped Plan"
      : stageRaw === "rfr" || stageRaw.includes("registration") ? "RFR (Ready for Registration)"
      : stageRaw === "visit" || stageRaw.includes("site visit") || stageRaw === "site_visit_scheduled" ? "Site Visit Scheduled"
      : stageRaw === "negotiation" ? "Negotiation"
      : stageRaw === "booked" || stageRaw === "won" ? "Booked"
      : "New";

    const leadActs = activities.filter((a) => a.related_to_id === r.id);
    const lastAct = leadActs[0];
    const ownerName = r.assigned_to
      ? resolvePerformerName(r.assigned_to, profileMap)
      : r.owner
        ? resolvePerformerName(r.owner, profileMap)
        : "Unassigned";

    const normalizeDbTime = (value: unknown): string | undefined =>
      typeof value === "string" && value.trim()
        ? value.trim().slice(0, 5)
        : undefined;

    let followUpDate: string | undefined =
      typeof r.follow_up_date === "string" && r.follow_up_date
        ? r.follow_up_date
        : undefined;
    let followUpTime: string | undefined = normalizeDbTime(r.follow_up_time);
    let followUpStatus:
      | "pending"
      | "completed"
      | "rescheduled"
      | "overdue"
      | undefined =
      ["pending", "completed", "rescheduled", "overdue"].includes(
        String(r.follow_up_status ?? ""),
      )
        ? r.follow_up_status
        : undefined;
    let followUpNotes: string | undefined =
      typeof r.follow_up_notes === "string" && r.follow_up_notes
        ? r.follow_up_notes
        : undefined;

    let siteVisitDate: string | undefined =
      typeof r.site_visit_date === "string" && r.site_visit_date
        ? r.site_visit_date
        : undefined;
    let siteVisitTime: string | undefined = normalizeDbTime(r.site_visit_time);

    if (stage === "Call Back" && !followUpDate) {
      followUpDate = todayStr;
      followUpTime = followUpTime || "15:00";
      followUpStatus = followUpStatus || "pending";
      followUpNotes = followUpNotes || "Scheduled call back request from lead.";
    } else if (stage === "RNR (Ringing Not Responded)" && !followUpDate) {
      followUpDate = todayStr;
      followUpTime = followUpTime || "17:30";
      followUpStatus = followUpStatus || "pending";
      followUpNotes = followUpNotes || "Retry after ringing not answered.";
    } else if (stage === "Busy" && !followUpDate) {
      followUpDate = todayStr;
      followUpTime = followUpTime || "16:30";
      followUpStatus = followUpStatus || "pending";
      followUpNotes = followUpNotes || "Prospect requested callback after meeting.";
    } else if (stage === "Switch Off" && !followUpDate) {
      followUpDate = tomorrowStr;
      followUpTime = followUpTime || "11:00";
      followUpStatus = followUpStatus || "pending";
      followUpNotes = followUpNotes || "Number unreachable; follow up next morning.";
    } else if (stage === "Site Visit Scheduled" && siteVisitDate) {
      followUpDate = followUpDate || siteVisitDate;
      followUpTime = followUpTime || siteVisitTime;
      followUpStatus = followUpStatus || "pending";
      followUpNotes =
        followUpNotes || "Site visit confirmed with sales executive.";
    }

    return {
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      source: r.source || "Direct",
      stage,
      score: r.score ?? 50,
      budget: formatBudgetInr(r.budget_inr),
      budgetInr: r.budget_inr,
      project: r.project || "General Inquiry",
      owner: r.owner || "Unassigned",
      assignedToId: r.assigned_to ?? null,
      ownerName,
      lastActivity: lastAct?.description || "Lead record created in Sentinel Fort.",
      lastActivityAgo: r.created_at ? formatTimeAgo(r.created_at) : "Just now",
      followUpDate,
      followUpTime,
      followUpStatus,
      followUpNotes,
      siteVisitDate,
      siteVisitTime,
    };
  });
}

/**
 * Fetch all live leads from the database for the active workspace.
 * Platform Admin & Managers: full workspace.
 * Sales Executives (agent): assigned leads only.
 * Viewers: workspace leads (view-only).
 */
export const getLiveLeads = createServerFn({ method: "GET" })
  .middleware([requireRoles(["admin", "manager", "agent", "viewer", "builder", "developer"])])
  .handler(async ({ context }): Promise<LiveLead[]> => {
    const { supabase, userId, roles } = context as {
      supabase: any;
      userId: string;
      roles?: string[];
    };

    try {
      const isSalesExecutive = roles?.includes("agent") && !roles?.includes("admin") && !roles?.includes("manager");

      const [leadsRes, activitiesRes, profilesRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id, name, email, phone, source, stage, score, budget_inr, project, owner, assigned_to, city, created_at, site_visit_date, site_visit_time, follow_up_date, follow_up_time, follow_up_status, follow_up_notes")
          .order("created_at", { ascending: false }),
        supabase
          .from("activities")
          .select("id, activity_type, subject, description, performed_by, start_time, status, related_to_id, created_at")
          .eq("related_to_type", "lead")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, full_name, email"),
      ]);

      if (leadsRes.error) {
        console.error("[getLiveLeads] Database error fetching leads:", leadsRes.error.message);
        throw new Error(`Failed to fetch leads: ${leadsRes.error.message}`);
      }

      if (!leadsRes.data || leadsRes.data.length === 0) {
        return [];
      }

      const activities = (activitiesRes.data ?? []) as any[];
      const profiles = (profilesRes.data ?? []) as any[];

      let rawLeads = leadsRes.data as any[];

      // Apply strict user-ID based assignment scoping for Sales Executives
      if (isSalesExecutive) {
        rawLeads = rawLeads.filter((r) => r.assigned_to === userId);
      }

      return mapDatabaseRowsToLiveLeads(rawLeads, activities, profiles);
    } catch (e: any) {
      console.error("[getLiveLeads] Exception caught while fetching leads:", e);
      throw e;
    }
  });

/**
 * Update the pipeline stage for a lead and log an activity record.
 */
export const updateLeadStage = createServerFn({ method: "POST" })
  .middleware([requireRoles(["admin", "manager", "agent", "builder", "developer"])])
  .validator(
    z.object({
      leadId: z.string(),
      stage: z.string(),
      siteVisitDate: z.string().optional(),
      siteVisitTime: z.string().optional(),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ context, data }): Promise<{
    success: boolean;
    leadId: string;
    stage: string;
    siteVisitDate?: string;
    siteVisitTime?: string;
    followUpDate?: string;
    followUpTime?: string;
    followUpStatus?: FollowUpStatus;
    activity?: LeadActivityItem;
  }> => {
    const { supabase, userId, roles } = context as { supabase: any; userId: string; roles?: string[] };
    const { leadId, stage, siteVisitDate, siteVisitTime, notes } = data;

    const isSalesExecutive = roles?.includes("agent") && !roles?.includes("admin") && !roles?.includes("manager");

    if (isSalesExecutive && stage.toLowerCase() === "negotiation") {
      throw new Error("STAGE_BYPASS_RESTRICTED: Advancing a lead to Negotiation requires recording a Site Visit Outcome.");
    }

    if (
      stage === "Site Visit Scheduled" &&
      (!siteVisitDate || !siteVisitTime)
    ) {
      throw new Error(
        "Site Visit Scheduled requires an exact visit date and time",
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().split("T")[0];

    let followUpDate = siteVisitDate || undefined;
    let followUpTime = siteVisitTime || undefined;
    let followUpStatus: FollowUpStatus = "pending";

    if (stage === "Call Back") {
      followUpDate = todayStr;
      followUpTime = "15:00";
    } else if (stage.includes("RNR") || stage.includes("Ringing")) {
      followUpDate = todayStr;
      followUpTime = "17:30";
    } else if (stage === "Busy") {
      followUpDate = todayStr;
      followUpTime = "16:30";
    } else if (stage === "Switch Off") {
      followUpDate = tomorrowStr;
      followUpTime = "11:00";
    } else if (stage === "Site Visit Scheduled") {
      followUpDate = siteVisitDate;
      followUpTime = siteVisitTime;
    } else if (stage === "Booked" || stage === "Not Interested" || stage === "Dropped Plan") {
      followUpStatus = "completed";
    }

    const nowIso = new Date().toISOString();
    let activityId = `act-stage-${Date.now()}`;
    let performerName = "Platform Administrator";

    try {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
        const [leadRes, profileRes] = await Promise.all([
          supabase.from("leads").select("workspace_id, assigned_to").eq("id", leadId).maybeSingle(),
          supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle(),
        ]);

        if (isSalesExecutive && leadRes.data && leadRes.data.assigned_to && leadRes.data.assigned_to !== userId) {
          throw new Error("UNAUTHORIZED_LEAD_ACCESS: Sales Executives can only update leads assigned to their authenticated user ID.");
        }

        if (profileRes.data?.full_name) {
          performerName = profileRes.data.full_name;
        }

        const isSiteVisit =
          stage.toLowerCase().includes("visit") || !!siteVisitDate;
        const isFollowUpDisposition = [
          "Call Back",
          "Busy",
          "Switch Off",
          "RNR",
        ].some((d) => stage.includes(d));

        const leadUpdate: Record<string, unknown> = {
          stage: stage.toLowerCase(),
        };

        if (stage === "Site Visit Scheduled") {
          leadUpdate.site_visit_date = siteVisitDate;
          leadUpdate.site_visit_time = siteVisitTime;
          leadUpdate.follow_up_date = siteVisitDate;
          leadUpdate.follow_up_time = siteVisitTime;
          leadUpdate.follow_up_status = "pending";
          leadUpdate.follow_up_notes =
            notes || `Site visit scheduled for ${siteVisitDate} at ${siteVisitTime}`;
        } else if (isFollowUpDisposition) {
          leadUpdate.follow_up_date = followUpDate;
          leadUpdate.follow_up_time = followUpTime;
          leadUpdate.follow_up_status = "pending";
        } else if (
          stage === "Booked" ||
          stage === "Not Interested" ||
          stage === "Dropped Plan"
        ) {
          leadUpdate.follow_up_status = "completed";
        }

        const { data: persistedLead, error: leadUpdateError } = await supabase
          .from("leads")
          .update(leadUpdate)
          .eq("id", leadId)
          .select("id, stage, site_visit_date, site_visit_time, follow_up_date, follow_up_time, follow_up_status")
          .maybeSingle();

        if (leadUpdateError) {
          throw new Error(
            `Lead scheduling update failed: ${leadUpdateError.message}`,
          );
        }

        if (!persistedLead) {
          throw new Error(
            "Lead scheduling update did not persist. The database returned no updated row.",
          );
        }

        if (
          stage === "Site Visit Scheduled" &&
          (
            persistedLead.site_visit_date !== siteVisitDate ||
            String(persistedLead.site_visit_time ?? "").slice(0, 5) !== siteVisitTime
          )
        ) {
          throw new Error(
            "Site visit date/time verification failed after database update.",
          );
        }

        const subject = isSiteVisit && siteVisitDate
          ? `Site Visit Scheduled for ${siteVisitDate}${siteVisitTime ? ` at ${siteVisitTime}` : ""}`
          : isFollowUpDisposition
            ? `Disposition updated: ${stage} (Follow-Up: ${followUpDate} at ${followUpTime})`
            : `Status changed to ${stage}`;

        const description = notes
          ? notes
          : isSiteVisit && siteVisitDate
            ? `Site visit appointment booked for ${siteVisitDate} ${siteVisitTime || ""}`
            : isFollowUpDisposition
              ? `Call disposition logged as ${stage}. Scheduled follow-up for ${followUpDate} at ${followUpTime}.`
              : `Lead status was updated to ${stage}`;

        const startTime = followUpDate ? `${followUpDate}T${followUpTime || "10:00"}:00` : nowIso;

        const { data: inserted, error } = await supabase.from("activities").insert({
          workspace_id: leadRes.data?.workspace_id,
          activity_type: isSiteVisit ? "meeting" : isFollowUpDisposition ? "follow_up" : "task",
          subject,
          description,
          related_to_type: "lead",
          related_to_id: leadId,
          performed_by: userId,
          start_time: startTime,
          status: isFollowUpDisposition || isSiteVisit ? "pending" : "completed",
        }).select("id, created_at").single();

        if (!error && inserted) {
          activityId = inserted.id;
        }
      }
    } catch (e) {
      console.error("[updateLeadStage] Database update failed:", e);
      throw e;
    }

    return {
      success: true,
      leadId,
      stage,
      siteVisitDate,
      siteVisitTime,
      followUpDate,
      followUpTime,
      followUpStatus,
      activity: {
        id: activityId,
        leadId,
        type: stage.toLowerCase().includes("visit") ? "meeting" : "task",
        subject: `Status changed to ${stage}`,
        description: notes || `Lead moved to ${stage} status in workflow`,
        performedBy: performerName,
        createdAt: nowIso,
        exactTimestamp: formatExactTimestamp(nowIso).exact,
        timeAgo: "Just now",
      },
    };
  });

/**
 * Assign lead owner / representative (general assign function).
 * Strictly restricted to Sales Managers and Platform Administrators.
 */
export const assignLeadOwner = createServerFn({ method: "POST" })
  .middleware([requireRoles(["admin", "manager"])])
  .validator(
    z.object({
      leadId: z.string(),
      owner: z.string(),
      ownerName: z.string().optional(),
    })
  )
  .handler(async ({ context, data }): Promise<{ success: boolean; leadId: string; owner: string; ownerName: string }> => {
    const { supabase, userId, roles } = context as { supabase: any; userId: string; roles?: string[] };
    const isPrivileged = roles?.includes("admin") || roles?.includes("manager");
    if (!isPrivileged) {
      throw new Error("INSUFFICIENT_PRIVILEGES: Only Sales Managers and Platform Administrators can assign lead owners.");
    }

    const { leadId, owner, ownerName } = data;
    const resolvedName = ownerName || DEFAULT_TEAM_MEMBERS.find((m) => m.initials === owner || m.id === owner)?.name || owner;

    try {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
        await supabase
          .from("leads")
          .update({ owner })
          .eq("id", leadId);

        await supabase.from("activities").insert({
          activity_type: "task",
          subject: `Assigned to ${resolvedName}`,
          description: `Lead ownership assigned to ${resolvedName}`,
          related_to_type: "lead",
          related_to_id: leadId,
          performed_by: userId,
          start_time: new Date().toISOString(),
          status: "completed",
        });
      }
    } catch (e) {
      console.warn("[assignLeadOwner] Note: DB update caught error:", e);
    }

    return { success: true, leadId, owner, ownerName: resolvedName };
  });

/**
 * Self-assign lead to the authenticated user with concurrency protection.
 * Restricted strictly to Sales Managers and Platform Administrators.
 * Sales Executives cannot self-assign leads.
 */
export const selfAssignLead = createServerFn({ method: "POST" })
  .middleware([requireRoles(["admin", "manager"])])
  .validator(
    z.object({
      leadId: z.string().uuid(),
      forceReassign: z.boolean().optional(),
    })
  )
  .handler(async ({ context, data }): Promise<{
    success: boolean;
    leadId: string;
    owner: string;
    ownerName: string;
    assignmentType: "SELF_ASSIGN";
    previousOwner: string | null;
  }> => {
    const { supabase, userId, roles } = context as { supabase: any; userId: string; roles?: string[] };
    const isPrivileged = roles?.includes("admin") || roles?.includes("manager");
    if (!isPrivileged) {
      throw new Error("INSUFFICIENT_PRIVILEGES: Sales Executives cannot self-assign leads. Lead assignments are strictly managed by Sales Managers and Platform Administrators.");
    }

    const { leadId, forceReassign } = data;

    const { data: leadRow, error: leadError } = await supabase
      .from("leads")
      .select("id, owner, assigned_to, workspace_id")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError) {
      throw new Error(`Failed to verify lead state: ${leadError.message}`);
    }

    if (!leadRow) {
      throw new Error("LEAD_NOT_FOUND");
    }

    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select(`
        user_id,
        status,
        roles ( name )
      `)
      .eq("workspace_id", leadRow.workspace_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) {
      throw new Error(
        `Failed to verify self-assignment workspace membership: ${membershipError.message}`
      );
    }

    if (!membership || membership.roles?.name !== "member") {
      throw new Error(
        "SELF_ASSIGN_NOT_ELIGIBLE: You must be an active member of this lead's workspace."
      );
    }

    const { data: appRoleRows, error: appRoleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (appRoleError) {
      throw new Error(
        `Failed to verify self-assignment application role: ${appRoleError.message}`
      );
    }

    const appRoles = new Set(
      (appRoleRows ?? []).map((row: any) => row.role)
    );

    if (!appRoles.has("manager") && !appRoles.has("admin") && !roles?.includes("manager") && !roles?.includes("admin")) {
      throw new Error(
        "INSUFFICIENT_PRIVILEGES: Sales Executives cannot self-assign leads. Lead assignments are strictly managed by Sales Managers and Platform Administrators."
      );
    }

    const { data: actingProfile, error: actingProfileError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();

    if (actingProfileError) {
      throw new Error(
        `Failed to resolve self-assignment profile: ${actingProfileError.message}`
      );
    }

    const actingName =
      actingProfile?.full_name ||
      actingProfile?.email?.split("@")[0];

    if (!actingName) {
      throw new Error(
        "SELF_ASSIGN_PROFILE_MISSING: Unable to resolve authenticated user identity."
      );
    }

    const previousOwner = leadRow.owner ?? null;
    const previousAssignedTo = leadRow.assigned_to ?? null;

    const isAssignedToOther =
      Boolean(previousAssignedTo) && previousAssignedTo !== userId;

    /*
     * Legacy rows may have owner text but no assigned_to UUID yet.
     * Treat them as already assigned unless explicit reassignment is requested.
     */
    const hasLegacyAssignment =
      !previousAssignedTo &&
      Boolean(
        previousOwner &&
        previousOwner !== "Unassigned" &&
        previousOwner !== "none" &&
        previousOwner !== ""
      );

    const isManagerOrAdmin = appRoles.has("manager") || appRoles.has("admin") || roles?.includes("admin") || roles?.includes("manager");

    if ((isAssignedToOther || hasLegacyAssignment)) {
      if (!forceReassign || !isManagerOrAdmin) {
        throw new Error(
          `LEAD_ALREADY_ASSIGNED: Lead is already assigned to ${
            previousOwner || previousAssignedTo
          }. Sales Executives cannot overwrite existing assignments.`
        );
      }
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        assigned_to: userId,
        owner: actingName,
      })
      .eq("id", leadId);

    if (updateError) {
      throw new Error(`Failed to self-assign lead: ${updateError.message}`);
    }

    const nowIso = new Date().toISOString();

    const { error: activityError } = await supabase
      .from("activities")
      .insert({
        workspace_id: leadRow.workspace_id,
        activity_type: "task",
        subject: `Lead assigned to ${actingName} (Self Assign)`,
        description: `Lead self-assigned by ${actingName}`,
        related_to_type: "lead",
        related_to_id: leadId,
        performed_by: userId,
        assigned_to: userId,
        start_time: nowIso,
        status: "completed",
      });

    if (activityError) {
      console.error(
        "[selfAssignLead] Lead assignment succeeded but activity logging failed:",
        activityError
      );
    }

    return {
      success: true,
      leadId,
      owner: actingName,
      ownerName: actingName,
      assignmentType: "SELF_ASSIGN",
      previousOwner,
    };
  });

/**
 * Assign or reassign a lead to another sales executive in the same workspace.
 * Strictly restricted to Sales Managers and Platform Administrators.
 */
export const assignLeadToExecutive = createServerFn({ method: "POST" })
  .middleware([requireRoles(["admin", "manager"])])
  .validator(
    z.object({
      leadId: z.string().uuid(),
      targetExecutiveId: z.string().uuid(),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ context, data }): Promise<{
    success: boolean;
    leadId: string;
    owner: string;
    ownerName: string;
    assignmentType: "ASSIGN_TO_EXECUTIVE" | "REASSIGN";
    previousOwner: string | null;
  }> => {
    const { supabase, userId, roles } = context as { supabase: any; userId: string; roles?: string[] };
    const isPrivileged = roles?.includes("admin") || roles?.includes("manager");
    if (!isPrivileged) {
      throw new Error("INSUFFICIENT_PRIVILEGES: Only Sales Managers and Platform Administrators can assign or reassign leads.");
    }

    const { leadId, targetExecutiveId, notes } = data;

    const { data: leadRow, error: leadError } = await supabase
      .from("leads")
      .select("id, owner, assigned_to, workspace_id")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError) {
      throw new Error(`Failed to load lead for assignment: ${leadError.message}`);
    }

    if (!leadRow) {
      throw new Error("LEAD_NOT_FOUND");
    }

    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select(`
        user_id,
        status,
        roles ( name )
      `)
      .eq("workspace_id", leadRow.workspace_id)
      .eq("user_id", targetExecutiveId)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) {
      throw new Error(`Failed to verify assignee workspace membership: ${membershipError.message}`);
    }

    if (!membership || membership.roles?.name !== "member") {
      throw new Error("ASSIGNEE_NOT_ELIGIBLE: User is not an active workspace member.");
    }

    const { data: targetRoleRows, error: targetRoleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", targetExecutiveId);

    if (targetRoleError) {
      throw new Error(`Failed to verify assignee application role: ${targetRoleError.message}`);
    }

    const targetRoles = new Set(
      (targetRoleRows ?? []).map((row: any) => row.role)
    );

    if (!targetRoles.has("agent") && !targetRoles.has("manager")) {
      throw new Error(
        "ASSIGNEE_NOT_ELIGIBLE: User must be a Sales Executive or Sales Manager."
      );
    }

    const { data: targetProfile, error: targetProfileError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", targetExecutiveId)
      .maybeSingle();

    if (targetProfileError) {
      throw new Error(
        `Failed to resolve assignee profile: ${targetProfileError.message}`
      );
    }

    const resolvedName =
      targetProfile?.full_name ||
      targetProfile?.email?.split("@")[0];

    if (!resolvedName) {
      throw new Error("ASSIGNEE_PROFILE_MISSING: Unable to resolve assignee identity.");
    }

    const previousOwner = leadRow.owner ?? null;
    const previousAssignedTo = leadRow.assigned_to ?? null;

    const isReassignment = Boolean(
      previousAssignedTo ||
      (
        previousOwner &&
        previousOwner !== "Unassigned" &&
        previousOwner !== "none" &&
        previousOwner !== ""
      )
    );

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        assigned_to: targetExecutiveId,
        owner: resolvedName,
      })
      .eq("id", leadId);

    if (updateError) {
      throw new Error(`Failed to assign lead: ${updateError.message}`);
    }

    // Cascade opportunity assignment to ensure previous executive loses opportunity access
    try {
      await supabase
        .from("deal_opportunities")
        .update({
          assigned_to: targetExecutiveId,
          updated_at: new Date().toISOString(),
        })
        .eq("lead_id", leadId);
    } catch (oppSyncErr) {
      console.warn("[assignLeadToExecutive] Opportunity assignment sync notice:", oppSyncErr);
    }

    const roleLabel = targetRoles.has("manager")
      ? "Sales Manager"
      : "Sales Executive";

    const subjectText = isReassignment
      ? `Lead reassigned to ${resolvedName}`
      : `Lead assigned to ${resolvedName}`;

    const descText = notes
      ? `Lead assigned to ${resolvedName} (${roleLabel}). Note: ${notes}`
      : `Lead assigned to ${resolvedName} (${roleLabel})`;

    const { error: activityError } = await supabase
      .from("activities")
      .insert({
        workspace_id: leadRow.workspace_id,
        activity_type: "task",
        subject: subjectText,
        description: descText,
        related_to_type: "lead",
        related_to_id: leadId,
        performed_by: userId,
        assigned_to: targetExecutiveId,
        start_time: new Date().toISOString(),
        status: "completed",
      });

    if (activityError) {
      console.error(
        "[assignLeadToExecutive] Lead assignment succeeded but activity logging failed:",
        activityError
      );
    }

    return {
      success: true,
      leadId,
      owner: resolvedName,
      ownerName: resolvedName,
      assignmentType: isReassignment ? "REASSIGN" : "ASSIGN_TO_EXECUTIVE",
      previousOwner,
    };
  });

/**
 * Unassign a lead.
 * Strictly restricted to Sales Managers and Platform Administrators.
 */
export const unassignLead = createServerFn({ method: "POST" })
  .middleware([requireRoles(["admin", "manager"])])
  .validator(
    z.object({
      leadId: z.string().uuid(),
      reason: z.string().optional(),
    })
  )
  .handler(async ({ context, data }): Promise<{
    success: boolean;
    leadId: string;
    owner: null;
    ownerName: string;
    assignmentType: "UNASSIGN";
  }> => {
    const { supabase, userId, roles } = context as { supabase: any; userId: string; roles?: string[] };
    const isPrivileged = roles?.includes("admin") || roles?.includes("manager");
    if (!isPrivileged) {
      throw new Error("INSUFFICIENT_PRIVILEGES: Only Sales Managers and Platform Administrators can unassign leads.");
    }

    const { leadId, reason } = data;

    const { data: leadRow, error: leadError } = await supabase
      .from("leads")
      .select("id, owner, assigned_to, workspace_id")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError) {
      throw new Error(`Failed to load lead for unassignment: ${leadError.message}`);
    }

    if (!leadRow) {
      throw new Error("LEAD_NOT_FOUND");
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        owner: null,
        assigned_to: null,
      })
      .eq("id", leadId);

    if (updateError) {
      throw new Error(`Failed to unassign lead: ${updateError.message}`);
    }

    // Unassign associated opportunity to remove executive visibility
    try {
      await supabase
        .from("deal_opportunities")
        .update({
          assigned_to: null,
          updated_at: new Date().toISOString(),
        })
        .eq("lead_id", leadId);
    } catch (oppUnassignErr) {
      console.warn("[unassignLead] Opportunity unassignment sync notice:", oppUnassignErr);
    }

    const nowIso = new Date().toISOString();

    const { error: activityError } = await supabase
      .from("activities")
      .insert({
        workspace_id: leadRow.workspace_id,
        activity_type: "task",
        subject: "Lead unassigned",
        description: reason
          ? `Lead was unassigned. Reason: ${reason}`
          : "Lead returned to unassigned inbox pool.",
        related_to_type: "lead",
        related_to_id: leadId,
        performed_by: userId,
        start_time: nowIso,
        status: "completed",
      });

    if (activityError) {
      console.error(
        "[unassignLead] Lead unassignment succeeded but activity logging failed:",
        activityError
      );
    }

    return {
      success: true,
      leadId,
      owner: null,
      ownerName: "Unassigned",
      assignmentType: "UNASSIGN",
    };
  });

/**
 * Idempotently create or retrieve a preliminary Deal Room opportunity for a lead.
 * Uniquely maps one opportunity per originating lead without fabricating commercial data.
 */
export async function createOrLinkDealRoomForLead(
  supabase: any,
  {
    leadId,
    workspaceId,
    userId,
    unitInterest,
    offeredBudgetInr,
    notes,
  }: {
    leadId: string;
    workspaceId?: string;
    userId: string;
    unitInterest?: string;
    offeredBudgetInr?: number;
    notes?: string;
  }
): Promise<{ opportunityId: string; dealId: string; isNew: boolean }> {
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id, name, budget_inr, assigned_to, workspace_id")
    .eq("id", leadId)
    .maybeSingle();

  if (leadErr) {
    throw new Error(`Failed to query lead for opportunity creation: ${leadErr.message}`);
  }

  if (!lead) {
    throw new Error(`LEAD_NOT_FOUND: Lead ${leadId} does not exist.`);
  }

  const wsId = lead.workspace_id || workspaceId;
  if (!wsId) {
    throw new Error(`WORKSPACE_REQUIRED: Lead ${leadId} is not associated with a valid workspace.`);
  }

  const targetBudget = offeredBudgetInr ?? lead.budget_inr ?? null;
  const assignedTo = lead.assigned_to || userId;

  // 1. Query deal_opportunities table first to check if preliminary opportunity already exists
  const { data: existingOpp, error: oppCheckErr } = await supabase
    .from("deal_opportunities")
    .select("id, lead_id, stage, formal_deal_id")
    .eq("lead_id", leadId)
    .maybeSingle();

  if (!oppCheckErr && existingOpp) {
    if (unitInterest || targetBudget || notes) {
      await supabase
        .from("deal_opportunities")
        .update({
          unit_interest: unitInterest || undefined,
          target_budget_inr: targetBudget || undefined,
          notes: notes || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingOpp.id);
    }
    return {
      opportunityId: existingOpp.id,
      dealId: `DR-${existingOpp.id.slice(0, 4).toUpperCase()}`,
      isNew: false,
    };
  }

  // 2. Insert new preliminary opportunity (guaranteed 1 per originating lead)
  const { data: createdOpp, error: createErr } = await supabase
    .from("deal_opportunities")
    .insert({
      workspace_id: wsId,
      lead_id: leadId,
      assigned_to: assignedTo,
      stage: "negotiation",
      unit_interest: unitInterest || null,
      target_budget_inr: targetBudget,
      notes: notes || null,
    })
    .select("id")
    .maybeSingle();

  if (createErr) {
    // Retry checking if concurrent request already created it
    const { data: retryOpp } = await supabase
      .from("deal_opportunities")
      .select("id")
      .eq("lead_id", leadId)
      .maybeSingle();

    if (retryOpp) {
      return {
        opportunityId: retryOpp.id,
        dealId: `DR-${retryOpp.id.slice(0, 4).toUpperCase()}`,
        isNew: false,
      };
    }

    throw new Error(`Failed to create preliminary deal room opportunity: ${createErr.message}`);
  }

  if (!createdOpp) {
    throw new Error("Failed to create preliminary deal room opportunity: Database returned no record.");
  }

  return {
    opportunityId: createdOpp.id,
    dealId: `DR-${createdOpp.id.slice(0, 4).toUpperCase()}`,
    isNew: true,
  };
}

/**
 * Record Site Visit Outcome with atomic transitions:
 * - INTERESTED: advance to Negotiation & initiate/retrieve preliminary Deal Room
 * - NOT_INTERESTED: move to Outgoing with reason & timestamp
 * - UNDECIDED: require explicit follow-up date and time; never fabricate appointments
 */
export const recordSiteVisitOutcome = createServerFn({ method: "POST" })
  .middleware([requireRoles(["admin", "manager", "agent", "builder", "developer"])])
  .validator(
    z.object({
      leadId: z.string().uuid(),
      outcome: z.enum(["INTERESTED", "NOT_INTERESTED", "UNDECIDED"]),
      notes: z.string().optional(),
      reason: z.string().optional(),
      nextFollowUpDate: z.string().optional(),
      nextFollowUpTime: z.string().optional(),
      unitInterest: z.string().optional(),
      offeredBudgetInr: z.number().optional(),
    })
  )
  .handler(async ({ context, data }): Promise<{
    success: boolean;
    leadId: string;
    outcome: "INTERESTED" | "NOT_INTERESTED" | "UNDECIDED";
    stage: string;
    dealId?: string | null;
    opportunityId?: string | null;
    activity?: LeadActivityItem;
  }> => {
    const { supabase, userId, roles } = context as {
      supabase: any;
      userId: string;
      roles?: string[];
    };
    const { leadId, outcome, notes, reason, nextFollowUpDate, nextFollowUpTime, unitInterest, offeredBudgetInr } = data;

    const { data: leadRow, error: leadError } = await supabase
      .from("leads")
      .select("id, name, assigned_to, workspace_id, budget_inr, stage")
      .eq("id", leadId)
      .maybeSingle();

    if (leadError || !leadRow) {
      throw new Error(`Lead not found: ${leadError?.message || leadId}`);
    }

    // Strict user ID-based authorization (NO name-based heuristics)
    const isSalesExecutive = roles?.includes("agent") && !roles?.includes("admin") && !roles?.includes("manager");
    if (isSalesExecutive) {
      if (leadRow.assigned_to !== userId) {
        throw new Error("UNAUTHORIZED_LEAD_ACCESS: Sales Executives can only record outcomes for leads assigned to their authenticated user ID.");
      }
    }

    // Validate UNDECIDED requirements: explicit follow-up date and time are strictly required
    if (outcome === "UNDECIDED") {
      if (!nextFollowUpDate || !nextFollowUpDate.trim() || !nextFollowUpTime || !nextFollowUpTime.trim()) {
        throw new Error("VALIDATION_ERROR: Next follow-up date and time are required for undecided site visits. Appointments must not be fabricated.");
      }
    }

    const nowIso = new Date().toISOString();

    // 1. Attempt atomic stored procedure execution if available in database
    if (typeof supabase.rpc === "function") {
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc("record_site_visit_outcome", {
          p_lead_id: leadId,
          p_workspace_id: leadRow.workspace_id,
          p_outcome: outcome,
          p_notes: notes || null,
          p_reason: reason || null,
          p_next_follow_up_date: nextFollowUpDate || null,
          p_next_follow_up_time: nextFollowUpTime || null,
          p_unit_interest: unitInterest || null,
          p_offered_budget_inr: offeredBudgetInr || null,
        });

        if (!rpcErr && rpcRes && rpcRes.success) {
          return {
            success: true,
            leadId,
            outcome: rpcRes.outcome,
            stage: rpcRes.stage,
            dealId: rpcRes.dealId ?? null,
            opportunityId: rpcRes.opportunityId ?? null,
            activity: {
              id: `act-outcome-${Date.now()}`,
              leadId,
              type: outcome === "INTERESTED" ? "meeting" : outcome === "NOT_INTERESTED" ? "task" : "call",
              subject: outcome === "INTERESTED"
                ? `Site Visit Outcome: Interested → Moved to Negotiation`
                : outcome === "NOT_INTERESTED"
                ? `Site Visit Outcome: Not Interested (Closed)`
                : `Site Visit Outcome: Undecided (Follow-Up Scheduled)`,
              description: notes || `Site visit outcome recorded: ${outcome}`,
              performedBy: "Executive",
              createdAt: nowIso,
              exactTimestamp: formatExactTimestamp(nowIso).exact,
              timeAgo: "Just now",
            },
          };
        } else if (rpcErr && !rpcErr.message?.includes("function") && !rpcErr.message?.includes("does not exist")) {
          // Genuine business exception raised by stored procedure
          throw new Error(rpcErr.message);
        }
      } catch (rpcEx: any) {
        if (!rpcEx.message?.includes("function") && !rpcEx.message?.includes("does not exist") && !rpcEx.message?.includes("is not a function")) {
          throw rpcEx;
        }
      }
    }

    let newStage = leadRow.stage;
    let dealIdResult: string | null = null;
    let oppIdResult: string | null = null;
    let activitySubject = "";
    let activityDescription = "";
    const leadUpdate: Record<string, unknown> = {};

    if (outcome === "INTERESTED") {
      newStage = "Negotiation";
      leadUpdate.stage = "negotiation";
      if (offeredBudgetInr && offeredBudgetInr > 0) {
        leadUpdate.budget_inr = offeredBudgetInr;
      }
      leadUpdate.follow_up_status = "completed";

      const oppRes = await createOrLinkDealRoomForLead(supabase, {
        leadId,
        workspaceId: leadRow.workspace_id,
        userId,
        unitInterest,
        offeredBudgetInr,
        notes,
      });
      oppIdResult = oppRes.opportunityId;
      dealIdResult = oppRes.dealId;

      activitySubject = `Site Visit Outcome: Interested → Moved to Negotiation`;
      activityDescription = notes
        ? `Prospect expressed interest. Preliminary Deal Room opportunity ${dealIdResult} created. Note: ${notes}`
        : `Prospect expressed interest. Preliminary Deal Room opportunity ${dealIdResult} created.`;

    } else if (outcome === "NOT_INTERESTED") {
      newStage = "Not Interested";
      leadUpdate.stage = "not_interested";
      leadUpdate.follow_up_status = "completed";
      leadUpdate.follow_up_notes = reason && notes
        ? `Reason: ${reason} | ${notes}`
        : reason
        ? `Reason: ${reason}`
        : notes || null;

      // Update opportunity stage to closed_lost without deleting history
      await supabase
        .from("deal_opportunities")
        .update({ stage: "closed_lost", updated_at: nowIso })
        .eq("lead_id", leadId);

      activitySubject = `Site Visit Outcome: Not Interested`;
      let desc = "Lead marked Not Interested.";
      if (reason && reason.trim()) {
        desc += ` Reason: ${reason.trim()}.`;
      }
      if (notes && notes.trim()) {
        desc += ` Note: ${notes.trim()}`;
      }
      activityDescription = desc;

    } else if (outcome === "UNDECIDED") {
      leadUpdate.follow_up_date = nextFollowUpDate!;
      leadUpdate.follow_up_time = nextFollowUpTime!;
      leadUpdate.follow_up_status = "pending";
      leadUpdate.follow_up_notes = notes || "Follow-up touchpoint scheduled after undecided site visit.";

      // Update opportunity stage to on_hold
      await supabase
        .from("deal_opportunities")
        .update({ stage: "on_hold", updated_at: nowIso })
        .eq("lead_id", leadId);

      activitySubject = `Site Visit Outcome: Undecided (Follow-Up Scheduled)`;
      let desc = `Site visit undecided. Next follow-up booked for ${nextFollowUpDate} at ${nextFollowUpTime}.`;
      if (notes && notes.trim()) {
        desc += ` Note: ${notes.trim()}`;
      }
      activityDescription = desc;
    }

    const { error: updateErr } = await supabase
      .from("leads")
      .update(leadUpdate)
      .eq("id", leadId);

    if (updateErr) {
      throw new Error(`Failed to update lead outcome: ${updateErr.message}`);
    }

    const { data: performerProfile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();
    const performerName = performerProfile?.full_name || performerProfile?.email?.split("@")[0] || "Executive";

    const { data: actRow, error: actErr } = await supabase
      .from("activities")
      .insert({
        workspace_id: leadRow.workspace_id,
        activity_type: "meeting",
        subject: activitySubject,
        description: activityDescription,
        related_to_type: "lead",
        related_to_id: leadId,
        performed_by: userId,
        start_time: nowIso,
        status: "completed",
      })
      .select("id, created_at")
      .maybeSingle();

    if (actErr) {
      console.warn("[recordSiteVisitOutcome] Activity log notice:", actErr.message);
    }

    return {
      success: true,
      leadId,
      outcome,
      stage: newStage,
      dealId: dealIdResult,
      opportunityId: oppIdResult,
      activity: {
        id: actRow?.id || `act-outcome-${Date.now()}`,
        leadId,
        type: "meeting",
        subject: activitySubject,
        description: activityDescription,
        performedBy: performerName,
        createdAt: nowIso,
        exactTimestamp: formatExactTimestamp(nowIso).exact,
        timeAgo: "Just now",
      },
    };
  });

export type DealRoomSummary = {
  id: string;
  dealId: string;
  leadId?: string | null;
  customer: string;
  project: string;
  unit: string;
  value: string;
  valueInr: number | null;
  stage: string;
  owner: string;
  health: number | null;
  closeProb: number | null;
  cancelRisk: number | null;
  collectionRisk: number | null;
  currencyCode: string;
  createdAt: string;
  briefSummary?: string | null;
};

/**
 * Fetch live workspace deal rooms scoped by user role.
 * Viewer is denied access.
 * Zero-fabrication: health, closure probabilities, and risk metrics return null when not computed.
 */
export const getWorkspaceDealRooms = createServerFn({ method: "GET" })
  .middleware([requireRoles(["admin", "manager", "agent", "builder", "developer"])])
  .handler(async ({ context }): Promise<DealRoomSummary[]> => {
    const { supabase, userId, roles } = context as {
      supabase: any;
      userId: string;
      roles?: string[];
    };

    try {
      const isSalesExecutive = roles?.includes("agent") && !roles?.includes("admin") && !roles?.includes("manager");

      const [dealsRes, opportunitiesRes, leadsRes, contactsRes, propertiesRes] = await Promise.all([
        supabase
          .from("deals")
          .select("id, workspace_id, customer_id, project_id, unit_number, agreed_value, currency_code, agreement_date, current_status, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("deal_opportunities")
          .select("id, workspace_id, lead_id, assigned_to, stage, unit_interest, target_budget_inr, notes, formal_deal_id, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("leads")
          .select("id, name, project, budget_inr, stage, assigned_to, created_at"),
        supabase
          .from("contacts")
          .select("id, full_name, first_name, last_name, email"),
        supabase
          .from("properties")
          .select("id, title, location_city, price_inr"),
      ]);

      const rawDeals = (dealsRes.data ?? []) as any[];
      const opportunities = (opportunitiesRes.data ?? []) as any[];
      const leads = (leadsRes.data ?? []) as any[];
      const contacts = (contactsRes.data ?? []) as any[];
      const properties = (propertiesRes.data ?? []) as any[];

      const leadMap = new Map<string, any>();
      for (const l of leads) {
        leadMap.set(l.id, l);
      }

      const contactMap = new Map<string, string>();
      for (const c of contacts) {
        contactMap.set(c.id, c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email);
      }

      const propertyMap = new Map<string, string>();
      for (const p of properties) {
        propertyMap.set(p.id, p.title || "Sentinel Project");
      }

      const summaries: DealRoomSummary[] = [];

      // 1. Process preliminary deal opportunities
      for (const opp of opportunities) {
        if (isSalesExecutive && opp.assigned_to !== userId) {
          continue;
        }

        // Only active negotiation opportunities represent active preliminary deal rooms
        if (opp.stage !== "negotiation") {
          continue;
        }

        const linkedLead = leadMap.get(opp.lead_id);
        const customerName = linkedLead?.name || "Preliminary Client";
        const projectName = linkedLead?.project || "Project Inspection";
        const unitName = opp.unit_interest || "Unit Inquiry";
        const budget = opp.target_budget_inr ?? linkedLead?.budget_inr ?? null;
        const valFormatted = budget ? formatBudgetInr(budget) : "Pending Terms";

        summaries.push({
          id: `DR-${opp.id.slice(0, 4).toUpperCase()}`,
          dealId: opp.id,
          leadId: opp.lead_id,
          customer: customerName,
          project: projectName,
          unit: unitName,
          value: valFormatted,
          valueInr: budget,
          stage: "Negotiation",
          owner: opp.assigned_to === userId ? "You" : "Assigned Sales Executive",
          health: null,
          closeProb: null,
          cancelRisk: null,
          collectionRisk: null,
          currencyCode: "INR",
          createdAt: opp.created_at,
          briefSummary: opp.notes || "Preliminary opportunity established from site visit. Commercial agreement pending.",
        });
      }

      // 2. Process verified formal deals
      for (const d of rawDeals) {
        const customerName = contactMap.get(d.customer_id) || "Verified Buyer";
        const projectName = propertyMap.get(d.project_id) || "Sentinel Residence";
        const stageRaw = (d.current_status || "negotiating").replace(/_/g, " ");
        const stage = stageRaw.charAt(0).toUpperCase() + stageRaw.slice(1);
        const agreedValue = Number(d.agreed_value ?? 0);
        const valFormatted = formatBudgetInr(agreedValue);

        summaries.push({
          id: `DR-${d.id.slice(0, 4).toUpperCase()}`,
          dealId: d.id,
          customer: customerName,
          project: projectName,
          unit: d.unit_number || "Unit Pending",
          value: valFormatted,
          valueInr: agreedValue > 0 ? agreedValue : null,
          stage,
          owner: "Transaction Team",
          health: null,
          closeProb: null,
          cancelRisk: null,
          collectionRisk: null,
          currencyCode: d.currency_code || "INR",
          createdAt: d.created_at,
          briefSummary: `Verified transaction workspace active in ${stage} stage.`,
        });
      }

      return summaries;
    } catch (err: any) {
      console.error("[getWorkspaceDealRooms] Error fetching workspace deal rooms:", err);
      return [];
    }
  });

/**
 * Add a comment / note to a lead's activity timeline.
 */
export const addLeadComment = createServerFn({ method: "POST" })
  .middleware([requireRoles(["admin", "manager", "agent", "builder", "developer"])])
  .validator(
    z.object({
      leadId: z.string(),
      comment: z.string().min(1),
      authorName: z.string().optional(),
    })
  )
  .handler(async ({ context, data }): Promise<{ success: boolean; activity: LeadActivityItem }> => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { leadId, comment, authorName } = data;
    const author = authorName || "Sales Agent";
    const nowIso = new Date().toISOString();

    let activityId = `act-${Date.now()}`;

    try {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
        const { data: leadRow } = await supabase
          .from("leads")
          .select("workspace_id")
          .eq("id", leadId)
          .maybeSingle();

        const { data: inserted, error } = await supabase
          .from("activities")
          .insert({
            workspace_id: leadRow?.workspace_id,
            activity_type: "task",
            subject: `Note by ${author}`,
            description: comment,
            related_to_type: "lead",
            related_to_id: leadId,
            performed_by: userId,
            start_time: nowIso,
            status: "completed",
          })
          .select("id, created_at")
          .single();

        if (!error && inserted) {
          activityId = inserted.id;
        }
      }
    } catch (e) {
      console.warn("[addLeadComment] Note: DB activity insert error:", e);
    }

    return {
      success: true,
      activity: {
        id: activityId,
        leadId,
        type: "note",
        subject: `Note by ${author}`,
        description: comment,
        performedBy: author,
        createdAt: nowIso,
        exactTimestamp: formatExactTimestamp(nowIso).exact,
        timeAgo: "Just now",
      },
    };
  });

/**
 * Schedule a follow-up appointment with date, time, and optional notes.
 */
export const scheduleLeadFollowUp = createServerFn({ method: "POST" })
  .middleware([requireRoles(["admin", "manager", "agent", "builder", "developer"])])
  .validator(
    z.object({
      leadId: z.string(),
      scheduledDate: z.string(), // YYYY-MM-DD
      scheduledTime: z.string(), // HH:mm
      notes: z.string().optional(),
    })
  )
  .handler(async ({ context, data }): Promise<{
    success: boolean;
    leadId: string;
    scheduledDate: string;
    scheduledTime: string;
    activity: LeadActivityItem;
  }> => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { leadId, scheduledDate, scheduledTime, notes } = data;
    const nowIso = new Date().toISOString();
    const formattedExact = formatExactTimestamp(`${scheduledDate}T${scheduledTime}:00`).exact;
    let activityId = `act-followup-${Date.now()}`;

    try {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
        const { data: leadRow, error: leadLoadError } = await supabase
          .from("leads")
          .select("workspace_id")
          .eq("id", leadId)
          .maybeSingle();

        if (leadLoadError || !leadRow) {
          throw new Error(
            `Failed to load lead for follow-up scheduling: ${leadLoadError?.message || "lead not found"}`
          );
        }

        const { data: persistedLead, error: persistError } = await supabase
          .from("leads")
          .update({
            follow_up_date: scheduledDate,
            follow_up_time: scheduledTime,
            follow_up_status: "pending",
            follow_up_notes: notes || `Follow-up scheduled for ${scheduledDate} at ${scheduledTime}`,
          })
          .eq("id", leadId)
          .select("id, follow_up_date, follow_up_time, follow_up_status")
          .maybeSingle();

        if (persistError) {
          throw new Error(`Failed to persist follow-up: ${persistError.message}`);
        }

        if (
          !persistedLead ||
          persistedLead.follow_up_date !== scheduledDate ||
          String(persistedLead.follow_up_time ?? "").slice(0, 5) !== scheduledTime
        ) {
          throw new Error("Follow-up persistence verification failed");
        }

        const { data: inserted, error } = await supabase
          .from("activities")
          .insert({
            workspace_id: leadRow?.workspace_id,
            activity_type: "follow_up",
            subject: `Follow-Up Scheduled for ${scheduledDate} at ${scheduledTime}`,
            description: notes ? `Scheduled follow-up: ${notes}` : `Follow-up appointment scheduled for ${scheduledDate} ${scheduledTime}`,
            related_to_type: "lead",
            related_to_id: leadId,
            performed_by: userId,
            start_time: `${scheduledDate}T${scheduledTime}:00`,
            status: "pending",
          })
          .select("id, created_at")
          .single();

        if (!error && inserted) {
          activityId = inserted.id;
        }
      }
    } catch (e) {
      console.error("[scheduleLeadFollowUp] DB error:", e);
      throw e;
    }

    return {
      success: true,
      leadId,
      scheduledDate,
      scheduledTime,
      activity: {
        id: activityId,
        leadId,
        type: "follow_up",
        subject: `Follow-Up Scheduled for ${scheduledDate} at ${scheduledTime}`,
        description: notes || `Follow-up appointment booked for ${scheduledDate} ${scheduledTime}`,
        performedBy: "Sales Agent",
        createdAt: nowIso,
        exactTimestamp: formatExactTimestamp(nowIso).exact,
        timeAgo: "Just now",
      },
    };
  });

/**
 * Complete a follow-up appointment.
 */
export const completeLeadFollowUp = createServerFn({ method: "POST" })
  .middleware([requireRoles(["admin", "manager", "agent", "builder", "developer"])])
  .validator(
    z.object({
      leadId: z.string(),
      outcomeNotes: z.string().optional(),
    })
  )
  .handler(async ({ context, data }): Promise<{
    success: boolean;
    leadId: string;
    activity: LeadActivityItem;
  }> => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { leadId, outcomeNotes } = data;
    const nowIso = new Date().toISOString();
    let activityId = `act-followup-complete-${Date.now()}`;

    try {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
        const { data: leadRow, error: leadLoadError } = await supabase
          .from("leads")
          .select("workspace_id")
          .eq("id", leadId)
          .maybeSingle();

        if (leadLoadError || !leadRow) {
          throw new Error(
            `Failed to load lead for follow-up completion: ${leadLoadError?.message || "lead not found"}`
          );
        }

        const { error: persistError } = await supabase
          .from("leads")
          .update({
            follow_up_status: "completed",
            follow_up_notes: outcomeNotes || "Follow-up completed",
          })
          .eq("id", leadId);

        if (persistError) {
          throw new Error(`Failed to complete follow-up: ${persistError.message}`);
        }

        const { data: inserted, error } = await supabase
          .from("activities")
          .insert({
            workspace_id: leadRow?.workspace_id,
            activity_type: "follow_up",
            subject: "Follow-Up Completed",
            description: outcomeNotes ? `Follow-up concluded: ${outcomeNotes}` : "Scheduled follow-up conversation completed successfully.",
            related_to_type: "lead",
            related_to_id: leadId,
            performed_by: userId,
            start_time: nowIso,
            status: "completed",
          })
          .select("id, created_at")
          .single();

        if (!error && inserted) {
          activityId = inserted.id;
        }
      }
    } catch (e) {
      console.error("[completeLeadFollowUp] DB error:", e);
      throw e;
    }

    return {
      success: true,
      leadId,
      activity: {
        id: activityId,
        leadId,
        type: "follow_up",
        subject: "Follow-Up Completed",
        description: outcomeNotes || "Scheduled follow-up conversation completed successfully.",
        performedBy: "Sales Agent",
        createdAt: nowIso,
        exactTimestamp: formatExactTimestamp(nowIso).exact,
        timeAgo: "Just now",
      },
    };
  });

/**
 * Reschedule or reset a follow-up appointment.
 */
export const rescheduleLeadFollowUp = createServerFn({ method: "POST" })
  .middleware([requireRoles(["admin", "manager", "agent", "builder", "developer"])])
  .validator(
    z.object({
      leadId: z.string(),
      newDate: z.string(),
      newTime: z.string(),
      previousDate: z.string().optional(),
      previousTime: z.string().optional(),
      reason: z.string().optional(),
    })
  )
  .handler(async ({ context, data }): Promise<{
    success: boolean;
    leadId: string;
    newDate: string;
    newTime: string;
    activity: LeadActivityItem;
  }> => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { leadId, newDate, newTime, previousDate, previousTime, reason } = data;
    const nowIso = new Date().toISOString();
    let activityId = `act-followup-resched-${Date.now()}`;

    const prevInfo = previousDate ? ` (rescheduled from ${previousDate}${previousTime ? ` ${previousTime}` : ""})` : "";
    const reasonInfo = reason ? `. Reason: ${reason}` : "";
    const description = `Follow-up rescheduled to ${newDate} at ${newTime}${prevInfo}${reasonInfo}`;

    try {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
        const { data: leadRow, error: leadLoadError } = await supabase
          .from("leads")
          .select("workspace_id")
          .eq("id", leadId)
          .maybeSingle();

        if (leadLoadError || !leadRow) {
          throw new Error(
            `Failed to load lead for follow-up reschedule: ${leadLoadError?.message || "lead not found"}`
          );
        }

        const { data: persistedLead, error: persistError } = await supabase
          .from("leads")
          .update({
            follow_up_date: newDate,
            follow_up_time: newTime,
            follow_up_status: "pending",
            follow_up_notes: description,
          })
          .eq("id", leadId)
          .select("id, follow_up_date, follow_up_time, follow_up_status")
          .maybeSingle();

        if (persistError) {
          throw new Error(`Failed to persist rescheduled follow-up: ${persistError.message}`);
        }

        if (
          !persistedLead ||
          persistedLead.follow_up_date !== newDate ||
          String(persistedLead.follow_up_time ?? "").slice(0, 5) !== newTime
        ) {
          throw new Error("Rescheduled follow-up persistence verification failed");
        }

        const { data: inserted, error } = await supabase
          .from("activities")
          .insert({
            workspace_id: leadRow?.workspace_id,
            activity_type: "follow_up",
            subject: `Follow-Up Rescheduled to ${newDate} at ${newTime}`,
            description,
            related_to_type: "lead",
            related_to_id: leadId,
            performed_by: userId,
            start_time: `${newDate}T${newTime}:00`,
            status: "pending",
          })
          .select("id, created_at")
          .single();

        if (!error && inserted) {
          activityId = inserted.id;
        }
      }
    } catch (e) {
      console.error("[rescheduleLeadFollowUp] DB error:", e);
      throw e;
    }

    return {
      success: true,
      leadId,
      newDate,
      newTime,
      activity: {
        id: activityId,
        leadId,
        type: "follow_up",
        subject: `Follow-Up Rescheduled to ${newDate} at ${newTime}`,
        description,
        performedBy: "Sales Agent",
        createdAt: nowIso,
        exactTimestamp: formatExactTimestamp(nowIso).exact,
        timeAgo: "Just now",
      },
    };
  });

/**
 * Log SMS message sent to a lead.
 */
export const logLeadSMSActivity = createServerFn({ method: "POST" })
  .middleware([requireRoles(["admin", "manager", "agent", "builder", "developer"])])
  .validator(
    z.object({
      leadId: z.string(),
      recipientPhone: z.string().optional(),
      message: z.string().min(1),
      senderName: z.string().optional(),
    })
  )
  .handler(async ({ context, data }): Promise<{ success: boolean; activity: LeadActivityItem }> => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const { leadId, recipientPhone, message, senderName } = data;
    const author = senderName || "Sales Agent";
    const nowIso = new Date().toISOString();
    let activityId = `act-sms-${Date.now()}`;

    try {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
        const { data: leadRow } = await supabase
          .from("leads")
          .select("workspace_id, phone")
          .eq("id", leadId)
          .maybeSingle();

        const phone = recipientPhone || leadRow?.phone || "Client Mobile";

        const { data: inserted, error } = await supabase
          .from("activities")
          .insert({
            workspace_id: leadRow?.workspace_id,
            activity_type: "task",
            subject: `SMS Sent to ${phone}`,
            description: message,
            related_to_type: "lead",
            related_to_id: leadId,
            performed_by: userId,
            start_time: nowIso,
            status: "completed",
          })
          .select("id, created_at")
          .single();

        if (!error && inserted) {
          activityId = inserted.id;
        }
      }
    } catch (e) {
      console.warn("[logLeadSMSActivity] DB error:", e);
    }

    return {
      success: true,
      activity: {
        id: activityId,
        leadId,
        type: "sms",
        subject: `SMS Sent to ${recipientPhone || "Lead"}`,
        description: message,
        performedBy: author,
        createdAt: nowIso,
        exactTimestamp: formatExactTimestamp(nowIso).exact,
        timeAgo: "Just now",
      },
    };
  });

/**
 * Generates an instant, highly detailed chronological timeline fallback for any lead.
 */
export function getDefaultTimelineForLead(lead: {
  id: string;
  name?: string;
  project?: string | null;
  source?: string;
  stage?: string;
  score?: number;
  ownerName?: string | null;
  createdAt?: string;
  followUpDate?: string | null;
  followUpTime?: string | null;
  followUpNotes?: string | null;
  siteVisitDate?: string | null;
  siteVisitTime?: string | null;
}): LeadActivityItem[] {
  const leadId = lead.id;
  const leadCreatedIso = lead.createdAt || new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString();
  const voiceIso = new Date(Date.now() - 1000 * 60 * 15).toISOString();
  const items: LeadActivityItem[] = [];

  if (lead.siteVisitDate) {
    const visitIso = new Date(Date.now() - 1000 * 60 * 30).toISOString();
    items.push({
      id: `act-visit-${leadId}`,
      leadId,
      type: "meeting",
      subject: `Site Visit Scheduled for ${lead.siteVisitDate}${lead.siteVisitTime ? ` at ${lead.siteVisitTime}` : ""}`,
      description: lead.followUpNotes || `Site walkthrough appointment confirmed at ${lead.project || "property site"}`,
      performedBy: lead.ownerName || "Aarav Mehta",
      createdAt: visitIso,
      exactTimestamp: formatExactTimestamp(visitIso).exact,
      timeAgo: formatTimeAgo(visitIso),
    });
  } else if (lead.followUpNotes) {
    const noteIso = new Date(Date.now() - 1000 * 60 * 45).toISOString();
    items.push({
      id: `act-note-${leadId}`,
      leadId,
      type: "comment",
      subject: `Follow-Up Note: ${lead.stage || "In Progress"}`,
      description: lead.followUpNotes,
      performedBy: lead.ownerName || "Sales Agent",
      createdAt: noteIso,
      exactTimestamp: formatExactTimestamp(noteIso).exact,
      timeAgo: formatTimeAgo(noteIso),
    });
  }

  if (lead.ownerName && lead.ownerName !== "Unassigned") {
    const assignIso = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    items.push({
      id: `act-assign-${leadId}`,
      leadId,
      type: "assignment",
      subject: `Lead assigned to ${lead.ownerName}`,
      description: `Lead ownership assigned to ${lead.ownerName} for deal closure and consultation.`,
      performedBy: "Team Manager",
      createdAt: assignIso,
      exactTimestamp: formatExactTimestamp(assignIso).exact,
      timeAgo: formatTimeAgo(assignIso),
    });
  }

  items.push({
    id: `act-voice-${leadId}`,
    leadId,
    type: "qualification",
    subject: `AI Voice Qualification Completed (${lead.score ?? 88}/100)`,
    description: `Autonomous agent verified buyer intent, budget, and project interest in ${lead.project || "premium inventory"}.`,
    performedBy: "Supreme AI Agent",
    createdAt: voiceIso,
    exactTimestamp: formatExactTimestamp(voiceIso).exact,
    timeAgo: formatTimeAgo(voiceIso),
  });

  items.push({
    id: `act-inbound-${leadId}`,
    leadId,
    type: "lead_created",
    subject: "Inbound Lead Captured",
    description: `Lead registration captured via ${lead.source || "Direct Channel"} with verified phone and email.`,
    performedBy: "Sentinel Inbound Gateway",
    createdAt: leadCreatedIso,
    exactTimestamp: formatExactTimestamp(leadCreatedIso).exact,
    timeAgo: formatTimeAgo(leadCreatedIso),
  });

  return items;
}

/**
 * Get the full chronological activity & comment timeline for a lead with exact timestamps.
 */
export const getLeadActivityTimeline = createServerFn({ method: "POST" })
  .middleware([requireRoles(["admin", "manager", "agent", "viewer", "builder", "developer"])])
  .validator(
    z.object({
      leadId: z.string(),
    })
  )
  .handler(async ({ context, data }): Promise<LeadActivityItem[]> => {
    const { supabase } = context as { supabase: any };
    const { leadId } = data;

    try {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
        const [actRes, callRes, leadRes, profilesRes] = await Promise.all([
          supabase
            .from("activities")
            .select("id, activity_type, subject, description, performed_by, created_at")
            .eq("related_to_type", "lead")
            .eq("related_to_id", leadId)
            .order("created_at", { ascending: false }),
          supabase
            .from("calls")
            .select("id, agent, intent_label, intent_score, duration_sec, sentiment, created_at")
            .eq("lead_id", leadId)
            .order("created_at", { ascending: false }),
          supabase
            .from("leads")
            .select("name, source, stage, score, created_at")
            .eq("id", leadId)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("id, full_name, email"),
        ]);

        const profileMap = new Map<string, string>();
        if (profilesRes.data) {
          for (const p of profilesRes.data as any[]) {
            profileMap.set(p.id, p.full_name || p.email?.split("@")[0] || "Platform Administrator");
          }
        }

        const items: LeadActivityItem[] = [];

        if (actRes.data && actRes.data.length > 0) {
          for (const r of actRes.data) {
            const cleanPerformer = resolvePerformerName(r.performed_by, profileMap);
            items.push({
              id: r.id,
              leadId,
              type: r.activity_type || "task",
              subject: r.subject || "Activity logged",
              description: r.description ?? null,
              performedBy: cleanPerformer,
              createdAt: r.created_at,
              exactTimestamp: formatExactTimestamp(r.created_at).exact,
              timeAgo: formatTimeAgo(r.created_at),
            });
          }
        }

        if (callRes.data && callRes.data.length > 0) {
          for (const c of callRes.data) {
            items.push({
              id: `call-${c.id}`,
              leadId,
              type: "call",
              subject: `Voice Call (${c.duration_sec ?? 0}s) · Intent: ${c.intent_label || "General"}`,
              description: `Agent: ${c.agent} · Sentiment: ${c.sentiment || "Neutral"} · Score: ${c.intent_score ?? 0}%`,
              performedBy: c.agent || "AI Voice Agent",
              createdAt: c.created_at,
              exactTimestamp: formatExactTimestamp(c.created_at).exact,
              timeAgo: formatTimeAgo(c.created_at),
            });
          }
        }

        if (leadRes.data?.created_at) {
          items.push({
            id: `inbound-${leadId}`,
            leadId,
            type: "lead_created",
            subject: "Lead Inbound Captured",
            description: `Inbound lead registered via ${leadRes.data.source || "Direct"} channel.`,
            performedBy: "Sentinel Gateway",
            createdAt: leadRes.data.created_at,
            exactTimestamp: formatExactTimestamp(leadRes.data.created_at).exact,
            timeAgo: formatTimeAgo(leadRes.data.created_at),
          });
        }

        if (items.length > 0) {
          items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          return items;
        }

        // If no rows yet in activities table for this database lead, generate rich baseline
        if (leadRes.data) {
          return getDefaultTimelineForLead({
            id: leadId,
            name: leadRes.data.name,
            source: leadRes.data.source,
            stage: leadRes.data.stage,
            score: leadRes.data.score,
            createdAt: leadRes.data.created_at,
          });
        }
      }
    } catch (e) {
      console.warn("[getLeadActivityTimeline] Timeline fetch fallback:", e);
    }

    return [];
  });

/**
 * Get lead assignment history audit trail.
 */
export const getLeadAssignmentHistory = createServerFn({ method: "GET" })
  .middleware([requireRoles(["admin", "manager", "agent", "viewer", "builder", "developer"])])
  .validator(
    z.object({
      leadId: z.string(),
    })
  )
  .handler(async ({ context, data }): Promise<AssignmentHistoryItem[]> => {
    const { supabase } = context as { supabase: any };
    const { leadId } = data;

    try {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
        const [rowsRes, profilesRes] = await Promise.all([
          supabase
            .from("activities")
            .select("id, subject, description, performed_by, created_at")
            .eq("related_to_type", "lead")
            .eq("related_to_id", leadId)
            .ilike("subject", "%assign%")
            .order("created_at", { ascending: false }),
          supabase
            .from("profiles")
            .select("id, full_name, email"),
        ]);

        const profileMap = new Map<string, string>();
        if (profilesRes.data) {
          for (const p of profilesRes.data as any[]) {
            profileMap.set(p.id, p.full_name || p.email?.split("@")[0] || "Platform Administrator");
          }
        }

        if (!rowsRes.error && rowsRes.data && rowsRes.data.length > 0) {
          return rowsRes.data.map((r: any) => ({
            id: r.id,
            leadId,
            action: r.subject,
            previousAssignee: null,
            newAssignee: r.subject.replace(/^Lead assigned to |^Assigned to |^Lead reassigned to /i, ""),
            performedBy: resolvePerformerName(r.performed_by, profileMap),
            timestamp: r.created_at,
            timeAgo: formatTimeAgo(r.created_at),
            notes: r.description,
          }));
        }
      }
    } catch (e) {
      console.warn("[getLeadAssignmentHistory] History fetch fallback:", e);
    }

    return [];
  });

/**
 * Get active team members for lead assignment
 */
export const getWorkspaceTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireRoles(["admin", "manager", "agent", "builder", "developer"])])
  .validator(
    z.object({
      leadId: z.string().uuid(),
    })
  )
  .handler(async ({ context, data }): Promise<TeamMember[]> => {
    const { supabase } = context as { supabase: any };

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, workspace_id")
      .eq("id", data.leadId)
      .maybeSingle();

    if (leadError) {
      throw new Error(`Failed to resolve lead workspace: ${leadError.message}`);
    }

    if (!lead?.workspace_id) {
      return [];
    }

    const { data: members, error: membersError } = await supabase
      .from("workspace_members")
      .select(`
        user_id,
        status,
        roles ( name )
      `)
      .eq("workspace_id", lead.workspace_id)
      .eq("status", "active");

    if (membersError) {
      throw new Error(`Failed to load workspace members: ${membersError.message}`);
    }

    const memberUserIds = (members ?? [])
      .filter(
        (m: any) =>
          m.user_id &&
          m.roles?.name === "member"
      )
      .map((m: any) => m.user_id);

    if (memberUserIds.length === 0) {
      return [];
    }

    const [
      { data: appRoleRows, error: appRoleError },
      { data: profileRows, error: profileError },
    ] = await Promise.all([
      supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", memberUserIds),
      supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .in("id", memberUserIds),
    ]);

    if (profileError) {
      throw new Error(
        `Failed to resolve workspace member profiles: ${profileError.message}`
      );
    }

    if (appRoleError) {
      throw new Error(`Failed to resolve assignable member roles: ${appRoleError.message}`);
    }

    const rolesByUser = new Map<string, Set<string>>();

    for (const row of appRoleRows ?? []) {
      if (!rolesByUser.has(row.user_id)) {
        rolesByUser.set(row.user_id, new Set<string>());
      }

      rolesByUser.get(row.user_id)!.add(row.role);
    }

    const profilesByUser = new Map<string, any>(
      (profileRows ?? []).map((profile: any) => [profile.id, profile])
    );

    return (members ?? [])
      .filter((m: any) => {
        if (!m.user_id || m.roles?.name !== "member") {
          return false;
        }

        const appRoles = rolesByUser.get(m.user_id);
        const profile = profilesByUser.get(m.user_id);

        return Boolean(
          profile &&
          appRoles &&
          (appRoles.has("agent") || appRoles.has("manager"))
        );
      })
      .map((m: any): TeamMember => {
        const profile = profilesByUser.get(m.user_id);

        const name =
          profile?.full_name ||
          profile?.email?.split("@")[0] ||
          "Team Member";

        const initials =
          name
            .split(" ")
            .filter(Boolean)
            .map((n: string) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "TM";

        const appRoles = rolesByUser.get(m.user_id);
        const displayRole = appRoles?.has("manager")
          ? "Sales Manager"
          : "Sales Executive";

        return {
          id: m.user_id,
          name,
          initials,
          role: displayRole,
          email: profile?.email,
          status: m.status,
          avatarUrl: profile?.avatar_url,
        };
      });
  });
