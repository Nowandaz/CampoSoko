import Link from "next/link";
import { Suspense } from "react";
import { APP_TAGLINE } from "@/config/site";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { parseFeedParams } from "@/lib/feed";
import { Feed } from "@/components/feed/Feed";
import { FeedFilters } from "@/components/feed/FeedFilters";
import { GridSkeleton } from "@/components/feed/ListingCard";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await getMe();
  const p = parseFeedParams(await searchParams, me?.campus_id);
  const sb = await createClient();
  const [{ data: campuses }, { data: categories }] = await Promise.all([
    sb.from("campuses").select("id, name").eq("active", true).order("name"),
    sb.from("categories").select("id, name, slug, applies_to").eq("active", true).order("sort_order"),
  ]);
  const myCampus = campuses?.find((c) => c.id === me?.campus_id)?.name;
  const cats = categories ?? [];
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-primary-soft px-5 py-6 sm:px-8 sm:py-8">
        {me ? (
          <>
            <p className="text-sm font-medium text-primary">Hi {me.full_name.split(" ")[0]}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Find it on {myCampus ?? "your campus"}</h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground sm:text-base">Goods and online services from students near you. Message sellers straight on WhatsApp.</p>
          </>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{APP_TAGLINE}</h1>
              <p className="mt-1.5 max-w-xl text-sm text-muted-foreground sm:text-base">Buy, sell and request goods and online services from students on your campus.</p>
            </div>
            <Link href="/signup" className="inline-flex h-12 shrink-0 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover">Create a free account</Link>
          </div>
        )}
      </section>
      <FeedFilters p={p} campuses={campuses ?? []} categories={cats} myCampus={me?.campus_id} />
      <Suspense key={JSON.stringify(p)} fallback={<GridSkeleton />}>
        <Feed p={p} cats={cats} userId={me?.id} />
      </Suspense>
    </div>
  );
}
