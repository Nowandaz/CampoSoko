import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ask, AiUnavailable } from "./client";
import { getSettings } from "./settings";
import { matchListingsForWanted, matchSellersForWanted, matchWantedForListing, moderateItems, type Cand } from "./tasks";
import { notifyBuyerOfListing, notifySellerOfWantedAd } from "@/lib/matching";

type Stats = { listings: number; wanted: number; moderated: number; flagged: number; hidden: number; buyerMatches: number; sellerMatches: number; calls: number; stopped?: string };

/**
 * Hourly AI pass over items not yet checked:
 *  1. moderation of titles/descriptions (flags for an admin, optional auto-hide),
 *  2. buyer <-> listing matching beyond the keyword rules,
 *  3. seller alerts for new wanted ads.
 * It stops early when the per-run call budget or the daily cap is reached.
 */
export async function runAiPass(): Promise<Stats> {
  const settings = await getSettings();
  const stats: Stats = { listings: 0, wanted: 0, moderated: 0, flagged: 0, hidden: 0, buyerMatches: 0, sellerMatches: 0, calls: 0 };
  if (!settings.ai_enabled) return { ...stats, stopped: "AI is switched off" };
  const admin = createAdminClient();
  const budget = () => stats.calls < settings.run_cap;
  const call = async (system: string, user: string, o?: { maxTokens?: number }) => { stats.calls++; return ask(system, user, o); };

  const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const [{ data: newListings }, { data: newWanted }] = await Promise.all([
    admin.from("listings").select("id, title, description, type, campus_id, seller_id, price").eq("ai_checked", false).eq("status", "active").gte("created_at", since).order("created_at", { ascending: false }).limit(settings.run_cap),
    admin.from("wanted_ads").select("id, title, description, type, campus_id, user_id, keywords, budget").eq("ai_checked", false).eq("status", "active").gte("created_at", since).order("created_at", { ascending: false }).limit(settings.run_cap),
  ]);
  stats.listings = newListings?.length ?? 0;
  stats.wanted = newWanted?.length ?? 0;
  const doneListings: string[] = [], doneWanted: string[] = [];

  try {
    // 1. moderation, 8 posts per call
    for (let i = 0; i < (newListings?.length ?? 0) && budget(); i += 8) {
      const batch = newListings!.slice(i, i + 8);
      const results = await moderateItems(call, batch.map((l) => ({ id: l.id, title: l.title, description: l.description })));
      stats.moderated += batch.length;
      for (const r of results) {
        if (r.verdict === "ok") continue;
        const l = batch.find((x) => x.id === r.id)!;
        const hide = settings.auto_hide && r.verdict === "prohibited" && r.confidence >= 0.9;
        await admin.from("content_flags").insert({ target_type: "listing", target_id: l.id, user_id: l.seller_id, category: `AI: ${r.category || r.verdict}`, matched: [r.verdict, `confidence ${r.confidence}`], excerpt: `${l.title}: ${l.description}`.slice(0, 200), status: hide ? "actioned" : "open" });
        stats.flagged++;
        if (hide) {
          await admin.from("listings").update({ status: "removed" }).eq("id", l.id);
          await admin.from("notifications").insert({ user_id: l.seller_id, kind: "listing_removed", title: `"${l.title}" was removed`, body: "It looked like it breaks the rules. Contact support if this is a mistake.", link: "/dashboard" });
          stats.hidden++;
        }
      }
    }
    for (let i = 0; i < (newWanted?.length ?? 0) && budget(); i += 8) {
      const batch = newWanted!.slice(i, i + 8);
      const results = await moderateItems(call, batch.map((w) => ({ id: w.id, title: w.title, description: w.description })));
      stats.moderated += batch.length;
      for (const r of results.filter((x) => x.verdict !== "ok")) {
        const w = batch.find((x) => x.id === r.id)!;
        await admin.from("content_flags").insert({ target_type: "wanted", target_id: w.id, user_id: w.user_id, category: `AI: ${r.category || r.verdict}`, matched: [r.verdict, `confidence ${r.confidence}`], excerpt: `${w.title}: ${w.description}`.slice(0, 200) });
        stats.flagged++;
      }
    }

    // 2a. each new wanted ad vs. current listings on its campus
    for (const w of newWanted ?? []) {
      if (!budget()) break;
      const { data: cands } = await admin.from("listings").select("id, title, description, price").eq("status", "active").gt("expires_at", new Date().toISOString())
        .eq("campus_id", w.campus_id).eq("type", w.type).neq("seller_id", w.user_id).order("created_at", { ascending: false }).limit(25);
      const list: Cand[] = (cands ?? []).map((c) => ({ id: c.id, title: c.title, description: c.description, extra: `KES ${c.price}` }));
      const hits = await matchListingsForWanted(call, { title: w.title, description: w.description, keywords: w.keywords, budget: w.budget }, list);
      for (const h of hits.slice(0, 5)) if (await notifyBuyerOfListing(w.id, h.id)) stats.buyerMatches++;

      // 3. which sellers would sell this?
      if (!budget()) { doneWanted.push(w.id); continue; }
      const { data: sellers } = await admin.from("seller_profiles").select("user_id, shop_name, description, tags, profiles!inner(campus_id, suspended)")
        .eq("profiles.campus_id", w.campus_id).eq("profiles.suspended", false).neq("user_id", w.user_id).not("tags", "eq", "{}").limit(25);
      const sc: Cand[] = (sellers ?? []).map((s) => ({ id: s.user_id, title: s.shop_name, description: s.description, extra: (s.tags ?? []).join(", ") }));
      const sh = await matchSellersForWanted(call, { title: w.title, description: w.description }, sc);
      for (const h of sh.slice(0, 8)) if (await notifySellerOfWantedAd(h.id, w.id)) stats.sellerMatches++;
      doneWanted.push(w.id);
    }

    // 2b. each new listing vs. open wanted ads on its campus
    for (const l of newListings ?? []) {
      if (!budget()) break;
      const { data: cands } = await admin.from("wanted_ads").select("id, title, description, budget").eq("status", "active").eq("notify", true)
        .eq("campus_id", l.campus_id).eq("type", l.type).neq("user_id", l.seller_id).order("created_at", { ascending: false }).limit(25);
      const list: Cand[] = (cands ?? []).map((c) => ({ id: c.id, title: c.title, description: c.description, extra: c.budget ? `budget KES ${c.budget}` : undefined }));
      const hits = await matchWantedForListing(call, { title: l.title, description: l.description, price: Number(l.price) }, list);
      for (const h of hits.slice(0, 8)) if (await notifyBuyerOfListing(h.id, l.id)) stats.buyerMatches++;
      doneListings.push(l.id);
    }
  } catch (e) {
    stats.stopped = e instanceof AiUnavailable ? e.message : `Error: ${e instanceof Error ? e.message : e}`;
  } finally {
    // Only items that were fully processed are marked, so a failure retries them next hour.
    if (doneListings.length) await admin.from("listings").update({ ai_checked: true }).in("id", doneListings);
    if (doneWanted.length) await admin.from("wanted_ads").update({ ai_checked: true }).in("id", doneWanted);
  }
  return stats;
}

/** Wraps a run with bookkeeping in ai_runs. */
export async function runAndRecord() {
  const admin = createAdminClient();
  const { data: row } = await admin.from("ai_runs").insert({}).select("id").single();
  let stats: Stats | null = null, error: string | null = null;
  try { stats = await runAiPass(); } catch (e) { error = e instanceof Error ? e.message : String(e); }
  if (row) await admin.from("ai_runs").update({ finished_at: new Date().toISOString(), stats, error: error ?? stats?.stopped ?? null }).eq("id", row.id);
  return { stats, error };
}
