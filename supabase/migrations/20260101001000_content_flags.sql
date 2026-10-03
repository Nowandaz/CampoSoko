-- Automatic content flags (suspicious but not clearly prohibited posts) for admin review.
create table if not exists content_flags (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('listing', 'wanted', 'seller_profile', 'review', 'profile')),
  target_id uuid not null,
  user_id uuid references profiles(id) on delete cascade,
  category text not null,
  matched text[] not null default '{}',
  excerpt text,
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at timestamptz not null default now()
);
create index if not exists content_flags_open_idx on content_flags (status, created_at desc);
alter table content_flags enable row level security;
-- Rows are written by the server with the service role; only admins can read or resolve them.
create policy content_flags_admin_read on content_flags for select using (is_admin());
create policy content_flags_admin_update on content_flags for update using (is_admin()) with check (is_admin());
