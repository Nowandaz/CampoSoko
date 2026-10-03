"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireMe } from "@/lib/auth";
import { allow } from "@/lib/rate-limit";
import { cleanText, firstError, safeNext } from "@/lib/validation";

export type SafetyState = { error?: string; notice?: string };

const REPORT_REASONS = ["Prohibited item or service", "Scam or fraud", "Fake or misleading", "Wrong category", "Inappropriate content", "Harassment", "Other"] as const;

const reportSchema = z.object({
  kind: z.enum(["listing", "user", "wanted"]),
  target: z.string().uuid(),
  category: z.enum(REPORT_REASONS, { message: "Choose a reason" }),
  details: z.string().transform(cleanText).pipe(z.string().max(300, "Details are too long")).optional(),
});

export async function submitReport(_: SafetyState, fd: FormData): Promise<SafetyState> {
  const me = await requireMe("/");
  if (me.suspended) return { error: "Your account is suspended." };
  const p = reportSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  if (!(await allow(`report:${me.id}`, 5, 86400))) return { error: "You've sent several reports today. Our team is reviewing them." };
  const sb = await createClient();
  const reason = p.data.category + (p.data.details ? `: ${p.data.details}` : "");
  let row: Record<string, string>;
  if (p.data.kind === "listing") {
    const { data: l } = await sb.from("listings").select("id, seller_id").eq("id", p.data.target).maybeSingle();
    if (!l) return { error: "Listing not found" };
    if (l.seller_id === me.id) return { error: "You can't report your own listing" };
    row = { listing_id: l.id, reported_user_id: l.seller_id };
  } else if (p.data.kind === "wanted") {
    const { data: w } = await sb.from("wanted_ads").select("id, user_id").eq("id", p.data.target).maybeSingle();
    if (!w) return { error: "Ad not found" };
    if (w.user_id === me.id) return { error: "You can't report your own ad" };
    row = { reported_user_id: w.user_id };
  } else {
    if (p.data.target === me.id) return { error: "You can't report yourself" };
    row = { reported_user_id: p.data.target };
  }
  const full = p.data.kind === "wanted" ? `[Wanted ad ${p.data.target}] ${reason}` : reason;
  const { error } = await sb.from("reports").insert({ reporter_id: me.id, reason: full.slice(0, 500), ...row });
  if (error) return { error: "Could not send your report. Please try again." };
  return { notice: "Thanks. Our team will review your report." };
}

export async function blockUser(fd: FormData) {
  const me = await requireMe("/");
  const target = z.string().uuid().parse(fd.get("id"));
  if (target !== me.id) {
    const sb = await createClient();
    await sb.from("blocks").upsert({ blocker_id: me.id, blocked_id: target }, { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true });
  }
  revalidatePath("/", "layout");
  redirect(safeNext(fd.get("back")));
}

export async function unblockUser(fd: FormData) {
  const me = await requireMe("/account");
  const target = z.string().uuid().parse(fd.get("id"));
  const sb = await createClient();
  { const { error } = await sb.from("blocks").delete().eq("blocker_id", me.id).eq("blocked_id", target); if (error) return { error: "That didn't save. Please try again." }; }
  revalidatePath("/account");
}
