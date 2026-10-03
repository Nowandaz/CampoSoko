import { APP_NAME, SUPPORT_EMAIL } from "@/config/site";

export const metadata = { title: "Terms of Service" };

function H({ children }: { children: React.ReactNode }) { return <h2 className="mt-8 text-lg font-semibold">{children}</h2>; }

export default function Page() {
  return (
    <article className="mx-auto max-w-2xl text-[15px] leading-relaxed text-foreground/90">
      <p role="note" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">DRAFT - review by a lawyer before launch</p>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-1 text-sm text-muted-foreground">Last updated: draft</p>

      <H>1. What {APP_NAME} is</H>
      <p className="mt-2">{APP_NAME} is an online venue where university students in Kenya can list goods and online services, post what they want, and contact each other on WhatsApp. {APP_NAME} is a venue only. We are not a buyer, seller, agent or broker, and we are not a party to any transaction between users.</p>

      <H>2. No escrow, no guarantee</H>
      <p className="mt-2">We do not hold money, process payments or provide escrow. We do not inspect, verify or guarantee any item, service, listing, user, receipt or review. You deal with other users at your own risk. Agree on price, scope and payment before you pay, and avoid paying in full upfront to people you do not know.</p>

      <H>3. Your account</H>
      <p className="mt-2">You must give accurate information, keep your login private, and use one account. You are responsible for activity on your account. You must be a student or otherwise permitted to use the campus you select.</p>

      <H>4. What you post</H>
      <p className="mt-2">You are responsible for everything you post, including listings, wanted ads, photos, receipts and reviews. You confirm that you have the right to sell or offer what you post, and that your descriptions and prices are honest. Online services must be delivered online only. Agree on scope and payment milestones before work starts.</p>

      <H>5. Prohibited items and conduct</H>
      <p className="mt-2">You must not post, offer or request:</p>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>alcohol, drugs or other controlled substances;</li>
        <li>weapons or dangerous items;</li>
        <li>stolen goods;</li>
        <li>counterfeit or fake items;</li>
        <li>exam papers, or cheating or academic dishonesty services (such as writing assignments or sitting exams for others);</li>
        <li>adult or sexual content;</li>
        <li>anything illegal in Kenya.</li>
      </ul>
      <p className="mt-2">You must not harass, threaten, deceive or defraud anyone, post fake reviews, or misuse another person&apos;s contact details.</p>

      <H>6. Receipts and reviews</H>
      <p className="mt-2">Receipts are records created by sellers. They are not issued, endorsed or audited by {APP_NAME}, and are not tax invoices. Reviews are opinions of users and may be removed if they break these terms.</p>

      <H>7. Reporting and blocking</H>
      <p className="mt-2">You can report any listing, wanted ad or user from its page, and block users you do not want to deal with. Our team reviews reports and may dismiss them, remove content or suspend accounts. We do not have to give reasons and cannot promise a particular outcome or timeline.</p>

      <H>8. Suspension and removal</H>
      <p className="mt-2">We may remove content, suspend or close accounts, at any time and without notice, if we think these terms are broken, someone is at risk, or the law requires it. Suspended users cannot post or contact others.</p>

      <H>9. Limits of liability</H>
      <p className="mt-2">{APP_NAME} is provided &ldquo;as is&rdquo;. To the fullest extent allowed by law, we are not liable for losses, injuries, disputes or damages arising from transactions or meetings between users, from content posted by users, or from the service being unavailable. Nothing in these terms limits liability that cannot be limited by law.</p>

      <H>10. Changes and contact</H>
      <p className="mt-2">We may update these terms. Continuing to use {APP_NAME} means you accept the updated terms. Questions: {SUPPORT_EMAIL}.</p>
    </article>
  );
}
