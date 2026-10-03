import { redirect } from "next/navigation";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ReceiptForm } from "@/components/receipts/ReceiptForm";
import { Notice } from "@/components/ui/form";

export const metadata = { title: "New receipt" };

export default async function Page({ searchParams }: { searchParams: Promise<{ listing?: string }> }) {
  const me = await requireMe("/receipts/new");
  const sb = await createClient();
  const { data: seller } = await sb.from("seller_profiles").select("user_id").eq("user_id", me.id).maybeSingle();
  if (!seller) redirect("/sell/profile?next=/receipts/new");
  const { data: listings } = await sb.from("listings").select("id, title, price, type, quantity, status")
    .eq("seller_id", me.id).in("status", ["active", "sold"]).order("created_at", { ascending: false });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Issue a receipt</h1>
      <p className="mb-6 mt-1.5 text-sm text-muted-foreground">A record of the sale for you and the buyer, with a link anyone can use to verify it.</p>
      {me.suspended && <div className="mb-4"><Notice error="Your account is suspended. You can't issue receipts." /></div>}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <ReceiptForm listings={(listings ?? []).map((l) => ({ ...l, price: Number(l.price) }))} preselect={(await searchParams).listing} today={today} />
      </section>
    </div>
  );
}
