import { PAGE, requireAdmin } from "@/lib/admin";
import { PageTitle, Pager, Table, td, th } from "@/components/admin/ui";

export const metadata = { title: "Audit log" };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { sb } = await requireAdmin();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { data, count } = await sb.from("admin_audit_log")
    .select("id, action, target_type, target_id, details, created_at, admin:profiles!admin_audit_log_admin_id_fkey(full_name)", { count: "exact" })
    .order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  return (
    <>
      <PageTitle title="Audit log" />
      <Table min="48rem">
        <thead><tr className="border-b border-border"><th className={th}>When</th><th className={th}>Admin</th><th className={th}>Action</th><th className={th}>Target</th></tr></thead>
        <tbody className="divide-y divide-border">
          {(data ?? []).map((a) => (
            <tr key={a.id}>
              <td className={`${td} whitespace-nowrap text-muted-foreground`}>{new Date(a.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</td>
              <td className={td}>{(a.admin as unknown as { full_name: string } | null)?.full_name ?? "Unknown"}</td>
              <td className={`${td} font-medium`}>{a.action.replace(/_/g, " ")}</td>
              <td className={`${td} text-xs text-muted-foreground`}>{a.target_type} <span className="font-mono">{String(a.target_id).slice(0, 8)}</span>{a.details ? ` · ${JSON.stringify(a.details).slice(0, 90)}` : ""}</td>
            </tr>
          ))}
          {!data?.length && <tr><td colSpan={4} className="px-3 py-10 text-center text-sm text-muted-foreground">No admin actions yet.</td></tr>}
        </tbody>
      </Table>
      <Pager page={page} total={count ?? 0} size={PAGE} href={(p) => `/admin/audit?page=${p}`} />
    </>
  );
}
