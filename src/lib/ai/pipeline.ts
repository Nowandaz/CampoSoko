import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ask, AiUnavailable } from "./client";
import { getSettings, type AiSettings } from "./settings";
import { matchListingsForWanted, matchSellersForWanted, matchWantedForListing, moderateItems, type Cand, type ModResult } from "./tasks";
import { notifyBuyerOfListing, notifySellerOfWantedAd } from "@/lib/matching";

type Admin = ReturnType<typeof createAdminClient>;
export type Stats = { listings: number; wanted: number; moderated: number; flagged: number; hidden: number; buyerMatches: number; sellerMatches: number; calls: number; stopped?: string };
const emptyStats = (): Stats => ({ listings: 0, wanted: 0, moderated: 0, flagged: 0, hidden: 0, buyerMatches: 0, sellerMatches: 0, calls: 0 });

type Ctx = { admin: Admin; settings: AiSettings; stats: Stats; call: (system: string, user: string, o?: { maxTokens?: number }) => Promise<string>; budget: () => boolean };
function makeCtx(settings: AiSettings, stats: Stats, cap: number): Ctx {
  return { admin: createAdminClient(), settings, stats, budget: () => stats.calls < cap, call: async (s, u, o) => { stats.calls++; return ask(s, u, o); } };
}

type ListingRow = { id: string; title: string; description: string; type: string; campus_id: string; seller_id: string; price: number | string };
type WantedRow = { id: string; title: string; description: string; type: string; campus_id: string; user_id: string; keywords: string[]; budget: number | null };

/** Records an AI finding for an admin (once per post), and optionally hides a clearly prohibited listing. */
async function recordVerdict(c: Ctx, target: "listing" | "wanted", row: { id: string; title: string; description: string; owner: string }, r: ModResult) {
  if (r.verdict === "ok") return;
  const hide = target === "listing" && c.settings.auto_hide && r.verdict === "prohibited" && r.confidence >= 0.9;
  const { data: existing } = await c.admin.from("content_flags").select("id").eq("target_id", row.id).like("category", "AI:%").limit(1);
  if (!existing?.length) {
    await c.admin.from("content_flags").insert({
      target_type: target, target_id: row.id, user_id: row.owner, category: `AI: ${r.category || r.verdict}`,
      matched: [r.verdict, `confidence ${r.confidence}`], excerpt: `${row.title}: ${row.description}`.slice(0, 200), status: hide ? "actioned" : "open",
    });
    c.stats.flagged++;
  }
  if (hide) {
    await c.admin.from("listings").update({ status: "removed" }).eq("id", row.id);
    await c.admin.from("notifications").insert({ user_id: row.owner, kind: "listing_removed", title: `"${row.title}" was removed`, body: "It looked like it breaks the rules. Contact support if this is a mistake.", link: "/dashboard" });
    c.stats.hidden++;
  }
}

async function moderateListings(c: Ctx, rows: ListingRow[]) {
  for (let i = 0; i < rows.length && c.budget(); i += 8) {
    const batch = rows.slice(i, i + 8);
    const results = await moderateItems(c.call, batch.map((l) => ({ id: l.id, title: l.title, description: l.description })));
    c.stats.moderated += batch.length;
    for (const r of results) { const l = batch.find((x) => x.id === r.id)!; await recordVerdict(c, "listing", { id: l.id, title: l.title, description: l.description, owner: l.seller_id }, r); }
  }
}
async function moderateWanted(c: Ctx, rows: WantedRow[]) {
  for (let i = 0; i < rows.length && c.budget(); i += 8) {
    const batch = rows.slice(i, i + 8);
    const results = await moderateItems(c.call, batch.map((w) => ({ id: w.id, title: w.title, description: w.description })));
    c.stats.moderated += batch.length;
    for (const r of results) { const w = batch.find((x) => x.id === r.id)!; await recordVerdict(c, "wanted", { id: w.id, title: w.title, description: w.description, owner: w.user_id }, r); }
  }
}

/** A wanted ad: which current listings fit it, and which sellers would sell it? */
async function matchForWanted(c: Ctx, w: WantedRow) {
  const { data: cands } = await c.admin.from("listings").select("id, title, description, price").eq("status", "active").gt("expires_at", new Date().toISOString())
    .eq("campus_id", w.campus_id).eq("type", w.type).neq("seller_id", w.user_id).order("created_at", { ascending: false }).limit(25);
  const list: Cand[] = (cands ?? []).map((x) => ({ id: x.id, title: x.title, description: x.description, extra: `KES ${x.price}` }));
  const hits = await matchListingsForWanted(c.call, { title: w.title, description: w.description, keywords: w.keywords, budget: w.budget }, list);
  for (const h of hits.slice(0, 5)) if (await notifyBuyerOfListing(w.id, h.id)) c.stats.buyerMatches++;
  if (!c.budget()) return;
  const { data: sellers } = await c.admin.from("seller_profiles").select("user_id, shop_name, description, tags, profiles!inner(campus_id, suspended)")
    .eq("profiles.campus_id", w.campus_id).eq("profiles.suspended", false).neq("user_id", w.user_id).not("tags", "eq", "{}").limit(25);
  const sc: Cand[] = (sellers ?? []).map((s) => ({ id: s.user_id, title: s.shop_name, description: s.description, extra: (s.tags ?? []).join(", ") }));
  const sh = await matchSellersForWanted(c.call, { title: w.title, description: w.description }, sc);
  for (const h of sh.slice(0, 8)) if (await notifySellerOfWantedAd(h.id, w.id)) c.stats.sellerMatches++;
}

/** A listing: which open wanted ads does it satisfy? */
async function matchForListing(c: Ctx, l: ListingRow) {
  const { data: cands } = await c.admin.from("wanted_ads").select("id, title, description, budget").eq("status", "active").eq("notify", true)
    .eq("campus_id", l.campus_id).eq("type", l.type).neq("user_id", l.seller_id).order("created_at", { ascending: false }).limit(25);
  const list: Cand[] = (cands ?? []).map((x) => ({ id: x.id, title: x.title, description: x.description, extra: x.budget ? `budget KES ${x.budget}` : undefined }));
  const hits = await matchWantedForListing(c.call, { title: l.title, description: l.description, price: Number(l.price) }, list);
  for (const h of hits.slice(0, 8)) if (await notifyBuyerOfListing(h.id, l.id)) c.stats.buyerMatches++;
}

const LISTING_COLS = "id, title, description, type, campus_id, seller_id, price";
const WANTED_COLS = "id, title, description, type, campus_id, user_id, keywords, budget";

/**
 * Runs the AI checks for ONE post right after it is created or edited (moderation + matching).
 * If the AI is down or capped, the post stays unchecked until an admin presses "Check waiting posts now".
 */
export async function checkListingNow(id: string) {
  try {
    const settings = await getSettings();
    if (!settings.ai_enabled || !settings.check_on_post) return;
    const c = makeCtx(settings, emptyStats(), 4);
    await c.admin.from("listings").update({ ai_checked: false }).eq("id", id);
    const { data: l } = await c.admin.from("listings").select(LISTING_COLS).eq("id", id).eq("status", "active").maybeSingle();
    if (!l) return;
    await moderateListings(c, [l as ListingRow]);
    const { data: still } = await c.admin.from("listings").select("status").eq("id", id).single();
    if (still?.status === "active") await matchForListing(c, l as ListingRow);
    await c.admin.from("listings").update({ ai_checked: true }).eq("id", id);
  } catch (e) {
    console.error("[ai] post check left for the manual "Check waiting posts now" button:", e instanceof AiUnavailable ? e.message : e);
  }
}

export async function checkWantedNow(id: string) {
  try {
    const settings = await getSettings();
    if (!settings.ai_enabled || !settings.check_on_post) return;
    const c = makeCtx(settings, emptyStats(), 5);
    const { data: w } = await c.admin.from("wanted_ads").select(WANTED_COLS).eq("id", id).eq("status", "active").maybeSingle();
    if (!w) return;
    await moderateWanted(c, [w as WantedRow]);
    await matchForWanted(c, w as WantedRow);
    await c.admin.from("wanted_ads").update({ ai_checked: true }).eq("id", id);
  } catch (e) {
    console.error("[ai] wanted check left for the manual "Check waiting posts now" button:", e instanceof AiUnavailable ? e.message : e);
  }
}

/**
 * Manual sweep (Admin, AI): anything not yet checked (the AI was down, capped, or the post is older than the on-post feature),
 * newest first, within the per-run call budget.
 */
export async function runAiPass(): Promise<Stats> {
  const settings = await getSettings();
  const stats = emptyStats();
  if (!settings.ai_enabled) return { ...stats, stopped: "AI is switched off" };
  const c = makeCtx(settings, stats, settings.run_cap);
  const admin = c.admin;
  const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const settle = new Date(Date.now() - 2 * 60_000).toISOString(); // leave very new posts to their own on-post check
  const [{ data: newListings }, { data: newWanted }] = await Promise.all([
    admin.from("listings").select(LISTING_COLS).eq("ai_checked", false).eq("status", "active").gte("created_at", since).lt("created_at", settle).order("created_at", { ascending: false }).limit(settings.run_cap),
    admin.from("wanted_ads").select(WANTED_COLS).eq("ai_checked", false).eq("status", "active").gte("created_at", since).lt("created_at", settle).order("created_at", { ascending: false }).limit(settings.run_cap),
  ]);
  stats.listings = newListings?.length ?? 0;
  stats.wanted = newWanted?.length ?? 0;
  const doneListings: string[] = [], doneWanted: string[] = [];
  try {
    await moderateListings(c, (newListings ?? []) as ListingRow[]);
    await moderateWanted(c, (newWanted ?? []) as WantedRow[]);
    for (const w of (newWanted ?? []) as WantedRow[]) { if (!c.budget()) break; await matchForWanted(c, w); doneWanted.push(w.id); }
    for (const l of (newListings ?? []) as ListingRow[]) { if (!c.budget()) break; await matchForListing(c, l); doneListings.push(l.id); }
  } catch (e) {
    stats.stopped = e instanceof AiUnavailable ? e.message : `Error: ${e instanceof Error ? e.message : e}`;
  } finally {
    // Only fully processed items are marked, so a failure retries them next hour.
    if (doneListings.length) await admin.from("listings").update({ ai_checked: true }).in("id", doneListings);
    if (doneWanted.length) await admin.from("wanted_ads").update({ ai_checked: true }).in("id", doneWanted);
  }
  return stats;
}

/** Wraps a sweep with bookkeeping in ai_runs. */
export async function runAndRecord() {
  const admin = createAdminClient();
  const { data: row } = await admin.from("ai_runs").insert({}).select("id").single();
  let stats: Stats | null = null, error: string | null = null;
  try { stats = await runAiPass(); } catch (e) { error = e instanceof Error ? e.message : String(e); }
  if (row) await admin.from("ai_runs").update({ finished_at: new Date().toISOString(), stats, error: error ?? stats?.stopped ?? null }).eq("id", row.id);
  return { stats, error };
}
