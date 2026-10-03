import { requireAdmin } from "@/lib/admin";
import { AdminNav } from "@/components/admin/AdminNav";
import { PhotoReviewProvider, ReviewQueueButton, type ReviewItem } from "@/components/admin/PhotoReview";

export const metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { sb } = await requireAdmin();
  const { count } = await sb.from("reports").select("id", { count: "exact", head: true }).eq("status", "open");
  const { count: flags } = await sb.from("content_flags").select("id", { count: "exact", head: true }).eq("status", "open");
  const { data: pend } = await sb.from("listings")
    .select("id, title, price, profiles(full_name, email), listing_images!inner(url, position)")
    .eq("photos_reviewed", false).eq("status", "active").order("created_at", { ascending: true }).limit(40);
  const queue: ReviewItem[] = (pend ?? []).map((l) => {
    const sel = l.profiles as unknown as { full_name: string; email: string } | null;
    return { id: l.id, title: l.title, price: Number(l.price), seller: sel?.full_name ?? "", sellerEmail: sel?.email ?? "", reviewed: false,
      images: [...(l.listing_images ?? [])].sort((a, b) => a.position - b.position).map((i) => i.url) };
  });
  const photos = queue.length;
  return (
    <PhotoReviewProvider queue={queue}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1"><AdminNav openReports={count ?? 0} openFlags={flags ?? 0} photoQueue={photos} /></div>
          <ReviewQueueButton />
        </div>
        {children}
      </div>
    </PhotoReviewProvider>
  );
}
