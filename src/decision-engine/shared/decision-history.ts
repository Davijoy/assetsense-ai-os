/**
 * Represents a single entry in the history of a decision, recording state changes and actions.
 */
export interface DecisionHistoryEntry {
  /** Identifier of this history entry. */
  id: string;
  /** The state the decision transitioned to. */
  toState: string; // Could be DecisionStatus, but we keep as string for simplicity
  /** The state the decision transitioned from (optional for initial entry). */
  fromState?: string;
  /** Timestamp of the transition. */
  timestamp: string; // ISO 8601 datetime string
  /** Who or what initiated the transition (e.g., user ID, system component). */
  initiatedBy: string;
  /** Reason or comment for the transition. */
  reason: string;
  /** Additional data associated with the transition (e.g., approval details, execution results). */
  data?: unknown;
}