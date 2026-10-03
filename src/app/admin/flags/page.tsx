import Link from "next/link";
import { PAGE, requireAdmin } from "@/lib/admin";
import { Badge, dangerBtn, PageTitle, Pager, smallBtn } from "@/components/admin/ui";
import { dismissFlag, removeFlagged, suspendFlagged } from "@/app/admin/actions";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Flags" };

const where = (type: string, id: string) =>
  type === "listing" ? `/listing/${id}` : type === "wanted" ? `/wanted/${id}` : type === "seller_profile" || type === "profile" ? `/shop/${id}` : null;

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const sp = await searchParams;
  const { sb } = await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  const closed = sp.status === "closed";
  let q = sb.from("content_flags").select("id, target_type, target_id, category, matched, excerpt, status, created_at, profiles(id, full_name, email)", { count: "exact" });
  q = closed ? q.neq("status", "open") : q.eq("status", "open");
  const { data, count, error } = await q.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const tab = (a: boolean) => `flex h-10 items-center border-b-2 px-4 text-sm font-semibold ${a ? "border-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`;
  return (
    <>
      <PageTitle title="Flagged posts" />
      <p className="mb-4 text-sm text-muted-foreground">Posts that were published but contain wording worth a second look. Clearly prohibited posts are refused before they appear.</p>
      <nav className="mb-4 flex border-b border-border" aria-label="Flag filter">
        <Link href="/admin/flags" className={tab(!closed)}>Open</Link>
        <Link href="/admin/flags?status=closed" className={tab(closed)}>Handled</Link>
      </nav>
      {error ? (
        <p className="rounded-2xl bg-danger/10 p-5 text-sm text-danger">Flags aren&apos;t set up yet. Run <code>supabase/run-in-order/11-content-flags.sql</code> in the Supabase SQL Editor.</p>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center"><p className="font-semibold">Nothing to review</p><p className="mt-1 text-sm text-muted-foreground">Automatic flags appear here.</p></div>
      ) : (
        <ul className="space-y-3">
          {data.map((f) => {
            const u = f.profiles as unknown as { id: string; full_name: string; email: string } | null;
            const href = where(f.target_type, f.target_id);
            return (
              <li key={f.id} className="rounded-2xl bg-card p-5 ring-1 ring-border">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge tone={f.status === "open" ? "orange" : "gray"}>{f.category}</Badge>
                  <span>{f.target_type.replace("_", " ")} · {timeAgo(f.created_at)}{u ? ` · by ${u.full_name} (${u.email})` : ""}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm">{f.excerpt}</p>
                {f.matched?.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Matched: {f.matched.join(", ")}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {href && <Link href={href} className={smallBtn}>View</Link>}
                  {f.status === "open" && (
                    <>
                      <form action={dismissFlag}><input type="hidden" name="id" value={f.id} /><button className={smallBtn}>Looks fine</button></form>
                      {(f.target_type === "listing" || f.target_type === "wanted") && <form action={removeFlagged}><input type="hidden" name="id" value={f.id} /><button className={dangerBtn}>Remove post</button></form>}
                      <form action={suspendFlagged}><input type="hidden" name="id" value={f.id} /><button className={dangerBtn}>Suspend user</button></form>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pager page={page} total={count ?? 0} size={PAGE} href={(p) => `/admin/flags?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), page: String(p) })}`} />
    </>
  );
}
