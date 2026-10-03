"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireMe } from "@/lib/auth";
import { listingSchema, sellerProfileSchema, firstError } from "@/lib/validation";
import { MAX_IMAGES } from "@/config/site";

export type SellState = { error?: string; notice?: string };

const storageBase = (bucket: string, uid: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${uid}/`;

/** Only accept image URLs that live in the caller's own storage folder. */
function ownImages(values: FormDataEntryValue[], bucket: string, uid: string) {
  const prefix = storageBase(bucket, uid);
  return values.map(String).filter((u) => u.startsWith(prefix) && u.endsWith(".webp"));
}
const pathOf = (url: string, bucket: string) => url.split(`/object/public/${bucket}/`)[1];

function friendly(message: string) {
  if (/daily listing limit/i.test(message)) return "You've reached today's limit of 10 listings. Try again tomorrow.";
  if (/removed by an admin/i.test(message)) return "This listing was removed by an admin and can't be edited.";
  return "Something went wrong. Please try again.";
}

export async function saveSellerProfile(_: SellState, fd: FormData): Promise<SellState> {
  const me = await requireMe("/sell/profile");
  if (me.suspended) return { error: "Your account is suspended." };
  const parsed = sellerProfileSchema.safeParse({
    shop_name: fd.get("shop_name"), location: fd.get("location"), description: fd.get("description"),
    avatar_url: ownImages(fd.getAll("avatar"), "avatars", me.id)[0] ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const sb = await createClient();
  const { avatar_url, ...rest } = parsed.data;
  const { error } = await sb.from("seller_profiles").upsert({ user_id: me.id, ...rest, avatar_url: avatar_url || null });
  if (error) return { error: "Could not save your seller profile." };
  revalidatePath("/dashboard");
  redirect(String(fd.get("next") ?? "").startsWith("/") ? String(fd.get("next")) : "/sell/new");
}

export async function createListing(_: SellState, fd: FormData): Promise<SellState> {
  const me = await requireMe("/sell/new");
  if (me.suspended) return { error: "Your account is suspended." };
  const parsed = listingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const images = ownImages(fd.getAll("images"), "listing-images", me.id).slice(0, MAX_IMAGES);
  const v = parsed.data;

  const sb = await createClient();
  const { data: cat } = await sb.from("categories").select("applies_to").eq("id", v.category_id).eq("active", true).single();
  if (!cat || (cat.applies_to !== "both" && cat.applies_to !== v.type)) return { error: "Choose a category that matches the listing type" };

  const { data: listing, error } = await sb.from("listings").insert({
    seller_id: me.id, campus_id: me.campus_id, type: v.type, title: v.title, description: v.description,
    category_id: v.category_id, price: v.price, location: v.location, prohibited_ack: true,
    ...(v.type === "goods"
      ? { condition: v.condition, quantity: v.quantity }
      : { delivery_time: v.delivery_time, portfolio_url: v.portfolio_url || null }),
  }).select("id").single();
  if (error || !listing) return { error: friendly(error?.message ?? "") };

  if (images.length) {
    await sb.from("listing_images").insert(images.map((url, position) => ({ listing_id: listing.id, url, position })));
  }
  revalidatePath("/dashboard");
  redirect("/dashboard?posted=1");
}

export async function updateListing(_: SellState, fd: FormData): Promise<SellState> {
  const me = await requireMe("/dashboard");
  const id = String(fd.get("id"));
  const parsed = listingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = parsed.data;
  const images = ownImages(fd.getAll("images"), "listing-images", me.id).slice(0, MAX_IMAGES);

  const sb = await createClient();
  const { error } = await sb.from("listings").update({
    title: v.title, description: v.description, category_id: v.category_id, price: v.price, location: v.location,
    ...(v.type === "goods"
      ? { condition: v.condition, quantity: v.quantity }
      : { delivery_time: v.delivery_time, portfolio_url: v.portfolio_url || null }),
  }).eq("id", id).eq("seller_id", me.id);
  if (error) return { error: friendly(error.message) };

  const { data: old } = await sb.from("listing_images").select("url").eq("listing_id", id);
  await sb.from("listing_images").delete().eq("listing_id", id);
  if (images.length) await sb.from("listing_images").insert(images.map((url, position) => ({ listing_id: id, url, position })));
  const removed = (old ?? []).map((r) => r.url).filter((u) => !images.includes(u)).map((u) => pathOf(u, "listing-images")).filter(Boolean);
  if (removed.length) await sb.storage.from("listing-images").remove(removed);

  revalidatePath("/dashboard");
  redirect("/dashboard?saved=1");
}

async function mine(id: FormDataEntryValue | null) {
  const me = await requireMe("/dashboard");
  return { me, id: String(id), sb: await createClient() };
}

export async function markSold(fd: FormData) {
  const { me, id, sb } = await mine(fd.get("id"));
  await sb.from("listings").update({ status: "sold" }).eq("id", id).eq("seller_id", me.id).eq("status", "active");
  revalidatePath("/dashboard");
}

export async function renewListing(fd: FormData) {
  const { id, sb } = await mine(fd.get("id"));
  await sb.rpc("renew_listing", { p_listing: id });
  revalidatePath("/dashboard");
}

export async function deleteListing(fd: FormData) {
  const { me, id, sb } = await mine(fd.get("id"));
  const { data: imgs } = await sb.from("listing_images").select("url").eq("listing_id", id);
  const { error } = await sb.from("listings").delete().eq("id", id).eq("seller_id", me.id);
  if (!error) {
    const paths = (imgs ?? []).map((r) => pathOf(r.url, "listing-images")).filter(Boolean);
    if (paths.length) await sb.storage.from("listing-images").remove(paths);
  }
  revalidatePath("/dashboard");
}
