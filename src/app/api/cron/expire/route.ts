import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { expiryEmail } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

/** Daily job: expire old listings and remind sellers 3 days before. Vercel Cron sends the Bearer secret. */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  const admin = createAdminClient();

  const { data: expired } = await admin.rpc("expire_listings");

  const soon = new Date(Date.now() + 3 * 86_400_000).toISOString();
  const { data: due } = await admin.from("listings")
    .select("id, title, seller_id, expires_at, profiles(email, full_name)")
    .eq("status", "active").eq("reminder_sent", false).gt("expires_at", new Date().toISOString()).lte("expires_at", soon).limit(200);

  let reminded = 0;
  for (const l of due ?? []) {
    const p = l.profiles as unknown as { email: string; full_name: string } | null;
    const days = Math.max(1, Math.ceil((new Date(l.expires_at).getTime() - Date.now()) / 86_400_000));
    await admin.from("notifications").insert({
      user_id: l.seller_id, kind: "listing_expiring", title: `"${l.title}" expires soon`, body: "Renew it to keep it visible for another 30 days", link: "/dashboard", listing_id: l.id,
    });
    await admin.from("listings").update({ reminder_sent: true }).eq("id", l.id);
    if (p?.email) {
      try { await sendEmail({ to: p.email, ...expiryEmail({ name: p.full_name, title: l.title, days, listingId: l.id }) }); } catch (e) {
        console.error("[cron] reminder email failed:", e instanceof Error ? e.message : e);
      }
    }
    reminded++;
  }
  return NextResponse.json({ expired: expired ?? 0, reminded });
}
