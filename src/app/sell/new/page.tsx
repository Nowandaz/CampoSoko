import { redirect } from "next/navigation";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ListingForm } from "@/components/sell/ListingForm";
import { Notice } from "@/components/ui/form";

export const metadata = { title: "New listing" };

export default async function Page() {
  const me = await requireMe("/sell/new");
  const sb = await createClient();
  const { data: seller } = await sb.from("seller_profiles").select("location").eq("user_id", me.id).maybeSingle();
  if (!seller) redirect("/sell/profile");
  const { data: categories } = await sb.from("categories").select("id, name, applies_to").eq("active", true).order("sort_order");
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">New listing</h1>
      <p className="mb-6 mt-1.5 text-sm text-muted-foreground">Your listing stays active for 30 days. You can renew it any time.</p>
      {me.suspended && <div className="mb-4"><Notice error="Your account is suspended. You can't post." /></div>}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <ListingForm userId={me.id} categories={categories ?? []} defaultLocation={seller.location} />
      </section>
    </div>
  );
}
