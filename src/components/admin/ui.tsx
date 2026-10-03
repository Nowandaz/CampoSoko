import Link from "next/link";
import type { ReactNode } from "react";

export const th = "whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground";
export const td = "px-3 py-3 align-top text-sm";
export const smallBtn = "inline-flex h-9 items-center whitespace-nowrap rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted";
export const dangerBtn = `${smallBtn} text-danger`;

export function Table({ children, min = "52rem" }: { children: ReactNode; min?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-left" style={{ minWidth: min }}>{children}</table>
    </div>
  );
}

const tones = { green: "bg-success/10 text-success", red: "bg-danger/10 text-danger", gray: "bg-muted text-muted-foreground", orange: "bg-primary-soft text-primary" };
export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${tones[tone]}`}>{children}</span>;
}

export function Pager({ page, total, size, href }: { page: number; total: number; size: number; href: (p: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      {page > 1 ? <Link href={href(page - 1)} className={smallBtn}>Previous</Link> : <span />}
      <span className="text-muted-foreground">{total} total · page {page} of {pages}</span>
      {page < pages ? <Link href={href(page + 1)} className={smallBtn}>Next</Link> : <span />}
    </nav>
  );
}

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export const selectCls = "h-10 rounded-lg border border-border bg-card px-3 text-sm";

/** Plain anchor on purpose: a <Link> would prefetch the export route and write an audit entry. */
export function DownloadLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} download className={smallBtn}>{children}</a>
  );
}
