-- CampoSoko schema, helpers and RLS. Run in order with the other migrations.
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------- enums ----------
create type user_role as enum ('user', 'admin');
create type listing_type as enum ('goods', 'service');
create type listing_status as enum ('active', 'sold', 'expired', 'removed');
create type item_condition as enum ('new', 'used');
create type wanted_status as enum ('active', 'fulfilled', 'removed');
create type report_status as enum ('open', 'dismissed', 'actioned');
create type event_type as enum ('view', 'contact_click', 'search');
create type payment_method as enum ('mpesa', 'cash', 'other');

-- ---------- core tables ----------
create table campuses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  county text,
  email_domain text check (email_domain is null or email_domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  applies_to text not null default 'both' check (applies_to in ('goods', 'service', 'both')),
  sort_order int not null default 0,
  active boolean not null default true
);

-- Private row: contains the WhatsApp number. Public reads go through public_profiles / RPCs.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 80),
  email text not null,
  whatsapp text not null check (whatsapp ~ '^\+254[17][0-9]{8}$'),
  campus_id uuid not null references campuses(id),
  role user_role not null default 'user',
  suspended boolean not null default false,
  created_at timestamptz not null default now()
);
create index on profiles (campus_id);
create unique index profiles_email_key on profiles (lower(email));

create table seller_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  shop_name text not null check (char_length(shop_name) between 2 and 60),
  location text not null check (char_length(location) between 2 and 100),
  description text not null check (char_length(description) >= 20 and char_length(description) <= 600),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id) on delete cascade,
  campus_id uuid not null references campuses(id),
  type listing_type not null,
  title text not null check (char_length(title) between 3 and 100),
  description text not null check (char_length(description) between 10 and 2000),
  category_id uuid not null references categories(id),
  condition item_condition,
  quantity int check (quantity is null or quantity >= 0),
  price numeric(12,2) not null check (price >= 0),
  location text not null check (char_length(location) between 2 and 100),
  delivery_time text check (delivery_time is null or char_length(delivery_time) <= 40),
  portfolio_url text check (portfolio_url is null or portfolio_url ~* '^https?://'),
  prohibited_ack boolean not null check (prohibited_ack),
  status listing_status not null default 'active',
  featured boolean not null default false,
  expires_at timestamptz not null default (now() + interval '30 days'),
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored,
  constraint goods_fields check (type <> 'goods' or (condition is not null and quantity is not null)),
  constraint service_fields check (type <> 'service' or delivery_time is not null)
);
create index listings_feed_idx on listings (status, type, campus_id, featured desc, created_at desc);
create index listings_seller_idx on listings (seller_id);
create index listings_search_idx on listings using gin (search);
create index listings_title_trgm on listings using gin (title gin_trgm_ops);

create table listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  url text not null,
  position int not null default 0
);
create index on listing_images (listing_id, position);

create table wanted_ads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  campus_id uuid not null references campuses(id),
  title text not null check (char_length(title) between 3 and 100),
  description text not null check (char_length(description) between 10 and 1000),
  category_id uuid not null references categories(id),
  type listing_type not null,
  budget numeric(12,2) check (budget is null or budget >= 0),
  keywords text[] not null default '{}' check (cardinality(keywords) <= 10),
  notify boolean not null default true,
  status wanted_status not null default 'active',
  created_at timestamptz not null default now()
);
create index on wanted_ads (status, type, campus_id, created_at desc);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, read_at, created_at desc);

create table blocks (
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  listing_id uuid references listings(id) on delete cascade,
  reported_user_id uuid references profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 500),
  status report_status not null default 'open',
  created_at timestamptz not null default now(),
  check (listing_id is not null or reported_user_id is not null)
);
create index on reports (status, created_at desc);

create table events (
  id uuid primary key default gen_random_uuid(),
  type event_type not null,
  listing_id uuid references listings(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  session_key text,
  day date not null default ((now() at time zone 'utc')::date),
  meta text,
  created_at timestamptz not null default now()
);
create index on events (listing_id, type, created_at desc);
create index on events (type, created_at desc);
-- one view per listing per viewer (user or anonymous session) per day
create unique index events_view_dedupe on events (listing_id, day, coalesce(user_id::text, session_key))
  where type = 'view';

create table receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_no text not null unique,
  public_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  seller_id uuid not null references profiles(id),
  listing_id uuid references listings(id) on delete set null,
  buyer_name text not null check (char_length(buyer_name) between 2 and 80),
  buyer_phone text,
  buyer_email text,
  buyer_id uuid references profiles(id) on delete set null,
  payment_method payment_method not null,
  mpesa_code text check (mpesa_code is null or mpesa_code ~ '^[A-Z0-9]{8,12}$'),
  notes text check (notes is null or char_length(notes) <= 500),
  total numeric(12,2) not null check (total >= 0),
  sale_date date not null default current_date,
  voided boolean not null default false,
  void_reason text,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  check (buyer_phone is not null or buyer_email is not null)
);
create index on receipts (seller_id, created_at desc);
create index on receipts (buyer_id);
create sequence receipt_seq;

create table receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references receipts(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  quantity int not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0)
);
create index on receipt_items (receipt_id);

create table admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index on admin_audit_log (created_at desc);

create table rate_limits (
  id bigserial primary key,
  key text not null,
  created_at timestamptz not null default now()
);
create index on rate_limits (key, created_at desc);

-- ---------- helper functions ----------
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and not suspended);
$$;

create or replace function is_active_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and not suspended);
$$;

create or replace function is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

-- Sliding-window rate limiter. Returns true if allowed (and records the hit).
create or replace function check_rate_limit(p_key text, p_max int, p_window interval)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from rate_limits where created_at < now() - interval '2 days';
  select count(*) into n from rate_limits where key = p_key and created_at > now() - p_window;
  if n >= p_max then return false; end if;
  insert into rate_limits (key) values (p_key);
  return true;
end $$;
revoke all on function check_rate_limit(text, int, interval) from public, anon, authenticated;

-- ---------- profile creation from auth.users (sign-up metadata) ----------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  c campuses;
begin
  if m->>'campus_id' is null then
    -- login of an existing email via OTP never reaches here; a bare sign-in with no profile is rejected
    raise exception 'Sign up required: missing campus';
  end if;
  select * into c from campuses where id = (m->>'campus_id')::uuid and active;
  if not found then raise exception 'Invalid campus'; end if;
  if c.email_domain is not null and lower(split_part(new.email, '@', 2)) <> lower(c.email_domain)
     and lower(split_part(new.email, '@', 2)) not like '%.' || lower(c.email_domain) then
    raise exception 'Email must be a % address', c.email_domain;
  end if;
  insert into profiles (id, full_name, email, whatsapp, campus_id)
  values (new.id, trim(m->>'full_name'), new.email, m->>'whatsapp', c.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- guard triggers ----------
create or replace function guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() then
    new.role := old.role;
    new.suspended := old.suspended;
    new.email := old.email;
  end if;
  return new;
end $$;
create trigger profiles_guard before update on profiles
  for each row execute function guard_profile_update();

create or replace function guard_listing() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not is_admin() then
      select count(*) into n from listings where seller_id = new.seller_id and created_at > now() - interval '24 hours';
      if n >= 10 then raise exception 'Daily listing limit reached (10 per day)'; end if;
    end if;
    new.expires_at := coalesce(new.expires_at, now() + interval '30 days');
    return new;
  end if;
  -- UPDATE
  if auth.uid() is not null and not is_admin() then
    new.seller_id := old.seller_id;
    new.featured := old.featured;
    new.campus_id := old.campus_id;
    if old.status = 'removed' then raise exception 'This listing was removed by an admin'; end if;
    if new.status = 'removed' then raise exception 'Only admins can remove listings'; end if;
  end if;
  if new.quantity is not null and new.quantity = 0 and new.type = 'goods' and new.status = 'active' then
    new.status := 'sold';
  end if;
  return new;
end $$;
create trigger listings_guard before insert or update on listings
  for each row execute function guard_listing();

-- Enforce max 5 images per listing
create or replace function guard_listing_images() returns trigger
language plpgsql as $$
begin
  if (select count(*) from listing_images where listing_id = new.listing_id) >= 5 then
    raise exception 'A listing can have at most 5 images';
  end if;
  return new;
end $$;
create trigger listing_images_limit before insert on listing_images
  for each row execute function guard_listing_images();

-- ---------- public views (no contact data) ----------
create view public_profiles as
  select p.id, p.full_name, p.campus_id, s.shop_name, s.location as shop_location,
         s.description as shop_description, s.avatar_url, p.created_at
  from profiles p left join seller_profiles s on s.user_id = p.id
  where not p.suspended;
grant select on public_profiles to anon, authenticated;

-- ---------- RPCs ----------
-- Reveal WhatsApp: auth required, not suspended, not blocked; logs the contact click.
create or replace function get_listing_contact(p_listing uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  l listings;
  w text;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  if not is_active_user() then raise exception 'Account suspended'; end if;
  select * into l from listings where id = p_listing and status in ('active', 'sold');
  if not found then raise exception 'Listing not found'; end if;
  if is_blocked_between(auth.uid(), l.seller_id) then raise exception 'Contact unavailable'; end if;
  select whatsapp into w from profiles where id = l.seller_id and not suspended;
  insert into events (type, listing_id, user_id) values ('contact_click', p_listing, auth.uid());
  return w;
end $$;
grant execute on function get_listing_contact(uuid) to authenticated;

create or replace function get_wanted_contact(p_wanted uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  a wanted_ads;
  w text;
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  if not is_active_user() then raise exception 'Account suspended'; end if;
  select * into a from wanted_ads where id = p_wanted and status = 'active';
  if not found then raise exception 'Ad not found'; end if;
  if is_blocked_between(auth.uid(), a.user_id) then raise exception 'Contact unavailable'; end if;
  select whatsapp into w from profiles where id = a.user_id and not suspended;
  return w;
end $$;
grant execute on function get_wanted_contact(uuid) to authenticated;

-- Log a view (deduped per user/session per listing per day) or search.
create or replace function log_event(p_type event_type, p_listing uuid, p_session text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_type = 'contact_click' then raise exception 'Not allowed'; end if;
  if auth.uid() is null and (p_session is null or char_length(p_session) > 64) then return; end if;
  insert into events (type, listing_id, user_id, session_key)
  values (p_type, p_listing, auth.uid(), case when auth.uid() is null then p_session end)
  on conflict do nothing;
end $$;
grant execute on function log_event(event_type, uuid, text) to anon, authenticated;

-- Expire old listings; returns listings needing a 3-day reminder (call from a daily cron route).
create or replace function expire_listings() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update listings set status = 'expired' where status = 'active' and expires_at < now();
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function expire_listings() from public, anon, authenticated;

create or replace function renew_listing(p_listing uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update listings
     set status = 'active', expires_at = now() + interval '30 days', reminder_sent = false
   where id = p_listing and seller_id = auth.uid() and status in ('active', 'expired')
     and is_active_user();
  if not found then raise exception 'Cannot renew this listing'; end if;
end $$;
grant execute on function renew_listing(uuid) to authenticated;

-- ---------- RLS ----------
alter table campuses enable row level security;
alter table categories enable row level security;
alter table profiles enable row level security;
alter table seller_profiles enable row level security;
alter table listings enable row level security;
alter table listing_images enable row level security;
alter table wanted_ads enable row level security;
alter table notifications enable row level security;
alter table blocks enable row level security;
alter table reports enable row level security;
alter table events enable row level security;
alter table receipts enable row level security;
alter table receipt_items enable row level security;
alter table admin_audit_log enable row level security;
alter table rate_limits enable row level security; -- no policies: service/definer only

-- campuses & categories: public read, admin write
create policy campuses_read on campuses for select using (active or is_admin());
create policy campuses_admin on campuses for all using (is_admin()) with check (is_admin());
create policy categories_read on categories for select using (active or is_admin());
create policy categories_admin on categories for all using (is_admin()) with check (is_admin());

-- profiles: private (own + admin). Public data via public_profiles view.
create policy profiles_self_read on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_self_update on profiles for update using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());
create policy profiles_admin_delete on profiles for delete using (is_admin());

-- seller profiles: public read; owner write
create policy seller_read on seller_profiles for select using (true);
create policy seller_insert on seller_profiles for insert with check (user_id = auth.uid() and is_active_user());
create policy seller_update on seller_profiles for update using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());
create policy seller_admin_delete on seller_profiles for delete using (is_admin());

-- listings
create policy listings_read on listings for select
  using (status in ('active', 'sold') or seller_id = auth.uid() or is_admin());
create policy listings_insert on listings for insert with check (
  seller_id = auth.uid() and is_active_user()
  and exists (select 1 from seller_profiles where user_id = auth.uid())
  and campus_id = (select campus_id from profiles where id = auth.uid())
);
create policy listings_admin_insert on listings for insert with check (is_admin());
create policy listings_update on listings for update using (seller_id = auth.uid() or is_admin())
  with check (seller_id = auth.uid() or is_admin());
create policy listings_delete on listings for delete using (seller_id = auth.uid() or is_admin());

create policy images_read on listing_images for select
  using (exists (select 1 from listings l where l.id = listing_id));
create policy images_write on listing_images for insert
  with check (exists (select 1 from listings l where l.id = listing_id and (l.seller_id = auth.uid() or is_admin())));
create policy images_delete on listing_images for delete
  using (exists (select 1 from listings l where l.id = listing_id and (l.seller_id = auth.uid() or is_admin())));

-- wanted ads
create policy wanted_read on wanted_ads for select using (status = 'active' or user_id = auth.uid() or is_admin());
create policy wanted_insert on wanted_ads for insert with check (
  user_id = auth.uid() and is_active_user()
  and campus_id = (select campus_id from profiles where id = auth.uid())
);
create policy wanted_update on wanted_ads for update using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());
create policy wanted_delete on wanted_ads for delete using (user_id = auth.uid() or is_admin());

-- notifications: owner reads / marks read; inserts by service role only
create policy notif_read on notifications for select using (user_id = auth.uid());
create policy notif_update on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on notifications from authenticated, anon;
grant update (read_at) on notifications to authenticated;
create policy notif_delete on notifications for delete using (user_id = auth.uid());

-- blocks
create policy blocks_read on blocks for select using (blocker_id = auth.uid() or is_admin());
create policy blocks_insert on blocks for insert with check (blocker_id = auth.uid() and is_active_user());
create policy blocks_delete on blocks for delete using (blocker_id = auth.uid());

-- reports (rate limited in the server action)
create policy reports_insert on reports for insert with check (reporter_id = auth.uid() and is_active_user());
create policy reports_read on reports for select using (reporter_id = auth.uid() or is_admin());
create policy reports_admin_update on reports for update using (is_admin()) with check (is_admin());

-- events: written only via RPC; sellers read their own listings' events; admins read all
create policy events_read on events for select using (
  is_admin() or exists (select 1 from listings l where l.id = listing_id and l.seller_id = auth.uid())
);

-- receipts: seller & buyer read; created/voided through RPCs (added in the receipts migration)
create policy receipts_read on receipts for select
  using (seller_id = auth.uid() or buyer_id = auth.uid() or is_admin());
create policy receipt_items_read on receipt_items for select
  using (exists (select 1 from receipts r where r.id = receipt_id
        and (r.seller_id = auth.uid() or r.buyer_id = auth.uid() or is_admin())));

-- audit log
create policy audit_read on admin_audit_log for select using (is_admin());
create policy audit_insert on admin_audit_log for insert with check (is_admin() and admin_id = auth.uid());
-- Public-read buckets; writes only into the caller's own folder (<user_id>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('listing-images', 'listing-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types, public = excluded.public;

create policy "public read images" on storage.objects for select
  using (bucket_id in ('listing-images', 'avatars'));
create policy "upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('listing-images', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "update own folder" on storage.objects for update to authenticated
  using (bucket_id in ('listing-images', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own folder" on storage.objects for delete to authenticated
  using (bucket_id in ('listing-images', 'avatars') and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
-- Server (service role) calls the rate limiter; keep it closed to anon/authenticated.
grant execute on function check_rate_limit(text, int, interval) to service_role;
-- Per-listing views and WhatsApp clicks for the signed-in seller (respects RLS).
create or replace function seller_listing_stats()
returns table (listing_id uuid, views bigint, contact_clicks bigint)
language sql stable security invoker set search_path = public as $$
  select e.listing_id,
         count(*) filter (where e.type = 'view'),
         count(*) filter (where e.type = 'contact_click')
  from events e join listings l on l.id = e.listing_id
  where l.seller_id = auth.uid()
  group by e.listing_id
$$;
grant execute on function seller_listing_stats() to authenticated;
-- Don't count a seller's own views; keep block-lookup internal (server/service role only).
create or replace function log_event(p_type event_type, p_listing uuid, p_session text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_type = 'contact_click' then raise exception 'Not allowed'; end if;
  if auth.uid() is null and (p_session is null or char_length(p_session) > 64) then return; end if;
  if p_listing is not null and exists (select 1 from listings where id = p_listing and seller_id = auth.uid()) then return; end if;
  insert into events (type, listing_id, user_id, session_key)
  values (p_type, p_listing, auth.uid(), case when auth.uid() is null then p_session end)
  on conflict do nothing;
end $$;

revoke execute on function is_blocked_between(uuid, uuid) from public, anon, authenticated;
grant execute on function is_blocked_between(uuid, uuid) to service_role;
-- Notification de-duplication + wanted-ad matching for new listings.
alter table notifications add column if not exists wanted_id uuid references wanted_ads(id) on delete cascade;
alter table notifications add column if not exists listing_id uuid references listings(id) on delete cascade;
create unique index if not exists notifications_match_once on notifications (wanted_id, listing_id);

-- Active wanted ads (notify=true) that a new listing satisfies: same campus + type,
-- and either the same category or a keyword found in the listing title/description.
create or replace function match_wanted_for_listing(p_listing uuid)
returns table (wanted_id uuid, user_id uuid, email text, full_name text, wanted_title text)
language sql stable security definer set search_path = public as $$
  select w.id, w.user_id, p.email, p.full_name, w.title
  from listings l
  join wanted_ads w on w.campus_id = l.campus_id and w.type = l.type
  join profiles p on p.id = w.user_id
  where l.id = p_listing
    and w.status = 'active' and w.notify
    and w.user_id <> l.seller_id
    and not p.suspended
    and not is_blocked_between(w.user_id, l.seller_id)
    and (
      w.category_id = l.category_id
      or exists (
        select 1 from unnest(w.keywords) k
        where length(trim(k)) > 1
          and position(lower(trim(k)) in lower(l.title || ' ' || l.description)) > 0
      )
    )
  limit 50
$$;
revoke execute on function match_wanted_for_listing(uuid) from public, anon, authenticated;
grant execute on function match_wanted_for_listing(uuid) to service_role;
-- Campuses (edit email_domain to enforce institutional emails; leave null to allow any email)
insert into campuses (name, county, email_domain) values
  ('University of Nairobi', 'Nairobi', null),
  ('Kenyatta University', 'Kiambu', null),
  ('Moi University', 'Uasin Gishu', null)
on conflict (name) do nothing;

insert into categories (slug, name, applies_to, sort_order) values
  ('electronics', 'Electronics', 'goods', 1),
  ('books', 'Books', 'goods', 2),
  ('clothes', 'Clothes', 'goods', 3),
  ('furniture', 'Furniture', 'goods', 4),
  ('food', 'Food', 'goods', 5),
  ('services-design', 'Design', 'service', 6),
  ('services-video', 'Video', 'service', 7),
  ('services-writing', 'Writing', 'service', 8),
  ('tutoring', 'Tutoring', 'service', 9),
  ('other', 'Other', 'both', 10)
on conflict (slug) do nothing;
