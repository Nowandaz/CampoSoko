import Link from "next/link";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchListings, fetchWanted, PAGE_SIZE, type FeedParams } from "@/lib/feed";
import { kes, timeAgo } from "@/lib/format";
import { ListingCard } from "./ListingCard";

function Empty({ title, text, href, cta }: { title: string; text: string; href?: string; cta?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>
      {href && <Link href={href} className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">{cta}</Link>}
    </div>
  );
}

function Pager({ p, total }: { p: FeedParams; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  const href = (n: number) => {
    const sp = new URLSearchParams({ tab: p.tab, page: String(n), campus: p.campusId ?? "all" });
    if (p.q) sp.set("q", p.q);
    if (p.category) sp.set("category", p.category);
    if (p.min != null) sp.set("min", String(p.min));
    if (p.max != null) sp.set("max", String(p.max));
    return `/?${sp}`;
  };
  const b = "inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted";
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between">
      {p.page > 1 ? <Link href={href(p.page - 1)} className={b}>Previous</Link> : <span />}
      <span className="text-sm text-muted-foreground">Page {p.page} of {pages}</span>
      {p.page < pages ? <Link href={href(p.page + 1)} className={b}>Next</Link> : <span />}
    </nav>
  );
}

export async function Feed({ p, userId }: { p: FeedParams; userId?: string }) {
  const sb = await createClient();
  if (p.q) {
    after(async () => {
      await createAdminClient().from("events").insert({ type: "search", user_id: userId ?? null, meta: p.q!.slice(0, 80) });
    });
  }

  if (p.tab === "wanted") {
    const { items, total } = await fetchWanted(sb, p);
    if (!items.length) return <Empty title="No wanted ads yet" text="Looking for something? Post what you need and sellers on campus will reach out." href="/wanted/new" cta="Post a wanted ad" />;
    return (
      <>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} wanted {total === 1 ? "ad" : "ads"}</p>
          <Link href="/wanted/new" className="text-sm font-semibold text-primary hover:underline">Post a wanted ad</Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((w) => (
            <li key={w.id}>
              <Link href={`/wanted/${w.id}`} className="block rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">{w.type === "goods" ? "Goods" : "Service"} · {w.category}</p>
                <h3 className="mt-1 font-semibold leading-snug">{w.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{w.budget != null ? `Budget ${kes(w.budget)}` : "No budget set"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{w.user} · {timeAgo(w.created_at)}</p>
              </Link>
            </li>
          ))}
        </ul>
        <Pager p={p} total={total} />
      </>
    );
  }

  const { items, total } = await fetchListings(sb, p);
  if (!items.length) {
    const filtered = Boolean(p.q || p.category || p.min != null || p.max != null);
    return filtered
      ? <Empty title="No matches" text="Try a different search, or clear some filters. You can also post what you're looking for in Wanted." href="/?tab=wanted" cta="See wanted ads" />
      : <Empty title={`No ${p.tab} listed yet`} text="Be the first to post on your campus." href="/sell" cta="Create a listing" />;
  }
  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">{total} {total === 1 ? "listing" : "listings"}</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((it) => <ListingCard key={it.id} item={it} />)}
      </div>
      <Pager p={p} total={total} />
    </>
  );
}
