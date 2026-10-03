import Link from "next/link";
import { likeSafe, PAGE, requireAdmin } from "@/lib/admin";
import { DownloadLink, Badge, dangerBtn, PageTitle, Pager, selectCls, smallBtn, Table, td, th } from "@/components/admin/ui";
import { setRole, setSuspended } from "@/app/admin/actions";
import { timeAgo } from "@/lib/format";
import { inputCls } from "@/components/ui/form";

export const metadata = { title: "Users" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { me, sb } = await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  let q = sb.from("profiles").select("id, full_name, email, role, suspended, created_at, campuses(name)", { count: "exact" });
  const term = sp.q ? likeSafe(sp.q) : "";
  if (term) q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  if (sp.role === "admin" || sp.role === "user") q = q.eq("role", sp.role);
  if (sp.state === "suspended") q = q.eq("suspended", true);
  const { data, count } = await q.order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const ids = (data ?? []).map((u) => u.id);
  const { data: stats } = ids.length ? await sb.rpc("admin_user_stats", { p_ids: ids }) : { data: [] };
  type US = { user_id: string; listings: number; wanted: number; receipts: number; reports: number };
  const st = new Map<string, US>(((stats ?? []) as US[]).map((s) => [s.user_id, s]));
  const href = (p: number) => { const u = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]); u.set("page", String(p)); return `/admin/users?${u}`; };
  return (
    <>
      <PageTitle title="Users"><DownloadLink href="/admin/export/users">Export CSV</DownloadLink></PageTitle>
      <form className="mb-4 flex flex-wrap gap-2">
        <div className="w-full sm:w-64"><input name="q" defaultValue={sp.q} placeholder="Search name or email" className={`${inputCls} h-10`} /></div>
        <select name="role" defaultValue={sp.role ?? ""} className={selectCls}><option value="">Any role</option><option value="admin">Admins</option><option value="user">Users</option></select>
        <select name="state" defaultValue={sp.state ?? ""} className={selectCls}><option value="">Any state</option><option value="suspended">Suspended</option></select>
        <button className={smallBtn}>Filter</button>
      </form>
      <Table min="58rem">
        <thead><tr className="border-b border-border"><th className={th}>User</th><th className={th}>Campus</th><th className={th}>Activity</th><th className={th}>Status</th><th className={th}>Actions</th></tr></thead>
        <tbody className="divide-y divide-border">
          {(data ?? []).map((u) => {
            const s = st.get(u.id);
            const self = u.id === me.id;
            return (
              <tr key={u.id}>
                <td className={td}><Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">{u.full_name}</Link><div className="text-xs text-muted-foreground">{u.email} · joined {timeAgo(u.created_at)}</div></td>
                <td className={td}>{(u.campuses as unknown as { name: string } | null)?.name}</td>
                <td className={`${td} text-xs text-muted-foreground`}>{Number(s?.listings ?? 0)} listings · {Number(s?.wanted ?? 0)} wanted · {Number(s?.receipts ?? 0)} receipts{Number(s?.reports ?? 0) > 0 && <> · <span className="font-medium text-danger">{Number(s?.reports)} reports</span></>}</td>
                <td className={td}>{u.role === "admin" && <Badge tone="orange">admin</Badge>} {u.suspended ? <Badge tone="red">suspended</Badge> : <Badge tone="green">active</Badge>}</td>
                <td className={td}>
                  {self ? <span className="text-xs text-muted-foreground">You</span> : (
                    <div className="flex flex-wrap gap-1.5">
                      <form action={setSuspended}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="suspended" value={String(!u.suspended)} />
                        <button className={u.suspended ? smallBtn : dangerBtn}>{u.suspended ? "Unsuspend" : "Suspend"}</button></form>
                      <form action={setRole}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="role" value={u.role === "admin" ? "user" : "admin"} />
                        <button className={smallBtn}>{u.role === "admin" ? "Remove admin" : "Make admin"}</button></form>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          {!data?.length && <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-muted-foreground">No users match.</td></tr>}
        </tbody>
      </Table>
      <Pager page={page} total={count ?? 0} size={PAGE} href={href} />
    </>
  );
}
