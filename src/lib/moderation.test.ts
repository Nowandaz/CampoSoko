import test from "node:test";
import assert from "node:assert/strict";
import { dedupeKey, moderate } from "./moderation";

const act = (...t: string[]) => moderate(t).action;
const cat = (...t: string[]) => moderate(t).category;

test("allows ordinary campus listings", () => {
  for (const t of ["HP laptop 8GB RAM", "Engineering Mathematics textbook", "CV and cover letter writing", "Maths tutoring for KCSE", "Hot glue gun for crafts",
    "Ginger beer recipe book", "Black sneakers size 42", "Nude lipstick, brand new", "Ford Escort 1.6 spare parts", "Bullet journal planner", "Photocopy services at the library", "Seaweed face mask", "Method acting book", "Rumba music CD", "Scrapbook with fake flowers"]) {
    assert.equal(act(t), "allow", t);
  }
});

test("blocks clearly prohibited categories", () => {
  assert.equal(cat("Selling cold Tusker beer"), "alcohol");
  assert.equal(cat("Weed available, DM"), "drugs");
  assert.equal(cat("I sell a pistol with ammo"), "weapons");
  assert.equal(cat("Stolen phones, no questions asked"), "stolen");
  assert.equal(cat("First copy Nike shoes"), "counterfeit");
  assert.equal(cat("We do your exam for you. Sit exams for students"), "cheating");
  assert.equal(cat("Leaked exam papers for sale"), "cheating");
  assert.equal(cat("Sugar daddy needed, nude pics available"), "adult");
  assert.equal(cat("Double your money in 3 days"), "illegal");
  assert.equal(act("vodka"), "block");
});

test("catches simple evasion tricks", () => {
  assert.equal(act("w e e d for sale"), "block");
  assert.equal(act("c.o.c.a.i.n.e"), "block");
  assert.equal(act("v0dka cheap"), "block");
  assert.equal(act("weeeed"), "block");
  assert.equal(act("B33R crate"), "block");
  assert.equal(act("TUSKER   beer"), "block");
});

test("flags suspicious but common wording", () => {
  assert.equal(act("Replica jersey, all sizes"), "flag");
  assert.equal(act("Pay upfront and I deliver"), "flag");
  assert.equal(act("Assignment help for hire"), "flag");
  assert.equal(act("Vape kit"), "flag");
  assert.equal(act("check https://a.com and https://b.com"), "flag");
});

test("does not match inside other words", () => {
  for (const t of ["Beginning guitar lessons", "Engine oil", "Pin cushion", "Thermometer", "Rumours of rain", "Tweed jacket", "Game of thrones book", "Biology lab coat", "Meth is a short name for method"]) {
    // "meth" as a standalone word is blocked on purpose; the others must pass
    if (t.startsWith("Meth is")) continue;
    assert.equal(act(t), "allow", t);
  }
});

test("dedupe key ignores case, punctuation and accents", () => {
  assert.equal(dedupeKey("  HP Laptop, 8GB!! "), dedupeKey("hp laptop 8gb"));
});
