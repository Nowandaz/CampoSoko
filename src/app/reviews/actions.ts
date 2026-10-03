"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { allow, clientIp } from "@/lib/rate-limit";
import { cleanText } from "@/lib/validation";
import { checkText } from "@/lib/guard";

export type ReviewState = { error?: string; notice?: string; done?: "up" | "down" };

export async function submitReview(_: ReviewState, fd: FormData): Promise<ReviewState> {
  const token = String(fd.get("token") ?? "");
  const positive = fd.get("rating") === "up" ? true : fd.get("rating") === "down" ? false : null;
  if (!/^[0-9a-f]{32}$/.test(token) || positive === null) return { error: "Choose thumbs up or thumbs down" };
  if (!(await allow(`review:${await clientIp()}`, 20, 3600))) return { error: "Too many reviews from this connection. Try later." };
  const comment = cleanText(String(fd.get("comment") ?? "")).slice(0, 300);
  const guard = checkText([comment]);
  if (guard.error) return { error: "Please keep your comment respectful and free of prohibited content." };
  const sb = await createClient();
  const { error } = await sb.rpc("submit_review", { p_token: token, p_positive: positive, p_comment: comment || null });
  if (error) {
    if (/already reviewed/i.test(error.message)) return { error: "This purchase has already been reviewed." };
    if (/voided/i.test(error.message)) return { error: "This receipt was voided, so it can't be reviewed." };
    if (/yourself/i.test(error.message)) return { error: "You can't review your own sale." };
    return { error: "Could not save your review. Please try again." };
  }
  revalidatePath(`/r/${token}`);
  return { notice: "Thanks for your feedback.", done: positive ? "up" : "down" };
}
