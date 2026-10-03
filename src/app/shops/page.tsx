import Link from "next/link";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { shopDirectory } from "@/lib/shops";
import { ShopCard } from "@/components/shop/ShopCard";
import { inputCls } from "@/components/ui/form";

export const metadata = { title: "Shops" };
const SIZE = 24;

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; campus?: string; page?: string }> }) {
  const sp = await searchParams;
  const me = await getMe();
  const sb = await createClient();
  const { data: campuses } = await sb.from("campuses").select("id, name").eq("active", true).order("name");
  const campus = sp.campus === "all" ? undefined : sp.campus && /^[0-9a-f-]{36}$/.test(sp.campus) ? sp.campus : me?.campus_id;
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").slice(0, 60).replace(/[%_,()*"\\]/g, " ").trim();
  const { shops, total } = await shopDirectory(sb, { campus, q, limit: SIZE, offset: (page - 1) * SIZE });
  const href = (n: number) => `/shops?${new URLSearchParams({ ...(q ? { q } : {}), campus: campus ?? "all", page: String(n) })}`;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shops on campus</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visit a shop to browse everything a seller has listed.</p>
      </div>
      <form className="flex flex-col gap-2 sm:flex-row">
        <input type="search" name="q" defaultValue={q} placeholder="Search shops or what they sell" aria-label="Search shops" className={inputCls} />
        <select name="campus" defaultValue={campus ?? "all"} aria-label="Campus" className={`${inputCls} sm:w-64`}>
          <option value="all">All campuses</option>
          {(campuses ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="h-12 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Search</button>
      </form>
      {shops.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shops.map((s) => <ShopCard key={s.user_id} shop={s} />)}</div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
          <p className="font-semibold">No shops found</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Try another search or campus, or open a shop of your own.</p>
          <Link href="/sell" className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Start selling</Link>
        </div>
      )}
      {total > SIZE && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={href(page - 1)} className="inline-flex h-10 items-center rounded-lg border border-border px-4 font-medium hover:bg-muted">Previous</Link> : <span />}
          <span className="text-muted-foreground">Page {page} of {Math.ceil(total / SIZE)}</span>
          {page * SIZE < total ? <Link href={href(page + 1)} className="inline-flex h-10 items-center rounded-lg border border-border px-4 font-medium hover:bg-muted">Next</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
