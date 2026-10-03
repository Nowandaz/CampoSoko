# CampoSoko: Your Campus. Your Soko.

A free, mobile-first campus marketplace for university students in Kenya. Students list goods and online
services, post what they want (and get alerted on matches), contact each other on WhatsApp, issue receipts, and
admins manage everything from a dashboard.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage, RLS) · SMTP email · Vercel.

The app name lives in one constant: `src/config/site.ts` (`APP_NAME`).

## 1. Local setup

1. `npm install` (run it again after every `git pull`, new packages are added over time).
2. Create a free project at <https://supabase.com>.
3. Copy `.env.example` to `.env.local` and fill it in (Project Settings, then API, for the URL and keys).
4. Create the database. In the Supabase **SQL Editor**, run these files **in order** (each as its own query):

   | # | File (`supabase/run-in-order/`) | What it adds |
   |---|---|---|
   | 1 | `1-schema.sql` | Tables, RLS, triggers, helper functions |
   | 2 | `2-storage.sql` | Image buckets (5MB, jpg/png/webp) and policies |
   | 3 | `3-seed.sql` | 3 campuses and the 10 categories |
   | 4 | `4-seller-stats.sql` | Views and WhatsApp-click stats for sellers |
   | 5 | `5-events-privacy.sql` | Own views not counted; block lookups kept internal |
   | 6 | `6-wanted-matching.sql` | Wanted-ad matching for new listings |
   | 7 | `7-public-names.sql` | Public display names (full names stay private) |
   | 8 | `8-receipts.sql` | Receipts, void, public verification |
   | 9 | `9-admin.sql` | Admin dashboard statistics |
   | 10 | `10-shops-reviews-tags.sql` | Seller tags, shops, thumbs reviews |
   | 11 | `11-content-flags.sql` | Automatic content flags for admin review |
   | 12 | `12-ai-and-review.sql` | AI providers and settings, manual photo-review queue |
   | 13 | `13-account-deletion.sql` | Lets accounts be deleted while keeping receipts as anonymous records |

   The same SQL is in `supabase/migrations/` (for the Supabase CLI: `supabase db push`). `supabase/setup-all.sql`
   is everything in one file for a brand-new project.
5. **Email codes.** Supabase dashboard, Authentication:
   - Providers, Email: enabled; set **Email OTP Length** to 6.
   - SMTP Settings: turn on custom SMTP using your `SMTP_*` values.
   - Email Templates, **Confirm signup** and **Magic Link**: paste `supabase/email-templates/confirm-signup.html`
     and `magic-link.html` (regenerate with `npm run emails:build`). Test your SMTP with `npm run smtp:test`.
   - URL Configuration: set Site URL to your site (`http://localhost:3000` locally).
6. `npm run dev` and open <http://localhost:3000>.
7. Optional demo data: `npm run seed:demo` (36 listings over every campus, plus wanted ads). `npm run seed:clear` removes it.
8. Make yourself admin (SQL Editor): `update profiles set role = 'admin' where email = 'you@example.com';`

### Testing on your phone
Run `npm run dev -- -H 0.0.0.0` and open `http://<your-computer-ip>:3000` on a phone on the same Wi-Fi.
`next.config.ts` already allows private-network origins in development. Restart the dev server after pulling.

## 2. Deploying to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add every variable from `.env.example` in Project Settings, Environment Variables. Set `NEXT_PUBLIC_SITE_URL` to
   your production URL, and `CRON_SECRET` to a long random string.
3. Deploy. `vercel.json` schedules the daily job (05:00 UTC) that expires old listings and emails sellers 3 days
   before expiry. Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically.
4. In Supabase, set Authentication, URL Configuration, Site URL to the production URL.

## 3. Features

- Passwordless sign-up with an emailed code, then a password for every later login. Codes are used again only for
  "Forgot password". Campus email-domain rule is enforced in the app and the database.
- Seller profile (with tags), goods and online-service listings, 5 photos each (compressed in the browser), edit, sold,
  renew, delete, per-listing views and WhatsApp clicks.
- Public feed with category rows, search, filters, shops directory and shop pages.
- Wanted ads with alerts: buyers are notified of matching new listings; sellers are notified when a wanted ad matches
  their shop tags. In-app bell and branded emails.
- WhatsApp contact only for logged-in, non-blocked users (numbers never appear in public pages or API responses).
- Receipts: numbered, immutable, void with reason, PDF, WhatsApp share, public verification page with masked details,
  My purchases, and thumbs-up/down reviews.
- Self-serve account deletion (Account page, needs password): removes profile, shop, listings, wanted ads, photos and
  notifications; receipts stay as anonymous records.
- Themed feedback everywhere: toasts and confirm dialogs instead of browser pop-ups, live in-app notifications (bell + toast
  within ~30s), clear offline/server error messages, and friendly redirect notices.
- Report and block. Terms and Privacy drafts (**have a lawyer review them before launch**).
- Admin (`/admin`): stats and charts, listings, wanted ads, users, reports, receipts, campuses, categories, flags,
  audit log, CSV export.
- Posting guard rails: prohibited-content rules, new-account limits, duplicate blocking, and an admin flag queue.
- Optional AI (Admin, AI): add several providers (OpenRouter, Groq, OpenAI, Gemini, Anthropic) with weights and failover.
  An hourly pass checks new posts for banned content (text only, photos are never sent) and finds extra buyer/seller matches.
  Sellers get a shop-writing helper, buyers get "Smart search". Photos are reviewed manually: admins get a bell alert.

## 3b. The hourly AI pass
Vercel's free plan only runs a cron once a day, so the hourly AI job is triggered by a free GitHub Action
(`.github/workflows/hourly.yml`). In your GitHub repo add two secrets (Settings, Secrets and variables, Actions):
`SITE_URL` (your production URL) and `CRON_SECRET` (same value as in Vercel). You can also run it by hand from
Admin, AI, "Run AI check now". Per-run and per-day call limits are in the same page.

## 4. Security notes

- Row Level Security is on every table. Users edit only their own rows; admin access is checked in the proxy, in
  every admin page and action, and by RLS.
- WhatsApp numbers sit in the private `profiles` table; they are revealed through the `get_listing_contact` /
  `get_wanted_contact` functions only to logged-in, non-blocked users, and every reveal is rate limited.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only (`src/lib/supabase/admin.ts` imports `server-only`).
- Rate limits: sign-in codes and wrong codes, password attempts, listing creation (10/day, fewer for new accounts),
  wanted ads (10/day), receipts (50/day), reports (5/day), contact reveals (60/hour), reviews.
- All input is validated with Zod and cleaned of control characters and HTML; output is escaped by React.
- Security headers are set in `next.config.ts`.

## 5. Scripts

`npm run dev` · `build` · `start` · `lint` · `typecheck` · `test` (16 checks) · `seed:demo` · `seed:clear` · `emails:build` · `smtp:test`

## 6. Becoming an admin, and promoting others
Run the SQL in step 8 once. Admins can then promote or demote others at `/admin/users`.
