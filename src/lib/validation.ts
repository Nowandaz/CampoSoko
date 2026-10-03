import { z } from "zod";

/** Normalise Kenyan numbers (0712 345 678, 712345678, +254712345678, 254712345678) to +254XXXXXXXXX. */
export function normaliseKenyanPhone(input: string): string | null {
  const d = input.replace(/[\s\-().]/g, "");
  const m = d.match(/^(?:\+?254|0)?([17]\d{8})$/);
  return m ? `+254${m[1]}` : null;
}

export const whatsappSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normaliseKenyanPhone(v);
    if (!n) ctx.addIssue({ code: "custom", message: "Enter a valid Kenyan number, e.g. 0712 345 678" });
    return n ?? "";
  });

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email").max(254);
export const otpSchema = z.string().trim().regex(/^\d{6,10}$/, "Enter the code from your email");

export const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(80),
  email: emailSchema,
  whatsapp: whatsappSchema,
  campus_id: z.string().uuid("Choose your campus"),
  accept: z.literal("on", { message: "You must accept the Terms and Privacy Policy" }),
});

export const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  whatsapp: whatsappSchema,
});

/** Only allow same-site relative redirects. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/(?![/\\])/.test(next) ? next : "/";
}

export function firstError(e: z.ZodError) {
  return e.issues[0]?.message ?? "Invalid input";
}
