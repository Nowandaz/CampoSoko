// Verifies SMTP credentials from .env.local and sends a branded test email. Usage: npm run smtp:test [to@example.com]
import { config } from "dotenv";
import nodemailer from "nodemailer";
import { renderEmail, otpBody } from "../src/lib/email/layout";
config({ path: ".env.local" });

async function main() {
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE !== "false",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 15000,
  });
  await t.verify();
  console.log("SMTP login OK");
  const to = process.argv[2] ?? process.env.SMTP_USER!;
  await t.sendMail({
    from: process.env.SMTP_FROM, to, subject: "CampoSoko test email",
    text: "Test code: 123456",
    html: renderEmail({ title: "Test", preheader: "Test", bodyHtml: otpBody("123456", "SMTP works 🎉", "This is a test of your CampoSoko email setup.") }),
  });
  console.log(`Test email sent to ${to}`);
}
main().catch((e) => { console.error("SMTP FAILED:", e.message); process.exit(1); });
