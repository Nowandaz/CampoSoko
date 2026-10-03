import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/config/site";

export function Footer({ padForNav = false }: { padForNav?: boolean }) {
  return (
    <footer className={`border-t border-border bg-muted/40 pt-8 text-sm text-muted-foreground ${padForNav ? "pb-24 md:pb-8" : "pb-8"}`}>
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
        <p><span className="font-semibold text-foreground">{APP_NAME}</span> · {APP_TAGLINE}</p>
        <nav aria-label="Legal" className="flex gap-5">
          <Link href="/terms" className="inline-flex h-10 items-center hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="inline-flex h-10 items-center hover:text-foreground">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
