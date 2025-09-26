import type { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

export const adminCreateUser: RequestHandler = async (req, res) => {
  try {
    const { email, password, username } = req.body as {
      email?: string;
      password?: string;
      username?: string;
    };
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

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

    const { data: userRes, error: userErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: username ? { username } : undefined,
    });
    if (userErr) return res.status(400).json({ error: userErr.message });

    const user = userRes.user;

    if (user && username) {
      // best-effort: upsert profile
      await admin
        .from("profiles")
        .upsert({ user_id: user.id, username }, { onConflict: "user_id" });
    }

    return res.json({ user });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "unknown error" });
  }
};
