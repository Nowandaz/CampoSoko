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
export const otpSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");

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

// ---------- text sanitising ----------
/** Strips control characters and HTML tags; output is also escaped by React on render. */
export function cleanText(v: string) {
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/<[^>]*>/g, "").trim();
}
const text = (min: number, max: number, label: string) =>
  z.string().transform(cleanText).pipe(
    z.string().min(min, `${label} is too short`).max(max, `${label} is too long`),
  );

export const sellerProfileSchema = z.object({
  shop_name: text(2, 60, "Shop name"),
  location: text(2, 100, "Location"),
  description: text(20, 600, "Description"),
  avatar_url: z.string().url().optional().or(z.literal("")),
});

const money = z.coerce.number({ message: "Enter a valid price" }).min(0, "Price can't be negative").max(10_000_000, "Price is too high");

export const listingSchema = z.object({
  type: z.enum(["goods", "service"]),
  title: text(3, 100, "Title"),
  description: text(10, 2000, "Description"),
  category_id: z.string().uuid("Choose a category"),
  condition: z.enum(["new", "used"]).optional(),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1").max(9999).optional(),
  price: money,
  location: text(2, 100, "Location"),
  delivery_time: z.string().transform(cleanText).pipe(z.string().max(40)).optional(),
  portfolio_url: z.string().trim().url("Portfolio link must be a full URL").refine((u) => /^https?:\/\//i.test(u), "Use http(s) links only").optional().or(z.literal("")),
  prohibited_ack: z.literal("on", { message: "Confirm that your listing has no prohibited items" }),
}).superRefine((v, ctx) => {
  if (v.type === "goods") {
    if (!v.condition) ctx.addIssue({ code: "custom", path: ["condition"], message: "Choose a condition" });
    if (!v.quantity) ctx.addIssue({ code: "custom", path: ["quantity"], message: "Enter a quantity" });
  } else if (!v.delivery_time) {
    ctx.addIssue({ code: "custom", path: ["delivery_time"], message: "Enter an estimated delivery time, e.g. 2 days" });
  }
});

export const passwordSchema = z.string().min(8, "Use at least 8 characters").max(72, "Password is too long");
export const newPasswordSchema = z.object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] });
