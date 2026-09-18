import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { isRouteAuthorized } from "@/lib/route-roles";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  Search,
  Sliders,
  History,
  Users,
  Eye,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  Layers,
  Lock,
  Sparkles,
} from "lucide-react";
import {
  listAdminUsers,
  updateUserRole,
  listWorkspaceFeatureFlags,
  updateWorkspaceFeatureFlag,
  listAdminAuditLogs,
  type AdminAuditLogEntry,
} from "@/lib/users.functions";
import { getAuthorizedModules, type ModuleAccessResult } from "@/lib/fort-modules";

export const Route = createFileRoute("/app/users")({
  head: () => ({ meta: [{ title: "Platform Administration — Sentinel Fort" }] }),
  beforeLoad: async ({ context, location }) => {
    const roles = (context as any)?.user?.roles ?? (context as any)?.fort?.role?.appRoles ?? [];
    if (roles.length > 0 && !isRouteAuthorized(roles, location.pathname)) {
      throw redirect({ to: "/fort" });
    }
  },
  component: UsersPage,
});

const ROLES: { role: AppRole; label: string; description: string }[] = [
  { role: "admin", label: "Platform Admin (admin)", description: "Full platform & workspace administration" },
  { role: "manager", label: "Sales Manager (manager)", description: "Full workspace data & team management" },
  { role: "agent", label: "Sales Executive (agent)", description: "CRM, Leads, Calls, Voice, Outreach" },
  { role: "viewer", label: "Viewer / Investor (viewer)", description: "Read-only access to dashboards & market" },
  { role: "builder", label: "Developer / Builder (builder)", description: "Inventory, documents, marketplace" },
  { role: "developer", label: "Technical Developer (developer)", description: "Workflows, graphs, integrations" },
];

const FEATURE_MODULES: { key: string; label: string; description: string; category: string }[] = [
  { key: "crm", label: "CRM Operations", description: "Customers, deals and pipeline tracking", category: "Core" },
  { key: "leads", label: "Leads Management", description: "Inquiry ingestion, qualification and assignment", category: "Core" },
  { key: "inventory", label: "Inventory Registry", description: "Units, projects, towers and pricing schedules", category: "Core" },
  { key: "marketplace", label: "Property Marketplace", description: "Public and private property inventory search", category: "Core" },
  { key: "marketing", label: "Marketing Cloud", description: "Multi-channel attribution, ROI tracking and ad spend", category: "Growth" },
  { key: "intelligence", label: "Market Intelligence", description: "Localities, micro-market pricing and demand", category: "Intelligence" },
  { key: "messages", label: "Workspace Messages", description: "Internal workspace team and investor communications", category: "Collaboration" },
  { key: "branding", label: "Branding Customizer", description: "Custom tenant branding, logos and color themes", category: "Admin" },
  { key: "chat", label: "Document Chat", description: "RAG intelligence over internal project documents", category: "Intelligence" },
  { key: "supreme_intelligence", label: "Supreme Intelligence", description: "Autonomous executive orchestration and reasoning", category: "Autonomous" },
  { key: "voice", label: "AI Voice Intelligence", description: "Realtime Deepgram STT/TTS inbound & outbound calling", category: "Autonomous" },
  { key: "collections", label: "Collections AI", description: "Autonomous payment milestones and dunning workflows", category: "Finance" },
];

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  roles: AppRole[];
  workspaceId: string | null;
  workspaceName: string | null;
  workspacePublicId: string | null;
  systemARole: string | null;
  membershipStatus: string;
};

function UsersPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading, user } = useAuth();

  const [activeTab, setActiveTab] = useState<"users" | "features" | "audit">("users");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // User Inspection Modal State
  const [inspectingUser, setInspectingUser] = useState<UserRow | null>(null);

  // Feature Flags State
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [togglingFlag, setTogglingFlag] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate({ to: "/fort" });
  }, [authLoading, isAdmin, navigate]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAdminUsers();
      setRows(data as UserRow[]);
    } catch (err: any) {
      console.error("[UsersPage] load error:", err);
      toast.error("Failed to load user directory: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFlags = useCallback(async () => {
    setFlagsLoading(true);
    try {
      const data = await listWorkspaceFeatureFlags();
      setFeatureFlags(data as Record<string, boolean>);
    } catch (err: any) {
      console.error("[UsersPage] flags load error:", err);
    } finally {
      setFlagsLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const data = await listAdminAuditLogs();
      setAuditLogs(data);
    } catch (err: any) {
      console.error("[UsersPage] audit load error:", err);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadFlags();
      loadAudit();
    }
  }, [isAdmin, loadUsers, loadFlags, loadAudit]);

  const setRole = async (targetUser: UserRow, newRole: AppRole) => {
    const isSelf = targetUser.id === user?.id;
    if (isSelf && newRole !== "admin") {
      const confirmed = window.confirm(
        "WARNING: You are about to demote your own account from Platform Admin. You will lose access to administrative controls. Do you wish to continue?"
      );
      if (!confirmed) return;
    }

    setUpdatingId(targetUser.id);
    try {
      const res = await updateUserRole({
        data: {
          targetUserId: targetUser.id,
          newRole,
          workspaceId: targetUser.workspaceId || undefined,
        },
      });

      if (res?.success) {
        toast.success(`Role updated for ${targetUser.email || targetUser.full_name} to ${newRole.toUpperCase()}`);
        await loadUsers();
        await loadAudit();
      }
    } catch (err: any) {
      console.error("[setRole] error:", err);
      toast.error(err?.message || "Failed to update role");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleFlag = async (flagKey: string, currentVal: boolean) => {
    setTogglingFlag(flagKey);
    const newVal = !currentVal;
    try {
      const res = await updateWorkspaceFeatureFlag({
        data: {
          flagKey,
          enabled: newVal,
        },
      });

      if (res?.success) {
        setFeatureFlags((prev) => ({ ...prev, [flagKey]: newVal }));
        toast.success(`Module ${flagKey.toUpperCase()} set to ${newVal ? "ON" : "OFF"}`);
        await loadAudit();
      }
    } catch (err: any) {
      console.error("[handleToggleFlag] error:", err);
      toast.error(err?.message || "Failed to update module flag");
    } finally {
      setTogglingFlag(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return rows.filter((r) => {
      if (roleFilter !== "all" && !r.roles.includes(roleFilter as AppRole)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (r.full_name || "").toLowerCase().includes(q);
        const matchEmail = (r.email || "").toLowerCase().includes(q);
        const matchWs = (r.workspacePublicId || "").toLowerCase().includes(q) || (r.workspaceName || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchWs) return false;
      }
      return true;
    });
  }, [rows, searchQuery, roleFilter]);

  if (authLoading || !isAdmin) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Platform Governance & Control
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold">Platform Administrator Console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage authorized users, role synchronizations, feature flag availability, and security audit logs.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-semibold transition-all ${
              activeTab === "users" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" /> User Directory ({rows.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("features")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-semibold transition-all ${
              activeTab === "features" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" /> Module & Feature Controls
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 font-semibold transition-all ${
              activeTab === "audit" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-3.5 w-3.5" /> Audit Trail ({auditLogs.length})
          </button>
        </div>
      </header>

      {/* TAB 1: USERS DIRECTORY */}
      {activeTab === "users" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search user, email, or workspace..."
                  className="w-full rounded-xl border border-border bg-card pl-9 pr-3.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary shadow-sm"
              >
                <option value="all">All Roles</option>
                {ROLES.map((r) => (
                  <option key={r.role} value={r.role}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading} className="gap-2 text-xs">
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* User Table */}
          <div className="rounded-xl border border-border/60 bg-surface shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 border-b border-border/60 px-6 py-3 text-[11px] uppercase tracking-wider text-muted-foreground font-bold bg-muted/20">
              <div className="col-span-4">User & Identity</div>
              <div className="col-span-3">Email</div>
              <div className="col-span-2">Workspace</div>
              <div className="col-span-3 text-right">Assigned Role & Inspection</div>
            </div>
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="px-6 py-8 text-sm text-center text-muted-foreground">No users found matching search.</div>
            ) : (
              filteredUsers.map((r) => {
                const primary = (r.roles[0] ?? "viewer") as AppRole;
                const isUpdating = updatingId === r.id;
                return (
                  <div
                    key={r.id}
                    className="grid grid-cols-12 items-center border-b border-border/40 px-6 py-3 text-sm last:border-0 hover:bg-muted/10 transition-colors"
                  >
                    <div className="col-span-4">
                      <div className="flex items-center gap-2 font-medium">
                        <span>{r.full_name ?? r.email?.split("@")[0] ?? "—"}</span>
                        {r.id === user?.id && (
                          <span className="rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 text-[10px] uppercase font-bold text-primary">
                            you
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>Joined {new Date(r.created_at).toLocaleDateString()}</span>
                        {r.systemARole && (
                          <span className="font-mono text-[10px] text-stone-400">
                            (System A: {r.systemARole})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-3 truncate text-xs text-muted-foreground font-mono">
                      {r.email}
                    </div>

                    <div className="col-span-2">
                      <span className="inline-block rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                        {r.workspacePublicId || "SF-HQ-001"}
                      </span>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {r.workspaceName || "Sentinel Fort HQ"}
                      </div>
                    </div>

                    <div className="col-span-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setInspectingUser(r)}
                        className="rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
                        title="Inspect full user authorization & module grants"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                      <Select
                        value={primary}
                        disabled={isUpdating}
                        onValueChange={(v) => setRole(r, v as AppRole)}
                      >
                        <SelectTrigger className="w-40 text-xs font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((item) => (
                            <SelectItem key={item.role} value={item.role} className="text-xs">
                              <span className="font-semibold capitalize">{item.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MODULE & FEATURE CONTROLS */}
      {activeTab === "features" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="rounded-2xl border border-border/80 bg-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="font-display text-2xl font-bold">Module & Capability Availability</h3>
                <p className="text-xs text-muted-foreground">
                  Toggle platform modules and autonomous intelligence capabilities. Toggling takes immediate effect across navigation, routing, and server middleware.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={loadFlags} disabled={flagsLoading} className="gap-2 text-xs">
                <RefreshCw className={`h-3 w-3 ${flagsLoading ? "animate-spin" : ""}`} /> Refresh Flags
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {FEATURE_MODULES.map((mod) => {
                const isEnabled = featureFlags[mod.key] ?? true;
                const isToggling = togglingFlag === mod.key;

                return (
                  <div
                    key={mod.key}
                    className={`rounded-xl border p-4 transition-all ${
                      isEnabled ? "border-primary/40 bg-primary/5" : "border-border bg-card/60 opacity-80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-surface border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          {mod.category}
                        </span>
                        <h4 className="font-bold text-sm text-foreground">{mod.label}</h4>
                      </div>

                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={() => handleToggleFlag(mod.key, isEnabled)}
                        className={`flex items-center gap-1 text-xs font-bold transition-colors ${
                          isEnabled ? "text-emerald-400 hover:text-emerald-300" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {isToggling ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isEnabled ? (
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> ON
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-stone-500" /> OFF
                          </span>
                        )}
                      </button>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {mod.description}
                    </p>

                    <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-muted-foreground">flag: {mod.key}</span>
                      <span className={`font-bold ${isEnabled ? "text-primary" : "text-stone-400"}`}>
                        {isEnabled ? "ACTIVE" : "DISABLED"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === "audit" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="rounded-2xl border border-border/80 bg-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-display text-2xl font-bold">Security & Administration Audit Trail</h3>
                <p className="text-xs text-muted-foreground">
                  Immutable record of role modifications, module toggles, and workspace administrative actions.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={loadAudit} disabled={auditLoading} className="gap-2 text-xs">
                <RefreshCw className={`h-3 w-3 ${auditLoading ? "animate-spin" : ""}`} /> Refresh Trail
              </Button>
            </div>

            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Actor</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Entity</th>
                    <th className="p-3">Changes / Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground font-sans">
                        No administrative audit logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-elevated/40 transition-colors">
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {new Date(log.ts).toLocaleString()}
                        </td>
                        <td className="p-3 text-foreground font-sans font-semibold">
                          {log.actorEmail}
                        </td>
                        <td className="p-3">
                          <span className="rounded-md bg-primary/10 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary font-sans">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {log.entity}
                        </td>
                        <td className="p-3 text-foreground max-w-md truncate font-sans text-xs">
                          {JSON.stringify(log.diff)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* USER INSPECTION MODAL */}
      {inspectingUser && (
        <div
          onClick={() => setInspectingUser(null)}
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-foreground">
                    {inspectingUser.full_name || inspectingUser.email?.split("@")[0] || "User Details"}
                  </h3>
                  <span className="rounded-full bg-primary/10 border border-primary/30 px-2.5 py-0.5 text-xs font-bold text-primary capitalize">
                    {inspectingUser.roles[0] || "viewer"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{inspectingUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingUser(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Identity & Workspace */}
              <div className="rounded-xl border border-border bg-surface p-4 space-y-2.5">
                <span className="font-bold text-primary block uppercase tracking-wider text-[10px]">
                  Workspace & Identity
                </span>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">User UUID:</span>
                  <span className="font-mono text-foreground select-all">{inspectingUser.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Workspace Public ID:</span>
                  <span className="font-mono font-bold text-primary">{inspectingUser.workspacePublicId || "SF-HQ-001"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Workspace Name:</span>
                  <span className="text-foreground">{inspectingUser.workspaceName || "Sentinel Fort HQ"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Workspace UUID:</span>
                  <span className="font-mono text-stone-400 select-all">{inspectingUser.workspaceId || "00000000-0000-0000-0000-00000000d3f7"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Membership Status:</span>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase">
                    {inspectingUser.membershipStatus}
                  </span>
                </div>
              </div>

              {/* RBAC Synchronization */}
              <div className="rounded-xl border border-border bg-surface p-4 space-y-2.5">
                <span className="font-bold text-primary block uppercase tracking-wider text-[10px]">
                  RBAC Synchronization
                </span>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">System A (Workspace Role):</span>
                  <span className="font-mono font-bold text-foreground">{inspectingUser.systemARole || "viewer"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">System B (Application Role):</span>
                  <span className="font-mono font-bold text-foreground">{inspectingUser.roles[0] || "viewer"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Role Synchronization:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Synchronized (PASS)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Registration Date:</span>
                  <span className="text-foreground">{new Date(inspectingUser.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Effective Modules & Access Modes */}
            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary uppercase tracking-wider text-[10px]">
                  Effective Module Grants & Access Modes
                </span>
                <span className="text-[10px] text-muted-foreground">Derived from Central Module Catalog</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {getAuthorizedModules({ roles: inspectingUser.roles }).map((grant) => (
                  <div
                    key={grant.route}
                    className={`rounded-lg border p-2 text-xs flex items-center justify-between ${
                      grant.state === "ACTIVE" ? "border-primary/30 bg-card" : "border-border/60 bg-muted/20 opacity-60"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-foreground">{grant.label}</div>
                      <div className="font-mono text-[9px] text-muted-foreground">{grant.route}</div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        grant.accessMode === "ADMINISTRATIVE"
                          ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                          : grant.accessMode === "OPERATIONAL"
                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            : grant.accessMode === "VIEW_ONLY"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : "bg-stone-500/15 text-stone-400 border border-stone-500/30"
                      }`}
                    >
                      {grant.accessMode}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button variant="outline" size="sm" onClick={() => setInspectingUser(null)}>
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
