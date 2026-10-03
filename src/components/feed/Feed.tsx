import Link from "next/link";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCategoryRows, fetchListings, fetchWanted, fetchWantedRows, PAGE_SIZE, type Cat, type FeedParams } from "@/lib/feed";
import { ListingCard } from "./ListingCard";
import { WantedCard } from "./WantedCard";
import { HScroll } from "./HScroll";
import { CategoryIcon } from "@/components/ui/category-icons";

function Empty({ title, text, href, cta }: { title: string; text: string; href?: string; cta?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {href && <Link href={href} className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">{cta}</Link>}
    </div>
  );
}

function pageHref(p: FeedParams, n: number) {
  const sp = new URLSearchParams({ tab: p.tab, page: String(n), campus: p.campusId ?? "all" });
  if (p.q) sp.set("q", p.q);
  if (p.category) sp.set("category", p.category);
  if (p.min != null) sp.set("min", String(p.min));
  if (p.max != null) sp.set("max", String(p.max));
  return `/?${sp}`;
}

function Pager({ p, total }: { p: FeedParams; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  const b = "inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted";
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between">
      {p.page > 1 ? <Link href={pageHref(p, p.page - 1)} className={b}>Previous</Link> : <span />}
      <span className="text-sm text-muted-foreground">Page {p.page} of {pages}</span>
      {p.page < pages ? <Link href={pageHref(p, p.page + 1)} className={b}>Next</Link> : <span />}
    </nav>
  );
}

function RowHeader({ title, slug, href }: { title: string; slug?: string; href?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
        {slug && <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary"><CategoryIcon slug={slug} /></span>}
        {title}
      </h2>
      {href && <Link href={href} className="inline-flex h-10 shrink-0 items-center text-sm font-semibold text-primary hover:underline">See all</Link>}
    </div>
  );
}

const catHref = (p: FeedParams, id: string) => `/?tab=${p.tab}&category=${id}&campus=${p.campusId ?? "all"}`;

export async function Feed({ p, cats, userId }: { p: FeedParams; cats: Cat[]; userId?: string }) {
  const sb = await createClient();
  if (p.q) {
    after(async () => {
      await createAdminClient().from("events").insert({ type: "search", user_id: userId ?? null, meta: p.q!.slice(0, 80) });
    });
  }
  const browsing = !p.q && !p.category && p.min == null && p.max == null && p.page === 1;
  const catSlug = new Map(cats.map((c) => [c.id, c.slug]));

  // ---------- Wanted ----------
  if (p.tab === "wanted") {
    if (browsing) {
      const { latest, rows } = await fetchWantedRows(sb, p);
      if (!latest.length) return <Empty title="No wanted ads yet" text="Looking for something? Post what you need and sellers on campus will reach out." href="/wanted/new" cta="Post a wanted ad" />;
      return (
        <div className="space-y-9">
          <section><RowHeader title="Latest requests" />
            <HScroll label="Latest requests">{latest.map((w) => <WantedCard key={w.id} w={w} compact />)}</HScroll></section>
          {rows.map((r) => (
            <section key={r.name}><RowHeader title={r.name} />
              <HScroll label={r.name}>{r.items.map((w) => <WantedCard key={w.id} w={w} compact />)}</HScroll></section>
          ))}
        </div>
      );
    }
    const { items, total } = await fetchWanted(sb, p);
    if (!items.length) return <Empty title="No matches" text="Try a different search or clear some filters." href="/?tab=wanted" cta="Clear filters" />;
    return (
      <>
        <p className="mb-3 text-sm text-muted-foreground">{total} wanted {total === 1 ? "ad" : "ads"}</p>
        <div className="grid gap-3 sm:grid-cols-2">{items.map((w) => <WantedCard key={w.id} w={w} />)}</div>
        <Pager p={p} total={total} />
      </>
    );
  }

  // ---------- Goods / Services ----------
  if (browsing) {
    const { latest, rows } = await fetchCategoryRows(sb, p, cats);
    if (!latest.length) return <Empty title={`No ${p.tab} listed yet`} text="Be the first to post on your campus." href="/sell" cta="Create a listing" />;
    return (
      <div className="space-y-9">
        <section>
          <RowHeader title="Just listed" />
          <HScroll label="Just listed">{latest.map((it) => <ListingCard key={it.id} item={it} compact slug="bag" />)}</HScroll>
        </section>
        {rows.map(({ cat, items }) => (
          <section key={cat.id}>
            <RowHeader title={cat.name} slug={cat.slug} href={catHref(p, cat.id)} />
            <HScroll label={cat.name}>{items.map((it) => <ListingCard key={it.id} item={it} compact slug={cat.slug} />)}</HScroll>
          </section>
        ))}
      </div>
    );
  }

  const { items, total } = await fetchListings(sb, p);
  if (!items.length) {
    return <Empty title="No matches" text="Try a different search, or clear some filters. You can also post what you're looking for in Wanted." href="/?tab=wanted" cta="See wanted ads" />;
  }
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">{total} {total === 1 ? "listing" : "listings"}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((it) => <ListingCard key={it.id} item={it} slug={p.category ? catSlug.get(p.category) : undefined} />)}
      </div>
      <Pager p={p} total={total} />
    </>
  );
}
