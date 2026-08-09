/**
 * Supreme Intelligence Orchestrator Approval Policy
 * 
 * Defines approval requirements for coordinated cross-domain actions.
 * Integrates with Communication Hub for approval workflows.
 */

import type { ApprovalRequirement, ProposedAction, ApprovalRequest } from "./types";
import type { EvidenceItem } from "../shared/evidence-item";

/** Approval policy configuration */
export interface ApprovalPolicyConfig {
  /** Default expiry hours for approval requests */
  defaultExpiryHours: number;
  /** Maximum number of approval requests per workspace per hour */
  maxRequestsPerHour: number;
  /** Required approver roles by action type */
  requiredRolesByActionType: Record<string, string[]>;
  /** Minimum approvals required by action type */
  minApprovalsByActionType: Record<string, number>;
  /** Auto-approve low-risk actions */
  autoApproveLowRisk: boolean;
  /** Risk threshold for auto-approval */
  autoApproveRiskThreshold: number;
}

/** Default approval policy configuration */
export const DEFAULT_APPROVAL_POLICY: ApprovalPolicyConfig = {
  defaultExpiryHours: 24,
  maxRequestsPerHour: 50,
  requiredRolesByActionType: {
    call: ["manager", "admin", "senior_agent"],
    whatsapp: ["manager", "admin", "senior_agent"],
    email: ["agent", "senior_agent", "manager", "admin"],
    sms: ["agent", "senior_agent", "manager", "admin"],
    pricing_change: ["manager", "admin"],
    financial_action: ["manager", "admin", "finance_lead"],
    contractual_commitment: ["manager", "admin", "legal"],
    record_deletion: ["admin"],
    permission_change: ["admin"],
    in_app_notification: [],
  },
  minApprovalsByActionType: {
    call: 1,
    whatsapp: 1,
    email: 1,
    sms: 1,
    pricing_change: 2,
    financial_action: 2,
    contractual_commitment: 2,
    record_deletion: 1,
    permission_change: 1,
    in_app_notification: 0,
  },
  autoApproveLowRisk: true,
  autoApproveRiskThreshold: 0.3,
};

/** Action risk assessment */
export interface ActionRiskAssessment {
  actionId: string;
  actionType: ProposedAction["type"];
  riskScore: number; // 0-1
  riskFactors: string[];
  requiresApproval: boolean;
  recommendedApprovers: string[];
  minApprovals: number;
}

/** Approval decision */
export interface ApprovalDecision {
  requestId: string;
  recommendationId: string;
  approverId: string;
  approverRole: string;
  decision: "approved" | "rejected";
  reason?: string;
  decidedAt: string;
  actionsApproved: string[]; // actionIds
  actionsRejected: string[]; // actionIds
}

/** Approval workflow state */
export interface ApprovalWorkflowState {
  requestId: string;
  status: "pending" | "approved" | "rejected" | "expired" | "partially_approved";
  requestedAt: string;
  expiresAt: string;
  decisions: ApprovalDecision[];
  approvalsReceived: number;
  requiredApprovals: number;
  actions: ProposedAction[];
  evidence: EvidenceItem[];
}

/**
 * Approval Policy Engine
 * Evaluates approval requirements and manages approval workflows
 */
export class ApprovalPolicyEngine {
  private config: ApprovalPolicyConfig;
  private requestCounts: Map<string, { count: number; windowStart: number }> = new Map();

  constructor(config: Partial<ApprovalPolicyConfig> = {}) {
    this.config = { ...DEFAULT_APPROVAL_POLICY, ...config };
  }

  /**
   * Evaluate approval requirement for a coordinated recommendation
   */
  evaluateApprovalRequirement(
    recommendation: {
      recommendationId: string;
      workspaceId: string;
      correlationId: string;
      causationId: string;
      title: string;
      businessReason: string;
      priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
      confidence: number;
      proposedActions: ProposedAction[];
      evidence: EvidenceItem[];
      sourceDomains: ("customer" | "inventory" | "market" | "crm")[];
    },
  ): ApprovalRequirement {
    const actionAssessments = recommendation.proposedActions.map(action => 
      this.assessActionRisk(action, recommendation)
    );

    const requiresApproval = actionAssessments.some(a => a.requiresApproval);
    const allActions = recommendation.proposedActions;
    
    // Determine required roles (union of all action requirements)
    const requiredRoles = new Set<string>();
    let maxMinApprovals = 0;
    
    for (const assessment of actionAssessments) {
      for (const role of assessment.recommendedApprovers) {
        requiredRoles.add(role);
      }
      maxMinApprovals = Math.max(maxMinApprovals, assessment.minApprovals);
    }

    // Check rate limiting
    const rateLimitKey = `${recommendation.workspaceId}:${Math.floor(Date.now() / 3600000)}`;
    const currentCount = this.requestCounts.get(rateLimitKey)?.count ?? 0;
    if (currentCount >= this.config.maxRequestsPerHour) {
      // Still require approval but log rate limit
      console.warn(`Approval rate limit exceeded for workspace ${recommendation.workspaceId}`);
    }

    const expiresAt = new Date(Date.now() + this.config.defaultExpiryHours * 60 * 60 * 1000).toISOString();

    return {
      required: requiresApproval,
      reason: requiresApproval 
        ? `Cross-domain coordinated action (${recommendation.sourceDomains.join(", ")}) with ${allActions.length} proposed actions requires human approval`
        : "No approval required - all actions are low-risk notifications",
      approverRoles: Array.from(requiredRoles).length > 0 ? Array.from(requiredRoles) : ["manager", "admin"],
      requiredApprovals: maxMinApprovals > 0 ? maxMinApprovals : 1,
      expiresAt,
      actionsRequiringApproval: allActions.filter(a => 
        actionAssessments.find(as => as.actionId === a.actionId)?.requiresApproval ?? false
      ),
    };
  }

  /**
   * Assess risk for a single proposed action
   */
  private assessActionRisk(
    action: ProposedAction,
    recommendation: {
      priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
      confidence: number;
      sourceDomains: ("customer" | "inventory" | "market" | "crm")[];
    },
  ): ActionRiskAssessment {
    const baseRiskByType: Record<ProposedAction["type"], number> = {
      call: 0.8,
      whatsapp: 0.7,
      email: 0.4,
      sms: 0.5,
      pricing_change: 0.9,
      financial_action: 0.95,
      contractual_commitment: 0.95,
      record_deletion: 0.9,
      permission_change: 0.85,
      in_app_notification: 0.1,
    };

    const baseRisk = baseRiskByType[action.type] ?? 0.5;
    
    // Adjust based on recommendation priority
    const priorityMultiplier = {
      CRITICAL: 1.2,
      HIGH: 1.1,
      MEDIUM: 1.0,
      LOW: 0.9,
    }[recommendation.priority];

    // Adjust based on confidence (lower confidence = higher risk)
    const confidenceMultiplier = 2 - recommendation.confidence;

    // Adjust based on number of source domains (more domains = more complex = higher risk)
    const domainMultiplier = 1 + (recommendation.sourceDomains.length - 1) * 0.1;

    const riskScore = Math.min(1, baseRisk * priorityMultiplier * confidenceMultiplier * domainMultiplier);

    const riskFactors: string[] = [];
    if (baseRisk > 0.7) riskFactors.push(`High-risk action type: ${action.type}`);
    if (recommendation.priority === "CRITICAL" || recommendation.priority === "HIGH") {
      riskFactors.push(`High priority recommendation: ${recommendation.priority}`);
    }
    if (recommendation.confidence < 0.7) {
      riskFactors.push(`Low confidence: ${(recommendation.confidence * 100).toFixed(0)}%`);
    }
    if (recommendation.sourceDomains.length > 2) {
      riskFactors.push(`Multi-domain coordination: ${recommendation.sourceDomains.join(", ")}`);
    }
    if (action.requiresHumanApproval) {
      riskFactors.push("Action explicitly requires human approval");
    }

    const requiresApproval = riskScore > this.config.autoApproveRiskThreshold || action.requiresHumanApproval;
    const recommendedApprovers = this.config.requiredRolesByActionType[action.type] ?? ["manager", "admin"];
    const minApprovals = this.config.minApprovalsByActionType[action.type] ?? 1;

    return {
      actionId: action.actionId,
      actionType: action.type,
      riskScore,
      riskFactors,
      requiresApproval,
      recommendedApprovers,
      minApprovals,
    };
  }

  /**
   * Create an approval request
   */
  createApprovalRequest(
    recommendationId: string,
    workspaceId: string,
    correlationId: string,
    causationId: string,
    title: string,
    description: string,
    proposedActions: ProposedAction[],
    evidence: EvidenceItem[],
    approvalRequirement: ApprovalRequirement,
  ): ApprovalRequest {
    // Update rate limit counter
    const rateLimitKey = `${workspaceId}:${Math.floor(Date.now() / 3600000)}`;
    const current = this.requestCounts.get(rateLimitKey) ?? { count: 0, windowStart: Date.now() };
    current.count += 1;
    this.requestCounts.set(rateLimitKey, current);

    return {
      requestId: `approval-${recommendationId}`,
      recommendationId,
      workspaceId,
      correlationId,
      causationId,
      title,
      description,
      proposedActions,
      evidence,
      requestedAt: new Date().toISOString(),
      expiresAt: approvalRequirement.expiresAt ?? new Date(Date.now() + this.config.defaultExpiryHours * 60 * 60 * 1000).toISOString(),
      status: "pending",
      approvers: approvalRequirement.approverRoles,
      approvalsReceived: 0,
      requiredApprovals: approvalRequirement.requiredApprovals,
    };
  }

  /**
   * Process an approval decision
   */
  processApprovalDecision(
    workflow: ApprovalWorkflowState,
    decision: ApprovalDecision,
  ): ApprovalWorkflowState {
    const updatedDecisions = [...workflow.decisions, decision];
    const approvalsReceived = updatedDecisions.filter(d => d.decision === "approved").length;
    const rejections = updatedDecisions.filter(d => d.decision === "rejected").length;

    let status: ApprovalWorkflowState["status"] = "pending";
    if (approvalsReceived >= workflow.requiredApprovals) {
      status = "approved";
    } else if (rejections > 0) {
      status = "rejected";
    } else if (new Date() > new Date(workflow.expiresAt)) {
      status = "expired";
    } else if (approvalsReceived > 0) {
      status = "partially_approved";
    }

    return {
      ...workflow,
      status,
      decisions: updatedDecisions,
      approvalsReceived,
    };
  }

  /**
   * Check if approval request is expired
   */
  isExpired(request: ApprovalRequest): boolean {
    return new Date() > new Date(request.expiresAt);
  }

  /**
   * Get actions that can be executed based on approval state
   */
  getExecutableActions(workflow: ApprovalWorkflowState): ProposedAction[] {
    if (workflow.status !== "approved" && workflow.status !== "partially_approved") {
      return [];
    }

    const approvedActionIds = new Set(
      workflow.decisions
        .filter(d => d.decision === "approved")
        .flatMap(d => d.actionsApproved)
    );

    return workflow.actions.filter(a => approvedActionIds.has(a.actionId));
  }

  /**
   * Check if user can approve (has required role)
   */
  canUserApprove(userRoles: string[], requiredRoles: string[]): boolean {
    return requiredRoles.some(role => userRoles.includes(role));
  }

  /**
   * Get approval policy configuration
   */
  getConfig(): ApprovalPolicyConfig {
    return { ...this.config };
  }

  /**
   * Update approval policy configuration
   */
  updateConfig(config: Partial<ApprovalPolicyConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/** Singleton instance */
export const approvalPolicyEngine = new ApprovalPolicyEngine();