import Link from "next/link";
import { APP_TAGLINE } from "@/config/site";
import { Chat, Bell, Shield, Tag } from "@/components/ui/icons";

const steps = [
  { icon: Tag, title: "List in a minute", text: "Post goods or online services with photos and a price." },
  { icon: Chat, title: "Talk on WhatsApp", text: "Buyers message you directly. No in-app chat to check." },
  { icon: Bell, title: "Never miss a match", text: "Post what you want and get alerted when it appears." },
  { icon: Shield, title: "Trade safely", text: "Report, block and follow built-in meet-up tips." },
];

export default function Home() {
  return (
    <div className="space-y-16 py-6 sm:py-12">
      <section className="mx-auto max-w-2xl text-center">
        <p className="inline-flex rounded-full border border-border bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">Free for students in Kenya</p>
        <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">{APP_TAGLINE}</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          Buy, sell and request goods and online services from students on your campus.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-6 font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover">Get started</Link>
          <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-card px-6 font-semibold hover:bg-muted">Log in</Link>
        </div>
      </section>
      <section aria-labelledby="how" className="grid gap-4 sm:grid-cols-2">
        <h2 id="how" className="sr-only">How it works</h2>
        {steps.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Icon /></span>
            <div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{text}</p></div>
          </div>
        ))}
      </section>
    </div>
  );
}
