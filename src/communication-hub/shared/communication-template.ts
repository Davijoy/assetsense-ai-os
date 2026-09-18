import { CommunicationChannel } from './communication-channel';

/**
 * Template for generating communication content.
 */
export interface CommunicationTemplate {
  /** Unique identifier for the template */
  templateId: string;

  /** Name of the template */
  name: string;

  /** Description of the template's purpose */
  description: string;

  /** Channel this template is designed for */
  channel: CommunicationChannel;

  /** Subject line (for email, push notifications, etc.) */
  subject?: string;

  /** Preheader text (for email) */
  preheader?: string;

  /** Main body content */
  body: string;

  /** Alternative body (e.g., plain text version for HTML email) */
  alternativeBody?: string;

  /** Template engine used (handlebars, mustache, etc.) */
  engine: 'HANDLEBARS' | 'MUSTACHE' | 'LODASH' | 'RAW' | 'OTHER';

  /** Variables that can be substituted in the template */
  variables: TemplateVariable[];

  /** Default values for variables */
  defaults: Record<string, unknown>;

  /** Whether the template supports localization */
  localized: boolean;

  /** Available locales */
  locales: string[];

  /** Fallback locale */
  fallbackLocale: string;

  /** Whether the template has been approved for use */
  approved: boolean;

  /** Version of the template */
  version: string;

  /** Date when the template was created */
  createdAt: string;

  /** Date when the template was last updated */
  updatedAt: string;

  /** Whether the template is currently active and selectable */
  isActive: boolean;

  /** Creator of the template */
  createdBy: string;

  /** Last modifier of the template */
  updatedBy: string;
}

/**
 * Variable that can be substituted in a template.
 */
export interface TemplateVariable {
  /** Name of the variable */
  name: string;

  /** Data type of the variable */
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'OBJECT' | 'ARRAY';

  /** Whether the variable is required */
  required: boolean;

  /** Default value if not provided */
  defaultValue?: unknown;

  /** Description of what the variable represents */
  description: string;

  /** Format pattern (for dates, numbers, etc.) */
  format?: string;

  /** Validation rules */
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
}