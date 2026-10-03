import Link from "next/link";
import { PAGE, requireAdmin } from "@/lib/admin";
import { Badge, dangerBtn, PageTitle, Pager, smallBtn } from "@/components/admin/ui";
import { dismissReport, removeReportedListing, suspendReportedUser } from "@/app/admin/actions";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Reports" };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const sp = await searchParams;
  const { sb } = await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  const status = sp.status === "all" ? null : sp.status === "closed" ? "closed" : "open";
  let q = sb.from("reports").select("id, reason, status, created_at, listing_id, reported_user_id, reporter:profiles!reports_reporter_id_fkey(full_name, email), listings(id, title, status), reported:profiles!reports_reported_user_id_fkey(id, full_name, email)", { count: "exact" });
  if (status === "open") q = q.eq("status", "open");
  if (status === "closed") q = q.neq("status", "open");
  const { data, count } = await q.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const tab = (active: boolean) => `flex h-10 items-center border-b-2 px-4 text-sm font-semibold ${active ? "border-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`;
  return (
    <>
      <PageTitle title="Reports" />
      <nav className="mb-4 flex border-b border-border" aria-label="Report filter">
        <Link href="/admin/reports" className={tab(status === "open")}>Open</Link>
        <Link href="/admin/reports?status=closed" className={tab(status === "closed")}>Handled</Link>
        <Link href="/admin/reports?status=all" className={tab(status === null)}>All</Link>
      </nav>
      {!data?.length ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center"><p className="font-semibold">No reports here</p><p className="mt-1 text-sm text-muted-foreground">Reports from users appear in this queue.</p></div>
      ) : (
        <ul className="space-y-3">
          {data.map((r) => {
            const l = r.listings as unknown as { id: string; title: string; status: string } | null;
            const target = r.reported as unknown as { id: string; full_name: string; email: string } | null;
            const reporter = r.reporter as unknown as { full_name: string; email: string } | null;
            return (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge tone={r.status === "open" ? "red" : "gray"}>{r.status}</Badge>
                  <span>{timeAgo(r.created_at)} · reported by {reporter?.full_name} ({reporter?.email})</span>
                </div>
                <p className="mt-2 font-medium">&ldquo;{r.reason}&rdquo;</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {l ? <>Listing: <Link href={`/listing/${l.id}`} className="text-primary hover:underline">{l.title}</Link> ({l.status})</> : null}
                  {l && target ? <span aria-hidden> · </span> : null}
                  {target ? <>User: <Link href={`/admin/users/${target.id}`} className="text-primary hover:underline">{target.full_name}</Link> ({target.email})</> : null}
                </p>
                {r.status === "open" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <form action={dismissReport}><input type="hidden" name="id" value={r.id} /><button className={smallBtn}>Dismiss</button></form>
                    {r.listing_id && <form action={removeReportedListing}><input type="hidden" name="id" value={r.id} /><button className={dangerBtn}>Remove listing</button></form>}
                    <form action={suspendReportedUser}><input type="hidden" name="id" value={r.id} /><button className={dangerBtn}>Suspend user</button></form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Pager page={page} total={count ?? 0} size={PAGE} href={(p) => `/admin/reports?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), page: String(p) })}`} />
    </>
  );
}
