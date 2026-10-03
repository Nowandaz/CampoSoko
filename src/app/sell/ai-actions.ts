"use server";
import { z } from "zod";
import { requireMe } from "@/lib/auth";
import { allow } from "@/lib/rate-limit";
import { ask, AiUnavailable, aiFeatureOn } from "@/lib/ai/client";
import { shopHelper } from "@/lib/ai/tasks";
import { checkText } from "@/lib/guard";

export type ShopAiState = { error?: string; description?: string; tags?: string[] };

const input = z.object({ notes: z.string().trim().min(8, "Write a few words about what you sell or offer").max(600), shop: z.string().trim().max(60).optional() });

export async function suggestShop(_: ShopAiState, fd: FormData): Promise<ShopAiState> {
  const me = await requireMe("/sell/profile");
  const p = input.safeParse({ notes: fd.get("notes"), shop: fd.get("shop") ?? "" });
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Check your notes" };
  if (!(await aiFeatureOn("ai_shop_helper"))) return { error: "The writing helper isn't available right now." };
  if (checkText([p.data.notes]).error) return { error: "Those notes include something that isn't allowed on CampoSoko." };
  if (!(await allow(`ai-shop:${me.id}`, 10, 86400))) return { error: "You've used the helper a lot today. Try again tomorrow." };
  try {
    const out = await shopHelper(ask, p.data.notes, p.data.shop);
    if (checkText([out.description, ...out.tags]).error) return { error: "The suggestion wasn't suitable. Try rewording your notes." };
    return out;
  } catch (e) {
    return { error: e instanceof AiUnavailable ? "The helper is busy right now. Please write it yourself or try again soon." : "Couldn't draft that. Please try again." };
  }
}
