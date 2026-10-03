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
