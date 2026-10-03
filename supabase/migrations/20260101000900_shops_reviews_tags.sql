-- Seller tags, shop directory, thumbs-up/down reviews tied to receipts, seller alerts for wanted ads.
alter table seller_profiles add column if not exists tags text[] not null default '{}'
  check (cardinality(tags) <= 12);
create index if not exists seller_tags_gin on seller_profiles using gin (tags);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null unique references receipts(id) on delete cascade,
  seller_id uuid not null references profiles(id) on delete cascade,
  reviewer_id uuid references profiles(id) on delete set null,
  positive boolean not null,
  comment text check (comment is null or char_length(comment) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists reviews_seller_idx on reviews (seller_id, created_at desc);
alter table reviews enable row level security;
create policy reviews_admin_read on reviews for select using (is_admin() or seller_id = auth.uid());
create policy reviews_admin_delete on reviews for delete using (is_admin());

-- One review per receipt. The receipt's secret link is the proof of purchase (works without an account).
create or replace function submit_review(p_token text, p_positive boolean, p_comment text) returns void
language plpgsql security definer set search_path = public as $$
declare r receipts;
begin
  select * into r from receipts where public_token = p_token;
  if not found then raise exception 'Receipt not found'; end if;
  if r.voided then raise exception 'This receipt was voided'; end if;
  if auth.uid() is not null and auth.uid() = r.seller_id then raise exception 'You cannot review yourself'; end if;
  if exists (select 1 from reviews where receipt_id = r.id) then raise exception 'Already reviewed'; end if;
  insert into reviews (receipt_id, seller_id, reviewer_id, positive, comment)
  values (r.id, r.seller_id, auth.uid(), p_positive, nullif(left(trim(coalesce(p_comment, '')), 300), ''));
end $$;
grant execute on function submit_review(text, boolean, text) to anon, authenticated;

create or replace function get_receipt_review(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('positive', v.positive, 'comment', v.comment)
  from reviews v join receipts r on r.id = v.receipt_id where r.public_token = p_token
$$;
grant execute on function get_receipt_review(text) to anon, authenticated;

-- Shop directory + single shop (public, no contact data).
create or replace function shop_directory(p_campus uuid, p_q text, p_limit int, p_offset int)
returns table (user_id uuid, shop_name text, location text, description text, avatar_url text, tags text[],
               campus_id uuid, listing_count bigint, up bigint, down bigint, total bigint)
language sql stable security definer set search_path = public as $$
  with shops as (
    select sp.user_id, sp.shop_name, sp.location, sp.description, sp.avatar_url, sp.tags, p.campus_id,
           (select count(*) from listings l where l.seller_id = sp.user_id and l.status = 'active' and l.expires_at > now()) as listing_count,
           (select count(*) from reviews v where v.seller_id = sp.user_id and v.positive) as up,
           (select count(*) from reviews v where v.seller_id = sp.user_id and not v.positive) as down
    from seller_profiles sp join profiles p on p.id = sp.user_id
    where not p.suspended
      and (p_campus is null or p.campus_id = p_campus)
      and (p_q is null or p_q = '' or sp.shop_name ilike '%' || p_q || '%' or array_to_string(sp.tags, ' ') ilike '%' || p_q || '%')
  )
  select s.*, count(*) over () from shops s where s.listing_count > 0
  order by s.up desc, s.listing_count desc, s.shop_name
  limit least(p_limit, 60) offset p_offset
$$;
grant execute on function shop_directory(uuid, text, int, int) to anon, authenticated;

create or replace function get_shop(p_user uuid)
returns table (user_id uuid, shop_name text, location text, description text, avatar_url text, tags text[],
               campus_id uuid, member_since timestamptz, up bigint, down bigint)
language sql stable security definer set search_path = public as $$
  select sp.user_id, sp.shop_name, sp.location, sp.description, sp.avatar_url, sp.tags, p.campus_id, p.created_at,
         (select count(*) from reviews v where v.seller_id = sp.user_id and v.positive),
         (select count(*) from reviews v where v.seller_id = sp.user_id and not v.positive)
  from seller_profiles sp join profiles p on p.id = sp.user_id
  where sp.user_id = p_user and not p.suspended
$$;
grant execute on function get_shop(uuid) to anon, authenticated;

create or replace function shop_reviews(p_seller uuid, p_limit int)
returns table (positive boolean, comment text, created_at timestamptz, buyer text)
language sql stable security definer set search_path = public as $$
  select v.positive, v.comment, v.created_at,
         case when position(' ' in trim(r.buyer_name)) > 0
              then split_part(trim(r.buyer_name), ' ', 1) || ' ' || upper(left(regexp_replace(trim(r.buyer_name), '^.*\s', ''), 1)) || '.'
              else trim(r.buyer_name) end
  from reviews v join receipts r on r.id = v.receipt_id
  where v.seller_id = p_seller order by v.created_at desc limit least(p_limit, 30)
$$;
grant execute on function shop_reviews(uuid, int) to anon, authenticated;

-- Sellers whose tags match a new wanted ad (same campus). Used to alert them.
create or replace function match_sellers_for_wanted(p_wanted uuid)
returns table (user_id uuid, email text, full_name text, shop_name text)
language sql stable security definer set search_path = public as $$
  select sp.user_id, p.email, p.full_name, sp.shop_name
  from wanted_ads w
  join profiles p on p.campus_id = w.campus_id
  join seller_profiles sp on sp.user_id = p.id
  where w.id = p_wanted and w.status = 'active'
    and p.id <> w.user_id and not p.suspended
    and not is_blocked_between(p.id, w.user_id)
    and exists (
      select 1 from unnest(sp.tags) t
      where length(trim(t)) >= 3
        and position(lower(trim(t)) in lower(w.title || ' ' || w.description || ' ' || array_to_string(w.keywords, ' '))) > 0
    )
  limit 50
$$;
revoke execute on function match_sellers_for_wanted(uuid) from public, anon, authenticated;
grant execute on function match_sellers_for_wanted(uuid) to service_role;
