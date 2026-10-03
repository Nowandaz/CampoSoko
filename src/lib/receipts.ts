import { z } from "zod";
import { SITE_URL } from "@/config/site";
import { cleanText, emailSchema, normaliseKenyanPhone } from "@/lib/validation";

export type ReceiptItem = { name: string; quantity: number; unit_price: number };
export type ReceiptData = {
  receipt_no: string; sale_date: string; seller: string; buyer: string; buyer_contact: string | null;
  payment_method: "mpesa" | "cash" | "other"; mpesa_code: string | null; notes: string | null; total: number;
  voided: boolean; void_reason: string | null; items: ReceiptItem[]; token: string;
};

export const verifyUrl = (token: string) => `${SITE_URL}/r/${token}`;
export const money = (n: number | string) => `KES ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
export const methodLabel = { mpesa: "M-Pesa", cash: "Cash", other: "Other" } as const;
export const DISCLAIMER = (app: string) => `This receipt is a record of a transaction between users. ${app} is not a party to the transaction.`;

const itemSchema = z.object({
  name: z.string().transform(cleanText).pipe(z.string().min(1, "Each item needs a name").max(100)),
  quantity: z.coerce.number().int("Quantity must be a whole number").min(1, "Quantity must be at least 1").max(9999),
  unit_price: z.coerce.number({ message: "Enter a valid price" }).min(0, "Price can't be negative").max(10_000_000),
});

export const receiptSchema = z.object({
  listing_id: z.string().uuid().optional().or(z.literal("")),
  buyer_name: z.string().transform(cleanText).pipe(z.string().min(2, "Enter the buyer's name").max(80)),
  buyer_phone: z.string().trim().optional(),
  buyer_email: z.string().trim().optional(),
  payment_method: z.enum(["mpesa", "cash", "other"]),
  mpesa_code: z.string().trim().toUpperCase().optional(),
  notes: z.string().transform(cleanText).pipe(z.string().max(500, "Notes are too long")).optional(),
  sale_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the sale date"),
  items: z.array(itemSchema).min(1, "Add at least one item").max(20, "At most 20 items"),
}).transform((v, ctx) => {
  const phone = v.buyer_phone ? normaliseKenyanPhone(v.buyer_phone) : null;
  if (v.buyer_phone && !phone) ctx.addIssue({ code: "custom", path: ["buyer_phone"], message: "Enter a valid Kenyan phone number" });
  const email = v.buyer_email ? emailSchema.safeParse(v.buyer_email) : null;
  if (email && !email.success) ctx.addIssue({ code: "custom", path: ["buyer_email"], message: "Enter a valid email" });
  if (!phone && !(email?.success)) ctx.addIssue({ code: "custom", path: ["buyer_phone"], message: "Enter the buyer's phone or email" });
  if (v.mpesa_code && !/^[A-Z0-9]{8,12}$/.test(v.mpesa_code)) ctx.addIssue({ code: "custom", path: ["mpesa_code"], message: "M-Pesa code should be 8 to 12 letters and digits" });
  return { ...v, buyer_phone: phone, buyer_email: email?.success ? email.data : null, mpesa_code: v.payment_method === "mpesa" ? v.mpesa_code || null : null };
});
