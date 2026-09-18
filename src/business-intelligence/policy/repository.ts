/**
 * Policy Intelligence Repository
 * Interface for policy BI data access
 */

import type { PolicyRule, ComplianceEvent } from "./types";

export interface IPolicyRepository {
  getRules(workspaceId: string): Promise<PolicyRule[]>;
  getEvents(policyId: string): Promise<ComplianceEvent[]>;
  saveRule(rule: PolicyRule): Promise<void>;
  recordEvent(event: ComplianceEvent): Promise<void>;
}
