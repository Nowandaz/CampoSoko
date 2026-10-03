import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE !== "false",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

export async function sendEmail(opts: { to: string; subject: string; html: string; text: string }) {
  const t = getTransporter();
  if (!t) {
    console.warn(`[email] SMTP not configured; skipped "${opts.subject}" to ${opts.to}`);
    return { sent: false as const };
  }
  await t.sendMail({ from: process.env.SMTP_FROM, ...opts });
  return { sent: true as const };
}
