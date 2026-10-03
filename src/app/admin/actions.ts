"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { audit, requireAdmin } from "@/lib/admin";
import { cleanText, firstError, listingSchema } from "@/lib/validation";
import { notifyWantedMatches } from "@/lib/matching";
import { MAX_IMAGES } from "@/config/site";

export type AState = { error?: string; notice?: string };
const uuid = z.string().uuid();
const id = (fd: FormData, key = "id") => uuid.parse(fd.get(key));

// ---------- listings ----------
export async function setListingStatus(fd: FormData) {
  const { me, sb } = await requireAdmin();
  const lid = id(fd);
  const status = z.enum(["active", "removed"]).parse(fd.get("status"));
  await sb.from("listings").update({ status, ...(status === "active" ? { expires_at: new Date(Date.now() + 30 * 864e5).toISOString() } : {}) }).eq("id", lid);
  await audit(sb, me.id, status === "removed" ? "remove_listing" : "restore_listing", "listing", lid);
  revalidatePath("/admin/listings");
}

export async function toggleFeatured(fd: FormData) {
  const { me, sb } = await requireAdmin();
  const lid = id(fd);
  const featured = fd.get("featured") === "true";
  await sb.from("listings").update({ featured }).eq("id", lid);
  await audit(sb, me.id, featured ? "feature_listing" : "unfeature_listing", "listing", lid);
  revalidatePath("/admin/listings");
}

const imgs = (fd: FormData, uids: string[]) => {
  const prefixes = uids.map((u) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${u}/`);
  return fd.getAll("images").map(String).filter((u) => prefixes.some((p) => u.startsWith(p)) && u.endsWith(".webp")).slice(0, MAX_IMAGES);
};

export async function adminCreateListing(_: AState, fd: FormData): Promise<AState> {
  const { me, sb } = await requireAdmin();
  const email = z.string().trim().toLowerCase().email().safeParse(fd.get("seller_email"));
  if (!email.success) return { error: "Enter the seller's email address" };
  const parsed = listingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { data: seller } = await sb.from("profiles").select("id, campus_id, suspended").ilike("email", email.data).maybeSingle();
  if (!seller) return { error: "No user with that email" };
  const v = parsed.data;
  const { data: l, error } = await sb.from("listings").insert({
    seller_id: seller.id, campus_id: seller.campus_id, type: v.type, title: v.title, description: v.description, category_id: v.category_id,
    price: v.price, location: v.location, prohibited_ack: true,
    ...(v.type === "goods" ? { condition: v.condition, quantity: v.quantity } : { delivery_time: v.delivery_time, portfolio_url: v.portfolio_url || null }),
  }).select("id").single();
  if (error || !l) return { error: "Could not create the listing" };
  const images = imgs(fd, [me.id, seller.id]);
  if (images.length) await sb.from("listing_images").insert(images.map((url, position) => ({ listing_id: l.id, url, position })));
  await audit(sb, me.id, "create_listing_for_user", "listing", l.id, { seller: seller.id });
  after(() => notifyWantedMatches(l.id).catch(() => {}));
  revalidatePath("/admin/listings");
  redirect("/admin/listings");
}

export async function adminUpdateListing(_: AState, fd: FormData): Promise<AState> {
  const { me, sb } = await requireAdmin();
  const lid = z.string().uuid().safeParse(fd.get("id"));
  if (!lid.success) return { error: "Listing not found" };
  const parsed = listingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const v = parsed.data;
  const { data: cur } = await sb.from("listings").select("seller_id").eq("id", lid.data).single();
  if (!cur) return { error: "Listing not found" };
  const { error } = await sb.from("listings").update({
    title: v.title, description: v.description, category_id: v.category_id, price: v.price, location: v.location,
    ...(v.type === "goods" ? { condition: v.condition, quantity: v.quantity } : { delivery_time: v.delivery_time, portfolio_url: v.portfolio_url || null }),
  }).eq("id", lid.data);
  if (error) return { error: "Could not save changes" };
  const images = imgs(fd, [me.id, cur.seller_id]);
  await sb.from("listing_images").delete().eq("listing_id", lid.data);
  if (images.length) await sb.from("listing_images").insert(images.map((url, position) => ({ listing_id: lid.data, url, position })));
  await audit(sb, me.id, "edit_listing", "listing", lid.data);
  revalidatePath("/admin/listings");
  redirect("/admin/listings");
}

// ---------- wanted ----------
export async function setWantedStatus(fd: FormData) {
  const { me, sb } = await requireAdmin();
  const wid = id(fd);
  const status = z.enum(["active", "removed"]).parse(fd.get("status"));
  await sb.from("wanted_ads").update({ status }).eq("id", wid);
  await audit(sb, me.id, status === "removed" ? "remove_wanted" : "restore_wanted", "wanted_ad", wid);
  revalidatePath("/admin/wanted");
}

// ---------- users ----------
export async function setSuspended(fd: FormData) {
  const { me, sb } = await requireAdmin();
  const uid = id(fd);
  if (uid === me.id) return;
  const suspended = fd.get("suspended") === "true";
  await sb.from("profiles").update({ suspended }).eq("id", uid);
  await audit(sb, me.id, suspended ? "suspend_user" : "unsuspend_user", "user", uid);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${uid}`);
}

export async function setRole(fd: FormData) {
  const { me, sb } = await requireAdmin();
  const uid = id(fd);
  if (uid === me.id) return;
  const role = z.enum(["user", "admin"]).parse(fd.get("role"));
  await sb.from("profiles").update({ role }).eq("id", uid);
  await audit(sb, me.id, role === "admin" ? "promote_admin" : "demote_admin", "user", uid);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${uid}`);
}

// ---------- campuses & categories ----------
const campusSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().transform(cleanText).pipe(z.string().min(2, "Enter a campus name").max(80)),
  county: z.string().transform(cleanText).pipe(z.string().max(60)).optional(),
  email_domain: z.string().trim().toLowerCase().regex(/^([a-z0-9-]+\.)+[a-z]{2,}$/, "Email domain should look like uonbi.ac.ke").optional().or(z.literal("")),
});

export async function saveCampus(_: AState, fd: FormData): Promise<AState> {
  const { me, sb } = await requireAdmin();
  const p = campusSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  const row = { name: p.data.name, county: p.data.county || null, email_domain: p.data.email_domain || null };
  const q = p.data.id ? sb.from("campuses").update(row).eq("id", p.data.id).select("id").single() : sb.from("campuses").insert(row).select("id").single();
  const { data, error } = await q;
  if (error || !data) return { error: /duplicate/i.test(error?.message ?? "") ? "A campus with that name already exists" : "Could not save the campus" };
  await audit(sb, me.id, p.data.id ? "edit_campus" : "add_campus", "campus", data.id, row);
  revalidatePath("/admin/campuses");
  return { notice: "Saved" };
}

export async function setCampusActive(fd: FormData) {
  const { me, sb } = await requireAdmin();
  const cid = id(fd);
  const active = fd.get("active") === "true";
  await sb.from("campuses").update({ active }).eq("id", cid);
  await audit(sb, me.id, active ? "activate_campus" : "deactivate_campus", "campus", cid);
  revalidatePath("/admin/campuses");
}

const categorySchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().transform(cleanText).pipe(z.string().min(2, "Enter a category name").max(40)),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,40}$/, "Slug: lowercase letters, digits and dashes"),
  applies_to: z.enum(["goods", "service", "both"]),
  sort_order: z.coerce.number().int().min(0).max(999),
});

export async function saveCategory(_: AState, fd: FormData): Promise<AState> {
  const { me, sb } = await requireAdmin();
  const p = categorySchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  const { id: cid, ...row } = p.data;
  const q = cid ? sb.from("categories").update(row).eq("id", cid).select("id").single() : sb.from("categories").insert(row).select("id").single();
  const { data, error } = await q;
  if (error || !data) return { error: /duplicate/i.test(error?.message ?? "") ? "That slug is already used" : "Could not save the category" };
  await audit(sb, me.id, cid ? "edit_category" : "add_category", "category", data.id, row);
  revalidatePath("/admin/categories");
  return { notice: "Saved" };
}

export async function setCategoryActive(fd: FormData) {
  const { me, sb } = await requireAdmin();
  const cid = id(fd);
  const active = fd.get("active") === "true";
  await sb.from("categories").update({ active }).eq("id", cid);
  await audit(sb, me.id, active ? "activate_category" : "deactivate_category", "category", cid);
  revalidatePath("/admin/categories");
}

// ---------- reports ----------
async function loadReport(fd: FormData) {
  const ctx = await requireAdmin();
  const { data: r } = await ctx.sb.from("reports").select("id, listing_id, reported_user_id, status").eq("id", id(fd)).single();
  if (!r) throw new Error("Report not found");
  return { ...ctx, r };
}
const done = (status: "dismissed" | "actioned", rid: string, sb: Awaited<ReturnType<typeof requireAdmin>>["sb"]) =>
  sb.from("reports").update({ status }).eq("id", rid);

export async function dismissReport(fd: FormData) {
  const { me, sb, r } = await loadReport(fd);
  await done("dismissed", r.id, sb);
  await audit(sb, me.id, "dismiss_report", "report", r.id);
  revalidatePath("/admin/reports");
}

export async function removeReportedListing(fd: FormData) {
  const { me, sb, r } = await loadReport(fd);
  if (r.listing_id) {
    await sb.from("listings").update({ status: "removed" }).eq("id", r.listing_id);
    await audit(sb, me.id, "remove_listing", "listing", r.listing_id, { report: r.id });
  }
  await done("actioned", r.id, sb);
  revalidatePath("/admin/reports");
}

export async function suspendReportedUser(fd: FormData) {
  const { me, sb, r } = await loadReport(fd);
  let target = r.reported_user_id as string | null;
  if (!target && r.listing_id) target = (await sb.from("listings").select("seller_id").eq("id", r.listing_id).single()).data?.seller_id ?? null;
  if (target && target !== me.id) {
    await sb.from("profiles").update({ suspended: true }).eq("id", target);
    await audit(sb, me.id, "suspend_user", "user", target, { report: r.id });
  }
  await done("actioned", r.id, sb);
  revalidatePath("/admin/reports");
}

// ---------- receipts ----------
export async function adminVoidReceipt(_: AState, fd: FormData): Promise<AState> {
  const { sb } = await requireAdmin();
  const reason = String(fd.get("reason") ?? "").replace(/[\u0000-\u001F]|<[^>]*>/g, "").trim().slice(0, 300);
  if (reason.length < 3) return { error: "Give a reason (3+ characters)" };
  const { error } = await sb.rpc("void_receipt", { p_id: id(fd), p_reason: reason });
  if (error) return { error: /already void/i.test(error.message) ? "Already void" : "Could not void" };
  revalidatePath("/admin/receipts");
  return { notice: "Voided" };
}
