// Email login input rules. New accounts are created with Google only, so
// there are no sign-up password rules here.

import { emailDomain, isValidDomain } from "@/lib/email-domain";

const EMAIL_MAX = 254;

// Practical check, not full RFC 5322: one @, no spaces, a dot in the domain,
// no leading/trailing/double dots. The domain is then checked label by label.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  if (!email) return "이메일을 입력해 주세요.";
  if (email.length > EMAIL_MAX || !EMAIL_RE.test(email) || email.includes(".."))
    return "올바른 이메일 주소를 입력해 주세요. 예: name@example.com";
  if (!isValidDomain(emailDomain(email)))
    return "@ 뒤의 도메인을 확인해 주세요. 예: gmail.com, naver.com";
  return null;
}

export type LoginField = "email" | "password";
export type LoginErrors = Partial<Record<LoginField, string>>;

/**
 * Login only checks shape: password rules may have changed since the account
 * was created, so the server decides whether the password is right.
 */
export function validateLogin(values: Record<LoginField, string>): LoginErrors {
  const errors: LoginErrors = {};
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  if (!values.password) errors.password = "비밀번호를 입력해 주세요.";
  return errors;
}
