import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SellerProfileForm } from "@/components/sell/SellerProfileForm";

export const metadata = { title: "Seller profile" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const me = await requireMe("/sell/profile");
  const next = (await searchParams).next;
  const sb = await createClient();
  const { data } = await sb.from("seller_profiles").select("shop_name, location, description, avatar_url").eq("user_id", me.id).maybeSingle();
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold tracking-tight">{data ? "Seller profile" : "Set up your seller profile"}</h1>
      <p className="mb-6 mt-1.5 text-sm text-muted-foreground">
        {data ? "Buyers see this on your listings." : "A quick one-time step before you post. Buyers see this on your listings."}
      </p>
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <SellerProfileForm userId={me.id} initial={data ?? undefined} next={next?.startsWith("/") ? next : data ? "/dashboard" : "/sell/new"} />
      </section>
    </div>
  );
}
