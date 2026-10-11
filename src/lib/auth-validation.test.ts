import { describe, expect, it } from "vitest";
import {
  normalizeEmail,
  passwordChecks,
  validateEmail,
  validateLogin,
  validateName,
  validateNewPassword,
  validatePasswordConfirm,
  validateSignup,
} from "@/lib/auth-validation";

describe("validateEmail", () => {
  it("accepts normal addresses, ignoring surrounding spaces and case", () => {
    expect(validateEmail("name@example.com")).toBeNull();
    expect(validateEmail("  Danbi.Oh+study@ajou.ac.kr ")).toBeNull();
    expect(normalizeEmail("  Danbi@Ajou.AC.kr ")).toBe("danbi@ajou.ac.kr");
  });

  it("rejects empty and malformed addresses", () => {
    expect(validateEmail("")).toBe("이메일을 입력해 주세요.");
    expect(validateEmail("   ")).toBe("이메일을 입력해 주세요.");
    for (const bad of [
      "bad",
      "name@",
      "@example.com",
      "name@example",
      "name@@example.com",
      "na me@example.com",
      "name@example..com",
      "name@.example.com",
      "name@example.com.",
      `${"a".repeat(250)}@x.com`,
    ]) {
      expect(validateEmail(bad), bad).toMatch(/올바른 이메일/);
    }
  });
});

describe("validateNewPassword", () => {
  it("requires 8+ characters with letters and digits", () => {
    expect(validateNewPassword("study123")).toBeNull();
    expect(validateNewPassword("공부Study2026")).toBeNull();
    expect(validateNewPassword("")).toBe("비밀번호를 입력해 주세요.");
    expect(validateNewPassword("abc123")).toMatch(/8자 이상/); // too short
    expect(validateNewPassword("aaaaaaaa")).toMatch(/숫자/); // no digit
    expect(validateNewPassword("12345678")).toMatch(/영문/); // no letter
  });

  it("rejects leading/trailing spaces and passwords over 72 bytes", () => {
    expect(validateNewPassword(" study123")).toMatch(/공백/);
    expect(validateNewPassword("study123 ")).toMatch(/공백/);
    expect(validateNewPassword("a1".repeat(36))).toBeNull(); // 72 bytes
    expect(validateNewPassword("a1".repeat(36) + "x")).toMatch(/너무 길어요/);
    expect(validateNewPassword("가1".repeat(20))).toMatch(/너무 길어요/); // 80 bytes in UTF-8
  });

  it("reports each requirement for the live checklist", () => {
    expect(passwordChecks("abc").map((c) => c.met)).toEqual([false, true, false]);
    expect(passwordChecks("abcdefg1").every((c) => c.met)).toBe(true);
  });
});

describe("other sign-up fields", () => {
  it("checks the confirmation and the optional name", () => {
    expect(validatePasswordConfirm("study123", "study123")).toBeNull();
    expect(validatePasswordConfirm("study123", "")).toMatch(/한 번 더/);
    expect(validatePasswordConfirm("study123", "study124")).toBe("비밀번호가 서로 달라요.");
    expect(validateName("")).toBeNull();
    expect(validateName("가".repeat(30))).toBeNull();
    expect(validateName("가".repeat(31))).toMatch(/30자/);
  });

  it("collects every error at once", () => {
    expect(validateSignup({ name: "", email: "x", password: "short", confirm: "" })).toEqual({
      email: expect.stringMatching(/올바른 이메일/),
      password: expect.stringMatching(/8자 이상/),
      confirm: expect.stringMatching(/한 번 더/),
    });
    expect(
      validateSignup({ name: "단비", email: "a@b.co", password: "study123", confirm: "study123" }),
    ).toEqual({});
  });
});

describe("validateLogin", () => {
  it("checks email shape and a non-empty password only", () => {
    expect(validateLogin({ email: "a@b.co", password: "x" })).toEqual({});
    expect(validateLogin({ email: "", password: "" })).toEqual({
      email: "이메일을 입력해 주세요.",
      password: "비밀번호를 입력해 주세요.",
    });
    expect(validateLogin({ email: "a@b", password: "x" }).email).toMatch(/올바른 이메일/);
  });
});
