import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/app/users")({
  head: () => ({ meta: [{ title: "Users & Roles — Sentinel Fort" }] }),
  component: UsersPage,
});

const ROLES: AppRole[] = ["admin", "manager", "agent", "builder", "developer", "viewer"];

type Row = {
  id: string;
  email: string | null;
  full_name: string | null;
  roles: AppRole[];
  created_at: string;
};

function UsersPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading, user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate({ to: "/app/crm" });
  }, [authLoading, isAdmin, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, created_at").order("created_at"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const byUser = new Map<string, AppRole[]>();
    (roleRows ?? []).forEach((r: any) => {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role);
      byUser.set(r.user_id, arr);
    });
    setRows(
      ((profiles ?? []) as any[]).map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        created_at: p.created_at,
        roles: byUser.get(p.id) ?? [],
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const setRole = async (userId: string, newRole: AppRole) => {
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) return toast.error(delErr.message);
    const { error: insErr } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: newRole });
    if (insErr) return toast.error(insErr.message);
    toast.success("Role updated");
    load();
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> Admin
        </div>
        <h1 className="mt-1 font-display text-3xl">Users & Roles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Promote, demote and review every account's access to the Sentinel Fort console.
        </p>
      </header>

      <div className="rounded-xl border border-border/60 bg-surface">
        <div className="grid grid-cols-12 border-b border-border/60 px-6 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <div className="col-span-5">User</div>
          <div className="col-span-4">Email</div>
          <div className="col-span-3 text-right">Role</div>
        </div>
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-8 text-sm text-muted-foreground">No users yet.</div>
        ) : (
          rows.map((r) => {
            const primary = (r.roles[0] ?? "viewer") as AppRole;
            return (
              <div key={r.id} className="grid grid-cols-12 items-center border-b border-border/40 px-6 py-3 text-sm last:border-0">
                <div className="col-span-5">
                  <div className="font-medium">
                    {r.full_name ?? r.email?.split("@")[0] ?? "—"}
                    {r.id === user?.id && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                        you
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Joined {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="col-span-4 truncate text-muted-foreground">{r.email}</div>
                <div className="col-span-3 flex justify-end">
                  <Select value={primary} onValueChange={(v) => setRole(r.id, v as AppRole)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role} className="capitalize">
                          {role}
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

      <div className="rounded-xl border border-border/60 bg-surface/60 p-6">
        <h2 className="font-display text-lg">Role access matrix</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm">
          <div><span className="text-primary">Admin</span> — full access incl. Governance, Branding, Users.</div>
          <div><span className="text-primary">Manager</span> — every workspace & KIE module, no admin tools.</div>
          <div><span className="text-primary">Agent</span> — CRM, Leads, Marketplace, Voice, Marketing, Document Chat, Deal Rooms.</div>
          <div><span className="text-primary">Viewer</span> — read-only dashboards: CRM, Marketplace, Intelligence, Market.</div>
          <div><span className="text-primary">Builder</span> — Marketplace, Inventory, Documents, Deal Rooms, Workflows, Market Intelligence.</div>
          <div><span className="text-primary">Developer</span> — Marketplace, Documents, Workflows, Inventory, Graph, Deal Rooms, Market Intelligence.</div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>
    </div>
  );
}