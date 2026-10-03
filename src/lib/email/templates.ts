import { APP_NAME, SITE_URL } from "@/config/site";
import { button, escapeHtml, renderEmail } from "./layout";
import { kes } from "@/lib/format";

export function matchEmail(o: { name: string; wantedTitle: string; listingTitle: string; price: number; listingId: string }) {
  const url = `${SITE_URL}/listing/${o.listingId}`;
  const first = escapeHtml(o.name.split(" ")[0] || "there");
  const html = renderEmail({
    title: "New match for your wanted ad",
    preheader: `${o.listingTitle} was just posted on ${APP_NAME}.`,
    bodyHtml: `<h1 style="margin:0 0 8px;font-size:22px">Good news, ${first}</h1>
<p style="margin:0 0 16px;color:#44403c">Something just came up that matches your wanted ad <b>${escapeHtml(o.wantedTitle)}</b>.</p>
<div style="border:1px solid #fed7aa;background:#fff7ed;border-radius:12px;padding:16px;margin:0 0 20px">
  <div style="font-size:17px;font-weight:700">${escapeHtml(o.listingTitle)}</div>
  <div style="margin-top:4px;color:#ea580c;font-weight:700;font-size:18px">${kes(o.price)}</div>
</div>
<p style="margin:0 0 24px;text-align:center">${button(url, "View listing")}</p>
<p style="margin:0 0 16px;color:#78716c;font-size:13px">You get this because you turned on alerts for your wanted ad. You can close the ad any time from your dashboard.</p>`,
  });
  return { subject: `New match: ${o.listingTitle}`, html, text: `A listing matching your wanted ad "${o.wantedTitle}" was posted: ${o.listingTitle} (${kes(o.price)}). View it: ${url}` };
}
