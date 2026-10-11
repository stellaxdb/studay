import { describe, expect, it } from "vitest";
import { validateEmail } from "@/lib/auth-validation";
import {
  emailDomain,
  isValidDomain,
  suggestDomain,
  toAsciiDomain,
  withDomain,
} from "@/lib/email-domain";

describe("domain format", () => {
  it("accepts ordinary and international domains", () => {
    for (const ok of ["gmail.com", "ajou.ac.kr", "my-school.edu", "a.io", "mail.example.co.uk"]) {
      expect(isValidDomain(ok), ok).toBe(true);
    }
    expect(toAsciiDomain("한글.com")).toBe("xn--bj0bj06e.com");
    expect(isValidDomain(toAsciiDomain("한글.한국"))).toBe(true);
    expect(emailDomain("  Danbi@Ajou.AC.kr ")).toBe("ajou.ac.kr");
  });

  it("rejects domains that break the rules", () => {
    for (const bad of [
      "",
      "localhost",
      "-abc.com",
      "abc-.com",
      "ab_c.com",
      "abc.c",
      "abc.123",
      "192.168.0.1",
      `${"a".repeat(64)}.com`,
      `${"a.".repeat(127)}com`,
    ]) {
      expect(isValidDomain(bad), bad).toBe(false);
    }
  });

  it("reports domain problems through the email validator", () => {
    expect(validateEmail("name@-abc.com")).toMatch(/도메인/);
    expect(validateEmail("name@abc.c")).toMatch(/도메인/);
    expect(validateEmail("name@ab_c.com")).toMatch(/도메인/);
    expect(validateEmail("name@gmail.com")).toBeNull();
  });
});

describe("suggestDomain", () => {
  it("suggests the common provider for typical typos", () => {
    expect(suggestDomain("gmial.com")).toBe("gmail.com");
    expect(suggestDomain("gmai.com")).toBe("gmail.com");
    expect(suggestDomain("gmail.co")).toBe("gmail.com");
    expect(suggestDomain("naver.con")).toBe("naver.com");
    expect(suggestDomain("navr.com")).toBe("naver.com");
    expect(suggestDomain("hanmial.net")).toBe("hanmail.net");
    expect(suggestDomain("daum.nte")).toBe("daum.net");
    expect(suggestDomain("ajou.ac.rk")).toBe("ajou.ac.kr");
  });

  it("leaves correct and unrelated domains alone", () => {
    expect(suggestDomain("gmail.com")).toBeNull();
    expect(suggestDomain("naver.com")).toBeNull();
    expect(suggestDomain("snu.ac.kr")).toBeNull();
    expect(suggestDomain("company.co.kr")).toBeNull();
    expect(suggestDomain("ne.com")).toBeNull(); // short: too risky to "fix"
    expect(suggestDomain("")).toBeNull();
  });

  it("keeps the part before @ when applying a suggestion", () => {
    expect(withDomain(" Danbi.Oh@gmial.com", "gmail.com")).toBe("Danbi.Oh@gmail.com");
  });
});
