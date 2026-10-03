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
