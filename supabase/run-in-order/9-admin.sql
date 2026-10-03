-- Admin dashboard aggregates. All functions refuse non-admins.
create or replace function admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not is_admin() then raise exception 'Not allowed'; end if;
  with buyers as (
    select user_id from wanted_ads
    union
    select user_id from events where type = 'contact_click' and user_id is not null
  )
  select jsonb_build_object(
    'total_users', (select count(*) from profiles),
    'sellers', (select count(*) from seller_profiles),
    'buyers', (select count(*) from buyers),
    'both', (select count(*) from buyers b join seller_profiles s on s.user_id = b.user_id),
    'new_users_week', (select count(*) from profiles where created_at > now() - interval '7 days'),
    'active_goods', (select count(*) from listings where status = 'active' and type = 'goods' and expires_at > now()),
    'active_services', (select count(*) from listings where status = 'active' and type = 'service' and expires_at > now()),
    'wanted_ads', (select count(*) from wanted_ads where status = 'active'),
    'receipts', (select count(*) from receipts),
    'receipts_void', (select count(*) from receipts where voided),
    'deals_done', (select count(*) from listings where status = 'sold'),
    'open_reports', (select count(*) from reports where status = 'open'),
    'views_7', (select count(*) from events where type = 'view' and created_at > now() - interval '7 days'),
    'views_30', (select count(*) from events where type = 'view' and created_at > now() - interval '30 days'),
    'clicks_7', (select count(*) from events where type = 'contact_click' and created_at > now() - interval '7 days'),
    'clicks_30', (select count(*) from events where type = 'contact_click' and created_at > now() - interval '30 days'),
    'signups', (select coalesce(jsonb_agg(jsonb_build_object('d', to_char(d, 'YYYY-MM-DD'), 'n', coalesce(c.n, 0)) order by d), '[]'::jsonb)
                from generate_series(current_date - 29, current_date, interval '1 day') d
                left join (select created_at::date as dd, count(*) n from profiles where created_at >= current_date - 29 group by 1) c on c.dd = d::date),
    'posts', (select coalesce(jsonb_agg(jsonb_build_object('d', to_char(d, 'YYYY-MM-DD'), 'n', coalesce(c.n, 0)) order by d), '[]'::jsonb)
              from generate_series(current_date - 29, current_date, interval '1 day') d
              left join (select created_at::date as dd, count(*) n from listings where created_at >= current_date - 29 group by 1) c on c.dd = d::date)
  ) into r;
  return r;
end $$;
grant execute on function admin_overview() to authenticated;

create or replace function admin_listing_stats(p_ids uuid[])
returns table (listing_id uuid, views bigint, clicks bigint, reports bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not allowed'; end if;
  return query
    select l.id,
           (select count(*) from events e where e.listing_id = l.id and e.type = 'view'),
           (select count(*) from events e where e.listing_id = l.id and e.type = 'contact_click'),
           (select count(*) from reports r where r.listing_id = l.id)
    from unnest(p_ids) as l(id);
end $$;
grant execute on function admin_listing_stats(uuid[]) to authenticated;

create or replace function admin_user_stats(p_ids uuid[])
returns table (user_id uuid, listings bigint, wanted bigint, receipts bigint, reports bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Not allowed'; end if;
  return query
    select u.id,
           (select count(*) from listings l where l.seller_id = u.id),
           (select count(*) from wanted_ads w where w.user_id = u.id),
           (select count(*) from receipts r where r.seller_id = u.id),
           (select count(*) from reports rp where rp.reported_user_id = u.id)
    from unnest(p_ids) as u(id);
end $$;
grant execute on function admin_user_stats(uuid[]) to authenticated;
