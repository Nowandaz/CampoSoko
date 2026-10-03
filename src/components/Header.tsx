import Link from "next/link";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { getMe } from "@/lib/auth";
import { logout } from "@/app/(auth)/actions";

const pill = "rounded-full px-4 py-2 text-sm font-semibold";

export async function Header() {
  const me = await getMe();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-2">
          {me ? (
            <>
              {me.role === "admin" && <Link href="/admin" className={`${pill} hover:bg-muted`}>Admin</Link>}
              <Link href="/account" className={`${pill} hover:bg-muted`}>{me.full_name.split(" ")[0]}</Link>
              <form action={logout}><button className={`${pill} border border-border hover:bg-muted`}>Log out</button></form>
            </>
          ) : (
            <>
              <Link href="/login" className={`${pill} hover:bg-muted`}>Log in</Link>
              <Link href="/signup" className={`${pill} bg-primary text-primary-foreground hover:bg-primary-hover`}>Sign up</Link>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
