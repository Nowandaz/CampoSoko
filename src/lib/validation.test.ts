import test from "node:test";
import assert from "node:assert/strict";
import { cleanText, normaliseKenyanPhone, safeNext } from "./validation";

test("normalises Kenyan phone numbers", () => {
  for (const p of ["0712345678", "0712 345 678", "+254712345678", "254712345678", "712345678", "0112345678", "07-12-345-678"]) {
    assert.match(normaliseKenyanPhone(p) ?? "", /^\+254[17]\d{8}$/, p);
  }
  for (const p of ["", "12345", "0812345678", "+255712345678", "abcdefghij"]) assert.equal(normaliseKenyanPhone(p), null, p);
});

test("safeNext only allows same-site relative paths", () => {
  assert.equal(safeNext("/dashboard"), "/dashboard");
  assert.equal(safeNext("//evil.com"), "/");
  assert.equal(safeNext("https://evil.com"), "/");
  assert.equal(safeNext("/\\evil.com"), "/");
  assert.equal(safeNext(undefined), "/");
});

test("cleanText strips tags and control characters", () => {
  assert.equal(cleanText("  <b>Hi</b>\u0000 there  "), "Hi there");
  assert.equal(cleanText("<script>alert(1)</script>ok"), "alert(1)ok");
});
