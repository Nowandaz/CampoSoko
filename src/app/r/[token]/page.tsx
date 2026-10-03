import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadPublicReceipt, qrFor } from "@/lib/receipt-loader";
import { ReceiptView } from "@/components/receipts/ReceiptView";
import { APP_NAME } from "@/config/site";

export const metadata: Metadata = { title: "Verify receipt", robots: { index: false, follow: false } };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await loadPublicReceipt(await createClient(), token);
  if (!r) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <p className={`rounded-lg px-4 py-3 text-sm font-medium ${r.voided ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>
        {r.voided ? "This receipt exists but has been voided." : `Verified: this is a genuine ${APP_NAME} receipt.`}
      </p>
      <ReceiptView r={r} qr={await qrFor(token)} />
      <div className="flex flex-wrap gap-2">
        <a href={`/r/${token}/pdf`} className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted">Download PDF</a>
        <Link href="/" className="inline-flex h-11 items-center rounded-lg px-4 text-sm font-semibold text-primary hover:underline">Visit {APP_NAME}</Link>
      </div>
      <p className="text-xs text-muted-foreground">Personal details are partly hidden on this public page.</p>
    </div>
  );
}
