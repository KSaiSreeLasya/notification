import type { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

export const seedTestOrgAlert: RequestHandler = async (_req, res) => {
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

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const title = "Test Org Alert";
    const payload = {
      title,
      message: "This is a test organization-wide alert.",
      severity: "info",
      visibility_scope: "org",
      team_ids: null,
      user_emails: null,
      reminder_frequency_hours: 2,
      expires_at: null,
      active: true,
    } as const;

    const { data, error } = await admin
      .from("alerts")
      .insert(payload)
      .select("*")
      .single();

    if (error) return res.status(400).json({ error: error.message });

    return res.json({ inserted: true, alert: data });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "unknown error" });
  }
};
