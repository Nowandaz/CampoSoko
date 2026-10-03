import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { demandEmail, matchEmail } from "@/lib/email/templates";

/** Finds wanted ads matching a new listing, creates in-app notifications (once per pair) and emails the buyers. */
export async function notifyWantedMatches(listingId: string) {
  const admin = createAdminClient();
  const { data: matches, error } = await admin.rpc("match_wanted_for_listing", { p_listing: listingId });
  if (error || !matches?.length) return 0;
  const { data: l } = await admin.from("listings").select("title, price").eq("id", listingId).single();
  if (!l) return 0;
  let sent = 0;
  for (const m of matches as { wanted_id: string; user_id: string; email: string; full_name: string; wanted_title: string }[]) {
    const { data: inserted } = await admin.from("notifications").upsert({
      user_id: m.user_id, kind: "wanted_match", title: `New match: ${l.title}`,
      body: `Matches your wanted ad "${m.wanted_title}"`, link: `/listing/${listingId}`,
      wanted_id: m.wanted_id, listing_id: listingId,
    }, { onConflict: "wanted_id,listing_id", ignoreDuplicates: true }).select("id");
    if (!inserted?.length) continue; // already notified for this pair
    try {
      const mail = matchEmail({ name: m.full_name, wantedTitle: m.wanted_title, listingTitle: l.title, price: Number(l.price), listingId });
      await sendEmail({ to: m.email, ...mail });
      sent++;
    } catch (e) {
      console.error("[matching] email failed:", e instanceof Error ? e.message : e);
    }
  }
  return sent;
}

/** Alerts sellers whose shop tags match a newly posted wanted ad (in-app + email). */
export async function notifySellersOfWanted(wantedId: string) {
  const admin = createAdminClient();
  const { data: sellers, error } = await admin.rpc("match_sellers_for_wanted", { p_wanted: wantedId });
  if (error || !sellers?.length) return 0;
  const { data: w } = await admin.from("wanted_ads").select("title").eq("id", wantedId).single();
  if (!w) return 0;
  let sent = 0;
  for (const s of sellers as { user_id: string; email: string; full_name: string; shop_name: string }[]) {
    await admin.from("notifications").insert({
      user_id: s.user_id, kind: "wanted_demand", title: `Wanted on campus: ${w.title}`,
      body: "Matches the tags on your shop", link: `/wanted/${wantedId}`, wanted_id: wantedId,
    });
    try {
      await sendEmail({ to: s.email, ...demandEmail({ name: s.full_name, shop: s.shop_name, wantedTitle: w.title, wantedId }) });
      sent++;
    } catch (e) {
      console.error("[matching] seller email failed:", e instanceof Error ? e.message : e);
    }
  }
  return sent;
}

/** Notify one buyer that a listing fits their wanted ad (used by the AI check). Returns true if newly notified. */
export async function notifyBuyerOfListing(wantedId: string, listingId: string) {
  const admin = createAdminClient();
  const [{ data: w }, { data: l }] = await Promise.all([
    admin.from("wanted_ads").select("title, user_id, notify, status, profiles(email, full_name, suspended)").eq("id", wantedId).single(),
    admin.from("listings").select("title, price, status, seller_id").eq("id", listingId).single(),
  ]);
  const p = w?.profiles as unknown as { email: string; full_name: string; suspended: boolean } | null;
  if (!w || !l || !p || !w.notify || w.status !== "active" || l.status !== "active" || p.suspended || w.user_id === l.seller_id) return false;
  const { data: inserted } = await admin.from("notifications").upsert({
    user_id: w.user_id, kind: "wanted_match", title: `New match: ${l.title}`, body: `Matches your wanted ad "${w.title}"`,
    link: `/listing/${listingId}`, wanted_id: wantedId, listing_id: listingId,
  }, { onConflict: "wanted_id,listing_id", ignoreDuplicates: true }).select("id");
  if (!inserted?.length) return false;
  try {
    await sendEmail({ to: p.email, ...matchEmail({ name: p.full_name, wantedTitle: w.title, listingTitle: l.title, price: Number(l.price), listingId }) });
  } catch (e) {
    console.error("[matching] email failed:", e instanceof Error ? e.message : e);
  }
  return true;
}

/** Notify one seller that a wanted ad matches what they sell. Skips if already told about this ad. */
export async function notifySellerOfWantedAd(sellerId: string, wantedId: string) {
  const admin = createAdminClient();
  const { data: seen } = await admin.from("notifications").select("id").eq("user_id", sellerId).eq("wanted_id", wantedId).eq("kind", "wanted_demand").limit(1);
  if (seen?.length) return false;
  const [{ data: w }, { data: s }] = await Promise.all([
    admin.from("wanted_ads").select("title, user_id, status").eq("id", wantedId).single(),
    admin.from("profiles").select("email, full_name, suspended, seller_profiles(shop_name)").eq("id", sellerId).single(),
  ]);
  const shop = (s?.seller_profiles as unknown as { shop_name: string } | { shop_name: string }[] | null);
  const shopName = Array.isArray(shop) ? shop[0]?.shop_name : shop?.shop_name;
  if (!w || !s || s.suspended || w.status !== "active" || w.user_id === sellerId) return false;
  await admin.from("notifications").insert({ user_id: sellerId, kind: "wanted_demand", title: `Wanted on campus: ${w.title}`, body: "Looks like something you sell", link: `/wanted/${wantedId}`, wanted_id: wantedId });
  try {
    await sendEmail({ to: s.email, ...demandEmail({ name: s.full_name, shop: shopName ?? "your shop", wantedTitle: w.title, wantedId }) });
  } catch (e) {
    console.error("[matching] seller email failed:", e instanceof Error ? e.message : e);
  }
  return true;
}
