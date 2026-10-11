import { describe, expect, it } from "vitest";
import { normalizeEmail, validateEmail, validateLogin } from "@/lib/auth-validation";

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
