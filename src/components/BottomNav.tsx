"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid, Home, Megaphone, Plus, User } from "@/components/ui/icons";

const items = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" || p.startsWith("/listing") },
  { href: "/?tab=wanted", label: "Wanted", icon: Megaphone, match: (p: string) => p.startsWith("/wanted") },
  { href: "/sell", label: "Sell", icon: Plus, match: (p: string) => p.startsWith("/sell"), primary: true },
  { href: "/dashboard", label: "Dashboard", icon: Grid, match: (p: string) => p.startsWith("/dashboard") },
  { href: "/account", label: "Account", icon: User, match: (p: string) => p.startsWith("/account") || p.startsWith("/notifications") },
];

/** Phone-only tab bar for logged-in users. */
export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
        {items.map(({ href, label, icon: Icon, match, primary }) => {
          const active = match(path);
          return (
            <li key={label} className="flex justify-center">
              <Link href={href} aria-current={active ? "page" : undefined}
                className={`flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`}>
                <span className={`grid h-8 w-8 place-items-center ${primary ? "rounded-full bg-primary text-primary-foreground shadow-sm" : ""}`}><Icon /></span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
