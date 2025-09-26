import { getSupabase } from "@/lib/supabase";
import type { Alert, AlertInput, NotificationDelivery } from "@shared/api";

function table() {
  const s = getSupabase();
  if (!s) throw new Error("Supabase is not configured");
  return s.from("alerts");
}

function deliveries() {
  const s = getSupabase();
  if (!s) throw new Error("Supabase is not configured");
  return s.from("notification_deliveries");
}

function toAlert(row: any): Alert {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    severity: row.severity,
    visibilityScope: row.visibility_scope,
    teamIds: row.team_ids,
    userIds: row.user_ids,
    reminderFrequencyHours: row.reminder_frequency_hours,
    expiresAt: row.expires_at,
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listAlerts(): Promise<Alert[]> {
  const { data, error } = await table()
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data as any[]) || []).map(toAlert);
}

export async function createAlert(input: AlertInput): Promise<Alert> {
  const payload = {
    title: input.title,
    message: input.message,
    severity: input.severity,
    visibility_scope: input.visibilityScope,
    team_ids: input.teamIds ?? null,
    user_ids: input.userIds ?? null,
    reminder_frequency_hours: input.reminderFrequencyHours ?? 2,
    expires_at: input.expiresAt ?? null,
    active: input.active ?? true,
  };
  const { data, error } = await table().insert(payload).select().single();
  if (error) throw error;
  return toAlert(data);
}

export async function updateAlert(
  id: string,
  patch: Partial<AlertInput>,
): Promise<Alert> {
  const payload: any = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.message !== undefined) payload.message = patch.message;
  if (patch.severity !== undefined) payload.severity = patch.severity;
  if (patch.visibilityScope !== undefined)
    payload.visibility_scope = patch.visibilityScope;
  if (patch.teamIds !== undefined) payload.team_ids = patch.teamIds ?? null;
  if (patch.userIds !== undefined) payload.user_ids = patch.userIds ?? null;
  if (patch.reminderFrequencyHours !== undefined)
    payload.reminder_frequency_hours = patch.reminderFrequencyHours;
  if (patch.expiresAt !== undefined) payload.expires_at = patch.expiresAt;
  if (patch.active !== undefined) payload.active = patch.active;

  const { data, error } = await table()
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toAlert(data);
}

export async function deleteAlert(id: string): Promise<void> {
  const { error } = await table().delete().eq("id", id);
  if (error) throw error;
}

export async function toggleAlertActive(
  id: string,
  active: boolean,
): Promise<Alert> {
  const { data, error } = await table()
    .update({ active })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return toAlert(data);
}

export async function getVisibleAlertsForUser(
  userId: string,
  teamId?: string | null,
): Promise<Alert[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await table()
    .select("*")
    .eq("active", true)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
  if (error) throw error;
  const all = ((data as any[]) || []).map(toAlert);
  return all.filter((a) => {
    if (a.visibilityScope === "org") return true;
    if (a.visibilityScope === "teams")
      return (a.teamIds ?? []).includes(teamId ?? "");
    if (a.visibilityScope === "users")
      return (a.userIds ?? []).includes(userId);
    return false;
  });
}

export async function getDelivery(
  userId: string,
  alertId: string,
): Promise<NotificationDelivery | null> {
  const { data, error } = await deliveries()
    .select("*")
    .eq("user_id", userId)
    .eq("alert_id", alertId)
    .maybeSingle();
  if (error) throw error;
  return data as any as NotificationDelivery | null;
}

export async function upsertDelivery(
  record: Omit<NotificationDelivery, "id" | "created_at" | "updated_at">,
): Promise<NotificationDelivery> {
  const { data, error } = await deliveries()
    .upsert(record, { onConflict: "user_id,alert_id" })
    .select()
    .single();
  if (error) throw error;
  return data as any as NotificationDelivery;
}

export async function snoozeAlert(
  userId: string,
  alertId: string,
  until: string,
): Promise<NotificationDelivery> {
  const existing = await getDelivery(userId, alertId);
  const payload = {
    user_id: userId,
    alert_id: alertId,
    read: existing?.read ?? false,
    snoozed_until: until,
    read_at: existing?.read_at ?? null,
  };
  return upsertDelivery(payload as any);
}

export async function markAlertRead(
  userId: string,
  alertId: string,
  read: boolean,
): Promise<NotificationDelivery> {
  const existing = await getDelivery(userId, alertId);
  const payload = {
    user_id: userId,
    alert_id: alertId,
    read,
    read_at: read ? new Date().toISOString() : null,
    snoozed_until: existing?.snoozed_until ?? null,
  };
  return upsertDelivery(payload as any);
}

export async function getUserDeliveries(
  userId: string,
): Promise<NotificationDelivery[]> {
  const { data, error } = await deliveries().select("*").eq("user_id", userId);
  if (error) throw error;
  return data as any as NotificationDelivery[];
}
