import Link from "next/link";
import { APP_NAME } from "@/config/site";

export const metadata = { title: "Safety tips" };

const tips = [
  ["Meet in public", "Choose well-lit campus spots: the library, the cafeteria, or the main gate with security. Avoid hostels and isolated places for a first meeting."],
  ["Bring a friend", "Two people are safer than one, and a friend helps you check the item properly."],
  ["Inspect before you pay", "Switch the item on, test it, and check it matches the photos and description. Walk away if something feels off."],
  ["Don't pay in full upfront", "Be careful paying strangers in advance for goods or services. For online services, agree on scope and split payment into milestones."],
  ["Protect your M-Pesa", "Never share your M-Pesa PIN or any one-time code (OTP), with anyone, for any reason. No genuine buyer or seller needs them."],
  ["Get a receipt, leave a review", "After a sale, ask the seller to issue a receipt on " + APP_NAME + " and keep it. Then leave a quick thumbs up or down so others can shop safely."],
  ["Report and block", "See a scam, a banned item, or someone making you uncomfortable? Use Report on the listing, ad or shop. You can also block anyone from their page."],
] as const;

export default function Page() {
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight">Safety tips</h1>
      <p className="mt-2 text-muted-foreground">{APP_NAME} connects students, but we are not part of your deal. A few habits keep you safe.</p>
      <ol className="mt-8 space-y-4">
        {tips.map(([title, text], i) => (
          <li key={title} className="flex gap-4 rounded-2xl bg-card p-5 ring-1 ring-border">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">{i + 1}</span>
            <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-[15px] text-muted-foreground">{text}</p></div>
          </li>
        ))}
      </ol>
      <p className="mt-8 text-sm text-muted-foreground">Read our <Link href="/terms" className="font-medium text-primary hover:underline">Terms</Link> for what can&apos;t be posted.</p>
    </article>
  );
}
