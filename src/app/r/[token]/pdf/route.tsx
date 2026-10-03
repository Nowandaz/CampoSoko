import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { loadPublicReceipt, qrFor } from "@/lib/receipt-loader";
import { ReceiptPdf } from "@/components/receipts/ReceiptPdf";
import { verifyUrl } from "@/lib/receipts";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await loadPublicReceipt(await createClient(), token);
  if (!r) return new Response("Not found", { status: 404 });
  const buf = await renderToBuffer(<ReceiptPdf r={r} qr={await qrFor(token)} url={verifyUrl(token)} />);
  return new Response(new Uint8Array(buf), {
    headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${r.receipt_no}.pdf"` },
  });
}
