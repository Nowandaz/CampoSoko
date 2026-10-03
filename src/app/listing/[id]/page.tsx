import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import { kes, timeAgo } from "@/lib/format";
import { APP_NAME } from "@/config/site";
import { Gallery } from "@/components/listing/Gallery";
import { ContactButton } from "@/components/listing/ContactButton";
import { ViewTracker } from "@/components/listing/ViewTracker";
import { SafetyTips } from "@/components/listing/SafetyTips";
import { isBlocked } from "@/app/listing/actions";
import { getShop } from "@/lib/shops";
import { Rating } from "@/components/shop/Rating";
import { ReportButton, BlockButton } from "@/components/safety/SafetyActions";

const load = cache(async (id: string) => {
  if (!z.string().uuid().safeParse(id).success) return null;
  const sb = await createClient();
  const { data: l } = await sb.from("listings")
    .select("*, listing_images(url, position), categories(name), campuses(name)").eq("id", id).maybeSingle();
  if (!l || l.status === "removed" || l.status === "expired") {
    // owners may still open their own expired listing from the dashboard
    const viewer = await getMe();
    return l && (viewer?.id === l.seller_id || viewer?.role === "admin") ? { l, seller: null } : null;
  }
  const { data: seller } = await sb.from("public_profiles").select("*").eq("id", l.seller_id).maybeSingle();
  return { l, seller };
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const r = await load((await params).id);
  if (!r) return { title: "Listing not found" };
  const img = [...(r.l.listing_images ?? [])].sort((a: { position: number }, b: { position: number }) => a.position - b.position)[0]?.url;
  const title = `${r.l.title} · ${kes(r.l.price)}`;
  return { title, description: r.l.description.slice(0, 150), openGraph: { title: `${title} | ${APP_NAME}`, description: r.l.description.slice(0, 150), images: img ? [img] : [] } };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await load(id);
  if (!r) notFound();
  const { l, seller } = r;
  const me = await getMe();
  const images = [...(l.listing_images ?? [])].sort((a: { position: number }, b: { position: number }) => a.position - b.position).map((i: { url: string }) => i.url);
  const own = me?.id === l.seller_id;
  const blocked = me && !own ? await isBlocked(me.id, l.seller_id) : false;
  const available = l.status === "active";
  const shop = seller ? await getShop(await createClient(), l.seller_id) : null;

  let contact: React.ReactNode;
  if (own) contact = <Link href={`/sell/${l.id}/edit`} className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-border font-semibold hover:bg-muted">Edit your listing</Link>;
  else if (!available) contact = <p className="rounded-lg bg-muted px-4 py-3 text-center text-sm font-medium text-muted-foreground">{l.type === "goods" ? "This item has been sold" : "This service is no longer available"}</p>;
  else if (!me) contact = <Link href={`/login?next=${encodeURIComponent(`/listing/${l.id}`)}`} className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary-hover">Log in to message the seller</Link>;
  else if (me.suspended) contact = <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">Your account is suspended. You can&apos;t contact sellers.</p>;
  else if (blocked) contact = null;
  else contact = <ContactButton listingId={l.id} />;

  return (
    <article className="grid gap-8 md:grid-cols-[1.1fr_1fr]">
      <ViewTracker listingId={l.id} />
      <Gallery images={images} title={l.title} />
      <div className="space-y-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {l.type === "goods" ? "Goods" : "Online service"} · {l.categories?.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight">{l.title}</h1>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{l.type === "service" && <span className="mr-1.5 text-base font-medium text-muted-foreground">From</span>}{kes(l.price)}</p>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {l.type === "goods" ? (
            <>
              <div><dt className="text-muted-foreground">Condition</dt><dd className="font-medium capitalize">{l.condition}</dd></div>
              <div><dt className="text-muted-foreground">Available</dt><dd className="font-medium">{l.quantity}</dd></div>
            </>
          ) : (
            <>
              <div><dt className="text-muted-foreground">Delivery time</dt><dd className="font-medium">{l.delivery_time}</dd></div>
              {l.portfolio_url && (
                <div><dt className="text-muted-foreground">Portfolio</dt>
                  <dd><a href={l.portfolio_url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-primary hover:underline">View work</a></dd></div>
              )}
            </>
          )}
          <div><dt className="text-muted-foreground">Location</dt><dd className="font-medium">{l.location}</dd></div>
          <div><dt className="text-muted-foreground">Campus</dt><dd className="font-medium">{l.campuses?.name}</dd></div>
          <div><dt className="text-muted-foreground">Posted</dt><dd className="font-medium">{timeAgo(l.created_at)}</dd></div>
        </dl>

        {l.type === "service" && (
          <p className="rounded-lg border border-primary/30 bg-primary-soft px-3.5 py-3 text-sm">
            Online services only. Agree on scope and payment milestones before work starts.
          </p>
        )}

        <div>
          <h2 className="text-sm font-semibold">Description</h2>
          <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">{l.description}</p>
        </div>

        {contact}

        {seller && (
          <Link href={`/shop/${l.seller_id}`} className="flex gap-3 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {seller.avatar_url && <img src={seller.avatar_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold">{seller.shop_name ?? seller.public_name}</p>
              <p className="text-xs text-muted-foreground">{seller.shop_location} · Member since {new Date(seller.created_at).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}</p>
              {shop && <Rating up={shop.up} down={shop.down} className="mt-1" />}
              {seller.shop_description && <p className="mt-1.5 line-clamp-3 text-sm text-muted-foreground">{seller.shop_description}</p>}
              <p className="mt-2 text-sm font-medium text-primary">Visit shop</p>
            </div>
          </Link>
        )}

        <SafetyTips />
        {!own && (
          <div className="flex flex-wrap items-start gap-1">
            <ReportButton kind="listing" target={l.id} loggedIn={Boolean(me)} loginHref={`/login?next=${encodeURIComponent(`/listing/${l.id}`)}`} />
            {me && <BlockButton target={l.seller_id} back="/" />}
          </div>
        )}
      </div>
    </article>
  );
}
