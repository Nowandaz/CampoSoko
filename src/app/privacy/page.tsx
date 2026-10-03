import { APP_NAME, SUPPORT_EMAIL } from "@/config/site";

export const metadata = { title: "Privacy Policy" };

function H({ children }: { children: React.ReactNode }) { return <h2 className="mt-8 text-lg font-semibold">{children}</h2>; }

export default function Page() {
  return (
    <article className="mx-auto max-w-2xl text-[15px] leading-relaxed text-foreground/90">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last updated: October 2026</p>
      <p className="mt-4">This policy explains how {APP_NAME} handles personal data, and is written to align with Kenya&apos;s Data Protection Act, 2019.</p>

      <H>1. Data we collect</H>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li><b>Account data:</b> full name, email address, WhatsApp number, campus, and a password you choose (stored securely by our authentication provider, never in plain text).</li>
        <li><b>Seller data:</b> shop name, location on campus, description, tags and optional photo.</li>
        <li><b>Listing and wanted-ad data:</b> text, prices, categories and photos you upload.</li>
        <li><b>Receipt data:</b> buyer name and phone or email, items, amounts, payment method and optional M-Pesa code, which sellers enter.</li>
        <li><b>Activity data:</b> listing views, WhatsApp contact clicks, searches, reports, blocks and reviews.</li>
      </ul>

      <H>2. Why we use it</H>
      <p className="mt-2">To run the marketplace: create and secure your account, show listings, let logged-in users contact each other, send alerts you asked for (wanted-ad matches, expiry reminders), issue and verify receipts, keep the platform safe, and understand usage. We do not sell your data.</p>

      <H>3. Who sees your WhatsApp number</H>
      <p className="mt-2">Your WhatsApp number is shown only to logged-in users who press the WhatsApp contact button on your listing or wanted ad. It is never shown to logged-out visitors or in public pages. Users you block cannot reveal it. Your full name is private: other users see your shop name, or a short public name such as &ldquo;Jane W.&rdquo;.</p>

      <H>4. Receipts</H>
      <p className="mt-2">Anyone with a receipt&apos;s verification link can view it. The public view hides most of the buyer&apos;s phone number or email, and shows only the buyer&apos;s first name and last initial.</p>

      <H>5. Service providers</H>
      <p className="mt-2">We use trusted processors to run the service: <b>Supabase</b> (database, authentication and file storage), <b>Vercel</b> (hosting) and an email delivery provider (such as <b>Resend</b> or your configured SMTP service) to send emails. They process data on our instructions.</p>

      <H>6. Retention</H>
      <p className="mt-2">We keep account data while your account is active. Listings expire after 30 days but may be kept for a limited time. Receipts are kept as records of a transaction, including voided ones. Logs of reports and admin actions are kept to protect users. When data is no longer needed, we delete or anonymise it.</p>

      <H>7. Your rights and deletion requests</H>
      <p className="mt-2">You may ask to access, correct or delete your personal data, to object to certain uses, or to withdraw consent. Email {SUPPORT_EMAIL} from your account email. We will respond within the time required by law. Deleting your account removes your profile and listings; receipts you issued or received may be retained in anonymised form where needed for record keeping.</p>

      <H>8. Security</H>
      <p className="mt-2">We use access controls, encryption in transit, row-level database security and rate limiting. No system is perfectly secure; please use a strong password and never share it, or your M-Pesa PIN or OTPs.</p>

      <H>9. Children</H>
      <p className="mt-2">{APP_NAME} is for university students and is not intended for children under 18.</p>

      <H>10. Changes and contact</H>
      <p className="mt-2">We may update this policy and will post the new version here. Contact: {SUPPORT_EMAIL}. You may also complain to the Office of the Data Protection Commissioner of Kenya.</p>
    </article>
  );
}
