import Link from "next/link";
import { APP_NAME, APP_TAGLINE, SUPPORT_EMAIL } from "@/config/site";

const columns = [
  { title: "Marketplace", links: [["Goods", "/?tab=goods"], ["Services", "/?tab=services"], ["Wanted ads", "/?tab=wanted"], ["Shops", "/shops"]] },
  { title: "Sell", links: [["Start selling", "/sell"], ["Post a wanted ad", "/wanted/new"], ["Receipts", "/receipts"], ["Dashboard", "/dashboard"]] },
  { title: "Help and safety", links: [["Safety tips", "/safety-tips"], ["Terms", "/terms"], ["Privacy", "/privacy"]] },
] as const;

const link = "inline-flex h-9 items-center text-sm text-muted-foreground hover:text-foreground";

export function Footer({ padForNav = false }: { padForNav?: boolean }) {
  return (
    <footer className={`border-t border-border bg-muted/50 pt-12 ${padForNav ? "pb-24 md:pb-8" : "pb-8"}`}>
      <div className="mx-auto max-w-5xl px-4">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <p className="text-lg font-semibold tracking-tight">Campo<span className="text-primary">Soko</span></p>
            <p className="mt-1 text-sm font-medium">{APP_TAGLINE}</p>
            <p className="mt-3 text-sm text-muted-foreground">A free marketplace for university students in Kenya. Buy, sell and request goods and online services on your campus.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:col-span-3">
            {columns.map((c) => (
              <nav key={c.title} aria-label={c.title}>
                <h2 className="mb-1 text-sm font-semibold">{c.title}</h2>
                <ul>{c.links.map(([label, href]) => <li key={label}><Link href={href} className={link}>{label}</Link></li>)}</ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="whitespace-nowrap">&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <p className="sm:max-w-md sm:text-right">{APP_NAME} is a venue only and is not a party to transactions between users. Questions? <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-foreground hover:underline">{SUPPORT_EMAIL}</a></p>
        </div>
      </div>
    </footer>
  );
}
