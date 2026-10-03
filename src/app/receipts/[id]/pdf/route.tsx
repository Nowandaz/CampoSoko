import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import { loadOwnReceipt, qrFor } from "@/lib/receipt-loader";
import { ReceiptPdf } from "@/components/receipts/ReceiptPdf";
import { verifyUrl } from "@/lib/receipts";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getMe();
  if (!me) return new Response("Unauthorized", { status: 401 });
  const found = await loadOwnReceipt(await createClient(), (await params).id, me.id);
  if (!found) return new Response("Not found", { status: 404 });
  const buf = await renderToBuffer(<ReceiptPdf r={found.data} qr={await qrFor(found.data.token)} url={verifyUrl(found.data.token)} />);
  return new Response(new Uint8Array(buf), {
    headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${found.data.receipt_no}.pdf"`, "cache-control": "private, no-store" },
  });
}
