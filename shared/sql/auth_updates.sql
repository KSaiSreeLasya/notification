-- Only incremental updates for password-based signup/signin support
-- 1) User profiles for username (linked to Supabase auth.users)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep admins mapping to auth users; usernames live in profiles
-- (admins table already exists per your base SQL)

-- Updated-at trigger for profiles
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

-- RLS: users can view everyone (optional) and modify only their own profile
alter table public.profiles enable row level security;
create policy if not exists profiles_select_all on public.profiles for select to authenticated using (true);
create policy if not exists profiles_upsert_self on public.profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2) Make index creations idempotent for previous script
create index if not exists idx_alerts_active on public.alerts(active);
create index if not exists idx_alerts_expires_at on public.alerts(expires_at);
create index if not exists idx_alerts_visibility on public.alerts(visibility_scope);
create index if not exists idx_alerts_team_ids on public.alerts using gin(team_ids);
create index if not exists idx_alerts_user_ids on public.alerts using gin(user_ids);
create index if not exists idx_nd_user on public.notification_deliveries(user_id);
create index if not exists idx_nd_alert on public.notification_deliveries(alert_id);
