/**
 * Policy Intelligence Domain
 * Analytics and insights about compliance, governance, and policy adherence
 */

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive" | "review";
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceEvent {
  id: string;
  policyId: string;
  status: "pass" | "fail" | "warning";
  details: Record<string, unknown>;
  timestamp: Date;
}

export interface PolicyIntelligence {
  rules: PolicyRule[];
  events: ComplianceEvent[];
  summary?: Record<string, unknown>;
}
