import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { WantedForm } from "@/components/wanted/WantedForm";

export const metadata = { title: "Post a wanted ad" };

export default async function Page() {
  await requireMe("/wanted/new");
  const sb = await createClient();
  const { data: categories } = await sb.from("categories").select("id, name, applies_to").eq("active", true).order("sort_order");
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Post a wanted ad</h1>
      <p className="mb-6 mt-1.5 text-sm text-muted-foreground">Tell your campus what you are looking for. Sellers can reach you on WhatsApp.</p>
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm"><WantedForm categories={categories ?? []} /></section>
    </div>
  );
}
