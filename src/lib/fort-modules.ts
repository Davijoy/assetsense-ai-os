/**
 * SENTINEL FORT — capability module catalog & central module authorization authority.
 *
 * Maps existing platform module route-paths to card copy + icons, role permissions,
 * categories, feature flags, and access modes (VIEW_ONLY / OPERATIONAL / ADMINISTRATIVE).
 *
 * Provides pure derivation functions:
 *   - getModuleAccess(context, route) -> ModuleAccessResult
 *   - getAuthorizedModules(context) -> ModuleAccessResult[]
 *
 * Nothing here creates or widens access — each route's own beforeLoad gate and server
 * functions remain authoritative, and RLS bounds data at the PostgreSQL layer.
 */
import {
  BarChart3,
  Building2,
  Command,
  FileText,
  Globe2,
  Handshake,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  Network,
  Package,
  PhoneCall,
  ShieldAlert,
  Sparkles,
  Users,
  Workflow,
  GitBranch,
  MessageSquareText,
  Palette,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/hooks/use-auth";

export type AccessMode =
  | "VIEW_ONLY"
  | "OPERATIONAL"
  | "ADMINISTRATIVE"
  | "LOCKED"
  | "UNAVAILABLE";

export type ModuleCategory = "core" | "intelligence" | "admin";

export type ModuleAccessState = "ACTIVE" | "LOCKED" | "UNAVAILABLE";

export interface ModuleCard {
  route: string;
  label: string;
  description: string;
  icon: LucideIcon;
  roles: readonly AppRole[];
  category?: ModuleCategory;
  featureFlag?: string;
  roleAccessModes?: Partial<Record<AppRole, "VIEW_ONLY" | "OPERATIONAL" | "ADMINISTRATIVE">>;
}

export interface ModuleEvaluationContext {
  roles: readonly string[];
  featureFlags?: Record<string, boolean> | null;
  workspaceStatus?: string | null;
}

export interface ModuleAccessResult {
  route: string;
  state: ModuleAccessState;
  accessMode: AccessMode;
  label: string;
  description: string;
  category?: ModuleCategory;
  featureFlag?: string;
  enabled: boolean;
}

export const MODULE_CATALOG: Record<string, ModuleCard> = {
  "/app/crm": {
    route: "/app/crm",
    label: "CRM",
    description: "Customers, deals and pipeline",
    icon: LayoutDashboard,
    roles: ["admin", "manager", "agent", "viewer"],
    category: "core",
    featureFlag: "crm",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
      agent: "OPERATIONAL",
      viewer: "VIEW_ONLY",
    },
  },
  "/app/leads": {
    route: "/app/leads",
    label: "Leads",
    description: "Capture and qualify enquiries",
    icon: Users,
    roles: ["admin", "manager", "agent", "viewer"],
    category: "core",
    featureFlag: "crm",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
      agent: "OPERATIONAL",
      viewer: "VIEW_ONLY",
    },
  },
  "/app/marketplace": {
    route: "/app/marketplace",
    label: "Marketplace",
    description: "Properties and listings",
    icon: Building2,
    roles: ["admin", "manager", "agent", "viewer", "builder", "developer"],
    category: "core",
    featureFlag: "marketplace",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
      agent: "OPERATIONAL",
      viewer: "VIEW_ONLY",
      builder: "OPERATIONAL",
      developer: "OPERATIONAL",
    },
  },
  "/app/inventory": {
    route: "/app/inventory",
    label: "Inventory",
    description: "Units, projects and availability",
    icon: Package,
    roles: ["admin", "manager", "builder", "developer"],
    category: "core",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
      builder: "OPERATIONAL",
      developer: "OPERATIONAL",
    },
  },
  "/app/market": {
    route: "/app/market",
    label: "Market Intelligence",
    description: "Localities, pricing and demand",
    icon: Globe2,
    roles: ["admin", "manager", "viewer", "builder", "developer"],
    category: "intelligence",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
      viewer: "VIEW_ONLY",
      builder: "VIEW_ONLY",
      developer: "VIEW_ONLY",
    },
  },
  "/app/bi": {
    route: "/app/bi",
    label: "Business Intelligence",
    description: "Executive metrics and reports",
    icon: BarChart3,
    roles: ["admin", "manager", "viewer", "builder", "developer"],
    category: "intelligence",
    featureFlag: "bi",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
      viewer: "VIEW_ONLY",
      builder: "VIEW_ONLY",
      developer: "VIEW_ONLY",
    },
  },
  "/app/command": {
    route: "/app/command",
    label: "Executive Command",
    description: "Cross-domain command surface",
    icon: Command,
    roles: ["admin", "manager"],
    category: "intelligence",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
    },
  },
  "/app/messages": {
    route: "/app/messages",
    label: "Workspace Messaging",
    description: "Internal communications, executive & support channels",
    icon: MessageSquareText,
    roles: ["admin", "manager", "agent", "viewer", "builder", "developer"],
    category: "core",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "OPERATIONAL",
      agent: "OPERATIONAL",
      viewer: "OPERATIONAL",
      builder: "OPERATIONAL",
      developer: "OPERATIONAL",
    },
  },
  "/app/voice": {
    route: "/app/voice",
    label: "AI Voice",
    description: "Call handling and follow-ups",
    icon: PhoneCall,
    roles: ["admin", "manager", "agent"],
    category: "intelligence",
    featureFlag: "voice",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
      agent: "OPERATIONAL",
    },
  },
  "/app/marketing": {
    route: "/app/marketing",
    label: "Marketing",
    description: "Campaigns and outreach",
    icon: Megaphone,
    roles: ["admin", "manager"],
    category: "intelligence",
    featureFlag: "marketing",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
    },
  },
  "/app/supreme-intelligence": {
    route: "/app/supreme-intelligence",
    label: "Supreme Intelligence",
    description: "Reasoning across every domain",
    icon: Sparkles,
    roles: ["admin", "manager", "viewer", "builder", "developer"],
    category: "intelligence",
    featureFlag: "supreme_intelligence",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
      viewer: "VIEW_ONLY",
      builder: "VIEW_ONLY",
      developer: "VIEW_ONLY",
    },
  },
  "/app/dealrooms": {
    route: "/app/dealrooms",
    label: "Deal Rooms",
    description: "Work deals to close",
    icon: Network,
    roles: ["admin", "manager", "agent", "builder", "developer"],
    category: "core",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
      agent: "OPERATIONAL",
      builder: "OPERATIONAL",
      developer: "OPERATIONAL",
    },
  },
  "/app/documents": {
    route: "/app/documents",
    label: "Documents",
    description: "Lead & deal transaction documents",
    icon: FileText,
    roles: ["admin", "manager", "agent", "builder", "developer"],
    category: "core",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
      agent: "OPERATIONAL",
      builder: "OPERATIONAL",
      developer: "OPERATIONAL",
    },
  },
  "/app/risk": {
    route: "/app/risk",
    label: "Risk Center",
    description: "Business and portfolio risk",
    icon: ShieldAlert,
    roles: ["admin", "manager"],
    category: "intelligence",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
    },
  },
  "/app/users": {
    route: "/app/users",
    label: "Users",
    description: "Workspace members and access",
    icon: Users,
    roles: ["admin", "manager"],
    category: "admin",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
    },
  },
  "/app/governance": {
    route: "/app/governance",
    label: "Governance",
    description: "Platform policy and controls",
    icon: ShieldAlert,
    roles: ["admin", "manager"],
    category: "admin",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
    },
  },
  "/app/customer": {
    route: "/app/customer",
    label: "Customers",
    description: "Prospects and relationships",
    icon: Handshake,
    roles: ["admin", "manager", "agent", "viewer"],
    category: "core",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
      agent: "OPERATIONAL",
      viewer: "VIEW_ONLY",
    },
  },
  "/app/salesintel": {
    route: "/app/salesintel",
    label: "Sales Intelligence",
    description: "Sales velocity and pricing",
    icon: BarChart3,
    roles: ["admin", "manager", "builder", "developer"],
    category: "intelligence",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
      builder: "VIEW_ONLY",
      developer: "VIEW_ONLY",
    },
  },
  "/app/recommendations": {
    route: "/app/recommendations",
    label: "Recommendations",
    description: "Next-best action engine",
    icon: Lightbulb,
    roles: ["admin", "manager", "builder"],
    category: "intelligence",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
      builder: "OPERATIONAL",
    },
  },
  "/app/workflows": {
    route: "/app/workflows",
    label: "Workflows",
    description: "Autonomous orchestration",
    icon: Workflow,
    roles: ["admin", "manager", "builder", "developer"],
    category: "intelligence",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
      builder: "OPERATIONAL",
      developer: "OPERATIONAL",
    },
  },
  "/app/copilot": {
    route: "/app/copilot",
    label: "Copilot",
    description: "Ask anything across data",
    icon: MessageSquareText,
    roles: ["admin", "manager", "builder", "developer"],
    category: "intelligence",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
      builder: "OPERATIONAL",
      developer: "OPERATIONAL",
    },
  },
  "/app/docchat": {
    route: "/app/docchat",
    label: "Document Chat",
    description: "Chat over your documents",
    icon: FileText,
    roles: ["admin", "manager", "builder", "developer"],
    category: "intelligence",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
      builder: "OPERATIONAL",
      developer: "OPERATIONAL",
    },
  },
  "/app/kie": {
    route: "/app/kie",
    label: "Knowledge & Insights",
    description: "Cross-domain knowledge graph",
    icon: Globe2,
    roles: ["admin", "manager", "builder", "developer"],
    category: "intelligence",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
      manager: "ADMINISTRATIVE",
      builder: "OPERATIONAL",
      developer: "OPERATIONAL",
    },
  },
  "/app/settings/branding": {
    route: "/app/settings/branding",
    label: "Branding & Theme",
    description: "Tenant logos, colors and typography",
    icon: Palette,
    roles: ["admin"],
    category: "admin",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
    },
  },
  "/app/settings/integrations": {
    route: "/app/settings/integrations",
    label: "Integrations & Sockets",
    description: "Facebook, webhooks, WhatsApp and real-time sockets",
    icon: Network,
    roles: ["admin"],
    category: "admin",
    roleAccessModes: {
      admin: "ADMINISTRATIVE",
    },
  },
};

import { ROUTE_ROLES } from "@/lib/route-roles";

/**
 * Pure authorization evaluation for a single module route against caller context.
 */
export function getModuleAccess(
  context: ModuleEvaluationContext,
  route: string,
): ModuleAccessResult {
  const card = MODULE_CATALOG[route];
  if (!card) {
    const allowed = ROUTE_ROLES[route];
    if (!allowed) {
      return {
        route,
        state: "UNAVAILABLE",
        accessMode: "UNAVAILABLE",
        label: route,
        description: "",
        enabled: false,
      };
    }
    const matched = allowed.some((r) => context.roles.includes(r));
    return {
      route,
      state: matched ? "ACTIVE" : "LOCKED",
      accessMode: matched ? "OPERATIONAL" : "LOCKED",
      label: route,
      description: "",
      enabled: matched,
    };
  }

  // Feature flag enforcement
  if (card.featureFlag && context.featureFlags && context.featureFlags[card.featureFlag] === false) {
    return {
      route,
      state: "LOCKED",
      accessMode: "LOCKED",
      label: card.label,
      description: card.description,
      category: card.category,
      featureFlag: card.featureFlag,
      enabled: false,
    };
  }

  const userRoles = context.roles;
  const matched = card.roles.some((r) => userRoles.includes(r));

  if (!matched) {
    return {
      route,
      state: "LOCKED",
      accessMode: "LOCKED",
      label: card.label,
      description: card.description,
      category: card.category,
      featureFlag: card.featureFlag,
      enabled: false,
    };
  }

  // Resolve access mode based on highest matching role priority
  let accessMode: AccessMode = "OPERATIONAL";
  if (card.roleAccessModes) {
    const rolePriority: AppRole[] = ["admin", "manager", "builder", "developer", "agent", "viewer"];
    for (const r of rolePriority) {
      if (userRoles.includes(r) && card.roleAccessModes[r]) {
        accessMode = card.roleAccessModes[r]!;
        break;
      }
    }
  }

  return {
    route,
    state: "ACTIVE",
    accessMode,
    label: card.label,
    description: card.description,
    category: card.category,
    featureFlag: card.featureFlag,
    enabled: true,
  };
}

/**
 * Returns all active, authorized modules for the given context.
 */
export function getAuthorizedModules(context: ModuleEvaluationContext): ModuleAccessResult[] {
  return Object.keys(MODULE_CATALOG)
    .map((route) => getModuleAccess(context, route))
    .filter((res) => res.state === "ACTIVE");
}

/** Cards for a fort's modules, excluding routes the caller cannot reach. */
export function authorizedModuleCards(
  modules: readonly string[],
  roles: readonly string[],
): ModuleCard[] {
  return modules
    .map((m) => MODULE_CATALOG[m])
    .filter((card): card is ModuleCard => Boolean(card))
    .filter((card) => roles.some((r) => card.roles.includes(r as AppRole)));
}

/**
 * Partition a fort's modules into ACTIVE (authorized → rendered as links) and
 * LOCKED (exists, but this account's DB-derived roles do not permit it → shown
 * as an inert "Available with appropriate access" card). Unknown routes are
 * dropped entirely — never advertised. This is display filtering ONLY: each
 * route's own beforeLoad gate remains the authority.
 */
export function partitionModules(
  modules: readonly string[],
  roles: readonly string[],
): { active: ModuleCard[]; locked: ModuleCard[] } {
  const active: ModuleCard[] = [];
  const locked: ModuleCard[] = [];
  for (const m of modules) {
    const card = MODULE_CATALOG[m];
    if (!card) continue; // not a real platform module — never advertise
    if (roles.some((r) => card.roles.includes(r as AppRole))) active.push(card);
    else locked.push(card);
  }
  return { active, locked };
}

// =============================================================
// RBAC × FORT ACCESS MATRIX (pure, deterministic)
// =============================================================

export interface FortAccessEntry {
  route: string;
  label: string;
  description: string;
  state: ModuleAccessState;
}

/**
 * Per-module access state:
 *   ACTIVE      — the DB-derived role permits the module's actual route.
 *   LOCKED      — the module is real, but these roles do not permit it.
 *   UNAVAILABLE — not in the authoritative catalog (not applicable / unknown).
 *
 * Unknown routes are reported UNAVAILABLE — NEVER advertised as accessible.
 * This matrix is advisory display data; route gates + RLS remain the sole
 * authorization authority.
 */
export function moduleAccessState(route: string, roles: readonly string[]): ModuleAccessState {
  const card = MODULE_CATALOG[route];
  if (!card) return "UNAVAILABLE";
  return roles.some((r) => card.roles.includes(r as AppRole)) ? "ACTIVE" : "LOCKED";
}

/** Full ordered access matrix for a fort's module list. */
export function buildFortAccessMatrix(
  modules: readonly string[],
  roles: readonly string[],
): FortAccessEntry[] {
  return modules.map((route) => {
    const card = MODULE_CATALOG[route];
    return {
      route,
      label: card?.label ?? route,
      description: card?.description ?? "",
      state: moduleAccessState(route, roles),
    };
  });
}

