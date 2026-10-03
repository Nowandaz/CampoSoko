import { APP_NAME, APP_TAGLINE, SITE_URL } from "@/config/site";

const ORANGE = "#ea580c";

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:${ORANGE};color:#ffffff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;font-size:16px">${label}</a>`;
}

/** Table-based, inline-styled HTML that renders in Gmail/Outlook/mobile. bodyHtml is trusted HTML. */
export function renderEmail(opts: { title: string; preheader: string; bodyHtml: string; siteUrl?: string }) {
  const url = opts.siteUrl ?? SITE_URL;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #fed7aa">
    <tr><td style="background:${ORANGE};padding:20px 28px">
      <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px">&#127890; ${escapeHtml(APP_NAME)}</span>
    </td></tr>
    <tr><td style="padding:28px 28px 8px;font-size:16px;line-height:1.6">${opts.bodyHtml}</td></tr>
    <tr><td style="padding:16px 28px 28px;font-size:12px;line-height:1.5;color:#78716c;border-top:1px solid #f5f5f4">
      ${escapeHtml(APP_NAME)} &middot; ${escapeHtml(APP_TAGLINE)}<br>
      Stay safe: meet in public campus spots and never share your M-Pesa PIN or OTP with anyone.<br>
      <a href="${url}" style="color:${ORANGE}">${url.replace(/^https?:\/\//, "")}</a>
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

/** 6-digit code block used by the OTP email. `code` may be a Supabase placeholder like {{ .Token }}. */
export function otpBody(code: string, heading: string, intro: string) {
  return `<h1 style="margin:0 0 8px;font-size:22px">${heading}</h1>
<p style="margin:0 0 20px;color:#44403c">${intro}</p>
<div style="text-align:center;margin:8px 0 20px">
  <div style="display:inline-block;background:#fff7ed;border:2px dashed ${ORANGE};border-radius:12px;padding:14px 28px;font-size:30px;font-weight:800;letter-spacing:6px;color:${ORANGE};font-family:Menlo,Consolas,monospace">${code}</div>
</div>
<p style="margin:0 0 16px;color:#44403c">This code expires in 1 hour. If you didn't request it, you can safely ignore this email.</p>`;
}
