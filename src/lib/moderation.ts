// Rule-based posting guard rails. Pure functions (no server-only imports) so they are easy to test.
// "block" = refuse the post. "flag" = allow but queue for an admin to review.
// A smarter (AI) check can be added later behind moderate() without changing callers.

export type Severity = "block" | "flag";
export type Verdict = { action: "allow" | "flag" | "block"; category?: string; label?: string; matched: string[] };

type Rule = { category: string; label: string; severity: Severity; terms: string[] };

const RULES: Rule[] = [
  { category: "alcohol", label: "alcohol", severity: "block", terms: ["alcohol", "alcoholic", "vodka", "whisky", "whiskey", "brandy", "beer", "gin", "rum", "tequila", "liquor", "changaa", "chang'aa", "busaa", "kumi kumi", "kenya cane", "smirnoff", "hennessy", "jack daniel", "johnnie walker", "guinness", "tusker", "pilsner", "kibao"] },
  { category: "drugs", label: "drugs", severity: "block", terms: ["weed", "bhang", "marijuana", "cannabis", "hashish", "cocaine", "heroin", "meth", "mdma", "ecstasy", "lsd", "abortion pill", "abortion pills", "cytotec", "misoprostol", "kuber"] },
  { category: "weapons", label: "weapons", severity: "block", terms: ["firearm", "pistol", "revolver", "rifle", "ak47", "ak 47", "ammunition", "ammo", "bullet", "grenade", "switchblade", "brass knuckles", "gun for sale", "buy a gun", "sell a gun"] },
  { category: "stolen", label: "stolen goods", severity: "block", terms: ["stolen", "no questions asked", "fell off a truck", "hot phone", "snatched phone"] },
  { category: "counterfeit", label: "counterfeit items", severity: "block", terms: ["counterfeit", "first copy", "master copy", "super copy", "knockoff", "knock off", "fake id", "fake certificate", "fake degree", "fake receipt", "fake results", "forged", "forgery"] },
  { category: "cheating", label: "exam papers or cheating services", severity: "block", terms: ["leaked exam", "exam leak", "leaked paper", "leaked papers", "kcse leak", "do your exam", "sit your exam", "write your exam", "take your exam", "sit exams for", "write my assignment", "do my assignment", "do your assignment", "write your assignment", "assignment writing", "essay writing service", "write your essay", "write your thesis", "write your dissertation", "buy thesis", "ghostwriting", "change your grades", "grade change", "hack results", "hack school portal"] },
  { category: "adult", label: "adult content", severity: "block", terms: ["porn", "porno", "pornography", "nudes", "nude pics", "nude photos", "nude pictures", "nude videos", "sex tape", "escort services", "sex for", "sugar daddy", "sugar mummy", "sugar mommy", "onlyfans", "hookup", "hook up", "adult content", "erotic", "sex toy", "sex toys", "dildo"] },
  { category: "illegal", label: "illegal services or scams", severity: "block", terms: ["hacking service", "hacking services", "hack account", "hack whatsapp", "hack facebook", "hack instagram", "phone cloning", "sim swap", "mpesa reversal", "m-pesa reversal", "fuliza hack", "ponzi", "pyramid scheme", "double your money", "guaranteed returns", "get rich quick", "western union"] },
  // Suspicious but common enough to need a human look:
  { category: "advance_fee", label: "payment before delivery", severity: "flag", terms: ["send money first", "pay deposit first", "pay before delivery", "pay upfront", "advance payment", "registration fee", "send deposit"] },
  { category: "replica", label: "possible fake or replica goods", severity: "flag", terms: ["replica", "fake", "clone", "aaa quality", "mirror quality", "copy"] },
  { category: "age_restricted", label: "age-restricted items", severity: "flag", terms: ["vape", "vapes", "shisha", "hookah", "cigarette", "cigarettes", "steroid", "steroids", "viagra", "taser", "pepper spray", "gun", "nude", "escort"] },
  { category: "academic", label: "academic work for hire", severity: "flag", terms: ["assignment help", "homework help", "thesis writing", "dissertation", "plagiarism", "research paper writing"] },
];

/** Innocent phrases that contain a flagged word. They are removed before matching. */
const SAFE_PHRASES = ["hot glue gun", "glue gun", "staple gun", "heat gun", "spray gun", "water gun", "nail gun", "paint gun", "grease gun", "root beer", "ginger beer", "ginger ale", "beer mug", "weed killer", "weedkiller", "weed whacker", "ford escort", "nude color", "nude colour", "nude lipstick", "nude heels", "nude shoes", "nude shade", "copy book", "copybook", "copy books", "photo copy", "photocopy", "photocopier", "copy paper", "fake plant", "fake plants", "fake nails", "fake lashes", "fake eyelashes", "fake flowers", "fake hair", "fake fur", "fake leather", "fake tan", "dissertation guide", "dissertation template", "buy bullet journal", "bullet journal", "bullet journals", "bullet point", "bullet points", "clone stamp", "clone wars", "gin rummy", "rum raisin"];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i", "|": "i" };

const strip = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’`´]/g, "'");
const tidy = (s: string) => s.replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const squeezeRepeats = (s: string) => s.replace(/([a-z])\1{2,}/g, "$1$1");

function variants(raw: string): string[] {
  const plain = strip(raw);
  const leet = plain.replace(/[0134578@$!|]/g, (c) => LEET[c] ?? c);
  const out = new Set<string>();
  for (const base of [plain, leet]) {
    let t = base;
    for (const p of SAFE_PHRASES) t = t.split(p).join(" ");
    out.add(" " + tidy(t) + " ");
    out.add(" " + tidy(squeezeRepeats(t)) + " ");
  }
  // Letters spaced out to dodge filters: "w e e d", "c.o.c.a.i.n.e"
  const spaced = [...plain.matchAll(/(?:^|[^a-z])((?:[a-z][\s.\-_*]+){3,}[a-z])(?=$|[^a-z])/g)].map((m) => m[1].replace(/[^a-z]/g, ""));
  for (const s of spaced) out.add(" " + s + " ");
  return [...out];
}

const termRe = new Map<string, RegExp>();
function reFor(term: string) {
  let r = termRe.get(term);
  if (!r) {
    const body = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
    r = new RegExp(`(?<![a-z0-9])${body}(?:s|es)?(?![a-z0-9])`);
    termRe.set(term, r);
  }
  return r;
}

export function moderate(texts: (string | null | undefined)[]): Verdict {
  const forms = texts.filter((t): t is string => Boolean(t && t.trim())).flatMap(variants);
  let best: Verdict = { action: "allow", matched: [] };
  for (const rule of RULES) {
    const hits = rule.terms.filter((t) => {
      const re = reFor(t);
      return forms.some((f) => re.test(f));
    });
    if (!hits.length) continue;
    const action = rule.severity;
    if (best.action === "allow" || (action === "block" && best.action === "flag")) {
      best = { action, category: rule.category, label: rule.label, matched: hits };
    }
    if (best.action === "block") break;
  }
  // Links: more than one external link in free text is a common spam / off-platform scam pattern.
  if (best.action === "allow") {
    const links = texts.join(" ").match(/(https?:\/\/|www\.|t\.me\/|wa\.me\/|bit\.ly\/)/gi) ?? [];
    if (links.length > 1) best = { action: "flag", category: "links", label: "several external links", matched: links.slice(0, 3) };
  }
  return best;
}

export function blockMessage(v: Verdict, app: string) {
  return `This looks like it may include ${v.label}, which isn't allowed on ${app}. Please edit your post and try again. See the Terms for what can't be posted.`;
}

/** Normalised key used to spot repeated posts. */
export const dedupeKey = (title: string) => tidy(strip(title));
