# CampoSoko — Your Campus. Your Soko.

Free, mobile-first campus marketplace for Kenyan university students.
Next.js (App Router) · TypeScript · Tailwind · Supabase (Postgres, Auth OTP, Storage, RLS).

The app name lives in one place: `src/config/site.ts` (`APP_NAME`).

## Local setup

1. `npm install`
2. Create a free project at <https://supabase.com>. Copy `.env.example` to `.env.local` and fill in
   the project URL, anon key and service-role key (Project Settings → API).
3. Apply the database (SQL Editor, in order — or `supabase db push` with the CLI):
   - `supabase/migrations/20260101000000_schema.sql`
   - `supabase/migrations/20260101000100_storage.sql`
   - `supabase/seed.sql` (3 campuses + categories)
4. Supabase dashboard → Authentication:
   - **Providers → Email**: enable; turn **off** "Confirm email" link flow is not needed, we use OTP codes.
   - **Email Templates → Magic Link / Confirm signup**: include `{{ .Token }}` so a 6-digit code is emailed.
   - **SMTP Settings**: enable custom SMTP using the same values as `SMTP_*` in `.env.local`.
5. `npm run dev` → <http://localhost:3000>
6. Optional demo data: `npm run seed:demo`
7. Make yourself admin: `update profiles set role = 'admin' where email = 'you@example.com';`

## Scripts
`npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint` · `npm run seed:demo`

## Security notes
- RLS is enabled on every table. WhatsApp numbers live only in `profiles` (readable by owner/admin);
  they are revealed to logged-in, non-blocked users solely through the `get_listing_contact` RPC.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only (`src/lib/supabase/admin.ts` imports `server-only`).

## Build progress
- [x] 1. Setup, schema, RLS, seed
- [ ] 2–9. See project brief
