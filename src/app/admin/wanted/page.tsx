import Link from "next/link";
import { likeSafe, PAGE, requireAdmin } from "@/lib/admin";
import { Badge, dangerBtn, PageTitle, Pager, smallBtn, Table, td, th } from "@/components/admin/ui";
import { setWantedStatus } from "@/app/admin/actions";
import { kes, timeAgo } from "@/lib/format";
import { inputCls } from "@/components/ui/form";
import { ActionForm } from "@/components/ActionForm";

export const metadata = { title: "Wanted ads" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { sb } = await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  let q = sb.from("wanted_ads").select("id, title, type, budget, status, notify, created_at, profiles(full_name, email), categories(name)", { count: "exact" });
  if (sp.q && likeSafe(sp.q)) q = q.ilike("title", `%${likeSafe(sp.q)}%`);
  const { data, count } = await q.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const href = (p: number) => `/admin/wanted?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(p) })}`;
  return (
    <>
      <PageTitle title="Wanted ads" />
      <form className="mb-4 flex gap-2"><div className="w-full sm:w-64"><input name="q" defaultValue={sp.q} placeholder="Search titles" className={`${inputCls} h-10`} /></div><button className={smallBtn}>Search</button></form>
      <Table min="48rem">
        <thead><tr className="border-b border-border"><th className={th}>Ad</th><th className={th}>Posted by</th><th className={th}>Status</th><th className={th}>Actions</th></tr></thead>
        <tbody className="divide-y divide-border">
          {(data ?? []).map((w) => {
            const u = w.profiles as unknown as { full_name: string; email: string } | null;
            return (
              <tr key={w.id}>
                <td className={td}><Link href={`/wanted/${w.id}`} className="font-medium hover:underline">{w.title}</Link>
                  <div className="text-xs text-muted-foreground">{w.type === "goods" ? "Item" : "Service"} · {(w.categories as unknown as { name: string } | null)?.name} · {w.budget != null ? kes(w.budget) : "no budget"} · {timeAgo(w.created_at)}{w.notify ? " · alerts on" : ""}</div></td>
                <td className={td}>{u?.full_name}<div className="text-xs text-muted-foreground">{u?.email}</div></td>
                <td className={td}><Badge tone={w.status === "active" ? "green" : w.status === "removed" ? "red" : "gray"}>{w.status === "fulfilled" ? "closed" : w.status}</Badge></td>
                <td className={td}>
                  <ActionForm action={setWantedStatus} success="Ad updated"><input type="hidden" name="id" value={w.id} />
                    {w.status === "removed" ? <><input type="hidden" name="status" value="active" /><button className={smallBtn}>Restore</button></>
                      : <><input type="hidden" name="status" value="removed" /><button className={dangerBtn}>Remove</button></>}
                  </ActionForm>
                </td>
              </tr>
            );
          })}
          {!data?.length && <tr><td colSpan={4} className="px-3 py-10 text-center text-sm text-muted-foreground">No wanted ads.</td></tr>}
        </tbody>
      </Table>
      <Pager page={page} total={count ?? 0} size={PAGE} href={href} />
    </>
  );
}
