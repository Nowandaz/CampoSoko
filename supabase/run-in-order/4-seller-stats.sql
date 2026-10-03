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
