import { APP_NAME } from "@/config/site";
import { DISCLAIMER, methodLabel, money, type ReceiptData } from "@/lib/receipts";

/** On-screen receipt. Used for the signed-in view and the public verification page. */
export function ReceiptView({ r, qr }: { r: ReceiptData; qr?: string }) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between bg-primary px-5 py-4 text-primary-foreground">
        <p className="text-lg font-semibold tracking-tight">{APP_NAME}</p>
        <p className="text-sm font-medium opacity-90">Receipt</p>
      </div>
      {r.voided && (
        <div role="alert" className="border-b border-danger/30 bg-danger/10 px-5 py-3 text-sm text-danger">
          <b>VOID.</b> This receipt was cancelled{r.void_reason ? `: ${r.void_reason}` : "."}
        </div>
      )}
      <div className="space-y-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Receipt no.</p>
            <p className="font-mono text-lg font-semibold">{r.receipt_no}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Date</p>
            <p className="font-medium">{new Date(r.sale_date + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-muted-foreground">Seller</dt><dd className="font-medium">{r.seller}</dd></div>
          <div><dt className="text-muted-foreground">Buyer</dt><dd className="font-medium">{r.buyer}{r.buyer_contact && <span className="block text-xs font-normal text-muted-foreground">{r.buyer_contact}</span>}</dd></div>
          <div><dt className="text-muted-foreground">Payment</dt><dd className="font-medium">{methodLabel[r.payment_method]}</dd></div>
          {r.mpesa_code && <div><dt className="text-muted-foreground">M-Pesa code</dt><dd className="font-mono font-medium">{r.mpesa_code}</dd></div>}
        </dl>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 font-medium">Item</th><th className="pb-2 text-right font-medium">Qty</th>
                <th className="pb-2 text-right font-medium">Price</th><th className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {r.items.map((i, n) => (
                <tr key={n} className="border-b border-border/60 align-top">
                  <td className="py-2.5 pr-2">{i.name}</td>
                  <td className="py-2.5 text-right tabular-nums">{i.quantity}</td>
                  <td className="py-2.5 text-right tabular-nums">{money(i.unit_price)}</td>
                  <td className="py-2.5 text-right tabular-nums">{money(i.quantity * i.unit_price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={3} className="pt-3 text-right font-semibold">Total</td><td className={`pt-3 text-right text-lg font-semibold tabular-nums ${r.voided ? "line-through opacity-60" : ""}`}>{money(r.total)}</td></tr>
            </tfoot>
          </table>
        </div>

        {r.notes && <p className="rounded-lg bg-muted px-3.5 py-3 text-sm"><span className="text-muted-foreground">Notes: </span>{r.notes}</p>}

        <div className="flex items-end justify-between gap-4 border-t border-border pt-4">
          <p className="text-xs leading-relaxed text-muted-foreground">{DISCLAIMER(APP_NAME)}</p>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code linking to this receipt's verification page" width={72} height={72} className="shrink-0 rounded" />
          )}
        </div>
      </div>
    </article>
  );
}
