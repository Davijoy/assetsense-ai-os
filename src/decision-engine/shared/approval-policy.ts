/**
 * Policy specifically governing the approval process for decisions.
 */
export interface ApprovalPolicy {
  /**
   * Determines whether the given decision can be approved automatically
   * without human intervention.
   * @param decisionContext The context of the decision to evaluate.
   * @returns True if auto-approval is allowed, false otherwise.
   */
  isAutoApprovalAllowed(decisionContext: any): boolean | Promise<boolean>;

  /**
   * Determines the required approvers or approval roles for the decision.
   * @param decisionContext The context of the decision to evaluate.
   * @returns A description of who must approve (e.g., 'manager', 'risk_committee', 'none').
   */
  getRequiredApprovers(decisionContext: any): string | Promise<string>;

  /**
   * Specifies the number of approvals required if multiple approvers are involved.
   * @param decisionContext The context of the decision to evaluate.
   * @returns The number of approvals needed (e.g., 1 for single, 2 for dual).
   */
  getApprovalCountRequired(decisionContext: any): number | Promise<number>;

  /**
   * Determines whether approval can be granted via delegation.
   * @param decisionContext The context of the decision to evaluate.
   * @returns True if delegation is allowed, false otherwise.
   */
  isDelegationAllowed(decisionContext: any): boolean | Promise<boolean>;

  /**
   * Specifies the time limit within which approval must be granted
   * before the decision expires or requires re-evaluation.
   * @param decisionContext The context of the decision to evaluate.
   * @returns An ISO 8601 duration (e.g., 'PT2H', 'P1D') or undefined for no limit.
   */
  getApprovalTimeout(decisionContext: any): string | undefined | Promise<string | undefined>;

  /**
   * Determines whether approval decisions should be recorded with justification.
   * @param decisionContext The context of the decision to evaluate.
   * @returns True if approval justification is required, false otherwise.
   */
  requiresApprovalJustification(decisionContext: any): boolean | Promise<boolean>;
}