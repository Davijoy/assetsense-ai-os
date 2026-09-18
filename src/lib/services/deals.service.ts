import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AnySupabase = SupabaseClient<Database> | SupabaseClient<any, any, any>;

/**
 * Domain event types for the Deal domain
 * These will be published to the event bus in Phase 5
 */
export type DealDomainEvent =
  | { type: 'DealCreated'; payload: { dealId: string; workspaceId: string } }
  | { type: 'DealUpdated'; payload: { dealId: string; workspaceId: string; changes: Partial<Deal> } }
  | { type: 'DealDeleted'; payload: { dealId: string; workspaceId: string } }
  | { type: 'SalesStageAdvanced'; payload: { dealId: string; workspaceId: string; oldStage: DealStage; newStage: DealStage } }
  | { type: 'DealAgreed'; payload: { dealId: string; workspaceId: string } } // Special case when stage reaches agreed
  | { type: 'BookingConfirmed'; payload: { dealId: string; workspaceId: string; tokenAmount: number } }
  | { type: 'BookingCancelled'; payload: { dealId: string; workspaceId: string } }
  | { type: 'ConstructionMilestoneUpdated'; payload: { dealId: string; workspaceId: string; milestoneType: string; date: string | null } }
  | { type: 'RegistrationUpdated'; payload: { dealId: string; workspaceId: string; field: string; value: any } }
  | { type: 'PaymentScheduleUpdated'; payload: { dealId: string; workspaceId: string; field: string; value: any } }
  | { type: 'PaymentInstallmentAdded'; payload: { dealId: string; workspaceId: string; installmentNumber: number; amountDue: number } }
  | { type: 'PaymentInstallmentUpdated'; payload: { dealId: string; workspaceId: string; installmentNumber: number; status: string } }
  | { type: 'PossessionProcessUpdated'; payload: { dealId: string; workspaceId: string; field: string; value: any } }
  | { type: 'PossessionSnagAdded'; payload: { dealId: string; workspaceId: string; description: string; severity: string } }
  | { type: 'PossessionSnagResolved'; payload: { dealId: string; workspaceId: string; snagId: string } };

/**
 * Interface for domain event publishing
 * Will be implemented with actual event bus in Phase 5
 */
interface DomainEventPublisher {
  publish(event: DealDomainEvent): Promise<void>;
}

/**
 * Simple in-memory event publisher for development
 * In production, this would be replaced with actual event bus integration
 */
class InMemoryDomainEventPublisher implements DomainEventPublisher {
  private events: DealDomainEvent[] = [];

  async publish(event: DealDomainEvent): Promise<void> {
    // In development, just log the event
    // In production, this would send to actual message broker
    console.log('[Domain Event]', JSON.stringify({ timestamp: new Date().toISOString(), event }));
    this.events.push(event);
  }

  getPublishedEvents(): DealDomainEvent[] {
    return [...this.events];
  }
}

// Singleton instance for use throughout the service
const eventPublisher = new InMemoryDomainEventPublisher();

/**
 * Deal domain model representing the core business agreement
 */
export type Deal = {
  id: string;
  workspaceId: string;
  customerId: string;
  projectId: string;
  unitNumber: string;
  agreedValue: number; // Stored as number, mapped from NUMERIC
  currencyCode: string; // ISO 4217 currency code (INR, USD, etc.)
  agreementDate: string; // ISO date string
  currentStatus: DealStage;
  agreedPossessionDate: string | null; // ISO date string or null
  actualPossessionDate: string | null; // ISO date string or null
  createdAt: string;
  updatedAt: string;
};

/**
 * Deal stage enum matching database definition
 */
export type DealStage =
  | 'lead'
  | 'qualified'
  | 'proposed'
  | 'negotiating'
  | 'agreed'
  | 'booked'
  | 'construction_started'
  | 'foundation_complete'
  | 'framing_complete'
  | 'rough_in_complete'
  | 'drywall_complete'
  | 'finishing_complete'
  | 'final_inspection'
  | 'registration_initiated'
  | 'documents_submitted'
  | 'registration_pending'
  | 'registered'
  | 'possession_scheduled'
  | 'possession_offered'
  | 'possession_accepted'
  | 'handover_scheduled'
  | 'handover_completed'
  | 'completed'
  | 'cancelled'
  | 'terminated'
  | 'archived';

/**
 * Input for creating a new deal
 */
export type CreateDealInput = {
  customerId: string;
  projectId: string;
  unitNumber: string;
  agreedValue: number;
  currencyCode?: string; // Defaults to 'INR'
  agreementDate?: string; // Defaults to today
  agreedPossessionDate?: string | null;
};

/**
 * Input for updating a deal (partial update)
 */
export type UpdateDealInput = Partial<CreateDealInput> & {
  id: string;
  currentStatus?: DealStage;
  actualPossessionDate?: string | null;
};

/**
 * Filter options for listing deals
 */
export type ListDealsFilter = {
  stage?: DealStage;
  customerId?: string;
  projectId?: string;
  unitNumber?: string;
  minValue?: number;
  maxValue?: number;
  currencyCode?: string;
  agreementDateFrom?: string;
  agreementDateTo?: string;
  search?: string; // Search in unitNumber or related customer/project names
  limit?: number;
};

/**
 * Summary statistics for deals
 */
export type DealsSummary = {
  total: number;
  byStage: Record<DealStage, number>;
  byCurrency: Record<string, number>;
  totalValue: number; // Sum of agreedValue across all deals
  averageValue: number;
};

/**
 * Maps a database row to a Deal DTO
 */
function mapDealRow(r: any): Deal {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    customerId: r.customer_id,
    projectId: r.project_id,
    unitNumber: r.unit_number,
    agreedValue: r.agreed_value != null ? Number(r.agreed_value) : 0,
    currencyCode: r.currency_code ?? 'INR',
    agreementDate: r.agreement_date,
    currentStatus: r.current_status,
    agreedPossessionDate: r.agreed_possession_date ?? null,
    actualPossessionDate: r.actual_possession_date ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * Publish a domain event (placeholder for actual event bus in Phase 5)
 */
async function publishDomainEvent(event: DealDomainEvent): Promise<void> {
  await eventPublisher.publish(event);
}

/**
 * List deals for a workspace with optional filtering
 */
export async function listDeals(
  supabase: AnySupabase,
  workspaceId: string,
  filter: ListDealsFilter = {}
): Promise<Deal[]> {
  let query = (supabase as any)
    .from("deals")
    .select("id,workspace_id,customer_id,project_id,unit_number,agreed_value,currency_code,agreement_date,current_status,agreed_possession_date,actual_possession_date,created_at,updated_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (filter.stage) query = query.eq("current_status", filter.stage);
  if (filter.customerId) query = query.eq("customer_id", filter.customerId);
  if (filter.projectId) query = query.eq("project_id", filter.projectId);
  if (filter.unitNumber) query = query.eq("unit_number", filter.unitNumber);
  if (filter.minValue !== undefined) query = query.gte("agreed_value", filter.minValue);
  if (filter.maxValue !== undefined) query = query.lte("agreed_value", filter.maxValue);
  if (filter.currencyCode) query = query.eq("currency_code", filter.currencyCode);
  if (filter.agreementDateFrom) query = query.gte("agreement_date", filter.agreementDateFrom);
  if (filter.agreementDateTo) query = query.lte("agreement_date", filter.agreementDateTo);
  if (filter.search) {
    const searchTerm = `%${filter.search}%`;
    // Note: In a full implementation, we would join with customer/project tables for search
    // For now, we search in unit_number only
    query = query.ilike("unit_number", searchTerm);
  }
  if (filter.limit) query = query.limit(filter.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapDealRow);
}

/**
 * Get a single deal by ID (workspace-scoped for security)
 */
export async function getDealById(
  supabase: AnySupabase,
  workspaceId: string,
  dealId: string
): Promise<Deal | null> {
  const { data, error } = await (supabase as any)
    .from("deals")
    .select("id,workspace_id,customer_id,project_id,unit_number,agreed_value,currency_code,agreement_date,current_status,agreed_possession_date,actual_possession_date,created_at,updated_at")
    .eq("id", dealId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapDealRow(data) : null;
}

/**
 * Create a new deal in the workspace
 */
export async function createDeal(
  supabase: AnySupabase,
  workspaceId: string,
  input: CreateDealInput
): Promise<Deal> {
  const {
    customerId,
    projectId,
    unitNumber,
    agreedValue,
    currencyCode = 'INR',
    agreementDate = new Date().toISOString().split('T')[0], // YYYY-MM-DD
    agreedPossessionDate = null
  } = input;

  const { data, error } = await (supabase as any)
    .from("deals")
    .insert({
      workspace_id: workspaceId,
      customer_id: customerId,
      project_id: projectId,
      unit_number: unitNumber,
      agreed_value: agreedValue,
      currency_code: currencyCode,
      agreement_date: agreementDate,
      agreed_possession_date: agreedPossessionDate,
      current_status: 'lead' // Default stage
    })
    .select()
    .single();

  if (error) throw error;

  const deal = mapDealRow(data);

  // Publish domain event
  await publishDomainEvent({
    type: 'DealCreated',
    payload: {
      dealId: deal.id,
      workspaceId: deal.workspaceId
    }
  });

  return deal;
}

/**
 * Update an existing deal (workspace-scoped for security)
 */
export async function updateDeal(
  supabase: AnySupabase,
  workspaceId: string,
  input: UpdateDealInput
): Promise<Deal> {
  // Get the original deal for comparison
  const originalDeal = await getDealById(supabase, workspaceId, input.id);
  if (!originalDeal) {
    throw new Error(`Deal not found: ${input.id}`);
  }

  const updateData: any = {};

  // Only include fields that are defined in the input
  if (input.customerId !== undefined) updateData.customer_id = input.customerId;
  if (input.projectId !== undefined) updateData.project_id = input.projectId;
  if (input.unitNumber !== undefined) updateData.unit_number = input.unitNumber;
  if (input.agreedValue !== undefined) updateData.agreed_value = input.agreedValue;
  if (input.currencyCode !== undefined) updateData.currency_code = input.currencyCode;
  if (input.agreementDate !== undefined) updateData.agreement_date = input.agreementDate;
  if (input.agreedPossessionDate !== undefined) updateData.agreed_possession_date = input.agreedPossessionDate;
  if (input.currentStatus !== undefined) updateData.current_status = input.currentStatus;
  if (input.actualPossessionDate !== undefined) updateData.actual_possession_date = input.actualPossessionDate;

  const { data, error } = await (supabase as any)
    .from("deals")
    .update(updateData)
    .eq("id", input.id)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error) throw error;

  const updatedDeal = mapDealRow(data);

  // Determine what changed for the event payload
  const changes: Partial<Deal> = {};
  if (input.customerId !== undefined && originalDeal.customerId !== input.customerId) changes.customerId = input.customerId;
  if (input.projectId !== undefined && originalDeal.projectId !== input.projectId) changes.projectId = input.projectId;
  if (input.unitNumber !== undefined && originalDeal.unitNumber !== input.unitNumber) changes.unitNumber = input.unitNumber;
  if (input.agreedValue !== undefined && originalDeal.agreedValue !== input.agreedValue) changes.agreedValue = input.agreedValue;
  if (input.currencyCode !== undefined && originalDeal.currencyCode !== input.currencyCode) changes.currencyCode = input.currencyCode;
  if (input.agreementDate !== undefined && originalDeal.agreementDate !== input.agreementDate) changes.agreementDate = input.agreementDate;
  if (input.agreedPossessionDate !== undefined && originalDeal.agreedPossessionDate !== input.agreedPossessionDate) changes.agreedPossessionDate = input.agreedPossessionDate;
  if (input.currentStatus !== undefined && originalDeal.currentStatus !== input.currentStatus) changes.currentStatus = input.currentStatus;
  if (input.actualPossessionDate !== undefined && originalDeal.actualPossessionDate !== input.actualPossessionDate) changes.actualPossessionDate = input.actualPossessionDate;

  // Publish domain event if anything changed
  if (Object.keys(changes).length > 0) {
    await publishDomainEvent({
      type: 'DealUpdated',
      payload: {
        dealId: updatedDeal.id,
        workspaceId: updatedDeal.workspaceId,
        changes
      }
    });
  }

  return updatedDeal;
}

/**
 * Delete a deal (workspace-scoped for security)
 */
export async function deleteDeal(
  supabase: AnySupabase,
  workspaceId: string,
  dealId: string
): Promise<void> {
  // Get the deal before deleting for the event
  const dealToDelete = await getDealById(supabase, workspaceId, dealId);
  if (!dealToDelete) {
    throw new Error(`Deal not found: ${dealId}`);
  }

  const { error } = await (supabase as any)
    .from("deals")
    .delete()
    .eq("id", dealId)
    .eq("workspace_id", workspaceId);

  if (error) throw error;

  // Publish domain event
  await publishDomainEvent({
    type: 'DealDeleted',
    payload: {
      dealId: dealToDelete.id,
      workspaceId: dealToDelete.workspaceId
    }
  });
}

/**
 * Get deals summary/statistics for a workspace
 */
export async function getDealsSummary(
  supabase: AnySupabase,
  workspaceId: string
): Promise<DealsSummary> {
  const { data, error } = await (supabase as any)
    .from("deals")
    .select("current_status,currency_code,agreed_value")
    .eq("workspace_id", workspaceId);

  if (error) throw error;
  const deals = data ?? [];

  const summary: DealsSummary = {
    total: deals.length,
    byStage: {} as Record<DealStage, number>,
    byCurrency: {} as Record<string, number>,
    totalValue: 0,
    averageValue: 0
  };

  let totalValue = 0;

  for (const deal of deals) {
    // Count by stage
    const stage = deal.current_status as DealStage;
    summary.byStage[stage] = (summary.byStage[stage] ?? 0) + 1;

    // Count by currency
    const currency = deal.currency_code;
    summary.byCurrency[currency] = (summary.byCurrency[currency] ?? 0) + 1;

    // Sum values
    const value = deal.agreed_value != null ? Number(deal.agreed_value) : 0;
    totalValue += value;
  }

  summary.totalValue = totalValue;
  summary.averageValue = deals.length > 0 ? totalValue / deals.length : 0;

  return summary;
}

/**
 * Advance the sales pipeline stage for a deal
 */
export async function advanceSalesPipelineStage(
  supabase: AnySupabase,
  workspaceId: string,
  dealId: string,
  newStage: DealStage
): Promise<void> {
  // First, get the sales pipeline record
  const { data: pipelineData, error: pipelineError } = await (supabase as any)
    .from("deal_sales_pipeline")
    .select("id,stage")
    .eq("deal_id", dealId)
    .eq("workspace_id", workspaceId)
    .single();

  if (pipelineError) throw pipelineError;

  const oldStage = pipelineData.stage as DealStage;

  // Update the sales pipeline stage
  const { error: updateError } = await (supabase as any)
    .from("deal_sales_pipeline")
    .update({
      stage: newStage,
      updated_at: new Date().toISOString()
    })
    .eq("deal_id", dealId)
    .eq("workspace_id", workspaceId);

  if (updateError) throw updateError;

  // Publish domain event for stage advancement
  await publishDomainEvent({
    type: 'SalesStageAdvanced',
    payload: {
      dealId,
      workspaceId,
      oldStage,
      newStage
    }
  });

  // If stage is 'agreed', also update the deal status and publish DealAgreed event
  if (newStage === 'agreed') {
    const { error: dealError } = await (supabase as any)
      .from("deals")
      .update({
        current_status: 'agreed',
        updated_at: new Date().toISOString()
      })
      .eq("id", dealId)
      .eq("workspace_id", workspaceId);

    if (dealError) throw dealError;

    // Publish DealAgreed event
    await publishDomainEvent({
      type: 'DealAgreed',
      payload: {
        dealId,
        workspaceId
      }
    });
  }
}

/**
 * Update booking status and details
 */
export async function updateBooking(
  supabase: AnySupabase,
  workspaceId: string,
  dealId: string,
  input: {
    status?: 'draft' | 'token_paid' | 'confirmed' | 'cancelled';
    tokenAmount?: number;
    tokenPaidDate?: string | null;
    bookingDate?: string | null;
    expectedAgreementDate?: string | null;
    actualAgreementDate?: string | null;
    notes?: string;
  }
): Promise<void> {
  const updateData: any = {};

  if (input.status !== undefined) updateData.booking_status = input.status;
  if (input.tokenAmount !== undefined) updateData.token_amount = input.tokenAmount;
  if (input.tokenPaidDate !== undefined) updateData.token_paid_date = input.tokenPaidDate;
  if (input.bookingDate !== undefined) updateData.booking_date = input.bookingDate;
  if (input.expectedAgreementDate !== undefined) updateData.expected_agreement_date = input.expectedAgreementDate;
  if (input.actualAgreementDate !== undefined) updateData.actual_agreement_date = input.actualAgreementDate;
  if (input.notes !== undefined) updateData.notes = input.notes;

  // First check if booking record exists
  const { data: existingData, error: checkError } = await (supabase as any)
    .from("deal_booking")
    .select("id")
    .eq("deal_id", dealId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (checkError) throw checkError;

  let { error };
  if (existingData) {
    // Update existing record
    ({ error } = await (supabase as any)
      .from("deal_booking")
      .update(updateData)
      .eq("deal_id", dealId)
      .eq("workspace_id", workspaceId));
  } else {
    // Insert new record
    updateData.deal_id = dealId;
    updateData.workspace_id = workspaceId;
    ({ error } = await (supabase as any)
      .from("deal_booking")
      .insert(updateData));
  }

  if (error) throw error;

  // Publish domain events based on what changed
  if (input.status !== undefined) {
    if (input.status === 'confirmed') {
      await publishDomainEvent({
        type: 'BookingConfirmed',
        payload: {
          dealId,
          workspaceId,
          tokenAmount: input.tokenAmount ?? 0
        }
      });
    } else if (input.status === 'cancelled') {
      await publishDomainEvent({
        type: 'BookingCancelled',
        payload: {
          dealId,
          workspaceId
        }
      });
    }
  }
}

/**
 * Update construction milestone dates
 */
export async function updateConstructionMilestone(
  supabase: AnySupabase,
  workspaceId: string,
  dealId: string,
  milestoneType:
    | 'start_date'
    | 'foundation_date'
    | 'framing_date'
    | 'rough_in_date'
    | 'drywall_date'
    | 'finishing_date'
    | 'final_inspection_date',
  date: string | null
): Promise<void> {
  const updateData: any = {};
  updateData[milestoneType] = date;
  updateData.updated_at = new Date().toISOString();

  // First check if construction record exists
  const { data: existingData, error: checkError } = await (supabase as any)
    .from("deal_construction")
    .select("id")
    .eq("deal_id", dealId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (checkError) throw checkError;

  let { error };
  if (existingData) {
    // Update existing record
    ({ error } = await (supabase as any)
      .from("deal_construction")
      .update(updateData)
      .eq("deal_id", dealId)
      .eq("workspace_id", workspaceId));
  } else {
    // Insert new record with the milestone
    updateData.deal_id = dealId;
    updateData.workspace_id = workspaceId;
    // Set other dates to null if not provided
    updateData.start_date = milestoneType === 'start_date' ? date : null;
    updateData.foundation_date = milestoneType === 'foundation_date' ? date : null;
    updateData.framing_date = milestoneType === 'framing_date' ? date : null;
    updateData.rough_in_date = milestoneType === 'rough_in_date' ? date : null;
    updateData.drywall_date = milestoneType === 'drywall_date' ? date : null;
    updateData.finishing_date = milestoneType === 'finishing_date' ? date : null;
    updateData.final_inspection_date = milestoneType === 'final_inspection_date' ? date : null;
    updateData.status = 'in_progress'; // Default when starting

    ({ error } = await (supabase as any)
      .from("deal_construction")
      .insert(updateData));
  }

  if (error) throw error;

  // Publish domain event for milestone update
  await publishDomainEvent({
    type: 'ConstructionMilestoneUpdated',
    payload: {
      dealId,
      workspaceId,
      milestoneType,
      date
    }
  });
}

/**
 * Update registration details
 */
export async function updateRegistration(
  supabase: AnySupabase,
  workspaceId: string,
  dealId: string,
  input: {
    applicationDate?: string | null;
    submissionDate?: string | null;
    approvalDate?: string | null;
    registrationDate?: string | null;
    registrationNumber?: string | null;
    stampDutyPaid?: number | null;
    registrationFees?: number | null;
    status?: string;
    notes?: string;
  }
): Promise<void> {
  const updateData: any = {};

  if (input.applicationDate !== undefined) updateData.application_date = input.applicationDate;
  if (input.submissionDate !== undefined) updateData.submission_date = input.submissionDate;
  if (input.approvalDate !== undefined) updateData.approval_date = input.approvalDate;
  if (input.registrationDate !== undefined) updateData.registration_date = input.registrationDate;
  if (input.registrationNumber !== undefined) updateData.registration_number = input.registrationNumber;
  if (input.stampDutyPaid !== undefined) updateData.stamp_duty_paid = input.stampDutyPaid;
  if (input.registrationFees !== undefined) updateData.registration_fees = input.registrationFees;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.notes !== undefined) updateData.notes = input.notes;

  // First check if registration record exists
  const { data: existingData, error: checkError } = await (supabase as any)
    .from("deal_registration")
    .select("id")
    .eq("deal_id", dealId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (checkError) throw checkError;

  let { error };
  if (existingData) {
    // Update existing record
    ({ error } = await (supabase as any)
      .from("deal_registration")
      .update(updateData)
      .eq("deal_id", dealId)
      .eq("workspace_id", workspaceId));
  } else {
    // Insert new record
    updateData.deal_id = dealId;
    updateData.workspace_id = workspaceId;
    ({ error } = await (supabase as any)
      .from("deal_registration")
      .insert(updateData));
  }

  if (error) throw error;

  // Publish domain event for registration update (simplified - in practice might want to track specific field changes)
  await publishDomainEvent({
    type: 'RegistrationUpdated',
    payload: {
      dealId,
      workspaceId,
      field: 'multiple', // In a real implementation, we'd track which specific fields changed
      value: 'updated'
    }
  });
}

/**
 * Update payment schedule status and dates
 */
export async function updatePaymentSchedule(
  supabase: AnySupabase,
  workspaceId: string,
  dealId: string,
  input: {
    status?: 'pending' | 'partial' | 'completed' | 'overdue' | 'waived';
    lastPaymentDate?: string | null;
    nextPaymentDate?: string | null;
    finalPaymentDate?: string | null;
    notes?: string;
  }
): Promise<void> {
  const updateData: any = {};

  if (input.status !== undefined) updateData.payment_status = input.status;
  if (input.lastPaymentDate !== undefined) updateData.last_payment_date = input.lastPaymentDate;
  if (input.nextPaymentDate !== undefined) updateData.next_payment_date = input.nextPaymentDate;
  if (input.finalPaymentDate !== undefined) updateData.final_payment_date = input.finalPaymentDate;
  if (input.notes !== undefined) updateData.notes = input.notes;

  // First check if payment schedule record exists
  const { data: existingData, error: checkError } = await (supabase as any)
    .from("deal_payment_schedule")
    .select("id")
    .eq("deal_id", dealId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (checkError) throw checkError;

  let { error };
  if (existingData) {
    // Update existing record
    ({ error } = await (supabase as any)
      .from("deal_payment_schedule")
      .update(updateData)
      .eq("deal_id", dealId)
      .eq("workspace_id", workspaceId));
  } else {
    // Insert new record
    updateData.deal_id = dealId;
    updateData.workspace_id = workspaceId;
    // Note: Total amount and currency are sourced from the deal, not duplicated here
    ({ error } = await (supabase as any)
      .from("deal_payment_schedule")
      .insert(updateData));
  }

  if (error) throw error;

  // Publish domain event for payment schedule update
  await publishDomainEvent({
    type: 'PaymentScheduleUpdated',
    payload: {
      dealId,
      workspaceId,
      field: 'multiple', // Simplified for now
      value: 'updated'
    }
  });
}

/**
 * Add or update a payment installment
 */
export async function upsertPaymentInstallment(
  supabase: AnySupabase,
  workspaceId: string,
  dealId: string,
  input: {
    installmentNumber: number;
    dueDate: string;
    amountDue: number;
    amountPaid?: number;
    paymentDate?: string | null;
    status?: 'pending' | 'paid' | 'partial' | 'overdue' | 'waived';
    notes?: string;
  }
): Promise<void> {
  // First get the payment schedule for this deal
  const { data: scheduleData, error: scheduleError } = await (supabase as any)
    .from("deal_payment_schedule")
    .select("id")
    .eq("deal_id", dealId)
    .eq("workspace_id", workspaceId)
    .single();

  if (scheduleError) throw scheduleError;

  const updateData: any = {
    payment_schedule_id: scheduleData.id,
    workspace_id: workspaceId,
    installment_number: input.installmentNumber,
    due_date: input.dueDate,
    amount_due: input.amountDue,
    amount_paid: input.amountPaid ?? 0,
    payment_date: input.paymentDate ?? null,
    status: input.status ?? 'pending',
    notes: input.notes ?? null
  };

  // Check if installment already exists
  const { data: existingData, error: checkError } = await (supabase as any)
    .from("deal_payment_installments")
    .select("id")
    .eq("payment_schedule_id", scheduleData.id)
    .eq("installment_number", input.installmentNumber)
    .maybeSingle();

  if (checkError) throw checkError;

  let { error };
  if (existingData) {
    // Update existing installment
    ({ error } = await (supabase as any)
      .from("deal_payment_installments")
      .update(updateData)
      .eq("id", existingData.id)
      .eq("workspace_id", workspaceId));
  } else {
    // Insert new installment
    ({ error } = await (supabase as any)
      .from("deal_payment_installments")
      .insert(updateData));
  }

  if (error) throw error;

  // Publish domain event for payment installment
  await publishDomainEvent({
    type: 'PaymentInstallmentAdded',
    payload: {
      dealId,
      workspaceId,
      installmentNumber: input.installmentNumber,
      amountDue: input.amountDue
    }
  });
}

/**
 * Update possession process details
 */
export async function updatePossession(
  supabase: AnySupabase,
  workspaceId: string,
  dealId: string,
  input: {
    status?: 'not_ready' | 'ready_for_offer' | 'offered' | 'accepted' | 'handover_scheduled' | 'handover_completed' | 'delayed';
    readinessDate?: string | null;
    offeredDate?: string | null;
    acceptedDate?: string | null;
    handoverScheduledDate?: string | null;
    actualHandoverDate?: string | null;
    possessionLetterDate?: string | null;
    keysHandedOverDate?: string | null;
    snagListCount?: number;
    snagResolvedCount?: number;
    notes?: string;
  }
): Promise<void> {
  const updateData: any = {};

  if (input.status !== undefined) updateData.possession_status = input.status;
  if (input.readinessDate !== undefined) updateData.readiness_date = input.readinessDate;
  if (input.offeredDate !== undefined) updateData.offered_date = input.offeredDate;
  if (input.acceptedDate !== undefined) updateData.accepted_date = input.acceptedDate;
  if (input.handoverScheduledDate !== undefined) updateData.handover_scheduled_date = input.handoverScheduledDate;
  if (input.actualHandoverDate !== undefined) updateData.actual_handover_date = input.actualHandoverDate;
  if (input.possessionLetterDate !== undefined) updateData.possession_letter_date = input.possessionLetterDate;
  if (input.keysHandedOverDate !== undefined) updateData.keys_handed_over_date = input.keysHandedOverDate;
  if (input.snagListCount !== undefined) updateData.snag_list_count = input.snagListCount;
  if (input.snagResolvedCount !== undefined) updateData.snag_resolved_count = input.snagResolvedCount;
  if (input.notes !== undefined) updateData.notes = input.notes;

  // First check if possession record exists
  const { data: existingData, error: checkError } = await (supabase as any)
    .from("deal_possession")
    .select("id")
    .eq("deal_id", dealId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (checkError) throw checkError;

  let { error };
  if (existingData) {
    // Update existing record
    ({ error } = await (supabase as any)
      .from("deal_possession")
      .update(updateData)
      .eq("deal_id", dealId)
      .eq("workspace_id", workspaceId));
  } else {
    // Insert new record
    updateData.deal_id = dealId;
    updateData.workspace_id = workspaceId;
    ({ error } = await (supabase as any)
      .from("deal_possession")
      .insert(updateData));
  }

  if (error) throw error;

  // Publish domain event for possession process update
  await publishDomainEvent({
    type: 'PossessionProcessUpdated',
    payload: {
      dealId,
      workspaceId,
      field: 'multiple', // Simplified for now
      value: 'updated'
    }
  });
}

/**
 * Add a snag/issue to the possession process
 */
export async function addPossessionSnag(
  supabase: AnySupabase,
  workspaceId: string,
  dealId: string,
  input: {
    description: string;
    location?: string | null;
    severity?: 'minor' | 'major' | 'critical';
    reportedDate?: string;
    resolvedDate?: string | null;
    resolvedBy?: string | null;
    resolutionNotes?: string | null;
  }
): Promise<void> {
  // First get the possession record for this deal
  const { data: possessionData, error: possessionError } = await (supabase as any)
    .from("deal_possession")
    .select("id")
    .eq("deal_id", dealId)
    .eq("workspace_id", workspaceId)
    .single();

  if (possessionError) throw possessionError;

  const insertData: any = {
    possession_id: possessionData.id,
    workspace_id: workspaceId,
    description: input.description,
    location: input.location ?? null,
    severity: input.severity ?? 'minor',
    reported_date: input.reportedDate,
    resolved_date: input.resolvedDate ?? null,
    resolved_by: input.resolvedBy ?? null,
    resolution_notes: input.resolutionNotes ?? null
  };

  const { error } = await (supabase as any)
    .from("deal_possession_snags")
    .insert(insertData);

  if (error) throw error;

  // Publish domain event for snag added
  await publishDomainEvent({
    type: 'PossessionSnagAdded',
    payload: {
      dealId,
      workspaceId,
      description: input.description,
      severity: input.severity ?? 'minor'
    }
  });
}

/**
 * Mark a snag as resolved
 */
export async function resolvePossessionSnag(
  supabase: AnySupabase,
  workspaceId: string,
  dealId: string,
  snagId: string,
  resolvedBy: string,
  resolutionNotes: string | null = null
): Promise<void> {
  const { error } = await (supabase as any)
    .from("deal_possession_snags")
    .update({
      resolved_date: new Date().toISOString().split('T')[0],
      resolved_by: resolvedBy,
      resolution_notes: resolutionNotes
    })
    .eq("id", snagId)
    .eq("workspace_id", workspaceId);

  if (error) throw error;

  // Publish domain event for snag resolved
  await publishDomainEvent({
    type: 'PossessionSnagResolved',
    payload: {
      dealId,
      workspaceId,
      snagId
    }
  });
}

/**
 * Get all lifecycle data for a deal (for comprehensive view)
 */
export async function getDealWithLifecycles(
  supabase: AnySupabase,
  workspaceId: string,
  dealId: string
): Promise<{
  deal: Deal | null;
  salesPipeline: any | null;
  booking: any | null;
  construction: any | null;
  registration: any | null;
  paymentSchedule: any | null;
  paymentInstallments: any[] | null;
  possession: any | null;
  possessionSnags: any[] | null;
}> {
  // Fetch deal
  const deal = await getDealById(supabase, workspaceId, dealId);

  // Fetch all lifecycle data in parallel
  const [
    salesPipelineResult,
    bookingResult,
    constructionResult,
    registrationResult,
    paymentScheduleResult,
    paymentInstallmentsResult,
    possessionResult,
    possessionSnagsResult
  ] = await Promise.all([
    (supabase as any)
      .from("deal_sales_pipeline")
      .select("*")
      .eq("deal_id", dealId)
      .eq("workspace_id", workspaceId)
      .single()
      .then(res => ({ data: res.data, error: res.error }))
      .catch(err => ({ data: null, error: err })),

    (supabase as any)
      .from("deal_booking")
      .select("*")
      .eq("deal_id", dealId)
      .eq("workspace_id", workspaceId)
      .single()
      .then(res => ({ data: res.data, error: res.error }))
      .catch(err => ({ data: null, error: err })),

    (supabase as any)
      .from("deal_construction")
      .select("*")
      .eq("deal_id", dealId)
      .eq("workspace_id", workspaceId)
      .single()
      .then(res => ({ data: res.data, error: res.error }))
      .catch(err => ({ data: null, error: err })),

    (supabase as any)
      .from("deal_registration")
      .select("*")
      .eq("deal_id", dealId)
      .eq("workspace_id", workspaceId)
      .single()
      .then(res => ({ data: res.data, error: res.error }))
      .catch(err => ({ data: null, error: err })),

    (supabase as any)
      .from("deal_payment_schedule")
      .select("*")
      .eq("deal_id", dealId)
      .eq("workspace_id", workspaceId)
      .single()
      .then(res => ({ data: res.data, error: res.error }))
      .catch(err => ({ data: null, error: err })),

    (supabase as any)
      .from("deal_payment_installments")
      .select("*")
      .eq("deal_id", dealId)
      .eq("workspace_id", workspaceId)
      .order("installment_number", { ascending: true })
      .then(res => ({ data: res.data, error: res.error }))
      .catch(err => ({ data: null, error: err })),

    (supabase as any)
      .from("deal_possession")
      .select("*")
      .eq("deal_id", dealId)
      .eq("workspace_id", workspaceId)
      .single()
      .then(res => ({ data: res.data, error: res.error }))
      .catch(err => ({ data: null, error: err })),

    (supabase as any)
      .from("deal_possession_snags")
      .select("*")
      .eq("deal_id", dealId)
      .eq("workspace_id", workspaceId)
      .order("reported_date", { ascending: true })
      .then(res => ({ data: res.data, error: res.error }))
      .catch(err => ({ data: null, error: err }))
  ]);

  // Check for errors
  const checkError = (result: { error: any }) => {
    if (result.error && result.error.code !== 'PGRST116') { // PGRST116 means no rows returned, which is OK
      throw result.error;
    }
  };

  [salesPipelineResult, bookingResult, constructionResult, registrationResult,
   paymentScheduleResult, paymentInstallmentsResult, possessionResult,
   possessionSnagsResult].forEach(checkError);

  return {
    deal,
    salesPipeline: salesPipelineResult.data,
    booking: bookingResult.data,
    construction: constructionResult.data,
    registration: registrationResult.data,
    paymentSchedule: paymentScheduleResult.data,
    paymentInstallments: paymentInstallmentsResult.data,
    possession: possessionResult.data,
    possessionSnags: possessionSnagsResult.data
  };
}

/**
 * Get published domain events (for testing/debugging)
 * In production, this would not be exposed
 */
export function getPublishedEvents(): DealDomainEvent[] {
  return eventPublisher.getPublishedEvents();
}