import Link from "next/link";
import { APP_NAME, APP_TAGLINE } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t border-border py-6 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 sm:flex-row sm:justify-between">
        <p>{APP_NAME} · {APP_TAGLINE}</p>
        <p className="flex gap-4">
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
        </p>
      </div>
    </footer>
  );
}
