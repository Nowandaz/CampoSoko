import { requireAdmin } from "@/lib/admin";
import { ListingForm } from "@/components/sell/ListingForm";
import { adminCreateListing } from "@/app/admin/actions";
import { Field } from "@/components/ui/form";
import { inputCls } from "@/components/ui/form";
import { PageTitle } from "@/components/admin/ui";

export const metadata = { title: "Add listing" };

export default async function Page() {
  const { me, sb } = await requireAdmin();
  const { data: categories } = await sb.from("categories").select("id, name, applies_to").eq("active", true).order("sort_order");
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Add a listing for a user" />
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <ListingForm userId={me.id} categories={categories ?? []} defaultLocation="Campus" formAction={adminCreateListing} cancelHref="/admin/listings"
          extraTop={<Field label="Seller's email" hint="The listing is posted as this user, on their campus."><input name="seller_email" type="email" required className={inputCls} /></Field>} />
      </section>
    </div>
  );
}
