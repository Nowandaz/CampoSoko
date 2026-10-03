import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import { getShop, shopReviews } from "@/lib/shops";
import { ListingCard } from "@/components/feed/ListingCard";
import { Rating } from "@/components/shop/Rating";
import { ReportButton, BlockButton } from "@/components/safety/SafetyActions";
import { ThumbDown, ThumbUp } from "@/components/ui/icons";
import { timeAgo } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return { title: "Shop not found" };
  const shop = await getShop(await createClient(), id);
  return shop ? { title: shop.shop_name, description: shop.description.slice(0, 150) } : { title: "Shop not found" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const sb = await createClient();
  const shop = await getShop(sb, id);
  if (!shop) notFound();
  const me = await getMe();
  const reviews = await shopReviews(sb, id, 8);
  const { data: rows } = await sb.from("listings")
    .select("id, title, price, location, created_at, featured, category_id, listing_images(url, position)")
    .eq("seller_id", id).eq("status", "active").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(48);
  const items = (rows ?? []).map((l) => ({
    id: l.id, title: l.title, price: Number(l.price), location: l.location, created_at: l.created_at, featured: l.featured,
    image: [...(l.listing_images ?? [])].sort((a, b) => a.position - b.position)[0]?.url ?? null, seller: shop.shop_name,
  }));
  const own = me?.id === id;
  const back = `/shop/${id}`;
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-2xl font-semibold text-primary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {shop.avatar_url ? <img src={shop.avatar_url} alt="" className="h-full w-full object-cover" /> : shop.shop_name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{shop.shop_name}</h1>
            <p className="text-sm text-muted-foreground">{shop.location}{shop.member_since ? ` · Member since ${new Date(shop.member_since).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}` : ""}</p>
            <Rating up={shop.up} down={shop.down} className="mt-1.5" />
          </div>
        </div>
        <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">{shop.description}</p>
        {shop.tags.length > 0 && <p className="mt-3 flex flex-wrap gap-2">{shop.tags.map((t) => <span key={t} className="rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary">{t}</span>)}</p>}
        {!own && (
          <div className="mt-4 flex flex-wrap items-start gap-1 border-t border-border pt-3">
            <ReportButton kind="user" target={id} loggedIn={Boolean(me)} loginHref={`/login?next=${encodeURIComponent(back)}`} />
            {me && <BlockButton target={id} back="/" />}
          </div>
        )}
      </section>

      <section aria-labelledby="items">
        <h2 id="items" className="mb-3 text-lg font-semibold">{items.length ? `${items.length} item${items.length === 1 ? "" : "s"} for sale` : "Nothing listed right now"}</h2>
        {items.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{items.map((it) => <ListingCard key={it.id} item={it} />)}</div>}
      </section>

      {reviews.length > 0 && (
        <section aria-labelledby="reviews">
          <h2 id="reviews" className="mb-3 text-lg font-semibold">Recent reviews</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {reviews.map((r, i) => (
              <li key={i} className="flex gap-3 p-4">
                {r.positive ? <ThumbUp className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <ThumbDown className="mt-0.5 h-5 w-5 shrink-0 text-danger" />}
                <div className="min-w-0 text-sm"><p className="font-medium">{r.buyer} <span className="font-normal text-muted-foreground">· {timeAgo(r.created_at)}</span></p>
                  {r.comment && <p className="mt-0.5 text-muted-foreground">{r.comment}</p>}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
