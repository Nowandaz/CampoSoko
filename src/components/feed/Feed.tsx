import Link from "next/link";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCategoryRows, fetchListings, fetchWanted, fetchWantedRows, PAGE_SIZE, type Cat, type FeedParams } from "@/lib/feed";
import { ListingCard } from "./ListingCard";
import { WantedCard } from "./WantedCard";
import { HScroll } from "./HScroll";
import { CategoryIcon } from "@/components/ui/category-icons";
import { shopDirectory } from "@/lib/shops";
import { ask, aiFeatureOn } from "@/lib/ai/client";
import { parseSearch } from "@/lib/ai/tasks";
import { allow, clientIp } from "@/lib/rate-limit";
import { kes } from "@/lib/format";
import { ShopCard } from "@/components/shop/ShopCard";

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
  if (p.ai) sp.set("ai", p.ai);
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

export async function Feed({ p: input, cats, userId }: { p: FeedParams; cats: Cat[]; userId?: string }) {
  const sb = await createClient();
  let p = input;
  let aiNote: string | null = null;
  if (p.ai === "1" && p.q) {
    if (!(await aiFeatureOn("ai_search"))) aiNote = "Smart search isn't available right now, so we searched for your exact words.";
    else if (!(await allow(`ai-search:${userId ?? (await clientIp())}`, 20, 3600))) aiNote = "Smart search limit reached for this hour, so we searched for your exact words.";
    else {
      try {
        const r = await parseSearch(ask, p.q, cats);
        const cat = r.category ? cats.find((c) => c.slug === r.category) : undefined;
        const parts = [r.terms.join(", "), cat?.name, r.max != null ? `up to ${kes(r.max)}` : null, r.min != null ? `from ${kes(r.min)}` : null].filter(Boolean);
        if (r.terms.length) {
          p = { ...p, terms: r.terms, q: undefined, category: p.category ?? cat?.id, min: p.min ?? r.min ?? undefined, max: p.max ?? r.max ?? undefined };
          aiNote = `Smart search understood: ${parts.join(" · ")}`;
        }
      } catch {
        aiNote = "Smart search couldn't read that just now, so we searched for your exact words.";
      }
    }
  }
  const aiBanner = aiNote ? <p role="status" className="mb-4 rounded-lg bg-primary-soft px-3.5 py-2.5 text-sm text-foreground">{aiNote}</p> : null;
  if (input.q) {
    after(async () => {
      await createAdminClient().from("events").insert({ type: "search", user_id: userId ?? null, meta: input.q!.slice(0, 80) });
    });
  }
  const browsing = !p.q && !p.terms?.length && !p.category && p.min == null && p.max == null && p.page === 1;
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
    if (!items.length) return <>{aiBanner}<Empty title="No matches" text="Try a different search or clear some filters." href="/?tab=wanted" cta="Clear filters" /></>;
    return (
      <>
        {aiBanner}
        <p className="mb-3 text-sm text-muted-foreground">{total} wanted {total === 1 ? "ad" : "ads"}</p>
        <div className="grid gap-3 sm:grid-cols-2">{items.map((w) => <WantedCard key={w.id} w={w} />)}</div>
        <Pager p={input} total={total} />
      </>
    );
  }

  // ---------- Goods / Services ----------
  if (browsing) {
    const [{ latest, rows }, { shops }] = await Promise.all([fetchCategoryRows(sb, p, cats), shopDirectory(sb, { campus: p.campusId, limit: 12 })]);
    if (!latest.length) return <Empty title={`No ${p.tab} listed yet`} text="Be the first to post on your campus." href="/sell" cta="Create a listing" />;
    return (
      <div className="space-y-9">
        <section>
          <RowHeader title="Just listed" />
          <HScroll label="Just listed">{latest.map((it) => <ListingCard key={it.id} item={it} compact slug="bag" />)}</HScroll>
        </section>
        {shops.length > 0 && (
          <section>
            <RowHeader title="Visit a shop" slug="store" href="/shops" />
            <HScroll label="Shops">{shops.map((sh) => <ShopCard key={sh.user_id} shop={sh} compact />)}</HScroll>
          </section>
        )}
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
    return <>{aiBanner}<Empty title="No matches" text="Try a different search, or clear some filters. You can also post what you're looking for in Wanted." href="/?tab=wanted" cta="See wanted ads" /></>;
  }
  return (
    <>
      {aiBanner}
      <p className="mb-3 text-sm text-muted-foreground">{total} {total === 1 ? "listing" : "listings"}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((it) => <ListingCard key={it.id} item={it} slug={p.category ? catSlug.get(p.category) : undefined} />)}
      </div>
      <Pager p={input} total={total} />
    </>
  );
}
