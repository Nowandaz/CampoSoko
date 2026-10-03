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
    sb.from("categories").select("id, name, applies_to").eq("active", true).order("sort_order"),
  ]);
  return (
    <div className="space-y-6">
      {!me && (
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-primary-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{APP_TAGLINE}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Buy, sell and request goods and online services from students on your campus.</p>
          </div>
          <Link href="/signup" className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Create a free account</Link>
        </section>
      )}
      <FeedFilters p={p} campuses={campuses ?? []} categories={categories ?? []} myCampus={me?.campus_id} />
      <Suspense key={JSON.stringify(p)} fallback={<GridSkeleton />}>
        <Feed p={p} userId={me?.id} />
      </Suspense>
    </div>
  );
}
