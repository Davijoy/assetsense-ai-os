/**
 * SUPREME AGENT KERNEL — Execution Engine + Verification
 * Sentinel Fort — runs plan steps through capability registry.
 */

import { AGENT_CAPABILITIES, checkCapabilityRoles } from "./supreme-agent-capabilities";
import type { AgentIntent } from "./supreme-agent-intent";

// Execute a single step through the capability registry
async function executeStep(
  step: { id: string; capability: string; arguments: any },
  supabase: any,
  workspaceId: string,
  userRoles: string[],
  dryRun: boolean
): Promise<{ id: string; capability: string; status: string; result?: any; error?: string }> {
  const capability = AGENT_CAPABILITIES[step.capability];
  if (!capability) {
    return { id: step.id, capability: step.capability, status: "failed", error: `capability_not_registered:${step.capability}` };
  }

  // Role check
  const hasRole = checkCapabilityRoles(capability.requiredRoles, userRoles);
  if (!hasRole) {
    return { id: step.id, capability: step.capability, status: "failed", error: "insufficient_roles" };
  }

  // Dry-run skip check
  if (dryRun && !capability.dryRunSupport) {
    return { id: step.id, capability: step.capability, status: "completed", result: { dryRunSkipped: true } };
  }

  try {
    const handlerResult = await capability.handler(step.arguments, supabase, workspaceId, dryRun);
    return { id: step.id, capability: step.capability, status: "completed", result: handlerResult };
  } catch (err: any) {
    console.error(`[Supreme Agent] Step ${step.id} failed:`, err);
    return { id: step.id, capability: step.capability, status: "failed", error: err.message ?? "execution_error" };
  }
}

// Execute full plan step by step
export async function executePlan(plan: { id: string; steps: any[]; intent: AgentIntent }, workspaceId: string, userId: string, userRoles: string[], supabase: any, dryRun: boolean = false) {
  const executionId = `exec-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const updatedSteps: any[] = [];
  const capabilitiesInvoked: string[] = [];

  for (const step of plan.steps) {
    const updated = await executeStep(step, supabase, workspaceId, userRoles, dryRun);
    updatedSteps.push(updated);
    if (updated.capability && !capabilitiesInvoked.includes(updated.capability)) {
      capabilitiesInvoked.push(updated.capability);
    }
    if (updated.status === "failed" && updated.error?.includes("unauthorized")) break;
  }

  // Verification
  const confirmedResults: any[] = [];
  const discrepancies: string[] = [];
  for (const step of updatedSteps) {
    if (step.status === "completed" && step.result) confirmedResults.push(step.result);
    else if (step.status === "failed") discrepancies.push(`step-${step.id}: ${step.error}`);
  }

  let verificationStatus: "verified" | "partial" | "failed" = "partial";
  if (confirmedResults.length > 0 && discrepancies.length === 0) verificationStatus = "verified";
  else if (confirmedResults.length > 0) verificationStatus = "partial";
  else verificationStatus = "failed";

  const finalStatus: "completed" | "partial" | "failed" =
    verificationStatus === "verified" ? "completed" : verificationStatus;

  const evidence = {
    executionId, workspaceId, userId, timestamp,
    originalRequest: "", interpretedIntent: plan.intent, plan,
    capabilitiesInvoked: [...capabilitiesInvoked], stepResults: [...updatedSteps],
    verification: { status: verificationStatus, confirmedResults, discrepancies },
    finalStatus,
    dryRun,
  };

  return { plan: { ...plan, steps: updatedSteps }, evidence, finalResult: null };
}