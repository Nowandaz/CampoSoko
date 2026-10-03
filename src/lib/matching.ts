import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { matchEmail } from "@/lib/email/templates";

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
