import type { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

export const getVisibleAlerts: RequestHandler = async (req, res) => {
  try {
    const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) as
      | string
      | undefined;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as
      | string
      | undefined;

    if (!url || !serviceKey) {
      return res.status(500).json({
        error:
          "Server is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env variables.",
      });
    }

    const email = (req.query.email as string | undefined)?.toLowerCase() || null;
    const team = (req.query.team as string | undefined) || null;
    const uid = (req.query.uid as string | undefined) || null;

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const nowIso = new Date().toISOString();
    const { data, error } = await admin
      .from("alerts")
      .select("*")
      .eq("active", true)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

    if (error) return res.status(400).json({ error: error.message });

    console.log("[visible-alerts] params", { email, team, uid });
    console.log("[visible-alerts] total rows", (data as any[])?.length || 0);

    const rows = (data as any[]) || [];
    const visible = rows.filter((row) => {
      const scope = row.visibility_scope as string;
      if (scope === "org") return true;
      if (scope === "teams") {
        if (!team) return false;
        const ids: string[] = row.team_ids || [];
        return ids.includes(team);
      }
      if (scope === "users") {
        const emails: string[] = row.user_emails || [];
        const uids: string[] = row.user_ids || [];
        const emailOk = email
          ? emails.some((e) => (e || "").toLowerCase() === email)
          : false;
        const uidOk = uid ? uids.includes(uid) : false;
        return emailOk || uidOk;
      }
      return false;
    });

    // map to shared Alert shape
    const alerts = visible.map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      severity: row.severity,
      visibilityScope: row.visibility_scope,
      teamIds: row.team_ids,
      userEmails: row.user_emails ?? null,
      reminderFrequencyHours: row.reminder_frequency_hours,
      expiresAt: row.expires_at,
      active: row.active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return res.json(alerts);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "unknown error" });
  }
};
