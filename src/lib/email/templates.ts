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

export function demandEmail(o: { name: string; shop: string; wantedTitle: string; wantedId: string }) {
  const url = `${SITE_URL}/wanted/${o.wantedId}`;
  const html = renderEmail({
    title: "Someone on campus wants what you sell",
    preheader: `Wanted: ${o.wantedTitle}`,
    bodyHtml: `<h1 style="margin:0 0 8px;font-size:22px">A buyer is looking for something you sell</h1>
<p style="margin:0 0 16px;color:#44403c">Hi ${escapeHtml(o.name.split(" ")[0] || "there")}, a student on your campus just posted a wanted ad that matches the tags on <b>${escapeHtml(o.shop)}</b>.</p>
<div style="border:1px solid #fed7aa;background:#fff7ed;border-radius:12px;padding:16px;margin:0 0 20px"><div style="font-size:17px;font-weight:700">${escapeHtml(o.wantedTitle)}</div></div>
<p style="margin:0 0 24px;text-align:center">${button(url, "See the request")}</p>
<p style="margin:0 0 16px;color:#78716c;font-size:13px">You get this because your shop tags match. Edit your tags any time from your seller profile.</p>`,
  });
  return { subject: `Wanted on campus: ${o.wantedTitle}`, html, text: `A student wants "${o.wantedTitle}", which matches your shop tags. See it: ${url}` };
}

export function expiryEmail(o: { name: string; title: string; days: number; listingId: string }) {
  const url = `${SITE_URL}/dashboard`;
  const when = o.days <= 1 ? "tomorrow" : `in ${o.days} days`;
  const html = renderEmail({
    title: "Your listing is about to expire",
    preheader: `${o.title} expires ${when}.`,
    bodyHtml: `<h1 style="margin:0 0 8px;font-size:22px">Your listing expires ${escapeHtml(when)}</h1>
<p style="margin:0 0 16px;color:#44403c">Hi ${escapeHtml(o.name.split(" ")[0] || "there")}, your listing <b>${escapeHtml(o.title)}</b> will be taken down automatically ${escapeHtml(when)}.</p>
<p style="margin:0 0 24px;color:#44403c">Still available? Renew it for another 30 days in one tap. Already sold? Mark it as sold so buyers stop messaging you.</p>
<p style="margin:0 0 24px;text-align:center">${button(url, "Renew or manage listing")}</p>`,
  });
  return { subject: `Your listing "${o.title}" expires ${when}`, html, text: `Your listing "${o.title}" expires ${when}. Renew or manage it: ${url}` };
}

export function accountDeletedEmail(o: { name: string }) {
  const html = renderEmail({
    title: "Your account was deleted",
    preheader: "Your CampoSoko account and listings have been removed.",
    bodyHtml: `<h1 style="margin:0 0 8px;font-size:22px">Your account has been deleted</h1>
<p style="margin:0 0 16px;color:#44403c">Hi ${escapeHtml(o.name.split(" ")[0] || "there")}, as you asked, we deleted your ${escapeHtml(APP_NAME)} profile, shop, listings, wanted ads, photos and notifications.</p>
<p style="margin:0 0 16px;color:#44403c">Receipts you issued or received are kept as plain records of those sales, without a link to an account.</p>
<p style="margin:0 0 16px;color:#78716c;font-size:13px">If you did not do this, please contact us straight away.</p>`,
  });
  return { subject: `Your ${APP_NAME} account was deleted`, html, text: `Your ${APP_NAME} account and listings were deleted. If you did not request this, contact us immediately.` };
}
