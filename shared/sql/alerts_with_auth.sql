-- Enums (if not present)
create extension if not exists pgcrypto;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'severity_enum') then
    create type severity_enum as enum ('info','warning','critical');
  end if;
  if not exists (select 1 from pg_type where typname = 'visibility_scope_enum') then
    create type visibility_scope_enum as enum ('org','teams','users');
  end if;
end $$;

-- Core tables
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  severity severity_enum not null,
  visibility_scope visibility_scope_enum not null,
  team_ids text[] null,
  user_ids text[] null,
  reminder_frequency_hours int not null default 2,
  expires_at timestamptz null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  alert_id uuid not null references public.alerts(id) on delete cascade,
  read boolean not null default false,
  read_at timestamptz null,
  snoozed_until timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_user_alert_uniq unique (user_id, alert_id)
);

-- Admins & Teams
create table if not exists public.admins (
  user_id uuid primary key
);

create table if not exists public.user_teams (
  user_id uuid not null,
  team_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, team_id)
);

-- Helper: get a user's team ids
create or replace function public.user_team_ids(u uuid)
returns text[] language sql stable as $$
  select coalesce(array_agg(team_id), '{}') from public.user_teams where user_id = u;
$$;

-- Updated-at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_alerts_updated_at on public.alerts;
create trigger trg_alerts_updated_at before update on public.alerts
for each row execute function public.set_updated_at();

drop trigger if exists trg_deliveries_updated_at on public.notification_deliveries;
create trigger trg_deliveries_updated_at before update on public.notification_deliveries
for each row execute function public.set_updated_at();

-- Indexes
create index if not exists idx_alerts_active on public.alerts(active);
create index if not exists idx_alerts_expires_at on public.alerts(expires_at);
create index if not exists idx_alerts_visibility on public.alerts(visibility_scope);
create index if not exists idx_alerts_team_ids on public.alerts using gin(team_ids);
create index if not exists idx_alerts_user_ids on public.alerts using gin(user_ids);
create index if not exists idx_nd_user on public.notification_deliveries(user_id);
create index if not exists idx_nd_alert on public.notification_deliveries(alert_id);

-- RLS
alter table public.alerts enable row level security;
alter table public.notification_deliveries enable row level security;

-- Alerts: select for authenticated users based on scope
create policy if not exists alerts_select_authenticated on public.alerts
for select to authenticated
using (
  active = true
  and (expires_at is null or expires_at > now())
  and (
    visibility_scope = 'org'::visibility_scope_enum
    or (visibility_scope = 'teams'::visibility_scope_enum and (team_ids && public.user_team_ids(auth.uid())))
    or (visibility_scope = 'users'::visibility_scope_enum and auth.uid()::text = any(user_ids))
  )
);

-- Alerts: CRUD only by admins
create policy if not exists alerts_modify_admin on public.alerts
for all to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- Deliveries: users can only access their own rows
create policy if not exists nd_select_self on public.notification_deliveries
for select to authenticated using (user_id = auth.uid()::text);

create policy if not exists nd_modify_self on public.notification_deliveries
for all to authenticated using (user_id = auth.uid()::text) with check (user_id = auth.uid()::text);

-- Optional: seed yourself as admin (replace UUID)
-- insert into public.admins(user_id) values ('00000000-0000-0000-0000-000000000000') on conflict do nothing;
