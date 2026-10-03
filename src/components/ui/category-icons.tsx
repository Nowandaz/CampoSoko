import type { ReactNode } from "react";

const svg = (children: ReactNode, className?: string) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
    {children}
  </svg>
);

const icons: Record<string, ReactNode> = {
  electronics: <><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 19h20" /></>,
  books: <><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" /><path d="M5 17a3 3 0 0 1 3-3h10" /></>,
  clothes: <path d="M8 4L3 7l2 4 3-1v10h8V10l3 1 2-4-5-3a4 4 0 0 1-8 0z" />,
  furniture: <><path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3" /><path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3v-5z" /><path d="M6 18v2M18 18v2" /></>,
  food: <><path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10" /><path d="M17 3c-2 2-3 5-3 8h3v10" /></>,
  "services-design": <><path d="M4 20l1-4L16 5l3 3L8 19l-4 1z" /><path d="M14 7l3 3" /></>,
  "services-video": <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" /></>,
  "services-writing": <><path d="M7 3h7l4 4v14H7V3z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  tutoring: <><path d="M2 9l10-5 10 5-10 5L2 9z" /><path d="M6 11v5c3 2 9 2 12 0v-5" /></>,
  other: <><circle cx="6" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  bag: <><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
};

export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  return svg(icons[slug] ?? icons.other, className);
}
