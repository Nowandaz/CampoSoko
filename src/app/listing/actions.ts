"use server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMe } from "@/lib/auth";
import { allow } from "@/lib/rate-limit";
import { APP_NAME, SITE_URL } from "@/config/site";
import { z } from "zod";

const id = z.string().uuid();

/** Records a view (deduped per user/session per listing per day in the database). */
export async function trackView(listingId: string) {
  if (!id.safeParse(listingId).success) return;
  const jar = await cookies();
  let sid = jar.get("cs_sid")?.value;
  if (!sid) {
    sid = crypto.randomUUID();
    jar.set("cs_sid", sid, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365, path: "/" });
  }
  const sb = await createClient();
  await sb.rpc("log_event", { p_type: "view", p_listing: listingId, p_session: sid });
}

/** Returns a wa.me link. The seller's number is only ever sent to logged-in, non-blocked users. */
export async function revealContact(listingId: string): Promise<{ url?: string; error?: string }> {
  if (!id.safeParse(listingId).success) return { error: "Listing not found" };
  const me = await getMe();
  if (!me) return { error: "Please log in to message the seller." };
  if (me.suspended) return { error: "Your account is suspended." };
  if (!(await allow(`reveal:${me.id}`, 60, 3600))) return { error: "You've contacted many sellers recently. Please try again later." };

  const sb = await createClient();
  const { data: number, error } = await sb.rpc("get_listing_contact", { p_listing: listingId });
  if (error || !number) return { error: "Contact isn't available for this listing." };
  const { data: l } = await sb.from("listings").select("title").eq("id", listingId).single();
  const text = `Hi, I saw your post '${l?.title ?? "your listing"}' on ${APP_NAME}. Is it still available?\n${SITE_URL}/listing/${listingId}`;
  return { url: `https://wa.me/${String(number).replace(/\D/g, "")}?text=${encodeURIComponent(text)}` };
}

/** Server-side check that hides contact buttons between blocked users. */
export async function isBlocked(a: string, b: string) {
  const { data } = await createAdminClient().rpc("is_blocked_between", { a, b });
  return data === true;
}
