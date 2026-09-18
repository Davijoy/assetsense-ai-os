import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AnySupabase = SupabaseClient<Database> | SupabaseClient<any, any, any>;

/**
 * Contact domain model representing a person or organization
 */
export type Contact = {
  id: string;
  workspaceId: string;
  firstName: string;
  lastName: string;
  fullName: string; // Computed field: firstName + " " + lastName
  email: string;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string; // ISO 3166-1 alpha-2
  leadSource: string | null;
  status: ContactStatus;
  preferredContactMethod: string;
  doNotContact: boolean;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string | null; // Reference to auth user
  updatedBy: string | null; // Reference to auth user
};

/**
 * Contact status enum
 */
export type ContactStatus =
  | 'NEW'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'CUSTOMER'
  | 'PARTNER'
  | 'VENDOR'
  | 'LEAD'
  | 'REFERRAL'
  | 'ARCHIVED';

/**
 * Input for creating a new contact
 */
export type CreateContactInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string; // Defaults to 'IN'
  leadSource?: string | null;
  status?: ContactStatus; // Defaults to 'NEW'
  preferredContactMethod?: string; // Defaults to 'email'
  doNotContact?: boolean; // Defaults to false
  notes?: string | null;
  tags?: string[]; // Defaults to empty array
};

/**
 * Input for updating a contact (partial update)
 */
export type UpdateContactInput = Partial<CreateContactInput> & {
  id: string;
};

/**
 * Filter options for listing contacts
 */
export type ListContactsFilter = {
  status?: ContactStatus;
  leadSource?: string;
  company?: string;
  country?: string;
  tag?: string;
  search?: string; // Search in firstName, lastName, email, company
  hasPhone?: boolean;
  hasEmail?: boolean;
  doNotContact?: boolean;
  limit?: number;
  offset?: number;
};

/**
 * Summary statistics for contacts
 */
export type ContactsSummary = {
  total: number;
  byStatus: Record<ContactStatus, number>;
  byCountry: Record<string, number>;
  withEmail: number;
  withPhone: number;
  doNotContact: number;
  recent: number; // Created in last 30 days
};

/**
 * Maps a database row to a Contact DTO
 */
function mapContactRow(r: any): Contact {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    firstName: r.first_name,
    lastName: r.last_name,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone ?? null,
    company: r.company ?? null,
    jobTitle: r.job_title ?? null,
    website: r.website ?? null,
    addressLine1: r.address_line_1 ?? null,
    addressLine2: r.address_line_2 ?? null,
    city: r.city ?? null,
    state: r.state ?? null,
    postalCode: r.postal_code ?? null,
    country: r.country ?? 'IN',
    leadSource: r.lead_source ?? null,
    status: r.status as ContactStatus,
    preferredContactMethod: r.preferred_contact_method ?? 'email',
    doNotContact: r.do_not_contact ?? false,
    notes: r.notes ?? null,
    tags: r.tags ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by ?? null,
    updatedBy: r.updated_by ?? null,
  };
}

/**
 * List contacts for a workspace with optional filtering and pagination
 */
export async function listContacts(
  supabase: AnySupabase,
  workspaceId: string,
  filter: ListContactsFilter = {}
): Promise<Contact[]> {
  let query = (supabase as any)
    .from("contacts")
    .select("id,workspace_id,first_name,last_name,full_name,email,phone,company,job_title,website,address_line_1,address_line_2,city,state,postal_code,country,lead_source,status,preferred_contact_method,do_not_contact,notes,tags,created_at,updated_at,created_by,updated_by")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  // Apply filters
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.leadSource) query = query.eq("lead_source", filter.leadSource);
  if (filter.company) query = query.ilike("company", `%${filter.company}%`);
  if (filter.country) query = query.eq("country", filter.country.toUpperCase());
  if (filter.tag) query = query.contains("tags", [filter.tag]);
  if (filter.search) {
    const searchTerm = `%${filter.search}%`;
    query = query.or(`first_name.ilike${searchTerm},last_name.ilike${searchTerm},email.ilike${searchTerm},company.ilike${searchTerm}`);
  }
  if (filter.hasPhone !== undefined) {
    if (filter.hasPhone) {
      query = query.not("phone", "is", null);
    } else {
      query = query.is("phone", null);
    }
  }
  if (filter.hasEmail !== undefined) {
    if (filter.hasEmail) {
      query = query.not("email", "is", null);
    } else {
      query = query.is("email", null);
    }
  }
  if (filter.doNotContact !== undefined) {
    query = query.eq("do_not_contact", filter.doNotContact);
  }

  // Apply pagination
  if (filter.limit !== undefined) {
    query = query.limit(filter.limit);
    if (filter.offset !== undefined) {
      query = query.offset(filter.offset);
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapContactRow);
}

/**
 * Get a single contact by ID (workspace-scoped for security)
 */
export async function getContactById(
  supabase: AnySupabase,
  workspaceId: string,
  contactId: string
): Promise<Contact | null> {
  const { data, error } = await (supabase as any)
    .from("contacts")
    .select("id,workspace_id,first_name,last_name,full_name,email,phone,company,job_title,website,address_line_1,address_line_2,city,state,postal_code,country,lead_source,status,preferred_contact_method,do_not_contact,notes,tags,created_at,updated_at,created_by,updated_by")
    .eq("id", contactId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapContactRow(data) : null;
}

/**
 * Create a new contact in the workspace
 */
export async function createContact(
  supabase: AnySupabase,
  workspaceId: string,
  input: CreateContactInput
): Promise<Contact> {
  const {
    firstName,
    lastName,
    email,
    phone = null,
    company = null,
    jobTitle = null,
    website = null,
    addressLine1 = null,
    addressLine2 = null,
    city = null,
    state = null,
    postalCode = null,
    country = 'IN',
    leadSource = null,
    status = 'NEW',
    preferredContactMethod = 'email',
    doNotContact = false,
    notes = null,
    tags = []
  } = input;

  const { data, error } = await (supabase as any)
    .from("contacts")
    .insert({
      workspace_id: workspaceId,
      first_name: firstName,
      last_name: lastName,
      email: email.toLowerCase(), // Store lowercase for case-insensitive uniqueness
      phone: phone,
      company: company,
      job_title: jobTitle,
      website: website,
      address_line_1: addressLine1,
      address_line_2: addressLine2,
      city: city,
      state: state,
      postal_code: postalCode,
      country: country.toUpperCase(),
      lead_source: leadSource,
      status: status,
      preferred_contact_method: preferredContactMethod,
      do_not_contact: doNotContact,
      notes: notes,
      tags: tags
    })
    .select()
    .single();

  if (error) throw error;
  return mapContactRow(data);
}

/**
 * Update an existing contact (workspace-scoped for security)
 */
export async function updateContact(
  supabase: AnySupabase,
  workspaceId: string,
  input: UpdateContactInput
): Promise<Contact> {
  // Get the original contact for comparison
  const originalContact = await getContactById(supabase, workspaceId, input.id);
  if (!originalContact) {
    throw new Error(`Contact not found: ${input.id}`);
  }

  const updateData: any = {};

  // Only include fields that are defined in the input
  if (input.firstName !== undefined) updateData.first_name = input.firstName;
  if (input.lastName !== undefined) updateData.last_name = input.lastName;
  if (input.email !== undefined) updateData.email = input.email.toLowerCase(); // Store lowercase
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.company !== undefined) updateData.company = input.company;
  if (input.jobTitle !== undefined) updateData.job_title = input.jobTitle;
  if (input.website !== undefined) updateData.website = input.website;
  if (input.addressLine1 !== undefined) updateData.address_line_1 = input.addressLine1;
  if (input.addressLine2 !== undefined) updateData.address_line_2 = input.addressLine2;
  if (input.city !== undefined) updateData.city = input.city;
  if (input.state !== undefined) updateData.state = input.state;
  if (input.postalCode !== undefined) updateData.postal_code = input.postalCode;
  if (input.country !== undefined) updateData.country = input.country.toUpperCase();
  if (input.leadSource !== undefined) updateData.lead_source = input.leadSource;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.preferredContactMethod !== undefined) updateData.preferred_contact_method = input.preferredContactMethod;
  if (input.doNotContact !== undefined) updateData.do_not_contact = input.doNotContact;
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.tags !== undefined) updateData.tags = input.tags;

  // Don't update computed fields or audit fields here
  // updated_by would be set by application logic

  const { data, error } = await (supabase as any)
    .from("contacts")
    .update(updateData)
    .eq("id", input.id)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error) throw error;
  return mapContactRow(data);
}

/**
 * Delete a contact (workspace-scoped for security)
 * Note: Consider using soft delete (status = 'ARCHIVED') instead of hard delete
 */
export async function deleteContact(
  supabase: AnySupabase,
  workspaceId: string,
  contactId: string
): Promise<void> {
  const { error } = await (supabase as any)
    .from("contacts")
    .delete()
    .eq("id", contactId)
    .eq("workspace_id", workspaceId);

  if (error) throw error;
}

/**
 * Get contacts summary/statistics for a workspace
 */
export async function getContactsSummary(
  supabase: AnySupabase,
  workspaceId: string
): Promise<ContactsSummary> {
  const { data, error } = await (supabase as any)
    .from("contacts")
    .select("status,country,email,phone,do_not_contact,created_at,tags")
    .eq("workspace_id", workspaceId);

  if (error) throw error;
  const contacts = data ?? [];

  const summary: ContactsSummary = {
    total: contacts.length,
    byStatus: {} as Record<ContactStatus, number>,
    byCountry: {} as Record<string, number>,
    withEmail: 0,
    withPhone: 0,
    doNotContact: 0,
    recent: 0
  };

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const contact of contacts) {
    // Count by status
    const status = contact.status as ContactStatus;
    summary.byStatus[status] = (summary.byStatus[status] ?? 0) + 1;

    // Count by country
    const country = contact.country;
    if (country) {
      summary.byCountry[country] = (summary.byCountry[country] ?? 0) + 1;
    }

    // Count contacts with email/phone
    if (contact.email) summary.withEmail++;
    if (contact.phone) summary.withPhone++;

    // Count do not contact
    if (contact.do_not_contact) summary.doNotContact++;

    // Count recent contacts (last 30 days)
    if (contact.created_at) {
      const createdDate = new Date(contact.created_at);
      if (createdDate >= thirtyDaysAgo) {
        summary.recent++;
      }
    }
  }

  return summary;
}

/**
 * Find contacts by email (case-insensitive)
 */
export async function findContactByEmail(
  supabase: AnySupabase,
  workspaceId: string,
  email: string
): Promise<Contact | null> {
  const { data, error } = await (supabase as any)
    .from("contacts")
    .select("id,workspace_id,first_name,last_name,full_name,email,phone,company,job_title,website,address_line_1,address_line_2,city,state,postal_code,country,lead_source,status,preferred_contact_method,do_not_contact,notes,tags,created_at,updated_at,created_by,updated_by")
    .eq("workspace_id", workspaceId)
    .eq("email", email.toLowerCase()) // Case-insensitive match via lowercase storage
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
    throw error;
  }
  return data ? mapContactRow(data) : null;
}

/**
 * Add a tag to a contact
 */
export async function addContactTag(
  supabase: AnySupabase,
  workspaceId: string,
  contactId: string,
  tag: string
): Promise<void> {
  // Get current contact
  const contact = await getContactById(supabase, workspaceId, contactId);
  if (!contact) {
    throw new Error(`Contact not found: ${contactId}`);
  }

  // Add tag if not already present
  const updatedTags = [...new Set([...contact.tags, tag])];

  // Update contact
  await updateContact(supabase, workspaceId, {
    id: contactId,
    tags: updatedTags
  });
}

/**
 * Remove a tag from a contact
 */
export async function removeContactTag(
  supabase: AnySupabase,
  workspaceId: string,
  contactId: string,
  tag: string
): Promise<void> {
  // Get current contact
  const contact = await getContactById(supabase, workspaceId, contactId);
  if (!contact) {
    throw new Error(`Contact not found: ${contactId}`);
  }

  // Remove tag if present
  const updatedTags = contact.tags.filter(t => t !== tag);

  // Update contact
  await updateContact(supabase, workspaceId, {
    id: contactId,
    tags: updatedTags
  });
}