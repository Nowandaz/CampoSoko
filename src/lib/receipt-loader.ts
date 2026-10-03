import "server-only";
import QRCode from "qrcode";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyUrl, type ReceiptData } from "@/lib/receipts";

export const qrFor = (token: string) => QRCode.toDataURL(verifyUrl(token), { margin: 1, width: 240 });

/** Full receipt for the seller / buyer / admin (RLS decides access). */
export async function loadOwnReceipt(sb: SupabaseClient, id: string, viewerId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data: r } = await sb.from("receipts").select("*, receipt_items(name, quantity, unit_price, id)").eq("id", id).maybeSingle();
  if (!r) return null;
  const { data: seller } = await sb.from("seller_profiles").select("shop_name").eq("user_id", r.seller_id).maybeSingle();
  const isSeller = r.seller_id === viewerId;
  const items = [...(r.receipt_items ?? [])].sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id));
  const data: ReceiptData = {
    receipt_no: r.receipt_no, sale_date: r.sale_date, seller: seller?.shop_name ?? "Seller", buyer: r.buyer_name,
    buyer_contact: isSeller || r.buyer_id === viewerId ? (r.buyer_phone ?? r.buyer_email) : null,
    payment_method: r.payment_method, mpesa_code: r.mpesa_code, notes: r.notes, total: Number(r.total),
    voided: r.voided, void_reason: r.void_reason, token: r.public_token,
    items: items.map((i: { name: string; quantity: number; unit_price: number | string }) => ({ name: i.name, quantity: i.quantity, unit_price: Number(i.unit_price) })),
  };
  return { data, isSeller, buyerPhone: r.buyer_phone as string | null, id: r.id as string };
}

/** Masked receipt for the public verification page. */
export async function loadPublicReceipt(sb: SupabaseClient, token: string): Promise<ReceiptData | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  const { data } = await sb.rpc("get_public_receipt", { p_token: token });
  if (!data) return null;
  return {
    receipt_no: data.receipt_no, sale_date: data.sale_date, seller: data.seller, buyer: data.buyer, buyer_contact: data.buyer_contact,
    payment_method: data.payment_method, mpesa_code: data.mpesa_code, notes: data.notes, total: Number(data.total),
    voided: data.voided, void_reason: data.void_reason, token,
    items: (data.items ?? []).map((i: { name: string; quantity: number; unit_price: number }) => ({ ...i, unit_price: Number(i.unit_price) })),
  };
}
