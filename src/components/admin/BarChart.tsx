/** Single-series daily bar chart (pure SVG, theme-aware). A data table is available via <details>. */
export function BarChart({ title, data, unit }: { title: string; data: { d: string; n: number }[]; unit: string }) {
  const W = 640, H = 180, L = 32, B = 22, T = 8, R = 4;
  const max = Math.max(1, ...data.map((x) => x.n));
  const nice = max <= 4 ? max : Math.ceil(max / 4) * 4;
  const bw = (W - L - R) / data.length;
  const y = (n: number) => T + (H - T - B) * (1 - n / nice);
  const ticks = [0, nice / 2, nice].map((t) => Math.round(t * 10) / 10);
  const total = data.reduce((s, x) => s + x.n, 0);
  const label = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-KE", { day: "numeric", month: "short" });
  return (
    <figure className="rounded-2xl border border-border bg-card p-4">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{total} in the last 30 days</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}, last 30 days, ${total} total`} className="w-full">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth="1" />
            <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">{t}</text>
          </g>
        ))}
        {data.map((x, i) => {
          const h = Math.max(0, (H - T - B) * (x.n / nice));
          return (
            <g key={x.d}>
              <rect x={L + i * bw + 1} y={y(x.n)} width={Math.max(1, bw - 2)} height={h} rx={Math.min(3, bw / 3)} fill="var(--primary)" opacity={x.n ? 1 : 0.18}>
                <title>{`${label(x.d)}: ${x.n} ${unit}`}</title>
              </rect>
              {(i === 0 || i === data.length - 1 || i % 7 === 0) && (
                <text x={L + i * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">{label(x.d)}</text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer py-1">View as table</summary>
        <table className="mt-2 w-full max-w-xs"><tbody>
          {data.map((x) => <tr key={x.d}><td className="py-0.5">{label(x.d)}</td><td className="py-0.5 text-right tabular-nums">{x.n}</td></tr>)}
        </tbody></table>
      </details>
    </figure>
  );
}
