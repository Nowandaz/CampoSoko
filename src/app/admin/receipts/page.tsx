import Link from "next/link";
import { PAGE, requireAdmin } from "@/lib/admin";
import { Badge, PageTitle, Pager, Table, td, th } from "@/components/admin/ui";
import { AdminVoid } from "@/components/admin/AdminForms";
import { money } from "@/lib/receipts";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Receipts" };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { sb } = await requireAdmin();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { data, count } = await sb.from("receipts")
    .select("id, receipt_no, buyer_name, total, voided, void_reason, created_at, seller:profiles!receipts_seller_id_fkey(full_name, email)", { count: "exact" })
    .order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  return (
    <>
      <PageTitle title="Receipts" />
      <Table min="52rem">
        <thead><tr className="border-b border-border"><th className={th}>Receipt</th><th className={th}>Seller</th><th className={th}>Buyer</th><th className={th}>Total</th><th className={th}>Status</th></tr></thead>
        <tbody className="divide-y divide-border">
          {(data ?? []).map((r) => {
            const s = r.seller as unknown as { full_name: string; email: string } | null;
            return (
              <tr key={r.id}>
                <td className={td}><Link href={`/receipts/${r.id}`} className="font-mono font-medium hover:underline">{r.receipt_no}</Link><div className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</div></td>
                <td className={td}>{s?.full_name}<div className="text-xs text-muted-foreground">{s?.email}</div></td>
                <td className={td}>{r.buyer_name}</td>
                <td className={`${td} tabular-nums ${r.voided ? "line-through opacity-60" : ""}`}>{money(r.total)}</td>
                <td className={td}>{r.voided ? <><Badge tone="red">void</Badge><div className="mt-1 text-xs text-muted-foreground">{r.void_reason}</div></> : <AdminVoid id={r.id} />}</td>
              </tr>
            );
          })}
          {!data?.length && <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-muted-foreground">No receipts yet.</td></tr>}
        </tbody>
      </Table>
      <Pager page={page} total={count ?? 0} size={PAGE} href={(p) => `/admin/receipts?page=${p}`} />
    </>
  );
}
