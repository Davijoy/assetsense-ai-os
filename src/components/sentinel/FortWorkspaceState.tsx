/**
 * SENTINEL FORT — workspace state surfaces.
 *
 * The five approved states. Each one reports EXACTLY what the server resolved.
 *
 *   ACTIVE        verified workspace + verified app_role
 *   PROVISIONING  workspace verified, authorization not granted yet
 *   AWAITING      no workspace could be safely determined
 *   UNAUTHORIZED  the module exists, this access level cannot open it
 *   ERROR         resolution failed
 *
 * NON-NEGOTIABLE: these components claim nothing the server has not granted,
 * and they never render "you have no modules" as a dead end. They are display
 * only — no state here grants, unlocks or elevates anything.
 */
import { AlertTriangle, Clock, Loader2, Lock, ShieldCheck } from "lucide-react";

export type FortSurfaceState =
  | "ACTIVE"
  | "PROVISIONING"
  | "AWAITING"
  | "UNAUTHORIZED"
  | "ERROR";

function StatePanel({
  icon,
  eyebrow,
  headline,
  body,
  children,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  eyebrow: string;
  headline: string;
  body: string;
  children?: React.ReactNode;
  tone?: "neutral" | "warn";
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-6 shadow-sm",
        tone === "warn"
          ? "border-amber-500/40 bg-amber-500/[0.04]"
          : "border-border/70 bg-card",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">{icon}</div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </div>
          <h3 className="mt-1 text-base font-semibold tracking-tight">{headline}</h3>
          <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

/**
 * ACTIVE — the workspace identity strip.
 *
 * `publicId` is CONTEXTUAL IDENTITY. It tells the user which environment they
 * are in. It is not a credential, it is never sent back as an authorization
 * claim, and editing it anywhere changes nothing.
 */
export function FortWorkspaceIdentity({
  publicId,
  name,
  isPrivate,
  role,
}: {
  publicId: string | null;
  name?: string | null;
  isPrivate?: boolean;
  role?: string | null;
}) {
  const displayId = publicId && publicId !== "PENDING" && publicId !== "WORKSPACE PENDING" ? publicId : "WORKSPACE PENDING";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          FORT WORKSPACE
        </span>
        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          ACTIVE
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-primary">
          {displayId}
        </span>
        <span className="truncate text-xs font-semibold text-foreground">
          {name || "Workspace"}
        </span>
      </div>
      {role && (
        <span className="text-[10px] font-medium text-muted-foreground capitalize">
          Role: <span className="font-semibold text-foreground">{role}</span>
        </span>
      )}
    </div>
  );
}

/** PROVISIONING — workspace resolved, authorization not granted yet. */
export function FortProvisioningState() {
  return (
    <StatePanel
      icon={<Loader2 className="h-4 w-4 animate-spin" />}
      eyebrow="Provisioning"
      headline="Provisioning your intelligence environment…"
      body="Your FORT workspace exists and your access is being provisioned. Modules appear here once an administrator grants your access level. Nothing is unlocked in the meantime."
    />
  );
}

/** AWAITING — no workspace could be safely determined. */
export function FortAwaitingState({ membershipPending }: { membershipPending?: boolean }) {
  return (
    <StatePanel
      icon={<Clock className="h-4 w-4" />}
      eyebrow="Awaiting provisioning"
      headline="Your workspace is awaiting provisioning."
      body={
        membershipPending
          ? "You have an invitation or a suspended membership pending. Your FORT access is being provisioned by an administrator — it is not created automatically."
          : "Your FORT workspace could not be determined yet. Your FORT access is being provisioned. No environment is assumed on your behalf."
      }
    />
  );
}

/** UNAUTHORIZED — the module is real; this access level cannot open it. */
export function FortUnauthorizedState({ label }: { label?: string }) {
  return (
    <StatePanel
      tone="warn"
      icon={<Lock className="h-4 w-4" />}
      eyebrow="Not available"
      headline={
        label
          ? `${label} is not available for your current access level.`
          : "This module is not available for your current access level."
      }
      body="Server-side authorization decides access. Request the access level you need from an administrator."
    />
  );
}

/** ERROR — resolution failed or authorization mismatch. Fails closed. */
export function FortErrorState({ reason, onRetry }: { reason?: string; onRetry?: () => void }) {
  const isMismatch = reason === "ROLE_MISMATCH";
  return (
    <StatePanel
      tone="warn"
      icon={<AlertTriangle className="h-4 w-4" />}
      eyebrow={isMismatch ? "Authorization Mismatch" : "Resolution failed"}
      headline={
        isMismatch
          ? "Workspace role and application role synchronization required."
          : "We couldn't resolve your FORT workspace."
      }
      body={
        isMismatch
          ? "Your workspace membership role and application role do not match. Contact a platform administrator to reconcile your account provisioning."
          : "Please try again. Nothing was unlocked — access always fails closed when it cannot be verified."
      }
    >
      <button
        type="button"
        onClick={() => (onRetry ? onRetry() : window.location.reload())}
        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        Try again
      </button>
    </StatePanel>
  );
}

/**
 * The workspace-level surface for a non-ACTIVE state. Returns null for ACTIVE
 * so the caller renders its normal module experience.
 */
export function FortWorkspaceStateSurface({
  status,
  reason,
  membershipPending,
}: {
  status: FortSurfaceState;
  reason?: string;
  membershipPending?: boolean;
}) {
  switch (status) {
    case "PROVISIONING":
      return <FortProvisioningState />;
    case "AWAITING":
      return <FortAwaitingState membershipPending={membershipPending} />;
    case "ERROR":
      return <FortErrorState reason={reason} />;
    case "UNAUTHORIZED":
      return <FortUnauthorizedState />;
    default:
      return null;
  }
}

/** Small verified-authorization affordance for the ACTIVE header. */
export function FortVerifiedBadge({ roleCount }: { roleCount: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">
      <ShieldCheck className="h-3 w-3" /> server-verified · {roleCount}{" "}
      {roleCount === 1 ? "role" : "roles"}
    </span>
  );
}
