/** Weighted random order, so heavier providers are tried first more often. */
export function weightedOrder<T extends { weight: number }>(items: T[], rnd: () => number = Math.random): T[] {
  const pool = [...items], out: T[] = [];
  while (pool.length) {
    const total = pool.reduce((s, p) => s + p.weight, 0);
    let r = rnd() * total, i = 0;
    for (; i < pool.length - 1; i++) { r -= pool[i].weight; if (r <= 0) break; }
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}
