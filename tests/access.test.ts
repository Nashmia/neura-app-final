import { test } from "node:test";
import assert from "node:assert/strict";
import { accessRedirect, safeNextPath } from "../lib/access";

const out = { signedIn: false, hasPatient: false };
const newUser = { signedIn: true, hasPatient: false };
const onboarded = { signedIn: true, hasPatient: true };

test("signed-out visitors are sent to login and brought back afterwards", () => {
  assert.equal(accessRedirect("app", out, "/medications"), "/login?next=%2Fmedications");
  assert.equal(accessRedirect("onboarding", out, "/onboarding"), "/login?next=%2Fonboarding");
  assert.equal(accessRedirect("auth", out, "/login"), null);
});

test("a signed-in caregiver without a patient must finish onboarding first", () => {
  assert.equal(accessRedirect("app", newUser, "/dashboard"), "/onboarding");
  assert.equal(accessRedirect("onboarding", newUser, "/onboarding"), null);
  assert.equal(accessRedirect("auth", newUser, "/login"), "/onboarding");
});

test("completed onboarding is never shown again", () => {
  assert.equal(accessRedirect("onboarding", onboarded, "/onboarding"), "/dashboard");
  assert.equal(accessRedirect("app", onboarded, "/dashboard"), null);
  assert.equal(accessRedirect("app", onboarded, "/settings"), null);
  assert.equal(accessRedirect("auth", onboarded, "/signup"), "/dashboard");
});

test("only same-site paths are accepted as a post-login destination", () => {
  assert.equal(safeNextPath("/join?code=abc"), "/join?code=abc");
  assert.equal(safeNextPath("/medications"), "/medications");
  assert.equal(safeNextPath("https://evil.example"), null);
  assert.equal(safeNextPath("//evil.example"), null);
  assert.equal(safeNextPath("/\\evil.example"), null);
  assert.equal(safeNextPath("/login?next=/x"), null);
  assert.equal(safeNextPath(null), null);
  assert.equal(safeNextPath(""), null);
});
