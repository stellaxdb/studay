import { describe, expect, it } from "vitest";
import { authCallbackUrl, safeNext } from "@/lib/auth-redirect";

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
  it("marks Google sign-ins so the callback can tell them from email links", () => {
    expect(authCallbackUrl("https://studay.vercel.app", "/", "google")).toBe(
      "https://studay.vercel.app/auth/callback?next=%2F&via=google",
    );
  });
});
