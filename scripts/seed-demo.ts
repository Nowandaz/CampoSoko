// Demo data for every campus: sellers, ~40 listings with photos, and wanted ads.
//   npm run seed:demo    adds demo data (re-running replaces the previous demo data)
//   npm run seed:clear   removes it
// Needs the migrations + supabase/seed.sql applied, and SUPABASE_SERVICE_ROLE_KEY in .env.local.
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });

const DEMO = (e?: string | null) => !!e && e.startsWith("demo.") && e.endsWith("@example.com");
const img = (seed: string, n = 0) => `https://picsum.photos/seed/${encodeURIComponent(seed + n)}/640/480`;

type G = [title: string, slug: string, price: number, condition: "new" | "used", qty: number];
type S = [title: string, slug: string, price: number, delivery: string];
const goods: G[] = [
  ["HP Laptop 15, 8GB RAM, 256GB SSD", "electronics", 32000, "used", 1], ["Samsung Galaxy A14", "electronics", 14500, "used", 1],
  ["JBL Bluetooth speaker", "electronics", 2500, "used", 1], ["Fast charger 25W + cable", "electronics", 900, "new", 5],
  ["Casio fx-991EX calculator", "electronics", 1800, "new", 3], ["Wireless mouse", "electronics", 700, "new", 6],
  ["Engineering Mathematics (Stroud)", "books", 1200, "used", 2], ["Anatomy atlas, 5th edition", "books", 2800, "used", 1],
  ["Revision notes bundle, year 1", "books", 300, "used", 10], ["Financial Accounting textbook", "books", 1500, "used", 1],
  ["Denim jacket, size M", "clothes", 1500, "used", 1], ["Black sneakers, size 42", "clothes", 2200, "used", 1],
  ["Campus hoodie, size L", "clothes", 1200, "new", 4], ["Formal blazer, size 40", "clothes", 2500, "used", 1],
  ["Study desk with drawer", "furniture", 4500, "used", 1], ["Mattress 3x6, almost new", "furniture", 6000, "used", 1],
  ["Plastic wardrobe", "furniture", 1800, "used", 1], ["Reading lamp", "furniture", 650, "new", 4],
  ["Homemade samosas (10 pcs)", "food", 300, "new", 20], ["Cakes and cupcakes, made to order", "food", 800, "new", 10],
  ["Mandazi and chai combo", "food", 150, "new", 30], ["Bike, good for campus", "other", 7500, "used", 1],
  ["Electric kettle 1.8L", "other", 1100, "used", 2], ["Backpack, waterproof", "other", 1300, "new", 5],
];
const services: S[] = [
  ["Poster and flyer design", "services-design", 500, "1 day"], ["Logo design for clubs and startups", "services-design", 1500, "3 days"],
  ["Social media graphics pack", "services-design", 1200, "2 days"], ["Video editing for events", "services-video", 2000, "3 days"],
  ["Reels and TikTok editing", "services-video", 700, "1 day"], ["CV and cover letter writing", "services-writing", 400, "1 day"],
  ["Proofreading and editing", "services-writing", 600, "2 days"], ["Typing and formatting documents", "services-writing", 300, "1 day"],
  ["Maths tutoring, KCSE and university", "tutoring", 500, "Per session"], ["Programming tutoring (Python, Java)", "tutoring", 800, "Per session"],
  ["Chemistry and biology revision", "tutoring", 450, "Per session"], ["Presentation slides design", "services-design", 900, "2 days"],
];
const wanted: [string, string, "goods" | "service", number, string[]][] = [
  ["Scientific calculator", "electronics", "goods", 1500, ["calculator", "casio"]], ["Second-hand mini fridge", "electronics", "goods", 7000, ["fridge"]],
  ["Chemistry textbook, year 2", "books", "goods", 1500, ["chemistry"]], ["Logo for my startup", "services-design", "service", 2000, ["logo"]],
  ["Someone to edit my YouTube videos", "services-video", "service", 3000, ["editing"]], ["Study desk or table", "furniture", "goods", 3500, ["desk", "table"]],
  ["Physics tutor for exams", "tutoring", "service", 600, ["physics"]], ["Laptop bag", "other", "goods", 1200, ["bag"]],
];

const sellers = [
  { first: "Amina", last: "Wanjiku", shop: "Amina's Corner", loc: "Hall 4, Block B" },
  { first: "Brian", last: "Otieno", shop: "Brian Designs", loc: "Main Library, Level 2" },
  { first: "Cynthia", last: "Mwangi", shop: "Cynthia's Closet", loc: "Hostel A, Room 12" },
  { first: "David", last: "Kiprop", shop: "Campus Tech Hub", loc: "Engineering Block" },
  { first: "Esther", last: "Achieng", shop: "Esther's Kitchen", loc: "Cafeteria side gate" },
  { first: "Felix", last: "Mutua", shop: "Felix Tutoring", loc: "Student Centre" },
];

async function clear() {
  let removed = 0;
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    for (const u of data.users.filter((x) => DEMO(x.email))) { await sb.auth.admin.deleteUser(u.id); removed++; }
    if (data.users.length < 200) break;
  }
  console.log(`Removed ${removed} demo user(s) and their listings.`);
}

async function main() {
  if (process.argv[2] === "clear") return clear();
  await clear();
  const { data: campuses, error: ce } = await sb.from("campuses").select("id, name").eq("active", true).order("name");
  if (ce || !campuses?.length) throw new Error("No campuses found. Run supabase/seed.sql first. " + (ce?.message ?? ""));
  const { data: cats } = await sb.from("categories").select("id, slug");
  if (!cats?.length) throw new Error("No categories found. Run supabase/seed.sql first.");
  const cat = (s: string) => cats.find((c) => c.slug === s)!.id;

  // 2 sellers per campus (sellers list repeats if there are fewer/more campuses)
  const made: { id: string; campus: string; shop: string; loc: string }[] = [];
  for (let i = 0; i < Math.max(sellers.length, campuses.length * 2); i++) {
    const s = sellers[i % sellers.length];
    const campus = campuses[i % campuses.length];
    const email = `demo.${s.first.toLowerCase()}${i}@example.com`;
    const { data, error } = await sb.auth.admin.createUser({
      email, email_confirm: true,
      user_metadata: { full_name: `${s.first} ${s.last}`, whatsapp: `+2547120000${String(10 + i).padStart(2, "0")}`, campus_id: campus.id, has_password: true },
    });
    if (error || !data.user) throw new Error(`Could not create ${email}: ${error?.message}`);
    const { error: pe } = await sb.from("seller_profiles").insert({
      user_id: data.user.id, shop_name: s.shop, location: s.loc,
      description: `Trusted campus seller at ${campus.name}. Find me at ${s.loc}. Quick replies on WhatsApp.`,
    });
    if (pe) throw new Error("seller profile: " + pe.message);
    made.push({ id: data.user.id, campus: campus.id, shop: s.shop, loc: s.loc });
  }

  const rows: Record<string, unknown>[] = [];
  const photos: string[] = [];
  const now = Date.now();
  const place = (i: number) => made.filter((m) => m.campus === campuses[i % campuses.length].id)[Math.floor(i / campuses.length) % 2] ?? made[i % made.length];
  [...goods.map((g) => ({ kind: "goods" as const, g })), ...services.map((s) => ({ kind: "service" as const, s }))].forEach((item, i) => {
    const m = place(i);
    const created = new Date(now - (i * 7 + 3) * 3_600_000).toISOString(); // spread over the last ~10 days
    const expires = new Date(new Date(created).getTime() + 30 * 86_400_000).toISOString();
    const common = { seller_id: m.id, campus_id: m.campus, prohibited_ack: true, created_at: created, expires_at: expires, featured: i % 13 === 0 };
    if (item.kind === "goods") {
      const [title, slug, price, condition, quantity] = item.g;
      rows.push({ ...common, type: "goods", title, description: `${title}. ${condition === "new" ? "Brand new." : "Gently used, in good working condition."} Meet on campus, inspect before you pay.`, category_id: cat(slug), condition, quantity, price, location: m.loc });
      photos.push(title);
    } else {
      const [title, slug, price, delivery_time] = item.s;
      rows.push({ ...common, type: "service", title, description: `${title}. Clear communication, fast delivery and free minor revisions. Message me on WhatsApp with what you need.`, category_id: cat(slug), price, delivery_time, location: "Online", portfolio_url: "https://example.com/portfolio" });
      photos.push(title);
    }
  });
  const { data: inserted, error: le } = await sb.from("listings").insert(rows).select("id");
  if (le) throw new Error("listings: " + le.message);
  const imgRows = inserted!.flatMap((l, i) => [0, 1].map((n) => ({ listing_id: l.id, url: img(photos[i], n), position: n })));
  const { error: ie } = await sb.from("listing_images").insert(imgRows);
  if (ie) throw new Error("images: " + ie.message);

  const wrows = wanted.map(([title, slug, type, budget, keywords], i) => {
    const m = made[(i + 1) % made.length];
    return { user_id: m.id, campus_id: m.campus, title, description: `Looking for: ${title}. Message me on WhatsApp if you have one.`, category_id: cat(slug), type, budget, keywords, notify: true };
  });
  const { error: we } = await sb.from("wanted_ads").insert(wrows);
  if (we) throw new Error("wanted: " + we.message);

  const per = campuses.map((c) => `${c.name}: ${rows.filter((r) => r.campus_id === c.id).length}`).join(", ");
  console.log(`Seeded ${made.length} sellers, ${rows.length} listings (${per}), ${wrows.length} wanted ads.`);
  console.log("Tip: the feed defaults to YOUR campus. Use Filters > Campus > All campuses to see everything.");
}
main().catch((e) => { console.error("Seed failed:", e.message ?? e); process.exit(1); });
