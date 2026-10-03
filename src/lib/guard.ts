import "server-only";
import { APP_NAME } from "@/config/site";
import { createAdminClient } from "@/lib/supabase/admin";
import { blockMessage, dedupeKey, moderate, type Verdict } from "@/lib/moderation";
import type { SupabaseClient } from "@supabase/supabase-js";

export type TargetType = "listing" | "wanted" | "seller_profile" | "review" | "profile";

/** Returns an error string when the text must be refused, else the verdict (which may be a "flag"). */
export function checkText(texts: (string | null | undefined)[]): { error?: string; verdict: Verdict } {
  const verdict = moderate(texts);
  return verdict.action === "block" ? { error: blockMessage(verdict, APP_NAME), verdict } : { verdict };
}

/** Queues a suspicious post for an admin to review. Never throws: moderation must not break posting. */
export async function recordFlag(v: Verdict, o: { targetType: TargetType; targetId: string; userId: string; excerpt: string }) {
  if (v.action !== "flag") return;
  try {
    await createAdminClient().from("content_flags").insert({
      target_type: o.targetType, target_id: o.targetId, user_id: o.userId,
      category: v.label ?? v.category ?? "flagged", matched: v.matched.slice(0, 6), excerpt: o.excerpt.slice(0, 200),
    });
  } catch (e) {
    console.error("[guard] could not record flag:", e instanceof Error ? e.message : e);
  }
}

/** New accounts get a small daily posting allowance; repeated identical titles are refused. */
export async function checkPostingLimits(sb: SupabaseClient, userId: string, title: string): Promise<string | null> {
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [{ data: prof }, { count }, { data: recent }] = await Promise.all([
    sb.from("profiles").select("created_at").eq("id", userId).maybeSingle(),
    sb.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", userId).gte("created_at", dayAgo),
    sb.from("listings").select("title").eq("seller_id", userId).in("status", ["active", "sold"]).gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString()),
  ]);
  const isNew = prof?.created_at && Date.now() - new Date(prof.created_at).getTime() < 86_400_000;
  if (isNew && (count ?? 0) >= 3) return "New accounts can post up to 3 listings in their first day. Please come back tomorrow.";
  const key = dedupeKey(title);
  if ((recent ?? []).some((r) => dedupeKey(r.title) === key)) return "You already posted a listing with this title recently. Edit or renew that one instead.";
  return null;
}
