/**
 * SUPREME AGENT KERNEL — Shared Types
 * Sentinel Fort
 *
 * Pure type-only module shared by the intent interpreter, capability
 * registry, and execution engine. Breaking the circular import between
 * supreme-agent-intent and supreme-agent-capabilities (types flow through
 * here; capabilities value imports flow intent -> capabilities one way).
 */

/** Canonical domain buckets a capability can serve. */
export type AgentDomain = "market" | "inventory" | "customer" | "crm" | "supreme";

/** Intent categories produced by the interpreter and consumed by planners. */
export type AgentIntent =
  | "QUERY"
  | "ANALYZE"
  | "SEARCH"
  | "MATCH"
  | "RECOMMEND"
  | "PLAN"
  | "EXECUTE"
  | "VERIFY";

/** Reasoning modes — deterministic, clause-aware classification from user question.
 *  Does NOT replace intent; intent = what the user wants, reasoning mode =
 *  what kind of intellectual work the question demands.
 */
export type AgentReasoningMode =
  | "RETRIEVE"
  | "ANALYZE"
  | "DIAGNOSE"
  | "CORRELATE"
  | "RECOMMEND"
  | "DECIDE";