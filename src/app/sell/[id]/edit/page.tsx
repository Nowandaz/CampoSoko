import { notFound } from "next/navigation";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ListingForm, type ListingInitial } from "@/components/sell/ListingForm";

export const metadata = { title: "Edit listing" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireMe(`/sell/${id}/edit`);
  const sb = await createClient();
  const { data: l } = await sb.from("listings")
    .select("id, type, title, description, category_id, condition, quantity, price, location, delivery_time, portfolio_url, status, listing_images(url, position)")
    .eq("id", id).eq("seller_id", me.id).maybeSingle();
  if (!l || l.status === "removed") notFound();
  const { data: categories } = await sb.from("categories").select("id, name, applies_to").eq("active", true).order("sort_order");
  const initial: ListingInitial = {
    ...l, price: Number(l.price),
    images: [...(l.listing_images ?? [])].sort((a, b) => a.position - b.position).map((i) => i.url),
  };
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Edit listing</h1>
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <ListingForm userId={me.id} categories={categories ?? []} defaultLocation={l.location} initial={initial} />
      </section>
    </div>
  );
}
