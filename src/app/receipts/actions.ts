"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMe } from "@/lib/auth";
import { firstError } from "@/lib/validation";
import { receiptSchema } from "@/lib/receipts";
import { RECEIPT_PREFIX } from "@/config/site";

export type ReceiptState = { error?: string };

export async function createReceipt(_: ReceiptState, fd: FormData): Promise<ReceiptState> {
  const me = await requireMe("/receipts/new");
  if (me.suspended) return { error: "Your account is suspended." };
  const names = fd.getAll("item_name"), qtys = fd.getAll("item_qty"), prices = fd.getAll("item_price");
  const items = names.map((n, i) => ({ name: String(n), quantity: String(qtys[i] ?? ""), unit_price: String(prices[i] ?? "") }));
  const parsed = receiptSchema.safeParse({
    listing_id: fd.get("listing_id") ?? "", buyer_name: fd.get("buyer_name"), buyer_phone: fd.get("buyer_phone") ?? "",
    buyer_email: fd.get("buyer_email") ?? "", payment_method: fd.get("payment_method"), mpesa_code: fd.get("mpesa_code") ?? "",
    notes: fd.get("notes") ?? "", sale_date: fd.get("sale_date"), items,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = parsed.data;

  const sb = await createClient();
  const { data, error } = await sb.rpc("create_receipt", {
    p_prefix: RECEIPT_PREFIX, p_listing: v.listing_id || null, p_buyer_name: v.buyer_name, p_buyer_phone: v.buyer_phone,
    p_buyer_email: v.buyer_email, p_payment: v.payment_method, p_mpesa: v.mpesa_code, p_notes: v.notes || null,
    p_date: v.sale_date, p_items: v.items,
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) {
    const m = error?.message ?? "";
    if (/in stock/i.test(m)) return { error: m.replace(/^.*(Only \d+ in stock).*$/i, "$1") + ". Lower the quantity or update the listing." };
    if (/daily receipt limit/i.test(m)) return { error: "You've reached today's limit of 50 receipts." };
    return { error: "Could not issue the receipt. Please check the details and try again." };
  }
  revalidatePath("/receipts");
  revalidatePath("/dashboard");
  redirect(`/receipts/${row.id}?issued=1`);
}

export async function voidReceipt(_: ReceiptState, fd: FormData): Promise<ReceiptState> {
  await requireMe("/receipts");
  const id = String(fd.get("id") ?? "");
  const reason = String(fd.get("reason") ?? "").replace(/[\u0000-\u001F]|<[^>]*>/g, "").trim().slice(0, 300);
  if (reason.length < 3) return { error: "Please give a reason (at least 3 characters)." };
  const sb = await createClient();
  const { error } = await sb.rpc("void_receipt", { p_id: id, p_reason: reason });
  if (error) return { error: /already void/i.test(error.message) ? "This receipt is already void." : "Could not void the receipt." };
  revalidatePath(`/receipts/${id}`);
  revalidatePath("/receipts");
  redirect(`/receipts/${id}`);
}
