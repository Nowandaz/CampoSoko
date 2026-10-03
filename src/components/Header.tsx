import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { getMe } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";
import { NotificationBell } from "./NotificationBell";

const ghost = "h-10 items-center whitespace-nowrap rounded-lg px-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground";
const solid = "h-10 items-center whitespace-nowrap rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover";

export async function Header() {
  const me = await getMe();
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 md:h-16">
        <Logo />
        <nav className="flex items-center gap-0.5" aria-label="Main">
          {me ? (
            <>
              <NotificationBell userId={me.id} />
              {/* Desktop links; on phones these live in the bottom tab bar and Account page. */}
              <Link href="/dashboard" className={`${ghost} hidden md:inline-flex`}>Dashboard</Link>
              {me.role === "admin" && <Link href="/admin" className={`${ghost} hidden md:inline-flex`}>Admin</Link>}
              <Link href="/account" className={`${ghost} hidden md:inline-flex`}>{me.full_name.split(" ")[0]}</Link>
              <form action={logout} className="hidden md:block"><button className={`${ghost} inline-flex`}>Log out</button></form>
              <Link href="/sell" className={`${solid} ml-1 hidden md:inline-flex`}>Sell</Link>
            </>
          ) : (
            <>
              <Link href="/login" className={`${ghost} inline-flex`}>Log in</Link>
              <Link href="/signup" className={`${solid} inline-flex`}>Sign up</Link>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
