import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { ListingForm, type ListingInitial } from "@/components/sell/ListingForm";
import { adminUpdateListing } from "@/app/admin/actions";
import { PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Edit listing" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { me, sb } = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: l } = await sb.from("listings")
    .select("id, type, title, description, category_id, condition, quantity, price, location, delivery_time, portfolio_url, listing_images(url, position)").eq("id", id).maybeSingle();
  if (!l) notFound();
  const { data: categories } = await sb.from("categories").select("id, name, applies_to").order("sort_order");
  const initial: ListingInitial = { ...l, price: Number(l.price), images: [...(l.listing_images ?? [])].sort((a, b) => a.position - b.position).map((i) => i.url) };
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Edit listing" />
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <ListingForm userId={me.id} categories={categories ?? []} defaultLocation={l.location} initial={initial} formAction={adminUpdateListing} cancelHref="/admin/listings" />
      </section>
    </div>
  );
}
