// Sign-up / login input rules, shared by the forms and their tests.
// The same password rules must also be set in Supabase (Authentication >
// Providers > Email) so they hold for requests that skip this UI; see
// docs/deployment.md.

export const NAME_MAX = 30;
export const PASSWORD_MIN = 8;
/** Supabase (bcrypt) ignores bytes past 72, so longer passwords are rejected up front. */
export const PASSWORD_MAX_BYTES = 72;
const EMAIL_MAX = 254;

// Practical check, not full RFC 5322: one @, no spaces, a dot in the domain,
// no leading/trailing/double dots.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string | null {
  const email = normalizeEmail(value);
  if (!email) return "이메일을 입력해 주세요.";
  if (email.length > EMAIL_MAX || !EMAIL_RE.test(email) || email.includes(".."))
    return "올바른 이메일 주소를 입력해 주세요. 예: name@example.com";
  return null;
}

export interface PasswordCheck {
  key: "length" | "letter" | "digit";
  label: string;
  met: boolean;
}

/** Requirement list shown under the sign-up password field. */
export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { key: "length", label: `${PASSWORD_MIN}자 이상`, met: password.length >= PASSWORD_MIN },
    { key: "letter", label: "영문 포함", met: /[A-Za-z]/.test(password) },
    { key: "digit", label: "숫자 포함", met: /\d/.test(password) },
  ];
}

export function validateNewPassword(password: string): string | null {
  if (!password) return "비밀번호를 입력해 주세요.";
  if (/^\s|\s$/.test(password)) return "비밀번호 앞뒤에는 공백을 넣을 수 없어요.";
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES)
    return "비밀번호가 너무 길어요. 72자 이하로 입력해 주세요.";
  const unmet = passwordChecks(password).filter((c) => !c.met);
  if (unmet.length > 0)
    return `비밀번호는 ${PASSWORD_MIN}자 이상이며 영문과 숫자를 모두 포함해야 해요.`;
  return null;
}

export function validatePasswordConfirm(password: string, confirm: string): string | null {
  if (!confirm) return "비밀번호를 한 번 더 입력해 주세요.";
  if (confirm !== password) return "비밀번호가 서로 달라요.";
  return null;
}

export function validateName(value: string): string | null {
  if (value.trim().length > NAME_MAX) return `이름은 ${NAME_MAX}자 이내로 입력해 주세요.`;
  return null;
}

export type SignupField = "name" | "email" | "password" | "confirm";
export type SignupErrors = Partial<Record<SignupField, string>>;

export function validateSignup(values: Record<SignupField, string>): SignupErrors {
  const errors: SignupErrors = {};
  const checks: [SignupField, string | null][] = [
    ["name", validateName(values.name)],
    ["email", validateEmail(values.email)],
    ["password", validateNewPassword(values.password)],
    ["confirm", validatePasswordConfirm(values.password, values.confirm)],
  ];
  for (const [field, error] of checks) if (error) errors[field] = error;
  return errors;
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
