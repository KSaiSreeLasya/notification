/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

export type Severity = "info" | "warning" | "critical";
export type VisibilityScope = "org" | "teams" | "users";

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: Severity;
  visibilityScope: VisibilityScope;
  teamIds: string[] | null;
  userEmails: string[] | null;
  reminderFrequencyHours: number;
  expiresAt: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AlertInput {
  title: string;
  message: string;
  severity: Severity;
  visibilityScope: VisibilityScope;
  teamIds?: string[] | null;
  userEmails?: string[] | null;
  reminderFrequencyHours?: number;
  expiresAt?: string | null;
  active?: boolean;
}

export interface NotificationDelivery {
  id: string;
  user_id: string;
  alert_id: string;
  read: boolean;
  read_at: string | null;
  snoozed_until: string | null;
  created_at: string;
  updated_at: string;
}
