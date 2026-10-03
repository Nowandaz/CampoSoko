-- Privacy: the public view no longer exposes full names. Public name = chosen display name,
-- else "First L." (first name + last initial). Sellers' listings show their shop name instead.
alter table profiles add column if not exists display_name text
  check (display_name is null or char_length(display_name) between 2 and 30);

drop view if exists public_profiles;
create view public_profiles as
  select p.id,
         coalesce(
           nullif(trim(p.display_name), ''),
           case when position(' ' in trim(p.full_name)) > 0
                then split_part(trim(p.full_name), ' ', 1) || ' ' || upper(left(regexp_replace(trim(p.full_name), '^.*\s', ''), 1)) || '.'
                else split_part(trim(p.full_name), ' ', 1) end
         ) as public_name,
         p.campus_id, s.shop_name, s.location as shop_location,
         s.description as shop_description, s.avatar_url, p.created_at
  from profiles p left join seller_profiles s on s.user_id = p.id
  where not p.suspended;
grant select on public_profiles to anon, authenticated;
