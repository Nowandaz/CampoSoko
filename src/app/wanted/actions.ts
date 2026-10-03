"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireMe, getMe } from "@/lib/auth";
import { allow } from "@/lib/rate-limit";
import { wantedSchema, firstError } from "@/lib/validation";
import { APP_NAME, SITE_URL } from "@/config/site";

export type WantedState = { error?: string };

export async function createWanted(_: WantedState, fd: FormData): Promise<WantedState> {
  const me = await requireMe("/wanted/new");
  if (me.suspended) return { error: "Your account is suspended." };
  const parsed = wantedSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (!(await allow(`wanted:${me.id}`, 10, 86400))) return { error: "You've reached today's limit of 10 wanted ads." };
  const v = parsed.data;
  const sb = await createClient();
  const { data: cat } = await sb.from("categories").select("applies_to").eq("id", v.category_id).eq("active", true).single();
  if (!cat || (cat.applies_to !== "both" && cat.applies_to !== v.type)) return { error: "Choose a category that matches the type" };
  const { error } = await sb.from("wanted_ads").insert({
    user_id: me.id, campus_id: me.campus_id, type: v.type, title: v.title, description: v.description,
    category_id: v.category_id, budget: v.budget ?? null, keywords: v.keywords, notify: v.notify,
  });
  if (error) return { error: "Could not post your ad. Please try again." };
  revalidatePath("/dashboard");
  redirect("/dashboard?wanted=1");
}

export async function closeWanted(fd: FormData) {
  const me = await requireMe("/dashboard");
  const sb = await createClient();
  await sb.from("wanted_ads").update({ status: "fulfilled" }).eq("id", String(fd.get("id"))).eq("user_id", me.id);
  revalidatePath("/dashboard");
}

export async function deleteWanted(fd: FormData) {
  const me = await requireMe("/dashboard");
  const sb = await createClient();
  await sb.from("wanted_ads").delete().eq("id", String(fd.get("id"))).eq("user_id", me.id);
  revalidatePath("/dashboard");
}

export async function revealWantedContact(wantedId: string): Promise<{ url?: string; error?: string }> {
  if (!z.string().uuid().safeParse(wantedId).success) return { error: "Ad not found" };
  const me = await getMe();
  if (!me) return { error: "Please log in to contact this buyer." };
  if (me.suspended) return { error: "Your account is suspended." };
  if (!(await allow(`reveal:${me.id}`, 60, 3600))) return { error: "You've contacted many people recently. Please try again later." };
  const sb = await createClient();
  const { data: number, error } = await sb.rpc("get_wanted_contact", { p_wanted: wantedId });
  if (error || !number) return { error: "Contact isn't available for this ad." };
  const { data: w } = await sb.from("wanted_ads").select("title").eq("id", wantedId).single();
  const text = `Hi, I saw your wanted post '${w?.title ?? "your ad"}' on ${APP_NAME} and I may have what you need.\n${SITE_URL}/wanted/${wantedId}`;
  return { url: `https://wa.me/${String(number).replace(/\D/g, "")}?text=${encodeURIComponent(text)}` };
}
