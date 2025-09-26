import { createClient, SupabaseClient, Session } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return null;
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    db: { schema: "public" },
  });
  return client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export async function getCurrentSession(): Promise<Session | null> {
  const s = getSupabase();
  if (!s) return null;
  const { data } = await s.auth.getSession();
  return data.session ?? null;
}

export async function signOut() {
  const s = getSupabase();
  if (!s) return;
  await s.auth.signOut();
}

export async function signUpWithPassword(email: string, password: string) {
  const s = getSupabase();
  if (!s) throw new Error("Supabase is not configured");
  return s.auth.signUp({ email, password });
}

export async function signInWithPassword(email: string, password: string) {
  const s = getSupabase();
  if (!s) throw new Error("Supabase is not configured");
  return s.auth.signInWithPassword({ email, password });
}
