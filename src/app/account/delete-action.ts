"use server";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createClient as createPlain } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireMe } from "@/lib/auth";
import { allow } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { accountDeletedEmail } from "@/lib/email/templates";

export type DeleteState = { error?: string };

async function wipeFolder(bucket: string, uid: string) {
  const admin = createAdminClient();
  const { data } = await admin.storage.from(bucket).list(uid, { limit: 1000 });
  if (data?.length) await admin.storage.from(bucket).remove(data.map((f) => `${uid}/${f.name}`));
}

export async function deleteAccount(_: DeleteState, fd: FormData): Promise<DeleteState> {
  const me = await requireMe("/account");
  if (String(fd.get("confirm") ?? "").trim() !== "DELETE") return { error: "Type DELETE (in capital letters) to confirm" };
  const password = String(fd.get("password") ?? "");
  if (!password) return { error: "Enter your password to confirm" };
  if (!(await allow(`delete:${me.id}`, 5, 3600))) return { error: "Too many attempts. Try again in an hour." };

  // Re-check the password with a throwaway client so the current session is untouched.
  const check = createPlain(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: pe } = await check.auth.signInWithPassword({ email: me.email, password });
  if (pe) return { error: "That password isn't right" };

  const admin = createAdminClient();
  if (me.role === "admin") {
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").eq("suspended", false);
    if ((count ?? 0) <= 1) return { error: "You are the only admin. Make someone else an admin before deleting this account." };
  }

  // Keep the seller's name on receipts they issued, then remove files and the account itself.
  const { data: shop } = await admin.from("seller_profiles").select("shop_name").eq("user_id", me.id).maybeSingle();
  await admin.from("receipts").update({ seller_name: shop?.shop_name ?? me.full_name }).eq("seller_id", me.id);
  await Promise.all([wipeFolder("listing-images", me.id), wipeFolder("avatars", me.id)]).catch(() => undefined);
  const { error } = await admin.auth.admin.deleteUser(me.id);
  if (error) {
    console.error("[account] delete failed:", error.message);
    return { error: /receipts|foreign key|violates/i.test(error.message) ? "Run supabase/run-in-order/13-account-deletion.sql first, then try again." : "We couldn't delete your account. Please email support." };
  }
  after(() => sendEmail({ to: me.email, ...accountDeletedEmail({ name: me.full_name }) }).catch(() => undefined));
  await (await createClient()).auth.signOut();
  redirect("/?deleted=1");
}
