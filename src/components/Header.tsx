import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { getMe } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";

const ghost = "inline-flex h-10 items-center rounded-lg px-3.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground";
const solid = "inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover";

export async function Header() {
  const me = await getMe();
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-1" aria-label="Main">
          {me ? (
            <>
              {me.role === "admin" && <Link href="/admin" className={ghost}>Admin</Link>}
              <Link href="/account" className={ghost}>{me.full_name.split(" ")[0]}</Link>
              <form action={logout}><button className={ghost}>Log out</button></form>
            </>
          ) : (
            <>
              <Link href="/login" className={ghost}>Log in</Link>
              <Link href="/signup" className={solid}>Sign up</Link>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
