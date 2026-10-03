// Generates Supabase Auth email templates from the shared layout. Usage: npm run emails:build
import { writeFileSync } from "node:fs";
import { renderEmail, otpBody } from "../src/lib/email/layout";

const t = (heading: string, intro: string, subjectNote: string) =>
  renderEmail({
    title: subjectNote,
    preheader: "Your CampoSoko code is inside.",
    siteUrl: "{{ .SiteURL }}",
    bodyHtml: otpBody("{{ .Token }}", heading, intro),
  });

writeFileSync("supabase/email-templates/confirm-signup.html",
  t("Welcome to CampoSoko 🎉", "Use this code to verify your email and finish creating your account.", "Verify your CampoSoko account"));
writeFileSync("supabase/email-templates/magic-link.html",
  t("Your login code", "Enter this code on CampoSoko to log in. No password needed.", "Your CampoSoko login code"));
console.log("Wrote supabase/email-templates/*.html");
