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
