import { describe, expect, it } from "vitest";
import { authCallbackUrl, loginHref, safeNext } from "@/lib/auth-redirect";

describe("safeNext", () => {
  it("keeps same-site paths", () => {
    expect(safeNext("/todos?filter=open")).toBe("/todos?filter=open");
  });
  it("rejects external or protocol-relative targets", () => {
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});

describe("authCallbackUrl", () => {
  it("points to /auth/callback on the current origin with a safe next path", () => {
    expect(authCallbackUrl("https://studay.vercel.app", "/focus")).toBe(
      "https://studay.vercel.app/auth/callback?next=%2Ffocus",
    );
    expect(authCallbackUrl("http://localhost:3000", "https://evil.example")).toBe(
      "http://localhost:3000/auth/callback?next=%2F",
    );
  });
});

describe("loginHref", () => {
  it("links to the start page and comes back to the page the visitor wanted", () => {
    expect(loginHref("/todos")).toBe("/login?next=%2Ftodos");
    expect(loginHref("/")).toBe("/login");
    expect(loginHref(null)).toBe("/login");
    expect(loginHref("https://evil.example")).toBe("/login");
  });
});
