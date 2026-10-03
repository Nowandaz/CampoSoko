"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allow, clientIp } from "@/lib/rate-limit";
import { emailSchema, otpSchema, signupSchema, profileSchema, safeNext, firstError } from "@/lib/validation";
import { requireMe } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type FormState = { error?: string; step?: "code"; email?: string; notice?: string };

const GENERIC_SENT = "If this email can be used, a 6-digit code is on its way.";

/** Logs the real cause server-side; shows users a helpful (non-sensitive) message. */
function describeSendError(error: { message: string; status?: number; code?: string }) {
  console.error("[auth] signInWithOtp failed:", error.status, error.code, error.message);
  const m = error.message.toLowerCase();
  if (error.status === 429 || m.includes("rate limit")) return "Too many emails sent right now. Please wait a few minutes and try again.";
  if (m.includes("sending") && m.includes("email")) return "We couldn't send the email. The mail server (SMTP) settings need checking.";
  if (m.includes("database error")) return "Your details were rejected (check the campus email rule and WhatsApp number).";
  return "Could not send the code. Please try again.";
}

async function limited(email: string) {
  const ip = await clientIp();
  const okEmail = await allow(`otp:email:${email}`, 5, 3600);
  const okIp = await allow(`otp:ip:${ip}`, 20, 3600);
  const okCooldown = await allow(`otp:cool:${email}`, 1, 45);
  return { okEmail, okIp, okCooldown };
}

export async function requestSignupCode(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { email, full_name, whatsapp, campus_id } = parsed.data;

  const admin = createAdminClient();
  const { data: campus } = await admin.from("campuses").select("id, name, email_domain, active").eq("id", campus_id).single();
  if (!campus?.active) return { error: "Please choose a valid campus" };
  if (campus.email_domain) {
    const d = email.split("@")[1];
    if (d !== campus.email_domain && !d.endsWith("." + campus.email_domain)) {
      return { error: `Use your ${campus.name} email (@${campus.email_domain})` };
    }
  }
  const rl = await limited(email);
  if (!rl.okCooldown) return { error: "Please wait a moment before requesting another code", step: "code", email };
  if (!rl.okEmail || !rl.okIp) return { error: "Too many attempts. Try again in an hour." };

  const sb = await createClient();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, data: { full_name, whatsapp, campus_id } },
  });
  if (error) return { error: describeSendError(error) };
  return { step: "code", email, notice: GENERIC_SENT };
}

export async function requestLoginCode(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(fd.get("email"));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const email = parsed.data;
  const rl = await limited(email);
  if (!rl.okCooldown) return { error: "Please wait a moment before requesting another code", step: "code", email };
  if (!rl.okEmail || !rl.okIp) return { error: "Too many attempts. Try again in an hour." };
  const sb = await createClient();
  // shouldCreateUser:false: unknown emails get no code; we answer identically to avoid account enumeration.
  await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  return { step: "code", email, notice: GENERIC_SENT };
}

export async function verifyCode(_: FormState, fd: FormData): Promise<FormState> {
  const email = emailSchema.safeParse(fd.get("email"));
  const token = otpSchema.safeParse(fd.get("code"));
  if (!email.success || !token.success) return { error: "Enter the 6-digit code", step: "code", email: String(fd.get("email") ?? "") };
  if (!(await allow(`verify:${email.data}`, 10, 900)) || !(await allow(`verify:ip:${await clientIp()}`, 40, 900))) {
    return { error: "Too many wrong codes. Wait 15 minutes and request a new one.", step: "code", email: email.data };
  }
  const sb = await createClient();
  const { error } = await sb.auth.verifyOtp({ email: email.data, token: token.data, type: "email" });
  if (error) return { error: "That code is wrong or expired. Request a new one.", step: "code", email: email.data };
  redirect(safeNext(fd.get("next")));
}

export async function logout() {
  const sb = await createClient();
  await sb.auth.signOut();
  redirect("/");
}

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireMe("/account");
  const parsed = profileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const sb = await createClient();
  const { error } = await sb.from("profiles").update(parsed.data).eq("id", me.id);
  if (error) return { error: "Could not save your changes" };
  revalidatePath("/account");
  return { notice: "Saved ✔" };
}
