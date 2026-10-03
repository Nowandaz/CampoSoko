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

/** Fills in the endpoint/model a key obviously belongs to, so an OpenRouter key never gets sent to OpenAI by mistake. */
export function inferDefaults(type: "openai" | "gemini" | "anthropic", key: string, endpoint: string | null, model: string | null) {
  if (type !== "openai" || endpoint) return { endpoint, model };
  if (key.startsWith("sk-or-")) return { endpoint: "https://openrouter.ai/api/v1", model: model || "meta-llama/llama-3.3-70b-instruct:free" };
  if (key.startsWith("gsk_")) return { endpoint: "https://api.groq.com/openai/v1", model: model || "llama-3.3-70b-versatile" };
  return { endpoint, model };
}

/** Turns an error response body into a short, readable reason. */
export function explainHttpError(name: string, host: string, status: number, body: string) {
  let detail = "";
  try {
    const j = JSON.parse(body);
    detail = String(j?.error?.message ?? j?.error ?? j?.message ?? "").slice(0, 160);
  } catch { detail = body.replace(/\s+/g, " ").slice(0, 120); }
  const hint =
    status === 401 || status === 403 ? `The key was rejected by ${host}. Check it was copied fully, is not expired or revoked, and belongs to ${host}.`
    : status === 404 ? `${host} doesn't know that model or address. Check the model name and endpoint.`
    : status === 429 ? `${host} says too many requests (free keys have low limits). Add more keys or try again soon.`
    : status >= 500 ? `${host} had a problem. Try again shortly.` : "";
  return `${name}: HTTP ${status} from ${host}${detail ? ` - ${detail}` : ""}${hint ? `. ${hint}` : ""}`;
}
