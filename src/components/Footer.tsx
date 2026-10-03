import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/40 py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
        <p><span className="font-semibold text-foreground">{APP_NAME}</span> · {APP_TAGLINE}</p>
        <nav aria-label="Legal" className="flex gap-5">
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
