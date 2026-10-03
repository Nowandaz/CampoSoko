"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["/admin", "Overview"], ["/admin/listings", "Listings"], ["/admin/wanted", "Wanted"], ["/admin/users", "Users"],
  ["/admin/reports", "Reports"], ["/admin/flags", "Flags"], ["/admin/receipts", "Receipts"], ["/admin/ai", "AI"], ["/admin/campuses", "Campuses"], ["/admin/categories", "Categories"], ["/admin/audit", "Audit log"],
] as const;

export function AdminNav({ openReports, openFlags = 0, photoQueue = 0 }: { openReports: number; openFlags?: number; photoQueue?: number }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {items.map(([href, label]) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium ${active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            {label}
            {href === "/admin/listings" && photoQueue > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] font-bold leading-5 text-primary-foreground">{photoQueue}</span>}
            {href === "/admin/flags" && openFlags > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] font-bold leading-5 text-primary-foreground">{openFlags}</span>}
            {href === "/admin/reports" && openReports > 0 && <span className="rounded-full bg-danger px-1.5 text-[11px] font-bold leading-5 text-white">{openReports}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
