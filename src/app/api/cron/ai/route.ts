import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/cron";
import { runAndRecord } from "@/lib/ai/pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Hourly: AI moderation + matching for new posts. Call with "Authorization: Bearer <CRON_SECRET>". */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await runAndRecord());
}
