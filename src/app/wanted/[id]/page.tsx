import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import { kes, timeAgo } from "@/lib/format";
import { WantedContact } from "@/components/wanted/WantedContact";
import { SafetyTips } from "@/components/listing/SafetyTips";
import { isBlocked } from "@/app/listing/actions";
import { findMatchingListings } from "@/lib/feed";
import { ListingCard } from "@/components/feed/ListingCard";
import { Notice } from "@/components/ui/form";
import { ReportButton, BlockButton } from "@/components/safety/SafetyActions";

const load = cache(async (id: string) => {
  if (!z.string().uuid().safeParse(id).success) return null;
  const sb = await createClient();
  const { data: w } = await sb.from("wanted_ads").select("*, categories(name), campuses(name)").eq("id", id).maybeSingle();
  if (!w) return null;
  const { data: u } = await sb.from("public_profiles").select("public_name").eq("id", w.user_id).maybeSingle();
  return { w, name: u?.public_name ?? "A student" };
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const r = await load((await params).id);
  return r ? { title: `Wanted: ${r.w.title}`, description: r.w.description.slice(0, 150) } : { title: "Ad not found" };
}

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ posted?: string }> }) {
  const r = await load((await params).id);
  const justPosted = Boolean((await searchParams).posted);
  if (!r) notFound();
  const { w, name } = r;
  const me = await getMe();
  const own = me?.id === w.user_id;
  const blocked = me && !own ? await isBlocked(me.id, w.user_id) : false;
  const open = w.status === "active";
  const matches = own && open ? await findMatchingListings(await createClient(), w) : [];

  let contact: React.ReactNode = null;
  if (own) contact = <Link href="/dashboard" className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-border font-semibold hover:bg-muted">Manage in dashboard</Link>;
  else if (!open) contact = <p className="rounded-lg bg-muted px-4 py-3 text-center text-sm font-medium text-muted-foreground">This ad is closed</p>;
  else if (!me) contact = <Link href={`/login?next=${encodeURIComponent(`/wanted/${w.id}`)}`} className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground hover:bg-primary-hover">Log in to contact this buyer</Link>;
  else if (me.suspended) contact = <p className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">Your account is suspended.</p>;
  else if (!blocked) contact = <WantedContact wantedId={w.id} />;

  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-primary">Wanted · {w.type === "goods" ? "Item" : "Online service"} · {w.categories?.name}</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight">{w.title}</h1>
        <p className="mt-2 text-lg font-semibold">{w.budget != null ? `Budget ${kes(w.budget)}` : "No budget set"}</p>
        <p className="mt-1 text-sm text-muted-foreground">Posted by {name} · {w.campuses?.name} · {timeAgo(w.created_at)}</p>
      </div>
      <p className="whitespace-pre-line text-[15px] leading-relaxed">{w.description}</p>
      {w.keywords?.length > 0 && (
        <p className="flex flex-wrap gap-2">{w.keywords.map((k: string) => <span key={k} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{k}</span>)}</p>
      )}
      {contact}
      {justPosted && own && <Notice notice={w.notify ? "Your wanted ad is live. We will alert you when a new matching listing appears." : "Your wanted ad is live."} />}
      {own && open && (
        <section aria-labelledby="matches" className="space-y-3">
          <h2 id="matches" className="text-lg font-semibold">{matches.length ? "Listings that match right now" : "No matching listings yet"}</h2>
          {matches.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{matches.map((m) => <ListingCard key={m.id} item={m} />)}</div>
          ) : (
            <p className="text-sm text-muted-foreground">{w.notify ? "Nothing on your campus fits yet. We will email you when something does." : "Nothing on your campus fits yet. Turn alerts on to be told when something does."}</p>
          )}
        </section>
      )}
      <SafetyTips />
      {!own && (
        <div className="flex flex-wrap items-start gap-1">
          <ReportButton kind="wanted" target={w.id} loggedIn={Boolean(me)} loginHref={`/login?next=${encodeURIComponent(`/wanted/${w.id}`)}`} />
          {me && <BlockButton target={w.user_id} back="/" />}
        </div>
      )}
    </article>
  );
}
