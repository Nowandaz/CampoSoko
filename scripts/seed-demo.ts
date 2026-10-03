// Seeds demo sellers + sample listings. Usage: npm run seed:demo  (needs migrations + supabase/seed.sql applied)
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local" });

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const sellers = [
  { email: "demo.amina@example.com", name: "Amina Wanjiku", wa: "+254712000001", shop: "Amina's Tech Corner", loc: "Hall 4, Block B" },
  { email: "demo.brian@example.com", name: "Brian Otieno", wa: "+254712000002", shop: "Brian Designs", loc: "Main Library, Level 2" },
];

async function main() {
  const { data: campus } = await sb.from("campuses").select("id").order("name").limit(1).single();
  const { data: cats } = await sb.from("categories").select("id, slug");
  const cat = (s: string) => cats!.find((c) => c.slug === s)!.id;
  const ids: string[] = [];
  for (const s of sellers) {
    const { data, error } = await sb.auth.admin.createUser({
      email: s.email, email_confirm: true,
      user_metadata: { full_name: s.name, whatsapp: s.wa, campus_id: campus!.id },
    });
    let id = data?.user?.id;
    if (error) {
      const { data: p } = await sb.from("profiles").select("id").eq("email", s.email).single();
      id = p?.id;
    }
    if (!id) throw error;
    ids.push(id);
    await sb.from("seller_profiles").upsert({
      user_id: id, shop_name: s.shop, location: s.loc,
      description: `Trusted campus seller. Find me at ${s.loc}. Fast replies on WhatsApp.`,
    });
  }
  const base = { campus_id: campus!.id, prohibited_ack: true };
  const { error } = await sb.from("listings").insert([
    { ...base, seller_id: ids[0], type: "goods", title: "HP Laptop 15, 8GB RAM", description: "Clean HP laptop, 256GB SSD, battery lasts 5 hours. Great for coding and assignments.", category_id: cat("electronics"), condition: "used", quantity: 1, price: 32000, location: "Hall 4, Block B" },
    { ...base, seller_id: ids[0], type: "goods", title: "Engineering Mathematics textbook", description: "Stroud, 6th edition. Few highlights, no torn pages.", category_id: cat("books"), condition: "used", quantity: 2, price: 1200, location: "Hall 4, Block B" },
    { ...base, seller_id: ids[1], type: "service", title: "Poster & flyer design", description: "Event posters, flyers and social media graphics. Unlimited revisions within 2 days.", category_id: cat("services-design"), price: 500, delivery_time: "1 day", location: "Online", portfolio_url: "https://example.com/portfolio" },
    { ...base, seller_id: ids[1], type: "service", title: "Video editing for clubs & events", description: "Reels, highlights and promos edited with captions and music.", category_id: cat("services-video"), price: 1500, delivery_time: "3 days", location: "Online" },
  ]);
  if (error) throw error;
  console.log("Demo data seeded.");
}
main().catch((e) => { console.error(e); process.exit(1); });
