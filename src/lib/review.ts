import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSettings } from "@/lib/ai/settings";

/** Tells admins a listing with photos is waiting for a manual look (the AI never sees photos). */
export async function notifyPhotoReview(listingId: string, title: string) {
  try {
    const settings = await getSettings();
    if (!settings.notify_photo_reviews) return;
    const admin = createAdminClient();
    const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin").eq("suspended", false);
    for (const a of admins ?? []) {
      const { count } = await admin.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", a.id).eq("kind", "photo_review").is("read_at", null);
      if ((count ?? 0) >= 30) continue; // do not flood the bell during busy periods
      await admin.from("notifications").insert({ user_id: a.id, kind: "photo_review", title: `New photos to review: ${title}`, body: "Check the photos look fine", link: "/admin/listings?photos=pending&review=1", listing_id: listingId });
    }
  } catch (e) {
    console.error("[review] could not notify admins:", e instanceof Error ? e.message : e);
  }
}

/** A seller changed photos: they need a fresh look. */
export async function resetPhotoReview(listingId: string, title: string) {
  try {
    await createAdminClient().from("listings").update({ photos_reviewed: false }).eq("id", listingId);
    await notifyPhotoReview(listingId, title);
  } catch { /* best effort */ }
}
