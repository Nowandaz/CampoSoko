import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadOwnReceipt, qrFor } from "@/lib/receipt-loader";
import { ReceiptView } from "@/components/receipts/ReceiptView";
import { ShareBar, VoidForm } from "@/components/receipts/ReceiptActions";
import { Notice } from "@/components/ui/form";
import { APP_NAME } from "@/config/site";
import { money, verifyUrl } from "@/lib/receipts";
import { ReviewBox } from "@/components/shop/ReviewBox";

export const metadata = { title: "Receipt" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ issued?: string }> }) {
  const { id } = await params;
  const me = await requireMe(`/receipts/${id}`);
  const sb = await createClient();
  const found = await loadOwnReceipt(sb, id, me.id);
  if (!found) notFound();
  const { data: r, isSeller, buyerPhone } = found;
  const link = verifyUrl(r.token);
  const text = `${APP_NAME} receipt ${r.receipt_no} from ${r.seller}: ${money(r.total)}. Keep this receipt, and please rate your experience here: ${link}`;
  const { data: existing } = await sb.rpc("get_receipt_review", { p_token: r.token });
  const waHref = `https://wa.me/${buyerPhone ? buyerPhone.replace(/\D/g, "") : ""}?text=${encodeURIComponent(text)}`;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/receipts" className="inline-flex h-10 items-center text-sm font-medium text-muted-foreground hover:text-foreground">All receipts</Link>
      {(await searchParams).issued && <Notice notice="Receipt issued. Share it with the buyer below." />}
      <ReceiptView r={r} qr={await qrFor(r.token)} />
      {!r.voided && (!isSeller || existing) && <ReviewBox token={r.token} seller={r.seller} existing={existing ?? null} />}
      <ShareBar pdfHref={`/receipts/${id}/pdf`} shareText={text} waHref={waHref} link={link} />
      {isSeller && !r.voided && <VoidForm id={id} />}
    </div>
  );
}
