import { ThumbUp } from "@/components/ui/icons";

export function Rating({ up, down, className = "" }: { up: number; down: number; className?: string }) {
  const total = up + down;
  if (!total) return <span className={`text-xs text-muted-foreground ${className}`}>No reviews yet</span>;
  const pct = Math.round((up / total) * 100);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${className}`}>
      <ThumbUp className="h-4 w-4 text-success" />
      <span className="font-semibold text-foreground">{pct}%</span>
      <span className="text-muted-foreground">({total} review{total === 1 ? "" : "s"})</span>
    </span>
  );
}
