import type { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

export const adminListUsers: RequestHandler = async (_req, res) => {
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

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });

    let page = 1;
    const perPage = 1000;
    const all: { id: string; email: string | null }[] = [];
    // simple pagination loop with safety cap
    for (let i = 0; i < 10; i++) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) return res.status(400).json({ error: error.message });
      const users = (data?.users ?? []).map((u) => ({
        id: u.id,
        email: u.email,
      }));
      all.push(...users);
      if ((data?.users?.length ?? 0) < perPage) break;
      page += 1;
    }

    return res.json(all);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "unknown error" });
  }
};
