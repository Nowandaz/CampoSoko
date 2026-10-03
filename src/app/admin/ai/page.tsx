import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/ai/settings";
import { PageTitle } from "@/components/admin/ui";
import { ProviderDialog, ProviderList, RunNowButton, SettingsForm, TestButton, type ProviderRow } from "@/components/admin/AiAdmin";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "AI" };

export default async function Page() {
  await requireAdmin();
  const admin = createAdminClient();
  const day = new Date().toISOString().slice(0, 10);
  const [{ data: providers, error }, settings, { data: usage }, { data: runs }] = await Promise.all([
    admin.from("ai_providers").select("id, name, type, key_hint, endpoint, model, weight, active").order("created_at"),
    getSettings(),
    admin.from("ai_usage").select("calls, failures").eq("day", day).maybeSingle(),
    admin.from("ai_runs").select("id, started_at, stats, error").order("started_at", { ascending: false }).limit(5),
  ]);
  return (
    <div className="space-y-8">
      <PageTitle title="AI">
        <TestButton />
        <ProviderDialog>Add provider</ProviderDialog>
      </PageTitle>
      {error && <p className="rounded-2xl bg-danger/10 p-5 text-sm text-danger">AI isn&apos;t set up yet. Run <code>supabase/run-in-order/12-ai-and-review.sql</code> in the Supabase SQL Editor.</p>}

      <section aria-labelledby="providers" className="space-y-3">
        <div><h2 id="providers" className="text-lg font-semibold">Providers</h2>
          <p className="text-sm text-muted-foreground">Add several keys (for example free OpenRouter keys). Active providers share the work by weight, and if one fails or hits its limit the next is tried.</p></div>
        <ProviderList providers={(providers ?? []) as ProviderRow[]} />
      </section>

      <section aria-labelledby="settings" className="space-y-3">
        <h2 id="settings" className="text-lg font-semibold">What the AI does</h2>
        <p className="text-sm text-muted-foreground">Each new post is checked for banned content and matched against wanted ads, listings and sellers within seconds, and an hourly sweep catches anything missed. Photos are never sent to the AI.</p>
        <SettingsForm s={settings} />
      </section>

      <section aria-labelledby="activity" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="activity" className="text-lg font-semibold">Activity</h2>
          <RunNowButton />
        </div>
        <p className="text-sm text-muted-foreground">Today: {usage?.calls ?? 0} of {settings.daily_cap} AI calls used{usage?.failures ? `, ${usage.failures} failed` : ""}.</p>
        {runs?.length ? (
          <ul className="divide-y divide-border rounded-2xl bg-card ring-1 ring-border">
            {runs.map((r) => {
              const s = r.stats as { moderated?: number; flagged?: number; buyerMatches?: number; sellerMatches?: number; calls?: number; stopped?: string } | null;
              return (
                <li key={r.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{timeAgo(r.started_at)}</span>
                  <span>{s ? `${s.moderated ?? 0} checked · ${s.flagged ?? 0} flagged · ${s.buyerMatches ?? 0} buyer + ${s.sellerMatches ?? 0} seller alerts · ${s.calls ?? 0} calls` : "No stats"}{r.error ? <span className="ml-2 text-danger">{r.error}</span> : null}</span>
                </li>
              );
            })}
          </ul>
        ) : <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No runs yet. The hourly job will appear here.</p>}
      </section>
    </div>
  );
}
