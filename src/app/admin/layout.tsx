import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { sb } = await requireAdmin();
  const { count } = await sb.from("reports").select("id", { count: "exact", head: true }).eq("status", "open");
  const { count: flags } = await sb.from("content_flags").select("id", { count: "exact", head: true }).eq("status", "open");
  return (
    <div className="mx-auto max-w-6xl">
      <AdminNav openReports={count ?? 0} openFlags={flags ?? 0} />
      {children}
    </div>
  );
}
