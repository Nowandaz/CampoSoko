import Link from "next/link";
import { APP_NAME } from "@/config/site";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          Campo<span className="text-primary">Soko</span>
          <span className="sr-only"> {APP_NAME} home</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
            Log in
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
