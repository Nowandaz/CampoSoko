import type { ReactNode } from "react";
import { APP_NAME } from "@/config/site";
import { Shield, Chat, Bell, Tag } from "@/components/ui/icons";

const points = [
  { icon: Tag, title: "Buy and sell on campus", text: "Goods and online services from students you can actually meet." },
  { icon: Chat, title: "Chat on WhatsApp", text: "No in-app inbox. Reach sellers where you already talk." },
  { icon: Bell, title: "Get alerted", text: "Post what you want and we notify you when it appears." },
  { icon: Shield, title: "Safety first", text: "Reporting, blocking and meet-up tips built in." },
];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 items-start gap-10 py-4 md:grid-cols-[1fr_400px] md:py-10">
      <aside className="hidden md:block">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">{APP_NAME}</p>
        <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">The marketplace built for campus life.</h2>
        <ul className="mt-8 space-y-5">
          {points.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Icon /></span>
              <span><b className="block text-[15px]">{title}</b><span className="text-sm text-muted-foreground">{text}</span></span>
            </li>
          ))}
        </ul>
      </aside>
      <section className="min-w-0 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mb-6 mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        {children}
      </section>
    </div>
  );
}
