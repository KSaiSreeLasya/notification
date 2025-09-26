import { getSupabase } from "@/lib/supabase";

export async function upsertProfile(userId: string, username: string) {
  const s = getSupabase();
  if (!s) throw new Error("Supabase is not configured");
  const { data, error } = await s
    .from("profiles")
    .upsert({ user_id: userId, username }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}
