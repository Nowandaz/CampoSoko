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
   - `supabase/migrations/20260101000200_rate_limit_grant.sql`
   - `supabase/migrations/20260101000300_seller_stats.sql`
   - `supabase/migrations/20260101000400_events_privacy.sql`
   - `supabase/migrations/20260101000500_wanted_matching.sql`
   - `supabase/migrations/20260101000600_public_names.sql`
   - `supabase/migrations/20260101000700_receipts.sql`
   - `supabase/seed.sql` (3 campuses + categories)
   - Shortcut: paste `supabase/setup-all.sql` (all of the above) into the SQL Editor and run once.
4. Supabase dashboard → Authentication:
   - **Providers → Email**: enable; turn **off** "Confirm email" link flow is not needed, we use OTP codes.
   - **Email Templates → Confirm signup** and **Magic Link**: paste `supabase/email-templates/confirm-signup.html` and `magic-link.html` (branded, show the 6-digit `{{ .Token }}`). Set the subjects to "Verify your CampoSoko account" / "Your CampoSoko login code". Regenerate with `npm run emails:build`.
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
- [x] 2. OTP sign-up / login, campus dropdown, account page
- [x] 3. Seller profile, listings (goods + services), image upload, seller dashboard
- [x] 4. Public feed, search and filters, listing detail, WhatsApp contact, view tracking; optional password login
- [x] 5. Wanted ads, match alerts (in-app + email), notification bell
- [x] 6. Receipts: numbered, immutable, void with reason, PDF, WhatsApp share, public verification, My purchases
- [ ] 7–9. See project brief

## Testing on your phone
Run `npm run dev -- -H 0.0.0.0`, then open `http://<your-computer-ip>:3000` on a phone on the same Wi-Fi.
`next.config.ts` already allows private-network origins in development; restart the dev server after pulling.

## Demo data
`npm run seed:demo` adds sellers, ~36 listings (spread over every campus) and wanted ads. `npm run seed:clear` removes them.
The feed defaults to your own campus; use Filters, then Campus, then All campuses to see everything.
