import { describe, expect, it } from "vitest";
import { validateEmail } from "@/lib/auth-validation";
import {
  checkMailDomain,
  emailDomain,
  isValidDomain,
  suggestDomain,
  toAsciiDomain,
  withDomain,
  type MailDnsResolver,
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

function dnsError(code: string) {
  return Object.assign(new Error(code), { code });
}

function resolver(answers: {
  mx?: { exchange: string; priority: number }[] | string;
  a?: string[] | string;
  aaaa?: string[] | string;
  /** false: the resolver can't find gmail.com either (broken DNS). */
  canary?: false;
}): MailDnsResolver {
  const answer = <T>(value: T | string | undefined) =>
    typeof value === "string"
      ? Promise.reject(dnsError(value))
      : value === undefined
        ? Promise.reject(dnsError("ENODATA"))
        : Promise.resolve(value as T);
  return {
    resolveMx: (domain: string) =>
      domain === "gmail.com" && answers.canary !== false
        ? Promise.resolve([{ exchange: "gmail-smtp-in.l.google.com", priority: 5 }])
        : answer(answers.mx),
    resolve4: () => answer(answers.a),
    resolve6: () => answer(answers.aaaa),
  };
}

describe("checkMailDomain", () => {
  it("is true when the domain has a mail server (MX)", async () => {
    expect(
      await checkMailDomain(
        "school.ac.kr",
        resolver({ mx: [{ exchange: "mx.school.ac.kr", priority: 10 }] }),
      ),
    ).toBe(true);
  });

  it("falls back to an A/AAAA record when there is no MX", async () => {
    expect(await checkMailDomain("tiny.dev", resolver({ mx: "ENODATA", a: ["1.2.3.4"] }))).toBe(
      true,
    );
    expect(await checkMailDomain("tiny.dev", resolver({ mx: "ENODATA", aaaa: ["::1"] }))).toBe(
      true,
    );
  });

  it("is false for missing domains, null MX, or no records at all", async () => {
    expect(await checkMailDomain("asdfqwer.com", resolver({ mx: "ENOTFOUND" }))).toBe(false);
    expect(
      await checkMailDomain("nomail.com", resolver({ mx: [{ exchange: ".", priority: 0 }] })),
    ).toBe(false);
    expect(await checkMailDomain("empty.com", resolver({ mx: "ENODATA" }))).toBe(false);
    expect(await checkMailDomain("bad_domain.com", resolver({}))).toBe(false);
  });

  it("is null (unknown, do not block) when DNS itself fails", async () => {
    expect(await checkMailDomain("slow.com", resolver({ mx: "ETIMEOUT" }))).toBeNull();
    expect(await checkMailDomain("broken.com", resolver({ mx: "ESERVFAIL" }))).toBeNull();
    expect(
      await checkMailDomain("half.com", resolver({ mx: "ENODATA", a: "ECONNREFUSED" })),
    ).toBeNull();
  });

  it("does not trust 'not found' from a resolver that can't find gmail.com either", async () => {
    expect(
      await checkMailDomain("ajou-real-domain.ac.kr", resolver({ mx: "ENOTFOUND", canary: false })),
    ).toBeNull();
    expect(
      await checkMailDomain("empty.com", resolver({ mx: "ENODATA", canary: false })),
    ).toBeNull();
  });

  it("skips the lookup for common providers", async () => {
    const never: MailDnsResolver = {
      resolveMx: () => Promise.reject(new Error("should not be called")),
      resolve4: () => Promise.reject(new Error("should not be called")),
      resolve6: () => Promise.reject(new Error("should not be called")),
    };
    expect(await checkMailDomain("naver.com", never)).toBe(true);
  });
});
