-- AI providers + settings, hourly AI job bookkeeping, and the manual photo-review queue.
create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_settings enable row level security;
create policy app_settings_admin on app_settings for all using (is_admin()) with check (is_admin());

-- API keys live here, encrypted by the app. RLS is on with NO policies: only the server (service role) can read it.
create table if not exists ai_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  type text not null default 'openai' check (type in ('openai', 'gemini', 'anthropic')),
  api_key_enc text not null,
  key_hint text,
  endpoint text,
  model text,
  weight int not null default 1 check (weight between 1 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table ai_providers enable row level security;

create table if not exists ai_usage (
  day date primary key,
  calls int not null default 0,
  failures int not null default 0
);
alter table ai_usage enable row level security;
create policy ai_usage_admin_read on ai_usage for select using (is_admin());

create table if not exists ai_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  stats jsonb,
  error text
);
alter table ai_runs enable row level security;
create policy ai_runs_admin_read on ai_runs for select using (is_admin());

-- Items already handled by the hourly AI pass (moderation + matching).
alter table listings add column if not exists ai_checked boolean not null default false;
alter table wanted_ads add column if not exists ai_checked boolean not null default false;
create index if not exists listings_ai_idx on listings (created_at desc) where not ai_checked;
create index if not exists wanted_ai_idx on wanted_ads (created_at desc) where not ai_checked;

-- Manual photo review (AI does not look at photos).
alter table listings add column if not exists photos_reviewed boolean not null default false;
create index if not exists listings_photo_review_idx on listings (created_at desc) where not photos_reviewed;

-- Extend the allowed flag sources for AI findings.
alter table content_flags drop constraint if exists content_flags_target_type_check;
alter table content_flags add constraint content_flags_target_type_check
  check (target_type in ('listing', 'wanted', 'seller_profile', 'review', 'profile'));

-- Guard: sellers can never flip the review/AI bookkeeping columns themselves.
create or replace function guard_listing() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not is_admin() then
      select count(*) into n from listings where seller_id = new.seller_id and created_at > now() - interval '24 hours';
      if n >= 10 then raise exception 'Daily listing limit reached (10 per day)'; end if;
      new.photos_reviewed := false;
      new.ai_checked := false;
    end if;
    new.expires_at := coalesce(new.expires_at, now() + interval '30 days');
    return new;
  end if;
  if auth.uid() is not null and not is_admin() then
    new.seller_id := old.seller_id;
    new.featured := old.featured;
    new.campus_id := old.campus_id;
    new.photos_reviewed := old.photos_reviewed;
    new.ai_checked := old.ai_checked;
    if old.status = 'removed' then raise exception 'This listing was removed by an admin'; end if;
    if new.status = 'removed' then raise exception 'Only admins can remove listings'; end if;
  end if;
  if new.quantity is not null and new.quantity = 0 and new.type = 'goods' and new.status = 'active' then
    new.status := 'sold';
  end if;
  return new;
end $$;
